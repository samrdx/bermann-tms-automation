# Spec Delta: Config Admin - Tipo Servicio Setup

## ADDED Requirements

### Requirement: Tipo Servicio must depend on seeded Tipo Operacion
The framework MUST ensure Tipo Servicio setup consumes seeded Tipo Operacion data from worker-scoped JSON.

#### Scenario: Seed data exists
- **Given** Tipo Operacion seed test completed successfully
- **When** Tipo Servicio test starts
- **Then** the test SHALL read `seededTipoOperacion.nombre` and use it in dropdown selection

#### Scenario: Seed data missing
- **Given** worker data file does not include `seededTipoOperacion`
- **When** Tipo Servicio test starts
- **Then** the test SHALL fail early with an explicit dependency error

### Requirement: Ordered execution by Playwright project dependencies
Main browser projects MUST run Tipo Servicio only after Tipo Operacion seed projects complete.

#### Scenario: Seed project fails
- **Given** `seed-tipo-operacion-*` fails
- **When** `chromium-qa` or `firefox-qa` is scheduled
- **Then** dependent Tipo Servicio execution SHALL not proceed
