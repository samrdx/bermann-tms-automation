# Proposal: Reestructuración y Robustecimiento de QA Regressions Nightly

## Context / Rationale

El workflow de regresiones nocturnas (`nightly-regressions.yml`) corre suites secuenciales en QA, pero actualmente adolece de tres debilidades importantes para una infraestructura de nivel V1 empresarial:
1. Corre comandos fragmentados (`qa:regression:ops`, `qa:regression:finanzas`, etc.) en lugar del pipeline unificado de regresión `"qa:regression:ops:full"` que maneja de forma segura las variables de aislamiento de datos (`CLEAN_DATA`, `SKIP_CLEAN`).
2. No publica ni empaqueta evidencias. Si un test falla en el CI, el equipo de QA no tiene acceso a capturas de pantalla de fallos, videos, ni reportes interactivos, obligándolos a depurar ciegamente mediante logs de consola.
3. El reporte de Allure CLI se genera localmente pero se pierde en el contenedor efímero del Action.

## Proposed Approach

- **Unificar la ejecución en el workflow:**
  - Cambiar los tres pasos de ejecución en `.github/workflows/nightly-regressions.yml` por una única llamada a: `npm run qa:regression:ops:full`.
- **Publicar Reporte Allure y Evidencias de Playwright:**
  - Agregar un paso de subida de artefactos utilizando `actions/upload-artifact` al final del workflow.
  - El paso de subida se configurará con `if: always()` para asegurar que se capturen reportes y evidencias tanto en éxito como en fallo.
  - Subir la carpeta `allure-report-qa/` (Reporte HTML estático generado por Allure CLI) y `test-results-qa/` (Evidencias de Playwright como capturas de pantalla, videos y traces de fallos).

## Rollback Plan

- El cambio afecta únicamente al workflow de GitHub Actions que corre de forma programada y manual por trigger.
- Si se requiere rollback, se puede restaurar la versión anterior del archivo `.github/workflows/nightly-regressions.yml` o hacer revert del commit.
