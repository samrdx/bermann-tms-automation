# Tasks: Truth Source Dummys

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 80-120 lines |
| 400-line budget risk | Low |
| Chained PRs recommended | No |
| Suggested split | Single PR |
| Delivery strategy | ask-on-risk |
| Chain strategy | stacked-to-main |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: stacked-to-main
400-line budget risk: Low

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Complete infrastructure and seeding integration | PR 1 | Base branch: main |

## Phase 1: Infrastructure & Foundation

- [x] 1.1 Add `docs/manual-happy-paths.md` to [.gitignore](file:///C:/projects/bermann-tms-automation-agy/.gitignore)
- [x] 1.2 Create [happy-truth-generator.ts](file:///C:/projects/bermann-tms-automation-agy/tests/helpers/happy-truth-generator.ts) with TypeScript structure
- [x] 1.3 Add static credentials loading to [happy-truth-generator.ts](file:///C:/projects/bermann-tms-automation-agy/tests/helpers/happy-truth-generator.ts)
- [x] 1.4 Implement reading `smoke-seed-data-${env}.json` in [happy-truth-generator.ts](file:///C:/projects/bermann-tms-automation-agy/tests/helpers/happy-truth-generator.ts)
- [x] 1.5 Implement Markdown table formatting for QA/DEMO environments in [happy-truth-generator.ts](file:///C:/projects/bermann-tms-automation-agy/tests/helpers/happy-truth-generator.ts)
- [x] 1.6 Implement synchronous write/overwrite of `docs/manual-happy-paths.md` in [happy-truth-generator.ts](file:///C:/projects/bermann-tms-automation-agy/tests/helpers/happy-truth-generator.ts)

## Phase 2: Seeding Integration

- [x] 2.1 Modify [contrato-crear.test.ts](file:///C:/projects/bermann-tms-automation-agy/tests/e2e/modules/02-operaciones/contratos/contrato-crear.test.ts) to capture created contract ID, number, type, routes, and expiration date
- [x] 2.2 Add logic in [contrato-crear.test.ts](file:///C:/projects/bermann-tms-automation-agy/tests/e2e/modules/02-operaciones/contratos/contrato-crear.test.ts) to write captured data under `contratoTransportista` or `contratoCostos` in `smoke-seed-data-${env}.json`
- [x] 2.3 Add execution call to [happy-truth-generator.ts](file:///C:/projects/bermann-tms-automation-agy/tests/helpers/happy-truth-generator.ts) at the end of [contrato-crear.test.ts](file:///C:/projects/bermann-tms-automation-agy/tests/e2e/modules/02-operaciones/contratos/contrato-crear.test.ts)
- [x] 2.4 Modify [contrato2cliente-crear.test.ts](file:///C:/projects/bermann-tms-automation-agy/tests/e2e/modules/02-operaciones/contratos/contrato2cliente-crear.test.ts) to capture created contract ID, number, type, routes, and expiration date
- [x] 2.5 Add logic in [contrato2cliente-crear.test.ts](file:///C:/projects/bermann-tms-automation-agy/tests/e2e/modules/02-operaciones/contratos/contrato2cliente-crear.test.ts) to write captured data under `contratoCliente` in `smoke-seed-data-${env}.json`
- [x] 2.6 Add execution call to [happy-truth-generator.ts](file:///C:/projects/bermann-tms-automation-agy/tests/helpers/happy-truth-generator.ts) at the end of [contrato2cliente-crear.test.ts](file:///C:/projects/bermann-tms-automation-agy/tests/e2e/modules/02-operaciones/contratos/contrato2cliente-crear.test.ts)

## Phase 3: Testing & Verification

- [x] 3.1 Run TypeScript type check validation with `npm run typecheck`
- [x] 3.2 Execute contract creation tests in QA environment to generate `docs/manual-happy-paths.md`
- [x] 3.3 Verify that running the tests again overwrites `docs/manual-happy-paths.md` instead of appending
- [x] 3.4 Verify formatted Markdown table correctly displays data for QA environment

