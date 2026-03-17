import { BasePage } from '../../../core/BasePage.js';
import type { Locator, Page } from '@playwright/test';
import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('CrearCargaPage');

export type CargaEntityType =
  | 'unidadMedida'
  | 'categoriaCarga'
  | 'configuracionCarga'
  | 'contenidoCarga'
  | 'temperaturaCarga'
  | 'comercio'
  | 'tipoRampla';

export interface CargaEntitySeed {
  nombre: string;
  id: string | null;
  endpoint: string;
  createdAt: string;
}

export interface CargaSetupData {
  env: 'QA' | 'DEMO';
  createdAt: string;
  source: string;
  entities: Record<CargaEntityType, CargaEntitySeed>;
  tipoOperacion: {
    nombre: string;
    createdAt: string;
    source: string;
  };
}

export interface CrearCargaInput {
  unidadMedidaNombre: string;
  categoriaNombre: string;
  configuracionNombre: string;
  contenidoNombre: string;
  temperaturaNombre: string;
  comercioNombre: string;
  tipoRamplaNombre: string;
  tipoOperacionNombre: string;
  codigoCarga: string;
}

export interface CargaDropdownField {
  type: CargaEntityType;
  label: string;
  selector: string;
}

export const CARGA_DROPDOWN_FIELDS: readonly CargaDropdownField[] = [
  {
    type: 'unidadMedida',
    label: 'Unidad de Medida',
    selector: 'button[data-id="carga-unidad_medida_id"], button[data-id="carga-unidadmedida_id"]',
  },
  {
    type: 'categoriaCarga',
    label: 'Categoria Carga',
    selector: 'button[data-id="carga-categoria_carga_id"], button[data-id="carga-categoriacarga_id"]',
  },
  {
    type: 'configuracionCarga',
    label: 'Configuracion Carga',
    selector: 'button[data-id="carga-configuracion_carga_id"], button[data-id="carga-configuracioncarga_id"]',
  },
  {
    type: 'contenidoCarga',
    label: 'Contenido Carga',
    selector: 'button[data-id="carga-contenido_carga_id"], button[data-id="carga-contenidocarga_id"]',
  },
  {
    type: 'temperaturaCarga',
    label: 'Temperatura Carga',
    selector: 'button[data-id="carga-temperatura_carga_id"], button[data-id="carga-temperaturacarga_id"]',
  },
  {
    type: 'comercio',
    label: 'Comercio',
    selector: 'button[data-id="carga-comercio_id"]',
  },
  {
    type: 'tipoRampla',
    label: 'Tipo Rampla',
    selector: 'button[data-id="ramplas"], button[data-id="carga-tipo_rampla_id"], button[data-id="carga-tiporampla_id"]',
  },
];

export class CrearCargaPage extends BasePage {
  private readonly selectors = {
    tipoOperacion: 'button[data-id="operationTypeId"]',
    tipoOperacionProvidedCssFallback: "div[class='content-page'] li:nth-child(2) a:nth-child(1) span:nth-child(2)",
    codigoCarga: [
      '#carga-codigo',
      '#carga-codigo_carga',
      'input[name="Carga[codigo]"]',
      'input[name="Carga[codigo_carga]"]',
      'input[id*="carga-codigo"]',
    ],
    btnGuardar: [
      '#btn_guardar',
      '#btn_guardar_form',
      'button.btn-success:has-text("Guardar")',
      'button:has-text("Guardar")',
      'input[type="submit"][value*="Guardar"]',
    ],
    searchInputs: [
      '#search',
      'input[name="search"]',
      'input[type="search"]',
      'input[placeholder*="Buscar"]',
    ],
    searchButtons: [
      '#buscar',
      'a#buscar',
      'a:has-text("Buscar")',
      'button:has-text("Buscar")',
    ],
    tableRows: [
      '#tabla table tbody tr',
      '.grid-view table tbody tr',
      'table tbody tr',
    ],
  };

  constructor(page: Page) {
    super(page);
  }

  getDropdownFields(): readonly CargaDropdownField[] {
    return CARGA_DROPDOWN_FIELDS;
  }

  async navigateToCreate(): Promise<void> {
    logger.info('Navegando a la pagina de creacion de Carga');
    await this.page.goto('/carga/crear');
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForTimeout(1000);
  }

  async fillCodigoCarga(codigo: string): Promise<void> {
    logger.info(`Completando Codigo Carga: ${codigo}`);
    try {
      const input = await this.resolveFirstVisible(this.selectors.codigoCarga, 'Codigo Carga');
      await input.scrollIntoViewIfNeeded();
      await input.fill(codigo);
    } catch (error) {
      logger.error('Fallo al completar Codigo Carga', error);
      await this.takeScreenshot('carga-fill-codigo-error');
      throw error;
    }
  }

  async ensureTipoOperacionSelected(preferredText: string = 'defecto'): Promise<void> {
    const button = this.page.locator(this.selectors.tipoOperacion).first();
    const visible = await button.isVisible({ timeout: 1200 }).catch(() => false);
    if (!visible) {
      logger.warn('Tipo Operacion no visible; se omite seleccion explicita');
      return;
    }

    const currentSelectedTexts = await this.getSelectedDropdownTexts(this.selectors.tipoOperacion);
    const normalizedPreferred = this.normalize(preferredText);
    if (currentSelectedTexts.some((value) => this.normalize(value) === normalizedPreferred)) {
      logger.info(`Tipo Operacion ya seleccionado: ${preferredText}`);
      return;
    }

    try {
      await this.selectDropdownByText(this.selectors.tipoOperacion, preferredText, 'Tipo Operacion');
      const selectedTexts = await this.getSelectedDropdownTexts(this.selectors.tipoOperacion);
      if (selectedTexts.some((value) => this.normalize(value) === normalizedPreferred)) {
        return;
      }
    } catch (error) {
      logger.warn(`No fue posible seleccionar Tipo Operacion "${preferredText}", aplicando fallback: ${String(error)}`);
    }

    const selectedWithProvidedSelectors = await this.selectTipoOperacionWithProvidedSelectors(preferredText);
    if (selectedWithProvidedSelectors) {
      return;
    }

    const selectedFirst = await this.selectFirstOptionFromDropdown(this.selectors.tipoOperacion);
    const finalSelectedTexts = await this.getSelectedDropdownTexts(this.selectors.tipoOperacion);
    const finalSelected = selectedFirst && finalSelectedTexts.some((value) => this.normalize(value) === normalizedPreferred);
    if (!finalSelected) {
      await this.takeScreenshot('carga-tipo-operacion-error');
      throw new Error(`No fue posible seleccionar Tipo Operacion "${preferredText}"`);
    }
  }

  async saveCarga(): Promise<void> {
    logger.info('Guardando formulario de Carga');
    try {
      const button = await this.resolveFirstVisible(this.selectors.btnGuardar, 'Guardar');
      try {
        await button.click({ timeout: 5000 });
      } catch {
        await button.evaluate((el) => (el as HTMLElement).click());
      }
      await this.page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => {});
      await this.page.waitForTimeout(1200);
    } catch (error) {
      logger.error('Fallo al guardar Carga', error);
      await this.takeScreenshot('carga-save-error');
      throw error;
    }
  }

  async selectDropdownByText(
    dropdownSelector: string,
    optionText: string,
    fieldLabel: string,
  ): Promise<void> {
    const normalizedExpected = this.normalize(optionText);

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        logger.info(`Seleccionando ${fieldLabel}: "${optionText}" (intento ${attempt}/3)`);
        const button = await this.resolveDropdownButton(dropdownSelector, fieldLabel);
        await button.scrollIntoViewIfNeeded({ timeout: 1500 }).catch(async () => {
          await button.evaluate((el) => {
            (el as HTMLElement).scrollIntoView({ block: 'center' });
          }).catch(() => {});
        });

        const selectedDirect = await this.selectOptionViaUnderlyingSelect(button, optionText);
        if (selectedDirect) {
          await this.page.waitForTimeout(1000);
          return;
        }

        try {
          await button.click({ timeout: 4000, force: true });
        } catch {
          await button.evaluate((el) => (el as HTMLElement).click());
        }

        const container = button.locator('xpath=ancestor::div[contains(@class,"bootstrap-select")]').first();
        const openMenu = container.locator('.dropdown-menu.show').first();
        const globalOpenMenu = this.page.locator('.dropdown-menu.show').first();

        const usingLocalMenu = await openMenu.isVisible({ timeout: 2000 }).catch(() => false);
        const menu = usingLocalMenu ? openMenu : globalOpenMenu;

        await menu.waitFor({ state: 'visible', timeout: 5000 });

        const searchInput = menu.locator('.bs-searchbox input[type="text"]').first();
        if (await searchInput.isVisible({ timeout: 1000 }).catch(() => false)) {
          await searchInput.fill(optionText);
          await this.page.waitForTimeout(600);
        }

        const optionRegex = new RegExp(this.escapeRegex(optionText), 'i');
        const optionCandidates: Locator[] = [
          menu.locator('.dropdown-item').filter({ hasText: optionRegex }).first(),
          menu.locator('li:not(.disabled) a').filter({ hasText: optionRegex }).first(),
          this.page.locator('.dropdown-menu.show .dropdown-item').filter({ hasText: optionRegex }).first(),
        ];

        let optionClicked = false;
        for (const option of optionCandidates) {
          if (await option.isVisible({ timeout: 1200 }).catch(() => false)) {
            await option.scrollIntoViewIfNeeded().catch(() => {});
            try {
              await option.click({ timeout: 4000, force: true });
            } catch {
              await option.evaluate((el) => (el as HTMLElement).click());
            }
            optionClicked = true;
            break;
          }
        }

        if (!optionClicked) {
          const selectedFallback = await this.selectOptionViaUnderlyingSelect(button, optionText);
          if (selectedFallback) {
            await this.page.waitForTimeout(1000);
            return;
          }
          throw new Error(`No se encontro opcion visible para "${optionText}"`);
        }

        await this.page.waitForTimeout(1200);

        const selectedText = (await button.textContent()) ?? '';
        if (this.normalize(selectedText).includes(normalizedExpected)) {
          return;
        }

        const synced = await this.selectOptionViaUnderlyingSelect(button, optionText);

        await this.page.waitForTimeout(900);
        const selectedAfterSync = (await button.textContent()) ?? '';
        if (synced && this.normalize(selectedAfterSync).includes(normalizedExpected)) {
          return;
        }
      } catch (error) {
        logger.warn(`Seleccion de ${fieldLabel} fallo en intento ${attempt}: ${String(error)}`);
        await this.page.keyboard.press('Escape').catch(() => {});
        await this.page.waitForTimeout(600);
      }
    }

    await this.takeScreenshot(`carga-dropdown-${fieldLabel.toLowerCase().replace(/\s+/g, '-')}-error`);
    throw new Error(`No fue posible seleccionar "${optionText}" en ${fieldLabel}`);
  }

  async verifyInIndexByCodigo(codigo: string): Promise<boolean> {
    logger.info(`Verificando persistencia en /carga/index por codigo: ${codigo}`);

    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        await this.page.goto('/carga/index');
        await this.page.waitForLoadState('domcontentloaded');
        await this.page.waitForTimeout(1000);

        let filledSearch = false;
        for (const selector of this.selectors.searchInputs) {
          const input = this.page.locator(selector).first();
          if (await input.isVisible({ timeout: 1000 }).catch(() => false)) {
            await input.fill(codigo);
            filledSearch = true;
            break;
          }
        }

        if (filledSearch) {
          const clicked = await this.clickBuscarButton();
          if (!clicked) {
            await this.page.keyboard.press('Enter').catch(() => {});
          }
        }

        await this.page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
        await this.page.waitForTimeout(1200);

        for (const rowSelector of this.selectors.tableRows) {
          const row = this.page.locator(rowSelector).filter({ hasText: codigo }).first();
          if (await row.isVisible({ timeout: 2500 }).catch(() => false)) {
            return true;
          }
        }

        const textVisible = await this.page.getByText(codigo, { exact: false }).first()
          .isVisible({ timeout: 1500 })
          .catch(() => false);

        if (textVisible) {
          return true;
        }
      } catch (error) {
        logger.warn(`Intento ${attempt}/3 de verificacion en index fallo: ${String(error)}`);
      }

      await this.page.waitForTimeout(1200);
    }

    await this.takeScreenshot('carga-index-verify-error');
    return false;
  }

  private async resolveDropdownButton(dropdownSelector: string, fieldLabel: string): Promise<Locator> {
    const direct = this.page.locator(dropdownSelector).first();
    if (await direct.isVisible({ timeout: 1200 }).catch(() => false)) {
      return direct;
    }

    const labelContainerButton = await this.resolveContainerButtonByLabel(fieldLabel);
    if (labelContainerButton) {
      return labelContainerButton;
    }

    const dataIdFromLabel = await this.page.evaluate((label) => {
      const normalize = (value: string) =>
        value
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
          .trim();

      const expected = normalize(label);
      const possibleLabels = Array.from(
        document.querySelectorAll('label, .control-label, .col-form-label, span, strong'),
      );

      for (const node of possibleLabels) {
        const text = normalize(node.textContent ?? '');
        if (!text.includes(expected)) {
          continue;
        }

        const scope = node.closest('.form-group, .row, .col-md-12, .col-md-6, .col-md-4, .col-md-3') ?? node.parentElement;
        const button = scope?.querySelector('button.dropdown-toggle[data-id]') as HTMLElement | null;
        if (button?.getAttribute('data-id')) {
          return button.getAttribute('data-id');
        }
      }
      return null;
    }, fieldLabel);

    if (dataIdFromLabel) {
      const byDataId = this.page.locator(`button[data-id="${dataIdFromLabel}"]`).first();
      if (await byDataId.isVisible({ timeout: 1200 }).catch(() => false)) {
        return byDataId;
      }
    }

    throw new Error(`No se encontro dropdown visible para ${fieldLabel}`);
  }

  private async selectFirstOptionFromDropdown(dropdownSelector: string): Promise<boolean> {
    const button = this.page.locator(dropdownSelector).first();
    if (!(await button.isVisible({ timeout: 1200 }).catch(() => false))) {
      return false;
    }

    return button.evaluate((btn) => {
      const normalize = (value: string) =>
        value
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
          .trim();

      const bootstrapContainer = btn.closest('.bootstrap-select');
      const select = bootstrapContainer?.querySelector('select') as HTMLSelectElement | null;
      if (!select || !select.options.length) {
        return false;
      }

      const options = Array.from(select.options).filter((opt) => opt.value !== '');
      if (!options.length) {
        return false;
      }

      const first = options[0];
      if (select.multiple) {
        Array.from(select.options).forEach((opt) => { opt.selected = false; });
        first.selected = true;
      } else {
        select.value = first.value;
      }

      try {
        const w = window as unknown as {
          jQuery?: (el: Element) => { selectpicker?: (arg1: string, arg2?: string[] | string) => void };
          $?: (el: Element) => { selectpicker?: (arg1: string, arg2?: string[] | string) => void };
        };
        const jqFactory = w.jQuery ?? w.$;
        if (jqFactory) {
          const jq = jqFactory(select);
          jq.selectpicker?.('val', select.multiple ? [first.value] : first.value);
          jq.selectpicker?.('refresh');
          jq.selectpicker?.('render');
        }
      } catch {
        // noop
      }

      const visibleTextNode = bootstrapContainer?.querySelector('.filter-option-inner-inner, .filter-option') as HTMLElement | null;
      if (visibleTextNode) {
        visibleTextNode.textContent = (first.text || '').trim();
      }

      select.dispatchEvent(new Event('input', { bubbles: true }));
      select.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    });
  }

  private async hasDropdownSelection(dropdownSelector: string): Promise<boolean> {
    const button = this.page.locator(dropdownSelector).first();
    if (!(await button.isVisible({ timeout: 900 }).catch(() => false))) {
      return false;
    }

    return button.evaluate((btn) => {
      const normalize = (value: string) =>
        value
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
          .trim();

      const bootstrapContainer = btn.closest('.bootstrap-select');
      const select = bootstrapContainer?.querySelector('select') as HTMLSelectElement | null;
      if (!select) {
        return false;
      }

      const selectedOptions = Array.from(select.selectedOptions ?? []).filter((opt) => opt.value !== '');
      if (selectedOptions.length > 0) {
        return true;
      }

      return !select.multiple && normalize(select.value || '') !== '';
    });
  }

  private async getSelectedDropdownTexts(dropdownSelector: string): Promise<string[]> {
    const button = this.page.locator(dropdownSelector).first();
    if (!(await button.isVisible({ timeout: 900 }).catch(() => false))) {
      return [];
    }

    return button.evaluate((btn) => {
      const bootstrapContainer = btn.closest('.bootstrap-select');
      const select = bootstrapContainer?.querySelector('select') as HTMLSelectElement | null;
      if (!select) {
        return [];
      }

      return Array.from(select.selectedOptions ?? [])
        .filter((opt) => opt.value !== '')
        .map((opt) => (opt.text || '').trim())
        .filter((value) => value.length > 0);
    });
  }

  private async selectTipoOperacionWithProvidedSelectors(preferredText: string): Promise<boolean> {
    const candidates = [
      this.page.locator(`//span[normalize-space()="${preferredText}"]`).first(),
      this.page.locator("//span[normalize-space()='Qa_to_standard_11170']").first(),
      this.page.locator(this.selectors.tipoOperacionProvidedCssFallback).first(),
    ];

    for (const candidate of candidates) {
      const dropdownButton = this.page.locator(this.selectors.tipoOperacion).first();
      try {
        if (await dropdownButton.isVisible({ timeout: 1000 }).catch(() => false)) {
          await dropdownButton.click({ timeout: 3000, force: true }).catch(async () => {
            await dropdownButton.evaluate((el) => (el as HTMLElement).click());
          });
          await this.page.waitForTimeout(400);
        }

        if (!(await candidate.isVisible({ timeout: 1200 }).catch(() => false))) {
          continue;
        }

        await candidate.scrollIntoViewIfNeeded().catch(() => {});
        await candidate.click({ timeout: 3000, force: true }).catch(async () => {
          await candidate.evaluate((el) => (el as HTMLElement).click());
        });

        await this.page.waitForTimeout(1000);
        if (await this.hasDropdownSelection(this.selectors.tipoOperacion)) {
          return true;
        }
      } catch (error) {
        logger.warn(`Fallback de Tipo Operacion con selector provisto fallo: ${String(error)}`);
        await this.page.keyboard.press('Escape').catch(() => {});
        await this.page.waitForTimeout(300);
      }
    }

    return false;
  }

  private async selectOptionViaUnderlyingSelect(button: Locator, optionText: string): Promise<boolean> {
    return button.evaluate((btn, text) => {
      const normalize = (value: string) =>
        value
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .toLowerCase()
          .trim();

      const bootstrapContainer = btn.closest('.bootstrap-select');
      const select = bootstrapContainer?.querySelector('select') as HTMLSelectElement | null;
      if (!select) {
        return false;
      }

      const expected = normalize(text);
      const options = Array.from(select.options);
      const exact = options.find((opt) => normalize(opt.text) === expected);
      const contains = options.find((opt) => normalize(opt.text).includes(expected) || expected.includes(normalize(opt.text)));
      const target = exact ?? contains;
      if (!target) {
        return false;
      }

      if (select.multiple) {
        Array.from(select.options).forEach((opt) => {
          opt.selected = false;
        });
        target.selected = true;
      } else {
        select.value = target.value;
      }

      try {
        const w = window as unknown as {
          jQuery?: (el: Element) => { selectpicker?: (arg1: string, arg2?: string[] | string) => void };
          $?: (el: Element) => { selectpicker?: (arg1: string, arg2?: string[] | string) => void };
        };
        const jqFactory = w.jQuery ?? w.$;
        if (jqFactory) {
          const jq = jqFactory(select);
          jq.selectpicker?.('val', select.multiple ? [target.value] : target.value);
          jq.selectpicker?.('refresh');
          jq.selectpicker?.('render');
        }
      } catch {
        // noop
      }

      const visibleTextNode = bootstrapContainer?.querySelector('.filter-option-inner-inner, .filter-option') as HTMLElement | null;
      if (visibleTextNode) {
        visibleTextNode.textContent = (target.text || '').trim();
      }

      select.dispatchEvent(new Event('input', { bubbles: true }));
      select.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }, optionText);
  }

  private async resolveContainerButtonByLabel(fieldLabel: string): Promise<Locator | null> {
    const containers = [
      'div.form-group',
      'div.row',
      'div.col-md-12',
      'div.col-md-6',
      'div.col-md-4',
      'div.col-md-3',
    ];

    for (const containerSelector of containers) {
      const candidate = this.page
        .locator(containerSelector)
        .filter({ hasText: fieldLabel })
        .locator('button.dropdown-toggle')
        .first();

      if (await candidate.isVisible({ timeout: 800 }).catch(() => false)) {
        return candidate;
      }
    }

    return null;
  }

  private async resolveFirstVisible(selectors: string[], label: string): Promise<Locator> {
    for (const selector of selectors) {
      const locator = this.page.locator(selector).first();
      if (await locator.isVisible({ timeout: 1200 }).catch(() => false)) {
        return locator;
      }
    }

    throw new Error(`No se encontro elemento visible para "${label}"`);
  }

  private async clickBuscarButton(): Promise<boolean> {
    for (const selector of this.selectors.searchButtons) {
      const button = this.page.locator(selector).first();
      if (await button.isVisible({ timeout: 900 }).catch(() => false)) {
        try {
          await button.click({ timeout: 3000, force: true });
        } catch {
          await button.evaluate((el) => (el as HTMLElement).click());
        }
        return true;
      }
    }

    return this.page.evaluate(() => {
      const explicit = document.getElementById('buscar');
      if (explicit) {
        explicit.click();
        return true;
      }

      const candidate = Array.from(document.querySelectorAll('a, button'))
        .find((el) => el.textContent?.trim() === 'Buscar') as HTMLElement | undefined;
      if (candidate) {
        candidate.click();
        return true;
      }
      return false;
    });
  }

  private normalize(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
  }

  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
