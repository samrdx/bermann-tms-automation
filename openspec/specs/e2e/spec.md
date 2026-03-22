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

### REQ-3: Carga Setup Artifact Contract

Downstream E2E suites that depend on Carga setup entities MUST be able to consume `carga_setup_data.json` without custom parsing per environment.

#### Scenario: Contract-oriented test loads setup data

- GIVEN `carga_setup_data.json` exists for the active environment
- WHEN a dependent E2E test reads the setup artifact
- THEN the payload MUST expose seven named entries (`unidadMedida`, `categoriaCarga`, `configuracionCarga`, `contenidoCarga`, `temperaturaCarga`, `comercio`, `tipoRampla`)
- AND each entry MUST include `nombre`
- AND each entry MAY include `id` when available

#### Scenario: Setup artifact missing required entries

- GIVEN a dependent E2E test attempts to load setup artifact
- WHEN one or more required setup entries are missing
- THEN the test suite MUST fail fast with a clear guidance message to re-run `carga-setup`

### REQ-4: Cross-Environment Schema Stability for Setup Artifact

The setup artifact contract SHALL remain stable across QA and Demo environments.

#### Scenario: Same schema in QA and Demo

- GIVEN `carga-setup.test.ts` is executed in QA and Demo
- WHEN each execution writes `carga_setup_data.json`
- THEN both files MUST share the same JSON schema
- AND environment differences MUST be expressed through values, not structural changes

### REQ-5: Proforma Cross-Browser Entity Verification Contract

Proforma end-to-end suites MUST validate entity creation using a browser-agnostic verification sequence that is deterministic in Chromium and Firefox.

#### Scenario: Happy path - created Proforma is verified consistently in Chromium and Firefox

- GIVEN a Proforma is created successfully from the UI flow
- WHEN the suite executes post-save verification
- THEN the suite MUST wait for index/list readiness before asserting row content
- AND the suite MUST assert business-critical row fields for the created entity
- AND the same assertions MUST pass without browser-specific branching in Chromium and Firefox

#### Scenario: Edge case - delayed table rendering after successful creation

- GIVEN the Proforma save request succeeds but index rows render with delay
- WHEN verification starts immediately after redirect to `/proforma/index`
- THEN the suite MUST use deterministic loaded-state checks before row assertions
- AND the suite SHALL fail only when readiness and lookup criteria are not met within the defined timeout

### REQ-6: Deterministic `/proforma/index` Lookup and ID Validation

Verification on `/proforma/index` MUST retrieve and validate the created Proforma identifier using stable lookup semantics that reject empty or malformed IDs.

#### Scenario: Happy path - index returns a valid Proforma identifier

- GIVEN `/proforma/index` has loaded and contains the newly created Proforma row
- WHEN the suite performs lookup and extracts the Proforma identifier
- THEN the identifier MUST be present and non-empty
- AND the identifier MUST match the expected numeric or system-valid format
- AND the resulting assertion MUST confirm the row corresponds to the created entity

#### Scenario: Edge case - lookup finds row but extracted ID is invalid

- GIVEN the expected row is displayed in `/proforma/index`
- WHEN extracted identifier value is empty, null, or malformed
- THEN verification MUST fail with an explicit ID validation error
- AND the failure output SHOULD include lookup context needed for debugging

### REQ-7: Page Object and Test Assertion Responsibility Boundary

The verification contract SHALL separate low-level index readiness and row retrieval logic from high-level business assertions to reduce flaky checks and duplicated logic.

#### Scenario: Happy path - responsibilities are executed at the correct layer

- GIVEN the Proforma suite triggers a create-and-verify flow
- WHEN verification runs through page object and test layers
- THEN page object methods MUST provide stable readiness, lookup, and extraction primitives
- AND test cases MUST assert business outcomes using those primitives

#### Scenario: Edge case - duplicated assertion logic appears across layers

- GIVEN both page object and test layer attempt to assert the same business condition
- WHEN maintenance updates are introduced for cross-browser behavior
- THEN the contract SHOULD require consolidation to a single assertion owner
- AND duplicated assertions MAY be removed to avoid contradictory failures

## Non-Requirements

- No new massive test files MUST be created; the existing `viajes-finalizar-e2e.test.ts` SHALL be reused.
- Changes to QA infrastructure or QA-specific NPM scripts are NOT required.
