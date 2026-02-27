# Proposal: Stabilize Contrato Test for Multi-Environment (QA → Demo)

## Intent

The test `contrato-crear.test.ts` and its page object `ContratosPage.ts` are currently hardcoded for the QA environment. The contract creation form has structural differences between QA (v2.20.3) and Demo (v2.19.2) that will cause test failures in Demo. This proposal documents all differences found and the strategies to handle them — making data and selectors environment-aware while preserving existing QA behavior.

## Exploration Results

### Environment Versions

| Environment | URL | Version |
|-------------|-----|---------|
| **QA** | `moveontruckqa.bermanntms.cl` | 2.20.3 - .91 |
| **Demo** | `demo.bermanntms.cl` | 2.19.2 - 167 |

---

### Finding 1: 🟢 Tipo Contrato Options — IDENTICAL

Both environments have the same options:

| Option | QA | Demo |
|--------|----|----|
| Costo | ✅ | ✅ |
| Venta | ✅ | ✅ |

No changes needed for Tipo Contrato selection.

---

### Finding 2: 🟢 Core Form Field IDs — IDENTICAL

| Field | QA ID | Demo ID | Match? |
|-------|-------|---------|--------|
| Nro Contrato | `#contrato-nro_contrato` | `#contrato-nro_contrato` | ✅ |
| Tipo Contrato | `data-id="contrato-tipo_tarifa_contrato_id"` | Same | ✅ |
| Transportista | `data-id="contrato-transportista_id"` | Same | ✅ |
| Fecha vencimiento | `#contrato-fecha_vencimiento` | Same | ✅ |
| Valor hora | `#contrato-valor_hora` | Same | ✅ |
| Modalidad Contrato | `data-id="modalidad_contrato"` | Same | ✅ |
| Guardar Button | `#btn_guardar` | Same | ✅ |

---

### Finding 3: 🟡 Extra Fields in Demo — "Unidad de negocio"

> [!IMPORTANT]
> Demo has an **additional dropdown** "Unidad de negocio" (`data-id="drop_business_unit"`) with options: `Defecto`, `Gtc`, `Sucursal 2`, `Transportes Thm`, etc. This field **does NOT exist in QA**.
> **This field is REQUIRED in Demo** — contract save fails without selecting a value.

**Strategy:** In Demo, select "Defecto" as the business unit value.

---

### Finding 4: 🟡 Fecha vencimiento — Required in Demo, Hidden in QA Create

> [!WARNING]
> In Demo, `Fecha vencimiento` is visible and **marked as required** (red asterisk) on the `/contrato/crear` page with a pre-filled date (today). In QA, the field appears visible but without the required marker in the initial create form.
> **The field does NOT allow manual typing** — it can only be set via the Bootstrap datetimepicker widget.

**Daypicker navigation (confirmed via Playwright MCP):**

1. Click `#contrato-fecha_vencimiento` → opens calendar at current month
2. Click `th.picker-switch` (month/year label) → switches to month view
3. Click `span.month:has-text("dic.")` → selects December
4. Click `td.day:not(.old):not(.new):has-text("31")` → selects day 31

**Strategy:** In Demo mode, navigate the daypicker to select 31/12/2026. In QA, skip (field is optional).

---

### Finding 5: 🟡 Transportista Dropdown — Search Box Difference

In Demo, the Transportista dropdown has a `.bs-searchbox` (search enabled). In QA, the Transportista dropdown **does NOT have a search box** — it's a simple dropdown.

> [!NOTE]
> The current `ContratosPage.ts` code checks for `.bs-searchbox` and branches accordingly, so this should work in both environments. However, the QA path (no search box) uses `.dropdown-item.active` which may not match. Needs validation.

---

### Finding 6: 🔴 Missing Methods in ContratosPage.ts

The current `ContratosPage.ts` (87 lines) is a **stripped-down version** that's missing critical methods used by the test:

- `addSpecificRouteAndCargo()` — called in Phase 3
- `saveAndExtractId()` — called in Phase 4

These methods exist in `ContratosPage.ts.backup` (564 lines) but were lost during a previous refactor.

> [!CAUTION]
> The test will fail at Phase 3 because `addSpecificRouteAndCargo` is not defined on the current `ContratosFormPage` class.

**Strategy:** Restore these methods from the backup, making them environment-aware.

---

### Finding 7: 🔴 Route and Cargo IDs — DIFFERENT Between Environments

The test hardcodes Route 715 and Cargo 715_19 for QA. In Demo, these IDs are different.

| Item | QA | Demo |
|------|----|----- |
| Route button | `#btn_plus_715` | `#btn_plus_47` |
| Cargo button | `#btn_plus_ruta_715_19` | `a#btn_plus_ruta_47_6 i.fa.fa-plus` |
| "Añadir Carga" | `#btn_click_715` | `#btn_click_47` |
| Tarifa Viaje | `#txt_tarifa_extra_715` | `#txt_tarifa_extra_47` |
| Tarifa Conductor | `#txt_tarifa_conductor_715` | (not visible for Demo route) |
| Tarifa Total/Cliente | — | `#txt_tarifa_cliente_47` |

> [!CAUTION]
> All route/cargo selectors are hardcoded with the route ID as a suffix. The page object MUST use environment-aware IDs.

**Strategy:** Use `isDemoMode()` to select the correct route/cargo IDs.

---

### Finding 8: 🟡 Hardcoded URLs

The backup `ContratosPage.ts.backup` and `ContratoFactory.ts` have hardcoded QA URLs.

**Strategy:** Use `config.get().baseUrl` for all URLs.

---

### Finding 9: 🟡 Factory Hardcoded URL

`ContratoFactory.ts` line 59 hardcodes `https://moveontruckqa.bermanntms.cl/contrato/index`.

**Strategy:** Replace with `config.get().baseUrl` + path.

---

## Summary of Differences

| # | Area | Severity | QA Works? | Demo Works? | Action Needed |
|---|------|----------|-----------|-------------|---------------|
| 1 | Tipo Contrato options | 🟢 None | ✅ | ✅ | None |
| 2 | Core form field IDs | 🟢 None | ✅ | ✅ | None |
| 3 | **Unidad de negocio** (Demo only) | 🔴 Critical | N/A | ❌ Required | Select "Defecto" in Demo |
| 4 | **Fecha vencimiento** (daypicker) | 🔴 Critical | ✅ | ❌ Required, no typing | Navigate daypicker to 31/12/2026 |
| 5 | Transportista search box | 🟡 Low | ✅ | ✅ | Already handled by branching |
| 6 | **Missing methods** | 🔴 Critical | ❌ | ❌ | Restore from backup |
| 7 | **Route/Cargo IDs** | 🔴 Critical | ✅ (715) | ❌ (47) | Environment-aware IDs |
| 8 | Hardcoded URLs | 🟡 Medium | ✅ | ❌ | Use config.baseUrl |
| 9 | Factory hardcoded URL | 🟡 Medium | ✅ | ❌ | Use config.baseUrl |
| 10 | Validation Phase Navigation | 🔴 Critical | Flaky | Flaky | Wait for navigation on save & retry goto |
| 10 | Validation Phase Navigation | 🔴 Critical | Flaky | Flaky | Wait for navigation on save & retry goto |

## Scope

### In Scope

- Restore `addSpecificRouteAndCargo()` and `saveAndExtractId()` from backup
- Make `ContratosPage.ts` environment-aware (Demo vs QA)
- Fix hardcoded URLs in page object and factory
- Handle Demo-only "Unidad de negocio" field (select "Defecto")
- Navigate daypicker for Fecha vencimiento (31/12/2026) in Demo
- Use environment-aware Route/Cargo IDs (QA: 715/19, Demo: 47/6)
- Wait for navigation during saving and allow graceful degradation to index search verification if URL parsing fails.
- Add retry logic to `contrato-crear.test.ts` Phase 5 `page.goto` to fix `ERR_ABORTED`.
- Wait for navigation during saving and allow graceful degradation to index search verification if URL parsing fails.
- Add retry logic to `contrato-crear.test.ts` Phase 5 `page.goto` to fix `ERR_ABORTED`.

### Out of Scope

- `contrato2cliente-crear.test.ts` (Venta/Cliente flow — separate change)
- Route/Cargo modal differences (Phase 3) — verify they work, but not changing modal logic
- Adding new test files — the existing test structure is used

## Approach

1. **Restore methods**: Merge `addSpecificRouteAndCargo()`, `saveAndExtractId()`, `forceCloseModal()` from backup into `ContratosPage.ts`
2. **URL fix**: Replace all hardcoded URLs with `config.get().baseUrl`
3. **Daypicker**: Add `selectFechaVencimiento()` method that navigates the Bootstrap datetimepicker to select 31/12/2026 in Demo
4. **Unidad de negocio**: Select "Defecto" in Demo via Bootstrap Select pattern
5. **Route/Cargo IDs**: Make `addSpecificRouteAndCargo()` environment-aware (QA: route 715 / cargo 19, Demo: route 47 / cargo 6)
6. **Selector refinement**: Use Bootstrap Select `data-id` pattern (proven in tms-dropdowns skill)
7. **Factory fix**: Replace hardcoded URL in `ContratoFactory.ts`
8. **Validation Stabilization**: Enhance `saveAndExtractId` to wait for DOM navigation internally without crashing on URL mismatch, and add a 3-attempt loop to `goto('/contrato/index')` in Phase 5 to avoid `ERR_ABORTED` on Chromium due to pending redirects.

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Daypicker navigation may fail if month not visible | Low | Click picker-switch to get month view, then select month |
| Route 47 modal interaction timing in Demo | Medium | Use explicit waits and scrollIntoView for route buttons |
| Transportista dropdown behavior differs in interaction details | Low | searchbox branching already exists |
| Modal behavior differs between environments | Low | `forceCloseModal()` uses jQuery injection that works universally |

## Rollback Plan

Restore `ContratosPage.ts` from backup and `ContratoFactory.ts` from git history. The test file itself is not being changed structurally.

## Dependencies

- `isDemoMode()` utility already exists in `src/utils/env-helper.ts`
- `config.get().baseUrl` already resolves correctly per environment
- Seeded transportista must exist in `last-run-data-{browser}.json` (or `-demo.json`)

## Success Criteria

- [ ] `ContratosPage.ts` has all required methods restored
- [ ] All hardcoded URLs replaced with config-based URLs  
- [ ] Test passes in QA: `ENV=QA npx playwright test contrato-crear.test.ts`
- [ ] Test passes in Demo: `ENV=DEMO npx playwright test contrato-crear.test.ts`
- [ ] TypeScript compilation clean (0 errors)
