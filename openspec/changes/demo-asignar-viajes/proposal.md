# Proposal: Asignar Viajes - Soporte Demo

## Intent

Implementar la funcionalidad de **Asignación de Viajes** para el ambiente **Demo**, permitiendo asignar el Transportista, Vehículo y Conductor semillados al viaje planificado y verificar que el estado cambie a "ASIGNADO".

El test existente (`viajes-asignar.test.ts`) funciona en QA pero no en Demo porque:
1. Busca el viaje por `nroViaje` (ej. "25819"), pero en Demo el grid filtra por ID interno
2. La verificación post-guardado asume QA redirect patterns

## Scope

### In Scope
- Adaptar `viajes-asignar.test.ts` para soportar `ENV=DEMO`
- Usar el ID interno del viaje (guardado en JSON por `viajes-planificar`) para buscar en el grid
- Asignar Transportista semillado (`Horizonte 3470`)
- Asignar Vehículo semillado (`TQPO-66`)
- Asignar Conductor semillado (`María Pérez`)
- Verificar que el viaje aparece en el grid con estado `ASIGNADO`
- Agregar script `npm run test:demo:legacy:asignar`

### Out of Scope
- Cambios en QA flow (no regresión)
- Soporte para Firefox en Demo (solo Chromium por ahora)
- Nuevas entidades — se usan las ya semilladas

## Approach

El test detecta `isDemo = process.env.ENV === 'DEMO'` y adapta:
1. **Búsqueda:** En Demo, obtener `viajeId` del JSON (campo `viaje.id`, que guardamos en planificación, o capturo desde el grid con `nroViaje`)
2. **Form selectors:** Los `data-id` son idénticos a QA → reutilizamos las funciones helper existentes
3. **Verificación post-save:** En Demo se redirige a `/viajes/asignar`, buscar con `#search` + clic en `a#buscar`, verificar que la fila existe con estado `ASIGNADO`

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `tests/e2e/modules/02-operaciones/viajes/viajes-asignar.test.ts` | Modified | Soporte multi-env |
| `src/modules/planning/pages/AsignarPage.ts` | Modified | `getViajeIdForSearch()` helper |
| `package.json` | Modified | Agregar script `test:demo:legacy:asignar` |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Dropdown "Transportista sin contrato" en Demo | Med | Verificar que existe contrato Costo para Horizonte 3470 |
| Modal backdrop al abrir editar | Low | Usar wait pattern ya probado en PlanificarPage |
| Vehículo/Conductor no cargados antes de seleccionar | Med | Wait networkidle + 3s pause tras selección de Transportista |

## Rollback Plan

Los cambios son aditivos (guard `isDemo`). Si algo falla en QA, revertir solo el condicional Demo. No hay cambios destructivos.

## Dependencies

- `npm run test:demo:legacy:planificar` debe haber corrido primero (genera `viaje.nroViaje`)
- JSON: `playwright/.data/last-run-data-chromium-demo.json` debe tener `viaje.nroViaje`

## Success Criteria

- [ ] `ENV=DEMO npx playwright test viajes-asignar.test.ts --project=chromium` pasa
- [ ] El viaje aparece en el grid con estado `ASIGNADO`
- [ ] QA no regresa (todos los tests QA pasan)
