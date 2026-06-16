# Tasks: Nightly QA Regressions Restructuring and Finanzas Smoke Seeding

## Review Workload Forecast

- Estimated changed lines: ~140 lines
- 400-line budget risk: None
- Chained PRs recommended: No
- Decision needed before apply: No

## Phase 1: Implement Proforma Smoke Test

- [ ] 1.1 Create directory `tests/e2e/modules/03-finanzas/proforma/` if it does not exist.
- [ ] 1.2 Create `tests/e2e/modules/03-finanzas/proforma/proforma-crear.test.ts` mirroring `prefactura-crear.test.ts` logic but invoking `PrefacturaPage`'s proforma methods.
- [ ] 1.3 Require `viaje.prefacturado === true` from loaded dynamic JSON and write `viaje.proformado = true` back to the JSON upon completion.

## Phase 2: Restructure scripts in package.json

- [ ] 2.1 Add `qa:smoke:10:prefactura` and `qa:smoke:11:proforma` scripts.
- [ ] 2.2 Add `demo:smoke:10:prefactura` and `demo:smoke:11:proforma` scripts.
- [ ] 2.3 Modify `qa:regression:finanzas` to run `qa:smoke:10:prefactura && qa:smoke:11:proforma`.
- [ ] 2.4 Modify `demo:regression:finanzas` to run `demo:smoke:10:prefactura && demo:smoke:11:proforma`.
- [ ] 2.5 Integrate `qa:e2e:finanzas-full` into the nightly regressions script `qa:regression:ops:full`.
- [ ] 2.6 Remove obsolete scripts referencing deleted E2E files (`qa:e2e:prefactura`, `qa:e2e:proforma`, `demo:e2e:prefactura`, `demo:e2e:proforma`).

## Phase 3: Verification

- [ ] 3.1 Execute `npm run typecheck` to verify no compilation errors exist.
- [ ] 3.2 Execute regression finanzas test run locally or verify syntax correctness of playwright commands.

## Phase 4: SDD Cleanups and Archive

- [ ] 4.1 Move `openspec/changes/fix-e2e-post-cleanup/` to `openspec/changes/archive/`.
- [ ] 4.2 Move `openspec/changes/finanzas-prefactura/` to `openspec/changes/archive/`.
