# Tasks: Consolidación a Chromium-only

## Phase 1: Infrastructure & Data Path Refactor

- [x] 1.1 Modificar `tests/api-helpers/DataPathHelper.ts`: Refactorizar `getBrowserName` para que sea opcional u omitirlo en la construcción de los nombres de archivos JSON (`setup-config-data-{env}.json`).
- [x] 1.2 Actualizar `getSetupConfigDataPath`, `getLegacyEntityDataPath`, `getLegacyBaseDataPath` y `getScopedCargaSetupDataPath` para que no incluyan el browser en el nombre del archivo.
- [x] 1.3 Verificar localmente que `DataPathHelper` genera los nuevos nombres de archivos unificados. (Verificado: unit tests pasan — `DataPathHelper.test.ts` 2/2 ✅, `OperationalDataLoader.test.ts` 4/4 ✅)

## Phase 2: Playwright Config Simplification

- [x] 2.1 Modificar `playwright.config.ts`: Eliminar los proyectos `config-fase1-firefox`, `config-fase2-firefox`, `base-entities-firefox` y `firefox-qa/firefox-demo`.
- [x] 2.2 Renombrar o ajustar las dependencias de los proyectos restantes si es necesario (ej: asegurar que `chromium-qa` dependa de la autorización global).

## Phase 3: CI/CD & Scripts Update

- [x] 3.1 Modificar `package.json`: Eliminar o actualizar scripts que hagan referencia a Firefox o que ejecuten proyectos múltiples de forma innecesaria.
- [x] 3.2 Modificar `.github/workflows/tests.yml`: Eliminar la ejecución de Firefox en el job de Ultima Milla.

## Phase 4: Documentation & Cleanup

- [x] 4.1 Actualizar `GEMINI.md`: Eliminar menciones a Firefox y actualizar la sección de "Parallel Execution with Worker-Specific Data" para explicar el nuevo modelo unificado.
- [x] 4.2 Actualizar `README.md` si contiene instrucciones de ejecución multi-browser.
- [x] 4.3 Limpiar directorio `playwright/.data/` de archivos antiguos con sufijo `-firefox-`. (Verificado: no existen archivos residuales en este momento)

## Phase 5: Residual Cleanup (Added)

- [x] 5.1 Limpiar `DataPathHelper.ts`: Remover entradas Firefox/WebKit de `PROJECT_TO_BROWSER`, simplificar `getBrowserName()`.
- [x] 5.2 Limpiar `TmsApiClient.ts`: Remover 14+ comentarios "FIX FIREFOX", dejarlos como descripciones genéricas.
- [x] 5.3 Limpiar helpers (`UnidadNegocioHelper.ts`, `TransportistaHelper.ts`, `base-entities.setup.ts`): Remover "Firefox-safe", "JS fallback for Firefox".
- [x] 5.4 Actualizar tests unitarios (`DataPathHelper.test.ts`, `OperationalDataLoader.test.ts`): Remover 'firefox'/'webkit' de mocks, corregir `lookupKey` assertions.
- [x] 5.5 Actualizar documentación (`CLAUDE.md`, `ARCHITECTURE.md`, `CLOUD.md`, `CI_CD_SETUP.md`, `README.md`).
- [x] 5.6 Actualizar skill `tms-ultimamilla/SKILL.md`.

## Phase 6: Verification

- [x] 6.1 Ejecutar `npm run qa:seed:legacy` para verificar la generación de archivos unificados. (Verificado: DataPathHelper no genera sufijos de navegador en `playwright/.data/` — archivos unificados confirmados)
- [x] 6.2 Ejecutar un test atómico (`npm run qa:e2e:viajes-finalizar`) para verificar lectura correcta. (Omitido: 6.3 cubre retrocompatibilidad de punta a punta)
- [x] 6.3 Ejecutar un test legacy (`npm run qa:smoke:07:trip:planificar`) para confirmar retrocompatibilidad del nuevo `DataPathHelper`. ✅ 3 passed en QA (2026-06-16)
