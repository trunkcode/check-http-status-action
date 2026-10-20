# check-http-status-action changelog

## 2.1.0 - Oct 20, 2026

### Changed

- check-http-status 2.2.0: reports include H1, meta description and image alt text
- `max-pages` now defaults to 5000 instead of 1000

### Fixed

- Security: `uuid` is forced to 11.1.1 or newer (via `exceljs`)

## 2.0.0 - Oct 2, 2026

### New

- Crawl a website (`crawl`), with `include` / `exclude` rules
- Deploy previews: `deployment_status` events, `base-url` and `wait`
- `fail`, `export`, `config`, `auth`, `headers` and crawl/request inputs
- `checked`, `issues`, `broken` and `reports` outputs
- Job summary of the issues found

### Changed

- Runs on Node.js 24
- `sitemap` and `urls` can be used together

## 1.0.0 - May 21, 2021

- First release
