# Delta for 00-config

## ADDED Requirements

### Requirement: Single Value Capacity (Valor Único)

The system MUST allow creating a capacity with a single static value.

#### Scenario: Create a single value capacity

- GIVEN the user is on `/capacities/create`
- WHEN the user ensures "¿Es rango?" is unchecked
- AND enters a random numerical value (1-20) in "Capacidad Inicial"
- AND selects a random unit between "KG" and "TON"
- AND clicks save
- THEN the system MUST display a success message
- AND the capacity MUST be visible when searching in `/capacities/index`

### Requirement: Range Capacity (Rango)

The system MUST allow creating a capacity defined by a range (Initial and Final).

#### Scenario: Create a range capacity

- GIVEN the user is on `/capacities/create`
- WHEN the user checks the "¿Es rango?" checkbox
- AND enters a random numerical value (1-20) in "Capacidad Inicial"
- AND enters a random numerical value (1-20) in "Capacidad Final"
- AND selects a random unit between "KG" and "TON"
- AND clicks save
- THEN the system MUST display a success message
- AND the capacity range MUST be visible when searching in `/capacities/index`

### Requirement: Carga Master Setup Sequence

The setup flow MUST create Carga setup dependencies in a deterministic sequence to guarantee reusable downstream data for contract-related tests.

#### Scenario: Successful sequential creation of seven setup entities

- GIVEN the user has an authenticated session in QA or Demo
- WHEN `carga-setup.test.ts` starts execution
- AND creates entities in this order: `unidadmedida`, `categoriacarga`, `configuracioncarga`, `contenidocarga`, `temperaturacarga`, `comercio`, `tiporampla`
- THEN each entity MUST be created using the corresponding required field (`nombre` or `tipo`)
- AND each creation step MUST verify that the entity is persisted (redirect and/or index validation)
- AND the flow MUST continue only after the current step is confirmed as successful

#### Scenario: One entity creation fails during the sequence

- GIVEN the setup flow is creating entities in sequence
- WHEN any entity save/verification step fails
- THEN the system MUST fail the test with an explicit error message indicating the failed entity
- AND the automation MUST capture a screenshot for diagnostics

### Requirement: Dynamic Naming Convention for Carga Setup

The naming strategy MUST generate values using `Qa_<EntityTag>_<5digits>` for general Carga entities and `qa_tiporam_<5digits>` for Tipo Rampla.

#### Scenario: Generated names follow required pattern for standard entities

- GIVEN the setup flow is preparing test data for a standard Carga entity
- WHEN it generates a name
- THEN the generated value MUST start with `Qa_`
- AND it MUST include a semantic entity tag (for example `Unidad`, `Categoria`, `Contenido`, `Temperatura`)
- AND it MUST end with exactly 5 numeric digits

#### Scenario: Tipo Rampla naming follows dedicated format

- GIVEN the setup flow is creating Tipo Rampla
- WHEN it generates the value for the `tipo` field
- THEN the generated value MUST match `qa_tiporam_<5digits>`
- AND Tipo Rampla MUST be created as the final step in the sequence

### Requirement: Carga Setup JSON Artifact

At the end of a successful setup run, the system MUST persist `carga_setup_data.json` for test consumption.

#### Scenario: Write consolidated setup data file after successful run

- GIVEN all seven setup entities were created successfully
- WHEN setup execution reaches export phase
- THEN the system MUST write a file named `carga_setup_data.json`
- AND the file MUST include environment metadata and per-entity records (`nombre`, `id`, endpoint, timestamp)
- AND the file MUST be valid JSON consumable by downstream tests
