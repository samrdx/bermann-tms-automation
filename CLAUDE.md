#CLAUDE.md

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

**Always check AGENTS.md before creating Page Objects, tests, or working with dropdowns.**

---

## Project Overview

**Project:** QA Automation Framework for Bermann Transport Management System (TMS)
**Client:** Bermann (https://www.bermann.cl/soluciones)
**Critical Product:** TMS - largest customer base
**QA Environment:** https://moveontruckqa.bermanntms.cl/login
**Goal:** Deliver project in March 2025 for salary increase request
**Timeline:** 8 weeks (Jan 27 - Mar 21, 2025)

## Tech Stack

- **Test Framework:** Playwright ^1.48.0
- **Language:** TypeScript ^5.7.2 (Strict mode)
- **Architecture:** Page Object Model (POM)
- **Logging:** Winston (professional structured logging)
- **AI Integration:** Stagehand + Gemini 2.0 Flash
- **Skills System:** Prowler-inspired pattern for AI guidance
- **CI/CD:** GitHub Actions
- **IDE:** Cursor with Claude integration

## Project Structure

```
qa-automation-framework/
├── AGENTS.md           # Skills system index
├── CLAUDE.md           # This file (Claude context)
├── GEMINI.md           # Gemini context
├── .cursorrules        # Cursor IDE optimization
├── .github/workflows/  # CI/CD pipelines
├── skills/             # AI agent skills
├── src/
│   ├── modules/        # Modular Architecture (Domain-Driven)
│   │   ├── auth/       # Pages, Actions, Tests
│   │   ├── contracts/  # Pages, Actions, Flows, Factories
│   │   ├── planning/   # Planificar/Asignar
│   │   └── commercial/ # Clients
│   ├── core/           # BasePage, BrowserManager
│   ├── fixtures/       # Playwright Fixtures (Dependency Injection)
│   ├── utils/          # Logger and utilities
│   └── config/         # Environment, credentials
├── tests/              # Executable tests
├── reports/            # Screenshots, videos
└── docs/               # Documentation
```

## Skills System (Anti-Hallucination)

**Purpose:** Prevent AI from guessing patterns by providing authoritative documentation.

**How it works:**

1. AGENTS.md defines when to use each skill
2. Skills contain proven patterns and examples
3. AI reads skill BEFORE generating code
4. Result: 95% reduction in hallucinations

**Example workflow:**

```
User: "Create ContratosPage"
Claude: Reads AGENTS.md → Sees auto-invoke: tms-page-objects
Claude: Reads skills/tms-page-objects/SKILL.md
Claude: Generates code following exact template
Result: Correct code on first attempt
```

## Selector Priority (See tms-selectors skill)

**Order of preference:**

1. `id` - Most stable (#contrato-nro_contrato)
2. `data-id` - TMS convention ([data-id="field-id"])
3. `name` - Form fields ([name="Contrato[field]"])
4. `aria-*` - Accessibility ([aria-label="Search"])
5. CSS classes - Last resort (.btn.dropdown-toggle.btn-light)

**CRITICAL:** All selectors must be documented in Confluence database.

## Bootstrap Dropdowns (See tms-dropdowns skill)

**5 Proven Patterns:**

1. **Simple Dropdown** (< 20 options, no search)
2. **Long Dropdown with Scroll** (20-500 options, requires scrolling)
3. **Dropdown with Search** (has `.bs-searchbox`)
4. **Cascading Dropdown** (parent → child relationship)
5. **Date Picker** (readonly inputs with datetimepicker)

**Example (Cascading):**

```typescript
await this.selectTipo("Costo");
await this.page.waitForTimeout(1500); // CRITICAL: wait for cascade
await this.selectTransportista("Transportadora S.A.I");
```

## Environment Variables

**File:** `.env` (NEVER commit to Git)

```env
GEMINI_API_KEY=your_key_here
OPENAI_API_KEY=your_key_here
BASE_URL_DEV=https://moveontruckqa.bermanntms.cl
ENVIRONMENT=dev
HEADLESS=false
TIMEOUT=30000
LOG_LEVEL=info
```

## Available NPM Scripts

```bash
# Core Tests
npm run test:login
npm run test:logout
npm run test:full-flow
npm run test:login:negative

# Module Tests
npm run test:contratos:crear

# Stagehand AI
npm run test:stagehand:simple
npm run test:stagehand:ai-login

# Exploration
npm run test:explore
npm run test:explore:contratos

# All tests
npm run test:all
```

## Modules Implemented

### ✅ Completed

1. **Login/Logout** - `src/modules/auth` (LoginPage, DashboardPage)
2. **Contratos** - `src/modules/contracts` (ContratosPage, Factories, Flows)
3. **Planificar Viajes** - `src/modules/planning` (PlanificarPage)
4. **Asignar Viajes** - `src/modules/planning` (AsignarPage)

### 🎯 In Progress

5. **Reportes** - `src/modules/reports`
6. **Data-Driven Tests** - Using `src/fixtures`

## Current Status (Day 4)

- Tests: 8 automated (100% passing)
- Pass rate: 100%
- Coverage: ~45% of critical flows
- Skills created: 4 generic
- AI hallucination reduction: 95%

## Notes for Claude

### When generating code:

1. **ALWAYS check AGENTS.md first** for relevant skills
2. **Read skill documentation** before writing code
3. Follow Page Object Model pattern
4. Include Winston logging in every method
5. Use TypeScript strict types
6. Add error handling with screenshots
7. Follow existing naming conventions

### Critical Rules:

- ❌ Never hardcode selectors (use Confluence)
- ❌ Never skip skill documentation
- ❌ Never use .fill() on readonly inputs
- ❌ Never assume dropdown state
- ✅ Always wait for cascading dropdowns (1.5s)
- ✅ Always use Winston logging
- ✅ Always take screenshots on error

---

**Last Updated:** Day 4 - January 30, 2025  
**Status:** Production-ready with Skills System  
**Framework Level:** Enterprise-grade with anti-hallucination system

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

**Always check AGENTS.md before creating Page Objects, tests, or working with dropdowns.**

---

## Project Overview

**Project:** QA Automation Framework for Bermann Transport Management System (TMS)
**Client:** Bermann (https://www.bermann.cl/soluciones)
**Critical Product:** TMS - largest customer base
**QA Environment:** https://moveontruckqa.bermanntms.cl/login
**Goal:** Deliver project in March 2025 for salary increase request
**Timeline:** 8 weeks (Jan 27 - Mar 21, 2025)

## Tech Stack

- **Test Framework:** Playwright ^1.48.0
- **Language:** TypeScript ^5.7.2 (Strict mode)
- **Architecture:** Page Object Model (POM)
- **Logging:** Winston (professional structured logging)
- **AI Integration:** Stagehand + Gemini 2.0 Flash
- **Skills System:** Prowler-inspired pattern for AI guidance
- **CI/CD:** GitHub Actions
- **IDE:** Cursor with Claude integration

## Project Structure

```
qa-automation-framework/
├── AGENTS.md           # Skills system index
├── claude.md           # This file (project context)
├── .cursorrules        # Cursor IDE optimization
├── skills/             # AI agent skills (anti-hallucination)
│   ├── tms-selectors/
│   ├── tms-dropdowns/
│   ├── tms-page-objects/
│   └── tms-tests/
├── src/
│   ├── core/           # BasePage, BrowserManager, StagehandManager
│   ├── pages/          # Page Objects (LoginPage, DashboardPage, ContratosFormPage)
│   ├── flows/          # Business flows
│   ├── utils/          # Logger and utilities
│   └── config/         # Environment, credentials
├── tests/              # Executable tests
├── reports/            # Screenshots, videos
├── logs/               # Execution logs
├── data/               # Test data
├── .github/workflows/  # GitHub Actions CI/CD
└── .env                # Environment variables (not versioned)
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

## Naming Conventions

### Files

- Page Objects: `ModuleNamePage.ts` (e.g., `LoginPage.ts`, `ContratosFormPage.ts`)
- Tests: `module-action.test.ts` (e.g., `login.test.ts`, `contratos-crear.test.ts`)
- Skills: `tms-[topic]/SKILL.md` (e.g., `tms-dropdowns/SKILL.md`)
- Utilities: `descriptive-name.ts` (e.g., `logger.ts`)

### Code

- Classes: PascalCase (`LoginPage`, `BrowserManager`)
- Methods: camelCase (`fillUsername()`, `clickLoginButton()`)
- Variables: camelCase (`userName`, `isLoggedIn`)
- Constants: UPPER_SNAKE_CASE (`MAX_RETRIES`, `DEFAULT_TIMEOUT`)
- Selectors: camelCase in `selectors` object

### Tests

- Test files: `module-action.test.ts`
- Test functions: Descriptive names starting with `test`
- Example: `testCrearContrato()`

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
async function testSomething() {
  const browser = new BrowserManager({ headless: false });

  try {
    logger.info("=".repeat(60));
    logger.info("🚀 Starting Test Name");
    logger.info("=".repeat(60));

    await browser.initialize();
    const page = browser.getPage();

    // PHASE 1: Login
    logger.info("\n🔐 PHASE 1: Login");
    // ... login steps
    logger.info("✅ Login successful");

    // PHASE 2: Navigate
    logger.info("\n🧭 PHASE 2: Navigate");
    // ... navigation steps
    logger.info("✅ Navigation successful");

    // PHASE 3: Action
    logger.info("\n📝 PHASE 3: Main Action");
    // ... action steps
    logger.info("✅ Action successful");

    // PHASE 4: Verification
    logger.info("\n✅ PHASE 4: Verification");
    const result = await page.verify();
    if (!result) throw new Error("Verification failed");
    logger.info("✅ TEST PASSED");
  } catch (error) {
    logger.error("❌ Test failed", error);
    await browser.getPage().screenshot({ path: `error-${Date.now()}.png` });
    throw error;
  } finally {
    await browser.close();
  }
}
```

## Git Workflow

### Commit Message Format

```
Day X: Brief description

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
npm run test:all

# 3. Check git status
git status

# 4. Commit
git add .
git commit -m "Descriptive message"
git push origin main
```

## Environment Variables

**File:** `.env` (NEVER commit to Git)

```env
# Gemini API (for AI features)
GEMINI_API_KEY=your_key_here

# OpenAI API (for Stagehand alternative)
OPENAI_API_KEY=your_key_here

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
# Core Tests
npm run test:login              # Login test (headed)
npm run test:login:headless     # Login test (headless)
npm run test:logout             # Logout test
npm run test:full-flow          # Full flow (login → dashboard → logout)
npm run test:login:negative     # Negative test scenarios

# Module Tests
npm run test:contratos:crear    # Create contract test

# Stagehand AI
npm run test:stagehand:simple   # Simple AI test
npm run test:stagehand:ai-login # AI-powered login

# Exploration
npm run test:explore            # Explore login page
npm run test:explore:dashboard  # Explore dashboard
npm run test:explore:contratos  # Explore contratos page

# All tests
npm run test:all                # Run all tests sequentially

# Build & Clean
npm run build                   # Compile TypeScript
npm run clean                   # Clean reports and logs
```

## Playwright with Stagehand AI

### When to use Playwright (90% of tests)

- Stable selectors (IDs, data-ids)
- Known elements
- Login/logout flows
- Menu navigation
- Forms with clear IDs
- **Cost: $0**

### When to use Stagehand AI (10% of tests)

- Dynamic elements
- Elements without stable selectors
- Complex searches on page
- Modals/popups with changing content
- **Cost: ~$0.002-$0.006 per action**

### Stagehand Example

```typescript
const stagehand = new StagehandManager();
await stagehand.initialize();

// Natural language actions
await stagehand.act('Type "username" in the username field');
await stagehand.act("Click the login button");

// Extract information
const data = await stagehand.extract("Get user name from page", schema);

// Observe elements
const elements = await stagehand.observe("Find all buttons");
```

## MCP Plugins Configuration

### Active Plugins

1. **playwright** - Execute and generate Playwright tests
2. **typescript** - TypeScript compilation and type checking
3. **atlassian** - Jira integration for ticket management
4. **context7** - Deep project context understanding

### Using Plugins

**Playwright Plugin:**

```
"Using Playwright plugin, execute test: login.test.ts"
"Generate new test for module X based on LoginPage pattern"
```

**TypeScript Plugin:**

```
"Compile the project and show TypeScript errors"
"Refactor [file] to improve type safety"
```

**Atlassian Plugin:**

```
"Create Jira ticket: Automation for Reports module completed"
"List all open tickets assigned to me"
"Update ticket [ID] with test execution results"
```

**Context7 Plugin:**

```
"Analyze the project and suggest architecture improvements"
"Find all usages of [method] and list potential issues"
```

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

## Common Commands

```bash
# Development
npx tsc --noEmit               # Check TypeScript compilation
npm list --depth=0             # List dependencies
npm run test:[module]          # Run specific test

# Git
git pull origin main           # Sync before starting work
git add .
git commit -m "message"
git push origin main           # Push after work session

# Debugging
npm run test:explore           # Explore page elements
ls -R src/                     # View project structure
cat logs/app.log              # View logs
```

## Modules Implemented

### ✅ Completed Modules

1. **Login/Logout** (Foundation)
   - LoginPage
   - DashboardPage
   - Tests: login.test.ts, logout.test.ts, full-flow.test.ts, login-negative.test.ts

2. **Contratos** (Day 4)
   - ContratosFormPage
   - Complex dropdowns (tipo → transportista cascade)
   - 237-option dropdown with scroll
   - Date picker (readonly)
   - Tests: contratos-crear.test.ts
3. **Planificar Viajes** (Day 5)
   - PlanificarViajesPage
   - Manejo de rutas y modales
   - Selectores robustos para formularios complejos
   - Tests: viajes-planificar.test.ts

### 🎯 Planned Modules

4. **Asignar Viajes**
   - AsignarViajesPage
   - Tests: viajes-asignar.test.ts

## Testing Strategy

### Test Pyramid

```
        /\
       /  \  E2E Tests (Stagehand AI) - 10%
      /────\
     /      \  Integration Tests (Playwright) - 30%
    /────────\
   /          \  Unit Tests (Fast) - 60%
  /____________\
```

### Coverage Goals

- **Critical flows:** 100% (login, logout, core business)
- **Secondary flows:** 80% (reports, configuration)
- **Edge cases:** 60% (error handling, validations)

## Metrics for March Presentation

**Track these metrics:**

- ✅ Total automated tests
- ✅ Pass rate percentage
- ✅ Bugs detected before production
- ✅ Hours saved in manual testing
- ✅ Coverage of critical flows
- ✅ Average test execution time
- ✅ CI/CD success rate
- ✅ AI hallucination reduction

**Current Status (Day 4):**

- Tests: 9+ automated (100% passing)
- Pass rate: 100%
- Coverage: ~60% of critical flows
- Time saved: ~6 hours/week
- Skills created: 4 generic
- Modules completed: 3 (Login/Logout, Contratos, Planificar Viajes)
- AI hallucination reduction: 95%

## Project Milestones

**Week 1 (Days 1-5):** ✅ Foundation + Skills

- ✅ Setup & architecture
- ✅ Login/Logout automation
- ✅ Stagehand AI integration
- ✅ Skills system implementation
- ✅ Contratos module complete
- ✅ Planificar Viajes module complete

**Week 2 (Days 6-10):** 🎯 Current

- Complete Asignar Viajes
- 15+ total tests
- Professional reporting
- Test Runner

**Weeks 3-4:**

- Complete main modules
- Data-driven tests
- Performance optimization

**Weeks 5-8:**

- Scale to all products
- Dashboard monitoring
- Executive documentation
- Presentation preparation

## Cost Optimization

**Monthly costs:**

- Claude Pro: $20 (already paid - unlimited)
- Cursor Free: $0 (sufficient)
- Gemini API: $3-5 (~500-800 AI tests)
- **Total: ~$23-25/month**

**Cost per test:**

- Playwright: $0
- Stagehand AI: $0.002-$0.006
- **Hybrid approach: ~$0.001 average**

## Success Criteria

✅ **Technical:**

- 15+ automated tests by Week 2
- 100% pass rate maintained
- <5 min full suite execution
- CI/CD running on every commit
- Skills system operational

✅ **Business:**

- Save 10+ hours/week in manual testing
- Detect bugs before production
- Reduce regression issues by 80%
- Professional framework ready to scale

✅ **Presentation:**

- Live demo of AI-powered tests
- Metrics dashboard showing value
- ROI calculation with time saved
- Roadmap for scaling to all products
- Skills system demonstration

## Resources

**Documentation:**

- Playwright: https://playwright.dev
- Stagehand: https://docs.stagehand.dev
- TypeScript: https://www.typescriptlang.org/docs

**Internal:**

- GitHub Repo: https://github.com/samrdx/bermann-tms-automation
- TMS QA: https://moveontruckqa.bermanntms.cl
- Skills: [AGENTS.md](AGENTS.md) + [skills/](skills/)

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

### When suggesting improvements:

1. Consider cost optimization (prefer Playwright over AI)
2. Maintain consistency with existing patterns
3. Think about scalability to 50+ tests
4. Keep code maintainable for team
5. Balance between coverage and execution time
6. Reference skills system when applicable

### Critical Rules:

- ❌ Never hardcode selectors (use Confluence)
- ❌ Never skip skill documentation
- ❌ Never use .fill() on readonly inputs
- ❌ Never assume dropdown state
- ✅ Always wait for cascading dropdowns (1.5s)
- ✅ Always use Winston logging
- ✅ Always take screenshots on error
- ✅ Always follow phase structure in tests

---

**Last Updated:** Day 4 - January 30, 2025  
**Status:** Production-ready with Skills System + AI Integration  
**Next Goal:** Scale to 15+ tests using skills for 3x faster development  
**Framework Level:** Enterprise-grade with anti-hallucination system

## Project Overview

**Project:** QA Automation Framework for Bermann Transport Management System (TMS)
**Client:** Bermann (https://www.bermann.cl/soluciones)
**Critical Product:** TMS - largest customer base
**QA Environment:** https://moveontruckqa.bermanntms.cl/login
**Goal:** Deliver project in March 2025 for salary increase request
**Timeline:** 8 weeks (Jan 27 - Mar 21, 2025)

## Tech Stack

- **Test Framework:** Playwright ^1.48.0
- **Language:** TypeScript ^5.7.2 (Strict mode)
- **Architecture:** Page Object Model (POM)
- **Logging:** Winston (professional structured logging)
- **AI Integration:** Stagehand + Gemini 2.0 Flash
- **CI/CD:** GitHub Actions
- **IDE:** Cursor with Claude integration

## Project Structure

```
qa-automation-framework/
├── src/
│   ├── core/           # BasePage, BrowserManager, StagehandManager
│   ├── pages/          # Page Objects (LoginPage, DashboardPage, etc.)
│   ├── flows/          # Business flows
│   ├── utils/          # Logger and utilities
│   └── config/         # Environment, credentials
├── tests/              # Executable tests
├── reports/            # Screenshots, videos
├── logs/               # Execution logs
├── .github/workflows/  # GitHub Actions CI/CD
└── .env                # Environment variables (not versioned)
```

## Architecture Patterns

### 1. Page Object Model (POM)

**Rules:**

- One class = One page
- Encapsulate selectors (tests should NOT see CSS)
- Descriptive methods (clickLoginButton vs click('#btn'))
- Reusable code

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

### 2. BasePage Pattern

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

### 3. Logging Pattern

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

## Naming Conventions

### Files

- Page Objects: `PageNamePage.ts` (e.g., `LoginPage.ts`)
- Tests: `module-name.test.ts` (e.g., `login.test.ts`)
- Utilities: `descriptive-name.ts` (e.g., `logger.ts`)

### Code

- Classes: PascalCase (`LoginPage`, `BrowserManager`)
- Methods: camelCase (`fillUsername()`, `clickLoginButton()`)
- Variables: camelCase (`userName`, `isLoggedIn`)
- Constants: UPPER_SNAKE_CASE (`MAX_RETRIES`, `DEFAULT_TIMEOUT`)
- Selectors: camelCase in `selectors` object

### Tests

- Test files: `module.test.ts`
- Test functions: Descriptive names starting with `test`
- Example: `testLoginWithValidCredentials()`

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

## Selector Priority

**Order of preference:**

1. `id` - Most stable
2. `name` attribute
3. `data-testid` or `data-*` attributes
4. `aria-*` attributes
5. CSS classes (last resort)

**Example:**

```typescript
// ✅ Good - stable selectors
usernameInput: "#login-usuario"; // id
passwordInput: '[name="password"]'; // name
submitButton: '[data-testid="submit"]'; // data attribute

// ❌ Avoid - fragile selectors
button: ".btn.btn-primary.submit-action"; // too specific
input: "div > div > input"; // too generic
```

## Test Structure

### Standard Test Pattern

```typescript
async function testSomething() {
  const browser = new BrowserManager({ headless: false });

  try {
    logger.info('='.repeat(60));
    logger.info('🚀 Starting Test Name');
    logger.info('='.repeat(60));

    await browser.initialize();
    const page = new SomePage(browser.getPage());

    // Test steps with logging
    logger.info('📝 STEP 1: Description');
    await page.doSomething();
    logger.info('✅ Step 1 completed');

    // Assertions
    const result = await page.verify();
    if (result) {
      logger.info('✅ TEST PASSED');
    } else {
      throw new Error('Test failed');
    }

  } catch (error) {
    logger.error('❌ Test failed', error);
    await browser.getPage().screenshot({...});
    throw error;
  } finally {
    await browser.close();
  }
}
```

## Git Workflow

### Commit Message Format

```
Day X: Brief description

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
npm run test:all

# 3. Check git status
git status

# 4. Commit
git add .
git commit -m "Descriptive message"
git push origin main
```

## Environment Variables

**File:** `.env` (NEVER commit to Git)

```env
# Gemini API (for AI features)
GEMINI_API_KEY=your_key_here

# OpenAI API (for Stagehand alternative)
OPENAI_API_KEY=your_key_here

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
# Tests
npm run test:login              # Login test (headed)
npm run test:login:headless     # Login test (headless)
npm run test:logout             # Logout test
npm run test:full-flow          # Full flow (login → dashboard → logout)
npm run test:login:negative     # Negative test scenarios
npm run test:experiments        # Experimental tests

# Stagehand AI
npm run test:stagehand:simple   # Simple AI test
npm run test:stagehand:ai-login # AI-powered login

# Exploration
npm run test:explore            # Explore login page
npm run test:explore:dashboard  # Explore dashboard

# All tests
npm run test:all                # Run all tests sequentially

# Build & Clean
npm run build                   # Compile TypeScript
npm run clean                   # Clean reports and logs
```

## Playwright with Stagehand AI

### When to use Playwright (90% of tests)

- Stable selectors (IDs, names)
- Known elements
- Login/logout flows
- Menu navigation
- Forms with clear IDs
- **Cost: $0**

### When to use Stagehand AI (10% of tests)

- Dynamic elements
- Elements without stable selectors
- Complex searches on page
- Modals/popups with changing content
- **Cost: ~$0.002-$0.006 per action**

### Stagehand Example

```typescript
const stagehand = new StagehandManager();
await stagehand.initialize();

// Natural language actions
await stagehand.act('Type "username" in the username field');
await stagehand.act("Click the login button");

// Extract information
const data = await stagehand.extract("Get user name from page", schema);

// Observe elements
const elements = await stagehand.observe("Find all buttons");
```

## MCP Plugins Configuration

### Active Plugins

1. **playwright** - Execute and generate Playwright tests
2. **typescript** - TypeScript compilation and type checking
3. **atlassian** - Jira integration for ticket management
4. **context7** - Deep project context understanding

### Using Plugins

**Playwright Plugin:**

```
"Using Playwright plugin, execute test: login.test.ts"
"Generate new test for module X based on LoginPage pattern"
```

**TypeScript Plugin:**

```
"Compile the project and show TypeScript errors"
"Refactor [file] to improve type safety"
```

**Atlassian Plugin:**

```
"Create Jira ticket: Automation for Reports module completed"
"List all open tickets assigned to me"
"Update ticket [ID] with test execution results"
```

**Context7 Plugin:**

```
"Analyze the project and suggest architecture improvements"
"Find all usages of [method] and list potential issues"
```

## What NOT to Do

❌ **Never:**

- Use CSS selectors directly in tests (use Page Objects)
- Create code without logging
- Mix UI logic with test logic
- Ignore errors silently
- Commit `.env` file to Git
- Use `any` type without good reason
- Leave console.log() in production code

✅ **Always:**

- Follow Page Object Model
- Add structured logging
- Handle errors properly
- Take screenshots on failures
- Write descriptive commit messages
- Use TypeScript strict mode

## Common Commands

```bash
# Development
npx tsc --noEmit               # Check TypeScript compilation
npm list --depth=0             # List dependencies
npm run test:[module]          # Run specific test

# Git
git pull origin main           # Sync before starting work
git add .
git commit -m "message"
git push origin main           # Push after work session

# Debugging
npm run test:explore           # Explore page elements
ls -R src/                     # View project structure
cat logs/app.log              # View logs
```

## Testing Strategy

### Test Pyramid

```
        /\
       /  \  E2E Tests (Stagehand AI) - 10%
      /────\
     /      \  Integration Tests (Playwright) - 30%
    /────────\
   /          \  Unit Tests (Fast) - 60%
  /____________\
```

### Coverage Goals

- **Critical flows:** 100% (login, logout, core business)
- **Secondary flows:** 80% (reports, configuration)
- **Edge cases:** 60% (error handling, validations)

## Metrics for March Presentation

**Track these metrics:**

- ✅ Total automated tests
- ✅ Pass rate percentage
- ✅ Bugs detected before production
- ✅ Hours saved in manual testing
- ✅ Coverage of critical flows
- ✅ Average test execution time
- ✅ CI/CD success rate

**Current Status (Day 3):**

- Tests: 7 automated
- Pass rate: 100%
- Coverage: ~40% of critical flows
- Time saved: ~6 hours/week

## Project Milestones

**Week 1 (Days 1-5):** ✅ Foundation

- Setup & architecture
- Login/Logout automation
- Stagehand AI integration

**Week 2 (Days 6-10):** 🎯 Current

- 3 additional TMS modules
- 15+ total tests
- Professional reporting

**Weeks 3-4:**

- Complete main modules
- Data-driven tests
- Performance optimization

**Weeks 5-8:**

- Scale to all products
- Dashboard monitoring
- Executive documentation
- Presentation preparation

## Cost Optimization

**Monthly costs:**

- Claude Pro: $20 (already paid - unlimited)
- Cursor Free: $0 (sufficient)
- Gemini API: $3-5 (~500-800 AI tests)
- **Total: ~$23-25/month**

**Cost per test:**

- Playwright: $0
- Stagehand AI: $0.002-$0.006
- **Hybrid approach: ~$0.001 average**

## Success Criteria

✅ **Technical:**

- 15+ automated tests by Week 2
- 100% pass rate maintained
- <5 min full suite execution
- CI/CD running on every commit

✅ **Business:**

- Save 10+ hours/week in manual testing
- Detect bugs before production
- Reduce regression issues by 80%
- Professional framework ready to scale

✅ **Presentation:**

- Live demo of AI-powered tests
- Metrics dashboard showing value
- ROI calculation with time saved
- Roadmap for scaling to all products

## Resources

**Documentation:**

- Playwright: https://playwright.dev
- Stagehand: https://docs.stagehand.dev
- TypeScript: https://www.typescriptlang.org/docs

**Internal:**

- GitHub Repo: https://github.com/samrdx/bermann-tms-automation
- TMS QA: https://moveontruckqa.bermanntms.cl

## Notes for Claude

When generating code:

1. Always follow Page Object Model pattern
2. Include Winston logging in every method
3. Use TypeScript strict types
4. Add error handling with screenshots
5. Follow existing naming conventions
6. Include JSDoc comments for public methods
7. Add unit tests when creating utilities
8. Update package.json if adding new scripts

When suggesting improvements:

1. Consider cost optimization (prefer Playwright over AI)
2. Maintain consistency with existing patterns
3. Think about scalability to 50+ tests
4. Keep code maintainable for team
5. Balance between coverage and execution time

---

**Last Updated:** Day 3 - January 28, 2025
**Status:** Production-ready with AI integration
**Next Goal:** Scale to 15+ tests with Claude Terminal automation
