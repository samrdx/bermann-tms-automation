# Proposal: Demo Full E2E Flow

## Intent
Enable the execution of the full End-to-End (E2E) UI test (`tests/e2e/suites/viajes-finalizar-e2e.test.ts`) against the Demo environment. This ensures that the Demo environment pipeline is as thoroughly tested as the QA environment by validating the entire entity creation, planning, assignment, and finalization flow without reading from legacy JSON files.

## Scope
### In Scope
- Adapting `package.json` to include a new script (`test:demo:trip:full-flow`) that runs the full E2E test sequence with `ENV=DEMO`.
- Verifying that the existing full E2E test (`tests/e2e/suites/viajes-finalizar-e2e.test.ts`) passes stably in the Demo environment, applying only minor adjustments if Demo-specific timing or UI rendering bugs surface (similar to those already addressed in `MonitoreoPage`).

### Out of Scope
- Creating new tests from scratch. We are validating the reuse of the existing cross-environment architecture.
- Modifying legacy tests (`viajes-planificar.test.ts`, `contrato-crear.test.ts`).

## Approach
Because the `TmsApiClient`, `AsignarPage`, and `MonitoreoPage` have already been engineered to dynamically resolve their URLs and target elements based on the `ENV` variable (as proven in previous SDD changes), the core test logic in `viajes-finalizar-e2e.test.ts` is inherently environment-agnostic. 

Therefore, the approach is strictly configuration-based:
1.  **Configuration:** Extend `package.json` with a `"test:demo:trip:full-flow": "cross-env ENV=DEMO playwright test tests/e2e/suites/viajes-finalizar-e2e.test.ts --trace on"` script.
2.  **Verification:** Execute the new script to confirm that `TmsApiClient` successfully generates all prerequisite data (Transportista, Cliente, Vehiculo, Conductor, Contratos, Viaje) in the Demo environment, and that the UI operations subsequently pass.

## Effort Estimate
**Low**. 
- The architectural foundation for cross-environment E2E testing is already in place.
- The effort primarily involves adding a single line to `package.json` and running the test to monitor for any Demo-specific quirks (e.g., slow data generation or UI rendering anomalies).
- Expected time to implement: < 15 minutes.
