# Tasks: Restore CI Workflow Script Execution Integrity

## Phase 1: Foundation / CI Guard Infrastructure

- [x] 1.1 Create `scripts/ci/validate-workflow-scripts.mjs` to scan `.github/workflows/*.yml`, extract `npm run <script>` commands, compare against `package.json` scripts, and exit non-zero with missing script names. (Spec: Workflow to Package Script Contract -> "Workflow references valid scripts", "Workflow references an undefined script")
- [x] 1.2 Add `ci:validate:workflow-scripts` in `package.json` pointing to `node scripts/ci/validate-workflow-scripts.mjs`. (Spec: Workflow to Package Script Contract)
- [x] 1.3 Add deterministic output format to guard failures (`workflow`, `missingScripts`, `referencedScripts`) so CI logs identify the exact broken contract. (Spec: Workflow to Package Script Contract -> "Workflow references an undefined script")
- [x] 1.4 Run `npm run ci:validate:workflow-scripts` locally with current workflows and confirm zero missing scripts baseline before workflow edits. (Spec: Workflow to Package Script Contract -> "Workflow references valid scripts")

## Phase 2: Harden `.github/workflows/tests.yml`

- [x] 2.1 Add an early preflight step in `.github/workflows/tests.yml` to run `npm run ci:validate:workflow-scripts` before suite execution. (Spec: Workflow to Package Script Contract)
- [x] 2.2 Modify dispatch/env selection logic in `.github/workflows/tests.yml` so `workflow_dispatch` runs only selected environment, while `push`/`pull_request` keep mandatory environment coverage. (Spec: Required Script Execution by Trigger -> "Manual dispatch runs only the selected environment", "Push or scheduled runs execute all mandatory environments")
- [x] 2.3 Add explicit runtime validation for unsupported dispatch environment input and fail before tests when value is outside `QA|DEMO`. (Spec: Dispatch Environment Behavior Must Be Explicit -> "Unsupported environment input")
- [x] 2.4 Update auth and test artifact upload paths in `.github/workflows/tests.yml` to align with env-scoped Playwright outputs (`playwright-report-qa`, `playwright-report-demo`) and ensure mandatory artifacts are checked. (Spec: Environment Aligned Artifact Paths -> "QA and DEMO reports are uploaded from correct directories", "Report directory mismatch is detected")
- [x] 2.5 Add stable `id` values to mandatory suite steps and implement a final `if: always()` gate step that fails the job when any mandatory suite outcome is not `success`. (Spec: Explicit Final Fail Gate -> "Mandatory suites pass and workflow succeeds", "At least one mandatory suite fails")

## Phase 3: Harden `.github/workflows/allure-nightly.yml`

- [x] 3.1 Add the same preflight guard invocation in `.github/workflows/allure-nightly.yml` before QA/DEMO suite execution. (Spec: Workflow to Package Script Contract)
- [x] 3.2 Ensure all mandatory QA/DEMO suite steps in `.github/workflows/allure-nightly.yml` have stable `id` values used by final gate evaluation. (Spec: Explicit Final Fail Gate)
- [x] 3.3 Add final fail-gate step after report generation/deploy steps to preserve artifacts while returning red status when mandatory suites fail. (Spec: Explicit Final Fail Gate -> "At least one mandatory suite fails")
- [x] 3.4 Verify nightly artifact merge/publish steps still use expected paths (`allure-results-qa`, `allure-results-demo`, `allure-history`) and add explicit logging for missing directories. (Spec: Environment Aligned Artifact Paths -> "Report directory mismatch is detected")

## Phase 4: Validation / Rollout

- [x] 4.1 Re-run `npm run ci:validate:workflow-scripts` after workflow edits and confirm pass with updated script references. (Spec: Workflow to Package Script Contract -> "Workflow references valid scripts")
- [x] 4.2 Execute one controlled `workflow_dispatch` run with `environment=QA` and verify DEMO-only scripts do not execute. (Spec: Required Script Execution by Trigger -> "Manual dispatch runs only the selected environment")
- [x] 4.3 Execute one controlled `workflow_dispatch` run with `environment=DEMO` and verify QA-only scripts do not execute. (Spec: Required Script Execution by Trigger -> "Manual dispatch runs only the selected environment")
- [x] 4.4 Validate one branch-triggered run (`push` or `pull_request`) confirms mandatory multi-env behavior and final gate status correctness. (Spec: Required Script Execution by Trigger -> "Push or scheduled runs execute all mandatory environments"; Explicit Final Fail Gate)
- [x] 4.5 Validate one scheduled/nightly run preserves Allure publication and correctly fails when mandatory suites fail. (Spec: Explicit Final Fail Gate; Environment Aligned Artifact Paths)
- [x] 4.6 Document resolved decisions for the two open questions directly in workflow comments or change notes: PR env policy and artifact missing-files policy. (Spec: Dispatch Environment Behavior Must Be Explicit -> "Default dispatch behavior is defined")
