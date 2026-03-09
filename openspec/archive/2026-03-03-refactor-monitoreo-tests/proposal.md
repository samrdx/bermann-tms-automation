# Proposal: Refactor Monitoreo Tests

## Intent

The current `viajes-finalizar.test.ts` is a long E2E test that handles data preparation, assignment, and monitoring in a single flow. We want to refactor this to:
1.  **Separate Concerns**: Keep the full E2E journey but rename it to reflect its scope.
2.  **Atomic Testing**: Create a new, more focused test for the Monitoreo module that follows the project's atomic testing pattern.
3.  **Improve Maintainability**: Smaller, focused tests are easier to debug and maintain.

## Scope

### In Scope
- Rename `tests/e2e/modules/02-operaciones/Monitoreo/viajes-finalizar.test.ts` to `viajes-finalizar-e2e.test.ts`.
- Create `tests/e2e/modules/02-operaciones/Monitoreo/viajes-monitoreo.test.ts` using the extraction of Monitoring logic.
- Ensure `viajes-monitoreo.test.ts` uses `TmsApiClient` or similar to handle pre-conditions (pre-assigned trip) efficiently.

### Out of Scope
- Refactoring the `TmsApiClient` itself beyond what's needed for this test.
- Changing the `MonitoreoPage` object (unless bugs are found).

## Approach

We will follow the "Legacy Refactor" approach:
1.  Rename the existing test to `viajes-finalizar-e2e.test.ts`.
2.  Create `viajes-monitoreo.test.ts` by extracting the Monitoreo-specific phases.
3.  The new test will utilize `DataPathHelper` and the worker-specific JSON to load a trip that has already been assigned in a previous test step.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `tests/e2e/modules/02-operaciones/Monitoreo/viajes-finalizar.test.ts` | Removed (Renamed) | Original file renamed to `-e2e.test.ts`. |
| `tests/e2e/modules/02-operaciones/Monitoreo/viajes-finalizar-e2e.test.ts` | New (Renamed) | Full E2E flow. |
| `tests/e2e/modules/02-operaciones/Monitoreo/viajes-monitoreo.test.ts` | New | Atomic test for Monitoreo module. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Data Collision | Low | Use unique timestamps/identifiers for data generation in both tests. |
| Test Instability | Medium | Monitor the new atomic test for any timing issues when bypassing UI assignment. |

## Rollback Plan

1. Rename `viajes-finalizar-e2e.test.ts` back to `viajes-finalizar.test.ts`.
2. Delete `viajes-monitoreo.test.ts`.

## Dependencies

- None (Uses existing POM and API helpers).

## Success Criteria

- [ ] `viajes-finalizar-e2e.test.ts` runs and passes successfully.
- [ ] `viajes-monitoreo.test.ts` runs and passes successfully.
- [ ] Code follows project standards for atomic tests and logging.
