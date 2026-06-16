## Exploration: Improved Logging System

### Current State
Today, the project uses a standard `winston` logger in `src/utils/logger.ts`. It supports a `context` prefix and outputs to both console and files. Tests (like `viajes-finalizar-e2e.test.ts`) manually print separators (`=`) and "Phase" markers. There is no automated tracking of what entities are created during a test, requiring manual logging of IDs and names.

### Affected Areas
- `src/utils/logger.ts` — Needs emoji support and potentially specialized methods for "Steps" and "Phase" logging.
- `src/utils/entityTracker.ts` — [NEW] A new utility to track created entities (transportistas, clientes, etc.) within a test scope.
- `src/core/BasePage.ts` — Needs to use the new logging methods to maintain consistency.
- `tests/api-helpers/TmsApiClient.ts` — Should report to the `entityTracker` when entities are successfully created.
- `tests/e2e/suites/*.test.ts` — Need to be updated to use the new logging pattern.

### Approaches
1. **Approach 1: Emoji-enhanced Logger (Spanish) + Manual Tracker**
   - Transform `logger.ts` to include an emoji map. Use `logger.paso('...')` (Step) for Playwright-like step logging with emojis and Spanish prefixes.
   - Introduce a simple `EntityTracker` class that tests can use to register created items.
   - Pros: Low complexity, high visual impact, backward compatible.
   - Cons: Requires manual registration of entities in many places.
   - Effort: Medium

2. **Approach 2: Full Playwright Step Integration + Automated Proxy Tracker**
   - Wrap `TmsApiClient` or use a proxy to automatically track any `create*` call.
   - Integrate all logs with `test.step` so they appear nested in Playwright/Allure reports.
   - Pros: Maximum automation, cleaner reports.
   - Cons: Higher complexity, potential for "over-engineering".
   - Effort: High

### Recommendation
I recommend **Approach 1** with selective automation in `TmsApiClient`. Adding emojis and structured step logging will immediately improve readability. The `EntityTracker` can be injected via Playwright fixtures to reset per test, ensuring a clean "Created Artifacts" summary at the end.

### Risks
- Floating-point emojis might look different across OS (Windows/Linux/MacOS), but standard ones are generally safe.
- `test.step` integration must be handled carefully to not break if the logger is used outside a `test()` context (e.g., in a standalone script).

### Ready for Proposal
Yes — I have enough context to define the new logging API and the entity tracking strategy.
