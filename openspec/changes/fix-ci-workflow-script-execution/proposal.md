# Proposal: Restore CI Workflow Script Execution Integrity

## Intent

Improve CI reliability so workflow status accurately reflects the health of the project. Today, key suites can fail without failing the workflow, manual dispatch behavior is inconsistent by environment, and auth report artifacts can be uploaded from the wrong path.

This change addresses CI signal integrity and script/workflow contract validation for the two active workflows.

## Scope

### In Scope
- Harden `.github/workflows/tests.yml` so required scripts run with consistent QA/DEMO behavior, especially for `workflow_dispatch` environment selection.
- Harden `.github/workflows/allure-nightly.yml` so test failures are surfaced through an explicit fail gate while still preserving report generation/publishing steps.
- Align artifact upload paths with actual Playwright reporter outputs derived from `ENV`.
- Add an early CI integrity guard to validate workflow-referenced `npm run` scripts against `package.json`.
- Keep the current suite strategy (smoke, atomic, legacy + nightly Allure history) while improving observability and correctness.

### Out of Scope
- Replacing GitHub Actions with another CI platform.
- Full redesign of test suite composition (which tests belong in smoke/atomic/nightly).
- Refactoring test implementation logic inside `tests/e2e/**`.
- Introducing new environments beyond QA and DEMO.

## Approach

Apply a targeted hardening pass (minimal disruption) with one structural cleanup where needed:

1. Add explicit execution gates in both workflows.
2. Preserve `continue-on-error` only where required for report generation, then compute and enforce final job status.
3. Make manual dispatch environment behavior explicit (single-env runs vs dual-env runs).
4. Align report artifact paths to `playwright.config.ts` output conventions.
5. Add a script/workflow contract check that fails fast when workflow commands drift from `package.json`.

This follows the exploration recommendation: stabilize quickly without a full matrix rewrite of every job.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `.github/workflows/tests.yml` | Modified | Normalize env selection, artifact paths, and required script execution/fail behavior. |
| `.github/workflows/allure-nightly.yml` | Modified | Add explicit pass/fail gate while preserving Allure history generation and deployment flow. |
| `package.json` | Modified | Add/adjust CI utility scripts for integrity checks (if needed). |
| `scripts/ci/*` | New/Modified | Implement workflow script integrity validation logic used by CI. |
| `playwright.config.ts` | Possibly Modified | Only if path alignment requires explicit reporter/output adjustments. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Tightened fail gates expose existing flaky tests and increase red builds initially | Medium | Keep artifact generation on `always()`, add clear failure summaries, triage flakiness separately. |
| Artifact path changes break report uploads temporarily | Medium | Validate path mapping against `ENV` conventions (`playwright-report-qa`, `playwright-report-demo`) before merge. |
| Workflow logic changes alter expected manual execution behavior | Low | Document dispatch behavior in workflow comments and validate with controlled `workflow_dispatch` runs. |
| Guard script becomes too strict and blocks intended workflow updates | Low | Restrict guard to `npm run <script>` existence + explicit allowlist rules. |

## Rollback Plan

1. Revert workflow and CI guard changes in a single commit revert.
2. Restore prior workflow files:
   - `.github/workflows/tests.yml`
   - `.github/workflows/allure-nightly.yml`
3. Remove new guard scripts (if added) and related `package.json` entries.
4. Re-run a manual dispatch to confirm previous baseline behavior is restored.

## Dependencies

- GitHub Actions runners with Node.js 20 and Playwright browsers.
- Repository secrets (`TMS_USER`, `TMS_PASS`) for authenticated suites.
- Existing Playwright/Allure toolchain already defined in `package.json`.

## Success Criteria

- [ ] `tests.yml` executes the intended required scripts per trigger type, with explicit and predictable environment behavior.
- [ ] `allure-nightly.yml` still publishes Allure history, but the workflow fails when mandatory suites fail.
- [ ] Auth and test report artifacts are uploaded from correct paths for QA/DEMO outputs.
- [ ] CI fails fast if a workflow references a missing `npm` script.
- [ ] At least one `workflow_dispatch` validation run confirms expected script execution and status signaling end-to-end.
