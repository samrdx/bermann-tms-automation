# Implementation Plan - Factories & Fixtures

## Goal

Refactor the monolithic `setupBusinessEntities.ts` into modular "Factory" classes and implement Playwright Custom Fixtures to enable automatic dependency injection in tests.

## 1. Create Factories (`src/factories/`)

Move logic from `src/setup/setupBusinessEntities.ts` to individual, focused classes.

- **[NEW]** `src/factories/TransportistaFactory.ts`: Handles creation of Transportistas.
- **[NEW]** `src/factories/VehiculoFactory.ts`: Handles creation of Vehicles.
- **[NEW]** `src/factories/ConductorFactory.ts`: Handles creation of Conductors.
- **[NEW]** `src/factories/ClienteFactory.ts`: Handles creation of Clients.
- **[NEW]** `src/factories/ContratoFactory.ts`: Handles creation of Contracts.

## 2. Create Playwright Fixtures (`src/fixtures/`)

Create a custom test object that extends Playwright's base `test`.

- **[NEW]** `src/fixtures/base.ts`:
  - Extends `test` as `myTest`.
  - Defines fixtures for:
    - **Pages:** `loginPage`, `contratosPage`, etc.
    - **Actions:** `authActions`, `contratosActions`.
    - **Flows:** `contractLifecycleFlow`.
    - **Factories:** `transportistaFactory`, `vehiculoFactory`, etc.
  - Automatically instantiates these with the current `page`.

## 3. Refactor Tests

Update existing tests to use the new `myTest` and injected fixtures, removing manual `new Class(...)` boilerplate.

- **[MODIFY]** `tests/e2e/contratos/contratos-creation-refactor.test.ts`

## 4. Cleanup

- **[DELETE]** `src/setup/setupBusinessEntities.ts` (once functionality is ported).
