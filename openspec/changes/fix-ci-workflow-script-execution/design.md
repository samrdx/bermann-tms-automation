# Design: Restore CI Workflow Script Execution Integrity

## Technical Approach

Implement a focused CI hardening pass that preserves the current workflow intent but adds deterministic execution rules and explicit status gating.

This design maps directly to `specs/ci/spec.md` requirements:
- Required script execution by trigger and environment
- Workflow-to-`package.json` script contract validation
- Artifact path alignment with Playwright reporter outputs
- Explicit final fail-gate behavior after report publication steps

## Architecture Decisions

### Decision: Add a Fast Preflight Contract Guard

**Choice**: Add a reusable Node-based validation script that scans workflow files for `npm run <script>` commands and verifies each script key exists in `package.json`, then run it early in both workflows.
**Alternatives considered**:
- Manual review only (no automation)
- Inline shell regex in each workflow
**Rationale**: A centralized guard reduces drift risk and fails early with clear diagnostics. A Node script is easier to maintain than repeated shell parsing blocks.

### Decision: Keep Test Execution Steps Resilient, Enforce Final Mandatory Fail Gate

**Choice**: Keep `continue-on-error: true` on mandatory suite steps where needed to preserve downstream report generation, then add an explicit final gate step (`if: always()`) that inspects step outcomes and fails job status when any mandatory suite failed.
**Alternatives considered**:
- Remove all `continue-on-error` and fail immediately
- Keep current permissive behavior without explicit gate
**Rationale**: Immediate failure can prevent report generation. Current permissive behavior can produce false-green runs. Final gate gives both artifacts and truthful CI signal.

### Decision: Make `workflow_dispatch` Environment Selection Deterministic in `tests.yml`

**Choice**: For manual dispatch, run only the selected environment (`QA` or `DEMO`); for `push`/`pull_request`, run both environments where applicable. Implement with matrix + conditional execution or equivalent conditional job split.
**Alternatives considered**:
- Always run both environments for all triggers
- Always run only QA for dispatch and non-dispatch
**Rationale**: Matches the spec and user intent for manual runs while preserving broader integrity checks for branch-triggered runs.

### Decision: Align Artifact Paths to Reporter Outputs, Not Generic Defaults

**Choice**: Update upload paths to use environment-scoped report directories (`playwright-report-qa`, `playwright-report-demo`, `allure-results-qa`, `allure-results-demo`) and fail clearly when mandatory artifacts are missing.
**Alternatives considered**:
- Keep generic `playwright-report/`
- Change Playwright reporter output naming
**Rationale**: Existing Playwright config already defines environment-scoped output. Aligning workflow paths is lower risk than changing test runtime configuration.

## Data Flow

End-to-end CI control/data flow for both workflows:

```text
Trigger (push/pr/dispatch/schedule)
  |
  v
Checkout + Node setup + npm ci + playwright install
  |
  v
Preflight: workflow-script contract guard
  |
  +--> fail -> stop early (red)
  |
  v
Run mandatory test suites (some steps may continue-on-error)
  |
  v
Generate/merge reports and publish artifacts/pages (always)
  |
  v
Final fail gate evaluates mandatory step outcomes
  |
  +--> all pass -> success (green)
  |
  +--> any fail -> failure (red)
```

Sequence-focused view (tests workflow):

```text
User/GitHub Event
  -> tests.yml
    -> preflight guard
      -> package.json scripts map
    -> smoke-auth (selected env)
    -> atomic suites (QA/DEMO per trigger policy)
    -> allure report generation/upload
    -> final gate
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `.github/workflows/tests.yml` | Modify | Add preflight contract step, normalize dispatch env behavior, fix auth report artifact path logic, and add explicit final gate. |
| `.github/workflows/allure-nightly.yml` | Modify | Add preflight contract step and explicit final gate after report generation/deploy steps. |
| `scripts/ci/validate-workflow-scripts.mjs` | Create | Parse workflow YAML text for `npm run` references and compare against `package.json` scripts. Exit non-zero with missing script list. |
| `package.json` | Modify | Add `ci:validate:workflow-scripts` script entry to execute the guard script. |
| `playwright.config.ts` | No change (expected) | Reporter paths already encode env suffixes; workflows align to these outputs. |

## Interfaces / Contracts

Preflight guard contract:

```ts
// scripts/ci/validate-workflow-scripts.mjs (conceptual)
type ValidationResult = {
  workflow: string;
  referencedScripts: string[];
  missingScripts: string[];
};
```

Runtime behavior contract:
- Input:
  - Workflow files under `.github/workflows/*.yml`
  - `package.json` `scripts` object
- Output:
  - Exit `0` when all referenced scripts exist
  - Exit `1` with list of missing script names and source workflow

Final gate contract in workflows:
- Mandatory test steps MUST have stable step `id` values.
- Gate step reads `steps.<id>.outcome`.
- If any mandatory step outcome is not `success`, gate exits `1`.

Dispatch environment contract (`tests.yml`):
- `workflow_dispatch`: only selected env runs in atomic stage.
- `push`/`pull_request`: both envs run in atomic stage.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | Guard parser correctly extracts `npm run` references and detects missing scripts | Run guard script locally with fixture workflows (valid and invalid). |
| Integration | Workflow preflight and final gate behavior | Run `workflow_dispatch` in GitHub Actions for QA and DEMO, observe step outcomes and final job status. |
| E2E | End-to-end CI integrity signal with report retention | Execute one manual run and one nightly/push run; verify artifacts exist and workflow status matches mandatory suite outcomes. |

## Migration / Rollout

No migration required.

Rollout plan:
1. Merge guarded workflow changes behind normal branch PR flow.
2. Execute controlled `workflow_dispatch` runs for `QA` and `DEMO`.
3. Monitor first scheduled nightly run after merge for report publication + final gate correctness.

## Open Questions

- [ ] Should `pull_request` runs include DEMO atomic suite by default, or remain QA-only for cost/runtime?
- [ ] Should missing artifact directories fail immediately in upload steps (`if-no-files-found: error`) or only via final gate?
