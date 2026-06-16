# Finanzas Specification (Prefactura & Proforma Smoke)

## Purpose

Define the operational and regression requirements for the Finanzas module smoke testing, specifically covering the creation of Prefacturas (for Clients) and Proformas (for Transportistas) in a non-redundant pipeline.

## Requirements

### Requirement: Prefactura Creation (Individual Smoke)
The system MUST allow the creation of a Prefactura for a trip that is in `FINALIZADO` status.
The system MUST use the client name loaded dynamically from the local JSON data source.
The system MUST transition the local JSON state of the trip to `prefacturado = true` upon successful creation.

#### Scenario: Generate Prefactura for a Finalized Trip
- **GIVEN** a trip that is marked as `FINALIZADO` in the local JSON operational data.
- **WHEN** navigating to `/prefactura/crear` and filtering voyages by the trip's client.
- **AND** selecting the first voyage and clicking "Guardar".
- **THEN** the system MUST redirect to the prefactura index and display a success indicator.
- **AND** the local JSON data MUST be updated with `prefacturado: true`.

---

### Requirement: Proforma Creation (Individual Smoke)
The system MUST allow the creation of a Proforma for a trip that is in `FINALIZADO` status.
The system MUST use the transportista name loaded dynamically from the local JSON data source.
The system MUST transition the local JSON state of the trip to `proformado = true` (or similar proform status) upon successful creation.

#### Scenario: Generate Proforma for a Finalized Trip
- **GIVEN** a trip that is marked as `FINALIZADO` in the local JSON operational data.
- **WHEN** navigating to `/proforma/crear` and filtering voyages by the trip's transportista.
- **AND** selecting the first voyage and clicking "Guardar".
- **THEN** the system MUST redirect to the proforma index and display a success indicator.
- **AND** the local JSON data MUST be updated with `proformado: true`.
