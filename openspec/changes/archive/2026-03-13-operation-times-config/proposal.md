# Proposal: Operation Time Configuration

## Intent
Standardize SLA parameters (Service Level Agreement) for trips by defining new operation types with their respective residence times and hourly validations. This is critical for accurate calculations of punctuality and time windows.

## Scope

### In Scope
- Create `TipoOperacionPage.ts` with identified selectors.
- Implement Allure integration with `test.step`.
- Support both QA and Demo environments.
- Implement structured logging and summary table.

### Out of Scope
- Modification of existing planning logic (only configuration of the entity).
- Bulk import of operation types.

## Approach
Create a new module under `configAdmin` to manage Operation Types. Use the provided selectors (`#tipooperacion-nombre`, etc.) and ensure time strings follow "HH:mm".

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/modules/configAdmin/pages/TipoOperacionPage.ts` | New | Page Object for Operation Types configuration. |
| `tests/e2e/modules/01-entidades/config/tipo-operacion-crear.test.ts` | New | Test for creating operation types. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Selector inconsistency | Low | User provided specific IDs which are usually stable in TMS. |
| Time format errors | Medium | Implement helper/validation for "HH:mm" format. |

## Rollback Plan
Delete the newly created files. No existing code is modified.

## Dependencies
- `BasePage.ts`
- Winston logger

## Success Criteria
- [ ] Successfully create a "Tipo de Operación" in QA.
- [ ] Successfully create a "Tipo de Operación" in Demo.
- [ ] Allure report shows steps and results correctly.
- [ ] Console output shows the summary table as requested.
