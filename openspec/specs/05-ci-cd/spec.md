# CI/CD & Reporting Specification

## Purpose

Defines the requirements for pull request validation, nightly regression pipelines, and test reporting (Allure + Winston logs) across all environments.

---

## 1. Pull Request Validation (PR Gate)

### Requirement: Golden Path PR Protection
The system MUST protect the `main` branch by running static typechecking and the core E2E financial test on every Pull Request.

#### Scenario: PR Validation Pipeline
- **GIVEN** a new Pull Request is opened or updated.
- **WHEN** the GitHub Actions workflow triggers.
- **THEN** it MUST run `npm run typecheck` first.
- **AND** it MUST run the core E2E financial flow: `npm run qa:e2e:finanzas-full -- --project chromium-qa --workers 1`.
- **AND** the PR is blocked if any of these steps fail.

---

## 2. Nightly Regressions Pipeline

### Requirement: Unified and Streamlined Regressions Run
The system MUST execute a nightly regression pipeline on the `QA` environment to cover all module smoke tests and critical flows without redundant steps.

#### Scenario: Nightly Pipeline Composition
- **GIVEN** the schedule triggers the nightly regressions workflow.
- **WHEN** the workflow starts on the `QA` environment.
- **THEN** it MUST execute `npm run qa:regression:ops:full` which sequentially runs:
  - Core entities: `qa:smoke:01` to `qa:smoke:04` (Transportista, Cliente, Conductor, Vehículo).
  - Operations contracts: `qa:smoke:05` and `qa:smoke:06`.
  - Planning and monitoring: `qa:smoke:07` to `qa:smoke:09`.
  - Finanzas individual smokes: `qa:smoke:10` (Prefactura) and `qa:smoke:11` (Proforma).
  - Ultima Milla: `qa:regression:ultimamilla` (Asignar y Batch).
- **AND** it MUST run the independent critical E2E integrated test: `npm run qa:e2e:finanzas-full`.

---

## 3. Reporting & Artifact Archiving

### Requirement: Allure & Evidence Archiving on Failure
The CI/CD pipeline MUST compile Allure reports and archive all Playwright traces, videos, and screenshots on failure to provide diagnostic visibility.

#### Scenario: Artifact Upload
- **GIVEN** a test run completes (whether it passes or fails).
- **WHEN** the upload step runs in GitHub Actions.
- **THEN** it MUST compile Allure report results.
- **AND** it MUST upload the following paths:
  - `allure-report-qa/`
  - `test-results-qa/`
  - `logs/`
- **AND** the retention period MUST be configured for 7 days.
