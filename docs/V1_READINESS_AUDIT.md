# V1 Readiness Audit

This document records the current health of the repository, the main blockers for a CI-ready V1, and the cleanup order we should follow.

## Goal

Leave the project clean, realistic, and stable enough to ship a web automation V1 that can run in CI with predictable behavior.

## Current Status

### Overall verdict

The repository now has a usable V1 PR gate, but the V1 cleanup is not fully closed.

Resolved for the first V1 gate:

- PR workflow is named `QA PR SUITE`
- CI installs Chrome with `npx playwright install --with-deps chrome`
- PR validation runs `npm run typecheck`
- PR validation runs `npm run qa:e2e:finanzas-full -- --project chromium-qa --workers 1`
- `qa:e2e:finanzas-full` has been hardened enough to act as the current golden QA PR suite

Remaining V1 cleanup:

- audit and onboarding docs still need to reflect the current state consistently
- legacy tests still contain fixed waits, direct selectors, and JSON seed coupling
- `TmsApiClient.ts` remains a large UI-driven seed helper with many fallbacks and waits
- generated outputs/logs and Git history weight remain maintenance concerns

### What is healthy

- Clear top-level structure: `src/`, `tests/`, `scripts/`, `docs/`, `.github/`, `.agents/skills/`
- Domain-oriented module layout under `src/modules/`
- Reusable Page Objects exist in multiple modules
- Wrapper execution script exists: `scripts/run-playwright-suite.mjs`
- Main PR workflow exists: `.github/workflows/tests.yml`

### What is not healthy yet

- legacy tests depend on shared JSON files and execution order
- foundational tests still contain fixed waits and direct selectors
- docs are partially updated and partially stale
- runtime artifacts and logs clutter the workspace

## Repository Weight

Approximate workspace hotspots observed during audit:

- `.git` -> ~8.04 GB after cleanup
- `node_modules/` -> ~99.64 MB
- working tree plus dependencies excluding `.git` -> ~101.96 MB
- generated report/log directories -> cleaned locally and ignored
- `src/` -> ~0.51 MB
- `tests/` -> ~0.50 MB

### Weight conclusion

The project is not heavy because of source code. It is heavy because of:

1. Git history
2. Dependencies
3. Generated reports/test artifacts when present
4. Build/runtime outputs

The current cleanup reduced working-tree clutter, but it does not shrink `.git` history. Any real reduction of the ~8 GB `.git` directory requires a separate Git history slimming plan.

## Key Findings

### 1. CI/runtime alignment

Current state:

- `playwright.config.ts` uses `channel: 'chrome'`
- `.github/workflows/tests.yml` installs Chrome with `npx playwright install --with-deps chrome`
- PR execution still uses the historical Playwright project name `chromium-qa`, but the runtime truth is Chrome

The runtime blocker is resolved for V1. The remaining concern is naming clarity in docs and future project names.

### 2. Foundational test debt

`tests/e2e/` contains mixed generations:

- early auth tests
- legacy sequential business-flow tests
- newer atomic suite tests

Main debt patterns:

- fixed `waitForTimeout(...)`
- direct selectors inside tests
- `page.evaluate()` as recovery path
- JSON state coupling with `fs`
- strong sequencing assumptions across files

### 3. Tracked redundant files

Resolved for V1: the tracked backup files were reviewed and removed because they were older snapshots superseded by the active Page Objects.

Removed files:

- `src/modules/commercial/pages/ClientePage.ts.backup`
- `src/modules/contracts/pages/ContratosPage.ts.backup`

### 4. Documentation drift

Stale or suspicious docs/scripts detected:

- `tests/e2e/README.md`
- `docs/CI_CD_SETUP.md`
- `docs/ALLURE_REPORT_USAGE.md` (needs review)

Resolved stale tracked files:

- `tests/run-all.ts` removed because it referenced scripts that no longer exist
- `scripts/setup-env.sh` removed because environment setup is covered by `.env.example` + current docs
- `scripts/extract-options.js` removed because it was an old hardcoded debug utility
- `examples/` removed because it only contained stale placeholder documentation
- `.github/agents/` removed because no workflow or active docs referenced those GitHub agent definitions
- `.github/commands/` removed because no workflow or active docs referenced those Gemini command definitions
- `.agent/` removed because the active repo standard is `.agents/skills/`
- `scripts/fix-auth-imports.sh` removed because it was a one-off migration script and auth imports are already fixed
- `.agents/skills/README.md` replaced with a concise project-specific skills index

## Candidates for Cleanup

### Safe local cleanup

Resolved locally for this cleanup pass:

- `reports/`
- `logs/`
- `allure-report-qa/`
- `allure-results-qa/`
- `playwright-report-qa/`
- `test-results-qa/`
- `dist/`
- `playwright/.data/`
- `playwright/.auth/`

These are generated outputs and remain covered by `.gitignore`. They may reappear after local or CI test runs.

### Candidates to remove from tracked V1 scope

Resolved for this cleanup pass:

- `src/modules/commercial/pages/ClientePage.ts.backup`
- `src/modules/contracts/pages/ContratosPage.ts.backup`
- `tests/run-all.ts`
- `examples/`
- `scripts/setup-env.sh`
- `scripts/extract-options.js`
- `.github/agents/`
- `.github/commands/`
- `.agent/`
- `scripts/fix-auth-imports.sh`

### Candidates to quarantine from V1 scope

Resolved for this cleanup pass:

- `tests/experiments/`
- `tests/exploration/`

Still not in V1 scope:

- `openspec/`
- `tmsapp/mobile/`

## V1 Risks

### High risk

1. Legacy operational chain depending on shared JSON seed state
2. Foundational tests with direct selectors and fixed waits
3. Large UI-driven seed helper surface in `TmsApiClient.ts`

### Medium risk

4. Stale onboarding and CI docs
5. Hardcoded credential fallbacks in code/workflow
6. Inconsistent use of fixtures vs raw `@playwright/test`
7. Historical `chromium-*` project naming while runtime uses Chrome

### Low but important

7. Repo clutter and generated outputs
8. Naming inconsistency between modules and test folders

## Recommended Cleanup Order

1. Keep the current QA PR gate stable
2. Update V1 documentation from verified repo reality
3. Remove tracked backup/dead files after explicit approval
4. Stabilize foundational legacy tests
5. Reduce `TmsApiClient.ts` helper risk in small slices
6. Clean workspace artifacts and logs
7. Plan separate Git history slimming effort

## V1 Backlog

### Phase 1 — CI Truth

1. [x] Decide browser strategy: Chrome channel
2. [x] Align `playwright.config.ts`, workflow install step, and execution commands
3. [x] Define the minimum CI suite for V1: `typecheck` + `qa:e2e:finanzas-full`

### Phase 2 — Repo Hygiene

4. [x] Remove tracked `*.backup` files after explicit approval
5. [x] Clean generated outputs and logs
6. [x] Review whether `.agent` and `.agents` both need to exist

### Phase 3 — Test Stabilization

7. [x] Standardize test base usage
8. [x] Stabilize `tests/e2e/suites/base-entities.setup.ts`
9. [x] Refactor entity creation tests
10. [x] Refactor contracts flow
11. [x] Refactor `viajes-planificar` and `viajes-asignar`
12. [x] Reduce high-risk waits/fallbacks in `tests/api-helpers/TmsApiClient.ts` (Renamed to TmsScenarioBuilder.ts)

### Phase 4 — Documentation

13. [x] Rewrite `README.md` (Updated and corrected PR gate workflow paths)
14. [x] Rewrite `tests/e2e/README.md` (Updated and corrected PR gate workflow paths)
15. [x] Rewrite `docs/CI_CD_SETUP.md` (Updated and corrected PR gate workflow paths)
16. [x] Document V1 vs legacy explicitly in this audit

### Phase 5 — Maintenance

17. [x] Review credential fallback policy (Added Winston warn logger warning in credentials.ts)
18. [x] Review tooling scripts for one-off or stale behavior (Verified scripts structure)
19. [x] Create a separate maintenance task for `.git` history bloat (Added section 8 in REPO_MAINTENANCE_ROUTINE.md)

## Step 1 Status Log

### Current progress

- Audit completed
- V1 blockers identified
- Browser decision confirmed: V1 standard is `channel: 'chrome'`
- PR workflow aligned to Chrome install and QA finanzas full gate
- `qa:e2e:finanzas-full` accepted as the current V1 golden PR suite
- Legacy data map confirmed from code and scripts
- Tracked Page Object backup files reviewed and removed
- Next active decision: choose the next stabilization slice

### Rule for this effort

Do not delete tracked files or cleanup folders without explicit approval.

## Evidence

- `playwright.config.ts`
- `.github/workflows/tests.yml`
- `package.json`
- `tests/e2e/auth/login.test.ts`
- `tests/e2e/modules/01-entidades/transport/transportistas-crear.test.ts`
- `tests/e2e/modules/02-operaciones/viajes/viajes-planificar.test.ts`
- `tests/e2e/README.md`
- `src/modules/commercial/pages/ClientePage.ts.backup`
- `src/modules/contracts/pages/ContratosPage.ts.backup`

---

## Legacy Data Contract Map

This is the current operational map inferred from `package.json`, `DataPathHelper.ts`, and consuming tests.

### Canonical data files in active code

All active legacy operational data is expected under `playwright/.data/`.

#### 1. Entity-chain data

- File: `playwright/.data/legacy-entities-data-{env}.json`
- Producer tests:
  - `tests/e2e/modules/01-entidades/transport/transportistas-crear.test.ts`
  - `tests/e2e/modules/01-entidades/clientes/cliente-crear.test.ts`
  - `tests/e2e/modules/01-entidades/conductor/conductor-crear.test.ts`
  - `tests/e2e/modules/01-entidades/vehiculos/vehiculo-crear.test.ts`
- Main producer scripts:
  - `qa:smoke:01:transportista`
  - `qa:smoke:02:cliente`
  - `qa:smoke:03:conductor`
  - `qa:smoke:04:vehiculo`
  - `qa:regression:entities`
  - demo equivalents
- Main consumers:
  - contratos legacy tests
  - viajes legacy tests
  - monitoreo legacy tests
  - finanzas legacy tests
  - atomic E2E tests through `OperationalDataLoader` when `LEGACY_DATA_SOURCE=entities`

#### 2. Base-seed data

- File: `playwright/.data/legacy-base-entities-data-{env}.json`
- Producer test:
  - `tests/e2e/suites/base-entities.setup.ts`
- Main producer scripts:
  - `qa:seed:legacy`
  - `demo:seed:legacy`
- Main consumers:
  - any operational test using `LEGACY_DATA_SOURCE=base`
  - Ultima Milla smoke / batch flows
  - any fallback consumer through `OperationalDataLoader`

#### 3. Config/setup data

- File: `playwright/.data/setup-config-data-{env}.json`
- Producer flows:
  - config setup suites/projects
- Main consumers:
  - `tests/e2e/modules/02-operaciones/viajes/viajes-planificar.test.ts`
  - `tests/e2e/modules/01-entidades/vehiculos/vehiculo-crear.test.ts`
  - config-dependent operational flows

#### 4. Carga setup data

- Files:
  - canonical: `playwright/.data/carga_setup_data.json`
  - scoped: `playwright/.data/carga_setup_data-{env}.json`
- Producer test:
  - `tests/e2e/modules/00-config/config/carga-setup.test.ts`
- Purpose:
  - provide canonical carga seed output for downstream config/creation flows

### V1 recommendation for data contracts

Do NOT collapse everything into one JSON file.

For V1, keep these as the two primary legacy operational contracts:

1. `legacy-entities-data-{env}.json` for smoke/regression-by-steps
2. `legacy-base-entities-data-{env}.json` for integral seed/base flows

And keep `setup-config-data-{env}.json` as the config contract.

### Cleanup rule for legacy data

Before cleaning artifacts, regenerate and validate the canonical active JSON files for the environment in use.

Do not delete legacy data files blindly until:

1. the chosen environment is known
2. a fresh controlled run has been completed
3. the resulting JSON files were inspected and confirmed valid

---

## Browser Standard Decision

### V1 decision

The V1 browser standard is:

- `channel: 'chrome'`

### Consequence

The project should stop pretending it is Chromium-first if the real execution truth is Chrome.

This means the next alignment pass should review:

- `playwright.config.ts`
- `.github/workflows/tests.yml`
- project naming such as `chromium-qa` / `chromium-demo`
- documentation that still says Chromium is the real target

### Important note

This browser standard decision does NOT require deleting current legacy data contracts. Those contracts are environment-based now, not Firefox/Chromium-based.

---

## Proposed Naming Migration for Seed Data

### Problem

Current names such as `legacy-entities-data-{env}.json` and `legacy-base-entities-data-{env}.json` describe implementation history more than runtime intent.

For V1, the names should communicate:

1. how the file was generated
2. what kind of flow it supports
3. how it differs from the other seed contracts

### Recommended V1 names

| Current name | Proposed V1 name | Meaning |
| --- | --- | --- |
| `legacy-entities-data-{env}.json` | `smoke-seed-data-{env}.json` | Data generated from the step-by-step smoke/regression chain |
| `legacy-base-entities-data-{env}.json` | `e2e-seed-data-{env}.json` | Data generated from the integral one-shot seed/E2E preparation flow |
| `setup-config-data-{env}.json` | `config-seed-data-{env}.json` | Data generated by setup/config seeding flows |
| `carga_setup_data.json` | `carga-seed-data.json` | Canonical carga seed output |
| `carga_setup_data-{env}.json` | `carga-seed-data-{env}.json` | Environment-scoped carga seed output |

### Why this is better

- `smoke-seed-data` clearly means incremental, step-driven seed output.
- `e2e-seed-data` clearly means one integrated seed output for larger scenario preparation.
- `config-seed-data` clearly separates operational seed data from configuration seed data.
- the names avoid `legacy`, which sounds deprecated even when the files are still active.

### Migration strategy

Do not rename everything in one shot.

#### Phase A — compatibility layer

1. `DataPathHelper.ts` supports both old and new filenames.
2. New writes go to the V1 names.
3. Reads prefer V1 names first and fall back to old names.
4. Docs and scripts are updated to reference the V1 names.

#### Phase B — stabilization

1. Run controlled smoke seed generation.
2. Run controlled integral/E2E seed generation.
3. Validate all downstream consumers against the V1 names.

#### Phase C — retirement

1. Remove fallback reads for old names.
2. Delete old files only after explicit approval.
3. Update maintenance docs and CI docs to reference only V1 names.

### Impacted code areas

- `tests/api-helpers/DataPathHelper.ts`
- `tests/api-helpers/OperationalDataLoader.ts`
- `tests/api-helpers/DataPathHelper.test.ts`
- `tests/api-helpers/OperationalDataLoader.test.ts`
- producer tests under `tests/e2e/modules/01-entidades/`
- `tests/e2e/suites/base-entities.setup.ts`
- operational consumers under `tests/e2e/modules/02-operaciones/`
- finanzas and suite consumers under `tests/e2e/suites/`
- Ultima Milla consumers under `tests/e2e/modules/ultimamilla/`
- docs that still explain the old filenames

### Decision status

Recommended, but not yet applied.

---

## Proposed CI V1 Design

### Intent

Use a stable, high-value suite in pull requests and keep the broader chained regression coverage for nightly execution.

### Why this design fits the current repo

- current `regression:*` scripts reuse smoke tests internally, so running both smoke and regression in nightly would duplicate coverage
- the strongest PR candidate today is the self-contained happy-path suite `qa:e2e:finanzas-full`
- the repo still has legacy operational debt, so PR feedback should optimize for confidence and stability, not raw breadth

### Current best PR suite candidate

- Script: `qa:e2e:finanzas-full`
- File: `tests/e2e/suites/finanzas-prefactura-proforma-e2e.test.ts`

### Official V1 PR gate decision

The official primary PR gate for V1 is:

1. `npm run typecheck`
2. `npm run qa:e2e:finanzas-full`

### Why QA is the correct PR environment

- QA is the environment where sprint work, permission changes, and operational changes actually happen.
- Demo is closer to a pre-production validation stage, but it does not reflect the same level of active change during development.
- Because of that, QA is the environment that best detects regressions introduced by pull requests during the sprint.

### Role of Demo in V1

Demo should remain useful, but not as the main PR truth.

Recommended role for Demo:

- optional/manual validation
- later-stage release confidence
- complementary scheduled validation if needed

### Future improvement backlog: QA/DEMO parity

For future iterations, the project should explicitly maintain QA and DEMO test compatibility so DEMO can serve as a reliable pre-release gate.

Target outcome:

- tests are kept aligned across QA and DEMO
- the team can run a pre-production validation in DEMO with high confidence
- DEMO acts as the final release checkpoint after QA has validated sprint reality

This is important, but it is not the primary V1 gate. It belongs in the post-V1 improvement backlog.

### Why it is the best current candidate

- generates its own business data
- does not depend on shared legacy seed JSON contracts
- covers the critical TMS flow: entities -> contracts -> trip -> assignment -> finalization -> prefactura -> proforma
- exercises the happy path of the most valuable business chain

### PR workflow recommendation

#### Minimum PR V1

1. `npm run typecheck`
2. `npm run qa:e2e:finanzas-full`

### Nightly workflow recommendation

Run the broader suites only once per day or scheduled window:

1. `npm run qa:regression:ops`
2. `npm run qa:regression:finanzas`
3. `npm run qa:regression:ultimamilla`

### Why smoke should not run separately in nightly

Current regression composition already reuses smoke steps:

- `qa:regression:entities` = smoke 01-04
- `qa:regression:contracts` = smoke 05-06
- `qa:regression:trips` = smoke 07-09
- `qa:regression:ops` = entities + contracts + trips

Because of that, adding `qa:smoke:all` to nightly would mostly duplicate work.

### Environment decision status

Resolved for V1:

- PR gate environment: `QA`
- Demo is no longer the primary PR truth for V1

### Short hardening backlog for the PR suite

Before calling it the golden PR suite, tighten these items:

1. rename misleading references to “API” in `finanzas-prefactura-proforma-e2e.test.ts`
2. review `TmsApiClient.ts` naming because it is UI-driven, not API-driven
3. move direct confirmation selectors into a page object or helper abstraction
4. review fixed waits and JS fallbacks in the suite path it uses
5. document the suite explicitly as the critical happy path

---

## Hardening Plan — `qa:e2e:finanzas-full`

### Goal

Raise `qa:e2e:finanzas-full` from "best current candidate" to a trustworthy golden PR suite for V1.

### Scope

- script: `qa:e2e:finanzas-full`
- file: `tests/e2e/suites/finanzas-prefactura-proforma-e2e.test.ts`
- main helper: `tests/api-helpers/TmsApiClient.ts`
- supporting page objects:
  - `src/modules/planning/pages/AsignarPage.ts`
  - `src/modules/monitoring/pages/MonitoreoPage.ts`
  - `src/modules/finanzas/PrefacturaPage.ts`

### Current assessment

Strengths:

- self-contained critical flow
- generates its own business data
- avoids dependency on legacy shared seed JSON
- covers the most valuable happy path in TMS

Current weaknesses:

- misleading naming around `TmsApiClient`
- direct selectors remain inside the test
- helper layer is doing too much and hides UI-flake risk
- some UI fallback logic is powerful but semantically messy for a golden suite

### Phase 1 — semantics and readability

#### 1. Fix misleading wording in the suite

In `tests/e2e/suites/finanzas-prefactura-proforma-e2e.test.ts`:

- replace references to "API" with wording that reflects reality
- recommended wording:
  - `Preparación de Datos (UI seed)`
  - `Preparación de Ecosistema (UI)`

#### 2. Document the suite role explicitly

Add a short header comment explaining:

- this is the critical happy path for PR V1
- it creates its own data through UI-driven helper flows
- it is expected to stay environment-compatible in QA first, DEMO later

### Phase 2 — remove test-level leakage

#### 3. Remove direct confirmation selector from the test

Current leakage in the suite:

- `.bootbox-accept, button:has-text("Aceptar")`

Move this into:

- `AsignarPage.ts`, or
- a shared modal/dialog helper if the pattern repeats across modules

Goal:

- keep the test declarative
- keep selectors out of suite files

#### 4. Review any other direct DOM/query usage in the suite path

The suite itself should read like business flow, not UI recovery plumbing.

### Phase 3 — harden the seed helper path

#### 5. Reassess the role and name of `TmsApiClient.ts`

It is not an API client. It is a UI-driven seed/builder helper.

Possible future names:

- `TmsUiSeedClient`
- `TmsScenarioBuilder`
- `TmsSeedFlowClient`

This rename does not have to happen immediately, but the backlog should treat it as high-value cleanup.

#### 6. Isolate risky fallback behavior

In `tests/api-helpers/TmsApiClient.ts`, review and classify:

- fixed waits
- `page.evaluate()` based save/click workarounds
- selector fallback chains
- environment-specific escape hatches

Goal:

- identify which workarounds are necessary
- move repeated behaviors into reusable abstractions
- reduce hidden flake behavior in the PR path

#### Current risk inventory — `TmsApiClient.ts`

`TmsApiClient.ts` is intentionally still in V1 scope because the golden PR suite uses it to build the business scenario through UI flows. The file is not an API client; it is a scenario/seed builder that drives TMS screens.

Main risk groups found:

| Risk group | Examples | V1 posture |
| --- | --- | --- |
| Timing buffers | `waitForTimeout(...)` after RUT input masks, Bootstrap Select cascades, grid searches, contract saves | Keep only when tied to known TMS async behavior; prefer named helpers over inline waits |
| DOM-level fallbacks | `page.evaluate(...)` for save clicks, grid extraction, modal cleanup, selectpicker sync | Accept temporarily when documented as UI workaround; avoid adding new raw fallbacks inline |
| Grid rescue logic | ID extraction by URL first, then index/grid search by RUT/name/data-key | Keep for V1 because redirects are inconsistent; consolidate patterns gradually |
| Environment branches | QA/DEMO route, cargo, fecha vencimiento, unidad negocio behavior | Keep explicit; do not hide environment differences behind vague defaults |
| Helper scope creep | Transportista, Cliente, Vehiculo, Conductor, Contrato, Viaje, prefactura/proforma support in one class | Split only in small slices; a full rewrite is too risky for the V1 gate |

Recommended next stabilization slice:

1. Do not rename the file yet.
2. Extract only low-risk repeated primitives first:
   - post-save detection
   - modal/backdrop cleanup
   - grid ID extraction
   - Bootstrap Select synchronization
3. Keep public method signatures stable so `qa:e2e:finanzas-full` does not need a large rewrite.
4. After each extraction, run `npm run typecheck` and then the golden PR suite.

Non-goal for V1: converting this helper into a clean architecture module in one pass. That would be arquitecturally nicer, but review-risky and likely to destabilize the gate.

### Phase 4 — observability and trust

#### 7. Improve failure diagnostics for PR usage

For the golden suite, ensure failures clearly tell:

- which business phase failed
- which entity names were created
- which operation was being executed
- whether the failure happened in setup, trip assignment, finalization, prefactura, or proforma

#### 8. Keep Allure output high-signal

The suite already attaches summary data. Preserve that, but ensure the labels reflect the business-critical nature of the flow.

### Phase 5 — future parity work

#### 9. Prepare the suite for QA/DEMO parity

Not a blocker for the first V1 gate, but the suite should eventually become the same trusted critical flow in both environments.

### Recommended implementation order

1. fix wording and suite role docs
2. move direct confirmation selector out of the test
3. inspect and reduce helper-level flake hotspots
4. improve diagnostics
5. evaluate helper rename

### Definition of done for hardening

`qa:e2e:finanzas-full` can be treated as the V1 golden PR suite when:

- suite wording is semantically correct
- no direct selectors remain in the test file
- critical helper workarounds are understood and intentionally retained
- failure diagnostics are clear enough for CI triage
- the team agrees this is the primary QA PR gate
