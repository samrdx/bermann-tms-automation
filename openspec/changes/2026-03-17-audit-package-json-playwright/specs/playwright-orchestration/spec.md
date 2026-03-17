# Playwright Orchestration Specification

## Purpose

Define the public test orchestration behavior for `package.json` and `playwright.config.ts` so QA and DEMO runs remain predictable, isolated, and easy to reason about as the suite grows.

## Requirements

### Requirement: Canonical Script Surface

The project MUST expose a normalized npm script surface for Playwright execution that clearly separates direct test entrypoints, composed run flows, cleanup tasks, and report actions.
Environment-sensitive scripts MUST follow a stable token order such as `verb:env:area:scenario[:mode]`, and equivalent QA and DEMO commands MUST mirror each other in structure and intent.
Legacy aliases MAY remain available during migration, but they MUST preserve the same observable behavior as the canonical entrypoints they replace.

#### Scenario: Run a canonical QA entrypoint

- GIVEN a developer invokes the canonical QA script for a supported suite
- WHEN the script starts Playwright execution
- THEN the active environment MUST be QA
- AND the selected suite MUST match the requested capability
- AND the command MUST exit with code 0 when the suite passes

#### Scenario: Run the same capability in DEMO

- GIVEN a developer invokes the canonical DEMO script for the same supported suite
- WHEN the script starts Playwright execution
- THEN the active environment MUST be DEMO
- AND the same logical suite MUST run against the Demo environment
- AND the command MUST use the Demo-specific execution settings from Playwright config

#### Scenario: Legacy alias remains available during migration

- GIVEN a legacy script name still exists for a migrated capability
- WHEN the developer invokes the legacy alias
- THEN the alias MUST preserve the same observable behavior as the canonical command
- AND the alias MUST return the same success or failure outcome for the same test result

### Requirement: Playwright Config Centralization

`playwright.config.ts` MUST be the single source of truth for environment selection, base URL routing, timeouts, headless behavior, worker policy, retries, reporter output, and storage state selection.
The project MUST derive these settings from recognized environment inputs rather than duplicating them in per-script shell flags.

#### Scenario: QA local execution resolves through config

- GIVEN `ENV=QA` and the run is not in CI
- WHEN `playwright test` starts
- THEN the base URL MUST point to the QA environment
- AND the output directories MUST use QA-specific names
- AND the run MUST use the local worker and retry settings defined by config
- AND the headless behavior MUST follow the configured local input

#### Scenario: Demo execution resolves through config

- GIVEN `ENV=DEMO`
- WHEN `playwright test` starts
- THEN the base URL MUST point to the Demo environment
- AND the timeout policy MUST use the Demo-specific limits
- AND the output directories MUST use Demo-specific names

#### Scenario: CI execution resolves with CI policy

- GIVEN `CI=true`
- WHEN Playwright config is loaded
- THEN the worker count MUST use the CI policy
- AND the retry policy MUST use the CI policy
- AND the browser run MUST use the CI headless policy

#### Scenario: Missing environment input falls back to the default supported environment

- GIVEN `ENV` is not set
- WHEN Playwright config is loaded
- THEN the default supported environment MUST be QA
- AND the QA base URL MUST be used

### Requirement: Project Dependency Sequencing

The project MUST execute prerequisite setup work before dependent suites by using Playwright project dependencies.
Long-running setup chains MUST be represented as dependency relationships rather than requiring callers to chain separate npm scripts together.

#### Scenario: Setup projects run before dependent suites

- GIVEN a suite depends on authorization and one or more setup phases
- WHEN the canonical full-flow command is executed
- THEN authorization MUST run before the setup phase
- AND the setup phase MUST complete before dependent tests begin
- AND dependent suites MUST only run after prerequisites succeed

#### Scenario: Failed prerequisite stops downstream execution

- GIVEN a prerequisite project fails
- WHEN Playwright evaluates dependent projects
- THEN dependent suites MUST NOT start
- AND the overall command MUST fail with a non-zero exit code
- AND the failure MUST identify the prerequisite phase that stopped the chain

### Requirement: Environment-Isolated Artifacts

The project MUST keep QA and DEMO outputs isolated by environment, including report output, results output, and cleanup targets.
Cleanup commands MUST only remove artifacts for the named target or active environment.

#### Scenario: QA and DEMO runs write separate outputs

- GIVEN a QA run and a DEMO run execute on the same machine
- WHEN each run completes
- THEN QA artifacts MUST be written to QA-specific directories
- AND DEMO artifacts MUST be written to DEMO-specific directories
- AND the runs MUST NOT overwrite each other's outputs

#### Scenario: Environment-specific cleanup does not cross-contaminate

- GIVEN QA and DEMO artifacts both exist locally
- WHEN the QA cleanup command runs
- THEN QA report and result artifacts MUST be removed
- AND DEMO artifacts MUST remain intact

### Requirement: Composite Run Failure Propagation

Composite run commands MUST preserve the exit status of the first failing step and MUST NOT invoke report serving or opening after a failure.
Successful composite runs SHOULD still support post-test report generation or serving as part of the same command family.

#### Scenario: Successful run reaches the reporting step

- GIVEN all test steps in a composite run succeed
- WHEN the command completes
- THEN the command MAY generate or open the matching report for the active environment
- AND the final exit code MUST be 0

#### Scenario: Failed test step blocks reporting

- GIVEN a composite run contains a failing test step
- WHEN that step exits non-zero
- THEN the composite command MUST exit non-zero
- AND report serving or opening MUST NOT start after the failure
- AND the failure MUST remain visible to the caller

### Requirement: Cross-Environment Aggregation

The project MUST support a combined QA-and-DEMO orchestration entrypoint that runs both environments without mixing their outputs.
The combined command SHOULD allow concurrent execution only when environment-specific artifact isolation is preserved.

#### Scenario: Combined run executes both environments

- GIVEN the cross-environment command is invoked
- WHEN both QA and DEMO sub-runs start
- THEN each sub-run MUST use its own environment settings and artifact directories
- AND the overall command MUST succeed only if both sub-runs succeed

#### Scenario: One environment fails in the combined run

- GIVEN one sub-run fails and the other succeeds
- WHEN the combined command completes
- THEN the overall command MUST fail
- AND the successful environment outputs MUST remain available for inspection
- AND the failed environment MUST not overwrite the successful environment's artifacts
