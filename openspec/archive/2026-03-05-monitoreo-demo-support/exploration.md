## Exploration: Viajes Monitoreo - Demo Environment Support

### Current State

`viajes-monitoreo.test.ts` is a **Legacy test** that:
1. Reads `nroViaje` from a worker-specific JSON file (`last-run-data-{browser}.json`)
2. Depends on the prior execution of: `base-entities.setup.ts` → `viajes-planificar` → `viajes-asignar`
3. Uses `MonitoreoPage` to finalize the trip
4. Only has an npm script for QA: `test:qa:legacy:finalizar`
5. Has **NO** Demo counterpart script (`test:demo:legacy:finalizar` is missing from `package.json`)

`MonitoreoPage` already uses `await this.page.goto('/viajes/monitoreo')` (relative URL), so it automatically works on any `baseURL` configured by Playwright — **no changes needed to the Page Object**.

`TmsApiClient` already resolves the base URL from `ENV`:
```ts
const ENV = process.env.ENV || 'QA';
this.baseUrl = ENV === 'DEMO'
  ? (process.env.BASE_URL_DEMO || 'https://demo.bermanntms.cl')
  : 'https://moveontruckqa.bermanntms.cl';
```

The `playwright.config.ts` also configures `baseURL` based on `ENV` for Playwright navigations.

### Affected Areas

- `tests/e2e/modules/02-operaciones/Monitoreo/viajes-monitoreo.test.ts` — the test itself needs no code change; Demo support is purely at the run configuration level
- `package.json` — needs a `test:demo:legacy:finalizar` script (mirror of `test:qa:legacy:finalizar`)
- `package.json` — needs a `test:demo:legacy:viajes` update to include the finalizar step (currently missing it)

### Approaches

1. **Add npm script only (Minimal)**  
   Add `test:demo:legacy:finalizar` to `package.json`. The test consumes its data from `last-run-data-chromium.json` / `last-run-data-firefox.json` — the same files produced by `test:demo:legacy:planificar` and `test:demo:legacy:asignar`. No test code change needed.  
   - Pros: Zero risk, zero code change, fully consistent with QA pattern  
   - Cons: Still depends on the legacy setup chain  
   - Effort: Low

2. **Create a new E2E atomic test for Demo (like viajes-finalizar-e2e.test.ts)**  
   Create `viajes-monitoreo-e2e.test.ts` that calls `TmsApiClient` to build all prerequisites, then finalizes via `MonitoreoPage`.  
   - Pros: Self-contained, no JSON dependency, fully atomic  
   - Cons: Adds significant complexity (the full creation chain + asignación is ~300 lines in `viajes-finalizar-e2e.test.ts`), and `viajes-finalizar-e2e.test.ts` already does exactly this  
   - Effort: High

3. **Update `test:demo:legacy:viajes` to include finalizar**  
   Currently `test:demo:legacy:viajes` only chains planificar and asignar. Adding finalizar makes the complete Demo legacy flow work end-to-end.  
   - Pros: Logical completeness; mirrors `test:qa:legacy:viajes`  
   - Cons: None  
   - Effort: Low

### Recommendation

**Approach 1 + 3 together**: Add the missing `test:demo:legacy:finalizar` npm script (using `ENV=DEMO`) and update `test:demo:legacy:viajes` to include it. The test file itself works as-is because `MonitoreoPage` uses relative URLs and the JSON data path is browser-agnostic.

The existing `viajes-finalizar-e2e.test.ts` already handles the fully atomic Demo scenario; the request is specifically about making the **legacy** `viajes-monitoreo.test.ts` run in Demo with the same sequential flow pattern used in QA.

### Risks

- `last-run-data-{browser}.json` must be produced by the Demo legacy chain before running finalizar — same dependency as QA
- Demo environment may behave slightly differently (e.g., different trip IDs in the Monitoreo list), but `MonitoreoPage.buscarViaje()` filters by ID so data integrity is maintained

### Ready for Proposal

Yes — the change is well-defined and low-risk. The orchestrator should proceed to create a proposal and spec.
