# Tasks: Viajes Crear Tramos — Cobertura Automatizada

## Review Workload Forecast

| Field                   | Value                                                                            |
| ----------------------- | -------------------------------------------------------------------------------- |
| Estimated changed lines | 360–520                                                                          |
| 400-line budget risk    | High                                                                             |
| Chained PRs recommended | Yes                                                                              |
| Suggested split         | PR 1 (POM+selectores) → PR 2 (tests tramo base) → PR 3 (multiplicador+stability) |
| Delivery strategy       | ask-on-risk                                                                      |
| Chain strategy          | pending                                                                          |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal                                              | Likely PR | Notes                                                                             |
| ---- | ------------------------------------------------- | --------- | --------------------------------------------------------------------------------- |
| 1    | Habilitar soporte de tramos en Page Object        | PR 1      | `PlanificarPage.ts` + documentación de selectores; verificable sin guardado final |
| 2    | Cubrir flujo P0 de creación y persistencia visual | PR 2      | Extiende `viajes-planificar.test.ts`; base funcional para modal+card              |
| 3    | Cubrir multiplicador/dinámicos y endurecer suite  | PR 3      | Escenarios N>1, N=1, no Anulado, waits estables y cleanup                         |

## Phase 1: Foundation / Selector Discovery

- [x] 1.1 Confirmar en QA y Demo los selectores del modal de tramos (botón abrir, botón confirmar, contenedor card/lista, chips KG/transportista, campo multiplicador) y registrar evidencia en `docs/ProjectSelectors.md`.
- [x] 1.2 Agregar/actualizar filas de tramos en `docs/project-selectors.csv` con prioridad Alta/Media y fallback explícito para controles dinámicos.
- [x] 1.3 En `src/modules/planning/pages/PlanificarPage.ts`, añadir selectores de tramo y tipos `TramoInput`/`TramoExpectedCard` para contratos de métodos nuevos.

## Phase 2: RED (Failing Tests First)

- [x] 2.1 En `tests/e2e/modules/02-operaciones/viajes/viajes-planificar.test.ts`, crear bloque de assertions P0/P1 para “crear tramo” antes de `clickGuardar()` (modal cierra, card visible, no estado Anulado).
- [x] 2.2 En el mismo test, agregar escenario de multiplicador `N>1` con conteo esperado de tramos asociados (debe fallar antes de implementar helpers).
- [x] 2.3 En el mismo test, agregar escenario `N=1` sin sobre-replicación y validación de valores finales renderizados tras carga diferida.

## Phase 3: GREEN (Implement Minimal Pass)

- [x] 3.1 Implementar en `PlanificarPage.ts` métodos `addTramo`, `addTramos`, `getTramosCount`, `assertTramoVisible`, usando patrón bootstrap-select + espera de spinner/backdrop.
- [x] 3.2 Implementar helper de fecha para `#_origendestinoform-fechaentradaorigen` con fallback (`fill`/`evaluate`) y verificación posterior del valor persistido.
- [x] 3.3 Integrar en `viajes-planificar.test.ts` la fase “Crear Tramo(s)” con datos de tramo, guardado de evidencias y aserciones exigidas por spec.

## Phase 4: TRIANGULATE + REFACTOR

- [x] 4.1 Parametrizar en `viajes-planificar.test.ts` dos variantes (`multiplicador=1` y `multiplicador=N`) para evitar duplicación y cubrir reglas de replicación.
- [x] 4.2 Refactorizar en `PlanificarPage.ts` helpers reutilizables de modal tramos (open/fill/confirm/wait) manteniendo logs Winston y `takeScreenshot()` en errores.
- [x] 4.3 Ajustar nombres/visibilidad de métodos públicos para mantener compatibilidad con fixtures existentes en `src/fixtures/base.ts`.

## Phase 5: Verification

- [x] 5.1 Ejecutar `npx playwright test tests/e2e/modules/02-operaciones/viajes/viajes-planificar.test.ts` en QA y guardar resultado/logs.
- [x] 5.2 Ejecutar `npx tsc --noEmit` para validar tipos tras cambios en POM y test.
- [x] 5.3 Verificar manualmente en reporte que cada escenario del spec (`P0 crear`, `P0 persistencia`, `P0 N`, `P1 N=1`, `P1 no Anulado`, `P1 dinámicos`) tenga evidencia de pass/fail.
