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
    logger.info("Navegando a la página de creación de Cliente");
    await this.page.goto("/clientes/crear");
    await this.page.waitForLoadState("networkidle");
    const coreElement = this.page.locator(this.selectors.nombre);
    await coreElement.waitFor({ state: "visible" });
  }

  async fillNombre(nombre: string): Promise<void> {
    logger.info(`Completando nombre (razón social): ${nombre}`);
    await this.fill(this.selectors.nombre, nombre);
  }

  async fillRut(rut: string): Promise<void> {
    logger.info(`Completando RUT: ${rut}`);
    await this.fillRutWithVerify(this.selectors.rut, rut);
  }

  async fillNombreFantasia(nombreFantasia: string): Promise<void> {
    logger.info(`Completando nombre fantasía: ${nombreFantasia}`);
    await this.fill(this.selectors.nombreFantasia, nombreFantasia);
  }

  async fillCalle(calle: string): Promise<void> {
    logger.info(`Completando calle: ${calle}`);
    await this.fill(this.selectors.calle, calle);
  }

  async fillAltura(altura: string): Promise<void> {
    logger.info(`Completando altura: ${altura}`);
    await this.fill(this.selectors.altura, altura);
  }

  async fillOtros(otros: string): Promise<void> {
    logger.info(`Completando otros: ${otros}`);
    await this.fill(this.selectors.otros, otros);
  }

  async selectTipoCliente(tipo: string): Promise<void> {
    logger.info(`Seleccionando tipo de cliente: ${tipo}`);
    try {
      if (!(await this.isVisible(this.selectors.tipoClienteButton))) return;
      await this.click(this.selectors.tipoClienteButton, true);
      await this.page.waitForTimeout(500);

      const dropdownMenu = this.page.locator(".dropdown-menu.show").first();
      await dropdownMenu.waitFor({ state: "visible" });

      const option = dropdownMenu
        .locator(".dropdown-item")
        .filter({ hasText: tipo });
      await option.evaluate((node: HTMLElement) => node.click());
      logger.info(`✅ Tipo de cliente "${tipo}" seleccionado`);
    } catch (error) {
      logger.error(`Fallo al seleccionar tipo de cliente: ${tipo}`, error);
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
    logger.info('Seleccionando todos los Polígonos');
    try {
      // Scroll the Polígonos button into view first
      const button = this.page.locator(this.selectors.poligonosButton);
      if (!(await button.isVisible({ timeout: 3000 }).catch(() => false))) {
        logger.warn('⚠️ Dropdown de Polígonos no visible — saltando');
        return;
      }
      await button.evaluate((node: HTMLElement) => node.scrollIntoView({ block: 'center' })).catch(() => { });
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
        logger.info(`✅ Todos los Polígonos seleccionados: ${result.selected}/${result.total}`);
      } else {
        logger.warn(`⚠️ Problema en la selección de Polígonos: ${result.error}`);
      }

      await this.page.waitForTimeout(300);
    } catch (error) {
      logger.warn('⚠️ Fallo al seleccionar Polígonos — saltando con gracia', error);
    }
  }

  async clickGuardar(): Promise<void> {
    logger.info("Haciendo clic en el botón guardar");
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
      logger.error("Fallo al verificar si el formulario se guardó", error);
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
      await this.click(buttonSelector, true);
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
        logger.warn(`⚠️ No hay opciones de ${label} disponibles (count=${count})`);
        return { success: false };
      }

      const randomIndex = Math.floor(Math.random() * (count - 1)) + 1;
      const selected = options.nth(randomIndex);
      const text = await selected.textContent();
      await selected.evaluate((node: HTMLElement) => node.click());

      logger.info(`✅ ${label} aleatorio seleccionado: ${text?.trim()}`);
      if (cascadeWaitMs > 0) await this.page.waitForTimeout(cascadeWaitMs);
      return { success: true, selectedText: text?.trim() ?? "" };
    } catch (error) {
      // Close dropdown if still open
      await this.page.keyboard.press("Escape").catch(() => { });
      await this.page.waitForTimeout(300);
      logger.warn(`⚠️ Fallo al seleccionar ${label} aleatorio`, error);
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
      `🌍 Seleccionando ubicación aleatoria (Región → Ciudad → Comuna), máx ${maxRetries} intentos`,
    );

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      logger.info(`📍 Intento de ubicación ${attempt}/${maxRetries}`);

      // Step 1: Select Región
      const region = await this.trySelectRandomFromDropdown(
        this.selectors.regionButton,
        "región",
        800,
      );
      if (!region.success) {
        logger.error("❌ No hay opciones de región disponibles");
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
          `⚠️ No hay opciones de ciudad para la región "${region.selectedText}", reintentando con otra región...`,
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
          `⚠️ No hay opciones de comuna para la ciudad "${ciudad.selectedText}" (región: "${region.selectedText}"), reintentando...`,
        );
        continue;
      }

      // Success!
      logger.info(
        `✅ Ubicación seleccionada: ${region.selectedText} → ${ciudad.selectedText} → ${comuna.selectedText}`,
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
      logger.warn(`⚠️ Se encontraron ${count} error(es) de validación en el formulario`);
    }
    return count > 0;
  }
}
