---
name: tms-ultimamilla
description: "Trigger: ultima milla, última milla, pedido crear, pedido asignar, batch, monitoreo. Last-mile delivery automation with batch processing and cascading dropdowns."
license: Apache-2.0
metadata:
  author: bermann-qa
  version: "1.0"
---

# tms-ultimamilla — Última Milla Module Automation

## Page Objects (4 files in `src/modules/ultimamilla/pages/`)

| Page Class | Purpose |
|---|---|
| `UltimaMillaFormPage` | Order creation (`/order/crear`) — direccion, embalaje, dimensiones |
| `UltimaMillaPedidoIndexPage` | Search/filter created orders |
| `UltimaMillaAsignarPage` | Assignment optimization, createTrip, carrier/vehicle selection |
| `UltimaMillaMonitoreoPage` | Status updates, terminal state transitions |

All extend `BasePage` and export from `src/modules/ultimamilla/pages/index.ts`.

## Hard Rules

- **ALWAYS use fixture injection** instead of `new` — tests receive `ultimaMillaPage`, `ultimaMillaAsignarPage`, `ultimaMillaMonitoreoPage`, `ultimaMillaPedidoIndexPage`, `ultimaMillaFactory` via Playwright fixtures.
- **NEVER skip the mutation guard** — assignment tests MUST check `process.env.ULTIMAMILLA_ENABLE_MUTATION !== 'true'` and `test.skip()` if not set.
- **ALWAYS use `ClientResolver`** for deterministic client selection from seeded data. Use `ClientResolver.getDropdownCandidates()` and `ClientResolver.resolveClientName()`.
- **ALWAYS use `ULTIMAMILLA_BATCH_SIZE`** for batch tests (default 8 in DEMO).
- **ALWAYS seed legacy data** before running: `npm run [env]:seed:legacy`.
- **ALWAYS run with `--workers 1`** — ultimamilla tests are sequential.

## Asignar Test Pattern

```typescript
test('Happy path: debe buscar, optimizar y crear viaje', async ({
  page, ultimaMillaPage, ultimaMillaAsignarPage,
  ultimaMillaMonitoreoPage, ultimaMillaPedidoIndexPage, ultimaMillaFactory,
}, testInfo) => {
  test.skip(
    process.env.ULTIMAMILLA_ENABLE_MUTATION !== 'true',
    'Guard QA-mutating activo. Ejecutá con ULTIMAMILLA_ENABLE_MUTATION=true para permitir createTrip.'
  );

  const operationalData = loadOperationalData(testInfo);
  const cliente = ClientResolver.resolveClientName(operationalData);
  // ... create order, search, assign, optimize, create trip
});
```

## Batch Pattern

- File: `tests/e2e/modules/ultimamilla/pedido-asignar-batch.test.ts`
- Uses `ULTIMAMILLA_BATCH_SIZE` env var for configurable parallelism
- Browser-specific projects: `chromium-demo`, `firefox-demo` (DEMO) or `chromium-qa`, `firefox-qa` (QA)
- Always multi-browser serial (`--workers 1`)

## Environment Variables

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `ULTIMAMILLA_ENABLE_MUTATION` | For asignar | — | Must be `true` to allow createTrip |
| `ULTIMAMILLA_BATCH_SIZE` | No | 8 (DEMO) | Number of orders to process in batch |
| `LEGACY_DATA_SOURCE` | For legacy | — | Set to `base` when using base-entities seed |

## NPM Scripts

```bash
# QA
npm run qa:smoke:ultimamilla              # Create order
npm run qa:smoke:ultimamilla:asignar       # Assign order (chromium + firefox)
npm run qa:smoke:ultimamilla:batch         # Batch assign

# DEMO
npm run demo:smoke:ultimamilla:asignar
npm run demo:smoke:ultimamilla:batch

# Debug
npm run qa:smoke:ultimamilla:batch:debug   # Headed chromium debug
```
