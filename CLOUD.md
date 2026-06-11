# CI/CD Architecture & Decisions

Current architecture reference for GitHub Actions. Keep this file aligned with `.github/workflows/tests.yml` and `docs/CI_CD_SETUP.md`.

## Current PR Workflow

| Item | Decision |
|---|---|
| Workflow file | `.github/workflows/tests.yml` |
| Workflow name | `QA PR SUITE` |
| Trigger | `pull_request` |
| Job | `qa-pr-suite` |
| Environment | `QA` |
| Browser install | `npx playwright install --with-deps chrome` |
| Runtime browser | Google Chrome via Playwright `channel: 'chrome'` |
| Project name | `chromium-qa` historical name |

The PR gate runs:

```bash
npm run typecheck
npm run qa:e2e:finanzas-full -- --project chromium-qa --workers 1
```

## Why QA for the V1 PR Gate

QA is the sprint reality environment: permissions, data changes, and active development are validated there first. Demo remains useful for later release confidence, but it is not the primary PR truth for V1.

## Why Chrome Runtime

`playwright.config.ts` sets `channel: 'chrome'`, so CI installs Chrome explicitly. The `chromium-*` project names remain for compatibility with existing scripts and reports, but they do not describe the actual browser runtime.

## Credential Mapping

The workflow maps repository secrets into the environment variables consumed by the tests:

```text
secrets.TMS_USER  ->  TMS_USERNAME
secrets.TMS_PASS  ->  TMS_PASSWORD
```

Fallback credentials currently exist in the workflow. Prefer GitHub Secrets for operational runs.

## Related Workflows

`nightly-regressions.yml` exists for broader scheduled coverage. It is not the PR gate and should not be documented as required PR validation.

## Related Docs

- `.github/workflows/tests.yml` — executable source of truth for PR CI.
- `docs/CI_CD_SETUP.md` — operational CI reference.
- `docs/V1_READINESS_AUDIT.md` — V1 status, backlog, and rationale.

**Document Status:** Current for V1 PR gate.
