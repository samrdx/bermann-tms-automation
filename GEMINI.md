# Gemini Context - Bermann TMS QA Automation

## 🎯 Quick Start for Gemini

**IMPORTANT:** This project uses a skills system. Always check [AGENTS.md](AGENTS.md) first.

- **For skill index:** [AGENTS.md](AGENTS.md)
- **For skills documentation:** [skills/](skills/)
- **For project overview:** Continue reading

---

## 📊 Project Status Dashboard (Updated: 2026-02-09)

| Categoría | Estado / Valor | Última Actualización |
|-----------|----------------|----------------------|
| Branch Activo | main | 2026-02-09 |
| Tests Automatizados | 12 | 2026-02-09 |
| Módulos Completos | 5 (auth, transport, commercial, contracts, planning) | 2026-02-09 |
| Tasa de Éxito | 100% | 2026-02-09 |
| Skills Operacionales | 5 TMS-specific | 2026-02-09 |
| Archivos Core | 8/8 OK | 2026-02-09 |
| Cobertura E2E | Entities → Contracts → Trips (completo) | 2026-02-09 |
| Compilación TypeScript | ✅ Sin errores | 2026-02-09 |

---

## Gemini-Specific Notes

### How You're Used in This Project

1. **Code Generation** (Primary use)
   - Generate Page Objects following tms-page-objects skill
   - Create test files following tms-tests skill patterns
   - Implement utility functions with TypeScript strict mode
   - Refactor existing code for consistency

2. **Design Guidance** (Secondary use)
   - Architecture review and suggestions
   - Best practices consultation
   - Pattern identification and recommendations

3. **Integration Strategy**
   - Work alongside Claude for strategic planning
   - Provide implementation details
   - Follow established patterns from skills system

### Skills to Follow

When generating code for this project:

1. **ALWAYS check AGENTS.md** for auto-invoke rules
2. **Read relevant skills** before generating:
   - tms-selectors: Selector priority
   - tms-dropdowns: Bootstrap patterns
   - tms-page-objects: POM structure
   - tms-tests: Test phases
   - tms-data: Data generation

3. **Follow existing patterns:**
   - Page Object Model
   - Winston logging
   - TypeScript strict mode
   - Error handling with screenshots

### Example Prompts for Code Generation

```
Using @tms-page-objects skill, create [ModuleName]Page.ts with:
- Selectors: [list from Confluence]
- Methods: [list of actions]
- Follow ContratosFormPage.ts pattern
```

```
Using @tms-tests skill, create test file for [Module]:
- 4-phase structure
- Load JSON data
- Winston logging
- Error screenshots
```

### Output Format

When generating code, always:

- Use TypeScript with strict types
- Include Winston logging
- Add error handling with screenshots
- Follow skill templates exactly
- Reference Confluence for selectors

### Integration with Other AIs

```
Claude Pro (claude.ai) → Strategic planning, architecture
    ↓
Gemini (you) → Code generation, pattern guidance
    ↓
Cursor AI → Inline completion, refactoring
    ↓
Skills System → All follow same patterns
```

### Critical Rules (Same as Claude)

❌ **Never:**

- Hardcode selectors not in Confluence
- Skip reading skills before coding
- Use .fill() on readonly inputs
- Assume dropdown state

✅ **Always:**

- Check AGENTS.md first
- Read skill documentation
- Follow Page Object Model
- Use Winston logging
- Take screenshots on error
- Wait for cascading dropdowns (1.5s)

---

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

---

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
- Explicit timeouts (60000ms default)
- Error handling with try/catch
- Cleanup in finally block
- **Follow tms-tests skill for 4-phase structure**

---

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

---

## Bootstrap Dropdowns (See tms-dropdowns skill)

**5 Proven Patterns:**

1. **Simple Dropdown** (< 20 options, no search)
2. **Long Dropdown with Scroll** (20-500 options, requires scrolling)
3. **Dropdown with Search** (has `.bs-searchbox`)
4. **Cascading Dropdown** (parent → child relationship)
5. **Date Picker** (readonly inputs with datetimepicker)

**Example (Cascading - CRITICAL for Contratos):**

```typescript
// Tipo → Transportista (cascading)
await this.selectTipo("Costo");
await this.page.waitForTimeout(1500); // CRITICAL: wait for cascade
await this.selectTransportista("Transportadora S.A.I");
```

**See skills/tms-dropdowns/SKILL.md for complete patterns.**

---

## Test Structure (See tms-tests skill)

### Standard 4-Phase Test Pattern

```typescript
test.describe('Module Name', () => {
  test.setTimeout(60000);

  test('Test Description', async ({ page }, testInfo) => {
    const startTime = Date.now();
    logger.info('🚀 Starting Test');
    logger.info('='.repeat(80));

    // PHASE 1: Load/Setup
    logger.info('📂 PHASE 1: Loading data...');
    // Load JSON, create Page Objects, prepare test data
    logger.info('✅ Setup complete');

    // PHASE 2: Navigation
    logger.info('🧭 PHASE 2: Navigating...');
    // Navigate to target page, wait for page load
    logger.info('✅ Navigation complete');

    // PHASE 3: Main Action
    logger.info('📝 PHASE 3: Executing action...');
    // Fill forms, select dropdowns, submit
    logger.info('✅ Action complete');

    // PHASE 4: Verification
    logger.info('🔍 PHASE 4: Verifying...');
    // Assert results, capture data, save to JSON
    logger.info('✅ Verification complete');

    // Summary
    const executionTime = ((Date.now() - startTime) / 1000).toFixed(2);
    logger.info('='.repeat(80));
    logger.info(`⏱️  Execution Time: ${executionTime}s`);
    logger.info('='.repeat(80));
  });
});
```

---

## Available NPM Scripts

```bash
# === BASE SUITE ===
npm run test:base              # Run base entities setup (Steps 1-4)
npm run test:base:headed       # Run base setup with visible browser

# === ENTITY TESTS (01-entidades) ===
npm run test:transportista     # Create transportista entity
npm run test:cliente           # Create cliente entity
npm run test:vehiculo          # Create vehiculo entity
npm run test:conductor         # Create conductor entity

# === OPERATION TESTS (02-operaciones) ===
npm run test:contrato          # Create contract (Costo type)
npm run test:contrato:debug    # Create contract with visible browser
npm run test:contrato2cliente  # Create contract (Ingreso type)
npm run test:viajes:planificar # Plan trip
npm run test:viajes:asignar    # Assign trip

# === FULL FLOWS ===
npm run test:e2e:suites:full-flow  # Run complete E2E flow
npm run test:all               # Run all tests in modules/

# === PLAYWRIGHT CORE ===
npm run test                   # Run all Playwright tests
npm run test:ui                # Run with Playwright UI mode
npm run test:headed            # Run with visible browser
npm run test:debug             # Run with Playwright debugger

# === UTILITIES ===
npm run show-report            # Open HTML test report
npm run codegen                # Launch Playwright codegen
npm run build                  # Compile TypeScript
npm run clean                  # Clean reports and logs
```

---

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

---

## Parallel Execution Strategy

**Configuration:** 3 workers (one per browser: Chromium, Firefox, WebKit)

**Key Innovation:** Worker-specific JSON files prevent data collisions

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

**Helper:** `tests/api-helpers/DataPathHelper.ts` provides `getWorkerDataPath(testInfo)` to resolve the correct JSON file for each worker.

**Example:**

```typescript
// In test file
const dataPath = DataPathHelper.getWorkerDataPath(testInfo);
const operationalData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

// Chromium worker uses: last-run-data-chromium.json
// Firefox worker uses: last-run-data-firefox.json
// WebKit worker uses: last-run-data-webkit.json
```

---

## Modules Implemented

### ✅ Completed Modules (5/5)

1. **auth** - `src/modules/auth/`
   - LoginPage, DashboardPage, AuthActions
   - Tests: auth/ directory (4 tests)

2. **transport** - `src/modules/transport/`
   - TransportistaPage, ConductorPage, VehiculoPage
   - Factories: TransportistaFactory, ConductorFactory, VehiculoFactory
   - Tests: 01-entidades/ (3 tests)

3. **commercial** - `src/modules/commercial/`
   - ClientePage, ClienteFactory
   - Tests: 01-entidades/clientes/ (1 test)

4. **contracts** - `src/modules/contracts/`
   - ContratosFormPage (ContratosPage), ContratoFactory
   - Tests: 02-operaciones/contratos/ (2 tests)

5. **planning** - `src/modules/planning/`
   - PlanificarPage, AsignarPage
   - Tests: 02-operaciones/viajes/ (2 tests)

### Test Organization

```
tests/e2e/
├── auth/                      # 4 auth tests
├── modules/
│   ├── 01-entidades/         # 4 entity tests
│   └── 02-operaciones/       # 4 operation tests
├── suites/
│   └── base-entities.setup.ts  # Master setup
└── helpers/
    └── auth.setup.ts           # Global auth
```

---

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
- Add structured logging (Winston)
- Handle errors properly with screenshots
- Wait for cascading dropdowns (1.5s minimum)
- Use TypeScript strict mode
- Use worker-specific JSON for parallel tests
- Document selectors in Confluence

---

## Project Overview

**Project:** QA Automation Framework for Bermann Transport Management System (TMS)
**Client:** Bermann (https://www.bermann.cl/soluciones)
**Critical Product:** TMS - largest customer base
**QA Environment:** https://moveontruckqa.bermanntms.cl/login

## Tech Stack

- **Test Framework:** Playwright ^1.58.0
- **Language:** TypeScript ^5.9.3 (Strict mode)
- **Architecture:** Page Object Model (POM)
- **Logging:** Winston (professional structured logging)
- **Skills System:** Prowler-inspired pattern for AI guidance
- **CI/CD:** GitHub Actions
- **IDE:** Cursor with Claude integration
- **AI Assistance:** Gemini 2.0 Flash for code generation

## Project Metrics

**Metrics:**
- Tests: 12 (4 auth + 4 entities + 4 operations) - 100% passing
- Skills: 5 TMS-specific (tms-selectors, tms-dropdowns, tms-page-objects, tms-tests, tms-data)
- Primary use: Code generation and pattern guidance
- Modules: 5/5 complete (auth, transport, commercial, contracts, planning)

## Project Structure

```
qa-automation-framework/
├── AGENTS.md           # Skills system index
├── CLAUDE.md           # Claude context
├── GEMINI.md           # This file
├── .cursorrules        # Cursor IDE optimization
├── .github/workflows/  # CI/CD pipelines
├── skills/             # AI agent skills (anti-hallucination)
│   ├── tms-selectors/
│   ├── tms-dropdowns/
│   ├── tms-page-objects/
│   ├── tms-tests/
│   └── tms-data/
├── src/
│   ├── modules/        # Modular Architecture (Domain-Driven)
│   │   ├── auth/       # Login, Dashboard, Auth actions
│   │   ├── transport/  # Transportista, Conductor, Vehiculo + Factories
│   │   ├── commercial/ # Cliente + Factory
│   │   ├── contracts/  # Contratos + Factory
│   │   └── planning/   # Planificar/Asignar Viajes
│   ├── core/           # BasePage, BrowserManager
│   ├── fixtures/       # Playwright Fixtures
│   ├── utils/          # Logger, RUT generator, utilities
│   └── config/         # Environment, credentials
├── tests/
│   ├── e2e/
│   │   ├── auth/       # 4 auth tests
│   │   ├── modules/
│   │   │   ├── 01-entidades/  # Entity creation tests
│   │   │   └── 02-operaciones/ # Operation tests
│   │   └── suites/
│   │       └── base-entities.setup.ts
│   ├── api-helpers/    # API helpers for entity creation
│   └── helpers/
│       └── auth.setup.ts
├── playwright/.auth/   # Authentication state
│   └── user.json      # Stored session
├── last-run-data-chromium.json  # Worker-specific data
├── last-run-data-firefox.json   # Worker-specific data
├── last-run-data-webkit.json    # Worker-specific data
├── reports/            # Screenshots, videos
├── logs/               # Execution logs
└── docs/               # Documentation & AI Context
```

---

## Resources

- **Skills:** [AGENTS.md](AGENTS.md)
- **Confluence:** TMS Selector Database
- **GitHub:** https://github.com/samrdx/bermann-tms-automation
- **TMS QA:** https://moveontruckqa.bermanntms.cl

---

**Your Role:** Code generation and automation guidance
**Quality:** Follow skills for consistency
**Integration:** Work alongside Claude for strategic planning

**Last Updated:** February 9, 2026
