# Tasks: Reestructuración y Robustecimiento de QA Regressions Nightly

## Review Workload Forecast

- Estimated changed lines: ~20
- 400-line budget risk: None
- Chained PRs recommended: No
- Decision needed before apply: No

## Phase 1: Reestructuración de YAML

- [x] 1.1 Modificar `.github/workflows/nightly-regressions.yml` reemplazando los tres pasos de ejecución secuenciales por una única llamada a `npm run qa:regression:ops:full`
- [x] 1.2 Agregar en `.github/workflows/nightly-regressions.yml` el paso `Upload Allure Report and Playwright Evidences` usando `actions/upload-artifact@v4` bajo la directiva `if: always()`

## Phase 2: Verificación

- [x] 2.1 Ejecutar `npm run ci:validate:workflow-scripts` para verificar la coherencia y referencia de scripts en los archivos de workflows
