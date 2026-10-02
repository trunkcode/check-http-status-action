import fs from 'fs';
import path from 'path';
import * as core from '@actions/core';
import checkHttpStatus from 'check-http-status';

const EXPORT_FORMATS = ['xlsx', 'csv', 'json', 'html'];
const BROKEN_CATEGORIES = ['Not Found', 'Client Error', 'Server Error', 'Error'];
const ISSUE_CATEGORIES = ['Redirect', ...BROKEN_CATEGORIES];
const SUMMARY_ROWS = 100;
const DEPLOYMENT_WAIT = 120;

// JSON array, or one value per line / comma separated.
function getList(name) {
  const value = core.getInput(name).trim();
  if (!value) {
    return [];
  }

  if (value.startsWith('[')) {
    return JSON.parse(value).map((item) => String(item).trim()).filter(Boolean);
  }

  return value.split(/[\r\n,]+/).map((item) => item.trim()).filter(Boolean);
}

function getBoolean(name) {
  return core.getInput(name) ? core.getBooleanInput(name) : undefined;
}

function getNumber(name) {
  const value = core.getInput(name);
  if (!value) {
    return undefined;
  }

  const number = Number(value);
  if (Number.isNaN(number)) {
    throw new Error(`Input "${name}" must be a number.`);
  }

  return number;
}

// URL from a `deployment_status` event (Netlify, Vercel, Heroku, Render…).
function getDeployment() {
  if (process.env.GITHUB_EVENT_NAME !== 'deployment_status' || !process.env.GITHUB_EVENT_PATH) {
    return null;
  }

  const { deployment_status: status } = JSON.parse(fs.readFileSync(process.env.GITHUB_EVENT_PATH, 'utf8'));
  return { 'state': status.state, 'url': status.environment_url || status.target_url || '' };
}

function getHeaders() {
  const headers = {};
  for (const line of core.getInput('headers').split(/\r?\n/).filter((item) => item.trim())) {
    const index = line.indexOf(':');
    if (index < 1) {
      throw new Error(`Invalid header "${line}". Use "Name: value".`);
    }

    const value = line.slice(index + 1).trim();
    core.setSecret(value);
    headers[line.slice(0, index).trim()] = value;
  }

  return headers;
}

function getAuth() {
  const value = core.getInput('auth');
  if (!value) {
    return undefined;
  }

  core.setSecret(value);
  const index = value.indexOf(':');
  return index < 0 ? { 'username': value } : { 'username': value.slice(0, index), 'password': value.slice(index + 1) };
}

// Wait until the preview responds without a 404 or 5xx.
async function waitFor(url, seconds, headers) {
  const end = Date.now() + seconds * 1000;
  let last = '';
  while (Date.now() < end) {
    try {
      const response = await fetch(url, { headers, 'signal': AbortSignal.timeout(15000) });
      if (response.status !== 404 && response.status < 500) {
        return;
      }

      last = `HTTP ${response.status}`;
    } catch (error) {
      last = error.message;
    }

    core.info(`Waiting for ${url} (${last})…`);
    await new Promise((resolve) => setTimeout(resolve, 10000));
  }

  throw new Error(`${url} was not ready after ${seconds}s (${last}).`);
}

function getExports() {
  return getList('export').map((file) => {
    const format = path.extname(file).slice(1).toLowerCase();
    if (!EXPORT_FORMATS.includes(format)) {
      throw new Error(`Unsupported report format: ${file}`);
    }

    fs.mkdirSync(path.dirname(path.resolve(file)), { 'recursive': true });
    return { file, format };
  });
}

function buildConfig(baseUrl) {
  const configFile = core.getInput('config') || checkHttpStatus.findConfig();
  const config = configFile ? checkHttpStatus.loadConfig(configFile) : {};
  // `/path` is relative to `base-url`.
  const resolve = (url) => {
    if (!url.startsWith('/')) {
      return url;
    } else if (!baseUrl) {
      throw new Error(`"${url}" needs base-url.`);
    }

    return new URL(url, baseUrl).href;
  };

  const lists = {
    'crawl': getList('crawl').map(resolve),
    'exclude': getList('exclude'),
    'include': getList('include'),
    'sitemaps': getList('sitemap').map(resolve),
    'urls': getList('urls').map(resolve)
  };
  for (const [key, value] of Object.entries(lists)) {
    if (value.length) {
      config[key] = value;
    }
  }

  if (baseUrl && ![].concat(config.crawl || [], config.urls || [], config.sitemaps || []).length) {
    config.crawl = [baseUrl];
  }

  const values = {
    'checkAssets': getBoolean('check-assets'),
    'checkExternal': getBoolean('check-external'),
    'concurrency': getNumber('concurrency'),
    'delay': getNumber('delay'),
    'fail': getBoolean('fail'),
    'ignoreQuery': getBoolean('ignore-query'),
    'maxDepth': getNumber('max-depth'),
    'maxPages': getNumber('max-pages'),
    'maxRedirects': getNumber('max-redirects'),
    'respectRobots': getBoolean('respect-robots'),
    'retries': getNumber('retries'),
    'skip200': getBoolean('skip200'),
    'subdomains': getBoolean('subdomains'),
    'userAgent': core.getInput('user-agent') || undefined
  };
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined) {
      config[key] = value;
    }
  }

  const auth = getAuth();
  const timeout = getNumber('timeout');
  config.options = { ...config.options, 'headers': { ...config.options?.headers, ...getHeaders() } };
  if (auth) {
    config.options.auth = auth;
  }

  if (timeout !== undefined) {
    config.options.timeout = timeout;
  }

  const exports = getExports();
  if (exports.length) {
    config.export = exports;
  }

  if (![].concat(config.crawl || [], config.urls || [], config.sitemaps || []).length) {
    throw new Error('One of crawl, sitemap or urls is required.');
  }

  return config;
}

async function writeSummary(report, broken) {
  const { summary, results } = report;
  const issues = results.filter((result) => ISSUE_CATEGORIES.includes(result.category));
  const rows = issues.slice(0, SUMMARY_ROWS).map((result) => [
    result.url,
    String(result.status ?? (result.error || '-')),
    result.category,
    result.redirectTo || '-',
    result.foundOn.slice(0, 3).map((found) => found.page).join('<br>') || '-'
  ]);

  core.summary
    .addHeading('Check HTTP Status')
    .addTable([
      [{ 'data': 'Checked', 'header': true }, { 'data': 'Issues', 'header': true }, { 'data': 'Broken', 'header': true }],
      [String(summary.checked), String(summary.issues), String(broken)]
    ]);

  if (rows.length) {
    core.summary.addTable([
      ['URL', 'Status', 'Category', 'Redirects to', 'Found on'].map((data) => ({ data, 'header': true })),
      ...rows
    ]);

    if (issues.length > SUMMARY_ROWS) {
      core.summary.addRaw(`First ${SUMMARY_ROWS} of ${issues.length} issues shown.`, true);
    }
  }

  await core.summary.write();
}

async function run() {
  const deployment = getDeployment();
  if (deployment && deployment.state !== 'success') {
    core.info(`Deployment is "${deployment.state}", skipping.`);
    return;
  }

  const baseUrl = core.getInput('base-url') || deployment?.url || '';
  const config = buildConfig(baseUrl);
  const wait = getNumber('wait') ?? (deployment?.url ? DEPLOYMENT_WAIT : 0);
  if (baseUrl && wait > 0) {
    await waitFor(baseUrl, wait, config.options.headers);
  }

  const failOnBroken = !!config.fail;
  delete config.fail;

  const report = await checkHttpStatus(config);
  const counts = report.summary.counts;
  const broken = BROKEN_CATEGORIES.reduce((total, category) => total + (counts[category] || 0), 0);

  core.setOutput('checked', report.summary.checked);
  core.setOutput('issues', report.summary.issues);
  core.setOutput('broken', broken);
  core.setOutput('reports', (config.export || []).map((entry) => entry.file).join('\n'));

  if (process.env.GITHUB_STEP_SUMMARY) {
    await writeSummary(report, broken);
  }

  if (report.uploadError) {
    core.setFailed(report.uploadError);
  } else if (failOnBroken && broken > 0) {
    core.setFailed(`${broken} broken URL(s) found.`);
  }
}

run().catch((error) => core.setFailed(error.message));
