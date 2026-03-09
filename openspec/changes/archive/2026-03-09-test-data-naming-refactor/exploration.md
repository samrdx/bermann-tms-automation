## Exploration: Test Data Naming Refactor

### Current State
Currently, test data generation for entities (Cliente, Transportista, Vehículo, Conductor) relies on random generators in `rutGenerator.ts` and individual logic within each helper (`ClienteHelper.ts`, `TransportistaHelper.ts`, etc.). 
For example:
- Clientes get names like `Distribuidora 4512`.
- Transportistas get names like `TransSur Logística - 123456`.
- Vehículos get random patentes like `AB-1234` or `ABCD-12`.
- Conductores get random common names like `Juan Pérez`.

This lack of standardization makes it difficult to trace which test created which record (especially in Allure Reports) and complicates database cleanup, as there is no consistent prefix to query (e.g., `ILIKE 'Qa_%'`).

### Affected Areas
- `src/utils/NamingHelper.ts` (NEW) — Centralized naming logic.
- `tests/api-helpers/ClienteHelper.ts` — Update `createClienteViaUI` name generation.
- `tests/api-helpers/TransportistaHelper.ts` — Update `createTransportistaViaUI` name generation.
- `tests/api-helpers/VehiculoHelper.ts` — Update `createVehiculoViaUI` patente generation.
- `tests/api-helpers/ConductorHelper.ts` — Update `createConductorViaUI` name generation.
- `tests/e2e/suites/viajes-finalizar-e2e.test.ts` (or similar E2E test) — Update to demonstrate the new naming convention.

### Approaches
1. **Centralized NamingHelper Class** — Create a dedicated `NamingHelper` utility with static methods (`getClienteName()`, `getTransportistaName()`, etc.) that implement the `Qa_` prefix rules. The ApiHelpers will call these methods instead of generating strings locally.
   - Pros: Centralized logic, easy to add environment tags (QA vs Demo), strictly enforces the rules.
   - Cons: Requires refactoring all 4 main entity helpers.
   - Effort: Low

2. **Modify rutGenerator.ts Directly** — Update the existing functions in `rutGenerator.ts` to always return `Qa_` prefixed names.
   - Pros: Less boilerplate class creation.
   - Cons: `rutGenerator.ts` becomes bloated with business-specific naming rules rather than generic random generators. It mixes generic generation with TMS-specific test requirements.
   - Effort: Low

### Recommendation
Approach 1: **Centralized NamingHelper Class**. 
It separates the pure random generation (`rutGenerator.ts`) from the business rules around test data traceability (`NamingHelper.ts`). It makes it explicitly clear in the code when a traceable name is being generated versus a generic random string.

### Risks
- **String Length Limits**: The `Qa_prefix_` adds characters. We need to ensure that the generated names do not exceed TMS database column limits (e.g., if a name is limited to 50 chars). 
- **Patente Validation**: If the TMS has strict regex validation for Patente (expecting exactly 2 letters, 4 numbers), sending `Qa_veh_ABCD12` might fail UI validation. However, as the requirements suggest this is allowed ("permite mayúsculas después del prefijo. Ejemplo: Qa_veh_HJWT12"), we will proceed under this assumption.

### Ready for Proposal
Yes. The requirements are clear and the NamingHelper pattern is standard.
