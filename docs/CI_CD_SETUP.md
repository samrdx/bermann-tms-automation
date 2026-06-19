# CI/CD Setup Guide

Operational reference for the current GitHub Actions PR gate. Keep this document tied to repository files, not to stale pass rates or unverified branch policy.

## Current PR Gate

| Item | Current value |
|---|---|
| Workflow file | `.github/workflows/qa-pr-suite.yml` |
| Workflow name | `QA PR SUITE` |
| Trigger | `pull_request` |
| Job | `qa-pr-suite` |
| Runner | `ubuntu-latest` |
| Timeout | 60 minutes |
| Node.js | 20 |
| Browser install | `npx playwright install --with-deps chrome` |
| Runtime browser | Google Chrome via `channel: 'chrome'` |
| Playwright project | `chromium-qa` historical name |

The workflow runs these checks in order:

```bash
npm ci
npm run ci:validate:workflow-scripts
npx playwright install --with-deps chrome
npm run typecheck
npm run qa:e2e:finanzas-full -- --project chromium-qa --workers 1
```

## Runtime Naming

`playwright.config.ts` sets `channel: 'chrome'`, so CI and local Playwright runs use Google Chrome when executing the configured projects.

The project names `chromium-qa` and `chromium-demo` remain for script and workflow compatibility. Treat them as historical names, not as the browser runtime truth.

## Required Credentials

Configure repository secrets under `GitHub Repository -> Settings -> Secrets and variables -> Actions`.

| Secret | Used for |
|---|---|
| `TMS_USERNAME` | TMS username for the QA PR gate |
| `TMS_PASSWORD` | TMS password for the QA PR gate |

The workflow currently includes fallback credentials for the gate environment. Prefer secrets for operational use.

## Local Gate Reproduction

Run the same checks before changing gate-sensitive code:

```bash
npm run typecheck
npm run qa:e2e:finanzas-full -- --project chromium-qa --workers 1
```

For a clean browser install matching CI:

```bash
npx playwright install --with-deps chrome
```

## Reports And Artifacts

Playwright output paths are environment-based:

| Artifact | Location |
|---|---|
| HTML report | `playwright-report-qa/` |
| JSON report | `playwright-report-qa/results.json` |
| Raw test output | `test-results-qa/` |
| Allure results | `allure-results-qa/` |

The current PR workflow does not publish a GitHub Pages Allure report.

## Troubleshooting

| Symptom | Check |
|---|---|
| Workflow fails before tests | Run `npm run ci:validate:workflow-scripts` and verify script names in `package.json`. |
| TypeScript step fails | Run `npm run typecheck` locally. |
| Browser launch fails in CI | Confirm the workflow still installs `chrome`, not only `chromium`. |
| Test data collision or legacy DB instability | Keep the gate command on `--workers 1`. |
| Auth failure | Verify `TMS_USERNAME` / `TMS_PASSWORD` secrets and QA login availability. |

## Useful Commands

```bash
npm run ci:validate:workflow-scripts
npm run typecheck
npm run qa:e2e:finanzas-full -- --project chromium-qa --workers 1
npm run qa:e2e:all
npm run demo:e2e:all
```

## Related Docs

- `README.md` — project overview and operational commands.
- `docs/V1_READINESS_AUDIT.md` — V1 readiness status and backlog.
- `playwright.config.ts` — source of truth for projects, Chrome channel, retries, workers, reports, and timeouts.
- `.github/workflows/qa-pr-suite.yml` — source of truth for the PR gate.

**Document Status:** Current for V1 PR gate
