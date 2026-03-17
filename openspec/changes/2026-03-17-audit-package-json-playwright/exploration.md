## Exploration: Auditoría técnica profunda de package.json para framework Playwright

### Current State
- `package.json` has 129 scripts total: 69 `test:*`, 27 `run:*`, 10 `allure:*`, 45 QA-oriented scripts, 41 DEMO-oriented scripts, and 15 legacy scripts.
- The current shape is functional, but orchestration is encoded directly in script strings: environment selection, browser mode, trace settings, workers, report lifecycle, and path selection all live in `package.json`.
- DRY pressure is high because QA and DEMO are mirrored with near-identical commands, and the same patterns repeat across `test:*` and `run:*`.
- CI/CD efficiency is mixed: there are CI-friendly commands like `test:qa:e2e:ci`, but many broader entrypoints are interactive (`--headed`) or report-serving flows that are better suited for local debugging than pipelines.
- Dependency management shows mild version skew risk: `playwright` and `playwright-core` are pinned to `^1.58.0`, while `@playwright/test` is `^1.58.2`.
- Test orchestration is currently split across atomic tests, chained legacy flows, full-flow commands, and cross-environment commands, but the coordination mechanism is still string-based shell composition rather than a shared runner/config layer.
- DX is decent for discoverability because the script names are explicit, but the volume and inconsistency of command shapes make the catalog harder to reason about as the suite grows.
- `openspec/config.yaml` confirms the project is already using a hybrid atomic + legacy testing model in QA and Demo, so the script surface is not accidental; it is carrying real operational complexity.

### Affected Areas
- `C:/projects/bermann-tms-automation/package.json` - primary source of test orchestration, env handling, and report lifecycle.
- `C:/projects/bermann-tms-automation/openspec/config.yaml` - confirms the hybrid CI/testing model and Playwright stack context.

### Approaches
1. **Thin command consolidation** - keep npm scripts as the public entry points, but move repeated fragments into a small TS helper or internal command presets.
   - Pros: low migration risk, quick DRY gains, preserves current `npm run` DX, easy to phase in.
   - Cons: `package.json` remains large, some duplication stays, suite discovery is still script-name driven.
   - Effort: Medium.

2. **Config-driven orchestrator** - replace most long scripts with a single runner that reads suite metadata and composes Playwright, env, and Allure behavior from one source of truth.
   - Pros: best scalability, fewer path/env drift bugs, cleaner CI matrix generation, stronger separation of concerns.
   - Cons: higher upfront design cost, more migration work, requires disciplined config maintenance.
   - Effort: High.

### Recommendation
- Prefer a staged path: implement thin consolidation first, then evolve toward a config-driven orchestrator if the suite keeps expanding.
- The most urgent technical fix is failure propagation. Several scripts use `;` before report serving, which can still launch Allure even after a failing test. That is acceptable for local convenience, but risky as a default pattern.
- Normalize the QA/Demo path variants at the same time, because the current path drift is already visible in paired scripts and will become a maintenance problem if the project doubles in size.

### Risks
- If the project doubles in size without consolidation, the script matrix will likely become unwieldy and create discoverability overhead for new contributors.
- Version skew across `playwright`, `playwright-core`, and `@playwright/test` can lead to inconsistent behavior, especially during upgrades or lockfile refreshes.
- Mixed `&&` and `;` semantics can hide failures in local runs and produce misleading "successful" report-serving flows.
- Serial mega-runs such as `test:all` and `run:all:*` will scale poorly in CI and slow feedback loops as more suites are added.
- The current path drift between equivalent QA/Demo commands suggests that future modules may diverge further unless a single command source is introduced.

### Ready for Proposal
Yes. The next step should be a proposal to normalize Playwright command composition, centralize shared flags and environment handling, and standardize failure semantics across local and CI entry points.
