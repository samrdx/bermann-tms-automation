## Proposal: Improved Logging System

### Intent
Enhance the visibility and traceability of test execution by implementing a structured logging system with emojis and an automated summary of created entities. This will make debugging easier and provide a professional "Final Report" at the end of each test run.

### Scope
- **Logger Upgrade**: Modularize `src/utils/logger.ts` to support specialized methods with emojis.
- **Entity Tracking**: Implement a new `EntityTracker` utility to record data created during tests.
- **Core Integration**: Update `BasePage.ts` and `TmsApiClient.ts` to leverage the new system.
- **Pilot Test**: Update `viajes-finalizar-e2e.test.ts` to demonstrate the new pattern.

### Approach
1.  **Refactor Logger**: Add methods like `fase` (phase), `paso` (step), `subpaso` (substep), `success` (éxito) to the winston wrapper, all using Spanish prefixes.
2.  **EntityTracker**: Create a class to store `{type, name, id}` records and generate a markdown-style summary.
3.  **BasePage Logs**: Standardize common actions (click, fill) with consistent emojis.
4.  **Final Summary**: In each test's `afterEach` or at the end of the `test()` block, print the "Entities Created" summary.

### Expected Outcomes
- Clearer console output with visual cues (emojis).
- Standardized "Phases" in all tests.
- Automatic list of all created data (Transportistas, RUTs, Patentes, IDs) at the end of each test.
- Better integration with Allure reporting via `test.step`.
