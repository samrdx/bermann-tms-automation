## Exploration: Demo Full E2E Flow

### Current State
Currently, the project contains a comprehensive E2E test `tests/e2e/suites/viajes-finalizar-e2e.test.ts` which runs the entire flow:
1. Data generation (Transportista, Cliente, Vehiculo, Conductor, Contratos, Viaje) via `TmsApiClient`.
2. UI allocation (Asignar) via `AsignarPage`.
3. UI finalization (Monitoreo) via `MonitoreoPage`.

This test is executed via the `test:qa:trip:full-flow` script defined in `package.json`, which sets `ENV=QA`. The test code itself does not have hardcoded references to QA URLs nor hardcoded `ENV` checks that restrict it to QA. `TmsApiClient`, `AsignarPage`, and `MonitoreoPage` all respect the `ENV` variable mapped in `src/config/environment.ts`.

### Affected Areas
- `package.json` — Requires a new script to trigger the test over the Demo environment.
- `tests/e2e/suites/viajes-finalizar-e2e.test.ts` (Optional) — May require minor tweaks if we want to run the exact same file, or we may need to duplicate it if we want strict separation, though reusing is better for maintenance.

### Approaches

1. **Reuse existing test with ENV injection (Recommended)**
   - Create a new `package.json` script `test:demo:trip:full-flow` that runs `cross-env ENV=DEMO playwright test tests/e2e/suites/viajes-finalizar-e2e.test.ts --trace on`.
   - Pros: Zero code duplication. Immediate maintenance sync between QA and Demo.
   - Cons: Error messages might not clearly state which environment failed unless looking at the execution script or test reports.
   - Effort: Low.

2. **Duplicate the test file specifically for Demo**
   - Create `tests/e2e/suites/viajes-finalizar-e2e-demo.test.ts` with minor adjustments for logging.
   - Pros: Explicit separation of concerns.
   - Cons: Violates DRY (Don't Repeat Yourself). Any change to the core flow must be replicated in both files.
   - Effort: Medium.

### Recommendation
Proceed with **Approach 1**. Reusing the exact same test file is the most robust way to ensure environment parity. The test logic, Page Objects, and data creators (`TmsApiClient`) are already built to be environment-agnostic. We just need to expose a new hook in `package.json` to trigger it.

### Risks
- **Cross-Environment Field Divergences**: The USER correctly pointed out that Demo has fields and dropdown options that differ from QA (e.g., specific vehicle types, payment methods or regional data). 
  - *Mitigation*: During this exploration, we ran the base entity creation tests (`test:demo:entity:transportista` and `cliente`) which rely on `TmsApiClient` and its helpers. These executed successfully on Demo. The Page Objects are already resilient enough (using text-based dropdown selection or standard fallback IDs) to handle these divergences without needing a complete rewrite. Any specific field that fails during the E2E run can be fixed conditionally via `if (process.env.ENV === 'DEMO')`, though current evidence suggests this won't be heavily needed.
- Concurrent executions (e.g., someone running the test manually while a CI job runs) could cause resource contention, though the random `timestamp` suffix on entity names mitigates this.

### Ready for Proposal
Yes. The solution is straightforward and requires minimal effort consisting primarily of configuration changes.
