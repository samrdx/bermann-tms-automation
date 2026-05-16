---
name: tms-atomic-e2e
description: "Trigger: atomic e2e, prefactura, proforma, finanzas full, viajes asignar e2e, viajes finalizar e2e. Self-contained E2E test suites that load seeded data instead of creating their own ecosystem."
license: Apache-2.0
metadata:
  author: bermann-qa
  version: "1.0"
---

# tms-atomic-e2e — Atomic E2E Test Pattern

## When to Use

Creating or modifying self-contained E2E tests under `tests/e2e/suites/` that load seeded data from prior regression runs instead of creating entities from scratch.

## Hard Rules

- **NEVER create entities from scratch** — atomic tests load seeded data via `OperationalDataLoader.loadOrThrow()`.
- **ALWAYS guard seeded data access** — throw a descriptive error if required seeded entities are missing:
  ```
  throw new Error('❌ No se encontró [entity]. Ejecuta regression:[suite] primero.');
  ```
- **ALWAYS use `allure` decorators** — `allure.epic()`, `allure.feature()`, `allure.story()`, `allure.parameter()`.
- **ALWAYS register entities in `entityTracker`** for the summary table attachment.
- **ALWAYS attach entity summary** via `testInfo.attach('📊 Resumen...', { body: summaryText })`.
- **ALWAYS set test timeout >= 300000** (5 min) — these tests run against shared environments.
- **ALWAYS use `test.step()`** for logical phases.
- **Import from `src/fixtures/base.js`** — never raw `@playwright/test`.

## Atomic Test Structure

```typescript
import { test, expect } from '../../../src/fixtures/base.js';
import { allure } from 'allure-playwright';
import { entityTracker } from '../../../src/utils/entityTracker.js';
import { OperationalDataLoader } from '../../api-helpers/OperationalDataLoader.js';
import { createLogger } from '../../../src/utils/logger.js';

const logger = createLogger('TestName');

test.describe('[E2E] Module - Action', () => {
  test.setTimeout(300000);

  test('Description', async ({ page }, testInfo) => {
    await allure.epic('TMS E2E Flow');
    await allure.feature('Module');
    await allure.story('Action');
    await allure.parameter('Ambiente', process.env.ENV || 'QA');

    const { data } = OperationalDataLoader.loadOrThrow(testInfo, { logger, purpose: 'description' });
    // Guard: validate required seeded entities
    if (!data.cliente?.nombre) throw new Error('❌ No se encontró...');

    entityTracker.register({ type: 'Entity', name: data.entity.nombre });

    await test.step('Phase', async () => { /* ... */ });

    const summaryText = entityTracker.getSummaryTable(browser);
    await testInfo.attach('📊 Resumen', { body: summaryText, contentType: 'text/plain' });
    await allure.parameter('Estado Final', '✅ COMPLETED');
  });
});
```

## Seeded Data Contract

| Suite | Seeds Required | Pre-requisite |
|-------|---------------|---------------|
| Prefactura | cliente, transportista, viaje FINALIZADO | `npm run qa:regression:ops` |
| Proforma | cliente, transportista, viaje FINALIZADO | `npm run qa:regression:ops` |
| Finanzas Full | cliente, transportista, viaje FINALIZADO | `npm run qa:regression:ops` |
| Viajes Asignar E2E | cliente, transportista, vehiculo, conductor, contratos | `npm run qa:regression:entities` |
| Viajes Finalizar E2E | viaje ASIGNADO | `npm run qa:e2e:viajes-asignar` |

## Allure Reporting Pattern

- `allure.epic('TMS E2E Flow')` — always this epic
- `allure.feature('Module Name')` — the business module
- `allure.story('Specific action')` — the specific test story
- `allure.parameter('Ambiente', env)` — always include environment
- Attach `entityTracker.getSummaryTable()` as a text attachment
- Log ALL key parameters as allure parameters at the end
