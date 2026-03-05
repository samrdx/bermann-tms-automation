# Technical Design: Monitoreo Demo Environment Support

## Architecture Decision

The change is **configuration-only**: no source code modifications are required. The test and Page Object are already environment-agnostic by design.

## Why No Code Change Is Needed

| Component | Current State | Demo Compatible? |
|-----------|--------------|-----------------|
| `viajes-monitoreo.test.ts` | Reads `nroViaje` from JSON (browser-agnostic path) | ✅ Yes |
| `MonitoreoPage.navigate()` | Uses `page.goto('/viajes/monitoreo')` (relative URL) | ✅ Yes — Playwright resolves against `baseURL` |
| `DataPathHelper` | Returns `last-run-data-{browser}.json` | ✅ Yes — same file produced by demo planificar/asignar |
| `TmsApiClient` | Resolves `baseUrl` from `ENV` env var | ✅ Yes (not used by this test) |

## Change Description

### `package.json`

Two lines change:

**Add** (under the `// === DEMO ENVIRONMENT ===` section, after `test:demo:legacy:asignar`):
```json
"test:demo:legacy:finalizar": "cross-env ENV=DEMO playwright test tests/e2e/modules/02-operaciones/Monitoreo/viajes-monitoreo.test.ts --project=chromium --workers=1 --trace on"
```

**Update** (the existing `test:demo:legacy:viajes` chain):
```json
// BEFORE:
"test:demo:legacy:viajes": "npm run test:demo:legacy:planificar && npm run test:demo:legacy:asignar"

// AFTER:
"test:demo:legacy:viajes": "npm run test:demo:legacy:planificar && npm run test:demo:legacy:asignar && npm run test:demo:legacy:finalizar"
```

## Playwright Config Context

`playwright.config.ts` sets `baseURL` based on `ENV`:
- `ENV=QA` → `https://moveontruckqa.bermanntms.cl`
- `ENV=DEMO` → `https://demo.bermanntms.cl`

`MonitoreoPage` uses `page.goto('/viajes/monitoreo')` which Playwright resolves to the full URL via `baseURL`. This means `ENV=DEMO` automatically routes to `https://demo.bermanntms.cl/viajes/monitoreo`.

## Dependency Chain

```
test:demo:legacy:viajes
    ├── test:demo:legacy:planificar  → produces last-run-data-chromium.json (viaje.nroViaje)
    ├── test:demo:legacy:asignar    → updates   last-run-data-chromium.json (viaje.asignado)
    └── test:demo:legacy:finalizar  → reads     last-run-data-chromium.json (nroViaje)
                                      writes     last-run-data-chromium.json (status=FINALIZADO)
```

## Risk Assessment

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Demo env has different form behavior | Low | MonitoreoPage selectors are ID-based, proven stable |
| JSON file missing when running standalone | Medium | Test already guards with explicit error message |
| QA regression | None | QA scripts are not modified |

## Alignment with Existing Patterns

This follows identical patterns to:
- `test:qa:legacy:viajes` (QA version of the same chain)
- `test:demo:legacy:planificar` / `test:demo:legacy:asignar` (same `--project=chromium --workers=1 --trace on` flags)
