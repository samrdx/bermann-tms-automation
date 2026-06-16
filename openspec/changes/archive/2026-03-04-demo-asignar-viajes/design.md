# Design: Asignar Viajes - Soporte Demo

## Architecture Decision

Reusar `viajes-asignar.test.ts` con guard `isDemo`, sin crear un archivo separado. Los patrones de helper son idénticos a QA.

## Key Differences: QA vs Demo

| Aspecto | QA | Demo |
|---|---|---|
| Búsqueda en grid | `input[type="search"]` (DataTables) | `#search` + clic `a#buscar` |
| ID para buscar | `nroViaje` (texto) | `nroViaje` (también funciona) |
| Selectors del form | Idénticos | Idénticos |
| Redirect post-save | `/viajes/asignar` | `/viajes/asignar` |

## Implementation Changes

### 1. `viajes-asignar.test.ts`

- Agregar `const isDemo = process.env.ENV?.toUpperCase() === 'DEMO'`
- En PHASE 9 (verificación post-save), usar el patrón `#search` + `a#buscar` ya implementado en `viajes-planificar.test.ts`
- La búsqueda puede usar `nroViaje` directamente (confirmed by exploration)

### 2. `AsignarPage.ts`

No requiere cambios — `findViajeRow()` ya usa `#search` + `a#buscar` (implementado en sesión anterior).

### 3. `package.json`

Agregar script:
```json
"test:demo:legacy:asignar": "cross-env ENV=DEMO npx playwright test tests/e2e/modules/02-operaciones/viajes/viajes-asignar.test.ts --project=chromium"
```

## Search Flow Post-Save (Demo)

```
POST-SAVE redirect → /viajes/asignar
   ↓
await page.waitForURL('**/viajes/asignar**')
   ↓
Fill #search with nroViaje
   ↓
Click a#buscar
   ↓
Wait 2s
   ↓
Find row with nroViaje text
   ↓
Assert row visible + status = ASIGNADO
```

## Sequence Diagram

```
Test → navigate(/viajes/asignar)
Test → findViajeRow(nroViaje)  ← fills #search + clicks a#buscar
Test → selectViajeRow          ← clicks pencil icon → /viajes/editar/ID
Test → selectTransportistaRobust(Horizonte 3470)
Test → wait networkidle + 3000ms (cascade)
Test → selectBootstrapDropdownByDataId(viajes-vehiculo_uno_id, TQPO-66)
Test → selectBootstrapDropdownByDataId(viajes-conductor_id, María Pérez)
Test → click #btn_guardar_form
Test → waitForURL /viajes/asignar
Test → fill #search + click a#buscar
Test → assert row visible
```

## Verification Method

Post-save, buscar en grid con `nroViaje` y verificar que la fila tiene texto `Asignado` en la columna de estado.
