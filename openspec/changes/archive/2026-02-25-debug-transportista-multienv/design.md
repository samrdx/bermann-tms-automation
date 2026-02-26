# Design: Debug Transportista Test for Multi-Environment

## Technical Approach

Make the Transportista creation test environment-agnostic by using the existing `isDemoMode()` helper to branch **only on data values** that differ between environments. The form structure, selectors, and test flow remain unchanged. Additionally, fix two pre-existing selector bugs, add `selectRandom*` methods, and implement cascade retry logic for location selection.

Maps directly to:

- Spec: "Environment-Aware Tipo Transportista Selection"
- Spec: "Forma Pago Selector Accuracy"
- Spec: "Random Geographic Selection with Cascade Retry"

## Architecture Decisions

### Decision: Environment branching in test data, not in Page Object

**Choice**: Set `testData.tipo` using a ternary with `isDemoMode()` in the test file itself
**Alternatives considered**: (A) Branching inside `TransportistaPage.selectTipoTransportista()`, (B) Creating an environment config map
**Rationale**: The test file already constructs `testData` with all values. The simplest change is branching the `tipo` value right there. The Page Object should remain environment-unaware — it just clicks what it's told.

### Decision: Cascade retry for location selection

**Choice**: `selectRandomLocationCascade(maxRetries)` that retries full Región→Ciudad→Comuna chain
**Alternatives considered**: (A) Only retry Comuna, keeping same Región/Ciudad, (B) Hardcode known-good locations per environment
**Rationale**: Some Región→Ciudad combinations genuinely have zero Comunas in Demo. Retrying just the Comuna won't help. Trying a completely new Región gives maximum chance of success. Hardcoding would be fragile and environment-specific.

### Decision: Fix `formaPagoButton` selector directly

**Choice**: Change `transportistas-forma_pago_id` → `transportistas-forma_pago` in the selectors object
**Rationale**: The current `data-id` is simply wrong. Both environments use `transportistas-forma_pago`.

## Data Flow

```
ENV variable (QA | DEMO)
       │
       ├─→ isDemoMode() ─→ testData.tipo = 'Terceros' (Demo)
       │                    testData.tipo = 'Terceros Con Flota Si Genera Contrato' (QA)
       │
       └─→ playwright.config.ts ─→ baseURL
                                      │
                                      ▼
                            TransportistaFormPage
                                      │
                         ┌────────────┼────────────┐
                         ▼            ▼            ▼
                    fill fields   selectRandomLocationCascade()  click Guardar
                    (same IDs)         │                          (same #btn_guardar)
                                       ▼
                              trySelectRandomFromDropdown()
                              Región → Ciudad → Comuna
                              (retry up to 5x if empty)
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/modules/transport/pages/TransportistaPage.ts` | Modify | Fix `formaPagoButton` data-id. Add `trySelectRandomFromDropdown()`, `selectRandomLocationCascade()`, `selectRandomRegion/Ciudad/Comuna()`, `hasValidationErrors()`. |
| `tests/e2e/modules/01-entidades/transport/transportistas-crear.test.ts` | Modify | Import `isDemoMode`. Branch `testData.tipo`. Use `selectRandomLocationCascade()`. |
| `tests/api-helpers/TransportistaHelper.ts` | Modify | Use `selectRandomLocationCascade()`. |

No new files. No deleted files.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| E2E (QA) | Full transportista creation flow | `npm run test:entity:transportista` (default ENV=QA) |
| E2E (Demo) | Full transportista creation flow | `ENV=DEMO npm run test:entity:transportista` |
| TypeScript | No compilation errors | `npx tsc --noEmit` |
