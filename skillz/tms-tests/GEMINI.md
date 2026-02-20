# TMS Tests Skill

## Overview

**Purpose:** Enforce consistent test structure across ALL TMS modules to ensure maintainability, readability, and reliability.

**Context:** Tests are the executable specification of TMS behavior. This skill provides the universal template for test files regardless of module.

**Scope:** Generic test structure - applies to Contratos, Viajes, Reportes, and all future modules.

**Benefits:**

- ✅ 90% faster test creation
- ✅ 95% easier to debug
- ✅ 100% consistent patterns
- ✅ Zero boilerplate decisions

---

## When to Use This Skill

✅ **Always use when:**

- Creating ANY new test file
- Adding test to existing suite
- Refactoring test code
- Reviewing test PR
- Debugging flaky tests

❌ **Not needed when:**

- Creating Page Objects (use tms-page-objects)
- Writing utility functions (use helpers)
- Configuration files

---

## File Structure (Universal)

```
tests/
├── e2e/
│   ├── auth/
│   │   ├── login.test.ts
│   │   └── logout.test.ts
│   ├── contracts/
│   │   └── contratos-crear.test.ts
│   └── planning/
│       └── viajes-planificar.test.ts
└── helpers/
    ├── test-data.ts
    └── assertions.ts
```

**Naming Convention:**

```
[module]-[action].test.ts

Examples:
- contratos-crear.test.ts
- viajes-asignar.test.ts
- reportes-generar.test.ts
- login.test.ts (special case)
```

---

## Mandatory Test Structure

```typescript
import { test, expect } from '../src/fixtures/base.js';
import { getTestUser } from '../src/config/credentials.js';
import { logger } from '../src/utils/logger.js';

test.describe('[Module] - [Action]', () => {

  test('Should [expected outcome]', async ({
    page,
    loginPage,
    dashboardPage,
    [module]Page
  }) => {

    // Test data
    const user = getTestUser('regular');
    const testData = {
      // Define test data here
    };

    // PHASE 1: Login (Handled partially by fixture if configured, or explicit here)
    // Note: If using 'auth' fixture, login might be automatic.
    // Assuming explicit login for modular tests:

    await test.step('Phase 1: Login', async () => {
        logger.info('🔐 PHASE 1: Login');
        await loginPage.loginAndWaitForDashboard(user.username, user.password);
        expect(await dashboardPage.isOnDashboard()).toBe(true);
        logger.info('✅ Login successful');
    });

    await test.step('Phase 2: Navigate', async () => {
        logger.info('Compass PHASE 2: Navigate');
        await [module]Page.navigate();
        logger.info('✅ Navigation successful');
    });

    await test.step('Phase 3: Action', async () => {
        logger.info('📝 PHASE 3: Main Action');
        // Action steps
        // await [module]Page.createEntity(testData);
        logger.info('✅ Action successful');
    });

    await test.step('Phase 4: Verification', async () => {
        logger.info('✅ PHASE 4: Verification');
        const result = await [module]Page.isActionCompleted();
        expect(result).toBe(true);
        logger.info('✅ Test PASSED');
    });
  });
});
```

---

## Phase Structure (Mandatory)

### Phase 0: Setup (Always)

```typescript
// Logging banner
logger.info("=".repeat(60));
logger.info("🚀 Starting [Test Name]");
logger.info("=".repeat(60));

// Browser initialization
await browser.initialize();
const page = browser.getPage();

// Page Objects
const loginPage = new LoginPage(page);
// ... other pages

// Test data
const testData = {
  /* ... */
};
```

### Phase 1: Login (Always)

```typescript
logger.info("
🔐 PHASE 1: Login");
await loginPage.loginAndWaitForDashboard(user.username, user.password);

const isOnDashboard = await dashboardPage.isOnDashboard();
if (!isOnDashboard) {
  throw new Error("Failed to reach dashboard");
}

logger.info("✅ Login successful");
await page.screenshot({ path: "./reports/screenshots/01-login.png" });
```

### Phase 2: Navigation (Usually)

```typescript
logger.info("
🧭 PHASE 2: Navigate to [Module]");
await modulePage.navigate();

// Verify navigation
const currentUrl = page.url();
if (!currentUrl.includes("/expected/path")) {
  throw new Error("Navigation failed");
}

logger.info("✅ Navigation successful");
await page.screenshot({ path: "./reports/screenshots/02-navigate.png" });
```

### Phase 3+: Actions (Variable)

```typescript
logger.info("
📝 PHASE 3: [Action Description]");

// Break into sub-steps
logger.info("STEP 3.1: [Sub-action 1]");
await modulePage.doSomething();
logger.info("✅ Step 3.1 completed");

logger.info("STEP 3.2: [Sub-action 2]");
await modulePage.doSomethingElse();
logger.info("✅ Step 3.2 completed");

await page.screenshot({ path: "./reports/screenshots/03-action.png" });
```

### Final Phase: Verification (Always)

```typescript
logger.info("
✅ PHASE 4: Verification");

const result = await modulePage.isActionCompleted();
if (!result) {
  throw new Error("Verification failed");
}

logger.info("✅ Test PASSED");

// Results summary
logger.info("
" + "=".repeat(60));
logger.info("📊 TEST RESULTS:");
logger.info("=".repeat(60));
logger.info("✅ Phase 1: Login - PASSED");
logger.info("✅ Phase 2: Navigation - PASSED");
logger.info("✅ Phase 3: Action - PASSED");
logger.info("✅ Phase 4: Verification - PASSED");
logger.info("=".repeat(60));
```

---

## Test Data Patterns

### Pattern 1: Inline Data

```typescript
const testData = {
  nroContrato: Date.now().toString().slice(-8),
  valorHora: "25000",
  tipo: "Costo" as const,
};
```

### Pattern 2: Helper Function

```typescript
// tests/helpers/test-data.ts
export function generateContractData() {
  return {
    nroContrato: `TEST-${Date.now()}`,
    valorHora: "25000",
    tipo: "Costo" as const,
  };
}

// In test
const testData = generateContractData();
```

### Pattern 3: External File

```typescript
// data/contracts.json
{
  "valid": {
    "nroContrato": "12345",
    "tipo": "Costo"
  }
}

// In test
import contractData from '../data/contracts.json';
const testData = contractData.valid;
```

---

## Screenshot Strategy

### Naming Convention

```
./reports/screenshots/[phase]-[description]-[timestamp?].png

Examples:
- 01-login-success.png
- 02-navigate-contratos.png
- 03-fill-form.png
- 04-save-success.png
- error-1706123456789.png
```

### When to Take Screenshots

```typescript
// ✅ ALWAYS
await page.screenshot({ path: "./reports/screenshots/01-login.png" });

// ✅ After each phase
await page.screenshot({ path: "./reports/screenshots/02-navigate.png" });

// ✅ On error (with timestamp)
await page.screenshot({
  path: `./reports/screenshots/error-${Date.now()}.png`,
  fullPage: true,
});

// ✅ Before critical assertions
await page.screenshot({ path: "./reports/screenshots/before-assert.png" });
```

---

## Error Handling (Mandatory)

### Structure

```typescript
try {
  // Test code
} catch (error) {
  logger.error("❌ Test failed", error);

  try {
    const page = browser.getPage();
    await page.screenshot({
      path: `./reports/screenshots/error-${Date.now()}.png`,
      fullPage: true,
    });
  } catch (screenshotError) {
    logger.error("Could not take screenshot", screenshotError);
  }

  throw error; // Re-throw to fail test
} finally {
  await browser.close(); // ALWAYS close
}
```

### Error Messages

```typescript
// ❌ BAD: Generic
throw new Error("Failed");

// ✅ GOOD: Specific
throw new Error("Failed to reach dashboard after login");
throw new Error(`Transportista "${nombre}" not found in dropdown`);
throw new Error("Form validation failed: missing required fields");
```

---

## Logging Strategy

### Log Levels

```typescript
// Info: Main flow
logger.info("🔐 PHASE 1: Login");
logger.info("✅ Login successful");

// Debug: Details
logger.debug(`Found ${count} dropdown options`);
logger.debug(`Current URL: ${page.url()}`);

// Warn: Non-critical issues
logger.warn("Using fallback selector");

// Error: Failures
logger.error("Failed to select dropdown", error);
```

### Emoji Convention

```
🚀 Test start
🔐 Login phase
🧭 Navigation phase
📝 Action phase
✅ Success
❌ Error
⚠️  Warning
📊 Results
```

---

## Complete Examples

### Example 1: Simple CRUD Test

```typescript
import { test, expect } from "../src/fixtures/base.js";
import { getTestUser } from "../src/config/credentials.js";
import { logger } from "../src/utils/logger.js";

test.describe("Contracts - Creation", () => {
  test("Should create a new contract successfully", async ({
    page,
    loginPage,
    contratosPage,
  }) => {
    // Test data
    const user = getTestUser("regular");
    const testData = {
      nroContrato: Date.now().toString().slice(-8),
      tipo: "Costo" as const,
      valorHora: "25000",
    };

    await test.step("Phase 1: Login", async () => {
      logger.info("🔐 PHASE 1: Login");
      await loginPage.loginAndWaitForDashboard(user.username, user.password);
      logger.info("✅ Login successful");
    });

    await test.step("Phase 2: Navigate", async () => {
      logger.info("Compass PHASE 2: Navigate to Create Contract");
      await contratosPage.navigate();
      logger.info("✅ Navigation successful");
    });

    await test.step("Phase 3: Fill Form", async () => {
      logger.info("📝 PHASE 3: Fill Contract Form");
      await contratosPage.fillNroContrato(testData.nroContrato);
      await contratosPage.selectTipo(testData.tipo);
      await contratosPage.fillValorHora(testData.valorHora);
      logger.info("✅ Form filled");
    });

    await test.step("Phase 4: Save", async () => {
      logger.info("💾 PHASE 4: Save Contract");
      await contratosPage.clickGuardar();
      await page.waitForTimeout(2000);
      logger.info("✅ Contract saved");
    });

    await test.step("Phase 5: Verify", async () => {
      logger.info("✅ PHASE 5: Verification");
      const isSaved = await contratosPage.isFormSaved();
      expect(isSaved).toBeTruthy();
      logger.info("✅ Test PASSED");
    });
  });
});
```

### Example 2: Negative Test

```typescript
test.describe("Contracts - Validation", () => {
  test("Should show validation errors on empty save", async ({
    page,
    loginPage,
    contratosPage,
  }) => {
    await test.step("Phase 1: Login", async () => {
      await loginPage.loginAndWaitForDashboard(
        getTestUser("regular").username,
        getTestUser("regular").password,
      );
    });

    await test.step("Phase 2: Navigate", async () => {
      await contratosPage.navigate();
    });

    await test.step("Phase 3: Attempt Save", async () => {
      logger.info("📝 PHASE 3: Attempt to save empty form");
      await contratosPage.clickGuardar();
      await page.waitForTimeout(1000);
    });

    await test.step("Phase 4: Verify Errors", async () => {
      logger.info("✅ PHASE 4: Verify validation errors appear");
      const hasErrors = await contratosPage.hasValidationErrors();

      expect(hasErrors).toBe(true);

      const errorMessages = await contratosPage.getErrorMessages();
      logger.info(`Found ${errorMessages.length} validation errors`);

      logger.info("✅ Validation working correctly");
      logger.info("✅ Test PASSED");
    });
  });
});
```

---

## NPM Scripts Pattern

Add to `package.json`:

```json
{
  "scripts": {
    "test:[module]:[action]": "cross-env HEADLESS=false tsx tests/[module]-[action].test.ts",
    "test:[module]:[action]:headless": "cross-env HEADLESS=true tsx tests/[module]-[action].test.ts"
  }
}
```

**Examples:**

```json
"test:contratos:crear": "cross-env HEADLESS=false tsx tests/contratos-crear.test.ts",
"test:viajes:planificar": "cross-env HEADLESS=false tsx tests/viajes-planificar.test.ts",
"test:all": "cross-env HEADLESS=false tsx tests/*.test.ts"
```

---

## Validation Checklist

- [ ] Imports use .js extension
- [ ] BrowserManager initialized in try block
- [ ] Browser closed in finally block
- [ ] Winston logging throughout
- [ ] Phase structure followed
- [ ] Screenshots at key points
- [ ] Error handling with screenshot
- [ ] Test data defined clearly
- [ ] Verification phase included
- [ ] Results summary logged
- [ ] NPM script added

---

## Anti-Patterns

### ❌ No Error Handling

```typescript
// BAD
async function test() {
  const browser = new BrowserManager();
  await browser.initialize();
  // ... test code (no try/catch)
  await browser.close();
}
```

### ❌ No Screenshots

```typescript
// BAD
await loginPage.login(user);
await contratosPage.fillForm(data);
await contratosPage.save();
// No visual evidence
```

### ❌ Generic Logging

```typescript
// BAD
logger.info("Starting test");
logger.info("Done");

// GOOD
logger.info("🔐 PHASE 1: Login");
logger.info("✅ Login successful");
```

### ❌ Business Logic in Tests

```typescript
// BAD
const nroContrato = Math.floor(Math.random() * 1000000);
const tipo = someComplexCalculation();

// GOOD
const testData = generateContractData();
```

---

## Related Skills

- **tms-page-objects:** Creating Page Objects used in tests
- **tms-selectors:** Understanding selectors used in assertions
- **tms-dropdowns:** Complex interactions in tests

---

**Skill Version:** 1.0.0  
**Last Updated:** 2025-01-30  
**Scope:** Generic (ALL modules)  
**Status:** ✅ Active
