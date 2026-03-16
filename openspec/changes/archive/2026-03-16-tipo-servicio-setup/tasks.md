# Tasks: Tipo Servicio Setup

## 1. Infrastructure
1.1 Add `tipoOperacionPage` and `tipoServicioPage` to shared fixture.
1.2 Add Playwright seed projects for Tipo Operacion (Chromium/Firefox).
1.3 Add main-project dependency and ignore direct duplicate execution.

## 2. Implementation
2.1 Create `TipoServicioPage` with required methods and error screenshots.
2.2 Update `tipo-operacion-crear.test.ts` to persist `seededTipoOperacion`.
2.3 Create `tipo-servicio-crear.test.ts` with guard clause and index verification.
2.4 Add required logger milestones and executive relation summary.

## 3. Scripts and Reporting
3.1 Add QA/DEMO `test:*` scripts for tipooperacion/tiposervicio.
3.2 Add ordered setup scripts (`tipo-servicio-setup`) for QA/DEMO.
3.3 Add Allure `run:*` scripts matching repository conventions.

## 4. Verification
4.1 Run `npx tsc --noEmit`.
4.2 Run `playwright test ... --list` to confirm dependency order.
