# GEMINI.md

# Bermann TMS QA Automation Framework

This file is a concise AI-facing mirror of `CLAUDE.md`.

- `AGENTS.md` is the source of truth for skill routing and repo-specific agent rules.
- `README.md` is the source of truth for human onboarding.
- `package.json` and `playwright.config.ts` are the source of truth for scripts and execution behavior.

---

## Quick Start for AI Assistants

1. Read `AGENTS.md` first.
2. Load the matching skill from `.agents/skills/` before generating code.
3. Verify script names in `package.json` before documenting or running them.
4. Verify Playwright project names in `playwright.config.ts` before referencing them.

---

## Stable Repo Facts

- Web stack: Playwright, TypeScript, Winston, Node 20, ES Modules.
- Supported web environments: `QA` and `DEMO`.
- Primary browser target: Chromium.
- Skills path: `.agents/skills/`.
- Main web workflow: `.github/workflows/tests.yml`.
- Current PR workflow scope: Demo environment.
- Mobile automation also exists under `tmsapp/mobile/` with WDIO.

Avoid documenting volatile claims like pass rate percentages, exact test totals, or "everything is green" unless they were verified in the current session.

---

## Available Repo-Local Skills

### TMS

- `tms-selectors`
- `tms-dropdowns`
- `tms-page-objects`
- `tms-tests`
- `tms-data`
- `tms-atomic-e2e`
- `tms-ultimamilla`
- `tms-allure`
- `tms-commits`

### Utility

- `jira-ticket-writer`
- `jql-tickets`
- `playwright-cli`
- `skill-creator`
- `create-pr-from-spec`

### SDD

- `sdd-init`
- `sdd-explore`
- `sdd-propose`
- `sdd-spec`
- `sdd-design`
- `sdd-tasks`
- `sdd-apply`
- `sdd-verify`
- `sdd-archive`

---

## Project Structure

```text
bermann-tms-automation/
├── AGENTS.md
├── CLAUDE.md
├── GEMINI.md
├── .agents/skills/
├── .github/workflows/tests.yml
├── src/
│   ├── config/
│   ├── core/
│   ├── modules/
│   │   ├── auth/
│   │   ├── commercial/
│   │   ├── configAdmin/
│   │   ├── contracts/
│   │   ├── finanzas/
│   │   ├── monitoring/
│   │   ├── planning/
│   │   ├── transport/
│   │   └── ultimamilla/
│   └── utils/
├── tests/
│   ├── api-helpers/
│   ├── e2e/
│   ├── experiments/
│   └── exploration/
├── scripts/
├── docs/
└── tmsapp/mobile/
```

---

## Testing Model

### Legacy flows

- Live mostly under `tests/e2e/modules/`.
- Depend on seeded data and helpers like `DataPathHelper`.
- Need careful ordering for operational chains.

### Atomic E2E flows

- Live in `tests/e2e/suites/`.
- Designed to be more self-contained.
- Cover flows like prefactura, proforma, viajes asignar, and viajes finalizar.

### Config setup flows

- Use setup suites like `01-config-master.setup.ts` and `02-carga-master.setup.ts`.

---

## Execution Truths

Use the real commands from `package.json`.

### Verification

```bash
npm run typecheck
```

### QA examples

```bash
npm run qa:smoke:01:transportista
npm run qa:config:smoke:all
npm run qa:e2e:all
npm run qa:smoke:ultimamilla:batch
```

### Demo examples

```bash
npm run demo:e2e:finanzas-full
npm run demo:smoke:ultimamilla:batch
```

### Reports

```bash
npm run allure:generate:qa
npm run allure:serve:qa
npm run show-report:qa
```

---

## Playwright Notes

- `playwright.config.ts` selects base URL from `ENV`.
- The auth setup project is named `Autorización`.
- Main test projects are `chromium-qa` and `chromium-demo`.
- Runtime browser is Google Chrome via `channel: 'chrome'`; `chromium-*` project names are historical.
- Config setup projects include `config-smoke-chromium`, `config-fase1-chromium`, and `config-fase2-chromium`.
- Browser artifacts are retained on failure.

---

## CI/CD Notes

Current workflow file: `.github/workflows/tests.yml`

Current pull request coverage:

- `npm run typecheck`
- `npm run qa:e2e:finanzas-full -- --project chromium-qa --workers 1`

Do not document older CI behavior unless it still exists in `.github/workflows/`.

---

## Documentation Rules

1. Keep this file aligned with `CLAUDE.md`.
2. Do not reference `skills/`; use `.agents/skills/`.
3. Do not reference non-existent files like `CLOUD.md`.
4. Do not invent scripts such as `npm run test:all` if they are not in `package.json`.
5. Prefer stable repo facts over dashboards with dates and percentages.

---

## Useful References

- `AGENTS.md`
- `README.md`
- `package.json`
- `playwright.config.ts`
- `docs/ARCHITECTURE.md`
- `docs/CI_CD_SETUP.md`
