# Design: Creación Dinámica de Capacidades

## Technical Approach

To implement the QA automation for dynamic capacities, we will construct a new Page Object (`CapacidadPage.ts`) following the `tms-page-objects` conventions, encapsulating form actions (inputs, checkboxes, bootstrap dropdowns). The E2E test will navigate to the page, use the POM methods relying on `BasePage` and `BrowserManager`, and run validations sequentially.

## Architecture Decisions

### Decision: Random Data Generation
**Choice**: Randomize values (1-20) and Unit (KG or TON) during test execution.
**Alternatives considered**: Hardcode specific values (e.g., 10 KG).
**Rationale**: The user requirements explicitly ask to test dynamically randomized capacity values to increase coverage and prove robust selector usage.

### Decision: Checkbox Handling
**Choice**: Use `page.locator.check()` or `page.locator.uncheck()` provided by Playwright or BasePage methods to explicitly set the checkbox state.
**Alternatives considered**: Rely on default state or standard clicks.
**Rationale**: UI tests are less flaky when explicitly forcing the state (check/uncheck) instead of toggling.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/modules/00-config/pages/CapacidadPage.ts` | Create | Page Object encapsulating creation logic |
| `tests/e2e/modules/00-config/capacidades-crear.test.ts` | Create | E2E suite containing the two scenarios |

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| E2E | Capacity Creation (Single) | Fill initial capacity, submit, find in grid |
| E2E | Capacity Creation (Range) | Check range checkbox, fill initial/final, submit, find in grid |
