# CI/CD Architecture & Decisions

## Overview

This project uses GitHub Actions for continuous integration. A single pipeline (`tests.yml`) runs on pull requests against the Demo environment, covering finanzas E2E and Última Milla batch flows. All runs use GitHub's free tier.

---

## Workflow Architecture

### tests.yml — PR E2E Demo Pipeline

**Purpose:** Validate critical business flows on every pull request using the Demo environment, avoiding collisions with shared QA data.

```text
Trigger: pull_request
Jobs run in parallel (no dependencies between them)
```

**Job 1: E2E Finanzas Full (Demo)**

- Runs: `finanzas-prefactura-proforma-e2e.test.ts`
- Browser: Chromium only
- Timeout: 60 minutes
- Preflight: `npm run ci:validate:workflow-scripts` checks script references
- Concurrency: Grouped by workflow + branch ref to prevent parallel collisions

**Job 2: Ultima Milla Batch (Demo)**

- Runs: `pedido-asignar-batch.test.ts` (multi-browser: chromium → firefox serial)
- Workers: 1 (sequential, required for batch isolation)
- Timeout: 120 minutes
- Environment: `ULTIMAMILLA_ENABLE_MUTATION=true`, `ULTIMAMILLA_BATCH_SIZE=8`
- Seed: `npm run demo:seed:legacy` before batch test
- Allure report generated + uploaded as artifact (14-day retention)
- Allure attachments >20MB pruned automatically to stay within storage quota
- Concurrency: `cancel-in-progress: true`

### Previous Workflows (Removed)

- **playwright.yml** — Legacy single-test runner (viajes-asignar) using Docker container `mcr.microsoft.com/playwright:v1.58.0-jammy`. Removed in favor of consolidated PR pipeline.
- **tests.yml hybrid track** — Previous version with atomic + legacy QA jobs. Consolidated to Demo-only to prevent data collisions on shared QA environment.

---

## Credential Mapping

The pipeline maps a single pair of secrets to environment variable names:

```text
secrets.TMS_USER  →  TMS_USERNAME
secrets.TMS_PASS  →  TMS_PASSWORD
```

Fallback `|| 'arivas'` allows CI to run without secrets configured.

---

## GitHub Actions Secrets

### Required Secrets

| Secret | Purpose |
|---|---|
| `TMS_USER` | TMS login username |
| `TMS_PASS` | TMS login password |
| `BASE_URL` | TMS base URL |

### How to Configure

1. Go to **Settings > Secrets and variables > Actions**
2. Click **New repository secret**
3. Add each secret

---

## Artifact Storage

| Workflow | Artifact | Contents | Retention |
|---|---|---|---|
| `tests.yml` (ultimamilla) | `allure-ultimamilla-batch-demo-*` | Allure HTML report | 14 days |

### Storage Considerations

- **Free tier limit:** 500 MB artifact storage
- **Allure pruning:** Attachments >20MB (`.zip`, `.webm`, `.mp4`) are deleted before upload
- **GitHub Pages:** Allure reports deployable manually from workflow artifacts
- **Cleanup:** GitHub auto-deletes after retention period

---

## CI vs Local Configuration

| Setting | CI | Local |
|---|---|---|
| Workers | 1 | 3 |
| Retries | 2 | 0 |
| Test timeout | 240s | 60s |
| Headless | true | configurable |
| Browsers | Chromium + Firefox | Chromium + Firefox |
| Traces | retain-on-failure | retain-on-failure |

---

## Docker Local Simulation

```bash
# Reproduce CI environment locally
docker run --rm -it \
  -v "$(pwd)":/work -w /work \
  --ipc=host \
  mcr.microsoft.com/playwright:v1.58.0-jammy /bin/bash

# Inside container
npm ci
npx playwright test --project chromium-demo --workers 1
```

---

## Key Architectural Decisions

### Why Demo-only in PR pipeline?

The shared QA environment is used by multiple team members and external testers. Running PR validation on Demo avoids:
- Data collisions from parallel entity creation
- Interference with manual QA testing
- Flaky failures from concurrent CI runs

### Why Allure pruning?

Allure captures screenshots and videos on failure. Multi-browser batch tests can produce 100+ MB of attachments. Pruning keeps artifacts under GitHub's 500 MB free tier limit.

### Why concurrency groups?

Without concurrency groups, two PRs opened close together would both seed legacy data and collide on shared entities. Grouping by workflow + ref serializes runs per branch.

---

## Known Limitations

1. **Demo-only validation:** PR pipeline tests only Demo, not QA. QA runs are triggered manually.
2. **No matrix strategy:** Multi-browser runs (chromium + firefox) are serial, not parallel.
3. **No Docker Compose:** No local CI reproduction with environment variables.
4. **Shared Demo data:** Concurrent PR runs from different branches are still serialized per branch, but multiple branches targeting the same base can collide on Demo data.
5. **No notifications:** Pipeline failures don't trigger Slack/email alerts.

---

## Future Improvements

- Add QA environment validation on merge to main
- Implement matrix strategy for parallel multi-browser CI
- Add `docker-compose.yml` for local CI simulation
- Cache `node_modules` and Playwright browsers between runs
- Add Slack/email notifications on failure

---

**Last updated:** May 2026
