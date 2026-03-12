## Exploration: CI Atomic Flow Timeouts

### Current State

1. **QA Chromium/Firefox (`TmsApiClient.ts`):** In `createViaje`, after trip creation, we check for success. If not immediately visible, it falls back to searching in `/viajes/asignar`. In Firefox, typing `nroViaje` and pressing `Enter` may not reliably trigger the search, leading to exhaustion of the 5 retries (max ~30s) and failing with `Viaje [745007] no encontrado tras 5 intentos`.
2. **Demo (`MonitoreoPage.ts`):** While trying to finalize a trip, the `buscarViaje` method fails to find the trip in the grid (`#registros`). It times out waiting for `Text "351906" or action buttons`.
3. **Demo Prefactura (`prefactura-crear-e2e.test.ts`):** The test reaches the 8-minute maximum timeout (`test.setTimeout(480000)`) and gets canceled at the `buscarPrefacturaEnIndex` step.

### Affected Areas

- `tests/api-helpers/TmsApiClient.ts` — Requires robust search triggering in `createViaje` fallback, similar to what we did in `extractIdAfterSave` (`clickViaJS('#buscar')`). Also, the retry window might be too short (currently 5 attempts, ~30s total).
- `src/modules/monitoring/pages/MonitoreoPage.ts` — The `clickBuscar` strategy might not be working correctly or the grid takes too long to load in DEMO.
- `tests/e2e/suites/prefactura-crear-e2e.test.ts` — The overall atomic flow takes too long. We should optimize some hardcoded `waitForTimeout` calls, or increase the total test timeout (`test.setTimeout(600000)` -> 10 mins). In Demo, things are naturally slower.

### Approaches

1. **Robust Search Triggers & Extent Retries**
   - Pros: Solves Firefox's unreliability with `press('Enter')` by using a combined `Enter` + JS click approach. Giving the backend more time (up to 8 retries) ensures eventual consistency. Increasing test timeout to 10 mins prevents cancelation on slow Demo environments.
   - Cons: Tests might take slightly longer when the environment is slow.
   - Effort: Low

### Recommendation

Implement Approach 1:

- In `TmsApiClient.ts` (`createViaje`), add `this.clickViaJS('#buscar')` instead of just `Enter`. Increase retries from 5 to 8 (giving up to ~60 seconds of indexing wait).
- In `MonitoreoPage.ts` (`buscarViaje`), ensure the page reloads correctly and we wait for grid stabilization before fetching contents.
- In `prefactura-crear-e2e.test.ts`, increase the overall test timeout from 480000 (8 mins) to 600000 (10 mins) as the atomic flow creates ~8 entities, processes trips, assigns, finalizes, and invoices.

### Risks

- Longer test timeouts might mask severe performance degradation in demo/QA environments.

### Ready for Proposal

Yes.
