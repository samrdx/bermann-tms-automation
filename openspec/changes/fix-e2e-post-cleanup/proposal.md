# Proposal: Fix E2E Tests After QA/Demo Environment Cleanup

## Intent

Tras una limpieza del ambiente QA y Demo por parte del equipo de desarrollo, los tests E2E atómicos (`prefactura-crear-e2e.test.ts`, `viajes-finalizar-e2e.test.ts`) dejaron de funcionar porque `TmsApiClient.createViaje()` y `addRouteAndTarifas()` tienen hardcodeados IDs de rutas y códigos de carga específicos que ya no existen en la base de datos limpiada.

El flujo legacy `test:qa:flow:entidades-to-prefactura` fue estabilizado y funciona porque `PlanificarPage` tiene lógica de fallback cuando la ruta no existe.

## Scope

### In Scope
- Hacer `TmsApiClient.createViaje()` resiliente leyendo dinámicamente la primera opción disponible en dropdowns de Tipo Operación, Tipo Servicio, Tipo Viaje, Código Carga, Origen y Destino
- Hacer `TmsApiClient.addRouteAndTarifas()` dinámico: leer el ID de la primera ruta disponible en el modal de rutas en lugar de usar `routeId = '1413'` (QA) / `'47'` (Demo)
- Verificación en QA y Demo con ambos tests E2E

### Out of Scope
- Cambios a los tests E2E themselves (su estructura es correcta)
- Cambios al flujo legacy
- Cambios al playwright.config.ts

## Approach

**Dynamic DOM Reading**: En lugar de hardcodear valores específicos del ambiente, leer la primera opción disponible del DOM. Esto hace los tests resistentes a cualquier limpieza o reset del ambiente.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `tests/api-helpers/TmsApiClient.ts` | Modified | `createViaje()` + `addRouteAndTarifas()` pasan de valores hardcodeados a dinámicos |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Primera opción disponible no es válida para el test | Low | Los dropdowns con opciones válidas siempre tienen al menos una opción útil; si no hay opciones el test falla con mensaje claro |
| El fix cambia comportamiento y rompe el flujo legacy | Low | El flujo legacy usa `PlanificarPage`, no `TmsApiClient.createViaje()` |

## Rollback Plan

Revertir `TmsApiClient.ts` a la versión previa (git revert). El flujo legacy no se ve afectado.

## Dependencies

- Los ambientes QA y Demo deben estar operativos (el equipo ya confirmó la estabilidad post-limpieza del legacy flow)

## Success Criteria

- [ ] `npm run test:qa:trip:full-flow` pasa en QA
- [ ] `npm run test:demo:trip:full-flow` pasa en Demo
- [ ] `npm run test:qa:flow:entidades-to-prefactura` continúa pasando (sin regresión)
