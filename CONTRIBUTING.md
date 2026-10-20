# Contributing

Thanks for helping out! Bug reports, ideas and pull requests are all welcome. Please follow
the [code of conduct](CODE_OF_CONDUCT.md).

## Development

`node_modules` is committed, because GitHub runs the action straight from the repo.
After changing dependencies, commit `node_modules` too:

```bash
npm ci
```

To run the action locally, pass inputs as `INPUT_<NAME>` environment variables:

```bash
env INPUT_URLS=https://example.com/ node index.js
```

## Pull requests

- Keep each pull request to one change.
- Update `action.yml` and the README when inputs or outputs change, and add a line to
  `CHANGELOG.md`.
- CI runs the action and checks that `node_modules` matches `package-lock.json`; both
  must pass before merging.
- Commits to `main` must be signed.

## Security

Please report vulnerabilities privately; see [SECURITY.md](SECURITY.md).
