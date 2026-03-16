# Spec: Configuracion de Rutas Multi-Ambiente (QA/DEMO)

## Requirements

### Requirement: Ruta Creation MUST Support QA and DEMO

The system MUST execute the same Ruta creation flow in QA and DEMO, adapting generated naming by environment.

#### Scenario: Create route in QA

- **GIVEN** execution runs with `ENV=QA` (or default)
- **WHEN** the test creates a route
- **THEN** route name SHALL start with `Qa_RT_`
- **AND** the form SHALL be saved successfully

#### Scenario: Create route in DEMO

- **GIVEN** execution runs with `ENV=DEMO`
- **WHEN** the test creates a route
- **THEN** route name SHALL start with `Demo_RT_`
- **AND** the form SHALL be saved successfully

### Requirement: Origin/Destination MUST Be Random In Range 1_..467_

The flow MUST select random Origin and Destination options from zones whose code prefix is between `1_` and `467_`.

#### Scenario: Random selection in allowed range

- **GIVEN** the route creation form is open
- **WHEN** the test selects Origin and Destination automatically
- **THEN** each selected zone SHALL match pattern `^\d+_`
- **AND** each numeric code SHALL be between `1` and `467`
- **AND** Destination SHALL be different from Origin

#### Scenario: No options available in the allowed range

- **GIVEN** the route creation dropdown is open
- **WHEN** no zone matches the allowed range `1_..467_`
- **THEN** the flow MUST fail fast
- **AND** a screenshot MUST be captured
- **AND** the error message SHOULD identify the field without valid options

### Requirement: Reporting MUST Include Logger Emojis and Allure Steps

The route test MUST provide execution traceability in logs and Allure.

#### Scenario: Successful execution generates required report metadata

- **GIVEN** a successful route creation flow
- **WHEN** the test completes
- **THEN** logs MUST include `🚚`, `✅`, `📍`, and `📊`
- **AND** Allure SHALL include `epic`, `feature`, `story`, parameters, and a final JSON attachment

### Requirement: Framework Integration MUST Expose Route Fixture and Scripts

The framework MUST expose the new page object via fixtures and execution scripts.

#### Scenario: Route fixture is available in tests

- **GIVEN** `src/fixtures/base.ts` is loaded
- **WHEN** a test requests `rutaPage`
- **THEN** fixture resolution SHALL instantiate `RutaPage` correctly

#### Scenario: Route scripts exist for both environments

- **GIVEN** project scripts are available
- **WHEN** users run `test:qa:entity:ruta` or `test:demo:entity:ruta`
- **THEN** each command SHALL execute `ruta-crear.test.ts` with the proper `ENV`

### Requirement: Created Route MUST Be Verifiable Through Search

After creation, the flow MUST confirm persistence from route index using the search controls.

#### Scenario: Search created route in index

- **GIVEN** a route was created successfully
- **WHEN** the test navigates to `/ruta/index`
- **AND** fills `#search` with the created route name
- **AND** triggers search with `#buscar`
- **THEN** the result grid SHALL contain the created route name
- **AND** the result grid SHALL contain the created route number
