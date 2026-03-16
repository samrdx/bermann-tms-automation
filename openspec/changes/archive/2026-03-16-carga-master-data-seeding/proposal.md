# Proposal: Carga Master Data Seeding Setup

## Intent

Automate end-to-end UI seeding of 7 Carga setup dependencies so downstream contract flows can consume stable, reproducible setup data in QA and Demo.  
The change must generate dynamic names with `Qa_<Entidad>_<5digits>`, execute entities in sequence, capture names (and IDs when available), and export the final result as `carga_setup_data.json`.

## Scope

### In Scope
- Create a simplified `CargaMasterPage.ts` for the 6 name-only entities:
 - Create a simplified `CargaMasterPage.ts` for setup entities:
  - `unidadmedida/crear`
  - `categoriacarga/crear`
  - `configuracioncarga/crear`
  - `contenidocarga/index` (create flow resolved by page behavior)
  - `temperaturacarga/index` (create flow resolved by page behavior)
  - `comercio/crear`
  - `tiporampla/crear` (using field `tipo`)
- Create `carga-setup.test.ts` to run full sequential seeding.
- Implement dynamic naming conventions:
  - `Qa_<entityTag>_<5digits>` for general Carga entities.
  - `qa_tiporam_<5digits>` for Tipo Rampla.
- Collect created entity payloads (`nombre`, `id?`, timestamps, endpoint) in one object and export to `carga_setup_data.json`.
- Add phase-3 visibility/logging with per-step markers for Unidad, Categoria, Temperatura, etc., plus final setup summary for contract tests.
- Add Allure metadata/attachments following repository naming style (`epic`, `feature`, `story`, parameters, JSON attachment).
- Ensure resilience across QA and Demo environments.

### Out of Scope
- Refactor existing non-Carga setup suites.
- API seeding fallback for these entities.
- Cleanup/delete flow for seeded Carga entities.
- Changes to contract creation tests beyond consuming the generated JSON.

## Approach

Implement a metadata-driven Carga setup flow:
1. `CargaMasterPage` exposes generic methods (`navigateToEntity`, `fillNombre`, `save`, `verifyInIndex`, `captureEntityId`).
2. A `carga-setup.test.ts` orchestrates all 6 entities in required order and writes final setup artifact.
3. Name generation is centralized (helper function or `NamingHelper`) so each entity uses strict `Qa_<Tag>_<5digits>`.
4. ID capture uses fallback strategy:
   - First: parse from post-save URL if available
   - Second: query DOM row/detail cell when URL does not include ID
5. JSON export uses a deterministic path and final "ready for contracts" summary in logger + Allure attachment.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/modules/configAdmin/pages/CargaMasterPage.ts` | New | Simplified multi-entity POM for Carga masters |
| `src/fixtures/base.ts` | Modified | Register `cargaMasterPage` fixture |
| `tests/e2e/modules/01-entidades/config/carga-setup.test.ts` | New | Sequential setup script and JSON export |
| `src/utils/NamingHelper.ts` | Modified | Add Carga naming helper(s) for `Qa_<Tag>_<5digits>` |
| `tests/api-helpers/DataPathHelper.ts` | Modified (optional) | Add helper path for `carga_setup_data.json` |
| `package.json` | Modified | Add QA/DEMO and Allure scripts for carga setup |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Selector mismatch between QA and Demo | Medium | Use `tms-selectors` skill + Confluence-first selectors + fallback selectors |
| Save confirmation differs by module page behavior | Medium | Implement robust post-save detection (URL + grid verification + screenshot on error) |
| IDs unavailable in some views | Medium | Persist `id: null` explicitly and keep stable `nombre` as primary key |
| Output file collisions in parallel execution | Low | Run setup with single worker and deterministic per-env path strategy |

## Rollback Plan

Revert the new setup test, fixture registration, and Carga page object in a single commit rollback:
- Remove `src/modules/configAdmin/pages/CargaMasterPage.ts`
- Revert edits in `src/fixtures/base.ts`, `src/utils/NamingHelper.ts`, `tests/api-helpers/DataPathHelper.ts`, `package.json`
- Remove `tests/e2e/modules/01-entidades/config/carga-setup.test.ts`

## Dependencies

- Existing auth/session model from Playwright project configuration.
- Confluence selector source of truth (mandatory before implementation).
- Existing logger (`src/utils/logger.ts`) and Allure integration (`allure-playwright`).
- Existing setup data conventions used by `DataPathHelper`.

## Success Criteria

- [ ] `carga-setup.test.ts` creates all 6 Carga dependencies in one run on QA.
- [ ] Same setup runs on Demo without code changes.
- [ ] Names follow strict `Qa_<Tag>_<5digits>` format for all entities.
- [ ] `carga_setup_data.json` is generated with all entities and available IDs.
- [ ] Final setup summary clearly indicates the JSON is ready for contract tests.
- [ ] Allure report includes expected epic/feature/story, parameters, and JSON attachment.
