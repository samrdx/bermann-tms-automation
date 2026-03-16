# Tasks: Carga Master Data Seeding Setup

## Phase 1: Infrastructure and Contracts

- [x] 1.1 Add Carga naming helper in `src/utils/NamingHelper.ts` to generate `Qa_<Tag>_<5digits>` for all six entity tags.
- [x] 1.2 Add `getCargaSetupDataPath(...)` in `tests/api-helpers/DataPathHelper.ts` returning deterministic path for `carga_setup_data.json`.
- [x] 1.3 Extend fixture typing in `src/fixtures/base.ts` with `cargaMasterPage: CargaMasterPage`.
- [x] 1.4 Register fixture provider in `src/fixtures/base.ts` to instantiate `new CargaMasterPage(page)`.

## Phase 2: Core Implementation (POM + Setup Flow)

- [x] 2.1 Create `src/modules/configAdmin/pages/CargaMasterPage.ts` with metadata map for `unidadmedida`, `categoriacarga`, `configuracioncarga`, `contenidocarga`, `temperaturacarga`, `comercio`, and `tiporampla`.
- [x] 2.2 Implement generic methods in `CargaMasterPage.ts`: navigation, `fillNombre`, `clickGuardar`, save verification, and screenshot-on-error handling.
- [x] 2.3 Implement ID extraction strategy in `CargaMasterPage.ts` with URL-first parsing and DOM/index fallback.
- [x] 2.4 Create `tests/e2e/modules/01-entidades/config/carga-setup.test.ts` to execute six entities in required sequence using `cargaMasterPage`.
- [x] 2.5 Build in-test accumulator object for created entities (`nombre`, `id`, `endpoint`, `createdAt`) and export to `carga_setup_data.json` at end of successful run.
- [x] 2.6 Add emoji-based step logging in `carga-setup.test.ts` (`📏`, `🏷️`, `⚙️`, `📦`, `❄️`, `🏪`, `🛻`) plus final "JSON listo para contratos" summary.
- [x] 2.7 Add Allure metadata and JSON attachment in `carga-setup.test.ts` (`epic`, `feature`, `story`, `Ambiente`, and artifact payload).

## Phase 3: Scripts and Environment Wiring

- [x] 3.1 Add `test:qa:entity:carga-setup` and `test:demo:entity:carga-setup` scripts in `package.json` with `ENV` and `--trace on`.
- [x] 3.2 Add `run:qa:entity:carga-setup` and `run:demo:entity:carga-setup` scripts in `package.json` following existing Allure clean/run/serve convention.
- [x] 3.3 Ensure setup scripts execute with single-worker behavior (explicit `--workers=1` in script or project-level equivalent) to avoid artifact collisions.

## Phase 4: Verification and Quality Gates

- [x] 4.1 Run `npx tsc --noEmit` and resolve any type errors introduced by new page object, fixture, or helper contracts.
- [x] 4.2 Run `npm run test:qa:entity:carga-setup` and verify that `carga_setup_data.json` contains all seven entity keys.
- [x] 4.3 Run `npm run test:demo:entity:carga-setup` and verify identical JSON schema is preserved in Demo.
- [x] 4.4 Validate Allure output includes setup metadata and JSON attachment for both environments.
- [x] 4.5 Confirm downstream contract setup tests can read `carga_setup_data.json` without custom environment-specific parsing.
