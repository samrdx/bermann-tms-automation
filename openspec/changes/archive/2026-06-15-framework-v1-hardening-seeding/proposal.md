# Proposal: Hardening del PR Gate y Migración de Semántica de Datos V1

## Context / Rationale

Este cambio tiene como objetivo preparar el framework de pruebas de automatización para su despliegue **V1 corporativo**. Resuelve dos de las deudas técnicas más importantes identificadas en el `V1_READINESS_AUDIT.md`:

1. **Semántica engañosa de "API":** El test `tests/e2e/suites/finanzas-prefactura-proforma-e2e.test.ts` y el helper `TmsApiClient.ts` contienen referencias al término "API" que confunden al lector. En realidad, no es un cliente API HTTP directo, sino un **UI Seed Helper** que automatiza pantallas. Esto se corregirá a nivel de logs, comentarios y documentación de las fases del test.
2. **Fuga de selectores directos (Leakage):** Varias pruebas e2e independientes (`viajes-asignar-e2e.test.ts` y `viajes-finalizar-e2e.test.ts`) instancian localmente selectores como `.bootbox-accept` para interactuar con modales de confirmación, violando el patrón POM. Los encapsularemos dentro de sus respectivos Page Objects (`AsignarPage` y `MonitoreoPage`).
3. **Migración de nombres de archivos de datos a V1:** Los nombres de archivos de datos de pre-carga secuencial actuales contienen la palabra "legacy" (ej. `legacy-entities-data-*.json`), lo cual da a entender que están obsoletos cuando en realidad son los archivos activos de pre-carga de humo. Los renombraremos a un esquema de nombres V1 (`smoke-seed-data-*.json`, `e2e-seed-data-*.json` y `config-seed-data-*.json`) de manera transparente, asegurando compatibilidad mediante fallbacks ordenados en `DataPathHelper.ts`.

## Proposed Approach

- **Hardening del test gate:**
  - Editar `tests/e2e/suites/finanzas-prefactura-proforma-e2e.test.ts` para cambiar las referencias a "API" por "UI seed".
  - Mover y estandarizar la interacción con el modal de confirmación en `AsignarPage.ts` y `MonitoreoPage.ts`.
  - Actualizar los tests de asignación/finalización que usaban selectores en bruto para invocar los métodos limpios de las páginas.
- **Migración semántica de seed data:**
  - Modificar `DataPathHelper.ts` para establecer `'v1'` como el esquema por defecto para generar nombres de archivo de datos (ej: `smoke-seed-data-qa.json`).
  - Asegurar que `getLegacyOperationalDataCandidates` siga manteniendo `'legacy'` como segundo candidato de lectura para no romper ejecuciones que aún tengan datos en el formato anterior.

## Rollback Plan

- Los cambios en los Page Objects y nombres de archivos de datos son retrocompatibles (los fallbacks del helper evitan fallos si no encuentra los archivos V1).
- Si es necesario deshacer, se puede revertir el commit mediante `git revert`.
