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
