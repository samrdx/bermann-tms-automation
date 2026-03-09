# Proposal: Test Data Naming Refactor

## Intent

The current test data generation lacks a standardized nomenclature, relying on plain random names (e.g., `TransSur Logística - 123456`, `Juan Pérez`). This creates two main problems:
1. **Traceability**: It's hard to identify test-created records in Allure Reports or the TMS UI.
2. **Database Bloat**: There is no easy way to safely identify and bulk-delete test records from the database.

By implementing a strict `Qa_` prefix nomenclature, we enable simple database cleanup via `ILIKE 'Qa_%'` and improve test debugging traceability.

## Scope

### In Scope
- Create a new `NamingHelper` utility class in `src/utils/`.
- Implement environment detection (`process.env.ENV`) to optionally tag Demo vs QA if needed (though both will use the `Qa_` prefix as requested).
- Refactor Entity Helpers to use `NamingHelper`:
  - `ClienteHelper.ts` (`Qa_cli_[Name]_[Random3]`)
  - `TransportistaHelper.ts` (`Qa_tra_[Name]_[Random3]`)
  - `VehiculoHelper.ts` (`Qa_veh_[PatenteReal]`)
  - `ConductorHelper.ts` (`Qa_con_[Nombre]` and `Qa_con_[Apellido]`)
- Update an E2E test to demonstrate the complete flow using the new naming.
- Provide a SQL audit query for cleanup.

### Out of Scope
- Refactoring the entire test suite to completely use ApiHelpers instead of UI (we will only update the naming part of the existing UI functions).
- Adding automated SQL cleanup steps to the CI/CD pipeline (we only provide the query).

## Approach

Create `src/utils/NamingHelper.ts` with static methods leveraging `rutGenerator.ts` for the inner random bits, but formatting them strictly. The ApiHelpers will call these methods.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/utils/NamingHelper.ts` | New | Centralized naming formatting logic |
| `tests/api-helpers/ClienteHelper.ts` | Modified | Use `NamingHelper.getClienteName()` |
| `tests/api-helpers/TransportistaHelper.ts` | Modified | Use `NamingHelper.getTransportistaName()` |
| `tests/api-helpers/VehiculoHelper.ts` | Modified | Use `NamingHelper.getVehiculoPatente()` |
| `tests/api-helpers/ConductorHelper.ts` | Modified | Use `NamingHelper.getConductorNames()` |
| `tests/e2e/suites/viajes-finalizar-e2e.test.ts` | Modified | Update to showcase the new entities or ensure flow works with prefixed names |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| UI validation rejects `Qa_veh_XYZ123` patente format | Low/Med | Based on requirements, the system has an exception for Patente. If it fails UI, we will need to bypass via API or update TMS validation. We will verify execution. |
| Name length exceeds DB/UI limits | Low | We will keep the `[Name]` and `[Random3]` portions concise. |

## Rollback Plan

If the tests start failing due to strict TMS UI validations on names or patentes, we can easily revert the commits that introduced `NamingHelper` into the `api-helpers`, restoring the original `generateRandomName()` calls.

## Success Criteria

- [ ] `NamingHelper` clearly separates naming rules from random data generation.
- [ ] Helpers successfully use the new syntax.
- [ ] At least one full E2E test runs and passes using the new entity names.
- [ ] SQL query is provided and documented.
