# Design: Audit and Normalize Playwright Orchestration

## Technical Approach

The implementation will move orchestration logic out of `package.json` shell chains and into a small, typed Playwright runtime layer that `playwright.config.ts` consumes. The config will remain the single place that resolves environment selection, artifact paths, retries, timeouts, headless policy, and project dependencies for the active run. `package.json` will keep the public command surface, but each script will become a thin alias that selects an environment or project group instead of encoding execution order itself.

This design follows the proposal and spec by keeping QA and DEMO behavior mirrored, preserving legacy aliases during migration, and making setup sequencing explicit through Playwright project dependencies rather than `npm run ... && npm run ...` chains.

## Architecture Decisions

### Decision: Introduce a shared Playwright orchestration helper

**Choice**: Add `src/config/playwright-orchestration.ts` as a pure helper module that resolves runtime inputs and builds project descriptors for `playwright.config.ts`.

**Alternatives considered**: Keep all orchestration logic inline inside `playwright.config.ts`; split the logic across multiple shell helper scripts.

**Rationale**: The current config already has environment-aware logic, but it mixes env resolution, reporting paths, and project wiring in one file. A small helper keeps the config declarative, makes the path and project rules testable, and prevents the runtime contract from drifting as more suites are added.

### Decision: Model auth and setup phases as explicit Playwright projects

**Choice**: Reuse the existing auth setup project in `tests/helpers/auth.setup.ts` and keep the existing setup suites as dependency-driven projects. The setup graph will be expressed in Playwright, not in npm scripts.

**Alternatives considered**: Continue chaining setup scripts in `package.json`; rely on `--no-deps` and manual script ordering.

**Rationale**: The repository already has sequential flows such as config phase 1, config phase 2, and base entities setup. Those are better represented as Playwright projects because dependency failures stop downstream execution automatically and the report shows where the chain broke. The current config already references `auth.setup.ts` and the helper exists, so we avoid duplicating auth bootstrap files.

### Decision: Keep `package.json` as a thin alias layer

**Choice**: Replace direct shell composition with canonical aliases that call Playwright projects or project groups. Preserve legacy names during migration, but keep them as passthroughs.

**Alternatives considered**: Delete legacy commands immediately; introduce a new custom runner CLI.

**Rationale**: The proposal explicitly calls for a stable public command surface. Thin aliases keep developer ergonomics, reduce path drift, and avoid a second orchestration framework. A custom runner would add another layer without solving the underlying config drift.

### Decision: Derive artifact isolation from the runtime contract

**Choice**: Keep QA and DEMO outputs separate by environment in the helper module and in `playwright.config.ts`, including `test-results`, HTML report output, Allure results, and storage state paths.

**Alternatives considered**: Reuse shared report directories and clean them before each run; encode isolation only in shell cleanup scripts.

**Rationale**: The current repo already stores env-specific artifacts under suffixed directories, which is the right pattern. Centralizing those names in one contract reduces accidental overwrites and makes combined QA plus DEMO runs safe.

### Decision: Treat cross-environment runs as parallel orchestrations

**Choice**: Keep the combined QA/DEMO entrypoint as a parallel wrapper around two env-specific Playwright invocations, each using the same config helper contract.

**Alternatives considered**: Force both environments into one mixed Playwright invocation; leave combined execution as duplicated shell logic.

**Rationale**: The combined flow is a composition concern, not a suite concern. Running two independent, env-isolated configs in parallel preserves exit codes and artifacts cleanly while avoiding mixed storage-state or report directories.

## Data Flow

Single-environment run:

```text
npm run test:qa:<suite>
   |
   v
package.json alias sets ENV / HEADLESS / TRACE policy
   |
   v
playwright.config.ts
   |
   +--> resolve runtime from env
   |      - baseURL
   |      - workers / retries / timeouts
   |      - report and results folders
   |      - storage state path
   |
   +--> build project graph
   |      auth.setup
   |        |
   |        +--> setup projects (phase 1 -> phase 2 -> base entities)
   |        |
   |        +--> downstream module / atomic projects
   |
   +--> reporters
          - playwright-report-<env>/
          - allure-results-<env>/
          - test-results-<env>/
```

Cross-environment run:

```text
run:all:<flow>
   |
   +--> QA invocation  -> playwright.config.ts -> qa outputs
   |
   +--> DEMO invocation -> playwright.config.ts -> demo outputs
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `C:/projects/bermann-tms-automation/package.json` | Modify | Reduce orchestration chains to canonical aliases, keep legacy names as passthroughs during migration, and remove duplicated QA/DEMO shell logic where Playwright config can own it. |
| `C:/projects/bermann-tms-automation/playwright.config.ts` | Modify | Move env resolution, artifact naming, and project dependency wiring into the shared runtime contract. |
| `C:/projects/bermann-tms-automation/src/config/playwright-orchestration.ts` | Create | Pure helper for resolving runtime inputs, output directories, storage-state paths, and Playwright project descriptors. |
| `C:/projects/bermann-tms-automation/tests/helpers/auth.setup.ts` | Modify | Reuse and align the existing auth setup helper with the centralized orchestration contract and project naming (no duplicate auth setup file). |

## Interfaces / Contracts

The new helper module should expose a minimal typed contract that `playwright.config.ts` can consume without hard-coding file paths or env-specific strings.

```ts
export type SupportedEnvironment = 'QA' | 'DEMO';
export type TraceMode = 'on' | 'retain-on-failure' | 'off';

export interface PlaywrightRuntime {
  environment: SupportedEnvironment;
  baseURL: string;
  headless: boolean;
  trace: TraceMode;
  workers: number;
  retries: number;
  timeoutMs: number;
  expectTimeoutMs: number;
  actionTimeoutMs: number;
  navigationTimeoutMs: number;
  output: {
    testResultsDir: string;
    htmlReportDir: string;
    allureResultsDir: string;
    storageStatePath: string;
  };
}

export interface PlaywrightProjectSpec {
  name: string;
  testMatch: string | string[];
  testIgnore?: string[];
  dependencies?: string[];
  use?: Record<string, unknown>;
}

export interface PlaywrightOrchestrationPlan {
  runtime: PlaywrightRuntime;
  projects: PlaywrightProjectSpec[];
}
```

Contract rules:

- `environment` MUST resolve from `ENV`, defaulting to `QA`.
- Artifact directories MUST be suffixed by environment and remain isolated.
- Setup projects MUST declare dependencies instead of relying on script ordering.
- Project names SHOULD follow a predictable env + suite + browser pattern so scripts and CI can target them consistently.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | Runtime parsing and path generation | Add focused assertions around the new helper functions if the repo adds a lightweight test harness for pure config utilities. |
| Integration | Playwright project graph and dependency order | Run `npx playwright test --list` and targeted `--project` invocations for auth, setup phases, and downstream suites in both QA and DEMO. |
| E2E | Canonical public command surface | Exercise the normalized `package.json` scripts for QA, DEMO, and the combined run, then confirm exit codes and artifact directories. |

Verification should also include `npx tsc --noEmit` to catch any type drift introduced by the new helper contract.

## Migration / Rollout

1. Add the orchestration helper and wire `playwright.config.ts` to it while leaving existing scripts intact.
2. Reuse the existing auth setup project and confirm the dependency chain for the current setup suites.
3. Convert the most duplicated npm scripts into canonical aliases that call Playwright projects rather than hard-coded file paths.
4. Validate QA first, then DEMO, then the combined cross-environment entrypoint.
5. Remove only the most redundant legacy chains after parity is proven, keeping compatibility aliases until the new surface is stable in docs and CI.

Rollback is straightforward: restore the previous `package.json` script bodies and the prior `playwright.config.ts` wiring. The new helper module can remain unreferenced until the migration is retried.

## Open Questions

- [x] Auth setup path confirmed: reuse `tests/helpers/auth.setup.ts` with the existing `auth.setup.ts` project matching.
- [ ] Should the combined QA/DEMO entrypoint remain a parallel pair of env-specific Playwright runs, or should we introduce a matrix-style single invocation later if Playwright project isolation proves sufficient?
