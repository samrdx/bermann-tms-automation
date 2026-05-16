# GEMINI.md

# Bermann TMS QA Automation Framework

## Multi-Environment Support

- **QA (Default):** `ENV=QA npx playwright test` (URL: <https://moveontruckqa.bermanntms.cl/login>)
- **Demo:** `ENV=DEMO npx playwright test` (URL: <https://demo.bermanntms.cl/>)

## Quick Start for AI Assistants

**IMPORTANT:** This project uses a skills system to prevent hallucinations and enforce consistent patterns.

- **For skill index and auto-invoke rules:** See [AGENTS.md](AGENTS.md)
- **For skill documentation:** See [.agents/skills/](.agents/skills/) directory
- **For project overview:** Continue reading this file

### Available Skills

#### TMS-Specific Skills

- **tms-selectors** - Selector priority & Confluence integration
- **tms-dropdowns** - Bootstrap Select patterns (5 proven patterns)
- **tms-page-objects** - Page Object Model template
- **tms-tests** - Test structure and phases
- **tms-data** - Data generation strategies (RUT, timestamps, factories)

#### Spec-Driven Development (SDD) Skills

- **sdd-init** - Bootstrap openspec/ in current project
- **sdd-explore** - Investigate codebase and explore ideas
- **sdd-propose** - Create change proposal
- **sdd-spec** - Write specifications
- **sdd-design** - Technical design documents
- **sdd-tasks** - Break change into tasks
- **sdd-apply** - Implement code
- **sdd-verify** - Validate implementation
- **sdd-archive** - Sync specs and archive change

#### Generic & Utility Skills

- **skill-creator** - Meta-skill for creating new skills
- **playwright-cli** - Automates browser interactions directly from CLI

**Note:** The combination of TMS-specific skills, SDD orchestrator tools, and utility skills provides comprehensive automation guidance.

### Auto-invoke Skills

When executing tasks or receiving specific commands, ALWAYS invoke the corresponding skill FIRST:

| Scenario / Action | Skill to Auto-Invoke |
| --- | --- |
| Creating a new Page Object | `tms-page-objects` |
| Working with Bootstrap Select dropdowns | `tms-dropdowns` |
| Selecting ANY element on a page | `tms-selectors` |
| Writing a new test file | `tms-tests` |
| Generating test data (RUT, dates, factories) | `tms-data` |
| Browser navigation, screenshots, form filling natively | `playwright-cli` |
| User says: `/sdd:init`, "sdd init", "iniciar sdd" | `sdd-init` |
| User says: `/sdd:new`, "sdd explore", "new change" | `sdd-explore` → `sdd-propose` |
| User says: `/sdd:apply`, "implementar", "implement" | `sdd-apply` |
| User says: `/sdd:verify`, "verificar" | `sdd-verify` |
| User says: `/sdd:archive`, "archivar" | `sdd-archive` |
| Substantial multi-file feature/refactor request | Suggest `/sdd:new` format |

**Always check AGENTS.md before creating Page Objects, tests, or working with SDD.**

---

## Project Status Dashboard (Updated: 2026-05-15)

| Category | Value | Last Updated |
|----------|-------|--------------|
| Active Branch | main | 2026-05-15 |
| Automated Tests | 20+ (4 auth + 4 entities + 5 ops + 3 finanzas + 3 ultimamilla + 8 config) | 2026-05-15 |
| Completed Modules | 9 (auth, transport, commercial, contracts, planning, monitoring, finanzas, configAdmin, ultimamilla) | 2026-05-15 |
| Pass Rate | 100% (Chromium & Firefox QA verified) | 2026-05-15 |
| Operational Skills | 7 TMS, 9 SDD, 2 Generic | 2026-05-15 |
| E2E Coverage | Entities → Contracts → Trips → Monitoring → Prefactura → Proforma → Ultima Milla | 2026-05-15 |
| TypeScript Compilation | Clean (0 errors) | 2026-05-15 |
| Browsers | 2 (Chromium, Firefox) - WebKit removed for instability | 2026-05-15 |
| CI/CD | PR E2E Demo pipeline + Ultimamilla batch + Allure GitHub Pages | 2026-05-15 |

---

## Project Overview

**Project:** QA Automation Framework for Bermann Transport Management System (TMS)
**Client:** Bermann (<https://www.bermann.cl/soluciones>)
**Critical Product:** TMS - largest customer base
**QA Environment:** <https://moveontruckqa.bermanntms.cl/login>
**Repository:** <https://github.com/samrdx/bermann-tms-automation>

## Tech Stack

- **Test Framework:** Playwright ^1.58.0
- **Language:** TypeScript ^5.9.3 (Strict mode)
- **Architecture:** Page Object Model (POM)
- **Logging:** Winston ^3.19.0 (professional structured logging)
- **Skills System:** Prowler-inspired pattern for AI guidance
- **CI/CD:** GitHub Actions (hybrid workflow)
- **IDE:** Antigravity by Google
- **Runtime:** Node.js 20, ES Modules

## Project Structure

```
qa-automation-framework/
├── AGENTS.md                   # Skills system index
├── CLAUDE.md                   # Project documentation (mirror of GEMINI.md)
├── GEMINI.md                   # This file (project documentation)
├── CLOUD.md                    # CI/CD architecture decisions
├── README.md                   # Main documentation
├── .github/workflows/          # CI/CD pipelines
│   └── tests.yml               # PR E2E Demo (finanzas + ultimamilla batch)
├── .agents/skills/             # AI agent skills (anti-hallucination) — 18 skills
│   ├── tms-selectors/
│   ├── tms-dropdowns/
│   ├── tms-page-objects/
│   ├── tms-tests/
│   ├── tms-data/
│   ├── tms-atomic-e2e/
│   ├── tms-ultimamilla/
│   └── ...
├── src/
│   ├── modules/                # Modular Architecture (9 modules)
│   │   ├── auth/               # Login, Dashboard, Auth actions
│   │   ├── transport/          # Transportista, Conductor, Vehiculo + Factories
│   │   ├── commercial/         # Cliente + Factory
│   │   ├── contracts/          # Contratos + Factory
│   │   ├── planning/           # Planificar/Asignar Viajes
│   │   ├── monitoring/         # Monitoreo (Finalizar Viajes)
│   │   ├── finanzas/           # Prefactura
│   │   ├── ultimamilla/        # Pedidos, Asignación, Monitoreo
│   │   └── configAdmin/        # Config: UnidadNegocio, TipoOperacion, etc.
│   ├── core/                   # BasePage, BrowserManager
│   ├── fixtures/               # Playwright Fixtures (Dependency Injection)
│   ├── utils/                  # Logger, RUT generator, utilities
│   └── config/                 # Environment, credentials
├── tests/
│   ├── e2e/
│   │   ├── auth/               # Authentication tests (login, logout, negative, full-flow)
│   │   ├── modules/
│   │   │   ├── 00-config/      # Config smoke tests (8 suites)
│   │   │   ├── 01-entidades/   # Entity creation tests
│   │   │   ├── 02-operaciones/ # Operation tests (Contratos, Viajes, Monitoreo)
│   │   │   ├── 03-finanzas/    # Reserved
│   │   │   └── ultimamilla/    # Última Milla (pedido, asignar, batch)
│   │   └── suites/
│   │       ├── base-entities.setup.ts       # Master entity setup
│   │       ├── 01-config-master.setup.ts
│   │       ├── 02-carga-master.setup.ts
│   │       ├── prefactura-crear-e2e.test.ts
│   │       ├── proforma-crear-e2e.test.ts
│   │       ├── finanzas-prefactura-proforma-e2e.test.ts
│   │       ├── viajes-asignar-e2e.test.ts
│   │       └── viajes-finalizar-e2e.test.ts
│   ├── api-helpers/            # API helpers for entity creation
│   ├── helpers/
│   │   └── auth.setup.ts       # Global authentication setup
│   ├── experiments/            # Experimental test scripts
│   └── exploration/            # Page inspection scripts
├── scripts/                    # Utility scripts (pw:run wrapper, engram, SDD sync, CI validation)
│   ├── run-playwright-suite.mjs
│   ├── ci/
│   ├── engram/
│   └── sdd/
├── playwright/.auth/           # Authentication state
│   └── user.json               # Stored session
├── tmsapp/mobile/              # Mobile automation (WDIO)
├── .atl/                       # Skill registry (auto-generated)
├── last-run-data-chromium.json # Worker-specific data (Chromium)
├── last-run-data-firefox.json  # Worker-specific data (Firefox)
├── reports/                    # Screenshots, videos
├── logs/                       # Execution logs
├── docs/                       # Documentation
│   ├── ARCHITECTURE.md
│   ├── CI_CD_SETUP.md
│   ├── TEST-ACTIVES.md
│   ├── ENGRAM_INTEGRATION.md
│   ├── REPO_MAINTENANCE_ROUTINE.md
│   ├── ALLURE_REPORT_USAGE.md
│   ├── project-selectors.csv
│   └── ProjectSelectors.md
└── .env                        # Environment variables (not versioned)
```

## Architecture Patterns

### 1. Page Object Model (POM)

**Rules:**

- One class = One page
- Encapsulate selectors (tests should NOT see CSS)
- Descriptive methods (clickLoginButton vs click('#btn'))
- Reusable code
- **ALWAYS check tms-page-objects skill before creating**

**Example:**

```typescript
export class LoginPage extends BasePage {
  private readonly selectors = {
    usernameInput: "#login-usuario",
    passwordInput: "#login-clave",
    loginButton: 'button[type="submit"].btn-success',
  };

  async login(username: string, password: string): Promise<void> {
    logger.info(`Attempting login for user: ${username}`);
    await this.fill(this.selectors.usernameInput, username);
    await this.fill(this.selectors.passwordInput, password);
    await this.click(this.selectors.loginButton);
  }
}
```

### 2. Skills System (Anti-Hallucination)

**Purpose:** Prevent AI from guessing patterns by providing authoritative documentation.

**How it works:**

1. AGENTS.md defines when to use each skill
2. Skills contain proven patterns and examples
3. AI reads skill BEFORE generating code
4. Result: 95% reduction in hallucinations

**Example workflow:**

```
User: "Create ContratosPage"
AI: Reads AGENTS.md -> Sees auto-invoke: tms-page-objects
AI: Reads skills/tms-page-objects/SKILL.md
AI: Generates code following exact template
Result: Correct code on first attempt
```

### 3. BasePage Pattern

**Location:** `src/core/BasePage.ts`
**Purpose:** Common methods for all Page Objects

**Available methods:**

- `navigate()` - Navigate to URL
- `waitForElement()` - Wait for visibility
- `fill()` - Fill text fields
- `click()` - Click elements
- `getText()` - Get text content
- `isVisible()` - Check visibility
- `takeScreenshot()` - Capture screenshot
- `getTitle()` - Get page title
- `waitForNavigation()` - Wait for page load
- `getCurrentUrl()` - Get current URL

### 4. Logging Pattern

**Always use structured logging:**

```typescript
import { createLogger } from "../utils/logger.js";
const logger = createLogger("ComponentName");

logger.info("Action description");
logger.error("Error description", error);
logger.debug("Debug information");
```

**Log levels:**

- `error` - Errors with screenshots
- `warn` - Warnings
- `info` - Main actions
- `debug` - Detailed information

### 5. Parallel Execution with Worker-Specific Data

**Innovation:** Each browser has its own JSON file to avoid data collisions during parallel execution.

**Data Flow:**

```
auth.setup.ts
     |
playwright/.auth/user.json
     |
base-entities.setup.ts (2 browsers in parallel: Chromium, Firefox)
     |
last-run-data-chromium.json
last-run-data-firefox.json
     |
contrato-crear.test.ts -> contrato2cliente-crear.test.ts
     |
viajes-planificar.test.ts -> viajes-asignar.test.ts -> viajes-monitoreo.test.ts
```

**Note:** WebKit was removed due to instability in legacy form interactions. Only Chromium and Firefox are active.

**Configuration:** See [playwright.config.ts](playwright.config.ts) for per-browser base-entities projects.

**Helper:** `tests/api-helpers/DataPathHelper.ts` provides `getWorkerDataPath(testInfo)` to resolve the correct JSON file for each worker.

### 6. Test Classification: Atomic vs Legacy

The test suite is organized into two categories:

**Atomic Tests (New Generation):**

- Self-contained, independent tests
- Do NOT depend on base-entities setup or JSON data files
- Handle their own authentication and data lookup via API
- Examples: `viajes-finalizar-e2e.test.ts` (in `tests/e2e/suites/`)

**Legacy Tests (Dependent):**

- Depend on `base-entities.setup.ts` for entity creation
- Read data from `last-run-data-{browser}.json`
- Must run sequentially in a specific order
- Examples: `contrato-crear.test.ts`, `viajes-planificar.test.ts`, `viajes-asignar.test.ts`, `viajes-monitoreo.test.ts`

## Naming Conventions

### Files

- Page Objects: `ModuleNamePage.ts` (e.g., `LoginPage.ts`, `ContratosPage.ts`, `MonitoreoPage.ts`)
- Tests: `module-action.test.ts` (e.g., `login.test.ts`, `viajes-finalizar.test.ts`)
- Skills: `tms-[topic]/SKILL.md` (e.g., `tms-dropdowns/SKILL.md`)
- Utilities: `descriptive-name.ts` (e.g., `logger.ts`, `rutGenerator.ts`)
- Factories: `ModuleNameFactory.ts` (e.g., `TransportistaFactory.ts`)

### Code

- Classes: PascalCase (`LoginPage`, `BrowserManager`)
- Methods: camelCase (`fillUsername()`, `clickLoginButton()`)
- Variables: camelCase (`userName`, `isLoggedIn`)
- Constants: UPPER_SNAKE_CASE (`MAX_RETRIES`, `DEFAULT_TIMEOUT`)
- Selectors: camelCase in `selectors` object

### Tests

- Test files: `module-action.test.ts`
- Test functions: Descriptive names
- Example: `test('Create Contract using Pre-existing Entities from JSON', ...)`

## Code Standards

### TypeScript

- **Always use strict mode**
- **Always specify types** (no implicit `any`)
- **Use async/await** instead of callbacks
- **Import with `.js` extension** for relative imports (ES Modules)

```typescript
import { BasePage } from "../core/BasePage.js"; // Correct
import { BasePage } from "../core/BasePage"; // Wrong
```

### Error Handling

```typescript
try {
  await somethingThatMightFail();
  logger.info("Success");
} catch (error) {
  logger.error("Failed", error);
  await this.takeScreenshot("error-context");
  throw error;
} finally {
  await cleanup();
}
```

### Testing Standards

- Every test must have clear logging
- Screenshots on error
- Explicit timeouts
- Error handling with try/catch
- Cleanup in finally block
- **Follow tms-tests skill for structure**

## Selector Priority (See tms-selectors skill)

**Order of preference:**

1. `id` - Most stable (#contrato-nro_contrato)
2. `data-id` - TMS convention ([data-id="field-id"])
3. `name` - Form fields ([name="Contrato[field]"])
4. `aria-*` - Accessibility ([aria-label="Search"])
5. CSS classes - Last resort (.btn.dropdown-toggle.btn-light)

**CRITICAL:** All selectors must be documented in Confluence database.

**Example:**

```typescript
// Good - from Confluence, priority order followed
nroContrato: '#contrato-nro_contrato',              // ID (priority 1)
transportista: 'button[data-id="contrato-transportista_id"]',  // data-id (priority 2)
searchBox: '.bs-searchbox input[type="text"]',      // Specific class (priority 5)

// Avoid - not documented, fragile
button: '.btn.btn-primary.submit-action',  // Too specific
input: 'div > div > input',                // Too generic
```

## Bootstrap Dropdowns (See tms-dropdowns skill)

**5 Proven Patterns:**

1. **Simple Dropdown** (< 20 options, no search)
2. **Long Dropdown with Scroll** (20-500 options, requires scrolling)
3. **Dropdown with Search** (has `.bs-searchbox`)
4. **Cascading Dropdown** (parent -> child relationship)
5. **Date Picker** (readonly inputs with datetimepicker)

**Example (Cascading):**

```typescript
// Tipo -> Transportista (cascading)
await this.selectTipo("Costo");
await this.page.waitForTimeout(1500); // CRITICAL: wait for cascade
await this.selectTransportista("Transportadora S.A.I");
```

**See skills/tms-dropdowns/SKILL.md for complete patterns.**

## Test Structure (See tms-tests skill)

### Standard Test Pattern

```typescript
test.describe('Module Name', () => {
  test.setTimeout(60000);

  test('Test Description', async ({ page }, testInfo) => {
    const startTime = Date.now();
    logger.info('Starting Test');
    logger.info('='.repeat(80));

    // PHASE 1: Load/Setup
    logger.info('PHASE 1: Loading data...');
    // ... setup steps
    logger.info('Setup complete');

    // PHASE 2: Navigation
    logger.info('PHASE 2: Navigating...');
    // ... navigation steps
    logger.info('Navigation complete');

    // PHASE 3: Main Action
    logger.info('PHASE 3: Executing action...');
    // ... action steps
    logger.info('Action complete');

    // PHASE 4: Verification
    logger.info('PHASE 4: Verifying...');
    // ... verification steps
    logger.info('Verification complete');

    // Summary
    const executionTime = ((Date.now() - startTime) / 1000).toFixed(2);
    logger.info('='.repeat(80));
    logger.info(`Execution Time: ${executionTime}s`);
    logger.info('='.repeat(80));
  });
});
```

## Environment Variables

**File:** `.env` (NEVER commit to Git)

```env
# TMS Environments
BASE_URL_DEV=https://moveontruckqa.bermanntms.cl
BASE_URL_STAGING=https://moveontruckqa.bermanntms.cl
BASE_URL_PROD=https://moveontruck.bermanntms.cl

# Configuration
ENVIRONMENT=dev
HEADLESS=false
TIMEOUT=30000

# Logging
LOG_LEVEL=info

# Test Users (New Standard)
TMS_USERNAME=your_user
TMS_PASSWORD=your_password
```

### Credential System

**Location:** `src/config/credentials.ts`

The credential system uses `TMS_USERNAME` and `TMS_PASSWORD` as the standard environment variables. Fallback to `arivas` if not set.

**Available roles:**

- `admin` - Admin user (TMS_USERNAME/TMS_PASSWORD)
- `regular` - Regular user (same credentials in QA)
- `viewer` - Read-only user (TEST_VIEWER_USER/TEST_VIEWER_PASS)

```typescript
import { getTestUser } from '../config/credentials.js';
const user = getTestUser('admin');
```

## Available NPM Scripts

All tests run through the wrapper `scripts/run-playwright-suite.mjs` (`npm run pw:run`). Env prefix determines target: `qa:*` for QA, `demo:*` for Demo.

### Config Smoke (1 vez por sprint)

```bash
npm run qa:config:smoke:all            # 8 suites: unidad negocio, tipo operacion, tipo servicio, tipo carga, capacidades, ruta, carga-setup, carga-crear
npm run qa:config:sprint               # Fase 1 + Fase 2 completa
```

### Smoke Tests (por paso)

```bash
npm run qa:smoke:01:transportista       # Crear Transportista
npm run qa:smoke:02:cliente             # Crear Cliente
npm run qa:smoke:03:conductor           # Crear Conductor
npm run qa:smoke:04:vehiculo            # Crear Vehiculo
npm run qa:smoke:05:contract:cliente    # Contrato Ingreso
npm run qa:smoke:06:contract:transportista # Contrato Costo
npm run qa:smoke:07:trip:planificar     # Planificar Viaje
npm run qa:smoke:08:trip:asignar        # Asignar Viaje
npm run qa:smoke:09:trip:finalizar      # Finalizar Viaje
npm run qa:smoke:all                    # Todos en secuencia
```

### Regression Suites

```bash
npm run qa:regression:entities          # Transportista + Cliente + Conductor + Vehiculo
npm run qa:regression:contracts         # Contratos Ingreso + Costo
npm run qa:regression:trips             # Planificar + Asignar + Finalizar
npm run qa:regression:ops               # Entities + Contracts + Trips
npm run qa:regression:finanzas          # Prefactura + Proforma (E2E atómicos)
npm run qa:regression:ultimamilla       # Asignar + Batch
npm run qa:regression:ops:full          # Todo + Allure report
```

### Atomic E2E (independientes — cargan datos seedeados)

```bash
npm run qa:e2e:prefactura               # Prefactura desde viaje finalizado
npm run qa:e2e:proforma                 # Proforma desde viaje finalizado
npm run qa:e2e:finanzas-full            # Prefactura + Proforma
npm run qa:e2e:viajes-asignar           # Asignar viaje (E2E atómico)
npm run qa:e2e:viajes-finalizar         # Finalizar viaje (E2E atómico)
npm run qa:e2e:all                      # Todos los E2E atómicos QA
```

### Última Milla

```bash
npm run qa:smoke:ultimamilla            # Crear pedido
npm run qa:smoke:ultimamilla:asignar    # Asignar pedido (multi-browser)
npm run qa:smoke:ultimamilla:batch      # Batch asignación
```

### Seed Legacy

```bash
npm run qa:seed:legacy                  # base-entities.setup.ts
```

### Allure Reports

```bash
npm run allure:generate:qa              # Generar reporte QA
npm run allure:serve:qa                 # Servir reporte QA
npm run allure:generate:demo            # Generar reporte Demo
npm run allure:serve:demo               # Servir reporte Demo
npm run run:all:qa                      # Clean + Test + Generate + Open QA
npm run run:all:demo                    # Clean + Test + Generate + Open Demo
```

### Mobile (tmsapp)

```bash
npm run mobile:test:smoke:auth          # Auth smoke en app mobile (WDIO)
```

### Playwright Core

```bash
npm run test                            # Run all tests (default: QA E2E)
npm run show-report:qa                  # Open HTML report (QA)
npm run show-report:demo                # Open HTML report (Demo)
npm run codegen:qa                      # Launch codegen for QA
npm run codegen:demo                    # Launch codegen for Demo
```

### Maintenance & SDD

```bash
npm run clean:reports                   # Clean reports and logs
npm run storage:maintenance             # Clean reports + npm cache + check browsers
npx tsc --noEmit                        # TypeScript compilation check
npm run sdd:sync:pull                   # Pull latest SDD artifacts
npm run sdd:sync:push                   # Push SDD artifacts
```

## Modules Implemented

### Completed Modules (9/9)

1. **auth** - `src/modules/auth/`
   - LoginPage, DashboardPage, AuthActions
   - Tests: `tests/e2e/auth/` (login, logout, login-negative, full-flow)

2. **transport** - `src/modules/transport/`
   - TransportistaPage, ConductorPage, VehiculoPage
   - TransportistaFactory, ConductorFactory, VehiculoFactory
   - Tests: `01-entidades/transport/`, `01-entidades/conductor/`, `01-entidades/vehiculos/`

3. **commercial** - `src/modules/commercial/`
   - ClientePage, ClienteFactory
   - Tests: `01-entidades/clientes/`

4. **contracts** - `src/modules/contracts/`
   - ContratosPage, ContratoFactory
   - Tests: `02-operaciones/contratos/` (contrato-crear, contrato2cliente-crear)

5. **planning** - `src/modules/planning/`
   - PlanificarPage, AsignarPage
   - Tests: `02-operaciones/viajes/` (viajes-planificar, viajes-asignar)

6. **monitoring** - `src/modules/monitoring/`
   - MonitoreoPage
   - Tests: `02-operaciones/Monitoreo/viajes-monitoreo.test.ts` (legacy) and `tests/e2e/suites/viajes-finalizar-e2e.test.ts` (atomic E2E)

7. **finanzas** - `src/modules/finanzas/`
   - PrefacturaPage
   - Tests: `tests/e2e/suites/prefactura-crear-e2e.test.ts`, `proforma-crear-e2e.test.ts`, `finanzas-prefactura-proforma-e2e.test.ts` (atomic E2E)

8. **configAdmin** - `src/modules/configAdmin/pages/`
   - UnidadNegocioPage, TipoOperacionPage, TipoServicioPage, TipoCargaPage, RutaPage, CargaMasterPage, CrearCargaPage
   - Tests: `00-config/config/` (8 suites)

9. **ultimamilla** - `src/modules/ultimamilla/pages/`
   - UltimaMillaFormPage, UltimaMillaPedidoIndexPage, UltimaMillaAsignarPage, UltimaMillaMonitoreoPage
   - UltimaMillaFactory
   - Tests: `ultimamilla/pedido-crear.test.ts`, `pedido-asignar.test.ts`, `pedido-asignar-batch.test.ts`

### Test Organization

```
tests/e2e/
├── auth/                           # Authentication tests (4 tests)
│   ├── login.test.ts
│   ├── logout.test.ts
│   ├── login-negative.test.ts
│   └── full-flow.test.ts
├── modules/
│   ├── 00-config/                  # Config smoke tests (8 suites)
│   │   └── config/
│   │       ├── unidadnegocio-crear.test.ts
│   │       ├── tipo-operacion-crear.test.ts
│   │       ├── tipo-servicio-crear.test.ts
│   │       ├── tipocarga-crear.test.ts
│   │       ├── capacidades-crear.test.ts
│   │       ├── ruta-crear.test.ts
│   │       ├── carga-setup.test.ts
│   │       └── carga-crear.test.ts
│   ├── 01-entidades/               # Entity creation tests (4 tests)
│   │   ├── transport/transportistas-crear.test.ts
│   │   ├── clientes/cliente-crear.test.ts
│   │   ├── vehiculos/vehiculo-crear.test.ts
│   │   └── conductor/conductor-crear.test.ts
│   ├── 02-operaciones/             # Operation tests (legacy, sequential)
│   │   ├── contratos/contrato-crear.test.ts
│   │   ├── contratos/contrato2cliente-crear.test.ts
│   │   ├── viajes/viajes-planificar.test.ts
│   │   ├── viajes/viajes-asignar.test.ts
│   │   └── Monitoreo/viajes-monitoreo.test.ts
│   ├── 03-finanzas/               # Reserved
│   └── ultimamilla/               # Última Milla tests
│       ├── pedido-crear.test.ts
│       ├── pedido-asignar.test.ts
│       └── pedido-asignar-batch.test.ts
├── suites/
│   ├── base-entities.setup.ts              # Master legacy entity setup
│   ├── 01-config-master.setup.ts           # Config master setup
│   ├── 02-carga-master.setup.ts            # Carga master setup
│   ├── prefactura-crear-e2e.test.ts        # Atomic E2E: Prefactura
│   ├── proforma-crear-e2e.test.ts          # Atomic E2E: Proforma
│   ├── finanzas-prefactura-proforma-e2e.test.ts # Atomic E2E: Finanzas Full
│   ├── viajes-asignar-e2e.test.ts          # Atomic E2E: Viajes Asignar
│   └── viajes-finalizar-e2e.test.ts        # Atomic E2E: Viajes Finalizar
└── helpers/
    └── auth.setup.ts              # Global authentication
```

### API Helpers

```
tests/api-helpers/
├── TmsApiClient.ts             # Unified API client for TMS operations
├── TransportistaHelper.ts      # Helper for creating transportistas
├── ClienteHelper.ts            # Helper for creating clientes
├── VehiculoHelper.ts           # Helper for creating vehiculos
├── ConductorHelper.ts          # Helper for creating conductores
├── DataPathHelper.ts           # Resolves worker-specific JSON data paths
├── OperationalDataLoader.ts    # Loads seeded data for atomic E2E tests
├── ClientResolver.ts           # Deterministic client selection for ultimamilla
└── NamingHelper.ts             # Helper for generating unique names
```

## CI/CD Workflows

### PR E2E Demo Pipeline (tests.yml) — Current Standard

A single pipeline (`tests.yml`) runs on pull requests, focused on Demo environment:

**Job 1: E2E Finanzas Full (Demo)**

- Timeout: 60 minutes
- Tests: `finanzas-prefactura-proforma-e2e.test.ts` (prefactura + proforma)
- Browser: Chromium only
- Credentials: `TMS_USER` / `TMS_PASS` mapped to `TMS_USERNAME` / `TMS_PASSWORD`
- Preflight: `npm run ci:validate:workflow-scripts`
- Concurrency: Grouped by workflow + ref to prevent collisions

**Job 2: Ultima Milla Batch (Demo)**

- Timeout: 120 minutes
- Tests: `pedido-asignar-batch.test.ts` (multi-browser: chromium + firefox)
- Workers: 1 (sequential)
- Allure report generated + uploaded as artifact (14-day retention)
- Allure attachments >20MB pruned automatically
- Environment: `ULTIMAMILLA_ENABLE_MUTATION=true`, `ULTIMAMILLA_BATCH_SIZE=8`
- Seed: `npm run demo:seed:legacy` runs before batch test

> **Note:** `viajes-asignar.test.ts` and `viajes-monitoreo.test.ts` are **Legacy** tests that read from `last-run-data-{browser}.json`. They are NOT atomic.

### Previous Workflows (Removed)

- `playwright.yml` — Legacy single test runner (removed)
- `tests.yml` hybrid atomic+legacy QA jobs (consolidated to Demo-only PR pipeline)

## Playwright Configuration

**Key settings:**

| Setting | Local | CI |
|---------|-------|----|
| Workers | 3 | 1 |
| Retries | 0 | 2 |
| Timeout | 60s | 180s |
| Expect Timeout | 10s | 20s |
| Action Timeout | 10s | 20s |
| Navigation Timeout | 20s | 45s |
| Viewport | 1920x1080 | 1920x1080 |
| Headless | .env value | true |

**Active Projects:**

- `setup` — Auth setup
- `auth-tests` — Auth test suite
- `base-entities-chromium` — Entity setup (Chrome)
- `base-entities-firefox` — Entity setup (Firefox)
- `chromium-qa` — Main tests QA (Chrome)
- `firefox-qa` — Main tests QA (Firefox)
- `chromium-demo` — Main tests Demo (Chrome)
- `firefox-demo` — Main tests Demo (Firefox)
- `config-smoke-chromium` — Config smoke (Chrome)
- `config-smoke-firefox` — Config smoke (Firefox)
- `config-fase1-chromium` — Config fase 1 (Chrome)
- `config-fase1-firefox` — Config fase 1 (Firefox)
- `config-fase2-chromium` — Config fase 2 (Chrome)
- `config-fase2-firefox` — Config fase 2 (Firefox)

**Removed:** WebKit was removed due to instability in legacy form interactions.

## Data Generation (See tms-data skill)

### Chilean RUT Generation

**Function:** `generateValidChileanRUT()` in `src/utils/rutGenerator.ts`

**Algorithm:** Generates valid Chilean RUT with modulo 11 verification digit

**Example output:** `12.345.678-5`

### Unique Timestamp Strategy

**Problem:** Duplicate names when running tests in parallel

**Solution:** 6-digit Unix timestamp modulo

```typescript
const unixSeconds = Math.floor(Date.now() / 1000) % 1000000; // Last 6 digits
return `${company} - ${unixSeconds}`;
// Example: "Delta Transportes - 400572"
```

### Available Factories

- **TransportistaFactory** - `src/modules/transport/factories/TransportistaFactory.ts`
- **ConductorFactory** - `src/modules/transport/factories/ConductorFactory.ts`
- **VehiculoFactory** - `src/modules/transport/factories/VehiculoFactory.ts`
- **ClienteFactory** - `src/modules/commercial/factories/ClienteFactory.ts`
- **ContratoFactory** - `src/modules/contracts/factories/ContratoFactory.ts`

## Parallel Execution Strategy

**Configuration:** 2 browsers (Chromium, Firefox) locally, 1 worker in CI

**Key Innovation:** Worker-specific JSON files prevent data collisions

**Example:**

```typescript
// In test file
const dataPath = DataPathHelper.getWorkerDataPath(testInfo);
const operationalData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

// Chromium worker uses: last-run-data-chromium.json
// Firefox worker uses: last-run-data-firefox.json
```

**Setup Projects:**

```typescript
// playwright.config.ts
projects: [
  {
    name: 'setup',
    testMatch: /auth\.setup\.ts/,  // Global auth
  },
  // Per-browser base-entities projects (run in parallel)
  {
    name: 'base-entities-chromium',
    testMatch: /base-entities\.setup\.ts/,
    use: devices['Desktop Chrome'],
    dependencies: ['setup'],
  },
  {
    name: 'base-entities-firefox',
    testMatch: /base-entities\.setup\.ts/,
    use: devices['Desktop Firefox'],
    dependencies: ['setup'],
  },
  // WebKit removed due to instability
]
```

## Git Workflow

### Commit Message Format

```
type(scope): Brief description

- Detailed change 1
- Detailed change 2
- Detailed change 3

Status: [tests passing/failing]
```

### Branch Strategy

- **Main branch:** `main`
- **Feature branches:** `feature/module-name`
- **Bugfix branches:** `bugfix/issue-description`

### Before Committing

```bash
# 1. Compile TypeScript
npx tsc --noEmit

# 2. Run tests
npm run test:full-flow

# 3. Check git status
git status

# 4. Commit
git add .
git commit -m "type(scope): description"
git push origin main
```

## Testing Strategy

### Test Pyramid

```
        /\
       /  \  E2E Tests (Full flows) - 10%
      /----\
     /      \  Integration Tests (Module tests) - 30%
    /--------\
   /          \  Component Tests (Page Objects) - 60%
  /____________\
```

### Coverage Goals

- **Critical flows:** 100% (entities -> contracts -> trips -> monitoring)
- **Secondary flows:** 80% (reports, configuration)
- **Edge cases:** 60% (error handling, validations)

## What NOT to Do

**Never:**

- Use CSS selectors directly in tests (use Page Objects)
- Create code without logging
- Mix UI logic with test logic
- Ignore errors silently
- Commit `.env` file to Git
- Use `any` type without good reason
- Leave console.log() in production code
- Skip reading skills before creating code
- Hardcode selectors not in Confluence
- Use `.fill()` on readonly inputs (date pickers)
- Assume dropdown state (always verify)

**Always:**

- Check AGENTS.md for relevant skills
- Read skill documentation before coding
- Follow Page Object Model
- Add structured logging
- Handle errors properly
- Take screenshots on failures
- Write descriptive commit messages
- Use TypeScript strict mode
- Document selectors in Confluence
- Wait for cascading dropdowns (1.5s minimum)
- Use worker-specific JSON for parallel tests

## Common Commands

```bash
# Development
npx tsc --noEmit               # Check TypeScript compilation
npm list --depth=0             # List dependencies
npm run test:atomic:asignar    # Debug atomic test

# Git
git pull origin main           # Sync before starting work
git add .
git commit -m "message"
git push origin main           # Push after work session

# Debugging
npm run show-report            # View HTML test report
npm run codegen                # Launch Playwright codegen
```

## Agent Assistance Prompts

### Creating a New Page Object

```text
Using the tms-page-objects skill (skills/tms-page-objects/SKILL.md), create [ModuleName]Page.ts.

Context:
- Module location: src/modules/[domain]/pages/
- Extends BasePage from src/core/BasePage.ts
- Uses Winston logger

Selectors (from Confluence):
- [field1]: '#selector-1'
- [field2]: 'button[data-id="selector-2"]'
- [dropdown]: '.bs-searchbox input[type="text"]'

Required methods:
- navigate() -> goes to /[route]
- fill[Field1]() -> fills the form field
- select[Dropdown]() -> selects dropdown option
- submit() -> clicks save button

Follow the same pattern as ContratosPage.ts.
```

### Creating a New Test File

```text
Using the tms-tests skill, create [module-action].test.ts.

Requirements:
- 4-phase structure (Setup, Navigation, Action, Verification)
- Loads data from last-run-data-{browser}.json via DataPathHelper
- Uses [PageName]Page for all interactions
- Winston logging at each phase
- Screenshots on error
- 60-second timeout

Data needed from JSON:
- transportistaName (from base-entities setup)
- clienteName (from base-entities setup)

Reference: contrato-crear.test.ts for the pattern.
```

### Creating a New Factory

```text
Using the tms-data skill, create [ModuleName]Factory.ts.

Requirements:
- Location: src/modules/[domain]/factories/
- Static method generate() returns a typed data object
- Uses generateValidChileanRUT() from src/utils/rutGenerator.ts
- Uses timestamp strategy for unique names: Math.floor(Date.now() / 1000) % 1000000
- All fields typed with an interface

Reference: TransportistaFactory.ts for the pattern.
```

### Working with Bootstrap Dropdowns

```text
Using the tms-dropdowns skill, implement the [dropdownName] dropdown.

Dropdown characteristics:
- Type: [Simple / Long with Scroll / With Search / Cascading / Date Picker]
- Approximate option count: [number]
- Has search box: [yes/no]
- Is cascading from: [parent dropdown name, if applicable]

Selector (from Confluence):
- Toggle button: 'button[data-id="[field-id]"]'
- Search input: '.bs-searchbox input[type="text"]' (if applicable)

If cascading, wait 1.5s after parent selection before interacting.
```

### Debugging Selector Issues

```text
A selector is not working in the [ModuleName] page.

Current selector: '[selector]'
Expected behavior: [what should happen]
Actual behavior: [what happens instead]
Error message: [paste error]

Check tms-selectors skill for priority rules.
The page URL is: https://moveontruckqa.bermanntms.cl/[route]

Suggest alternative selectors following the priority order:
1. id
2. data-id
3. name attribute
4. aria-*
5. CSS class (last resort)
```

### Adding a New Module to the Framework

```text
I need to add a new module for [ModuleName] to the automation framework.

The TMS page is at: /[route]
It has these form fields: [list fields with their HTML attributes]
It has these dropdowns: [list dropdowns with type]

Plan the full implementation:
1. Page Object (following tms-page-objects skill)
2. Factory (following tms-data skill)
3. Test file (following tms-tests skill)
4. Integration with base-entities.setup.ts (if needed)
5. npm script in package.json

Follow the same structure as the contracts module (src/modules/contracts/).
```

### Session Workflow: Start-to-Finish for New Module

```text
Prompt 1 (Architecture):
"I need to add a [Module] module. The TMS page is at /[route].
Plan the file structure following existing patterns."

Prompt 2 (Page Object):
"Using tms-page-objects skill, create [Module]Page.ts with these selectors: [list].
Follow ContratosPage.ts as template."

Prompt 3 (Factory):
"Using tms-data skill, create [Module]Factory.ts.
Use RUT generator and timestamp strategy for unique data."

Prompt 4 (Test):
"Using tms-tests skill, create [module]-crear.test.ts.
4-phase structure, loads from JSON, screenshots on error."

Prompt 5 (Integration):
"Add [Module] creation to base-entities.setup.ts Step [N].
Create [Module]Helper.ts in tests/api-helpers/.
Add npm script 'test:[module]' to package.json."

Prompt 6 (Verification):
"Run npx tsc --noEmit to check compilation.
Run the new test in headed mode for visual verification."
```

## Prompt Techniques That Improve Output

1. **Always reference the skill:** "Using the tms-dropdowns skill..." forces the agent to read authoritative patterns first.
2. **Provide Confluence selectors:** Don't let the AI guess selectors. Paste the exact IDs, data-ids, and class names from the Confluence database.
3. **Specify the template file:** "Follow the pattern in ContratosPage.ts" gives the agent a concrete example to match.
4. **Include the data shape:** When tests need JSON data, describe what fields are expected and where they come from.
5. **Set constraints:** "TypeScript strict mode, no `any`, Winston logging, .js extensions on imports" prevents common mistakes.
6. **Describe the dropdown type:** Bootstrap Select dropdowns have 5 distinct patterns. Telling the agent which type prevents trial-and-error.
7. **Reference the phase structure:** "4-phase test: Setup, Navigation, Action, Verification" ensures consistent test organization.

## Anti-Patterns: Prompts That Don't Work

| Bad Prompt | Why It Fails | Better Prompt |
|------------|--------------|---------------|
| "Create a page object for Contratos" | Too vague, no selectors, no skill reference | "Using tms-page-objects skill, create ContratosPage with these Confluence selectors: [list]" |
| "Fix this test" | No context about what fails or where | "The contrato-crear test fails at Phase 3 with timeout on selector '#save-btn'. Here's the error: [paste]" |
| "Make it faster" | No metrics or constraints | "The full-flow suite takes 130s, target is 90s. Profile which test step is slowest" |
| "Add a dropdown" | Doesn't specify type or behavior | "Using tms-dropdowns skill, add a cascading dropdown for Tipo -> Transportista with search" |
| "Write tests for everything" | Scope too broad | "Write a test for creating a Vehiculo entity, following the transportistas-crear.test.ts pattern" |

## Metrics

**Current metrics:**

- Total automated tests: **20+**
- Pass rate: **100%**
- Modules complete: **9/9** (auth, transport, commercial, contracts, planning, monitoring, finanzas, configAdmin, ultimamilla)
- Coverage: **Entities → Contracts → Trips → Monitoring → Prefactura → Proforma → Ultima Milla**
- Parallel execution: **2 browsers (Chromium, Firefox)**
- Skills operational: **7 TMS-specific + 9 SDD + 2 Generic**
- TypeScript compilation: **Clean (0 errors)**
- CI/CD: **PR E2E Demo pipeline + Ultimamilla batch + Allure GitHub Pages**

## Notes for AI Agents

### When generating code

1. **ALWAYS check AGENTS.md first** for relevant skills
2. **Read skill documentation** before writing code
3. Always follow Page Object Model pattern
4. Include Winston logging in every method
5. Use TypeScript strict types
6. Add error handling with screenshots
7. Follow existing naming conventions
8. Include JSDoc comments for public methods
9. Add unit tests when creating utilities
10. Update package.json if adding new scripts
11. Use worker-specific JSON with DataPathHelper

### When suggesting improvements

1. Maintain consistency with existing patterns
2. Think about scalability to 50+ tests
3. Keep code maintainable for team
4. Balance between coverage and execution time
5. Reference skills system when applicable
6. Consider parallel execution implications

### Critical Rules

- Never hardcode selectors (use Confluence)
- Never skip skill documentation
- Never use .fill() on readonly inputs
- Never assume dropdown state
- Never modify last-run-data-*.json directly in tests (use helper)
- Always wait for cascading dropdowns (2s)
- Always use Winston logging
- Always take screenshots on error
- Always follow phase structure in tests
- Always use DataPathHelper for worker-specific JSON

## Resources

**Documentation:**

- Playwright: <https://playwright.dev>
- TypeScript: <https://www.typescriptlang.org/docs>
- Winston: <https://github.com/winstonjs/winston>

**Internal:**

- TMS QA: <https://moveontruckqa.bermanntms.cl>
- Skills: [AGENTS.md](AGENTS.md) + [skills/](skills/)
- Architecture: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- CI/CD: [CLOUD.md](CLOUD.md) + [docs/CI_CD_SETUP.md](docs/CI_CD_SETUP.md)

---
**Last Updated:** May 15, 2026
**Status:** Production-ready with PR Demo pipeline + Allure reporting
**Framework Level:** Enterprise-grade with 20+ automated tests across 9 modules
**Compilation:** TypeScript clean (0 errors)
**Browsers:** Chromium + Firefox (WebKit removed)
**Extras:** Mobile automation (WDIO), Engram SDD persistence, AI Skills System
