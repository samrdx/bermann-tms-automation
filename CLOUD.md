# CI/CD Architecture & Decisions

## Overview

This project uses GitHub Actions for continuous integration with two workflow files serving different purposes. All CI runs on GitHub's free tier (2,000 minutes/month for private repos, unlimited for public).

## Why v1.58.0-jammy

The Docker image `mcr.microsoft.com/playwright:v1.58.0-jammy` is used in `playwright.yml` because:

- **Version pinning:** `v1.58.0` matches the exact `@playwright/test` version in `package.json`. Mismatched versions cause browser binary errors at runtime.
- **Jammy base:** Ubuntu 22.04 LTS provides a stable, well-supported base image.
- **Pre-installed browsers:** The container ships with Chromium, Firefox, and WebKit pre-installed, eliminating the `npx playwright install` step and saving ~60 seconds per run.
- **Deterministic environment:** Container-based runs produce identical results regardless of GitHub's runner image updates.

When upgrading Playwright, update both `package.json` and the Docker image tag in `playwright.yml` simultaneously.

## Workflow Architecture

### playwright.yml - Single Test Runner

**Purpose:** Quick validation of the most complex end-to-end test (viajes-asignar).

**Strategy:** Uses the Playwright Docker container directly, skipping Node.js setup entirely.

```text
Trigger: push/PR to main or master
Container: mcr.microsoft.com/playwright:v1.58.0-jammy (--ipc=host)
Steps: checkout -> npm ci -> run viajes-asignar test -> upload report
Timeout: 60 minutes
```

**Secrets used:**

| Variable | Source |
| --- | --- |
| `BASE_URL` | `secrets.BASE_URL` |
| `TMS_USER` | `secrets.TMS_USER` |
| `TMS_PASS` | `secrets.TMS_PASS` |

**Key detail:** This workflow validates `BASE_URL` before running and fails fast if it's empty.

### tests.yml - Hybrid Dual-Track

**Purpose:** Run independent and dependent test suites in parallel for full coverage.

**Strategy:** Two jobs run simultaneously (`needs: []`), one for atomic flows, one for legacy sequential flows.

```text
Trigger: push to main/develop, PR to main, manual dispatch
```

**Job 1: atomic-suite** (20 min timeout)

- Uses `actions/setup-node@v4` + `npm ci` + `npx playwright install --with-deps chromium`
- Runs: `viajes-asignar.test.ts` (self-contained, no setup dependencies)
- No Docker container (installs browsers on the fly)

**Job 2: legacy-suite** (30 min timeout)

- Same setup as atomic-suite
- Runs 3 sequential stages:
  1. `base-entities-chromium` project (creates Transportista, Cliente, Vehiculo, Conductor)
  2. `contratos/` tests (depends on base entities, `--workers=1`)
  3. `viajes-planificar.test.ts` (depends on contracts, `--workers=1`)

Both jobs run in parallel, reducing total wall-clock time.

### Credential Mapping

The `tests.yml` workflow maps a single pair of secrets to multiple environment variable names for compatibility with different parts of the codebase:

```text
secrets.BASE_URL  ->  BASE_URL, BASE_URL_DEV
secrets.TMS_USER  ->  TMS_USERNAME, TMS_USER, TEST_REGULAR_USER, USERNAME_DEV
secrets.TMS_PASS  ->  TMS_PASSWORD, TMS_PASS, TEST_REGULAR_PASS, PASSWORD_DEV
```

Fallback values (`|| 'arivas'`) allow CI to run even without secrets configured (useful for forked repos or initial setup).

## GitHub Actions Secrets

### Required Secrets

| Secret | Used By | Purpose |
| --- | --- | --- |
| `TMS_USER` | All Workflows | TMS login username |
| `TMS_PASS` | All Workflows | TMS login password |
| `BASE_URL` | All Workflows | TMS base URL |

### How to Configure

1. Go to GitHub repository **Settings > Secrets and variables > Actions**
2. Click **New repository secret**
3. Add each secret above

See [docs/GITHUB_ACTIONS_SETUP.md](docs/GITHUB_ACTIONS_SETUP.md) for step-by-step instructions.

## Artifact Storage and Quota

### Retention Policies

| Workflow | Artifact Name | Contents | Retention |
| --- | --- | --- | --- |
| `playwright.yml` | `playwright-report` | HTML report | 7 days |
| `tests.yml` | `report-atomic` | HTML report (atomic suite) | 7 days |
| `tests.yml` | `report-legacy` | HTML report (legacy suite) | 7 days |

### Storage Considerations

- **Free tier limit:** 500 MB artifact storage (shared across all workflows)
- **Report size:** Each HTML report is approximately 2-5 MB
- **Standardized Retention:** All reports are kept for 7 days to conserve space while allowing debugging.
- **Traces/videos:** Currently NOT uploaded (only generated on failure locally). If enabling `trace: retain-on-failure` uploads, monitor storage carefully as traces can be 10-50 MB each.
- **Cleanup:** GitHub automatically deletes artifacts after the retention period expires

### Reducing Storage Usage

If approaching the 500 MB limit:
1. Reduce retention days (currently 7)
2. Only upload artifacts on failure (`if: failure()` instead of `if: always()`)
3. Compress reports before upload
4. Delete old artifacts manually via GitHub API or UI

## CI vs Local Configuration

Configuration in [playwright.config.ts](playwright.config.ts) adapts automatically based on the `CI` environment variable:

| Setting | CI | Local |
| --- | --- | --- |
| Workers | 1 | 3 |
| Retries | 2 | 0 |
| Test timeout | 180s | 60s |
| Expect timeout | 20s | 10s |
| Headless | always | configurable |
| Browsers | Chromium only | Chromium + Firefox + WebKit |
| Traces | retain-on-failure | retain-on-failure |
| Screenshots | only-on-failure | only-on-failure |

**Why 1 worker in CI:** Prevents database collisions from parallel entity creation on a shared QA environment. Locally, worker-specific JSON files (`last-run-data-{browser}.json`) isolate data per browser.

## Docker Local Simulation

To reproduce the CI environment locally (useful for debugging CI-only failures):

```bash
# From Git Bash on Windows
MSYS_NO_PATHCONV=1 docker run --rm -it \
  -v "/$(pwd)":/work -w /work \
  --ipc=host \
  mcr.microsoft.com/playwright:v1.58.0-jammy /bin/bash

# Inside the container
npm ci
npx playwright test tests/e2e/modules/02-operaciones/viajes/viajes-asignar.test.ts --project=chromium
```

Flags explained:
- `MSYS_NO_PATHCONV=1` - Prevents Git Bash from mangling Unix paths on Windows
- `--ipc=host` - Required for Chromium shared memory (prevents crashes)
- `-v "/$(pwd)":/work` - Mounts project directory into the container

## Known Limitations

1. **Single browser in CI:** Only Chromium is tested in CI. Firefox and WebKit are tested locally only.
2. **No Docker Compose:** There is no `docker-compose.yml` for local CI reproduction with environment variables. The `docker run` command above is the manual equivalent.
3. **Artifact overlap potential:** Both `atomic-suite` and `legacy-suite` write to `playwright-report/`, but they upload with different artifact names (`report-atomic`, `report-legacy`) so there's no overwrite.
4. **Shared QA environment:** Tests run against a shared QA database. Parallel CI runs (e.g., from multiple PRs) could cause data collisions.

## Future Improvements

- Add matrix strategy for multi-browser CI testing
- Implement `docker-compose.yml` for local CI simulation with secrets
- Add PR status comments with test results using `actions/github-script`
- Cache `node_modules` and Playwright browsers between runs
- Add Slack/email notifications on failure

---

**Last updated:** February 2026
