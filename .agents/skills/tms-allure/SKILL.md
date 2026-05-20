---
name: tms-allure
description: >
  Allure reporting conventions for Bermann TMS QA automation.
  Trigger: allure, reportes, parámetros de suite/test, evidencias, flaky debugging with Allure.
license: MIT
metadata:
  author: QA Team
  version: "1.0.0"
  scope: [root, tests/e2e, scripts]
  auto_invoke: "Allure report generation, adding allure parameters, improving suite visibility"
  last_updated: "2026-05-19"
  status: active
  category: testing
  tags: [allure, reporting, playwright, evidence, parameters]
allowed-tools: Read, Edit, Write, Bash
---

# TMS Allure Skill

## When to Use

Use this skill when:

- Adding or fixing `allure.parameter(...)` values
- Making suite/test metadata visible in Allure reports
- Generating/opening Allure reports locally
- Debugging why tests pass but report generation fails

---

## Critical Patterns

### 1) Parameter contract (must be explicit)

Always add these in critical E2E tests:

- Environment (`QA`/`DEMO`)
- Main entity key (e.g. `Nro Viaje Maestro`)
- Derived/linked key (e.g. `Nro Viaje Tramo` or `Tramo Lookup ID`)

If a value is discovered later (e.g. from grid/ID), set `allure.parameter(...)` at that moment too.

### 2) Master + tramo visibility pattern

When validating viaje maestro + tramo in `/viajes/asignar`:

1. `allure.parameter('Nro Viaje Maestro', nroViaje)`
2. Find maestro row
3. Extract maestro `ID`
4. Derive tramo lookup (`ID + 1` when tramo has no own nro)
5. `allure.parameter('Viaje Tramo Lookup', tramoLookup)`
6. Search tramo and assert

### 3) Evidence-first for failures

On critical lookup failures, attach context:

- current search term
- extracted ID
- current URL
- screenshot/video path (Playwright attachments already generated)

---

## Code Example (Playwright + Allure)

```ts
await allure.parameter("Nro Viaje Maestro", nroViaje);

const maestroRow = await viajesAsignarPage.findViajeRow(nroViaje);
expect(!!maestroRow).toBe(true);

const masterIdText = (
  await maestroRow!.locator("td").nth(1).innerText()
).trim();
const masterId = Number.parseInt(masterIdText.replace(/\D/g, ""), 10);
expect(Number.isFinite(masterId)).toBe(true);

const tramoLookup = String(masterId + 1);
await allure.parameter("Viaje Tramo Lookup (ID+1)", tramoLookup);

const tramoRow = await viajesAsignarPage.findViajeRow(tramoLookup);
expect(!!tramoRow).toBe(true);
```

---

## Commands

```bash
# Run one suite with report generation (project standard wrapper)
npm run qa:smoke:07:trip:planificar

# Generate/open report manually
npx allure generate allure-results-qa -o allure-report-qa --clean
npx allure open allure-report-qa

# Project scripts
npm run allure:generate:qa
npm run allure:open:qa
```

---

## Java requirement

Allure CLI needs Java available (`java` + `JAVA_HOME`).
If tests pass but command exits non-zero at report generation, verify:

```bash
java -version
echo $JAVA_HOME
npx allure --version
```

---

## Relevant Project Files

- `playwright.config.ts` — Allure reporter config
- `scripts/run-playwright-suite.mjs` — test+allure orchestration
- `tests/e2e/modules/**` — where `allure.parameter(...)` is added
- `allure-results-qa/` and `allure-report-qa/` — outputs
