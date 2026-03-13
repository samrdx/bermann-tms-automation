# Tasks: Creación Dinámica de Capacidades

## Phase 1: Core Implementation (Page Objects)

- [ ] 1.1 Create `src/modules/00-config/pages/CapacidadPage.ts` utilizing `BasePage` and `tms-page-objects` patterns.
- [ ] 1.2 Implement `fillCapacidadInicial` and `fillCapacidadFinal` methods.
- [ ] 1.3 Implement `toggleEsRango` method.
- [ ] 1.4 Implement `selectTipoCapacidad` method handling Bootstrap select dropdown (calling `tms-dropdowns` pattern).
- [ ] 1.5 Implement validation tools to read grid values in the index page.

## Phase 2: Testing / Verification

- [ ] 2.1 Create `tests/e2e/modules/00-config/capacidades-crear.test.ts`.
- [ ] 2.2 Write Scenario 1 (Range check) and execution flow.
- [ ] 2.3 Write Scenario 2 (Single value check) and execution flow.
- [ ] 2.4 Verify test execution passes reliably against the QA environment.
