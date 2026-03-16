# Delta for 00-config

## ADDED Requirements

### Requirement: Carga Master Setup Sequence

The setup flow MUST create Carga master dependencies in a deterministic sequence to guarantee reusable downstream data for contract-related tests.

#### Scenario: Successful sequential creation of seven Carga entities

- GIVEN the user has an authenticated session in QA or Demo
- WHEN `carga-setup.test.ts` starts execution
- AND creates entities in this order: `unidadmedida`, `categoriacarga`, `configuracioncarga`, `contenidocarga`, `temperaturacarga`, `comercio`, `tiporampla`
- THEN each entity MUST be created using the "Nombre" field as required input
- AND each creation step MUST verify that the entity is persisted (redirect and/or index validation)
- AND the flow MUST continue only after the current step is confirmed as successful

#### Scenario: One entity creation fails during the sequence

- GIVEN the setup flow is creating entities in sequence
- WHEN any entity save/verification step fails
- THEN the system MUST fail the test with an explicit error message indicating the failed entity
- AND the automation MUST capture a screenshot for diagnostics

### Requirement: Dynamic Naming Convention for Carga Entities

The naming strategy MUST generate values using `Qa_<EntityTag>_<5digits>` for Carga entities and `qa_tiporam_<5digits>` for Tipo Rampla.

#### Scenario: Generated names follow required pattern

- GIVEN the setup flow is preparing test data for a Carga entity
- WHEN it generates a name
- THEN the generated value MUST start with `Qa_` for general Carga entities
- AND it MUST include a semantic entity tag (for example `Unidad`, `Categoria`, `Contenido`, `Temperatura`)
- AND it MUST end with exactly 5 numeric digits

#### Scenario: Two generated names for the same entity in one run

- GIVEN the naming helper is called multiple times in the same setup run
- WHEN two names are generated for the same entity tag
- THEN each generated value MUST be unique within that run

#### Scenario: Tipo Rampla naming follows dedicated format

- GIVEN the setup flow is creating Tipo Rampla
- WHEN it generates the value for the `tipo` field
- THEN the generated value MUST match `qa_tiporam_<5digits>`
- AND Tipo Rampla MUST be created as the final step in the sequence

### Requirement: ID Capture with Fallback Strategy

After each save, the setup flow MUST attempt to capture the created entity ID; if unavailable, it MAY persist `null`.

#### Scenario: ID available in URL after save

- GIVEN an entity is successfully saved
- WHEN the redirected URL contains an entity ID pattern (for example `/ver/{id}` or `/view/{id}`)
- THEN the system MUST parse and store that ID in setup output

#### Scenario: ID not available in URL but available in DOM/index

- GIVEN an entity is successfully saved
- AND the URL does not expose an ID
- WHEN the test validates the created row in index/search view
- THEN the system SHOULD attempt to extract ID from DOM/grid cells
- AND if extraction succeeds, the ID MUST be stored in setup output

#### Scenario: ID not available in URL nor DOM

- GIVEN an entity is successfully saved
- WHEN no reliable ID source exists in URL or DOM
- THEN the setup output MUST store `"id": null`
- AND the entity `nombre` MUST remain the primary lookup key

### Requirement: Carga Setup JSON Artifact

At the end of a successful setup run, the system MUST persist `carga_setup_data.json` for test consumption.

#### Scenario: Write consolidated setup data file after successful run

- GIVEN all seven setup entities were created successfully
- WHEN setup execution reaches export phase
- THEN the system MUST write a file named `carga_setup_data.json`
- AND the file MUST include environment metadata and per-entity records (`nombre`, `id`, endpoint, timestamp)
- AND the file MUST be valid JSON consumable by downstream tests

#### Scenario: Setup artifact is consumed by contract-creation workflows

- GIVEN `carga_setup_data.json` was generated
- WHEN contract setup/creation tests load the artifact
- THEN each required Carga dependency name MUST be retrievable from the JSON payload

### Requirement: Logging and Allure Visibility

The setup execution MUST provide step-level observability in logger and Allure.

#### Scenario: Emoji step logging for each entity

- GIVEN the setup flow is executing
- WHEN each Carga entity step starts/completes
- THEN logger output MUST include an entity-specific marker (for example `📏 Unidad`, `🏷️ Categoría`, `❄️ Temperatura`)
- AND logs MUST include a final summary confirming setup artifact readiness

#### Scenario: Allure reporting for setup flow

- GIVEN the setup test runs with Allure enabled
- WHEN the test completes
- THEN the report MUST include standardized metadata (`epic`, `feature`, `story`, `Ambiente`)
- AND it MUST attach the exported setup JSON payload as an artifact

## MODIFIED Requirements

None.

## REMOVED Requirements

None.
