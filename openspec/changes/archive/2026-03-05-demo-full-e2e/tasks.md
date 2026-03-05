# Tasks: Demo Full E2E Flow

## Phase 1: Configuration

- [x] 1.1 Update `package.json` to add the `"test:demo:trip:full-flow"` script running `cross-env ENV=DEMO playwright test tests/e2e/suites/viajes-finalizar-e2e.test.ts --trace on`.

## Phase 2: Verification

- [ ] 2.1 Execute `npm run test:demo:trip:full-flow`.
- [ ] 2.2 Verify that the test creates the prerequisite base entities (Transportista, Cliente, Vehículo, Conductor, Contratos) without hanging due to Demo-specific field differences.
- [ ] 2.3 Verify that the Viaje is planned, assigned, and finalized, reaching the "FINALIZADO" status.
- [ ] 2.4 If the test fails due to a Demo-specific timing or UI rendering anomaly, apply conditional fixes explicitly checking `if (process.env.ENV === 'DEMO')` in the affected helper or Page Object.
