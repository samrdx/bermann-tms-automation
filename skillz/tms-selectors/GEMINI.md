# TMS Selectors Skill

## Overview

**Purpose:** Authoritative source for selector strategy across ALL TMS modules to prevent hallucination and test brittleness.

**Context:** The Bermann TMS uses consistent ID/data-id patterns across modules. This skill documents the universal selector hierarchy applicable to Contratos, Viajes, Reportes, and all future modules.

**Scope:** Generic selector rules - NOT module-specific selectors. For actual module selectors, see Confluence database.

**Integration:** Syncs with Confluence TMS Selector Database (single source of truth for all selectors).

---

## When to Use This Skill

✅ **Always use when:**

- Creating ANY Page Object for ANY module
- Writing ANY element selector
- Debugging "element not found" errors
- Adding new TMS module automation
- Updating selectors after TMS UI changes
- Onboarding new team members

❌ **Not needed when:**

- Working with BasePage core methods (already abstracted)
- Writing pure business logic (no UI interaction)
- Using existing, tested selectors from Page Objects

---

## Core Principles (Universal)

### 1. Confluence First (Non-Negotiable)

```
Need selector → Check Confluence → Use documented selector → Code
                      ↓ (not found)
                 Inspect (F12) → Add to Confluence → Then code
```

**Why Confluence?**

- ✅ Single source of truth across team
- ✅ Prevents duplicate effort
- ✅ Documents selector stability
- ✅ Tracks changes over time
- ✅ Reduces hallucination by 95%

### 2. Selector Priority Pyramid (Mandatory Order)

```
        #ID                  ← Priority 1: Most Stable
          ↓
    [data-id="..."]         ← Priority 2: TMS Convention
          ↓
    [name="..."]            ← Priority 3: Forms
          ↓
    [aria-label="..."]      ← Priority 4: Accessibility
          ↓
   .stable.classes          ← Priority 5: Last Resort
```

**Rule:** Use the HIGHEST priority selector available. Never skip priorities.

### 3. Never Hardcode (Zero Tolerance)

```typescript
// ❌ FORBIDDEN: Direct selectors in tests
await page.click('#btn-guardar');

// ✅ REQUIRED: Selectors in Page Object
private readonly selectors = {
  btnGuardar: '#btn-guardar'  // From Confluence
};
```

---

## Selector Priority Rules (Apply to ALL Modules)

| Priority | Type    | Example                                 | Stability  | When to Use              |
| -------- | ------- | --------------------------------------- | ---------- | ------------------------ |
| 1        | ID      | `#contrato-nro_contrato`                | 🟢 Highest | IDs present (check HTML) |
| 2        | data-id | `[data-id="contrato-transportista_id"]` | 🟢 High    | TMS convention fields    |
| 3        | name    | `[name="Contrato[nro_contrato]"]`       | 🟡 Medium  | Form fields              |
| 4        | aria-\* | `[aria-label="Search"]`                 | 🟡 Medium  | Accessibility attrs      |
| 5        | Classes | `.btn.dropdown-toggle.btn-light`        | 🔴 Low     | No better option         |

**Verification:**

- Open F12 DevTools
- Inspect element
- Look for attributes in priority order
- Choose first available

---

## Confluence Integration

### Confluence Schema (Universal)

```typescript
interface TMSSelectorEntry {
  module: string; // "Contratos" | "Viajes" | "Reportes"
  fieldName: string; // Descriptive name
  selectorType: string; // "id" | "data-id" | "name" | "aria" | "class"
  selectorValue: string; // Actual selector string
  elementType: string; // "input" | "button" | "dropdown" | "link"
  stability: string; // "high" | "medium" | "low"
  notes?: string; // Special behavior
  cascadesFrom?: string; // For dependent fields
  readonly?: boolean; // Date pickers
  optionCount?: number; // Dropdowns
  requiresScroll?: boolean; // Long lists
  addedBy: string;
  dateAdded: Date;
  lastVerified: Date;
}
```

### Adding to Confluence (Template)

```csv
Module,Field Name,Type,Selector,Element,Stability,Notes,Added By,Date
[Module],[Field Name],[id/data-id/etc],[Selector],[input/button/etc],[high/med/low],[Notes],[Name],[YYYY-MM-DD]
```

**Example:**

```csv
Contratos,Nro Contrato,id,#contrato-nro_contrato,input,high,Simple text input,QA Team,2025-01-30
Viajes,Fecha Inicio,id,#viaje-fecha_inicio,input,high,Readonly datepicker,QA Team,2025-01-30
```

---

## Common TMS Patterns (Generic)

### Pattern 1: Module ID Convention

```
#[module]-[field]

Examples:
- #contrato-nro_contrato
- #viaje-fecha_inicio
- #reporte-tipo
```

### Pattern 2: data-id Convention

```
[data-id="[module]-[field]_id"]

Examples:
- button[data-id="contrato-transportista_id"]
- button[data-id="viaje-cliente_id"]
```

### Pattern 3: Bootstrap Select (Universal)

```typescript
// ALL modules use this structure
{
  button: '.filter-option-inner-inner' or 'button[data-id="field-id"]',
  dropdown: '.dropdown-menu.show',
  searchbox: '.bs-searchbox input[type="text"]',
  option: '.dropdown-item[role="option"]',
  selected: '.dropdown-item.selected.active'
}
```

### Pattern 4: Form Submit Buttons (Universal)

```
#btn_guardar    // Most common
#btn_enviar     // Some forms
#btn_crear      // Creation forms
```

### Pattern 5: Date Pickers (Universal)

```
#[module]-fecha_[field]
readonly="readonly"
data-toggle="datetimepicker"
```

---

## Anti-Patterns (Never Do These)

### ❌ Hardcoded XPath

```typescript
// FORBIDDEN
xpath = "/html[1]/body[1]/div[2]/form[1]/div[1]...";
```

**Why:** Extremely fragile, breaks with ANY DOM change.

### ❌ Generic Classes

```typescript
// FORBIDDEN
".btn"; // Matches 50+ elements
".form-control"; // Matches all inputs
```

**Why:** Unpredictable, selector collision.

### ❌ Assumptions About State

```typescript
// FORBIDDEN
await page.click(".dropdown-item"); // May not be visible
```

**Why:** Race conditions, flaky tests.

### ❌ Direct .fill() on readonly

```typescript
// FORBIDDEN
await page.fill("#fecha_vencimiento", "2026-01-30");
```

**Why:** Timeouts on readonly inputs.

### ❌ Selectors Not in Confluence

```typescript
// FORBIDDEN
const selector = ".mysterious-class-i-found"; // Not documented
```

**Why:** Impossible to maintain, causes hallucination.

---

## Module Examples (Show Generic Application)

### Contratos Module Selectors

```typescript
export const ContratosSelectors = {
  // Basic fields (Priority 1: ID)
  nroContrato: "#contrato-nro_contrato",
  valorHora: "#contrato-valor_hora",

  // Dropdowns (Priority 2: data-id)
  transportista: 'button[data-id="contrato-transportista_id"]',

  // Date pickers (Priority 1: ID + readonly)
  fechaVencimiento: "#contrato-fecha_vencimiento",

  // Actions (Priority 1: ID)
  btnGuardar: "#btn_guardar",
  btnVolver: 'a.btn.btn-primary[href="/contrato/index"]',
};
```

### Viajes Module Selectors

```typescript
export const ViajesSelectors = {
  // Basic fields (Same pattern!)
  origen: "#viaje-origen",
  destino: "#viaje-destino",

  // Dropdowns (Same pattern!)
  cliente: 'button[data-id="viaje-cliente_id"]',

  // Date pickers (Same pattern!)
  fechaInicio: "#viaje-fecha_inicio",

  // Actions (Same pattern!)
  btnCrear: "#btn_guardar", // Often same ID
};
```

**Notice:** Same patterns across modules ✅

---

## Debugging Guide (Universal)

### Issue: "Selector not found"

**Checklist:**

```
1. ✅ Page loaded? (waitForLoadState)
2. ✅ Selector in Confluence?
3. ✅ Typo in string?
4. ✅ Element in iframe?
5. ✅ Element visible?
6. ✅ Wait time sufficient?
```

**Debug code:**

```typescript
// Count elements
const count = await page.locator(selector).count();
console.log(`Found ${count} elements`);

// Check visibility
const visible = await page.locator(selector).isVisible();
console.log(`Visible: ${visible}`);

// Screenshot
await page.screenshot({ path: "debug.png", fullPage: true });
```

### Issue: "Multiple elements found"

**Solutions:**

```typescript
// Add parent context
".parent-class " +
  selector
  // Use :visible
  `${selector}:visible`
  // Use nth
  `${selector}:nth-child(2)`;

// Get more specific (check Confluence)
```

### Issue: "Element not interactable"

**Solutions:**

```typescript
// Scroll into view
await element.scrollIntoViewIfNeeded();

// Wait for enabled
await page.waitForSelector(selector, { state: "visible" });

// Check overlays
await page.waitForSelector(".modal", { state: "hidden" });
```

---

## Validation Checklist

Before committing selector code:

- [ ] Selector documented in Confluence
- [ ] Used highest priority available (ID > data-id > name...)
- [ ] Tested uniqueness (`count() === 1`)
- [ ] Added to Page Object `selectors` object
- [ ] Documented special behavior (readonly, cascading, etc.)
- [ ] Added wait times if dynamic
- [ ] Error handling with screenshot
- [ ] Winston logging

---

## Workflow Integration

### When Creating Page Object

```typescript
// STEP 1: Check Confluence for module selectors
// STEP 2: Navigate to page in browser
// STEP 3: F12 → Inspect each element
// STEP 4: Find highest priority selector
// STEP 5: Add to Confluence if new
// STEP 6: Add to Page Object selectors object
// STEP 7: Never hardcode in methods
```

### When Selector Breaks

```
1. Check TMS release notes (UI change?)
2. Inspect element with F12 (new selector?)
3. Update Confluence entry with reason
4. Update Page Object
5. Run affected tests
6. Commit with "fix(selectors): updated X for TMS vY.Z"
```

---

## Related Skills

- **tms-dropdowns:** Using dropdown selectors (Bootstrap patterns)
- **tms-page-objects:** Organizing selectors in Page Objects
- **playwright (Anthropic):** General selector strategies

---

## Maintenance

### Update Triggers

- TMS UI update deployed
- Bootstrap version upgraded
- New module added
- Test failure due to selector

### Update Process

1. Identify changed selector (F12)
2. Update Confluence (reason, date)
3. Update affected Page Objects
4. Run affected tests
5. Update this skill if pattern changes
6. Git commit with selector change note

---

## Quick Reference Card

```
PRIORITY ORDER:
1. #id
2. [data-id="..."]
3. [name="..."]
4. [aria-label="..."]
5. .stable.classes

ALWAYS:
✅ Check Confluence first
✅ Use Page Object selectors object
✅ Document new selectors
✅ Log selector in error messages

NEVER:
❌ Hardcode in tests/methods
❌ Use XPath
❌ Use generic classes
❌ Skip Confluence
```

---

**Skill Version:** 1.1.0  
**Last Updated:** 2025-01-30  
**Scope:** Generic (ALL modules)  
**Status:** ✅ Active  
**Confluence:** https://bermann.atlassian.net/wiki/spaces/QA/folder/92831745?atlOrigin=eyJpIjoiNmNiNDVkMzBjMzQxNGVmYTk1ZjlkOTcwODAyYjQ5MGQiLCJwIjoiYyJ9
