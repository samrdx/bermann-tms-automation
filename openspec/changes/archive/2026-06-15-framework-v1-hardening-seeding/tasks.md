# Tasks: Hardening del PR Gate y Migración de Semántica de Datos V1

## Review Workload Forecast

- Estimated changed lines: ~40
- 400-line budget risk: None
- Chained PRs recommended: No
- Decision needed before apply: No

## Phase 1: Semántica de "API" a "UI Seed"

- [ ] 1.1 Modificar en `tests/e2e/suites/finanzas-prefactura-proforma-e2e.test.ts` los logs de la fase 1 que refieren a "(API)" por "(UI seed)" (ej. línea 51 y 22)
- [ ] 1.2 Modificar en `tests/e2e/suites/viajes-finalizar-e2e.test.ts` los logs que refieren a "(API)" por "(UI seed)" (ej. línea 22)

## Phase 2: Encapsulación de Selectores Modales

- [ ] 2.1 Reemplazar en `tests/e2e/suites/viajes-asignar-e2e.test.ts` el bloque try/catch que contiene el selector `.bootbox-accept` por una llamada a `await asignarPage.confirmarAsignacionSiApareceDialogo()`
- [ ] 2.2 Reemplazar en `tests/e2e/suites/viajes-finalizar-e2e.test.ts` el bloque try/catch que contiene el selector `.bootbox-accept` por una llamada a `await asignarPage.confirmarAsignacionSiApareceDialogo()`

## Phase 3: Estandarización de Semántica de Datos V1

- [ ] 3.1 Validar que los métodos de `DataPathHelper.ts` (`getSetupConfigDataPath`, `getLegacyEntityDataPath`, `getLegacyBaseDataPath`, etc.) generen por defecto los filenames V1 y que la suite los consuma correctamente

## Phase 4: Verificación

- [ ] 4.1 Ejecutar `npm run typecheck` para asegurar estabilidad de tipos
- [ ] 4.2 Ejecutar `npm run qa:e2e:finanzas-full` para comprobar que la suite principal del PR gate sigue verde
- [ ] 4.3 Ejecutar `npx playwright test tests/e2e/suites/viajes-asignar-e2e.test.ts` para verificar la refactorización del modal en la asignación
