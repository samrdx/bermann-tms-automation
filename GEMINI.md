# GEMINI.md

# Bermann TMS QA Automation Framework

## Quick Start for AI Assistants

**IMPORTANT:** This project uses a skills system to prevent hallucinations and enforce consistent patterns.

- **For skill index and auto-invoke rules:** See [AGENTS.md](AGENTS.md)
- **For skill documentation:** See [skills/](skills/) directory
- **For project overview:** Continue reading this file

### Available Skills

- **tms-selectors** - Selector priority & Confluence integration
- **tms-dropdowns** - Bootstrap Select patterns (5 proven patterns)
- **tms-page-objects** - Page Object Model template
- **tms-tests** - Test structure and phases
- **tms-data** - Data generation strategies (RUT, timestamps, factories)
- **skill-creator** - Meta-skill for creating new skills

**Note:** 5 TMS-specific skills + 1 meta-skill provide comprehensive automation guidance.

**Always check AGENTS.md before creating Page Objects, tests, or working with dropdowns.**

---

## Project Status Dashboard (Updated: 2026-02-20)

| Category | Value | Last Updated |
|----------|-------|--------------|
| Active Branch | main | 2026-02-20 |
| Automated Tests | 13 (4 auth + 4 entities + 5 operations) | 2026-02-20 |
| Completed Modules | 6 (auth, transport, commercial, contracts, planning, monitoring) | 2026-02-20 |
| Pass Rate | 100% | 2026-02-20 |
| Operational Skills | 5 TMS-specific + 1 meta-skill | 2026-02-20 |
| E2E Coverage | Entities -> Contracts -> Trips -> Monitoring (complete) | 2026-02-20 |
| TypeScript Compilation | Clean (0 errors) | 2026-02-20 |
| Browsers | 2 (Chromium, Firefox) - WebKit removed for instability | 2026-02-20 |
| CI/CD | Hybrid workflow (atomic + legacy jobs) | 2026-02-20 |

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
- **IDE:** Cursor with Claude integration
- **Runtime:** Node.js 20, ES Modules

## Project Structure

```
qa-automation-framework/
├── AGENTS.md                   # Skills system index
├── CLAUDE.md                   # Project documentation (mirror of GEMINI.md)
├── GEMINI.md                   # This file (project documentation)
├── CLOUD.md                    # CI/CD architecture decisions
├── README.md                   # Main documentation
├── .cursorrules                # Cursor IDE optimization
├── .github/workflows/          # CI/CD pipelines
│   ├── playwright.yml          # Legacy single test runner
│   └── tests.yml               # Hybrid suite (atomic + legacy)
├── skills/                     # AI agent skills (anti-hallucination)
│   ├── skill-creator/          # Meta-skill for creating new skills
│   ├── tms-selectors/
│   ├── tms-dropdowns/
│   ├── tms-page-objects/
│   ├── tms-tests/
│   └── tms-data/
├── src/
│   ├── modules/                # Modular Architecture (Domain-Driven)
│   │   ├── auth/               # Login, Dashboard, Auth actions
│   │   ├── transport/          # Transportista, Conductor, Vehiculo + Factories
│   │   ├── commercial/         # Cliente + Factory
│   │   ├── contracts/          # Contratos + Factory
│   │   ├── planning/           # Planificar/Asignar Viajes
│   │   └── monitoring/         # Monitoreo (Finalizar Viajes)
│   ├── core/                   # BasePage, BrowserManager
│   ├── fixtures/               # Playwright Fixtures (Dependency Injection)
│   ├── utils/                  # Logger, RUT generator, utilities
│   └── config/                 # Environment, credentials
├── tests/
│   ├── e2e/
│   │   ├── auth/               # Authentication tests (login, logout, negative, full-flow)
│   │   ├── modules/
│   │   │   ├── 01-entidades/   # Entity creation tests
│   │   │   ├── 02-operaciones/ # Operation tests (Contratos, Viajes, Monitoreo)
│   │   │   └── 03-finanzas/    # Reserved for future finance module
│   │   └── suites/
│   │       └── base-entities.setup.ts  # Master entity setup (Steps 1-4)
│   ├── api-helpers/            # API helpers for entity creation
│   ├── helpers/
│   │   └── auth.setup.ts       # Global authentication setup
│   ├── experiments/            # Experimental test scripts
│   └── exploration/            # Page inspection scripts
├── scripts/                    # Utility shell scripts
├── playwright/.auth/           # Authentication state
│   └── user.json               # Stored session
├── last-run-data-chromium.json # Worker-specific data (Chromium)
├── last-run-data-firefox.json  # Worker-specific data (Firefox)
├── reports/                    # Screenshots, videos
├── logs/                       # Execution logs
├── docs/                       # Documentation
│   ├── ARCHITECTURE.md
│   ├── CI_CD_SETUP.md
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
viajes-planificar.test.ts -> viajes-asignar.test.ts -> viajes-finalizar.test.ts
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
- Examples: `viajes-asignar.test.ts`, `viajes-finalizar.test.ts`

**Legacy Tests (Dependent):**
- Depend on `base-entities.setup.ts` for entity creation
- Read data from `last-run-data-{browser}.json`
- Must run sequentially in a specific order
- Examples: `contrato-crear.test.ts`, `viajes-planificar.test.ts`

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

```bash
# === SMOKE / AUTH ===
npm run test:auth              # Run all auth tests
npm run test:auth:login        # Run login test only
npm run test:auth:logout       # Run logout test only

# === ATOMIC (Stable, Independent Tests) ===
npm run test:atomic:asignar    # Assign trip (atomic, self-contained)
npm run test:atomic:finalizar  # Finalize trip (atomic, self-contained)
npm run test:atomic:all        # Run all atomic tests
npm run test:atomic:all:headed # Run all atomic tests with visible browser

# === LEGACY (Dependent, Sequential Tests) ===
npm run test:legacy:setup           # Run base entities setup
npm run test:legacy:setup:headed    # Run base setup with visible browser
npm run test:legacy:entidades       # Run entity creation tests
npm run test:legacy:entidades:headed
npm run test:legacy:contratos       # Run contract tests
npm run test:legacy:contratos:headed
npm run test:legacy:planificar      # Run trip planning test
npm run test:legacy:planificar:headed

# === GRANULAR (Debugging Individual Tests) ===
npm run test:entity:transportista   # Create transportista entity
npm run test:entity:cliente         # Create cliente entity
npm run test:entity:vehiculo        # Create vehiculo entity
npm run test:entity:conductor       # Create conductor entity
npm run test:op:contrato            # Create contract (Costo type)
npm run test:op:contrato2cliente    # Create contract (Ingreso type)

# === FULL FLOWS ===
npm run test:full-flow         # Run complete E2E flow (setup -> contratos -> viajes -> monitoreo)
npm run test:all               # Run all tests in tests/e2e/modules/ directory

# === PLAYWRIGHT CORE ===
npm run test                   # Run all Playwright tests
npm run test:ui                # Run with Playwright UI mode
npm run test:headed            # Run with visible browser
npm run test:debug             # Run with Playwright debugger

# === UTILITIES ===
npm run show-report            # Open HTML test report
npm run codegen                # Launch Playwright codegen for TMS QA environment
npm run build                  # Compile TypeScript
npm run clean                  # Clean reports and logs
```

## Modules Implemented

### Completed Modules (6/6)

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
   - Tests: `02-operaciones/Monitoreo/viajes-finalizar.test.ts`

### Test Organization

```
tests/e2e/
├── auth/                           # Authentication tests (4 tests)
│   ├── login.test.ts
│   ├── logout.test.ts
│   ├── login-negative.test.ts
│   └── full-flow.test.ts
├── modules/
│   ├── 01-entidades/               # Entity creation tests (4 tests)
│   │   ├── transport/transportistas-crear.test.ts
│   │   ├── clientes/cliente-crear.test.ts
│   │   ├── vehiculos/vehiculo-crear.test.ts
│   │   └── conductor/conductor-crear.test.ts
│   ├── 02-operaciones/             # Operation tests (5 tests)
│   │   ├── contratos/contrato-crear.test.ts
│   │   ├── contratos/contrato2cliente-crear.test.ts
│   │   ├── viajes/viajes-planificar.test.ts
│   │   ├── viajes/viajes-asignar.test.ts
│   │   └── Monitoreo/viajes-finalizar.test.ts
│   └── 03-finanzas/               # Reserved for future finance module
├── suites/
│   └── base-entities.setup.ts     # Master suite (creates all base entities)
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
└── DataPathHelper.ts           # Resolves worker-specific JSON data paths
```

## CI/CD Workflows

### Hybrid Workflow (tests.yml) - Current Standard

Two parallel jobs that run on push to main/develop:

**Job 1: Atomic Suite** (Independent tests)

- Timeout: 20 minutes
- Tests: `viajes-asignar.test.ts`, `viajes-finalizar.test.ts`
- Browser: Chromium only
- Credentials: `TMS_USER` / `TMS_PASS` mapped to `TMS_USERNAME` / `TMS_PASSWORD`
- Artifact: `report-atomic` (7 days retention)

**Job 2: Legacy Suite** (Sequential dependent tests)

- Timeout: 30 minutes
- Stage 1: `base-entities-chromium` (entity setup)
- Stage 2: Contratos tests
- Stage 3: `viajes-planificar.test.ts`
- Workers: 1 (sequential execution)
- Credentials: `TMS_USER` / `TMS_PASS` mapped to all legacy variables
- Artifact: `report-legacy` (7 days retention)

### Legacy Workflow (playwright.yml)

- Single test runner for `viajes-asignar.test.ts`
- Uses Docker container: `mcr.microsoft.com/playwright:v1.58.0-jammy`
- 60-minute timeout
- Secrets: `BASE_URL`, `TMS_USER`, `TMS_PASS`
- Artifact: `playwright-report` (7 days retention)

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

- `setup` - Auth setup
- `auth-tests` - Auth test suite
- `base-entities-chromium` - Entity setup (Chrome)
- `base-entities-firefox` - Entity setup (Firefox)
- `chromium` - Main tests (Chrome)
- `firefox` - Main tests (Firefox)

**Removed:** WebKit was removed due to instability in legacy form interactions.

**Artifacts:** Trace, screenshot, and video are captured only on failure (`retain-on-failure`).

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

- Total automated tests: **13**
- Pass rate: **100%**
- Modules complete: **6/6**
- Coverage: **Entities -> Contracts -> Trips -> Monitoring (complete)**
- Parallel execution: **2 browsers (Chromium, Firefox)**
- Skills operational: **5 TMS-specific + 1 meta-skill**
- TypeScript compilation: **Clean (0 errors)**
- CI/CD: **Hybrid workflow (atomic + legacy)**

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

**Last Updated:** February 20, 2026
**Status:** Production-ready with hybrid CI/CD (atomic + legacy)
**Framework Level:** Enterprise-grade with 13 automated tests across 6 modules
**Compilation:** TypeScript clean (0 errors)
**Browsers:** Chromium + Firefox (WebKit removed)
