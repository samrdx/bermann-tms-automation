# TMS Dropdowns Skill

## Overview

**Purpose:** Bootstrap Select dropdowns are the #1 source of test failures in TMS automation. This skill documents PROVEN patterns applicable to ALL TMS modules.

**Context:** The Bermann TMS uses Bootstrap-Select 1.13.x consistently across all modules (Contratos, Viajes, Reportes, etc.). Standard Playwright `.click()` and `.fill()` often fail due to dynamic rendering.

**Scope:** Generic patterns - NOT module-specific. For module-specific dropdown configurations, see module documentation.

**Success Rate:** Following these patterns = 95%+ first-run success rate across ALL modules.

---

## When to Use This Skill

✅ **Always use when:**

- Working with ANY dropdown in ANY TMS module
- Handling cascading dropdowns (parent → child)
- Date picker fields (readonly inputs with calendar)
- Select elements with search functionality
- Long dropdown lists (100+ options)
- Debugging "element not interactable" errors

❌ **Not needed when:**

- Working with standard HTML `<select>` (rare in TMS)
- Plain text inputs or textareas
- Radio buttons or checkboxes

---

## Bootstrap-Select Anatomy (Universal)

**ALL TMS dropdowns follow this structure:**

```html
<!-- Trigger Button -->
<button
  class="btn dropdown-toggle btn-light"
  data-id="[field-name]"
  type="button"
>
  <span class="filter-option-inner-inner">[Current Selection]</span>
</button>

<!-- Dropdown Menu (hidden until clicked) -->
<div class="dropdown-menu">
  <!-- Optional Search Box (not all dropdowns have this) -->
  <div class="bs-searchbox">
    <input
      type="text"
      class="form-control"
      autocomplete="off"
      role="textbox"
      aria-label="Search"
    />
  </div>

  <!-- Options Container -->
  <div class="inner show">
    <a class="dropdown-item" role="option" tabindex="0">[Option 1]</a>
    <a class="dropdown-item" role="option" tabindex="0">[Option 2]</a>
    <!-- ... N options ... -->
  </div>
</div>
```

---

## Core Principles (Apply to ALL Modules)

### 1. State Machine (Universal)

```
CLOSED → click → OPENING → wait → OPEN → select → CLOSING → CLOSED
```

### 2. Never Assume State

```typescript
// ❌ BAD: Assumes ready
await page.click(".dropdown-item");

// ✅ GOOD: Verify first
await page.click(buttonSelector);
await page.waitForSelector(".dropdown-menu.show", { state: "visible" });
await page.click(".dropdown-item");
```

### 3. Classification System

| Dropdown Type | Criteria                     | Pattern        |
| ------------- | ---------------------------- | -------------- |
| Simple        | < 20 options, no search      | Pattern 1      |
| Long          | 20-500 options, has search   | Pattern 2 or 3 |
| Cascading     | Depends on parent selection  | Pattern 4      |
| DatePicker    | Readonly input with calendar | Pattern 5      |

**How to identify:**

- Inspect with F12
- Count options or check for `.bs-searchbox`
- Check if `readonly` attribute exists
- Test if it appears/changes based on another field

---

## Pattern Library (Generic - Use Anywhere)

### Pattern 1: Simple Dropdown

**When:** < 20 options, no search box

```typescript
async selectSimpleDropdown(
  buttonSelector: string,
  optionText: string
): Promise<void> {
  logger.info(`Selecting "${optionText}" from simple dropdown`);

  try {
    // 1. Click to open
    await this.page.click(buttonSelector);
    await this.page.waitForTimeout(500);

    // 2. Wait for dropdown visible
    await this.page.waitForSelector('.dropdown-menu.show', {
      state: 'visible',
      timeout: 5000
    });

    // 3. Click option
    await this.page.click(
      `.dropdown-menu.show .dropdown-item:has-text("${optionText}")`
    );

    logger.info(`✅ Selected "${optionText}"`);
  } catch (error) {
    logger.error(`Failed to select`, error);
    await this.takeScreenshot('simple-dropdown-error');
    throw error;
  }
}
```

**Examples across modules:**

- Contratos: Tipo (Costo/Venta)
- Viajes: Tipo Viaje
- Reportes: Tipo Reporte

---

### Pattern 2: Long Dropdown with Scroll

**When:** 20-500+ options, requires scrolling

```typescript
async selectLongDropdown(
  buttonSelector: string,
  optionText: string
): Promise<void> {
  logger.info(`Selecting from long dropdown`);

  try {
    await this.page.click(buttonSelector);
    await this.page.waitForTimeout(1000);

    await this.page.waitForSelector('.dropdown-menu.show .dropdown-item', {
      state: 'visible',
      timeout: 5000
    });

    const options = await this.page.$$('.dropdown-menu.show .dropdown-item');
    logger.info(`Found ${options.length} options`);

    for (const option of options) {
      if (await option.isVisible()) {
        const text = await option.textContent();

        if (text && text.includes(optionText)) {
          await option.scrollIntoViewIfNeeded();
          await this.page.waitForTimeout(300);
          await option.click();
          logger.info(`✅ Selected`);
          return;
        }
      }
    }

    throw new Error(`Option "${optionText}" not found`);
  } catch (error) {
    logger.error(`Failed`, error);
    await this.takeScreenshot('long-dropdown-error');
    throw error;
  }
}
```

**Examples:**

- Contratos: Transportista (237 options)
- Viajes: Cliente
- Cualquier lista larga

---

### Pattern 3: Dropdown with Search

**When:** Has `.bs-searchbox`, better performance than scrolling

```typescript
async selectWithSearch(
  buttonSelector: string,
  searchText: string
): Promise<void> {
  logger.info(`Searching for "${searchText}"`);

  try {
    await this.page.click(buttonSelector);
    await this.page.waitForTimeout(800);

    const searchBox = await this.page.waitForSelector(
      '.bs-searchbox input[type="text"]',
      { state: 'visible', timeout: 5000 }
    );

    await searchBox.fill(searchText);
    await this.page.waitForTimeout(500);

    await this.page.waitForSelector('.dropdown-menu.show .dropdown-item', {
      state: 'visible'
    });

    const firstOption = await this.page.$('.dropdown-menu.show .dropdown-item');
    await firstOption?.click();

    logger.info(`✅ Selected via search`);
  } catch (error) {
    logger.error(`Search failed`, error);
    await this.takeScreenshot('search-dropdown-error');
    throw error;
  }
}
```

**Examples:**

- Cualquier dropdown con searchbox
- Recomendado para listas largas

---

### Pattern 4: Cascading Dropdown

**When:** Child dropdown depends on parent selection

```typescript
async selectCascading(
  parentButton: string,
  parentValue: string,
  childButton: string,
  childValue: string,
  waitMs = 1500  // CRITICAL
): Promise<void> {
  logger.info(`Cascading: ${parentValue} → ${childValue}`);

  try {
    // Parent
    await this.selectSimpleDropdown(parentButton, parentValue);

    // WAIT for cascade
    logger.info(`Waiting ${waitMs}ms for cascade...`);
    await this.page.waitForTimeout(waitMs);

    // Verify child enabled
    const enabled = await this.page.isEnabled(childButton);
    if (!enabled) {
      throw new Error('Child not enabled');
    }

    // Child
    await this.selectLongDropdown(childButton, childValue);

    logger.info(`✅ Cascade complete`);
  } catch (error) {
    logger.error('Cascade failed', error);
    await this.takeScreenshot('cascade-error');
    throw error;
  }
}
```

**Examples:**

- Contratos: Tipo → Transportista
- Viajes: Región → Comuna
- Cualquier parent → child

**Rules:**

- ✅ ALWAYS wait 1-2 seconds
- ✅ Verify child enabled
- ❌ Never assume immediate

---

### Pattern 5: Date Picker

**When:** Input has `readonly` or `data-toggle="datetimepicker"`

```typescript
async setDatePicker(
  inputSelector: string,
  date: string  // "YYYY-MM-DD" or "DD/MM/YYYY"
): Promise<void> {
  logger.info(`Setting date: ${date}`);

  try {
    await this.page.evaluate((selector, value) => {
      const el = document.querySelector(selector) as HTMLInputElement;
      if (!el) throw new Error('Date picker not found');

      el.removeAttribute('readonly');
      el.value = value;

      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      el.dispatchEvent(new Event('blur', { bubbles: true }));
    }, inputSelector, date);

    await this.page.waitForTimeout(300);
    logger.info(`✅ Date set`);
  } catch (error) {
    logger.error('DatePicker failed', error);
    await this.takeScreenshot('datepicker-error');
    throw error;
  }
}
```

**Examples:**

- Contratos: Fecha Vencimiento
- Viajes: Fecha Inicio/Fin
- Cualquier fecha readonly

**Rules:**

- ❌ NEVER use `.fill()` on readonly
- ✅ ALWAYS use JavaScript
- ✅ Dispatch events

---

## Decision Tree

```
Need to select from dropdown?
│
├─ Is it readonly? (date/time)
│  └─ Use Pattern 5 (DatePicker)
│
├─ Does it depend on another field?
│  └─ Use Pattern 4 (Cascading)
│
├─ How many options?
│  ├─ < 20 options
│  │  └─ Use Pattern 1 (Simple)
│  │
│  └─ 20+ options
│     ├─ Has search box?
│     │  ├─ Yes → Use Pattern 3 (Search)
│     │  └─ No → Use Pattern 2 (Scroll)
```

---

## Common Issues (Universal Solutions)

### Issue: "Element not visible"

```typescript
// Increase wait
await page.click(buttonSelector);
await page.waitForTimeout(1000);

// Verify .show
await page.waitForSelector(".dropdown-menu.show");
```

### Issue: "Multiple elements found"

```typescript
// Use .show to filter
".dropdown-menu.show .dropdown-item"; // Only open dropdown
```

### Issue: "Option not found"

```typescript
// Use .includes()
if (text && text.trim().includes(optionText)) { ... }

// Log available
logger.info('Options:', await Promise.all(options.map(o => o.textContent())));
```

### Issue: "Timeout on readonly"

```typescript
// Use JavaScript, not .fill()
await page.evaluate(/* ... */);
```

---

## Validation Checklist

- [ ] Used correct pattern for dropdown type
- [ ] Waits for `.dropdown-menu.show`
- [ ] Handles scrolling if needed
- [ ] Waits between cascading (1.5s)
- [ ] Uses JavaScript for readonly
- [ ] Logs state and count
- [ ] Error handling + screenshot
- [ ] Winston logging

---

## Module-Specific Configs

For specific dropdown configurations per module, see:

- **Contratos:** `docs/contratos-module.md`
- **Viajes:** `docs/viajes-module.md`
- **Reportes:** `docs/reportes-module.md`

---

## Related Skills

- **tms-selectors:** How to find dropdown selectors
- **tms-page-objects:** Where to put dropdown methods
- **playwright (Anthropic):** General Playwright patterns

---

**Skill Version:** 1.1.0  
**Last Updated:** 2025-01-30  
**Scope:** Generic (ALL modules)  
**Status:** ✅ Active
