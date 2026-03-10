# Delta for Finanzas (Prefactura)

## ADDED Requirements

### Requirement: Generación de Prefactura de Viajes Finalizados

The system MUST allow users to group completed (finalized) trips for a specific Client and generate a technical "Prefactura" document for billing.

#### Scenario: Happy path - Crear prefactura para un viaje finalizado exitosamente

- **GIVEN** that a trip has been successfully completed and its status is "Finalizado" (Monitoreo completado)
- **AND** the trip belongs to a specific `Cliente` (e.g., "Demo_Cliente_123")
- **WHEN** the user navigates to `/prefactura/crear`
- **AND** selects "Clientes" in the `Tipo` dropdown
- **AND** selects the specific `Cliente` in the `Cliente` dropdown
- **AND** selects "Pesos Chilenos" in the `Tipo de moneda` dropdown
- **AND** selects "Si" in the `¿Incluye IVA?` dropdown
- **AND** clicks the "Buscar viajes" button
- **THEN** the grid MUST populate with the finalized trip(s) available for prefacturation
- **AND** the user selects the trip(s) and clicks the "btn agregar"
- **AND THEN** the user clicks the "Guardar" button
- **THEN** page redirect automatically to `/prefacturar/index` and a success message "Prefactura creada con exito "SHOULD appear
- **AND** filtering by the `Cliente` MUST display the newly created Prefactura.

#### Scenario: Edge case - No trips available for the selected client in the given timeframe

- **GIVEN** a valid `Cliente` that has NO finalized trips in the current month
- **WHEN** the user searches for trips in `/prefactura/crear` for that client and timeframe
- **THEN** the grid MUST remain empty
- **AND** the user MUST NOT be able to generate a prefactura.
