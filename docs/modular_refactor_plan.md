# Refactoring Plan: Modular Architecture (Vertical Slices)

## Objective

Transition from a Layered Architecture (`src/pages`, `src/actions`) to a Modular Architecture (`src/modules/<domain>`) to improve scalability, cohesion, and maintainability.

## 1. Directory Structure Definition

We will create `src/modules/` and group files by Business Domain:

- **`src/modules/auth/`**
  - Pages: `LoginPage.ts`
  - Actions: `AuthActions.ts`

- **`src/modules/contracts/`** (Contratos)
  - Pages: `ContratosPage.ts` (Renamed from `ContratosFormPage`)
  - Actions: `ContratosActions.ts`
  - Factories: `ContratoFactory.ts`
  - Flows: `ContractLifecycleFlow.ts`

- **`src/modules/operations/`** (Viajes)
  - Pages: `PlanificarPage.ts` (Renamed from `PlanificarViajesPage`)
  - Pages: `AsignarPage.ts` (Renamed from `AsignarViajesPage`)
  - (Future: ViajeFactory, etc.)

- **`src/modules/resources/`** (Entidades: Transportistas, Vehículos, etc.)
  - Sub-modules or flat? Let's keep them grouped as 'resources' for now or 'master-data'.
  - **`transportist/`**: `TransportistaPage.ts`, `TransportistaFactory.ts`
  - **`fleet/`**: `VehiculoPage.ts`, `ConductorPage.ts`, Factory counterparts.
  - **`clients/`**: `ClientePage.ts`, `ClienteFactory.ts`

_Alternative_: Keep flat modules for major entities? `src/modules/transportistas`, `src/modules/vehiculos`.
_Decision_: Grouping under `master-data` or `resources` might be too deep. Let's stick to **Top Level Modules** matching the App Menu:

- `auth`
- `contracts`
- `transport` (Transportistas, Vehiculos, Conductores)
- `commercial` (Clientes)
- `planning` (Planificar, Asignar)

## 2. Migration Steps

### Step 1: Create Directories

```bash
mkdir -p src/modules/auth/pages src/modules/auth/actions
mkdir -p src/modules/contracts/pages src/modules/contracts/actions src/modules/contracts/factories src/modules/contracts/flows
mkdir -p src/modules/transport/pages src/modules/transport/factories
mkdir -p src/modules/commercial/pages src/modules/commercial/factories
mkdir -p src/modules/planning/pages
```

### Step 2: Move & Rename Files

- **Auth**:
  - `src/pages/LoginPage.ts` -> `src/modules/auth/pages/LoginPage.ts`
  - `src/actions/common/AuthActions.ts` -> `src/modules/auth/actions/AuthActions.ts`
- **Contracts**:
  - `src/pages/ContratosFormPage.ts` -> `src/modules/contracts/pages/ContratosPage.ts`
  - `src/actions/contracts/ContratosActions.ts` -> `src/modules/contracts/actions/ContratosActions.ts`
  - `src/factories/ContratoFactory.ts` -> `src/modules/contracts/factories/ContratoFactory.ts`
  - `src/flows/contracts/ContractLifecycleFlow.ts` -> `src/modules/contracts/flows/ContractLifecycleFlow.ts`
- **Commercial (Clients)**:
  - `src/pages/ClienteFormPage.ts` -> `src/modules/commercial/pages/ClientePage.ts`
  - `src/factories/ClienteFactory.ts` -> `src/modules/commercial/factories/ClienteFactory.ts`
- **Transport**:
  - `src/pages/TransportistaFormPage.ts` -> `src/modules/transport/pages/TransportistaPage.ts`
  - `src/factories/TransportistaFactory.ts` -> `src/modules/transport/factories/TransportistaFactory.ts`
  - `src/pages/VehiculoFormPage.ts` -> `src/modules/transport/pages/VehiculoPage.ts`
  - `src/factories/VehiculoFactory.ts` -> `src/modules/transport/factories/VehiculoFactory.ts`
  - `src/pages/ConductorFormPage.ts` -> `src/modules/transport/pages/ConductorPage.ts`
  - `src/factories/ConductorFactory.ts` -> `src/modules/transport/factories/ConductorFactory.ts`
- **Planning (Viajes)**:
  - `src/pages/PlanificarViajesPage.ts` -> `src/modules/planning/pages/PlanificarPage.ts`
  - `src/pages/AsignarViajesPage.ts` -> `src/modules/planning/pages/AsignarPage.ts`

### Step 3: Update Imports

- Update `src/fixtures/base.ts` to point to new locations.
- Update each moved file to fix its internal imports (e.g. `../../utils/logger` might change to `../../../core/utils/logger`).
- **Wait**, `utils` and `core` stay in `src/utils` or `src/core`.

### Step 4: Verify

- Run `tsc` to catch broken imports.

### Step 5: Clean up

- Remove empty `src/pages`, `src/actions`, `src/flows`, `src/factories` directories.
