# Proposal: Consolidación a Chromium-only

## Intent

Simplificar la infraestructura de datos y ejecución del framework de automatización eliminando el soporte de Firefox. Dado que el TMS es una herramienta corporativa utilizada mayoritariamente en Chrome/Edge, mantener la complejidad de archivos de datos aislados por navegador genera una deuda técnica innecesaria y ralentiza la ejecución en CI/CD.

## Scope

### In Scope
- Eliminación de todos los proyectos de Firefox en `playwright.config.ts`.
- Refactorización de `DataPathHelper.ts` para eliminar sufijos de navegador en los nombres de archivos JSON.
- Actualización de scripts en `package.json` para reflejar la ejecución exclusiva en Chromium.
- Actualización de workflows de GitHub Actions para eliminar matrices de navegadores.
- Limpieza de documentación técnica en `GEMINI.md` y `README.md`.

### Out of Scope
- Migración de tests legacy a atómicos (se mantiene la lógica de archivos JSON, pero simplificada).
- Soporte de otros navegadores (WebKit ya fue eliminado, Firefox se elimina ahora).

## Approach

Se realizará una refactorización integral pero conservadora para asegurar que los paths de archivos sigan siendo válidos.
1. Modificar `DataPathHelper.ts` para que `getBrowserName()` devuelva siempre 'chromium' o, preferiblemente, eliminar la dependencia del navegador en la generación de nombres de archivos.
2. Limpiar `playwright.config.ts` eliminando los bloques de configuración de Firefox.
3. Actualizar la lógica de `getWorkerDataPath` para apuntar a archivos unificados.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `playwright.config.ts` | Modified | Eliminación de proyectos Firefox. |
| `tests/api-helpers/DataPathHelper.ts` | Modified | Simplificación de nombres de archivos (sin sufijo browser). |
| `package.json` | Modified | Actualización de scripts de ejecución. |
| `.github/workflows/tests.yml` | Modified | Eliminación de multi-browser en Ultima Milla. |
| `GEMINI.md` | Modified | Actualización de arquitectura y convenciones. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Inconsistencia en nombres de archivos | Medium | Verificar con un test de humo que los archivos generados por setup son leídos correctamente por los tests operativos. |
| Colisión de datos en local con 3 workers | Low | La estrategia de timestamps únicos en nombres de entidades ya mitiga esto. |

## Rollback Plan

Revertir los cambios en `playwright.config.ts` y `DataPathHelper.ts` mediante `git checkout`. Los archivos de datos previos seguirán existiendo en `playwright/.data/` con sus nombres antiguos si no se limpian.

## Dependencies

- Ninguna externa.

## Success Criteria

- [ ] Los tests corren exitosamente en Chromium local con 3 workers.
- [ ] El pipeline de CI en GitHub Actions completa exitosamente sin intentar correr Firefox.
- [ ] No existen referencias activas a Firefox en la configuración de Playwright.
- [ ] Los archivos en `playwright/.data/` ya no incluyen el string `-firefox-` en sus nombres.
