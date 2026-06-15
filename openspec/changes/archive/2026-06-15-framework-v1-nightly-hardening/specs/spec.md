# Delta Specification: Nightly QA Regressions Hardening

## Purpose

Esta especificación detalla las reglas de comportamiento del workflow de regresión nocturna de GitHub Actions (`nightly-regressions.yml`) para asegurar la unificación del flujo y la persistencia de evidencias en fallos.

## Requirements

### Requirement: Nightly Unified Execution
El workflow de regresión nocturna MUST ejecutar el pipeline de regresión unificado para asegurar el correcto aislamiento y empaquetamiento final del reporte de Allure.

#### Scenario: Running nightly QA regressions unifed
- GIVEN a scheduled trigger or manual execution of the nightly regressions workflow
- WHEN the job runs on GitHub Actions
- THEN it MUST execute the single unifed command `npm run qa:regression:ops:full`
- AND it MUST NOT call individual regression steps (`ops`, `finanzas`, `ultimamilla`) as separate runner commands.

### Requirement: Nightly Artifact Archiving
El workflow de regresión nocturna MUST guardar y archivar los reportes de Allure y las evidencias visuales ante cualquier resultado de la ejecución (éxito o fallo).

#### Scenario: Uploading HTML reports and Playwright media artifacts
- GIVEN a completed run of `npm run qa:regression:ops:full`
- WHEN the workflow runs its teardown phase
- THEN it MUST upload `allure-report-qa/` directory containing the static HTML dashboard
- AND it MUST upload `test-results-qa/` containing screenshots, traces, and videos of failed tests
- AND this step MUST execute regardless of the test suite outcome (`always()`).
