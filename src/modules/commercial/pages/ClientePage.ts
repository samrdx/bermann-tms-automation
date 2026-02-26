import { BasePage } from "../../../core/BasePage.js";
import type { Page } from "playwright";
import { createLogger } from "../../../utils/logger.js";
import { expect } from "@playwright/test";
import { isDemoMode } from "../../../utils/env-helper.js";

const logger = createLogger("ClienteFormPage");

export class ClienteFormPage extends BasePage {
  private readonly selectors = {
    // Form fields
    nombre: "#clientes-nombre", // Razón social
    rut: "#clientes-rut",
    nombreFantasia: "#clientes-nombre_fantasia",
    calle: "#clientes-calle",
    altura: "#clientes-altura",
    otros: "#clientes-otros",

    // Dropdowns (Bootstrap Select triggers)
    tipoClienteButton: 'button[data-id="clientes-tipo_cliente_id"]',
    regionButton: 'button[data-id="clientes-region_id"]',
    ciudadButton: 'button[data-id="clientes-ciudad_id"]',
    comunaButton: 'button[data-id="clientes-comuna_id"]',
    poligonosButton: 'button[data-id="drop_zones"]',
    transportistasButton: 'button[data-id="carriers"]',

    // Actions
    btnGuardar: "#btn_guardar",

    // Validation
    invalidField: '[aria-invalid="true"]',
  };

  constructor(page: Page) {
    super(page);
  }

  async navigate(): Promise<void> {
    logger.info("Navigating to Cliente creation page");
    await this.page.goto("/clientes/crear");
    await this.page.waitForLoadState("networkidle");
    const coreElement = this.page.locator(this.selectors.nombre);
    await coreElement.waitFor({ state: "visible" });
  }

  async fillNombre(nombre: string): Promise<void> {
    logger.info(`Filling nombre (razón social): ${nombre}`);
    await this.fill(this.selectors.nombre, nombre);
  }

  async fillRut(rut: string): Promise<void> {
    logger.info(`Filling RUT: ${rut}`);
    await this.fillRutWithVerify(this.selectors.rut, rut);
  }

  async fillNombreFantasia(nombreFantasia: string): Promise<void> {
    logger.info(`Filling nombre fantasia: ${nombreFantasia}`);
    await this.fill(this.selectors.nombreFantasia, nombreFantasia);
  }

  async fillCalle(calle: string): Promise<void> {
    logger.info(`Filling calle: ${calle}`);
    await this.fill(this.selectors.calle, calle);
  }

  async fillAltura(altura: string): Promise<void> {
    logger.info(`Filling altura: ${altura}`);
    await this.fill(this.selectors.altura, altura);
  }

  async fillOtros(otros: string): Promise<void> {
    logger.info(`Filling otros: ${otros}`);
    await this.fill(this.selectors.otros, otros);
  }

  async selectTipoCliente(tipo: string): Promise<void> {
    logger.info(`Selecting tipo cliente: ${tipo}`);
    try {
      if (!(await this.isVisible(this.selectors.tipoClienteButton))) return;
      await this.page.click(this.selectors.tipoClienteButton);
      await this.page.waitForTimeout(500);

      const dropdownMenu = this.page.locator(".dropdown-menu.show").first();
      await dropdownMenu.waitFor({ state: "visible" });

      const option = dropdownMenu
        .locator(".dropdown-item")
        .filter({ hasText: tipo });
      await option.click();
      logger.info(`✅ Tipo cliente "${tipo}" selected`);
    } catch (error) {
      logger.error(`Failed to select tipo cliente: ${tipo}`, error);
      await this.takeScreenshot("select-tipo-cliente-error");
      throw error;
    }
  }

  /**
   * Selects all available Polígonos via "Seleccionar Todos" button.
   * Uses page.evaluate() because Playwright's accessibility-based locators
   * don't trigger Bootstrap Select's JS dropdown rendering properly.
   * The proven approach: open dropdown → click bs-select-all → close dropdown.
   */
  async selectAllPoligonos(): Promise<void> {
    logger.info('Selecting all Polígonos');
    try {
      // Scroll the Polígonos button into view first
      const button = this.page.locator(this.selectors.poligonosButton);
      if (!(await button.isVisible({ timeout: 3000 }).catch(() => false))) {
        logger.warn('⚠️ Polígonos dropdown not visible — skipping');
        return;
      }
      await button.scrollIntoViewIfNeeded();
      await this.page.waitForTimeout(300);

      // Use page.evaluate to interact with Bootstrap Select DOM directly
      const result = await this.page.evaluate(() => {
        const select = document.querySelector('#drop_zones') as HTMLSelectElement | null;
        if (!select) return { success: false, error: 'select#drop_zones not found', selected: 0, total: 0 };

        const container = select.closest('.bootstrap-select') as HTMLElement | null;
        if (!container) return { success: false, error: '.bootstrap-select container not found', selected: 0, total: 0 };

        // Open the dropdown
        const toggleBtn = container.querySelector('button.dropdown-toggle') as HTMLButtonElement | null;
        if (!toggleBtn) return { success: false, error: 'dropdown-toggle not found', selected: 0, total: 0 };
        toggleBtn.click();

        // Click "Seleccionar Todos"
        const selectAllBtn = container.querySelector('button.bs-select-all') as HTMLButtonElement | null;
        if (!selectAllBtn) {
          toggleBtn.click(); // close
          return { success: false, error: 'bs-select-all button not found', selected: 0, total: 0 };
        }
        selectAllBtn.click();

        // Close the dropdown
        toggleBtn.click();

        // Verify
        const selectedCount = select.querySelectorAll('option:checked').length;
        const totalCount = select.querySelectorAll('option').length;

        return { success: true, error: null, selected: selectedCount, total: totalCount };
      });

      if (result.success) {
        logger.info(`✅ All Polígonos selected: ${result.selected}/${result.total}`);
      } else {
        logger.warn(`⚠️ Polígonos selection issue: ${result.error}`);
      }

      await this.page.waitForTimeout(300);
    } catch (error) {
      logger.warn('⚠️ Failed to select Polígonos — skipping gracefully', error);
    }
  }

  async clickGuardar(): Promise<void> {
    logger.info("Clicking save button");
    await this.click(this.selectors.btnGuardar);
  }

  async isFormSaved(): Promise<boolean> {
    try {
      await this.page.waitForTimeout(2000);
      const url = this.page.url();
      return (
        url.includes("/clientes/index") ||
        url.includes("/clientes/ver") ||
        url.includes("/clientes/view")
      );
    } catch (error) {
      logger.error("Failed to check if form saved", error);
      return false;
    }
  }

  // ── Internal helpers that return success booleans ──

  private async trySelectRandomFromDropdown(
    buttonSelector: string,
    label: string,
    cascadeWaitMs = 0,
  ): Promise<{ success: boolean; selectedText?: string }> {
    try {
      if (!(await this.isVisible(buttonSelector))) return { success: false };
      await this.page.click(buttonSelector);
      await this.page.waitForTimeout(500);

      const dropdownMenu = this.page
        .locator(".dropdown-menu.show:not(.inner)")
        .first();
      await dropdownMenu.waitFor({ state: "visible", timeout: 5000 });

      const options = dropdownMenu.locator(".dropdown-item");
      const count = await options.count();

      if (count <= 1) {
        // Close the dropdown before returning so the page state is clean
        await this.page.keyboard.press("Escape");
        await this.page.waitForTimeout(300);
        logger.warn(`⚠️ No ${label} options available (count=${count})`);
        return { success: false };
      }

      const randomIndex = Math.floor(Math.random() * (count - 1)) + 1;
      const selected = options.nth(randomIndex);
      const text = await selected.textContent();
      await selected.click();

      logger.info(`✅ Random ${label} selected: ${text?.trim()}`);
      if (cascadeWaitMs > 0) await this.page.waitForTimeout(cascadeWaitMs);
      return { success: true, selectedText: text?.trim() ?? "" };
    } catch (error) {
      // Close dropdown if still open
      await this.page.keyboard.press("Escape").catch(() => {});
      await this.page.waitForTimeout(300);
      logger.warn(`⚠️ Failed to select random ${label}`, error);
      return { success: false };
    }
  }

  // ── Public cascading location selector with retry ──

  /**
   * Selects a valid Región → Ciudad → Comuna combination.
   * If no Comunas are available for a given Ciudad, it retries
   * with a different Ciudad. If no Ciudades work, it retries
   * with a different Región. Up to `maxRetries` total attempts.
   */
  async selectRandomLocationCascade(maxRetries = 5): Promise<void> {
    logger.info(
      `🌍 Selecting random location (Región → Ciudad → Comuna), max ${maxRetries} attempts`,
    );

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      logger.info(`📍 Location attempt ${attempt}/${maxRetries}`);

      // Step 1: Select Región
      const region = await this.trySelectRandomFromDropdown(
        this.selectors.regionButton,
        "región",
        800,
      );
      if (!region.success) {
        logger.error("❌ No region options available at all");
        await this.takeScreenshot("select-location-no-regions");
        throw new Error("No region options available");
      }

      // Step 2: Select Ciudad
      const ciudad = await this.trySelectRandomFromDropdown(
        this.selectors.ciudadButton,
        "ciudad",
        800,
      );
      if (!ciudad.success) {
        logger.warn(
          `⚠️ No ciudad options for región "${region.selectedText}", retrying with another región...`,
        );
        continue;
      }

      // Step 3: Select Comuna
      const comuna = await this.trySelectRandomFromDropdown(
        this.selectors.comunaButton,
        "comuna",
      );
      if (!comuna.success) {
        logger.warn(
          `⚠️ No comuna options for ciudad "${ciudad.selectedText}" (región: "${region.selectedText}"), retrying...`,
        );
        continue;
      }

      // Success!
      logger.info(
        `✅ Location selected: ${region.selectedText} → ${ciudad.selectedText} → ${comuna.selectedText}`,
      );
      return;
    }

    // All retries exhausted
    await this.takeScreenshot("select-location-all-retries-failed");
    throw new Error(
      `Failed to find a valid Región → Ciudad → Comuna combination after ${maxRetries} attempts`,
    );
  }

  // ── Public convenience methods (backward compatible) ──

  async selectRandomRegion(): Promise<void> {
    const result = await this.trySelectRandomFromDropdown(
      this.selectors.regionButton,
      "región",
      800,
    );
    if (!result.success) {
      await this.takeScreenshot("select-random-region-error");
      throw new Error("No region options available");
    }
  }

  async selectRandomCiudad(): Promise<void> {
    const result = await this.trySelectRandomFromDropdown(
      this.selectors.ciudadButton,
      "ciudad",
      800,
    );
    if (!result.success) {
      await this.takeScreenshot("select-random-ciudad-error");
      throw new Error("No ciudad options available");
    }
  }

  async selectRandomComuna(): Promise<void> {
    const result = await this.trySelectRandomFromDropdown(
      this.selectors.comunaButton,
      "comuna",
    );
    if (!result.success) {
      await this.takeScreenshot("select-random-comuna-error");
      throw new Error("No comuna options available");
    }
  }

  async hasValidationErrors(): Promise<boolean> {
    const invalidFields = this.page.locator(this.selectors.invalidField);
    const count = await invalidFields.count();
    if (count > 0) {
      logger.warn(`⚠️ Found ${count} validation error(s) on form`);
    }
    return count > 0;
  }
}
