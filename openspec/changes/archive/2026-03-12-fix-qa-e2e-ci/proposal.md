# Proposal: Fix QA E2E CI Test

## Intent

El script `test:qa:e2e:ci` falla en el entorno CI (y localmente en Firefox) por problemas de sincronización en `AsignarPage` (apretar "Guardar") y en `MonitoreoPage` al tratar de encontrar la fila del viaje recién creado. El objetivo es estabilizar este test atómico para que pase 100% confiable en ambos navegadores.

## Scope

### In Scope
- Estabilizar guardar asignación en `AsignarPage.ts`.
- Estabilizar búsqueda de viaje en `MonitoreoPage.ts`.
- Asegurar ejecución verde en Chromium y Firefox para `test:qa:e2e:ci`.

### Out of Scope
- Refactorización de pruebas legacy.
- Adición de nuevos módulos.

## Approach

Implementaremos timeouts más resilientes, y fallbacks visuales tras interactuar en `AsignarPage` y `MonitoreoPage`. Usaremos el `TmsApiClient` o los hooks nativos de la aplicación para asegurarnos de que el backend guardó el viaje antes de proceder, o recurrir a métodos robustos que reintenten (como ya hace `MonitoreoPage`, pero mejorado para Firefox).

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/modules/planning/pages/AsignarPage.ts` | Modified | Ajustar espera post-guardar |
| `src/modules/monitoring/pages/MonitoreoPage.ts` | Modified | Mejorar filtro y espera por la fila |
| `tests/e2e/suites/prefactura-crear-e2e.test.ts` | Modified | Añadir posible logs o esperas de buffer |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Tiempos excesivos por timeouts | Low | Usar pollings rápidos en vez de sleeps fijos |
| Fallo estructural de Firefox | Med | Usar JS nativo `page.evaluate` para hacer clicks si es necesario |

## Rollback Plan

Revertir los cambios en los page objects usando Git a la rama `main` previa.

## Success Criteria

- [x] `npm run test:qa:e2e:ci` ejecuta exitosamente sin retries en Chromium.
- [x] `npm run test:qa:e2e:ci` ejecuta exitosamente sin retries en Firefox.
