# Spec: Monitoreo Demo Environment Support

## Summary

Allow the Legacy "Finalizar Viaje" test (`viajes-monitoreo.test.ts`) to run against the Demo environment using the same sequential-chain pattern as QA.

## Requirements

### REQ-1: Demo Legacy Finalizar Script

The npm scripts **must** include a Demo-environment counterpart for the finalizar step.

```
GIVEN the legacy Demo chain has produced last-run-data-chromium.json with a viaje.nroViaje
WHEN the user runs npm run test:demo:legacy:finalizar
THEN the test executes against https://demo.bermanntms.cl/viajes/monitoreo
AND it finalizes the trip by ID read from the JSON file
AND it exits with code 0 on success
```

### REQ-2: Demo Legacy Viajes Chain Completeness

The `test:demo:legacy:viajes` script **must** run all three steps in sequence: planificar → asignar → **finalizar**.

```
GIVEN the user runs npm run test:demo:legacy:viajes
THEN it executes test:demo:legacy:planificar, then test:demo:legacy:asignar, then test:demo:legacy:finalizar
AND each step uses ENV=DEMO
AND the full chain exits with code 0 only if all three steps succeed
```

### REQ-3: No Regression in QA Scripts

Existing QA scripts **must** remain unchanged and functional.

```
GIVEN existing QA scripts (test:qa:legacy:finalizar, test:qa:legacy:viajes)
WHEN the changes are applied
THEN these scripts continue to work exactly as before
```

## Non-Requirements

- No changes to `viajes-monitoreo.test.ts` — the test is already environment-agnostic
- No changes to `MonitoreoPage.ts` — relative URL navigation already works
- No new test files needed

## Scenarios

### Scenario 1: Happy Path (Demo)

```
GIVEN last-run-data-chromium.json contains viaje.nroViaje = "12345"
AND ENV=DEMO
WHEN npm run test:demo:legacy:finalizar runs
THEN Playwright opens https://demo.bermanntms.cl/viajes/monitoreo
AND searchs for trip "12345"
AND finalizes it via the Horario GPS modal
AND updates last-run-data-chromium.json with viaje.status = "FINALIZADO"
```

### Scenario 2: Missing JSON File

```
GIVEN last-run-data-chromium.json does not exist
WHEN npm run test:demo:legacy:finalizar runs
THEN the test fails with: "Data file not found. Please run prerequisites."
```

### Scenario 3: Full Demo Chain

```
GIVEN all Demo prerequisites are configured
WHEN npm run test:demo:legacy:viajes runs
THEN all three steps execute sequentially: planificar → asignar → finalizar
AND the viaje reaches FINALIZADO status
```
