## Exploration: CI workflow script execution integrity

### Current State
The project has two CI workflows:
- `.github/workflows/tests.yml` runs `smoke-auth` then `atomic-core-flows` on push/PR/manual dispatch.
- `.github/workflows/allure-nightly.yml` runs QA and DEMO legacy + e2e suites nightly and deploys Allure history to `gh-pages`.

Workflow script references are valid today (`npm run ...` commands exist in `package.json`).

Observed integrity gaps:
- Multiple test steps use `continue-on-error: true` without a final fail gate, so workflows can appear successful even when critical suites fail.
- `workflow_dispatch` input `environment` only affects smoke-auth; atomic job still runs both QA and DEMO, which conflicts with single-environment manual runs.
- `tests.yml` uploads `playwright-report/`, but Playwright config writes `playwright-report-qa` or `playwright-report-demo` based on `ENV`, causing report artifact mismatch.
- No early CI guard checks workflow/script integrity (for example, checking that every `npm run X` in YAML exists and is intended).

### Affected Areas
- `.github/workflows/tests.yml` - job orchestration, manual dispatch behavior, and artifact paths.
- `.github/workflows/allure-nightly.yml` - error handling strategy and report generation gate behavior.
- `package.json` - source of truth for scripts invoked by workflows.
- `playwright.config.ts` - report/result directories derived from `ENV`; directly impacts workflow artifact paths.
- `openspec/config.yaml` - CI/CD context and rules for proposal/spec quality.

### Approaches
1. **Minimal workflow hardening** - Keep existing structure and patch weak points in place.
   - Pros: Fast to implement, low disruption, minimal diff.
   - Cons: Duplicated QA/DEMO logic remains, harder long-term maintenance.
   - Effort: Low

2. **Matrix-based CI refactor + explicit integrity gates** - Consolidate QA/DEMO runs with matrix jobs and enforce final status checks.
   - Pros: Less duplication, clearer behavior per environment, easier future scaling.
   - Cons: Larger YAML rewrite, moderate migration risk for current report flow.
   - Effort: Medium

### Recommendation
Start with a controlled hardening pass (Approach 1) and include one structural improvement: environment matrix or equivalent only where it removes conflicting behavior (manual dispatch vs QA+DEMO). This gives immediate reliability without destabilizing nightly reporting.

### Risks
- Tightening fail conditions may increase visible CI failures initially due to existing flaky tests.
- Incorrect artifact path changes can break report availability if not aligned with `playwright.config.ts` outputs.
- Over-refactor in one pass may delay recovery of current CI signal quality.

### Ready for Proposal
Yes - enough evidence exists to create `proposal.md` with scoped fixes for workflow execution integrity, script validation gates, and artifact alignment.
