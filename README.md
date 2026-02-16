# Bermann TMS - QA Automation Framework

Framework de automatizacion E2E para el sistema TMS (Transport Management System) de Bermann, utilizando Playwright y TypeScript.

**QA Environment:** <https://moveontruckqa.bermanntms.cl>

## Overview

| Metric | Value |
| --- | --- |
| Automated Tests | 12 |
| Modules | 5 (auth, transport, commercial, contracts, planning) |
| Pass Rate | 100% |
| Parallel Execution | 3 browsers (Chromium, Firefox, WebKit) |
| Architecture | Page Object Model + Domain-Driven Modules |
| Skills System | 5 TMS-specific skills (anti-hallucination) |

## Tech Stack

- **Playwright** v1.58.0 - Browser automation
- **TypeScript** v5.9.3 - Strict mode
- **Winston** - Structured logging
- **Page Object Model** - Test architecture
- **GitHub Actions** - CI/CD

## Prerequisites

- Node.js v20+
- npm
- Access to TMS QA environment (credentials)

## Quick Start

```bash
# 1. Clone
git clone https://github.com/samrdx/qa-automation-framework.git
cd qa-automation-framework

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env with your TMS credentials

# 4. Install browsers
npx playwright install

# 5. Run tests
npm run test:all
```

## Project Structure

```text
qa-automation-framework/
├── AGENTS.md                    # AI skills system index
├── CLAUDE.md                    # Claude agent context
├── GEMINI.md                    # Agent assistance prompts
├── CLOUD.md                     # CI/CD architecture decisions
├── .github/workflows/           # GitHub Actions pipelines
├── skills/                      # AI agent skills (anti-hallucination)
│   ├── tms-selectors/           # Selector priority & Confluence
│   ├── tms-dropdowns/           # Bootstrap Select patterns
│   ├── tms-page-objects/        # POM template
│   ├── tms-tests/               # Test structure & phases
│   └── tms-data/                # Data generation strategies
├── src/
│   ├── modules/                 # Domain-Driven Architecture
│   │   ├── auth/                # Login, Dashboard, AuthActions
│   │   ├── transport/           # Transportista, Conductor, Vehiculo + Factories
│   │   ├── commercial/          # Cliente + Factory
│   │   ├── contracts/           # Contratos + Factory
│   │   └── planning/            # Planificar/Asignar Viajes
│   ├── core/                    # BasePage, BrowserManager
│   ├── fixtures/                # Playwright Fixtures (DI)
│   ├── utils/                   # Logger, RUT generator, utilities
│   └── config/                  # Environment, credentials
├── tests/
│   ├── e2e/
│   │   ├── modules/
│   │   │   ├── 01-entidades/    # Entity creation (4 tests)
│   │   │   └── 02-operaciones/  # Operations (4 tests)
│   │   ├── suites/
│   │   │   └── base-entities.setup.ts  # Master entity setup
│   │   └── helpers/
│   │       └── auth.setup.ts    # Global authentication
│   └── api-helpers/             # API helpers for entity creation
├── last-run-data-chromium.json  # Worker-specific data (per browser)
├── last-run-data-firefox.json
├── last-run-data-webkit.json
├── docs/                        # Architecture, CI/CD, selectors
├── reports/                     # Screenshots, videos
└── logs/                        # Execution logs
```

## Running Tests

### Local Development

| Command | Description |
| --- | --- |
| `npm run test:all` | Run all module tests |
| `npm run test:e2e:suites:full-flow` | Complete sequential flow (entities -> contracts -> trips) |
| `npm run test:base` | Base entities setup only (Steps 1-4) |
| `npm run test:transportista` | Create transportista entity |
| `npm run test:cliente` | Create cliente entity |
| `npm run test:vehiculo` | Create vehiculo entity |
| `npm run test:conductor` | Create conductor entity |
| `npm run test:contrato` | Create contract (Costo type) |
| `npm run test:contrato2cliente` | Create contract (Ingreso type) |
| `npm run test:viajes:planificar` | Plan trip |
| `npm run test:viajes:asignar` | Assign trip |
| `npm run test:headed` | Run with visible browser |
| `npm run test:debug` | Run with Playwright debugger |
| `npm run test:ui` | Run with Playwright UI mode |
| `npm run show-report` | Open HTML test report |
| `npm run codegen` | Launch Playwright codegen |

### Docker (CI Simulation)

Run tests inside the same Linux container used by CI:

```bash
# From Git Bash on Windows (MSYS_NO_PATHCONV prevents path mangling)
MSYS_NO_PATHCONV=1 docker run --rm -it \
  -v "/$(pwd)":/work -w /work \
  --ipc=host \
  mcr.microsoft.com/playwright:v1.58.0-jammy /bin/bash

# Inside the container:
npm ci
npx playwright test tests/e2e/modules/02-operaciones/viajes/viajes-asignar.test.ts --project=chromium
```

### CI/CD (GitHub Actions)

Tests run automatically on push to `main` and on pull requests. See [CLOUD.md](CLOUD.md) for architecture decisions and [docs/CI_CD_SETUP.md](docs/CI_CD_SETUP.md) for operational setup.

## GitHub Actions Secrets

Add these in **Settings > Secrets and variables > Actions**:

| Secret | Description | Example |
| --- | --- | --- |
| `USERNAME_DEV` | TMS QA username | `arivas` |
| `PASSWORD_DEV` | TMS QA password | `arivas` |

The codebase maps `USERNAME_DEV`/`PASSWORD_DEV` to `TEST_REGULAR_USER`/`TEST_REGULAR_PASS` automatically via [src/config/credentials.ts](src/config/credentials.ts).

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
LOG_LEVEL=info

# Test Users
TEST_ADMIN_USER=your_admin_username
TEST_ADMIN_PASS=your_admin_password
TEST_REGULAR_USER=your_regular_username
TEST_REGULAR_PASS=your_regular_password
```

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
