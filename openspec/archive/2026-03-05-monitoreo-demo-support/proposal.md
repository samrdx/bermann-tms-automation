# Proposal: Monitoreo Demo Environment Support

## Intent

Enable `viajes-monitoreo.test.ts` (the Legacy "Finalizar Viaje" test) to run against the **Demo** environment using the same sequential-chain logic already in place for QA.

## Problem

The `package.json` DEMO section is incomplete:
- `test:demo:legacy:viajes` only chains **planificar + asignar**, missing **finalizar**
- There is no `test:demo:legacy:finalizar` script at all
- The QA equivalent (`test:qa:legacy:finalizar`) exists and works correctly

## Scope

**In scope:**
- Add `test:demo:legacy:finalizar` npm script
- Update `test:demo:legacy:viajes` to include the finalizar step

**Out of scope:**
- Changes to `viajes-monitoreo.test.ts` — it is already environment-agnostic
- Changes to `MonitoreoPage.ts` — already uses relative URL navigation

## Approach

The test reads `nroViaje` from `last-run-data-{browser}.json`, which is produced by the Demo legacy planificar/asignar chain. The `MonitoreoPage` uses `page.goto('/viajes/monitoreo')` which Playwright resolves against the configured `baseURL` (set from `ENV`). No test code needs to change.

The fix is entirely in `package.json`:

1. Add script: `"test:demo:legacy:finalizar": "cross-env ENV=DEMO playwright test tests/e2e/modules/02-operaciones/Monitoreo/viajes-monitoreo.test.ts --project=chromium --workers=1 --trace on"`
2. Update: `"test:demo:legacy:viajes": "npm run test:demo:legacy:planificar && npm run test:demo:legacy:asignar && npm run test:demo:legacy:finalizar"`

## Success Criteria

- `npm run test:demo:legacy:finalizar` runs the monitoreo test against `https://demo.bermanntms.cl`
- The full chain `npm run test:demo:legacy:viajes` completes end-to-end in Demo
- No regression in QA scripts
