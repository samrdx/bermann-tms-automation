# Delta for e2e

## ADDED Requirements

### Requirement: Setup Artifact Contract for Downstream E2E Tests

Downstream E2E suites that depend on Carga setup entities MUST be able to consume `carga_setup_data.json` without custom parsing per environment.

#### Scenario: Contract-oriented test loads setup data

- GIVEN `carga_setup_data.json` exists for the active environment
- WHEN a dependent E2E test reads the setup artifact
- THEN the payload MUST expose seven named entity entries (`unidadMedida`, `categoriaCarga`, `configuracionCarga`, `contenidoCarga`, `temperaturaCarga`, `comercio`, `tipoRampla`)
- AND each entry MUST include `nombre`
- AND each entry MAY include `id` when available

#### Scenario: Setup artifact missing required entries

- GIVEN a dependent E2E test attempts to load setup artifact
- WHEN one or more required Carga entity entries are missing
- THEN the test suite MUST fail fast with a clear guidance message to re-run `carga-setup`

### Requirement: Cross-Environment Compatibility for Setup Artifact

The setup artifact contract SHALL remain stable across QA and Demo environments.

#### Scenario: Same schema in QA and Demo

- GIVEN `carga-setup.test.ts` is executed in QA and Demo
- WHEN each execution writes `carga_setup_data.json`
- THEN both files MUST share the same JSON schema
- AND environment differences MUST be expressed through values, not through structural changes

## MODIFIED Requirements

None.

## REMOVED Requirements

None.
