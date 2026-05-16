# Design: Consolidación a Chromium-only

## Technical Approach

La estrategia consiste en desacoplar la generación de paths de datos del nombre del navegador en `DataPathHelper.ts` y simplificar `playwright.config.ts` para eliminar la redundancia de proyectos. Esto permitirá que Chromium utilice un único set de archivos de datos por entorno, eliminando la necesidad de duplicar el seeding.

## Architecture Decisions

### Decision: Unificación de archivos de datos

**Choice**: Eliminar el sufijo del navegador (`-chromium`, `-firefox`) de todos los nombres de archivos generados por `DataPathHelper`.
**Alternatives considered**: Mantener el sufijo solo para Chromium por retrocompatibilidad.
**Rationale**: Mantener el sufijo es innecesario si ya no hay otros navegadores. Un nombre limpio como `setup-config-data-qa.json` es más semántico y reduce la complejidad de la lógica de enrutamiento.

### Decision: Eliminación física vs Comentado en Config

**Choice**: Eliminación física de los proyectos de Firefox en `playwright.config.ts`.
**Alternatives considered**: Comentar el código.
**Rationale**: El framework está bajo control de versiones (Git). Si se necesitara Firefox en el futuro, se puede recuperar del historial. Mantener código comentado solo ensucia el archivo de configuración y aumenta la carga cognitiva.

## Data Flow

Anteriormente:
Setup (Chromium) -> setup-data-chromium.json -> Tests (Chromium)
Setup (Firefox) -> setup-data-firefox.json -> Tests (Firefox)

Nuevo flujo:
Setup (Chromium) -> setup-data.json -> Tests (Chromium)

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `playwright.config.ts` | Modify | Eliminar proyectos de Firefox y renombrar proyectos chromium si es necesario (ej: `chromium-qa` se mantiene pero ya no tiene contraparte). |
| `tests/api-helpers/DataPathHelper.ts` | Modify | Refactorizar `getBrowserName` y métodos de construcción de paths para omitir el browser. |
| `package.json` | Modify | Eliminar scripts redundantes o que forzaban multi-browser. |
| `.github/workflows/tests.yml` | Modify | Simplificar jobs de CI para usar solo chromium. |
| `GEMINI.md` | Modify | Actualizar sección de navegadores soportados y arquitectura de datos. |

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | `DataPathHelper` | Verificar que las funciones devuelven los paths esperados sin el string del browser. |
| Integration | Seeding Flow | Ejecutar `npm run qa:seed:legacy` y verificar que genera el archivo unificado. |
| E2E | Regresión Crítica | Ejecutar una suite operativa (ej: `npm run qa:smoke:07:trip:planificar`) y verificar que lee correctamente los datos del archivo unificado. |
