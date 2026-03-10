# Proposal: Fix Firefox E2E Demo Viajes

## Intent

Resolve the E2E test failure `Viaje no encontrado` that occurs specifically on Firefox in the Demo environment when trying to create a Viaje. The root cause is that Firefox is slower to redirect after form submission, falling back to grid search in `/viajes/asignar`. In Demo, the `nroViaje` is not visible as text in the grid, causing the fallback search in `TmsApiClient.ts` to fail.

## Scope

### In Scope
- Update `tests/api-helpers/TmsApiClient.ts` to include the Demo fallback logic (accepting a single row match) when `text.includes(nroViaje)` fails.
- Increase the timeout for the redirect wait in Firefox to reduce reliance on the fallback.

### Out of Scope
- Refactoring the entire `createViaje` method.

## Approach

Modify `TmsApiClient.ts` around line 1980+ to add a conditional branch for `process.env.ENV === 'DEMO'` when `rowCount === 1`. Replace the single `waitForLoadState` with a robust `waitForURL` before evaluating the URL.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `tests/api-helpers/TmsApiClient.ts` | Modified | Add Demo fallback logic for grid search and improve Firefox redirect wait. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| False positive match in Demo grid | Low | We enforce `rowCount === 1` and ensure the previous search input filled `nroViaje`. |

## Rollback Plan

Revert the changes in `tests/api-helpers/TmsApiClient.ts` to the previous commit.

## Dependencies

- None

## Success Criteria

- [ ] The atomic E2E test `viajes-finalizar-e2e.test.ts` passes consistently on Firefox in the Demo environment.
