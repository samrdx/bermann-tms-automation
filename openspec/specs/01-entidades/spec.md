# Entidades Specification (Clientes & Transportistas)

## Purpose

Defines the expected behavior for creating core entities (Clientes and Transportistas) across multiple TMS environments (QA, Demo). Ensures that location selection (random Región → Ciudad → Comuna cascading) and environment-specific options adapt gracefully while maintaining unified Page Object models.

---

## 1. Clientes Requirements

### Requirement: Tipo Cliente Selection — Shared Option
The test MUST select a Tipo Cliente option that exists in both environments.

#### Scenario: Select Tipo Cliente using shared option
- **GIVEN** the test is running in any environment (QA or Demo).
- **WHEN** the Tipo Cliente dropdown is opened.
- **THEN** the option `'Distribución'` MUST be selected.
- **AND** the option MUST exist in both environments.

#### Scenario: Tipo Cliente option does not exist
- **GIVEN** the test is running in any environment.
- **WHEN** the expected Tipo Cliente option is not found in the dropdown.
- **THEN** the test MUST fail with a descriptive error message.
- **AND** a screenshot SHOULD be captured.

### Requirement: Form Field Selectors MUST Work in Both Environments
All form field selectors MUST resolve correctly in both QA and Demo.

#### Scenario: Text inputs resolve in both environments
- **GIVEN** the Cliente creation page is loaded in any environment.
- **WHEN** the test interacts with text fields (nombre, rut, nombre fantasía, calle, altura, otros).
- **THEN** each field MUST be located by its `#clientes-*` ID selector.
- **AND** each field MUST be visible and fillable.

#### Scenario: Dropdown buttons resolve in both environments
- **GIVEN** the Cliente creation page is loaded in any environment.
- **WHEN** the test interacts with dropdown fields (tipo cliente, región, ciudad, comuna).
- **THEN** each dropdown MUST be triggered by its `button[data-id="clientes-*"]` selector.
- **AND** the `data-id` attribute MUST match the actual HTML element.

### Requirement: Polígonos and Transportistas Selectors MUST Use Correct IDs
The Polígonos dropdown MUST use `button[data-id="drop_zones"]` and Transportistas MUST use `button[data-id="carriers"]`.

#### Scenario: Select Polígonos successfully
- **GIVEN** the Cliente creation page is loaded.
- **WHEN** the test interacts with the Polígonos dropdown.
- **THEN** the selector `button[data-id="drop_zones"]` MUST match.
- **AND** selecting "Todos" or all options SHOULD be attempted gracefully.

#### Scenario: Polígonos dropdown not visible
- **GIVEN** the Cliente creation page is loaded.
- **WHEN** the Polígonos dropdown is not visible (optional field).
- **THEN** the test MUST skip this step gracefully.
- **AND** log a warning.

### Requirement: Random Geographic Selection with Cascade Retry
The client creation flow MUST utilize random region-city-comuna cascade selection matching the transportista cascade retry behavior.

---

## 2. Transportistas Requirements

### Requirement: Environment-Aware Tipo Transportista Selection
The system MUST select the correct Tipo Transportista option based on the active environment.
- **QA** → `'Terceros Con Flota Si Genera Contrato'`
- **Demo** → `'Terceros'`

#### Scenario: Select Tipo Transportista in QA environment
- **GIVEN** the test is running against QA (`ENV=QA` or default).
- **WHEN** the Tipo Transportista dropdown is opened.
- **THEN** the option `'Terceros Con Flota Si Genera Contrato'` MUST be selected.

#### Scenario: Select Tipo Transportista in Demo environment
- **GIVEN** the test is running against Demo (`ENV=DEMO`).
- **WHEN** the Tipo Transportista dropdown is opened.
- **THEN** the option `'Terceros'` MUST be selected.

### Requirement: Forma Pago Selector Accuracy
The Forma Pago dropdown selector MUST use the correct `data-id` value: `transportistas-forma_pago` (without `_id` suffix).

#### Scenario: Select Forma Pago successfully
- **GIVEN** the Transportista creation page is loaded.
- **WHEN** the test selects the Forma Pago dropdown.
- **THEN** the selector `button[data-id="transportistas-forma_pago"]` MUST match.
- **AND** the option `'Contado'` MUST be selectable.

### Requirement: Random Geographic Selection with Cascade Retry
The test MUST select a valid Región → Ciudad → Comuna combination using cascading dropdowns. If a selected combination has no options at a child level (e.g., no Comunas for a given Ciudad), the system MUST retry with a different parent selection.

#### Scenario: Successful cascade selection on first attempt
- **GIVEN** the Transportista creation page is loaded.
- **WHEN** `selectRandomLocationCascade()` is called.
- **AND** the first randomly selected Región → Ciudad → Comuna all have valid options.
- **THEN** each level MUST be selected successfully.

#### Scenario: Retry when no Comunas available for selected Ciudad
- **GIVEN** a Región and Ciudad have been selected.
- **WHEN** the Comuna dropdown has no available options (count ≤ 1).
- **THEN** the system MUST close the dropdown cleanly.
- **AND** retry by selecting a different Región → Ciudad → Comuna combination.

#### Scenario: All retries exhausted
- **GIVEN** `selectRandomLocationCascade(maxRetries)` has been called.
- **WHEN** all `maxRetries` attempts fail to find a valid combination.
- **THEN** the test MUST fail with a descriptive error message.
- **AND** a screenshot MUST be captured.

---

## 3. Save and Verification (Shared Behavior)

### Requirement: Entity Save and JSON Persistence
Upon successful creation, core entities MUST redirect to index/view, retrieve their newly created database IDs, and persist them to the dynamic JSON file.

#### Scenario: Successful save redirects to index or view
- **GIVEN** all required fields are filled for the entity.
- **WHEN** the Guardar button is clicked.
- **THEN** the page URL MUST contain `/index` or `/ver` or `/view`.
- **AND** `isFormSaved()` MUST return `true`.

#### Scenario: ID rescue from grid after save
- **GIVEN** the form was saved and redirected to index.
- **WHEN** the created entity's ID cannot be extracted from the URL.
- **THEN** a grid rescue MUST be attempted using document-based search (RUT/documento) or name-based search.
- **AND** the rescued ID MUST be persisted to the worker-specific JSON file.
