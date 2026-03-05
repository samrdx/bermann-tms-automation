# Spec: Demo Full E2E Flow

## Summary

Enable the execution of the full End-to-End (E2E) workflow test (`viajes-finalizar-e2e.test.ts`) against the Demo environment using a dedicated NPM script, ensuring the same level of automated validation currently available for QA.

## Requirements

### REQ-1: Demo Full E2E NPM Script

The project `package.json` MUST provide an executable script named `test:demo:trip:full-flow` to run the E2E suite against the Demo environment.

#### Scenario: Running the Full E2E Flow on Demo

- GIVEN the Demo environment is stable and accessible
- WHEN the user executes `npm run test:demo:trip:full-flow`
- THEN the script executes `playwright test tests/e2e/suites/viajes-finalizar-e2e.test.ts`
- AND the environment variable `ENV` is set to `DEMO`
- AND the test successfully creates all prerequisite entities (Transportista, Cliente, Vehiculo, Conductor, Contratos, Viaje) via `TmsApiClient`
- AND the test successfully executes UI interactions (Asignar, Finalizar)
- AND the process exits with code 0 on success

### REQ-2: Cross-Environment Field Resilience

The `TmsApiClient` and associated Page Objects utilized in the full E2E flow MUST support cross-environment execution between QA and Demo without hardcoded dependencies that cause failures.

#### Scenario: Handling Demo-Specific Configuration

- GIVEN the Demo environment may contain different field properties or options (e.g., Comunas, Regions or Vehicle configuration options) compared to QA
- WHEN the E2E test runs `TmsApiClient` methods
- THEN the automation framework MUST rely on robust locators (e.g., value properties, text matchers, or agnostic fallbacks proven in manual validations) to successfully complete the flow without environment-locked test errors.

## Non-Requirements

- No new massive test files MUST be created; the existing `viajes-finalizar-e2e.test.ts` SHALL be reused.
- Changes to QA infrastructure or QA-specific NPM scripts are NOT required.
