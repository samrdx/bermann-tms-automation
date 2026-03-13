# Config Specification

## Purpose
This domain manages administrative configurations of the TMS, including operational types, cargo types, and business units.

## Requirements

### Requirement: Operation Type Creation
The system MUST allow users to create new Operation Types to define SLA parameters.

#### Scenario: Successful Creation (Happy Path)
- GIVEN the user is on the "Crear Tipo de Operación" page.
- WHEN the user fills the name with "Qa_TO_Standard".
- AND fills "Tiempo Previo" with "01:00".
- AND fills "Permanencia Origen" with "02:00".
- AND fills "Permanencia Destino" with "02:30".
- AND checks the "Horarios" validation.
- AND clicks "Guardar".
- THEN the system SHALL save the configuration.
- AND redirect to the index or view page.

#### Scenario: Name Convention Validation
Operation types created by QA MUST follow the `Qa_TO_[Nombre]` nomenclature.

- GIVEN the user is creating a new Operation Type.
- WHEN the user enters a name.
- THEN it SHOULD follow the prefix `Qa_TO_`.

### Requirement: Time Format Validation
Operational times MUST be entered in "HH:mm" format.

#### Scenario: Correct Time Format
- GIVEN the user enters "00:30" in a time field.
- THEN the system SHALL accept the value.

#### Scenario: Incorrect Time Format (Edge Case)
- GIVEN the user enters "30" or "0.5" in a time field.
- THEN the system SHOULD show a validation error or block saving.
