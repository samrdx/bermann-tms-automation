# Bermann TMS - QA Automation Framework

Framework de automatizacion E2E para el sistema TMS (Transport Management System) de Bermann, utilizando Playwright y TypeScript.

**QA Environment:** <https://moveontruckqa.bermanntms.cl>
**Demo Environment:** <https://demo.bermanntms.cl/>

## Overview

| Metric | Value |
| --- | --- |
| Automated Tests | 13 |
| Modules | 6 (auth, transport, commercial, contracts, planning, monitoring) |
| Pass Rate | 100% (Chromium & Firefox) |
| Parallel Execution | 2 browsers (Chromium, Firefox) |
| Architecture | Page Object Model + Domain-Driven Modules |
| Skills System | 16 AI-ready skills (TMS + SDD) |

---

## Project Status Dashboard (Updated: 2026-03-09)

| Category | Value | Last Updated |
| --- | --- | --- |
| Active Branch | main | 2026-03-09 |
| Automated Tests | 13 (4 auth + 4 entities + 5 operations) | 2026-03-09 |
| Completed Modules | 6 (auth, transport, commercial, contracts, planning, monitoring) | 2026-03-09 |
| Pass Rate | 100% (Chromium & Firefox QA verified) | 2026-03-09 |
| Operational Skills | 5 TMS, 9 SDD, 2 Generic | 2026-03-07 |
| E2E Coverage | Entities -> Contracts -> Trips -> Monitoring (complete) | 2026-03-07 |

---

## Tech Stack

- **Playwright** v1.58.0 - Browser automation
- **TypeScript** v5.9.3 - Strict mode
- **Winston** - Structured logging
- **Allure Reports** - Professional test reporting
- **Page Object Model** - Test architecture
- **GitHub Actions** - CI/CD (Hybrid Workflow)

## Prerequisites

- Node.js v20+
- npm
- Access to TMS environments (QA/Demo credentials)

## Quick Start

```bash
# 1. Clone
git clone https://github.com/samrdx/bermann-tms-automation.git
cd bermann-tms-automation

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env with your TMS credentials (TMS_USERNAME / TMS_PASSWORD)

# 4. Install browsers
npx playwright install

# 5. Run a smoke test
npm run test:auth:login
```

## Project Structure

```text
qa-automation-framework/
├── AGENTS.md                    # AI skills system index
├── GEMINI.md                    # Agent assistance prompts (Full reference)
├── CLOUD.md                     # CI/CD architecture decisions
├── .github/workflows/           # GitHub Actions (Hybrid: Atomic + Legacy)
├── skills/                      # AI agent skills (anti-hallucination)
│   ├── tms-selectors/           # Selector priority & Confluence
│   ├── tms-dropdowns/           # Bootstrap Select patterns
│   └── ...                      # See AGENTS.md for full list
├── src/
│   ├── modules/                 # Domain-Driven Architecture
│   │   ├── auth/                # Login, Dashboard
│   │   ├── transport/           # Transportista, Conductor, Vehiculo
│   │   ├── commercial/          # Cliente
│   │   ├── contracts/           # Contratos
│   │   ├── planning/            # Planificar/Asignar Viajes
│   │   └── monitoring/          # Monitoreo (Finalizar Viajes)
│   ├── core/                    # BasePage, BrowserManager
│   └── ...
├── tests/
│   ├── e2e/
│   │   ├── suites/              # Setup and Atomic E2E flows
│   │   └── modules/             # Individual module tests
│   └── api-helpers/             # API helpers for entity creation
├── last-run-data-chromium.json  # Worker-specific data (Chromium)
├── last-run-data-firefox.json   # Worker-specific data (Firefox)
├── docs/                        # Architecture, CI/CD, selectors
├── reports/                     # Screenshots, videos
└── logs/                        # Execution logs
```

## Running Tests

### Multi-Environment Support

Control the target environment using the `ENV` variable:

- **QA (Default):** `npm run [script]` or `ENV=QA [script]`
- **Demo:** `ENV=DEMO [script]`

### Common Scripts

| Category | Command | Description |
| --- | --- | --- |
| **Smoke / Auth** | `npm run test:auth` | Run all authentication tests |
| **Atomic E2E** | `npm run test:qa:trip:full-flow` | Complete flow without state dependencies (QA) |
| | `npm run test:demo:trip:full-flow` | Complete flow without state dependencies (Demo) |
| **Legacy QA** | `npm run test:qa:legacy:setup` | Run base entities setup (Steps 1-4) |
| | `npm run test:qa:flow:setup-to-viajes` | Setup -> Contratos -> Viajes |
| **Reports** | `npm run allure:serve:qa` | Serve Allure report for QA |
| | `npm run allure:serve:demo` | Serve Allure report for Demo |
| | `npm run show-report` | Open standard Playwright HTML report |
| **Debug** | `npm run test:ui` | Run with Playwright UI mode |
| | `npm run test:debug` | Run with Playwright debugger |

### Allure Reporting

The framework uses Allure for professional result visualization.

```bash
# Generate and open report (QA)
npm run allure:generate:qa
npm run allure:open:qa

# Direct serve (QA)
npm run allure:serve:qa

# Full run: Clean + Test + Serve (Demo)
npm run run:demo:e2e
```

### Test Classification

1. **Atomic Tests (Modern)**: Self-contained, handle their own auth/data, can run in parallel.
2. **Legacy Tests (Sequential)**: Dependent on `base-entities.setup.ts`, read state from `last-run-data-{worker}.json`.

## Environment Variables

File: `.env` (never committed to Git)

```env
# TMS Environments
BASE_URL_DEV=https://moveontruckqa.bermanntms.cl
BASE_URL_STAGING=https://moveontruckqa.bermanntms.cl
BASE_URL_PROD=https://moveontruck.bermanntms.cl

# Configuration
ENVIRONMENT=dev
HEADLESS=false
TIMEOUT=30000

# Test Credentials (Standard)
TMS_USERNAME=your_username
TMS_PASSWORD=your_password
```

## CI/CD (GitHub Actions)

The framework uses a **Hybrid Workflow** (`tests.yml`) that runs on every push:
- **Atomic Job**: Runs Chromium independently.
- **Legacy Job**: Runs sequential suites with strictly 1 worker.

Artifacts (traces, videos) are retained for 7 days on failure.

## Architecture

- **Page Object Model** - One class per page, encapsulated selectors
- **Domain-Driven Modules** - auth, transport, commercial, contracts, planning
- **Worker-Specific JSON** - Each browser gets its own `last-run-data-{browser}.json` to prevent parallel data collisions
- **Skills System** - AI reads authoritative docs before generating code (95% hallucination reduction)

Data flow:

```text
auth.setup.ts -> playwright/.auth/user.json
     |
base-entities.setup.ts (3 browsers in parallel)
     |
last-run-data-{chromium,firefox,webkit}.json
     |
contrato-crear -> contrato2cliente-crear
     |
viajes-planificar -> viajes-asignar -> viajes-finalizar
```

For full architectural documentation, see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## AI Agent Integration

This project uses a skills system to ensure consistent, correct AI-generated code:

- **Entry point:** [AGENTS.md](AGENTS.md) - Skills index and auto-invoke rules
- **Skills:** [skills/](skills/) - 5 TMS-specific skills (selectors, dropdowns, page objects, tests, data)
- **Context docs:** [CLAUDE.md](CLAUDE.md) (Claude), [GEMINI.md](GEMINI.md) (Agent prompts)

### Engram (Persistent Memory)

This repository supports hybrid SDD persistence (OpenSpec + Engram).

- Setup guide: `docs/ENGRAM_INTEGRATION.md`
- Preflight check: `npm run engram:preflight`
- Topic key helper: `npm run engram:topic-key -- <change-name> <artifact>`

Recommended mode is `hybrid`, configured in `openspec/config.yaml`.

## Logs and Reports

| Artifact | Location |
| --- | --- |
| Application logs | `logs/app.log` |
| Error logs | `logs/errors.log` |
| Screenshots | `reports/screenshots/` |
| HTML Report | `playwright-report/` |

## Contributing

### Branch Strategy

- `main` - Production branch
- `feature/module-name` - New features
- `bugfix/issue-description` - Bug fixes

### Before Committing

```bash
npx tsc --noEmit          # TypeScript compilation check
npm run test:all           # Run all tests
git add <specific-files>
git commit -m "Brief description"
git push origin main
```

### Daily Workflow (Multi-Site)

```bash
# When arriving
git pull origin main
npm run test:all

# Before leaving
git add .
git commit -m "Day X: progress"
git push origin main
```

Note: `.env` stays local and won't be overwritten by `git pull`.

## Author

**Samuel Rodriguez**

- GitHub: [@samrdx](https://github.com/samrdx)

## License

Propiedad de Bermann - Uso interno exclusivo.

---

**Last updated:** February 2026
