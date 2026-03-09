# Contracts Specification — Multi-Environment

## Purpose

Defines the expected behavior for contract creation (Tipo Costo) across both QA and Demo TMS environments. The contract creation flow MUST work identically from the test's perspective, with environment-specific adaptations handled internally by the page object.

## Requirements

### Requirement: Environment-Aware Contract Header Creation

The system MUST create a contract header (Tipo Costo) using a seeded Transportista in both QA and Demo environments. The page object MUST handle environment differences transparently.

#### Scenario: Create contract header in QA environment

- GIVEN the test runs with `ENV=QA`
- AND a seeded transportista exists in `last-run-data-chromium.json`
- WHEN the user navigates to `/contrato/crear`
- AND fills Nro Contrato, selects Tipo = "Costo", selects the seeded transportista
- AND clicks Guardar
- THEN the system redirects to `/contrato/editar/{id}`
- AND the contract ID is extractable from the URL

#### Scenario: Create contract header in Demo environment

- GIVEN the test runs with `ENV=DEMO`
- AND a seeded transportista exists in `last-run-data-chromium-demo.json`
- WHEN the user navigates to `/contrato/crear`
- AND fills Nro Contrato, selects Tipo = "Costo", selects the seeded transportista
- AND the Fecha vencimiento is set to 31/12/2026 via the daypicker (required in Demo, no manual typing allowed)
- AND "Unidad de negocio" is set to "Defecto" (required in Demo)
- THEN the system redirects to `/contrato/editar/{id}`
- AND the contract ID is extractable from the URL

#### Scenario: Navigate daypicker to select future date (Demo)

- GIVEN the test runs with `ENV=DEMO`
- AND the Fecha vencimiento field does NOT allow manual input
- WHEN the page object clicks `#contrato-fecha_vencimiento`
- AND clicks `th.picker-switch` to enter month view
- AND clicks `span.month:has-text("dic.")` to select December
- AND clicks `td.day:not(.old):not(.new):has-text("31")` to select day 31
- THEN the field value MUST be set to `31/12/2026`

#### Scenario: Transportista with search box (Demo)

- GIVEN the test runs with `ENV=DEMO`
- AND the Transportista dropdown has a `.bs-searchbox`
- WHEN the page object opens the Transportista dropdown
- THEN it MUST use the search box to find and select the transportista by name

#### Scenario: Transportista without search box (QA)

- GIVEN the test runs with `ENV=QA`
- AND the Transportista dropdown does NOT have a `.bs-searchbox`
- WHEN the page object opens the Transportista dropdown
- THEN it MUST select the transportista using direct option matching

---

### Requirement: Environment-Aware URL Resolution

The system MUST NOT use hardcoded URLs. All navigation MUST use `config.get().baseUrl` to resolve the correct environment URL.

#### Scenario: Navigation uses config base URL

- GIVEN the page object navigates to any TMS page
- WHEN constructing the URL
- THEN it MUST use `config.get().baseUrl` as the base
- AND MUST NOT hardcode `moveontruckqa.bermanntms.cl` or `demo.bermanntms.cl`

---

### Requirement: Demo-Only Fields Handling

The system SHOULD handle fields that exist only in Demo (e.g., "Unidad de negocio") without breaking QA execution.

#### Scenario: Unidad de negocio present in Demo

- GIVEN the test runs with `ENV=DEMO`
- AND the form contains a "Unidad de negocio" dropdown (`data-id="drop_business_unit"`)
- WHEN the page object fills the contract form
- THEN it MUST select "Defecto" as the business unit value
- AND the contract MUST save successfully

#### Scenario: Unidad de negocio absent in QA

- GIVEN the test runs with `ENV=QA`
- AND the form does NOT contain "Unidad de negocio"
- WHEN the page object fills the contract form
- THEN it MUST NOT attempt to interact with the non-existent field

---

### Requirement: Route and Cargo Addition (Post-Header)

The system MUST add Route and Cargo with specified tariffs after the contract header is saved. Route/Cargo IDs are environment-specific.

#### Scenario: Add route and cargo in QA

- GIVEN the contract header has been saved and the browser is on `/contrato/editar/{id}`
- AND `ENV=QA`
- WHEN the page object calls `addSpecificRouteAndCargo('20000', '50000')`
- THEN Route 715 is selected via `#btn_plus_715`
- AND Cargo 715_19 is selected via `#btn_plus_ruta_715_19`
- AND tariffs are filled (conductor: `#txt_tarifa_conductor_715` = 20000, viaje: `#txt_tarifa_extra_715` = 50000)
- AND the modal is closed cleanly

#### Scenario: Add route and cargo in Demo

- GIVEN the contract header has been saved and the browser is on `/contrato/editar/{id}`
- AND `ENV=DEMO`
- WHEN the page object calls `addSpecificRouteAndCargo('20000', '50000')`
- THEN Route 47 is selected via `#btn_plus_47`
- AND Cargo 47_6 is selected via `a#btn_plus_ruta_47_6 i.fa.fa-plus`
- AND tariffs are filled (viaje: `#txt_tarifa_extra_47` = 50000, cliente: `#txt_tarifa_cliente_47` = 20000)
- AND the modal is closed cleanly

---

### Requirement: Ground-Truth Verification

The system MUST verify contract creation by searching `/contrato/index` for the created contract number. This is the definitive anti-false-positive check.

#### Scenario: Verify contract in index table

- GIVEN a contract with nroContrato has been created
- WHEN the test navigates to `/contrato/index`
- AND searches for the nroContrato in the DataTables search input
- THEN a table row containing the nroContrato MUST be visible
- AND the contract ID is extractable from the edit link

---

### Requirement: Data Path Resolution

The system MUST resolve the correct JSON data file based on the current browser worker and environment.

#### Scenario: Data path for QA Chromium

- GIVEN `ENV=QA` and the browser is Chromium
- WHEN `DataPathHelper.getWorkerDataPath(testInfo)` is called
- THEN it MUST return `last-run-data-chromium.json`

#### Scenario: Data path for Demo Chromium

- GIVEN `ENV=DEMO` and the browser is Chromium
- WHEN `DataPathHelper.getWorkerDataPath(testInfo)` is called
- THEN it MUST return `last-run-data-chromium-demo.json`
