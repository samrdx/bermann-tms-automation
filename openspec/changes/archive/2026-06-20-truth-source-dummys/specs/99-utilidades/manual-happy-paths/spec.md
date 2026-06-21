# Specification: Manual Happy Paths Utility

## Purpose
This utility generates a single markdown file listing the latest active set of happy-path dummy entities (carrier, vehicle, driver, contract) and static credentials. This acts as the truth source for manual QA and demo runs, segmented by environment.

## Requirements

| Requirement ID & Name | Description |
|---|---|
| **REQ-MHP-001: Happy Path Registry Generation** | Upon completion of data seeding, the system **MUST** generate and overwrite `docs/manual-happy-paths.md`. It **MUST NOT** accumulate historical entries, preserving only the single latest active set of: 1 Transportista, 1 Vehículo, 1 Conductor, and 1 Contrato. |
| **REQ-MHP-002: Environment-Scoped Output** | The registry **MUST** support distinct sections for QA and DEMO environments. |
| **REQ-MHP-003: Structured Entity Details** | The generated markdown **MUST** detail exactly: <br>- **Transportista**: Name, RUT, ID<br>- **Vehículo**: Patente<br>- **Conductor**: Name, RUT<br>- **Contrato**: ID, NroContrato, Type ('ruta' or 'macrozona'), Route Names, Expiration Date |
| **REQ-MHP-004: Static Credentials Reference** | The registry **MUST** include static/fixed credentials for reference across environments. |
| **REQ-MHP-005: Concurrency Protection** | File writing **MUST** be synchronized or restricted to sequential execution stages to prevent parallel write corruption. |

---

### Requirement: REQ-MHP-001: Happy Path Registry Generation

The system **MUST** generate and overwrite `docs/manual-happy-paths.md` upon completion of data seeding. It **MUST NOT** accumulate history, keeping only the latest active set.

#### Scenario: Happy Path - Generate and Overwrite Registry
- GIVEN a successful data seeding execution
- WHEN the utility writes to `docs/manual-happy-paths.md`
- THEN the file is overwritten with exactly the latest active carrier, vehicle, driver, and contract
- AND no historical records of previous seedings remain in the file

#### Scenario: Edge Case - Seeding Fails Partially
- GIVEN a data seeding execution that fails after creating only a carrier
- WHEN the registry generation is triggered
- THEN the system **SHALL NOT** overwrite the existing registry file
- AND it reports an error indicating incomplete happy-path data

---

### Requirement: REQ-MHP-002: Environment-Scoped Output

The system **MUST** support environment-scoped sections or files (QA and DEMO).

#### Scenario: Happy Path - Write Scoped Environments
- GIVEN data is seeded for QA and DEMO environments
- WHEN the registry file is generated
- THEN separate sections are outputted for QA and DEMO respectively

#### Scenario: Edge Case - Missing Environment Seeding
- GIVEN seeding is executed only for QA and not for DEMO
- WHEN the registry is generated
- THEN the QA section is updated with new data
- AND the DEMO section displays a "Not Seeded" status or placeholder

---

### Requirement: REQ-MHP-003: Structured Entity Details

The markdown registry **MUST** format and output specific details for Transportista, Vehículo, Conductor, and Contrato.

#### Scenario: Happy Path - Verify Structured Details Format
- GIVEN a generated registry file
- WHEN inspecting the markdown structure
- THEN Transportista contains Name, RUT, ID
- AND Vehículo contains Patente
- AND Conductor contains Name, RUT
- AND Contrato contains ID, NroContrato, Type ('ruta' or 'macrozona'), Route Names, and Expiration Dates

#### Scenario: Edge Case - Route Names are Empty for Macrozona Contract
- GIVEN a contract of type 'macrozona' is seeded with no specific routes
- WHEN the registry markdown is generated
- THEN the Contract Route Names field displays "All routes in macrozona" or N/A
- AND does not crash during generation

---

### Requirement: REQ-MHP-004: Static Credentials Reference

The registry **MUST** include static credentials for reference.

#### Scenario: Happy Path - Display Fixed Credentials
- GIVEN the registry is generated
- WHEN viewing the credentials section
- THEN it lists the static username and password details for the target environments

---

### Requirement: REQ-MHP-005: Concurrency Protection

File writing **MUST** be synchronized or restricted to sequential stages to prevent parallel write corruption.

#### Scenario: Happy Path - Prevent Parallel Write Corruption
- GIVEN multiple parallel seeding processes are running
- WHEN write requests are triggered for the registry file
- THEN the system serializes the write operations
- AND the final file is written without corruption or interleaving
