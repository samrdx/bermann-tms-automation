# Proposal: Stabilize Vehiculo Test for Multi-Environment (QA + Demo)

## Intent

The test `vehiculo-crear.test.ts` must select the previously-created Transportista in the "Transportista ID" dropdown and work reliably in both QA and Demo environments. The current test hardcodes `'3 KG'` for Capacidad which only exists in QA.

## Exploration Results

### Environment Versions

| Environment | URL | Version |
|-------------|-----|---------|
| **QA** | `moveontruckqa.bermanntms.cl` | 2.20.3 - .91 |
| **Demo** | `demo.bermanntms.cl` | 2.19.2 - 167 |

---

### Finding 1: 🟢 Form Field IDs — IDENTICAL

| Field | QA Selector | Demo Selector | Match? |
|-------|-------------|---------------|--------|
| Patente | `#vehiculos-patente` | `#vehiculos-patente` | ✅ |
| Muestra | `#vehiculos-muestra` | `#vehiculos-muestra` | ✅ |
| Guardar | `#btn_guardar` | `#btn_guardar` | ✅ |

---

### Finding 2: 🟢 Dropdown Selectors — IDENTICAL

| Dropdown | QA `data-id` | Demo `data-id` | Match? |
|----------|-------------|----------------|--------|
| Tipo Vehiculo | `vehiculos-tipo_vehiculo_id` | `vehiculos-tipo_vehiculo_id` | ✅ |
| Transportista | `vehiculos-transportista_id` | `vehiculos-transportista_id` | ✅ |
| Capacidad | `vehiculos-capacidad_id` | `vehiculos-capacidad_id` | ✅ |

---

### Finding 3: 🟢 Tipo Vehiculo Options — SAME SET

| Option | QA | Demo |
|--------|-----|------|
| TRACTO | ✅ (value=1) | ✅ (value=1) |
| RAMPLA | ✅ (value=2) | ✅ (value=2) |
| OTROS | ✅ (value=3) | ✅ (value=3) |

> [!NOTE]
> Order differs (QA: TRACTO/RAMPLA/OTROS, Demo: TRACTO/OTROS/RAMPLA) but values match. Using `'TRACTO'` works in both.

---

### Finding 4: 🔴 Capacidad Options — DIFFERENT

**QA Options (3):**

| Value | Text |
|-------|------|
| 14 | 3 KG |
| 2 | 10 a 20 TON |
| 1 | 30 TON |

**Demo Options (1):**

| Value | Text |
|-------|------|
| 1 | 28 TON |

> [!CAUTION]
> The current test hardcodes `'3 KG'` — this **WILL fail in Demo**. Need `isDemoMode()` branching: `'3 KG'` for QA, `'28 TON'` for Demo.

---

### Finding 5: 🟡 Transportista Dropdown — Different Sizes

| Property | QA | Demo |
|----------|-----|------|
| Total options | 1425 | 27 |
| Has searchbox | ✅ | ✅ |
| Pattern | Long dropdown with search | Short dropdown with search |

> [!IMPORTANT]
> Both environments have the searchbox. The `selectTransportista()` method uses `.bs-searchbox input` to filter — this works for both sizes. The test must search for the Transportista name created by the preceding `transportistas-crear.test.ts`.

---

### Finding 6: 🟡 VehiculoPage.selectTransportista — Works but Uses Fragile Locator Chain

Current code uses:
```typescript
const dropdownContainer = this.page.locator('div.dropdown')
  .filter({ has: this.page.locator(this.selectors.transportistaButton) });
const dropdownMenu = dropdownContainer.locator('.dropdown-menu.show:visible').first();
```

This is a fragile pattern — same issue found in `ClientePage` where `.dropdown-menu.show` could match the wrong menu. Should be scoped to the specific Bootstrap Select container.

---

## Summary

| # | Finding | Severity | Action |
|---|---------|----------|--------|
| 1 | Form field IDs | 🟢 None | None |
| 2 | Dropdown selectors | 🟢 None | None |
| 3 | Tipo Vehiculo options | 🟢 None | Use `'TRACTO'` (shared) |
| 4 | **Capacidad options** | 🔴 Breaking | Add `isDemoMode()` branching |
| 5 | Transportista size | 🟡 Minor | Search works in both |
| 6 | Dropdown locator chain | 🟡 Medium | Scope to Bootstrap Select container |

## Scope

### In Scope

- Fix `vehiculo-crear.test.ts` to use `isDemoMode()` for Capacidad selection
- Ensure Transportista dropdown selection is robust with search
- Verify test passes in both QA and Demo

### Out of Scope

- Refactoring `VehiculoHelper.createVehiculoViaUI()` (legacy method)
- Adding Tipo Rampla selection (test uses `TRACTO`, not `RAMPLA`)

## Approach

1. **`vehiculo-crear.test.ts`**: Add `isDemoMode()` import, branch Capacidad selection
2. **`VehiculoPage.ts`**: Optional — improve dropdown scoping if needed
3. Verify both environments

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| `seededTransportista` not found in Demo | Medium | Search is by exact name — works if transportista test ran first |
| Capacidad text changes | Low | Use `isDemoMode()` branching |

## Rollback Plan

Revert `vehiculo-crear.test.ts` to its previous state. The change is minimal.

## Success Criteria

- [x] `vehiculo-crear.test.ts` passes in QA (`npm run test:entity:vehiculo`)
- [x] `vehiculo-crear.test.ts` passes in Demo (`ENV=DEMO npm run test:entity:vehiculo`)
- [x] Transportista correctly selected from dropdown in both environments
- [x] `DataPathHelper` isolated per environment (`-qa` vs `-demo`)
- [x] Seeded Vehiculo data correctly saved in `last-run-data` JSON
