# Tasks: Operation Time Configuration

## Phase 1: Page Object Implementation
- [ ] 1.1 Create `src/modules/configAdmin/pages/TipoOperacionPage.ts` with identified selectors.
- [ ] 1.2 Implement `navigateToCreate()` method.
- [ ] 1.3 Implement `fillForm(data: TipoOperacionData)` with Allure steps.
- [ ] 1.4 Implement `clickGuardar()` and `isFormSaved()` methods.

## Phase 2: Test Implementation
- [ ] 2.1 Create `tests/e2e/modules/01-entidades/config/tipo-operacion-crear.test.ts`.
- [ ] 2.2 Configure the test to run in `QA` environment using `BASE_URL`.
- [ ] 2.3 Configure the test to run in `Demo` environment using `BASE_URL`.
- [ ] 2.4 Add structured logging and summary table implementation.

## Phase 3: Verification
- [ ] 3.1 Run tests in `QA` and verify Allure steps.
- [ ] 3.2 Run tests in `Demo` and verify Allure steps.
- [ ] 3.3 Verify summary table output in console.
