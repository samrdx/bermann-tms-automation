# Delta for planning

## ADDED Requirements

### Requirement: Tramo creation flow coverage in `/viajes/crear`

The automated planning suite MUST validate end-to-end tramo creation from **Agregar Tramo** modal submission to visible tramo card persistence in the same trip draft.

#### Scenario: P0 - Crear tramo y cerrar modal exitosamente

- GIVEN an authenticated user is creating a trip in `/viajes/crear`
- WHEN the user opens **Agregar Tramo**, completes required tramo data, and confirms save
- THEN the modal closes successfully
- AND a new tramo card is visible under the tramo section for that trip draft

#### Scenario: P0 - Persistencia visual de datos heredados en card

- GIVEN tramo data includes KG and transportista-related values entered in the modal
- WHEN the tramo is saved
- THEN the created tramo card shows chips/labels matching those submitted values

#### Scenario: P1 - Estado inicial válido del tramo creado

- GIVEN a tramo is newly created from `/viajes/crear`
- WHEN the tramo card first appears
- THEN the tramo MUST NOT be shown in estado **Anulado**

### Requirement: Multiplicador de tramos asociados

The automated planning suite MUST validate that tramo multiplication reflects the requested associated tramo quantity.

#### Scenario: P0 - Replicación correcta con multiplicador N

- GIVEN a base tramo is configured with multiplicador value `N` (where `N > 1`)
- WHEN the tramo creation is confirmed
- THEN the UI shows exactly `N` associated tramo cards/items for that configuration

#### Scenario: P1 - Sin sobre-replicación cuando N = 1

- GIVEN a base tramo is configured with multiplicador value `1`
- WHEN the tramo creation is confirmed
- THEN exactly one tramo is shown for that configuration
- AND no extra associated tramos are created

### Requirement: Stable validation under dynamic tramo form controls

The automated planning suite SHALL validate tramo creation outcomes only after dynamic controls (dropdown/date fields) are resolved and final UI values are visible.

#### Scenario: P1 - Controles dinámicos con carga diferida

- GIVEN tramo form controls load asynchronously
- WHEN selections and date values are applied and the tramo is saved
- THEN validation is performed against the final rendered values in modal/card
- AND the flow is considered passing only if those persisted values match the submitted data
