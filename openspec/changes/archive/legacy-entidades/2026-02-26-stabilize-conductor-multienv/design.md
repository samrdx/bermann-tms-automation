# Design: Conductor Stabilization

## Hybrid Interaction Pattern
To ensure the Bootstrap Select dropdowns work reliably across QA and Demo, we will use the `page.evaluate()` pattern to trigger the dropdown open/selection, as this avoids rendering delays and locator instability.

### Selection Logic
```typescript
private async selectFromBootstrapDropdown(
  selectSelector: string,
  optionText: string,
  useSearch: boolean = false
): Promise<void> {
  // 1. JS-level interaction to open the menu
  await this.page.evaluate(({ selectSelector }) => {
    const select = document.querySelector(selectSelector);
    const container = select.closest('.bootstrap-select');
    container.querySelector('button.dropdown-toggle').click();
  }, { selectSelector });

  // 2. Playwright-level interaction for the rest
  if (useSearch) {
    // Fill searchbox if enabled
  }
  // Click option
}
```

## Data Persistence Strategy
The `conductor-crear.test.ts` must capture the random data generated (RUT, Names, etc.) before the page redirection.

```typescript
// Phase: Pre-calculation
const expectedNombre = await page.locator('#conductores-nombre').inputValue();

// Phase: Action
await page.click('#btn_guardar');

// Phase: Persistence
data.seededConductor = { nombre: expectedNombre, ... };
```
