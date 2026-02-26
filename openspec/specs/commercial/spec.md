# Commercial — Cliente Creation Specification

## Purpose

Defines the expected behavior for the Cliente creation test across multiple TMS environments (QA, Demo). Ensures the test adapts to environment-specific form data while maintaining a unified test flow.

## Requirements

### Requirement: Tipo Cliente Selection — Shared Option

The test MUST select a Tipo Cliente option that exists in both environments.

#### Scenario: Select Tipo Cliente using shared option

- GIVEN the test is running in any environment (QA or Demo)
- WHEN the Tipo Cliente dropdown is opened
- THEN the option `'Distribución'` MUST be selected
- AND the option MUST exist in both environments

#### Scenario: Tipo Cliente option does not exist

- GIVEN the test is running in any environment
- WHEN the expected Tipo Cliente option is not found in the dropdown
- THEN the test MUST fail with a descriptive error message
- AND a screenshot SHOULD be captured

---

### Requirement: Form Field Selectors MUST Work in Both Environments

All form field selectors MUST resolve correctly in both QA and Demo.

#### Scenario: Text inputs resolve in both environments

- GIVEN the Cliente creation page is loaded in any environment
- WHEN the test interacts with text fields (nombre, rut, nombre fantasía, calle, altura, otros)
- THEN each field MUST be located by its `#clientes-*` ID selector
- AND each field MUST be visible and fillable

#### Scenario: Dropdown buttons resolve in both environments

- GIVEN the Cliente creation page is loaded in any environment
- WHEN the test interacts with dropdown fields (tipo cliente, región, ciudad, comuna)
- THEN each dropdown MUST be triggered by its `button[data-id="clientes-*"]` selector
- AND the `data-id` attribute MUST match the actual HTML element

---

### Requirement: Polígonos and Transportistas Selectors MUST Use Correct IDs

The Polígonos dropdown MUST use `button[data-id="drop_zones"]` and Transportistas MUST use `button[data-id="carriers"]`.

#### Scenario: Select Polígonos successfully

- GIVEN the Cliente creation page is loaded
- WHEN the test interacts with the Polígonos dropdown
- THEN the selector `button[data-id="drop_zones"]` MUST match
- AND selecting "Todos" or all options SHOULD be attempted gracefully

#### Scenario: Polígonos dropdown not visible

- GIVEN the Cliente creation page is loaded
- WHEN the Polígonos dropdown is not visible (optional field)
- THEN the test MUST skip this step gracefully
- AND log a warning

---

### Requirement: Email and Telefono Fields DO NOT Exist

The form does NOT contain email or telefono fields. The test MUST NOT attempt to fill them.

#### Scenario: No email interaction

- GIVEN the Cliente creation page is loaded
- THEN the test MUST NOT attempt to fill any email field
- AND the Page Object MUST NOT contain email/telefono selectors

---

### Requirement: Random Geographic Selection with Cascade Retry

Same behavior as Transportista location selection.

#### Scenario: Successful cascade selection on first attempt

- GIVEN the Cliente creation page is loaded
- WHEN `selectRandomLocationCascade()` is called
- AND the first randomly selected Región → Ciudad → Comuna all have valid options
- THEN each level MUST be selected successfully

#### Scenario: Retry when no Comunas available for selected Ciudad

- GIVEN a Región and Ciudad have been selected
- WHEN the Comuna dropdown has no available options (count ≤ 1)
- THEN the system MUST retry with a different Región → Ciudad → Comuna
- AND log a warning indicating the retry reason

#### Scenario: All retries exhausted

- GIVEN `selectRandomLocationCascade(maxRetries)` has been called
- WHEN all `maxRetries` attempts fail
- THEN the test MUST fail with a descriptive error
- AND a screenshot MUST be captured

---

### Requirement: Cliente Save and Verification

After filling all required fields, the Cliente MUST be saved successfully.

#### Scenario: Successful save redirects to index or view

- GIVEN all required fields are filled (nombre, rut, nombre fantasía, tipo cliente)
- WHEN the Guardar button is clicked
- THEN the page URL MUST contain `/clientes/index` or `/clientes/ver` or `/clientes/view`
- AND `isFormSaved()` MUST return `true`

#### Scenario: ID rescue from grid after save

- GIVEN the form was saved and redirected to index
- WHEN the created entity's ID cannot be extracted from the URL
- THEN a grid rescue MUST be attempted using RUT-based search (primary) or name-based search (fallback)
- AND the rescued ID MUST be persisted to the worker-specific JSON file
