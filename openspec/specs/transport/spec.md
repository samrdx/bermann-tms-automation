# Transport — Transportista Creation Specification

## Purpose

Defines the expected behavior for the Transportista creation test across multiple TMS environments (QA, Demo). Ensures the test adapts to environment-specific form data while maintaining a unified test flow.

## Requirements

### Requirement: Environment-Aware Tipo Transportista Selection

The system MUST select the correct Tipo Transportista option based on the active environment.

- **QA** → `'Terceros Con Flota Si Genera Contrato'`
- **Demo** → `'Terceros'`

#### Scenario: Select Tipo Transportista in QA environment

- GIVEN the test is running against QA (`ENV=QA` or default)
- WHEN the Tipo Transportista dropdown is opened
- THEN the option `'Terceros Con Flota Si Genera Contrato'` MUST be selected

#### Scenario: Select Tipo Transportista in Demo environment

- GIVEN the test is running against Demo (`ENV=DEMO`)
- WHEN the Tipo Transportista dropdown is opened
- THEN the option `'Terceros'` MUST be selected

#### Scenario: Tipo Transportista option does not exist

- GIVEN the test is running in any environment
- WHEN the expected Tipo Transportista option is not found in the dropdown
- THEN the test MUST fail with a descriptive error message
- AND a screenshot SHOULD be captured

---

### Requirement: Form Field Selectors MUST Work in Both Environments

All form field selectors MUST resolve correctly in both QA and Demo.

#### Scenario: Text inputs resolve in both environments

- GIVEN the Transportista creation page is loaded in any environment
- WHEN the test interacts with text fields (nombre, razón social, documento, calle, altura)
- THEN each field MUST be located by its `#transportistas-*` ID selector
- AND each field MUST be visible and fillable

#### Scenario: Dropdown buttons resolve in both environments

- GIVEN the Transportista creation page is loaded in any environment
- WHEN the test interacts with dropdown fields (tipo, región, ciudad, comuna, forma pago)
- THEN each dropdown MUST be triggered by its `button[data-id="transportistas-*"]` selector
- AND the `data-id` attribute MUST match the actual HTML element

---

### Requirement: Forma Pago Selector Accuracy

The Forma Pago dropdown selector MUST use the correct `data-id` value: `transportistas-forma_pago` (without `_id` suffix).

#### Scenario: Select Forma Pago successfully

- GIVEN the Transportista creation page is loaded
- WHEN the test selects the Forma Pago dropdown
- THEN the selector `button[data-id="transportistas-forma_pago"]` MUST match
- AND the option `'Contado'` MUST be selectable

#### Scenario: Forma Pago selector with wrong data-id fails

- GIVEN the Transportista creation page is loaded
- WHEN a selector uses `transportistas-forma_pago_id` (with `_id` suffix)
- THEN the selector MUST NOT match any element
- AND the interaction SHOULD fail visibly (not be silently swallowed)

---

### Requirement: Random Geographic Selection with Cascade Retry

The test MUST select a valid Región → Ciudad → Comuna combination using cascading dropdowns. If a selected combination has no options at a child level (e.g., no Comunas for a given Ciudad), the system MUST retry with a different parent selection.

#### Scenario: Successful cascade selection on first attempt

- GIVEN the Transportista creation page is loaded
- WHEN `selectRandomLocationCascade()` is called
- AND the first randomly selected Región → Ciudad → Comuna all have valid options
- THEN each level MUST be selected successfully
- AND the method MUST return without error

#### Scenario: Retry when no Comunas available for selected Ciudad

- GIVEN a Región and Ciudad have been selected
- WHEN the Comuna dropdown has no available options (count ≤ 1)
- THEN the system MUST close the dropdown cleanly
- AND retry by selecting a different Región → Ciudad → Comuna combination
- AND log a warning indicating the retry reason

#### Scenario: Retry when no Ciudades available for selected Región

- GIVEN a Región has been selected
- WHEN the Ciudad dropdown has no available options
- THEN the system MUST retry with a different Región
- AND log a warning indicating the retry reason

#### Scenario: All retries exhausted

- GIVEN `selectRandomLocationCascade(maxRetries)` has been called
- WHEN all `maxRetries` attempts fail to find a valid combination
- THEN the test MUST fail with a descriptive error message
- AND a screenshot MUST be captured

#### Scenario: Individual selectRandom methods (backward compatibility)

- GIVEN any caller uses `selectRandomRegion()`, `selectRandomCiudad()`, or `selectRandomComuna()` independently
- WHEN the respective dropdown has no options
- THEN the method MUST throw an error (no retry)
- AND a screenshot SHOULD be captured

---

### Requirement: Transportista Save and Verification

After filling all required fields, the Transportista MUST be saved successfully and the test MUST verify the save.

#### Scenario: Successful save redirects to index or view

- GIVEN all required fields are filled (nombre, razón social, documento, tipo)
- WHEN the Guardar button is clicked
- THEN the page URL MUST contain `/transportistas/index` or `/transportistas/ver` or `/transportistas/view`
- AND `isFormSaved()` MUST return `true`

#### Scenario: Save includes environment-correct data

- GIVEN the test is running in Demo with Tipo `'Terceros'`
- WHEN the form is saved
- THEN the Transportista MUST be created with the Demo-specific tipo value
- AND the created entity data MUST be persisted to the worker-specific JSON file
