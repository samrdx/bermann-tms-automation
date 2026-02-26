# Proposal: Stabilize Cliente Test for Multi-Environment (QA + Demo)

## Intent

The test `cliente-crear.test.ts` needs to be refactored to follow the same stable pattern as `transportistas-crear.test.ts`:
- **Fixture-based** Page Object (`clientePage`) instead of monolithic `ClienteHelper.createClienteViaUI()`
- **Phased test steps** (Navigate, Fill Form, Save, Verify + Data Save)
- **Environment-aware** data selection with `isDemoMode()`
- **Cascade retry** for location dropdowns
- **Correct selectors** matching actual HTML

## Exploration Results

### Environment Versions

| Environment | URL | Version |
|-------------|-----|---------|
| **QA** | `moveontruckqa.bermanntms.cl` | 2.20.3 - .91 |
| **Demo** | `demo.bermanntms.cl` | 2.19.2 - 167 |

---

### Finding 1: 🟢 Form Field IDs — IDENTICAL

| Field | QA ID | Demo ID | Match? |
|-------|-------|---------|--------|
| Nombre | `#clientes-nombre` | `#clientes-nombre` | ✅ |
| RUT | `#clientes-rut` | `#clientes-rut` | ✅ |
| Nombre Fantasía | `#clientes-nombre_fantasia` | `#clientes-nombre_fantasia` | ✅ |
| Calle | `#clientes-calle` | `#clientes-calle` | ✅ |
| Altura | `#clientes-altura` | `#clientes-altura` | ✅ |
| Otros | `#clientes-otros` | `#clientes-otros` | ✅ |
| Guardar Button | `#btn_guardar` | `#btn_guardar` | ✅ |

---

### Finding 2: 🟢 Location Dropdown IDs — IDENTICAL

| Dropdown | QA `data-id` / `id` | Demo `data-id` / `id` | Match? |
|----------|---------------------|----------------------|--------|
| Tipo Cliente | `clientes-tipo_cliente_id` | `clientes-tipo_cliente_id` | ✅ |
| Región | `clientes-region_id` | `clientes-region_id` | ✅ |
| Ciudad | `clientes-ciudad_id` | `clientes-ciudad_id` | ✅ |
| Comuna | `clientes-comuna_id` | `clientes-comuna_id` | ✅ |

---

### Finding 3: 🔴 Polígonos & Transportistas Selectors — CODE MISMATCH

The current `ClientePage.ts` uses:
```typescript
poligonosButton: 'button[data-id="clientes-poligonos"]',
transportistasButton: 'button[data-id="clientes-transportistas"]',
```

But the actual HTML in **both** environments uses:
```
Polígonos:     select#drop_zones  (data-id="drop_zones")
Transportistas: select#carriers    (data-id="carriers")
```

> [!CAUTION]
> The selectors `clientes-poligonos` and `clientes-transportistas` do **NOT exist** in the DOM. The `selectAllPoligonos()` and `selectTransportista()` methods silently fail due to visibility checks.

---

### Finding 4: 🔴 Email & Telefono — DO NOT EXIST

The `ClienteHelper.createClienteViaUI()` fills `email` and `telefono` fields:
```typescript
await clientePage.fillEmail(email);
await clientePage.fillTelefono(telefono);
```

But **neither field exists in the Client creation form** in either environment. The `ClientePage` has selectors for them (`#clientes-email`, `#clientes-telefono`), but they do not match any HTML element.

> [!CAUTION]
> These are phantom fields. The `ClienteHelper` generates an email and telefono, but the fills silently fail. This code must be removed.

---

### Finding 5: 🟡 Tipo Cliente Options — DIFFERENT

**QA Options (4):**

| Value | Text |
|-------|------|
| 1 | Distribución |
| 2 | Contenedores |
| 3 | Ultima Milllas |
| 4 | Troncal |

**Demo Options (2):**

| Value | Text |
|-------|------|
| 1 | Distribución |
| 2 | Contenedores |

> [!IMPORTANT]
> Both environments share `Distribución` and `Contenedores`. Using `'Distribución'` as the default works in both. No `isDemoMode()` branching needed for this field.

---

### Finding 6: 🟡 Location Cascade — Demo May Have Empty Comunas

Same issue as Transportista: some Región → Ciudad combinations have no Comunas in Demo.

**Strategy:** Add `selectRandomLocationCascade()` to `ClientePage` (same pattern as `TransportistaPage`).

---

### Finding 7: 🟡 ID Rescue Grid — Index Page Differences

The `ClienteHelper` uses RUT-based search on the index page to rescue the created entity's ID. The transportista test uses `TransportistaHelper.extractTransportistaIdAndName()` with `#search` + `#buscar` button.

The Cliente index page may use a different search mechanism. This needs to be verified during implementation.

---

## Summary of Differences

| # | Area | Severity | QA Works? | Demo Works? | Action Needed |
|---|------|----------|-----------|-------------|---------------|
| 1 | Form Field IDs | 🟢 None | ✅ | ✅ | None |
| 2 | Location dropdown IDs | 🟢 None | ✅ | ✅ | None |
| 3 | **Polígonos/Transportistas selectors** | 🔴 Bug | ⚠️ | ⚠️ | Fix data-id to `drop_zones` / `carriers` |
| 4 | **Email/Telefono fields** | 🔴 Bug | ❌ | ❌ | Remove from Page Object and test |
| 5 | Tipo Cliente options | 🟡 Minor | ✅ | ✅ | Use `'Distribución'` (shared) |
| 6 | Location cascade | 🟡 Medium | ✅ | ❌ | Add cascade retry |
| 7 | ID rescue | 🟡 Medium | ✅ | ❓ | Adapt helper |

## Scope

### In Scope
- Refactor `cliente-crear.test.ts` to use fixture-based `clientePage` with phased steps
- Fix selectors in `ClientePage.ts` for Polígonos and Transportistas
- Remove phantom Email/Telefono from Page Object
- Add `selectRandomLocationCascade()` and related methods to `ClientePage`
- Add `hasValidationErrors()` to `ClientePage`
- Create `ClienteHelper.extractClienteIdAndName()` for ID rescue (same pattern as `TransportistaHelper`)
- Create openspec spec for Cliente creation

### Out of Scope
- Modifying `ClienteHelper.createClienteViaUI()` (it will be superseded by the fixture-based approach)
- Other entity tests (conductor, vehiculo)

## Approach

1. **ClientePage.ts**: Fix selectors, remove email/telefono, add location cascade + helper methods
2. **cliente-crear.test.ts**: Rewrite using fixture-based `clientePage` with phased steps
3. **ClienteHelper.ts**: Add `extractClienteIdAndName()` for Phase 4 ID rescue

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Polígonos/Transportistas optional and might not need selection | Low | Add graceful skip with visibility check |
| RUT fill might behave differently between envs | Low | Uses `fillRutWithVerify` from BasePage (already proven) |
| Cliente index search mechanism different from transportista | Medium | Verify during implementation, adapt rescue strategy |

## Rollback Plan

Revert `ClientePage.ts` and `cliente-crear.test.ts` to their previous state. The `ClienteHelper.createClienteViaUI()` remains untouched as fallback.

## Success Criteria

- [x] `cliente-crear.test.ts` passes in QA (`npm run test:entity:cliente`)
- [x] `cliente-crear.test.ts` passes in Demo (`ENV=DEMO npm run test:entity:cliente`)
- [x] TypeScript compiles cleanly (`npx tsc --noEmit`)
- [x] Selectors match actual HTML in both environments
- [x] All Polígonos selected via `button.bs-select-all` (`page.evaluate` pattern)
- [x] Transportistas Asociados skipped (user decision)

## Resolution Date

**2026-02-26** — All criteria met, tests stable in both environments.
