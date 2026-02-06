# CLAUDE.md

# Bermann TMS QA Automation Framework

## 🎯 Quick Start for AI Assistants

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

**Always check AGENTS.md before creating Page Objects, tests, or working with dropdowns.**

---

## 📊 Project Status Dashboard (Updated: 2026-02-06)

| Categoría | Estado / Valor | Última Actualización |
|-----------|----------------|----------------------|
| Branch Activo | main | 2026-02-06 |
| Tests Automatizados | 13 | 2026-02-06 |
| Módulos Completos | 5 (auth, transport, commercial, contracts, planning) | 2026-02-06 |
| Tasa de Éxito | 100% | 2026-02-06 |
| Skills Operacionales | 5/5 | 2026-02-06 |
| Archivos Core | 8/8 OK | 2026-02-06 |
| Cobertura E2E | Entities → Contracts → Trips (completo) | 2026-02-06 |
| Compilación TypeScript | ✅ Sin errores | 2026-02-06 |

---

## Project Overview

**Project:** QA Automation Framework for Bermann Transport Management System (TMS)
**Client:** Bermann (https://www.bermann.cl/soluciones)
**Critical Product:** TMS - largest customer base
**QA Environment:** https://moveontruckqa.bermanntms.cl/login
**Goal:** Deliver project in March 2025 for salary increase request
**Timeline:** 8 weeks (Jan 27 - Mar 21, 2025)

## Tech Stack

- **Test Framework:** Playwright ^1.58.0
- **Language:** TypeScript ^5.9.3 (Strict mode)
- **Architecture:** Page Object Model (POM)
- **Logging:** Winston (professional structured logging)
- **Skills System:** Prowler-inspired pattern for AI guidance
- **CI/CD:** GitHub Actions
- **IDE:** Cursor with Claude integration

## Project Structure

```
qa-automation-framework/
├── AGENTS.md                   # Skills system index
├── CLAUDE.md                   # This file (Claude context)
├── .cursorrules                # Cursor IDE optimization
├── .github/workflows/          # CI/CD pipelines
├── skills/                     # AI agent skills (anti-hallucination)
│   ├── tms-selectors/
│   ├── tms-dropdowns/
│   ├── tms-page-objects/
│   ├── tms-tests/
│   └── tms-data/
├── src/
│   ├── modules/                # Modular Architecture (Domain-Driven)
│   │   ├── auth/              # Login, Dashboard, Auth actions
│   │   ├── transport/          # Transportista, Conductor, Vehiculo + Factories
│   │   ├── commercial/         # Cliente + Factory
│   │   ├── contracts/          # Contratos + Factory
│   │   └── planning/           # Planificar/Asignar Viajes
│   ├── core/                   # BasePage, BrowserManager
│   ├── fixtures/               # Playwright Fixtures (Dependency Injection)
│   ├── utils/                  # Logger, RUT generator, utilities
│   └── config/                 # Environment, credentials
├── tests/
│   ├── e2e/
│   │   ├── modules/
│   │   │   ├── 01-entidades/  # Entity creation tests (Transportista, Cliente, Vehiculo, Conductor)
│   │   │   └── 02-operaciones/ # Operation tests (Contratos, Viajes)
│   │   └── suites/
│   │       └── base-entities.setup.ts  # Master entity setup (Steps 1-4)
│   ├── api-helpers/            # API helpers for entity creation (TransportistaHelper, etc.)
│   └── helpers/
│       └── auth.setup.ts       # Global authentication setup
├── playwright/.auth/           # Authentication state
│   └── user.json              # Stored session
├── last-run-data-chromium.json  # Worker-specific data (Chromium)
├── last-run-data-firefox.json   # Worker-specific data (Firefox)
├── last-run-data-webkit.json    # Worker-specific data (WebKit)
├── reports/                    # Screenshots, videos
├── logs/                       # Execution logs
├── docs/                       # Documentation
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
AI: Reads AGENTS.md → Sees auto-invoke: tms-page-objects
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
     ↓
playwright/.auth/user.json
     ↓
base-entities.setup.ts (3 browsers in parallel)
     ↓
last-run-data-chromium.json
last-run-data-firefox.json
last-run-data-webkit.json
     ↓
contrato-crear.test.ts → contrato2cliente-crear.test.ts
     ↓
viajes-planificar.test.ts → viajes-asignar.test.ts
```

**Configuration:** See [playwright.config.ts:22-39](playwright.config.ts#L22-L39) for per-browser base-entities projects.

**Helper:** `tests/api-helpers/DataPathHelper.ts` provides `getWorkerDataPath(testInfo)` to resolve the correct JSON file for each worker.

## Naming Conventions

### Files

- Page Objects: `ModuleNamePage.ts` (e.g., `LoginPage.ts`, `ContratosFormPage.ts`)
- Tests: `module-action.test.ts` (e.g., `login.test.ts`, `contratos-crear.test.ts`)
- Skills: `tms-[topic]/SKILL.md` (e.g., `tms-dropdowns/SKILL.md`)
- Utilities: `descriptive-name.ts` (e.g., `logger.ts`, `rutGenerator.ts`)

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
import { BasePage } from "../core/BasePage.js"; // ✅ Correct
import { BasePage } from "../core/BasePage"; // ❌ Wrong
```

### Error Handling

```typescript
try {
  await somethingThatMightFail();
  logger.info("✅ Success");
} catch (error) {
  logger.error("❌ Failed", error);
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
// ✅ Good - from Confluence, priority order followed
nroContrato: '#contrato-nro_contrato',              // ID (priority 1)
transportista: 'button[data-id="contrato-transportista_id"]',  // data-id (priority 2)
searchBox: '.bs-searchbox input[type="text"]',      // Specific class (priority 5)

// ❌ Avoid - not documented, fragile
button: '.btn.btn-primary.submit-action',  // Too specific
input: 'div > div > input',                // Too generic
```

## Bootstrap Dropdowns (See tms-dropdowns skill)

**5 Proven Patterns:**

1. **Simple Dropdown** (< 20 options, no search)
2. **Long Dropdown with Scroll** (20-500 options, requires scrolling)
3. **Dropdown with Search** (has `.bs-searchbox`)
4. **Cascading Dropdown** (parent → child relationship)
5. **Date Picker** (readonly inputs with datetimepicker)

**Example (Cascading):**

```typescript
// Tipo → Transportista (cascading)
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
    logger.info('🚀 Starting Test');
    logger.info('='.repeat(80));

    // PHASE 1: Load/Setup
    logger.info('📂 PHASE 1: Loading data...');
    // ... setup steps
    logger.info('✅ Setup complete');

    // PHASE 2: Navigation
    logger.info('🧭 PHASE 2: Navigating...');
    // ... navigation steps
    logger.info('✅ Navigation complete');

    // PHASE 3: Main Action
    logger.info('📝 PHASE 3: Executing action...');
    // ... action steps
    logger.info('✅ Action complete');

    // PHASE 4: Verification
    logger.info('🔍 PHASE 4: Verifying...');
    // ... verification steps
    logger.info('✅ Verification complete');

    // Summary
    const executionTime = ((Date.now() - startTime) / 1000).toFixed(2);
    logger.info('='.repeat(80));
    logger.info(`⏱️  Execution Time: ${executionTime}s`);
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

# Test Users
TEST_ADMIN_USER=your_user
TEST_ADMIN_PASS=your_password
TEST_REGULAR_USER=your_user
TEST_REGULAR_PASS=your_password
```

## Available NPM Scripts

```bash
# === BASE SUITE ===
npm run test:base              # Run base entities setup (Steps 1-4: Transportista → Cliente → Vehiculo → Conductor)
npm run test:base:headed       # Run base setup with visible browser

# === ENTITY TESTS (01-entidades) ===
npm run test:transportista     # Create transportista entity
npm run test:cliente           # Create cliente entity
npm run test:vehiculo          # Create vehiculo entity
npm run test:conductor         # Create conductor entity

# === OPERATION TESTS (02-operaciones) ===
npm run test:contrato          # Create contract (Costo type)
npm run test:contrato:debug    # Create contract with visible browser for debugging
npm run test:contrato2cliente  # Create contract (Ingreso type, assigned to client)
npm run test:viajes:planificar # Plan trip
npm run test:viajes:asignar    # Assign trip

# === FULL FLOWS ===
npm run test:e2e:suites:full-flow  # Run complete E2E flow (base-entities → contratos → viajes)
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

### ✅ Completed Modules (5/5)

1. **auth** - `src/modules/auth/`
   - LoginPage
   - DashboardPage
   - AuthActions
   - Tests: auth/ directory

2. **transport** - `src/modules/transport/`
   - TransportistaPage
   - ConductorPage
   - VehiculoPage
   - TransportistaFactory
   - ConductorFactory
   - VehiculoFactory
   - Tests: 01-entidades/transport/, conductor/, vehiculos/

3. **commercial** - `src/modules/commercial/`
   - ClientePage
   - ClienteFactory
   - Tests: 01-entidades/clientes/

4. **contracts** - `src/modules/contracts/`
   - ContratosFormPage (ContratosPage)
   - ContratoFactory
   - Tests: 02-operaciones/contratos/

5. **planning** - `src/modules/planning/`
   - PlanificarPage
   - AsignarPage
   - Tests: 02-operaciones/viajes/

### Test Organization

```
tests/e2e/
├── modules/
│   ├── 01-entidades/           # Entity creation tests (4 tests)
│   │   ├── transport/transportistas-crear.test.ts
│   │   ├── clientes/cliente-crear.test.ts
│   │   ├── vehiculos/vehiculo-crear.test.ts
│   │   └── conductor/conductor-crear.test.ts
│   └── 02-operaciones/         # Operation tests (5 tests)
│       ├── contratos/contrato-crear.test.ts
│       ├── contratos/contrato2cliente-crear.test.ts
│       ├── contratos/allflow-to-contract.test.ts
│       ├── viajes/viajes-planificar.test.ts
│       └── viajes/viajes-asignar.test.ts
├── suites/
│   └── base-entities.setup.ts  # Master suite (creates all base entities)
└── helpers/
    └── auth.setup.ts            # Global authentication
```

### API Helpers

```
tests/api-helpers/
├── TransportistaHelper.ts      # Helper for creating transportistas programmatically
├── ClienteHelper.ts            # Helper for creating clientes
├── VehiculoHelper.ts           # Helper for creating vehiculos
├── ConductorHelper.ts          # Helper for creating conductores
└── DataPathHelper.ts           # Resolves worker-specific JSON data paths
```

## Git Workflow

### Commit Message Format

```
Brief description

- Detailed change 1
- Detailed change 2
- Detailed change 3

Status: [tests passing/failing]
Progress: X% toward goal
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
npm run test:e2e:suites:full-flow

# 3. Check git status
git status

# 4. Commit
git add .
git commit -m "Descriptive message"
git push origin main
```

## Testing Strategy

### Test Pyramid

```
        /\
       /  \  E2E Tests (Full flows) - 10%
      /────\
     /      \  Integration Tests (Module tests) - 30%
    /────────\
   /          \  Component Tests (Page Objects) - 60%
  /____________\
```

### Coverage Goals

- **Critical flows:** 100% (entities → contracts → trips)
- **Secondary flows:** 80% (reports, configuration)
- **Edge cases:** 60% (error handling, validations)

## Parallel Execution Strategy

**Configuration:** 3 workers (one per browser: Chromium, Firefox, WebKit)

**Key Innovation:** Worker-specific JSON files prevent data collisions

**Example:**

```typescript
// In test file
const dataPath = DataPathHelper.getWorkerDataPath(testInfo);
const operationalData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

// Chromium worker uses: last-run-data-chromium.json
// Firefox worker uses: last-run-data-firefox.json
// WebKit worker uses: last-run-data-webkit.json
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
  {
    name: 'base-entities-webkit',
    testMatch: /base-entities\.setup\.ts/,
    use: devices['Desktop Safari'],
    dependencies: ['setup'],
  },
]
```

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

## What NOT to Do

❌ **Never:**

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

✅ **Always:**

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
npm run test:contrato:debug    # Debug specific test

# Git
git pull origin main           # Sync before starting work
git add .
git commit -m "message"
git push origin main           # Push after work session

# Debugging
npm run show-report            # View HTML test report
npm run codegen                # Launch Playwright codegen
cat logs/app.log              # View logs
```

## Metrics for Presentation

**Track these metrics:**

- ✅ Total automated tests: **13**
- ✅ Pass rate: **100%**
- ✅ Modules complete: **5/5**
- ✅ Coverage: **Entities → Contracts → Trips (complete)**
- ✅ Parallel execution: **3 workers**
- ✅ Skills operational: **5/5**
- ✅ TypeScript compilation: **✅ No errors**

## Success Criteria

✅ **Technical:**

- 13+ automated tests
- 100% pass rate maintained
- Parallel execution (3 workers)
- Worker-specific data isolation
- CI/CD unblocked
- Skills system operational

✅ **Business:**

- Save 10+ hours/week in manual testing
- Detect bugs before production
- Reduce regression issues by 80%
- Professional framework ready to scale

✅ **Presentation:**

- Live demo of parallel execution
- Metrics dashboard showing value
- ROI calculation with time saved
- Roadmap for scaling to all products
- Skills system demonstration

## Resources

**Documentation:**

- Playwright: https://playwright.dev
- TypeScript: https://www.typescriptlang.org/docs
- Winston: https://github.com/winstonjs/winston

**Internal:**

- TMS QA: https://moveontruckqa.bermanntms.cl
- Skills: [AGENTS.md](AGENTS.md) + [skills/](skills/)
- Architecture: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)

## Notes for Claude

### When generating code:

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

### When suggesting improvements:

1. Maintain consistency with existing patterns
2. Think about scalability to 50+ tests
3. Keep code maintainable for team
4. Balance between coverage and execution time
5. Reference skills system when applicable
6. Consider parallel execution implications

### Critical Rules:

- ❌ Never hardcode selectors (use Confluence)
- ❌ Never skip skill documentation
- ❌ Never use .fill() on readonly inputs
- ❌ Never assume dropdown state
- ❌ Never modify last-run-data-*.json directly in tests (use helper)
- ✅ Always wait for cascading dropdowns (1.5s)
- ✅ Always use Winston logging
- ✅ Always take screenshots on error
- ✅ Always follow phase structure in tests
- ✅ Always use DataPathHelper for worker-specific JSON

---

**Last Updated:** February 6, 2026
**Status:** Production-ready with parallel execution
**Framework Level:** Enterprise-grade with 13 automated tests
**Compilation:** ✅ TypeScript clean (0 errors)
