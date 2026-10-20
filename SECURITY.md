# Security policy

## Supported versions

Security fixes are released for the latest 2.x version (`@v2`). Please upgrade before
reporting a problem in an older version.

## Reporting a vulnerability

Please **don't open a public issue**. Report it privately through
[GitHub security advisories](https://github.com/trunkcode/check-http-status-action/security/advisories/new)
instead.

Include the version, the workflow that shows the problem and what an attacker could do
with it. You'll get a reply within a week. Once a fix is released, the advisory is
published and you're credited unless you'd rather not be.

## Scope

The action sends requests to the URLs you give it and to the links it finds on those
pages. Things worth reporting include `auth` credentials being sent to the wrong host,
secrets showing up unmasked in logs, and crawled content being able to inject markup
into the job summary or HTML report.

Problems in the crawler itself belong to
[check-http-status](https://github.com/trunkcode/check-http-status/security/advisories/new).
