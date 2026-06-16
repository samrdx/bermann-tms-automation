# Design: Nightly QA Regressions Restructuring and Finanzas Smoke Seeding

## Technical Approach

We will create a module-level smoke test `proforma-crear.test.ts` which uses the existing `PrefacturaPage` helper class. By chaining this test after `prefactura-crear.test.ts`, we ensure data dependencies are naturally satisfied through the dynamic JSON loader (`OperationalDataLoader`). We will then clean up, add, and repair regression and smoke scripts in `package.json` to enforce this non-redundant pipeline, updating the nightly runner script to run the final regression suite.

## Architecture Decisions

### Decision: Reuse PrefacturaPage class
- **Choice**: Use the existing `PrefacturaPage` class in `src/modules/finanzas/PrefacturaPage.ts` for the proforma test.
- **Alternatives considered**: Create a new `ProformaPage` class.
- **Rationale**: `PrefacturaPage.ts` already contains all proforma selectors and robust actions (such as `navigateToProformaCrear`, `filtrarViajesPorTransportista`, `generarProforma`, and `buscarProformaEnIndexPorTransportista`). Creating a new class would duplicate these selectors and methods, violating DRY.

### Decision: Chained JSON State Transition
- **Choice**: `proforma-crear.test.ts` requires `viaje.prefacturado === true` from the JSON data. Upon completion, it writes `viaje.proformado = true`.
- **Alternatives considered**: Running proforma-crear with independent test data setup.
- **Rationale**: The legacy flow relies on sequential operations. Creating a prefactura is a hard functional prerequisite in the UI for generating a proforma. Reusing the worker JSON state ensures we align with this sequential design.

## Data Flow

```
[trip-monitoreo (Smoke 09)] ─(status: FINALIZADO)─→ [prefactura-crear (Smoke 10)] ─(prefacturado: true)─→ [proforma-crear (Smoke 11)] ─(proformado: true)─→ (Done)
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `tests/e2e/modules/03-finanzas/proforma/proforma-crear.test.ts` | Create | Individual smoke test for Proforma creation |
| `package.json` | Modify | Define smoke 10/11 scripts, clean up deleted E2E paths, and integrate `qa:e2e:finanzas-full` into regressions |

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| E2E | Prefactura creation | Execute `qa:smoke:10:prefactura` with seeded test data |
| E2E | Proforma creation | Execute `qa:smoke:11:proforma` with prefactured trip data |
| Regressions | Nightly suite | Run `npm run qa:regression:ops:full` to verify complete execution and Allure reporting |

## Migration / Rollout

No database migrations or feature flags required. The pipeline change will be rolled out as a direct commit to `main`.
