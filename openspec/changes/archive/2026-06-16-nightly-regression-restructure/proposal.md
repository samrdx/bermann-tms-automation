# Proposal: Nightly QA Regressions Restructuring and Finanzas Smoke Seeding

## Intent

Restructure the nightly CI regressions to run a streamlined, non-redundant pipeline (Ops Smoke 01-09 + Finanzas Smoke 10-11 + Finanzas E2E Full), create the missing individual smoke test for Proforma generation (`qa:smoke:11` / `demo:smoke:11`), and fix the broken regression scripts in `package.json` caused by the deletion of legacy atomic suites.

## Scope

### In Scope
- **Implement Proforma Smoke**: Create `tests/e2e/modules/03-finanzas/proforma/proforma-crear.test.ts` as a deterministic smoke step depending on a prefactured trip.
- **Add Smoke Scripts**: Add `qa:smoke:10:prefactura`, `qa:smoke:11:proforma`, and their `demo:*` counterparts in `package.json`.
- **Fix Regression Scripts**: Repair `qa:regression:finanzas` and `demo:regression:finanzas` to run the smoke tests sequentially.
- **Integrate Finanzas E2E Full**: Ensure `qa:e2e:finanzas-full` runs as part of the nightly cycle (`qa:regression:ops:full`).
- **Clean Redundancies**: Eliminate or fix broken scripts (`qa:e2e:prefactura`, `qa:e2e:proforma`, `qa:e2e:all`, and `demo:*` equivalents).
- **Archive Obsolete Changes**: Move obsolete changes (`fix-e2e-post-cleanup`, `finanzas-prefactura`) to the archive directory.

### Out of Scope
- **TmsApiClient Rename**: The refactoring/renaming of the `TmsApiClient` class to a UI automation helper name is deferred to a future V1+ cleanup task.
- **Hardening Fail Gates**: Introducing strict pipeline fail gates for regressions in GHA is deferred.

## Approach

1. **Test Creation**: Create `proforma-crear.test.ts` using `PrefacturaPage` methods (`navigateToProformaCrear`, `filtrarViajesPorTransportista`, `generarProforma`, `buscarProformaEnIndexPorTransportista`).
2. **Data Integration**: Use `OperationalDataLoader` to load JSON seeded data, requiring `viaje.prefacturado === true` and updating JSON to `viaje.proformado = true` (or similar status).
3. **Script Correction**: Replace deleted E2E paths in `package.json` with the new module-level smoke tests, ensuring dependency ordering.
4. **Nightly Alignment**: Update `qa:regression:ops:full` (and `demo:regression:ops:full`) to include `qa:e2e:finanzas-full` and correct finanzas regression tasks.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `tests/e2e/modules/03-finanzas/proforma/proforma-crear.test.ts` | New | Individual smoke test for Proforma creation |
| `package.json` | Modified | Fixing broken regressions and adding smoke 10/11 |
| `.github/workflows/nightly-regressions.yml` | Modified | Validating nightly regressions settings (if script is changed, GHA stays unchanged) |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Smoke test 11 fails due to missing prefactura state | Med | Verify smoke 10 successfully marks `viaje.prefacturado = true` and that smoke 11 strictly validates this state before running. |

## Rollback Plan

Revert the commits using git to restore the original `package.json` and delete the new `proforma-crear.test.ts` file.

## Dependencies

- Previous smoke tests 01 to 09 must run and complete successfully to generate a finalized trip.
- Smoke 10 (`prefactura-crear.test.ts`) must run before smoke 11 to prefacture the trip.

## Success Criteria

- [ ] `npm run typecheck` passes with no errors.
- [ ] New smoke scripts `qa:smoke:10:prefactura` and `qa:smoke:11:proforma` run successfully when data is seeded.
- [ ] Regression script `qa:regression:ops:full` completes successfully with Allure report generation.
- [ ] Obsolete change folders are safely archived.
