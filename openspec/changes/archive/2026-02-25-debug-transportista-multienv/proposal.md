# Proposal: Debug Transportista Test for Multi-Environment (QA → Demo)

## Intent

The test `transportistas-crear.test.ts` passes in **QA** (`moveontruckqa.bermanntms.cl`) but needs to work in **Demo** (`demo.bermanntms.cl`). This proposal documents all differences found between both environments' Transportista creation forms and the strategies to handle them — **without changing the underlying test logic**, only making selectors and data environment-aware.

## Exploration Results

### Environment Versions

| Environment | URL | Version |
|-------------|-----|---------|
| **QA** | `moveontruckqa.bermanntms.cl` | 2.20.3 - .91 |
| **Demo** | `demo.bermanntms.cl` | 2.19.2 - 167 |

> [!IMPORTANT]
> The Demo environment is running an **older version** (2.19.2) vs QA (2.20.3). This explains the differences in dropdown options.

---

### Finding 1: 🟢 Form Field IDs — IDENTICAL

All text input IDs are the same in both environments. No changes needed.

| Field | QA ID | Demo ID | Match? |
|-------|-------|---------|--------|
| Nombre | `#transportistas-nombre` | `#transportistas-nombre` | ✅ |
| Razón Social | `#transportistas-razon_social` | `#transportistas-razon_social` | ✅ |
| Documento (RUT) | `#transportistas-documento` | `#transportistas-documento` | ✅ |
| Calle | `#transportistas-calle` | `#transportistas-calle` | ✅ |
| Altura | `#transportistas-altura` | `#transportistas-altura` | ✅ |
| Otros | `#transportistas-otros` | `#transportistas-otros` | ✅ |
| Guardar Button | `#btn_guardar` | `#btn_guardar` | ✅ |

---

### Finding 2: 🟢 Bootstrap Select Buttons (data-id) — IDENTICAL

All dropdown trigger buttons share the same `data-id` attributes.

| Dropdown | QA `data-id` | Demo `data-id` | Match? |
|----------|-------------|---------------|--------|
| Tipo Transportista | `transportistas-tipo_transportista_id` | `transportistas-tipo_transportista_id` | ✅ |
| Región | `transportistas-region_id` | `transportistas-region_id` | ✅ |
| Ciudad | `transportistas-ciudad_id` | `transportistas-ciudad_id` | ✅ |
| Comuna | `transportistas-comuna_id` | `transportistas-comuna_id` | ✅ |
| Forma Pago | `transportistas-forma_pago` | `transportistas-forma_pago` | ✅ |

---

### Finding 3: 🔴 Tipo Transportista Options — DIFFERENT

This is the **primary breaking difference**. The test hardcodes `'Terceros Con Flota Si Genera Contrato'` which does not exist in Demo.

**QA Options (6):**

| Value | Text |
|-------|------|
| 2 | Propio Con Flota No Genera Contrato |
| 1 | **Terceros Con Flota Si Genera Contrato** ← test uses this |
| 7 | Tercero Sin Flota Si Genera Contrato |
| 9 | Propio Con Flota Dolar |
| 10 | Tercero Dolar Con Flota |
| 11 | Tercero Dolar Sin Flota |

**Demo Options (3):**

| Value | Text |
|-------|------|
| (empty) | (blank) |
| Propio | **Propio** |
| Terceros | **Terceros** |
| En Arriendo | **En Arriendo** |

> [!CAUTION]
> The test selects `'Terceros Con Flota Si Genera Contrato'` — this option **does not exist in Demo**. The test will fail with `filter({ hasText: ... })` returning 0 matches.

**Strategy:** Use `isDemoMode()` to select the appropriate option:

- QA → `'Terceros Con Flota Si Genera Contrato'`
- Demo → `'Terceros'`

---

### Finding 4: 🟡 Forma Pago Selector — CODE MISMATCH (both envs)

The code in `TransportistaPage.ts` uses:

```typescript
formaPagoButton: 'button[data-id="transportistas-forma_pago_id"]',
```

But the actual HTML in **both** environments has:

```
data-id="transportistas-forma_pago"   // Note: no "_id" suffix!
```

> [!WARNING]
> The selector `transportistas-forma_pago_id` does NOT match the actual `data-id` in either environment. The forma pago dropdown is `transportistas-forma_pago` (without `_id`). The current QA test works only because the `selectFormaPago` method has a try/catch that silently catches the failure (`logger.warn`).

**Strategy:** Fix the selector in `TransportistaPage.ts`:

```diff
-formaPagoButton: 'button[data-id="transportistas-forma_pago_id"]',
+formaPagoButton: 'button[data-id="transportistas-forma_pago"]',
```

---

### Finding 5: 🟡 Tercerizar Selector — CODE MISMATCH (both envs)

The code uses:

```typescript
tercerizarButton: 'button[data-id="transportistas-tercerizar"]',
```

But the actual HTML in **both** environments has:

```
id="transportistas-terceariza"  // Note: different spelling "terceariza" vs "tercerizar"
```

And this is a **plain `<select>`** (not Bootstrap Select), so there's no `button[data-id]` for it.

> [!NOTE]
> The `selectTercerizar()` method is NOT called by the test (only the factory uses it), so this is not a blocker for the current test. But it should be noted for future reference.

---

### Finding 6: 🟢 Forma Pago Options — IDENTICAL

Both environments have the same options:

- Contado
- Pronto Pago
- Crédito

---

### Finding 7: 🟡 `isFormSaved()` URL Check

After saving, `isFormSaved()` checks for:

```typescript
url.includes('/transportistas/index') || url.includes('/transportistas/ver') || url.includes('/transportistas/view')
```

Both environments appear to redirect to `/transportistas` (index). This should work in both but needs verification.

---

### Finding 8: 🔴 Location Cascade — Demo Has Empty Comunas

Some Región → Ciudad combinations in the Demo environment have **no Comunas** available, causing `selectRandomComuna()` to fail with `Error: No comuna options available`.

> [!CAUTION]
> The cascade must retry with different Región/Ciudad combinations when no Comunas are found.

**Strategy:** Added `selectRandomLocationCascade(maxRetries = 5)` that retries the full chain.

---

## Summary of Differences

| # | Area | Severity | QA Works? | Demo Works? | Action Needed |
|---|------|----------|-----------|-------------|---------------|
| 1 | Form Field IDs | 🟢 None | ✅ | ✅ | None |
| 2 | Bootstrap Select `data-id` | 🟢 None | ✅ | ✅ | None |
| 3 | **Tipo Transportista options** | 🔴 Critical | ✅ | ❌ | Environment-aware option selection |
| 4 | Forma Pago selector | 🟡 Bug | ⚠️ Silent fail | ⚠️ Silent fail | Fix `data-id` suffix |
| 5 | Tercerizar selector | 🟡 Minor | N/A | N/A | Not used in test |
| 6 | Forma Pago options | 🟢 None | ✅ | ✅ | None |
| 7 | Post-save URL check | 🟡 Verify | ✅ | ❓ | Needs manual verification |
| 8 | **Location cascade empty comunas** | 🔴 Critical | ✅ | ❌ | Cascade retry logic |

## Scope

### In Scope

- Document all selector/option differences between QA and Demo for Transportista form
- Identify which test data values need to be environment-aware
- Fix cascading location selection with retry logic

### Out of Scope

- Fixing tercerizar selector (not used by test)
- Debugging other test files beyond transportistas-crear

## Approach

1. **Test data**: Use `isDemoMode()` to select the correct Tipo Transportista option text
2. **Selector fix**: Correct `formaPagoButton` data-id from `transportistas-forma_pago_id` → `transportistas-forma_pago`
3. **Missing methods**: Created `selectRandomRegion/Ciudad/Comuna` + `selectRandomLocationCascade()` with retry in `TransportistaPage.ts`
4. **No new page object needed**: The form structure is identical, only **data values** differ

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Demo might have different required fields | Low | Visually confirmed same form structure |
| Tipo Transportista determines other field behavior | Medium | Test with "Terceros" in Demo and verify save works |
| Post-save URL differs between environments | Low | Verify with a manual save in Demo |

## Rollback Plan

Revert to using three separate `selectRandomRegion/Ciudad/Comuna()` calls in the test and helper files.

## Dependencies

- Access to Demo credentials (confirmed: `arivas`/`arivas` works)
- `isDemoMode()` utility already exists in `src/utils/env-helper.ts`

## Success Criteria

- [x] All form field IDs compared between QA and Demo
- [x] All dropdown options compared and differences documented
- [x] Bootstrap Select button `data-id` attributes verified
- [x] Tipo Transportista option mismatch identified and fixed
- [x] Selector bugs found (forma_pago_id) documented and fixed
- [x] Random location methods created with cascade retry
- [x] Test updated to use `selectRandomLocationCascade()`
