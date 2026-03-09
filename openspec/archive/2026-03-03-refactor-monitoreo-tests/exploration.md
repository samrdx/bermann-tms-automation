## Exploration: Refactor Monitoreo Tests

### Current State
Today, `tests/e2e/modules/02-operaciones/Monitoreo/viajes-finalizar.test.ts` is a comprehensive E2E test that performs the following:
1.  **FASE 1**: Preparation of all required entities (Transportista, Cliente, Vehiculo, Conductor, Contratos) via `TmsApiClient`.
2.  **FASE 1.4**: Assigning the trip to the transportista/vehicle/conductor using the `AsignarPage`.
3.  **FASE 2 & 3**: Navigating to the Monitoreo module and following the flow to finalize the trip.

This test is long and does everything from scratch. While good for E2E, it doesn't follow the "atomic test" pattern where a module's core action is tested independently.

### Affected Areas
- `tests/e2e/modules/02-operaciones/Monitoreo/viajes-finalizar.test.ts` — To be renamed to `viajes-finalizar-e2e.test.ts` and keep its full E2E flow.
- `tests/e2e/modules/02-operaciones/Monitoreo/viajes-monitoreo.test.ts` — [NEW] A new test that will focus specifically on the Monitoreo module logic.

### Approaches
1. **Direct Extraction** — Move the code exactly as it is.
   - Pros: Preserves tested logic exactly.
   - Cons: The new "atomic" test would still be doing UI assignment if we just copy-paste.
   - Effort: Low

2. **Legacy Refactor (Recommended)** — Extract the Monitoreo logic to `viajes-monitoreo.test.ts` following the project's legacy pattern.
   - Pros: Follows the project's established sequential testing pattern. Allows running just the finalization part if previous steps have been run. Faster than full E2E.
   - Cons: Depends on external data state (`last-run-data-*.json`).
   - Effort: Low/Medium

### Recommendation
I recommend **Approach 2**. We should rename the existing test to `viajes-finalizar-e2e.test.ts` to preserve the full journey. Then, create `viajes-monitoreo.test.ts` as a "Legacy" test that reads the trip number from the worker-specific JSON file (after assignment has been completed by `viajes-asignar.test.ts`).

### Risks
- `TmsApiClient` support: If `TmsApiClient` doesn't currently support assigning a trip (Step 1.4), we might need to add that helper or keep the UI assignment for now but label it as setup.
- Parallel execution: Ensuring unique data for the new test to avoid collisions.

### Ready for Proposal
Yes.
