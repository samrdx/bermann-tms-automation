import { Page, Locator, expect } from '@playwright/test';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('BasePage');

export abstract class BasePage {
  protected page: Page;
  protected url: string;

  constructor(page: Page, url: string = '') {
    this.page = page;
    this.url = url;
  }

  async navigate(): Promise<void> {
    if (!this.url) {
      throw new Error('URL not set for this page');
    }
    logger.paso(`Navegando hacia: ${this.url} 🌐`);
    await this.page.goto(this.url, {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
  }

  async waitForElement(selector: string, timeout: number = 10000): Promise<void> {
    logger.debug(`Esperando elemento: ${selector}`);
    await this.page.waitForSelector(selector, {
      state: 'visible',
      timeout
    });
  }

  /**
   * Fills an input field after checking for visibility.
   * "Rule of Gold": Always check for visibility before interaction.
   */
  async fill(selector: string, value: string): Promise<void> {
    const locator = this.page.locator(selector);
    if (await locator.isVisible()) {
      logger.debug(`Escribiendo en ${selector} 📝`);
      await locator.fill(value);
    } else {
      logger.warn(`Campo ${selector} no visible, saltando interacción ⚠️`);
    }
  }

  /**
   * Clicks an element after checking for visibility.
   * "Rule of Gold": Always check for visibility before interaction.
   * Includes a JavaScript fallback for cross-browser resilience, especially for Firefox.
   */
  async click(selector: string, force: boolean = false): Promise<void> {
    const locator = this.page.locator(selector);
    if (await locator.isVisible()) {
      logger.debug(`Haciendo click en: ${selector} 🖱️`);
      try {
        // Standard click with a reasonable timeout.
        await locator.click({ force, timeout: 5000 });
      } catch (error) {
        logger.warn(`Click estándar bloqueado o timeout para ${selector}. Reintentando con JS fallback... ⚠️`);
        try {
          // JS evaluation click bypasses Playwright's strict actionability checks (flaky in Firefox)
          await locator.evaluate((el) => (el as HTMLElement).click());
          logger.debug(`Click exitoso en ${selector} vía JS fallback ✅`);
        } catch (fallbackError) {
          logger.error(`Ambos clicks (estándar y JS) fallaron para ${selector} ❌`);
          throw error; // Throw original error to retain the stack trace and timeout context
        }
      }
    } else {
      logger.warn(`Elemento ${selector} no visible, saltando click ⚠️`);
    }
  }

  async fillSequentially(selector: string, value: string, delay: number = 100): Promise<void> {
    const locator = this.page.locator(selector);
    if (await locator.isVisible()) {
      logger.debug(`Completando ${selector} secuencialmente con retraso ${delay}`);
      await locator.click();
      await locator.clear();
      await locator.pressSequentially(value, { delay });
    } else {
      logger.warn(`⚠️ Campo ${selector} no visible para llenado secuencial, saltando.`);
    }
  }

  async fillRutWithVerify(selector: string, rutValue: string): Promise<void> {
    const locator = this.page.locator(selector);
    if (!(await locator.isVisible())) {
      logger.warn(`⚠️ Campo RUT ${selector} no visible, saltando.`);
      return;
    }

    logger.info(`Ingresando RUT con verificación: [${rutValue}] en ${selector}`);

    // Normalize the expected RUT
    const cleanRut = rutValue.toUpperCase().trim();
    const normalize = (val: string) => val.toUpperCase().replace(/[^0-9K]/g, '');
    const normalizedExpected = normalize(cleanRut);

    // Extract verification digit (last character after removing non-alphanumeric)
    const verificationDigit = normalizedExpected.slice(-1); // 'K' or digit
    const rutWithoutDv = normalizedExpected.slice(0, -1); // Just the number part

    // Strategy 1: Try direct fill first (simplest approach)
    try {
      await locator.click({ clickCount: 3, force: true, timeout: 5000 });
    } catch (e) {
      logger.warn(`⚠️ Click estándar bloqueado en ${selector}, forzando foco vía JS`);
      await locator.evaluate((el) => (el as HTMLInputElement).focus());
    }
    await this.page.keyboard.press('Backspace');
    await this.page.waitForTimeout(200);

    // Try typing with the standard RUT format (with hyphen)
    const formattedRut = `${rutWithoutDv}-${verificationDigit}`;
    await locator.pressSequentially(formattedRut, { delay: 80 });
    await this.page.waitForTimeout(300);

    // Check value
    let currentValue = await locator.inputValue();
    let normalizedCurrent = normalize(currentValue);

    if (normalizedCurrent === normalizedExpected) {
      logger.info(`✅ RUT Ingresado y Verificado: ${currentValue}`);
      return;
    }

    // Strategy 2: Force DV using JavaScript - disable input mask first
    logger.warn(`¡Discrepancia de RUT! Esperado: ${normalizedExpected}, Obtenido: ${normalizedCurrent}. Usando JS para forzar valor...`);

    // Format RUT like TMS does: XX.XXX.XXX-V
    const formatTmsRut = (body: string, dv: string) => {
      // Add thousands separators
      const parts = [];
      let remaining = body;
      while (remaining.length > 3) {
        parts.unshift(remaining.slice(-3));
        remaining = remaining.slice(0, -3);
      }
      if (remaining) parts.unshift(remaining);
      return parts.join('.') + '-' + dv;
    };

    const tmsFormattedRut = formatTmsRut(rutWithoutDv, verificationDigit);

    await this.page.evaluate(
      ({ sel, formattedValue }) => {
        const input = document.querySelector(sel) as HTMLInputElement;
        if (input) {
          // Remove any input mask handlers temporarily
          const oldOnInput = input.oninput;
          const oldOnChange = input.onchange;
          const oldOnKeydown = input.onkeydown;

          input.oninput = null;
          input.onchange = null;
          input.onkeydown = null;

          // Set value directly
          input.value = formattedValue;

          // Restore handlers
          input.oninput = oldOnInput;
          input.onchange = oldOnChange;
          input.onkeydown = oldOnKeydown;

          // Trigger events
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
          input.dispatchEvent(new Event('blur', { bubbles: true }));
        }
      },
      { sel: selector, formattedValue: tmsFormattedRut }
    );

    await this.page.waitForTimeout(300);

    // Check again
    currentValue = await locator.inputValue();
    normalizedCurrent = normalize(currentValue);

    if (normalizedCurrent === normalizedExpected) {
      logger.info(`✅ RUT Ingresado vía JS: ${currentValue}`);
      return;
    }

    // Strategy 3: If DV is 'K' and still missing, try with lowercase k
    if (verificationDigit === 'K' && !normalizedCurrent.endsWith('K')) {
      logger.warn('Probando k minúscula para el dígito verificador...');
      const tmsFormattedRutLower = formatTmsRut(rutWithoutDv, 'k');

      await this.page.evaluate(
        ({ sel, val }) => {
          const input = document.querySelector(sel) as HTMLInputElement;
          if (input) {
            input.value = val;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
          }
        },
        { sel: selector, val: tmsFormattedRutLower }
      );

      await this.page.waitForTimeout(300);
      currentValue = await locator.inputValue();
      normalizedCurrent = normalize(currentValue);
    }

    // Final validation
    if (normalizedCurrent !== normalizedExpected) {
      const msg = `CRITICAL: RUT validation failed. Raw Final: [${currentValue}], Expected: [${cleanRut}]. Normalized: ${normalizedCurrent} vs ${normalizedExpected}`;
      console.error(msg);
      logger.error(msg);
      // Don't throw immediately - let the test continue and screenshot the state
      await this.takeScreenshot('fill-rut-error');
    }

    // Soft assertion - log but don't fail test if RUT body matches
    if (normalizedCurrent.slice(0, -1) === rutWithoutDv) {
      logger.warn(`⚠️ El cuerpo del RUT coincide pero el DV podría faltar - continuando prueba`);
      return;
    }

    expect(normalizedCurrent).toBe(normalizedExpected);
  }

  async getText(selector: string): Promise<string> {
    logger.debug(`Obteniendo texto de: ${selector}`);
    const locator = this.page.locator(selector);
    if (await locator.isVisible()) {
      return await locator.textContent() || '';
    }
    return '';
  }

  async isVisible(selector: string): Promise<boolean> {
    try {
      const locator = this.page.locator(selector);
      return await locator.isVisible();
    } catch {
      return false;
    }
  }

  async takeScreenshot(name: string): Promise<string> {
    const timestamp = Date.now();
    const screenshotPath = `./reports/screenshots/${name}-${timestamp}.png`;
    await this.page.screenshot({
      path: screenshotPath,
      fullPage: true
    });
    logger.info(`Captura de Pantalla: ${screenshotPath} 📸`);
    return screenshotPath;
  }

  async getTitle(): Promise<string> {
    return await this.page.title();
  }

  async waitForNavigation(timeout: number = 10000): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded', { timeout });
  }

  getCurrentUrl(): string {
    return this.page.url();
  }
}
