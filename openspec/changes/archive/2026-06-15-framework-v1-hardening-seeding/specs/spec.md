# Delta Specification: Hardening y Semántica de Datos V1

## Purpose

Esta especificación detalla las reglas de diseño para el hardening del PR gate y el renombrado de los nombres de archivos de pre-carga para el proyecto de automatización V1.

## Requirements

### Requirement: Encapsulated Confirmation Dialogs
Las suites de prueba E2E de Playwright NO deben definir selectores de DOM directos como `.bootbox-accept` para el manejo de confirmaciones de modales en asignación y monitoreo. Esta lógica de control y espera del modal debe delegarse a los Page Objects `AsignarPage` y `MonitoreoPage` o sus clases base correspondientes.

#### Scenario: Confirming trip assignment in E2E tests
- GIVEN a test execution in the `Asignar` page
- WHEN the test triggers a trip assignment
- THEN it MUST delegate the confirmation click to `AsignarPage.confirmarAsignacionSiApareceDialogo()`
- AND the test MUST NOT contain reference to `.bootbox-accept` in its code body.

### Requirement: V1 Seed Data Names
El helper `DataPathHelper` debe priorizar los nombres de archivos de pre-carga de la versión 1 en todas sus consultas de ruta primaria. Sin embargo, para mantener compatibilidad con ecosistemas existentes o ejecuciones sin regenerar seeds, se debe mantener soporte de fallback ordenado para leer archivos legacy.

#### Scenario: Resolving operational data paths
- GIVEN a test execution calling `DataPathHelper.getLegacyOperationalDataCandidates`
- WHEN candidate paths are generated
- THEN the first candidate (primary) MUST be the V1 name (e.g. `smoke-seed-data-qa.json`)
- AND the second candidate MUST be the legacy name (e.g. `legacy-entities-data-qa.json`)
- AND the same order MUST apply to base seed files.
