# Operaciones Specification (Contratos, Viajes & Monitoreo)

## Purpose

Defines the expected behavior for core operations modules (Contratos, Planificar Viajes, Asignar Viajes, and Monitoreo) under multiple environments (QA, Demo) in a coordinated workflow.

---

## 1. Contratos Requirements

### Requirement: Contratos Creation (Client & Transportista)
The system MUST support creating contract rates for both Clients and Transportistas.
The system MUST persist contract rates correctly to allow subsequent trip planning calculations to access them.

---

## 2. Planificar Viajes Requirements

### Requirement: Tramo Creation Flow Coverage in `/viajes/crear`
The automated planning suite MUST validate end-to-end tramo creation from **Agregar Tramo** modal submission to visible tramo card persistence in the same trip draft.

#### Scenario: Crear tramo y cerrar modal exitosamente
- **GIVEN** an authenticated user is creating a trip in `/viajes/crear`.
- **WHEN** the user opens **Agregar Tramo**, completes required tramo data, and confirms save.
- **THEN** the modal closes successfully.
- **AND** a new tramo card is visible under the tramo section for that trip draft.

#### Scenario: Persistencia visual de datos heredados en card
- **GIVEN** tramo data includes KG and transportista-related values entered in the modal.
- **WHEN** the tramo is saved.
- **THEN** the created tramo card shows chips/labels matching those submitted values.

### Requirement: Multiplicador de Tramos Asociados
The automated planning suite MUST validate that tramo multiplication reflects the requested associated tramo quantity.

#### Scenario: Replicación correcta con multiplicador N
- **GIVEN** a base tramo is configured with multiplicador value `N` (where `N > 1`).
- **WHEN** the tramo creation is confirmed.
- **THEN** the UI shows exactly `N` associated tramo cards/items for that configuration.

#### Scenario: Sin sobre-replicación cuando N = 1
- **GIVEN** a base tramo is configured with multiplicador value `1`.
- **WHEN** the tramo creation is confirmed.
- **THEN** exactly one tramo is shown for that configuration.
- **AND** no extra associated tramos are created.

### Requirement: Stable Validation under Dynamic Tramo Form Controls
The automated planning suite SHALL validate tramo creation outcomes only after dynamic controls (dropdown/date fields) are resolved and final UI values are visible.

---

## 3. Asignar Viajes Requirements

### Requirement: Environment-Aware Trip Assignment
The system MUST support assigning trip entities (Transportista, Vehículo, Conductor) in both QA and Demo environments using dynamic JSON data inputs.

#### Scenario: Asignar viaje exitosamente
- **GIVEN** a trip exists in `PLANIFICADO` status in the local JSON data.
- **AND** valid `seededTransportista`, `seededVehiculo`, and `seededConductor` exist in the JSON.
- **WHEN** the assigning test is executed.
- **THEN** the system opens the trip editing page.
- **AND** selects the Transportista, Vehículo, and Conductor.
- **AND** clicks "Guardar".
- **THEN** the page redirects to `/viajes/asignar`.
- **AND** the trip status appears as `ASIGNADO` in the grid.

#### Scenario: Búsqueda correcta en grid
- **GIVEN** a trip was planified and its `nroViaje` is in the local JSON.
- **WHEN** navigating to `/viajes/asignar`, entering the `nroViaje` in the search filter, and clicking search.
- **THEN** the grid filters and displays exactly the row matching that trip.

---

## 4. Monitoreo / Finalizar Viajes Requirements

### Requirement: Trip Finalization
The system MUST support changing trip status to `FINALIZADO` through the Monitoreo manual GPS modal.

#### Scenario: Finalizar viaje asignado manualmente
- **GIVEN** a trip exists in `ASIGNADO` status in the local JSON data.
- **WHEN** searching the trip ID in `/viajes/monitoreo`.
- **AND** selecting "Horario GPS (Agregar)".
- **AND** setting the status to "Finalizado" in the manual GPS modal and clicking save.
- **THEN** the trip status transitions to `FINALIZADO` in the grid.
- **AND** the local JSON data is updated with `viaje.status = "FINALIZADO"`.
