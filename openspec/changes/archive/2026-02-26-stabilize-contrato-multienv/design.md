# Design: Stabilize Contrato Test for Multi-Environment

## Technical Approach

Restore missing methods from `ContratosPage.ts.backup` into the current `ContratosPage.ts`, replace hardcoded URLs with `config.get().baseUrl`, and add environment-conditional handling for Demo-only fields. The existing test file (`contrato-crear.test.ts`) requires minimal changes — most adaptation happens in the page object.

## Architecture Decisions

### Decision: Merge from Backup Instead of Full Replacement

**Choice**: Selectively merge needed methods from `.backup` into the current slim `ContratosPage.ts`
**Alternatives considered**: Replace current file with full backup (564 lines)
**Rationale**: The current slim version (87 lines) was intentionally simplified. The backup has methods tied to old Select2 patterns (e.g., `fillMainForm`), navigation discovery, and other cruft we don't need. We only restore what the test actually calls.

### Decision: Bootstrap Select UI Interaction (Not Direct `selectOption`)

**Choice**: Keep the current Bootstrap Select UI interaction pattern (click button → search box → click option)
**Alternatives considered**: Use Playwright's `selectOption()` directly on the `<select>` element (backup pattern)
**Rationale**: The Bootstrap Select UI hides the native `<select>` and uses custom markup. While `selectOption()` works with `dispatchEvent`, it bypasses the actual user interaction and may miss AJAX cascade triggers. The UI interaction pattern is proven reliable in other modules.

### Decision: Environment Detection via `isDemoMode()`

**Choice**: Use the existing `isDemoMode()` helper for conditional logic
**Alternatives considered**: Feature detection (check if field exists on page)

### Decision: Validation Phase Navigation and Fallback

**Choice**: Use `Promise.all` with `waitForNavigation` during save, and retry `page.goto` in the validation phase if `ERR_ABORTED`.
**Alternatives considered**: Increasing timeouts or adding hard sleeps.
**Rationale**: Chromium often aborts the `page.goto` for the index grid if the browser is technically still finishing the save redirect. Combining a navigation wait during the save click and a retry loop for the verification navigation makes the test immune to these timing issues in both QA and Demo.

## Data Flow

```
    ENV=QA|DEMO
         │
    DataPathHelper.getWorkerDataPath()
         │
    last-run-data-{browser}-{env}.json
         │
    seededTransportista.nombre
         │
    ContratosFormPage.fillBasicContractInfo()
         │
    ┌────────────────────────────────────┐
    │ 1. navigateToCreate()              │
    │ 2. fill nroContrato                │
    │ 3. select Tipo = "Costo"           │
    │ 4. wait for cascade                │
    │ 5. select Transportista (search)   │
    │ 6. [DEMO] daypicker → 31/12/2026    │
    │ 7. [DEMO] Unidad negocio → Defecto  │
    │ 8. clickGuardar()                   │
    │ 9. extract ID from URL              │
    └────────────────────────────────────┘
         │
    ContratosFormPage.addSpecificRouteAndCargo()  // QA: route 715, Demo: route 47
         │
    ContratosFormPage.saveAndExtractId()
         │
    Verify in /contrato/index (DataTables search)
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/modules/contracts/pages/ContratosPage.ts` | Modify | Restore `addSpecificRouteAndCargo()`, `saveAndExtractId()`, `forceCloseModal()`. Fix URLs. Add `selectFechaVencimiento()` (daypicker nav). Add `selectUnidadNegocio()`. Make route/cargo IDs env-aware (QA: 715/19, Demo: 47/6). Allow `saveAndExtractId` to return empty string on URL failure to delegate to index verification. |
| `src/modules/contracts/factories/ContratoFactory.ts` | Modify | Replace hardcoded URL on line 59 with `config.get().baseUrl + '/contrato/index'` |
| `tests/e2e/modules/02-operaciones/contratos/contrato-crear.test.ts` | Modify | Add a retry loop to `page.goto('/contrato/index')` in Phase 5 to avoid `net::ERR_ABORTED` in Chromium during redirect transitions. |

## Interfaces / Contracts

No new interfaces needed. The existing `ContratosFormPage` API is preserved:

```typescript
class ContratosFormPage extends BasePage {
  navigateToCreate(): Promise<void>;
  fillBasicContractInfo(nroContrato: string, transportistaNombre: string): Promise<string>;
  addSpecificRouteAndCargo(tarifaConductor: string, tarifaViaje: string): Promise<void>;  // RESTORED, env-aware
  saveAndExtractId(): Promise<string>;  // RESTORED
  private selectFechaVencimiento(): Promise<void>;         // NEW — daypicker nav for Demo
  private selectUnidadNegocio(value: string): Promise<void>; // NEW — Bootstrap Select for Demo
  private getRouteConfig(): { routeId: string; cargoSelector: string; ... }; // NEW — env-aware route IDs
  private forceCloseModal(): Promise<void>;                // RESTORED
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| E2E (QA) | Full contract creation flow | `ENV=QA npx playwright test contrato-crear.test.ts --project=chromium` |
| E2E (Demo) | Full contract creation flow | `ENV=DEMO npx playwright test contrato-crear.test.ts --project=chromium` |
| Build | TypeScript compilation | `npx tsc --noEmit` |

## Migration / Rollout

No migration required. The changes are backwards-compatible with QA.

## Open Questions

- None — Route 47 / Cargo 6 confirmed in Demo via Playwright MCP exploration.
