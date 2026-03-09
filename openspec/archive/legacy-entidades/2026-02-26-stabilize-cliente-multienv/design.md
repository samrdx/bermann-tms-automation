# Design: Stabilize Cliente Test for Multi-Environment

## Technical Approach

Refactor the Cliente creation test to follow the proven Transportista pattern: fixture-based Page Object with phased test steps, corrected selectors, and cascade retry for location selection. Remove phantom email/telefono fields.

Maps directly to:
- Spec: "Tipo Cliente Selection — Shared Option"
- Spec: "Form Field Selectors MUST Work in Both Environments"
- Spec: "Polígonos and Transportistas Selectors MUST Use Correct IDs"
- Spec: "Email and Telefono Fields DO NOT Exist"
- Spec: "Random Geographic Selection with Cascade Retry"
- Spec: "Cliente Save and Verification"

## Architecture Decisions

### Decision: Use fixture-based Page Object instead of monolithic Helper

**Choice**: Use `clientePage` fixture from `base.ts` directly in the test
**Alternatives considered**: Keep using `ClienteHelper.createClienteViaUI()`
**Rationale**: The Transportista pattern proved stable — the test controls the flow with phased steps, the Page Object handles selectors/interactions. The monolithic helper hides failures and makes debugging difficult.

### Decision: Shared Tipo Cliente option

**Choice**: Use `'Distribución'` which exists in both QA and Demo
**Alternatives considered**: Using `isDemoMode()` branching like Transportista
**Rationale**: Both environments share `Distribución`. No branching needed, simpler code.

### Decision: Fix Polígonos/Transportistas as optional with graceful skip

**Choice**: Make them optional with visibility checks (same pattern as Transportista's forma pago)
**Rationale**: These multi-select dropdowns may not be required. The test should skip if not visible.

## Data Flow

```
ENV variable (QA | DEMO)
       │
       └─→ playwright.config.ts ─→ baseURL
                                      │
                                      ▼
                            ClienteFormPage
                                      │
                         ┌────────────┼────────────┐
                         ▼            ▼            ▼
                    fill fields   selectRandomLocationCascade()   click Guardar
                    (same IDs)         │                           (same #btn_guardar)
                                       ▼
                              trySelectRandomFromDropdown()
                              Región → Ciudad → Comuna
                              (retry up to 5x if empty)
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/modules/commercial/pages/ClientePage.ts` | Modify | Fix Polígonos/Transportistas selectors (`drop_zones`/`carriers`). Remove email/telefono. Add `trySelectRandomFromDropdown()`, `selectRandomLocationCascade()`, `selectRandomRegion/Ciudad/Comuna()`, `selectAllPoligonos()`, `hasValidationErrors()`, `fillEmail()`/`fillTelefono()` removed. |
| `tests/e2e/modules/01-entidades/clientes/cliente-crear.test.ts` | Modify | Rewrite using fixture `clientePage` with 4 phased steps. Import from `base.ts` fixtures. |
| `tests/api-helpers/ClienteHelper.ts` | Modify | Add `extractClienteIdAndName()` static method for Phase 4 ID rescue. |

No new files. No deleted files.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| E2E (QA) | Full cliente creation flow | `npm run test:entity:cliente` (default ENV=QA) |
| E2E (Demo) | Full cliente creation flow | `ENV=DEMO npm run test:entity:cliente` |
| TypeScript | No compilation errors | `npx tsc --noEmit` |
