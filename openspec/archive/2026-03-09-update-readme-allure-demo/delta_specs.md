## Delta Specs: Update README.md with Allure and Demo Info

### User Story
As a user of the framework, I want the `README.md` to be the primary, up-to-date source of information for both local development and CI/CD verification.

### Requirements

#### REQ-1: Project Status DASHBOARD
- **GIVEN** the `README.md` is in the "Overview" section
- **WHEN** the user views the file
- **THEN** it MUST display a "Project Status Dashboard" table as seen in `GEMINI.md`.

#### REQ-2: Allure Reports Documentation
- **GIVEN** the `README.md` "Running Tests" section
- **WHEN** the user looks for reporting commands
- **THEN** it MUST include clear instructions for:
  - `npm run allure:serve:qa`
  - `npm run allure:generate:qa`
  - `npm run allure:open:qa`
  - Equivalent commands for the Demo environment.

#### REQ-3: Demo Environment Support
- **GIVEN** the `README.md` "Multi-Environment Support" section
- **WHEN** the user wants to run tests in Demo
- **THEN** it MUST list the `test:demo:*` scripts from `package.json`.

#### REQ-4: Atomic vs Legacy Classification
- **GIVEN** the `README.md` "Project Structure" or "Architecture" section
- **WHEN** the user reads about the test suite
- **THEN** it MUST define the difference between **Atomic** (independent) and **Legacy** (sequential) tests.

#### REQ-5: Environment Consistency
- **GIVEN** the `README.md` ".env" section
- **WHEN** the user configures their environment
- **THEN** it MUST use `TMS_USERNAME` and `TMS_PASSWORD` as the primary credential variables.

### Scenarios

#### Scenario 1: New Overview Table
- **GIVEN** the current overview metrics (5 modules, 12 tests)
- **WHEN** I update them
- **THEN** the modules count MUST be 6 and the test count MUST be 13.
