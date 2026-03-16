# Exploration: carga-master-data-seeding

### Current State
The framework already supports setup-style seeding through Playwright UI tests and writes shared JSON artifacts for downstream tests (for example, `tests/e2e/suites/base-entities.setup.ts` + `tests/api-helpers/DataPathHelper.ts`). Page Objects follow a consistent `BasePage` pattern under `src/modules/*/pages`, with Winston-based logging, screenshot-on-error behavior, and Allure metadata in tests.  
There is currently no dedicated Page Object or setup script for Carga master entities (`unidadmedida`, `categoriacarga`, `configuracioncarga`, `contenidocarga`, `temperaturacarga`, `comercio`), so these dependencies are not seeded in a single resilient flow.

### Affected Areas
- `src/modules/configAdmin/pages/CargaMasterPage.ts` - New simplified POM to automate name-only create forms across 6 screens.
- `src/fixtures/base.ts` - Add `cargaMasterPage` fixture to keep consistency with existing test architecture.
- `tests/e2e/modules/01-entidades/config/carga-setup.test.ts` - New sequenced setup test to create all 6 entities and export consolidated JSON.
- `src/utils/NamingHelper.ts` - Add deterministic helper(s) for `Qa_<Entidad>_<5digits>` format.
- `tests/api-helpers/DataPathHelper.ts` - Optional helper for stable output path of `carga_setup_data.json` (env-aware).
- `package.json` - Add QA/DEMO run scripts and Allure run scripts for carga setup.

### Approaches
1. **Single Metadata-Driven Carga Master POM** - One page object with route map + selector map and generic create/verify methods.
   - Pros: Fastest delivery, low duplication, easy to add future Carga sub-entities.
   - Cons: Requires careful selector abstraction to avoid over-generalization.
   - Effort: Medium

2. **One Page Object per Entity (6 POMs)** - Separate classes for each endpoint.
   - Pros: Highly explicit, easier per-entity debugging at first glance.
   - Cons: High duplication for identical "Nombre + Guardar" flows, slower maintenance.
   - Effort: High

### Recommendation
Use the **single metadata-driven Carga Master POM** with small entity configs (create URL, index URL, field selector, search selector). This matches the user request for a simplified `CargaMasterPage.ts`, keeps setup orchestration clear, and preserves scalability.

### Risks
- Selector differences between QA and Demo can break a shared flow if Confluence selectors are incomplete.
- ID extraction may fail when redirect patterns vary (`/ver/:id` vs index-only save).
- Shared JSON output can be overwritten in parallel runs if path strategy is not explicit.

### Ready for Proposal
Yes. Proceed to proposal with scope locked to: simplified `CargaMasterPage.ts`, `carga-setup.test.ts`, consolidated `carga_setup_data.json`, phase-3 logging visibility, and Allure naming alignment.

