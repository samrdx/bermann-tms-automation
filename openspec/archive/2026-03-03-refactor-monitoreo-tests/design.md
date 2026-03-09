# Design: Refactor Monitoreo Tests

## Technical Approach

The goal is to transition from a single monolithic E2E test to a two-tier testing approach for the Monitoreo module:
1.  **Full Journey (E2E)**: For regression of the entire flow.
2.  **Legacy Module Test**: For fast verification of the Monitoreo module itself as part of a sequential suite.

We will achieve this by extracting the "Monitoring" phase from the existing test and placing it in a new file, while utilizing the worker-specific JSON data to load pre-conditions.

## Architecture Decisions

### Decision: Test Splitting
**Choice**: Rename `viajes-finalizar.test.ts` to `viajes-finalizar-e2e.test.ts` and create `viajes-monitoreo.test.ts`.
**Rationale**: Clarifies the purpose of each test. `e2e` implies a full journey, while the base name implies a standard module test.

### Decision: Legacy Data Pattern
**Choice**: Use `DataPathHelper.getWorkerDataPath()` in `viajes-monitoreo.test.ts`.
**Rationale**: Follows the user's preferred pattern for sequential tests. It allows the test to be the 4th step in a chain of tests where each step consumes data from the previous one.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `tests/e2e/modules/02-operaciones/Monitoreo/viajes-finalizar.test.ts` | Rename | Renamed to `viajes-finalizar-e2e.test.ts`. |
| `tests/e2e/modules/02-operaciones/Monitoreo/viajes-monitoreo.test.ts` | Create | New atomic test for Monitoreo finalization. |
| `package.json` | Modify | Update `test:trip:finalizar` script and add `test:atomic:monitoreo` if appropriate. |

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| E2E | Full journey from entity creation to finalization. | Run `viajes-finalizar-e2e.test.ts`. |
| Atomic | Finalization of a pre-assigned trip. | Run `viajes-monitoreo.test.ts`. |

## Migration / Rollout
No migration required. This is a refactor of the test suite.
