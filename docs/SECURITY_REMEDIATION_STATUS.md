# Security Remediation Status

This document records the security review work completed for the Bermann TMS automation repository, the current security posture, recommended practices, and a backlog of future hardening items.

## Current state

The repository has completed the first remediation pass for the highest-impact, low-risk findings from the security review:

- Credentials are no longer stored as committed fallback values.
- GitHub Actions now require configured secrets for TMS authentication.
- Jira workflow inputs are validated before being written to workflow outputs or passed to PowerShell commands.
- The Playwright suite runner no longer uses `shell: true` on Windows for `npx` execution.
- RUT/document-like identifiers used by tests are confirmed to be synthetic test data.

The remaining work is intentionally tracked as backlog so it can be reviewed and validated separately.

## Completed remediation

| Area | Files | Status | Notes |
| --- | --- | --- | --- |
| Credential source of truth | `src/config/credentials.ts` | Done | Credentials now come from environment variables. Missing values fail fast through `requiredEnv(...)`. |
| CI credential handling | `.github/workflows/qa-pr-suite.yml`, `.github/workflows/nightly-regressions.yml` | Done | Removed committed secret fallbacks and added preflight checks for `TMS_USERNAME` and `TMS_PASSWORD`. |
| Jira workflow input validation | `.github/workflows/jira-native-testset.yml` | Done | `parentKey` and `testSetKey` must match Jira issue-key format: `^[A-Z][A-Z0-9]+-\d+$`. |
| Playwright runner shell hardening | `scripts/run-playwright-suite.mjs`, `scripts/run-playwright-suite.test.mjs` | Done | Windows now runs `npx` through `node <npx-cli.js>` and keeps `spawnSync` argument-array execution without shell mode. |
| Synthetic identifier classification | Test data/logging usage | Accepted | RUT/document identifiers are synthetic. Masking is optional hardening, not urgent remediation. |
| Security skill installation | Global skills | Done | `security-review` and `playwright-generate-test` were installed globally and indexed in the skill registry. |

## Verification performed

The following validations passed after the remediation work:

```bash
npm run typecheck
npm run ci:validate:workflow-scripts
npm run test:scripts
```

Observed results:

- TypeScript check: passed.
- Workflow script validation: passed, 3 workflows checked.
- Script tests: passed, including the Windows shell-free `npx-cli.js` resolution test.

## Credential source of truth

Credentials must be supplied by runtime configuration, not committed code.

| Context | Source of truth |
| --- | --- |
| Local execution | Local environment variables, usually loaded from `.env` by `dotenv`. |
| GitHub Actions | GitHub Secrets: `TMS_USERNAME` and `TMS_PASSWORD`. |
| Code | `requiredEnv('TMS_USERNAME')` and `requiredEnv('TMS_PASSWORD')` only validate and consume values. |

Expected behavior:

- If credentials are missing locally, tests fail clearly.
- If GitHub Secrets are missing, workflows fail during preflight.
- No fallback username/password should be committed again.

## Good practices going forward

### Credentials and secrets

- Do not commit real usernames, passwords, API tokens, browser auth states, or generated `.env` files.
- Use `.env.example` only for variable names and non-secret examples.
- Prefer fail-fast validation over default credentials.
- Keep GitHub Actions secrets in repository or organization secret storage.
- Rotate any credential that was ever committed or shared outside the secret store.

### GitHub Actions and scripts

- Validate external inputs before writing to `$GITHUB_OUTPUT`, `$GITHUB_ENV`, logs, or shell commands.
- Prefer strict allowlists or regexes for issue keys, environment names, paths, and modes.
- Avoid `shell: true` when executing tools from Node.js. Prefer executable + argument arrays.
- Keep workflow validation in CI whenever workflows are edited.

### Test data and logs

- Continue using synthetic RUT/document identifiers for automation data.
- Do not switch to real personal data in QA logs or artifacts.
- If real data ever becomes necessary, mask identifiers before logging and before artifact upload.

### Review discipline

- Treat dependency updates, mobile/Appium upgrades, and CI hardening as separate review units.
- Run targeted validation after each security change.
- Document intentional risk acceptance, especially when a setting remains enabled for QA stability.

## Security backlog

### 1. Playwright TLS and sandbox hardening

Status: deferred.

Current findings:

- `playwright.config.ts` uses `ignoreHTTPSErrors: true`.
- `src/core/BrowserManager.ts` uses `ignoreHTTPSErrors: true`.
- `playwright.config.ts` launches Chrome with `--no-sandbox`.

Recommended future approach:

- Make HTTPS error ignoring configurable, defaulting to `false`.
- Allow `TMS_IGNORE_HTTPS_ERRORS=true` only when QA/DEMO certificates require it.
- Gate `--no-sandbox` behind a CI/container-specific condition instead of always enabling it.
- Validate against QA and DEMO before merging because these settings can affect browser startup and certificate handling.

### 2. Root dependency audit remediation

Status: deferred.

Current finding:

- Root dependency audit reported a vulnerable chain involving `concurrently` and `shell-quote`.

Recommended future approach:

```bash
npm audit fix
npm run test:scripts
npm run typecheck
npm run ci:validate:workflow-scripts
```

Review `package-lock.json` carefully before committing.

### 3. Optional log masking for synthetic identifiers

Status: optional.

Current state:

- RUT/document-like values are synthetic.
- This is not currently treated as an urgent privacy vulnerability.

Recommended future approach:

- Add a small masking utility if logs become noisy or if artifacts are shared externally.
- Mask values as `12.***.***-*` or equivalent.
- Keep raw values only where required for test assertions.

### 4. Mobile/Appium dependency remediation

Status: last priority / separate block.

Current finding:

- `tmsapp/mobile` has multiple transitive vulnerabilities through Appium/WDIO dependencies such as `axios`, `lodash`, `ws`, `undici`, and related packages.

Recommended future approach:

- Handle mobile dependencies in a dedicated branch or PR.
- Run mobile-specific validation after `npm audit fix` because Appium and WDIO dependency changes can affect driver behavior.
- Avoid mixing mobile lockfile changes with web automation security fixes.

Suggested validation:

```bash
cd tmsapp/mobile
npm audit fix
npm run wdio
```

Use the real mobile smoke command if full WDIO is too expensive for the review cycle.

## Out of scope for this pass

- Dependency remediation for mobile/Appium.
- Changing Playwright TLS/sandbox behavior before QA/DEMO compatibility is verified.
- Masking synthetic identifiers in logs.
- Any unrelated working-tree changes outside the security remediation files.
