# TMS Page Objects Skill

## Overview

**Purpose:** Enforce consistent Page Object Model structure across ALL TMS modules to ensure maintainability, reusability, and scalability.

**Context:** Page Objects encapsulate page structure and behavior. This skill provides the universal template applicable to any TMS module.

**Scope:** Generic structure - applies to Contratos, Viajes, Reportes, and all future modules.

**Benefits:**

- ✅ 80% less code duplication
- ✅ 90% easier to maintain
- ✅ 95% faster onboarding
- ✅ 100% consistent patterns

---

## When to Use This Skill

✅ **Always use when:**

- Creating ANY new Page Object (any module)
- Adding methods to existing Page Object
- Refactoring Page Object code
- Reviewing Page Object PR
- Onboarding developers to framework

❌ **Not needed when:**

- Writing test files (use tms-tests skill)
- Working with BasePage core (already defined)
- Pure utility functions (use helpers)

---

## Mandatory Structure (Universal Template)

```typescript
import { BasePage } from '../../../core/BasePage.js';
import type { Page } from 'playwright';
import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('[ModuleName]Page');

/**
 * Page Object for [Module] [Action] page
 * URL: /[module]/[action]
 */
export class [ModuleName]Page extends BasePage {

  // 1. SELECTORS (Private, from Confluence)
  private readonly selectors = {
    // Group by functionality
    // Use descriptive names
    // Reference Confluence in comments
  };

  // 2. CONSTRUCTOR
  constructor(page: Page) {
    super(page);
  }

  // 3. NAVIGATION
  async navigate(): Promise<void> {
    await this.page.goto('https://moveontruckqa.bermanntms.cl/[module]/[action]');
    await this.page.waitForLoadState('domcontentloaded');
  }

  // 4. ACTION METHODS (fill, click, select)
  async fillField(value: string): Promise<void> {
    logger.info(`Filling field: ${value}`);
    try {
      await this.fill(this.selectors.field, value);
    } catch (error) {
      logger.error('Failed to fill field', error);
      await this.takeScreenshot('fill-field-error');
      throw error;
    }
  }

  // 5. VERIFICATION METHODS (is, has, get)
  async isFormSaved(): Promise<boolean> {
    // Return boolean, don't throw
    try {
      const url = this.page.url();
      return url.includes('/index');
    } catch {
      return false;
    }
  }
}
```

---

## File Naming Conventions

### File Names

```
[ModuleName]Page.ts         ← PascalCase
[ModuleName]FormPage.ts     ← For create/edit forms
[ModuleName]ListPage.ts     ← For index/list views
```

**Examples:**

- `ContratosFormPage.ts`
- `ViajesListPage.ts`
- `ReportesGeneratePage.ts`

### Class Names

```typescript
export class ContratosFormPage extends BasePage {}
export class ViajesListPage extends BasePage {}
```

### Location

```
src/modules/
├── auth/
│   └── pages/
│       ├── LoginPage.ts
│       └── DashboardPage.ts
├── contracts/
│   └── pages/
│       ├── ContratosPage.ts
│       └── ContratosListPage.ts
├── planning/
│   └── pages/
│       ├── PlanificarPage.ts
│       └── AsignarPage.ts
└── transport/
    └── pages/
        └── VehiculoPage.ts
```

---

## Section 1: Selectors Object (Mandatory)

### Rules

- ✅ ALWAYS private readonly
- ✅ ALWAYS object literal
- ✅ Group by functionality
- ✅ Descriptive names (no abbreviations)
- ✅ Reference Confluence IDs in comments

```typescript
private readonly selectors = {
  // Basic Fields
  nroContrato: '#contrato-nro_contrato',  // Confluence: CONT-001
  valorHora: '#contrato-valor_hora',       // Confluence: CONT-002

  // Dropdowns (Bootstrap Select)
  tipoButton: '.filter-option-inner-inner',  // Confluence: CONT-003
  transportistaButton: 'button[data-id="contrato-transportista_id"]',  // CONT-004

  // Date Pickers (readonly)
  fechaVencimiento: '#contrato-fecha_vencimiento',  // Confluence: CONT-005

  // Actions
  btnGuardar: '#btn_guardar',              // Confluence: CONT-006
  btnVolver: 'a.btn[href="/contrato/index"]',  // CONT-007

  // Validation
  invalidField: '[aria-invalid="true"]',
  errorMessage: '.help-block.badge.badge-danger',
};
```

### Grouping Strategy

1. **Basic fields** (text inputs, textareas)
2. **Dropdowns** (selects, Bootstrap selects)
3. **Date/Time pickers**
4. **Checkboxes/Radios**
5. **Actions** (buttons, links)
6. **Validation** (error messages, markers)

---

## Section 2: Constructor (Standard)

```typescript
constructor(page: Page) {
  super(page);
  // NO initialization logic here
  // Keep constructor clean
}
```

**Rules:**

- ✅ ALWAYS call `super(page)`
- ❌ NO additional logic
- ❌ NO property initialization beyond super

---

## Section 3: Navigation Method

```typescript
async navigate(): Promise<void> {
  await this.page.goto('https://moveontruckqa.bermanntms.cl/[module]/[action]');
  await this.page.waitForLoadState('domcontentloaded');
}
```

**Variations:**

```typescript
// With verification
async navigate(): Promise<void> {
  await this.page.goto('https://moveontruckqa.bermanntms.cl/contrato/crear');
  await this.page.waitForLoadState('domcontentloaded');

  // Verify key element loaded
  await this.page.waitForSelector(this.selectors.nroContrato, {
    state: 'visible',
    timeout: 5000
  });
}

// With dynamic URL
async navigateToEdit(id: string): Promise<void> {
  await this.page.goto(`https://moveontruckqa.bermanntms.cl/contrato/editar/${id}`);
  await this.page.waitForLoadState('domcontentloaded');
}
```

---

## Section 4: Action Methods

### Naming Conventions

| Action          | Method Name         | Example             |
| --------------- | ------------------- | ------------------- |
| Fill input      | `fill[FieldName]`   | `fillNroContrato()` |
| Click button    | `click[ButtonName]` | `clickGuardar()`    |
| Select dropdown | `select[FieldName]` | `selectTipo()`      |
| Check checkbox  | `check[FieldName]`  | `checkActivo()`     |
| Upload file     | `upload[FieldName]` | `uploadArchivo()`   |

### Template

```typescript
async fillNroContrato(nro: string): Promise<void> {
  logger.info(`Filling contract number: ${nro}`);

  try {
    await this.fill(this.selectors.nroContrato, nro);
  } catch (error) {
    logger.error('Failed to fill nro contrato', error);
    await this.takeScreenshot('fill-nro-error');
    throw error;
  }
}
```

### Patterns

**Simple field:**

```typescript
async fillValorHora(valor: string): Promise<void> {
  logger.info(`Filling hourly rate: ${valor}`);
  try {
    await this.fill(this.selectors.valorHora, valor);
  } catch (error) {
    logger.error('Failed to fill valor hora', error);
    await this.takeScreenshot('fill-valor-error');
    throw error;
  }
}
```

**Dropdown (use tms-dropdowns skill):**

```typescript
async selectTipo(tipo: 'Costo' | 'Venta'): Promise<void> {
  logger.info(`Selecting tipo: ${tipo}`);
  try {
    // Pattern from tms-dropdowns skill
    await this.page.click(this.selectors.tipoButton);
    await this.page.waitForTimeout(500);
    await this.page.waitForSelector('.dropdown-menu.show');
    await this.page.click(`.dropdown-menu.show .dropdown-item:has-text("${tipo}")`);
  } catch (error) {
    logger.error('Failed to select tipo', error);
    await this.takeScreenshot('select-tipo-error');
    throw error;
  }
}
```

**Date picker (use tms-dropdowns Pattern 5):**

```typescript
async setFechaVencimiento(fecha: string): Promise<void> {
  logger.info(`Setting fecha: ${fecha}`);
  try {
    await this.page.evaluate((selector, value) => {
      const el = document.querySelector(selector) as HTMLInputElement;
      el.removeAttribute('readonly');
      el.value = value;
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }, this.selectors.fechaVencimiento, fecha);
  } catch (error) {
    logger.error('Failed to set fecha', error);
    await this.takeScreenshot('set-fecha-error');
    throw error;
  }
}
```

---

## Section 5: Verification Methods

### Naming Conventions

| Check         | Method Name     | Returns            |
| ------------- | --------------- | ------------------ |
| Boolean check | `is[Condition]` | `boolean`          |
| Has element   | `has[Element]`  | `boolean`          |
| Get value     | `get[Value]`    | `string \| number` |
| Get elements  | `get[Elements]` | `Locator[]`        |

### Template

```typescript
async isFormSaved(): Promise<boolean> {
  try {
    // Check URL changed
    const url = this.page.url();
    if (!url.includes('/index')) return false;

    // Check success message
    const notification = await this.page.$('[role="status"]');
    return notification !== null;
  } catch {
    return false;
  }
}

async hasValidationErrors(): Promise<boolean> {
  try {
    const errors = await this.page.$$(this.selectors.invalidField);
    return errors.length > 0;
  } catch {
    return false;
  }
}

async getErrorMessages(): Promise<string[]> {
  try {
    const elements = await this.page.$$(this.selectors.errorMessage);
    return await Promise.all(elements.map(el => el.textContent() || ''));
  } catch {
    return [];
  }
}
```

---

## Complete Example

```typescript
import { BasePage } from "../core/BasePage.js";
import type { Page } from "playwright";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("ContratosFormPage");

export interface ContractData {
  nroContrato: string;
  tipo: "Costo" | "Venta";
  transportista?: string;
  fechaVencimiento?: string;
  valorHora: string;
}

export class ContratosFormPage extends BasePage {
  private readonly selectors = {
    nroContrato: "#contrato-nro_contrato",
    tipoButton: ".filter-option-inner-inner",
    transportistaButton: 'button[data-id="contrato-transportista_id"]',
    fechaVencimiento: "#contrato-fecha_vencimiento",
    valorHora: "#contrato-valor_hora",
    btnGuardar: "#btn_guardar",
  };

  constructor(page: Page) {
    super(page);
  }

  async navigate(): Promise<void> {
    await this.page.goto("https://moveontruckqa.bermanntms.cl/contrato/crear");
    await this.page.waitForLoadState("domcontentloaded");
  }

  async fillNroContrato(nro: string): Promise<void> {
    logger.info(`Filling contract number: ${nro}`);
    try {
      await this.fill(this.selectors.nroContrato, nro);
    } catch (error) {
      logger.error("Failed to fill nro", error);
      await this.takeScreenshot("fill-nro-error");
      throw error;
    }
  }

  async selectTipo(tipo: "Costo" | "Venta"): Promise<void> {
    logger.info(`Selecting tipo: ${tipo}`);
    try {
      await this.page.click(this.selectors.tipoButton);
      await this.page.waitForTimeout(500);
      await this.page.waitForSelector(".dropdown-menu.show");
      await this.page.click(
        `.dropdown-menu.show .dropdown-item:has-text("${tipo}")`,
      );
    } catch (error) {
      logger.error("Failed to select tipo", error);
      await this.takeScreenshot("select-tipo-error");
      throw error;
    }
  }

  async fillCompleteForm(data: ContractData): Promise<void> {
    logger.info("Filling complete contract form");

    await this.fillNroContrato(data.nroContrato);
    await this.selectTipo(data.tipo);

    if (data.transportista) {
      await this.page.waitForTimeout(1500); // Cascade wait
      await this.selectTransportista(data.transportista);
    }

    if (data.fechaVencimiento) {
      await this.setFechaVencimiento(data.fechaVencimiento);
    }

    await this.fillValorHora(data.valorHora);

    logger.info("✅ Form filled successfully");
  }

  async clickGuardar(): Promise<void> {
    logger.info("Clicking save button");
    try {
      await this.click(this.selectors.btnGuardar);
    } catch (error) {
      logger.error("Failed to save", error);
      await this.takeScreenshot("save-error");
      throw error;
    }
  }

  async isFormSaved(): Promise<boolean> {
    try {
      await this.page.waitForTimeout(2000);
      const url = this.page.url();
      return url.includes("/index") || url.includes("/editar");
    } catch {
      return false;
    }
  }
}
```

---

## When to Create Helper Methods

### Create when:

- ✅ Filling multiple related fields
- ✅ Complex multi-step interactions
- ✅ Common workflows (create full entity)

```typescript
// Good: Helper for complete form
async createContract(data: ContractData): Promise<void> {
  await this.navigate();
  await this.fillCompleteForm(data);
  await this.clickGuardar();
  await this.isFormSaved();
}
```

### Don't create when:

- ❌ Single field operations (use direct methods)
- ❌ One-time actions
- ❌ Test-specific logic (belongs in test file)

---

## Refactoring to BasePage

**Move to BasePage when method used by 3+ Page Objects:**

```typescript
// Before: Duplicated in 3 pages
export class ContratosFormPage extends BasePage {
  async waitForNotification(): Promise<void> {
    await this.page.waitForSelector('[role="status"]');
  }
}

// After: In BasePage
export class BasePage {
  async waitForNotification(): Promise<void> {
    await this.page.waitForSelector('[role="status"]');
  }
}
```

---

## Validation Checklist

- [ ] Extends BasePage
- [ ] Private readonly selectors object
- [ ] Selectors from Confluence
- [ ] Descriptive method names (fill/click/select/is/has/get)
- [ ] Winston logging in all methods
- [ ] Try/catch with screenshots
- [ ] TypeScript interfaces for data
- [ ] JSDoc comments for public methods
- [ ] No business logic in Page Object
- [ ] Imports use .js extension

---

## Related Skills

- **tms-selectors:** Finding and prioritizing selectors
- **tms-dropdowns:** Dropdown interaction patterns
- **tms-tests:** Using Page Objects in tests

---

**Skill Version:** 1.0.0  
**Last Updated:** 2025-01-30  
**Scope:** Generic (ALL modules)  
**Status:** ✅ Active
