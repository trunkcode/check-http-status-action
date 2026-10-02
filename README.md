# Check HTTP Status action

Crawl a website or check a list of URLs for HTTP status codes, redirects and broken links. Powered by [check-http-status](https://github.com/trunkcode/check-http-status) v2.

## Inputs

One of `crawl`, `sitemap`, `urls` or `base-url` is required. Lists accept one value per line, commas or a JSON array.

| Input | Description |
| --- | --- |
| `base-url` | Base URL for `/paths`. Crawled when no other URL is given. Default: the deployment URL. |
| `wait` | Seconds to wait for `base-url` to be ready. Default `120` for deployments, else `0`. |
| `crawl` | Website URL(s) to crawl. |
| `sitemap` | Sitemap URL(s) to fetch URLs from. |
| `urls` | URLs to check without crawling. |
| `include` | Only crawl matching URLs (text, `*` or `/regex/`). |
| `exclude` | Don't crawl matching URLs (still checked). |
| `skip200` | Skip `200` OK URLs in the output. |
| `fail` | Fail when broken URLs are found. |
| `export` | Report file(s): `.xlsx`, `.csv`, `.json` or `.html`. |
| `config` | Path to a [config file](https://github.com/trunkcode/check-http-status#config-file). |
| `max-pages` | Max pages to crawl. Default `1000`. |
| `max-depth` | Max link depth. Default unlimited. |
| `max-redirects` | Max redirects to follow. Default `10`. |
| `check-external` | Check external links. Default `true`. |
| `check-assets` | Check images, scripts and CSS. Default `false`. |
| `subdomains` | Treat subdomains as internal. Default `false`. |
| `ignore-query` | Ignore query strings. Default `false`. |
| `respect-robots` | Honour robots.txt. Default `false`. |
| `concurrency` | Parallel requests. Default `10`. |
| `delay` | Delay between requests (ms). Default `0`. |
| `retries` | Retries for failed requests. Default `2`. |
| `timeout` | Request timeout (ms). Default `15000`. |
| `user-agent` | User-Agent header. |
| `headers` | Request headers, one `Name: value` per line. Sent to every URL checked. |
| `auth` | Basic auth as `user:password`. Only sent to the checked site. |

## Outputs

| Output | Description |
| --- | --- |
| `checked` | URLs checked. |
| `issues` | URLs with issues. |
| `broken` | Broken URLs. |
| `reports` | Report files written. |

## Example Usage

### Crawl a website

```yml
- uses: trunkcode/check-http-status-action@v2
  with:
    crawl: https://www.trunkcode.com/
    sitemap: https://www.trunkcode.com/sitemap_index.xml
    exclude: |
      /wp-admin
      /tag/*
    skip200: true
    fail: true
    export: |
      reports/link-report.xlsx
      reports/link-report.html

- uses: actions/upload-artifact@v4
  if: always()
  with:
    name: link-report
    path: reports/
```

### Deploy previews

On `deployment_status`, the preview URL from Netlify, Vercel, Heroku review apps, Render, etc. is used automatically. The action waits for it to be ready and skips deployments that are not successful.

```yml
on: deployment_status

jobs:
  links:
    if: github.event.deployment_status.state == 'success'
    runs-on: ubuntu-latest
    steps:
      - uses: trunkcode/check-http-status-action@v2
        with:
          fail: true
          sitemap: /sitemap.xml # optional, relative to the preview URL
```

Or pass the URL from a deploy step:

```yml
- id: netlify
  uses: nwtgck/actions-netlify@v3
  # ...
- uses: trunkcode/check-http-status-action@v2
  with:
    base-url: ${{ steps.netlify.outputs.deploy-url }}
    wait: 60
    fail: true
```

For protected previews, use `auth` (Netlify password protection) or `headers` (e.g. `x-vercel-protection-bypass: ${{ secrets.VERCEL_BYPASS }}`).

### Check a list of URLs

```yml
- uses: trunkcode/check-http-status-action@v2
  with:
    skip200: true
    urls: |
      http://trunkcode.com/
      https://example.com/
      https://www.trunkcode.com/
      https://www.trunkcode.com/test/
```

### Use a config file

```yml
- uses: actions/checkout@v4
- uses: trunkcode/check-http-status-action@v2
  with:
    config: check-http-status.config.json
```

## Upgrading from v1

- v1 inputs still work, including JSON arrays.
- `sitemap` and `urls` can now be used together.
- Runs on Node.js 24.
