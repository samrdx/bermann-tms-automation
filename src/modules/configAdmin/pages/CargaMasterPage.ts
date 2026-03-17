import { BasePage } from '../../../core/BasePage.js';
import type { Locator, Page } from '@playwright/test';
import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('CargaMasterPage');

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

interface CargaEntityConfig {
  type: CargaEntityType;
  label: string;
  fieldLabel: string;
  createPathCandidates: string[];
  indexPath: string;
  primaryFieldSelectors: string[];
}

const ENTITY_CONFIG: Record<CargaEntityType, CargaEntityConfig> = {
  unidadMedida: {
    type: 'unidadMedida',
    label: 'Unidad de Medida',
    fieldLabel: 'nombre',
    createPathCandidates: ['/unidadmedida/crear', '/unidadmedida/index'],
    indexPath: '/unidadmedida/index',
    primaryFieldSelectors: [
      '#unidadmedida-nombre',
      'input[name*="unidadmedida"][name*="[nombre]"]',
    ],
  },
  categoriaCarga: {
    type: 'categoriaCarga',
    label: 'Categoria Carga',
    fieldLabel: 'nombre',
    createPathCandidates: ['/categoriacarga/crear', '/categoriacarga/index'],
    indexPath: '/categoriacarga/index',
    primaryFieldSelectors: [
      '#categoriacarga-nombre',
      'input[name*="categoriacarga"][name*="[nombre]"]',
    ],
  },
  configuracionCarga: {
    type: 'configuracionCarga',
    label: 'Configuracion Carga',
    fieldLabel: 'nombre',
    createPathCandidates: ['/configuracioncarga/crear', '/configuracioncarga/index'],
    indexPath: '/configuracioncarga/index',
    primaryFieldSelectors: [
      '#configuracioncarga-nombre',
      'input[name*="configuracioncarga"][name*="[nombre]"]',
    ],
  },
  contenidoCarga: {
    type: 'contenidoCarga',
    label: 'Contenido Carga',
    fieldLabel: 'nombre',
    createPathCandidates: ['/contenidocarga/index', '/contenidocarga/crear'],
    indexPath: '/contenidocarga/index',
    primaryFieldSelectors: [
      '#contenidocarga-nombre',
      'input[name*="contenidocarga"][name*="[nombre]"]',
    ],
  },
  temperaturaCarga: {
    type: 'temperaturaCarga',
    label: 'Temperatura Carga',
    fieldLabel: 'nombre',
    createPathCandidates: ['/temperaturacarga/index', '/temperaturacarga/crear'],
    indexPath: '/temperaturacarga/index',
    primaryFieldSelectors: [
      '#temperaturacarga-nombre',
      'input[name*="temperaturacarga"][name*="[nombre]"]',
    ],
  },
  comercio: {
    type: 'comercio',
    label: 'Comercio',
    fieldLabel: 'nombre',
    createPathCandidates: ['/comercio/crear', '/comercio/index'],
    indexPath: '/comercio/index',
    primaryFieldSelectors: [
      '#comercio-nombre',
      'input[name*="comercio"][name*="[nombre]"]',
    ],
  },
  tipoRampla: {
    type: 'tipoRampla',
    label: 'Tipo Rampla',
    fieldLabel: 'tipo',
    createPathCandidates: ['/tiporampla/crear', '/tiporampla/index'],
    indexPath: '/tiporampla/index',
    primaryFieldSelectors: [
      '#tiporampla-tipo',
      'input[name*="tiporampla"][name*="[tipo]"]',
    ],
  },
};

/**
 * Generic Page Object for Carga-related master entities that share
 * a "Nombre + Guardar" behavior.
 */
export class CargaMasterPage extends BasePage {
  private readonly selectors = {
    genericNombre: [
      '#nombre',
      'input[id$="-nombre"]',
      'input[id*="nombre"]',
      'input[name*="[nombre]"]',
      'input[name*="nombre"]',
      'input[placeholder*="Nombre"]',
    ],
    createButtons: [
      'a[href*="/crear"]',
      'a.btn-success:has-text("Crear")',
      'a:has-text("Crear")',
      'a:has-text("Nuevo")',
      'button:has-text("Crear")',
      '#btn_crear',
    ],
    saveButtons: [
      '#btn_guardar',
      'button.btn-success:has-text("Guardar")',
      'button:has-text("Guardar")',
      'input[type="submit"][value*="Guardar"]',
    ],
    searchInputs: ['#search', 'input[name="search"]', 'input[placeholder*="Buscar"]'],
    searchButtons: ['#buscar', 'a#buscar', 'a:has-text("Buscar")', 'button:has-text("Buscar")'],
    tableRows: ['#tabla table tbody tr', 'table tbody tr', '.grid-view table tbody tr'],
  };

  constructor(page: Page) {
    super(page);
  }

  getEntityLabel(entityType: CargaEntityType): string {
    return ENTITY_CONFIG[entityType].label;
  }

  async createEntity(entityType: CargaEntityType, nombre: string): Promise<CargaEntitySeed> {
    const config = ENTITY_CONFIG[entityType];
    logger.info(`Iniciando creacion de "${config.label}" con nombre: ${nombre}`);

    try {
      await this.openCreateForm(config);
      await this.fillPrimaryField(config, nombre);
      await this.clickGuardar(config.label);

      const idFromUrl = this.extractIdFromUrl(this.page.url());
      if (idFromUrl) {
        logger.info(`ID detectado en URL para ${config.label}: ${idFromUrl}`);
      }
      const gridResult = await this.verifyInIndex(config, nombre);
      if (!gridResult.found && !idFromUrl) {
        throw new Error(`No se encontro "${nombre}" en la grilla de ${config.label}`);
      }
      if (!gridResult.found && idFromUrl) {
        logger.warn(
          `${config.label}: no se encontro fila en grilla, pero se confirma guardado por URL con ID ${idFromUrl}`,
        );
      }

      return {
        nombre,
        id: idFromUrl ?? gridResult.id ?? null,
        endpoint: config.indexPath,
        createdAt: new Date().toISOString(),
      };
    } catch (error) {
      logger.error(`Fallo en creacion de ${config.label}`, error);
      await this.takeScreenshot(`${config.type}-create-error`);
      throw error;
    }
  }

  private async openCreateForm(config: CargaEntityConfig): Promise<void> {
    for (const path of config.createPathCandidates) {
      logger.info(`Navegando a ruta candidata para ${config.label}: ${path}`);
      await this.page.goto(path);
      await this.page.waitForLoadState('domcontentloaded');
      await this.page.waitForTimeout(800);

      if (await this.isPrimaryFieldVisible(config)) {
        return;
      }

      await this.openCreateFromIndex();
      if (await this.isPrimaryFieldVisible(config)) {
        return;
      }
    }

    throw new Error(`No fue posible abrir el formulario de creacion para ${config.label}`);
  }

  private async fillPrimaryField(config: CargaEntityConfig, value: string): Promise<void> {
    const input = await this.resolvePrimaryFieldInput(config);
    await input.scrollIntoViewIfNeeded();
    await input.fill(value);
    logger.info(`Campo "${config.fieldLabel}" completado para ${config.label}: ${value}`);
  }

  private async clickGuardar(entityLabel: string): Promise<void> {
    for (const selector of this.selectors.saveButtons) {
      const button = this.page.locator(selector).first();
      const isVisible = await button.isVisible({ timeout: 1200 }).catch(() => false);
      if (!isVisible) {
        continue;
      }

      try {
        await button.click({ timeout: 5000 });
      } catch {
        await button.evaluate((el) => (el as HTMLElement).click());
      }

      await this.page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {
        logger.warn(`Guardado de ${entityLabel}: networkidle no detectado, continuando con verificacion en index`);
      });
      await this.page.waitForTimeout(1200);
      return;
    }

    throw new Error(`No se encontro boton Guardar visible para ${entityLabel}`);
  }

  private async openCreateFromIndex(): Promise<void> {
    for (const selector of this.selectors.createButtons) {
      const button = this.page.locator(selector).first();
      const isVisible = await button.isVisible({ timeout: 1200 }).catch(() => false);
      if (!isVisible) {
        continue;
      }

      logger.info(`Abriendo formulario via boton crear: ${selector}`);
      try {
        await button.click({ timeout: 4000 });
      } catch {
        await button.evaluate((el) => (el as HTMLElement).click());
      }
      await this.page.waitForLoadState('domcontentloaded').catch(() => {});
      await this.page.waitForTimeout(900);
      return;
    }
  }

  private async verifyInIndex(
    config: CargaEntityConfig,
    nombre: string,
  ): Promise<{ found: boolean; id: string | null }> {
    logger.info(`Verificando ${config.label} en index: ${nombre}`);
    await this.navigateToIndexWithRetry(config.indexPath, config.label);

    for (let attempt = 1; attempt <= 4; attempt++) {
      await this.searchByNombre(nombre);

      const rowInCurrentPage = await this.findMatchingRow(nombre);
      if (rowInCurrentPage) {
        const id = await this.extractIdFromRow(rowInCurrentPage);
        logger.info(`Registro validado en index para ${config.label}. ID detectado: ${id ?? 'N/A'}`);
        return { found: true, id };
      }

      const rowInPagination = await this.findMatchingRowInPagination(nombre);
      if (rowInPagination) {
        const id = await this.extractIdFromRow(rowInPagination);
        logger.info(`Registro validado en paginacion para ${config.label}. ID detectado: ${id ?? 'N/A'}`);
        return { found: true, id };
      }

      const textVisible = await this.page.getByText(nombre, { exact: false }).first()
        .isVisible({ timeout: 2000 })
        .catch(() => false);
      if (textVisible) {
        return { found: true, id: null };
      }

      if (attempt < 4) {
        logger.warn(
          `${config.label}: entidad "${nombre}" aun no visible en index (intento ${attempt}/4). Reintentando...`,
        );
        await this.page.waitForTimeout(1500);
        await this.page.reload({ waitUntil: 'domcontentloaded' }).catch(() => {});
        await this.page.waitForTimeout(600);
      }
    }

    return { found: false, id: null };
  }

  private async findMatchingRow(nombre: string): Promise<Locator | null> {
    for (const rowSelector of this.selectors.tableRows) {
      const row = this.page.locator(rowSelector).filter({ hasText: nombre }).first();
      const isVisible = await row.isVisible({ timeout: 1200 }).catch(() => false);
      if (!isVisible) {
        continue;
      }
      const id = await this.extractIdFromRow(row);
      if (id) {
        logger.debug(`Fila candidata encontrada para ${nombre} con ID: ${id}`);
      }
      return row;
    }

    return null;
  }

  private async findMatchingRowInPagination(nombre: string): Promise<Locator | null> {
    const nextCandidates = [
      this.page.getByRole('link', { name: /siguiente|next/i }).first(),
      this.page.locator('a.page-link.next').first(),
      this.page.locator('.pagination .page-link.next').first(),
    ];

    for (let pageAttempt = 0; pageAttempt < 20; pageAttempt++) {
      let nextLink: Locator | null = null;
      for (const candidate of nextCandidates) {
        const visible = await candidate.isVisible({ timeout: 1000 }).catch(() => false);
        if (visible) {
          nextLink = candidate;
          break;
        }
      }

      if (!nextLink) {
        break;
      }

      const nextVisible = await nextLink.isVisible({ timeout: 1000 }).catch(() => false);
      if (!nextVisible) {
        break;
      }

      const className = (await nextLink.getAttribute('class'))?.toLowerCase() ?? '';
      const ariaDisabled = (await nextLink.getAttribute('aria-disabled'))?.toLowerCase() ?? '';
      const parentClassName = ((await nextLink.locator('xpath=..').first().getAttribute('class'))
        ?.toLowerCase()) ?? '';
      if (className.includes('disabled') || parentClassName.includes('disabled') || ariaDisabled === 'true') {
        break;
      }

      await nextLink.click({ force: true }).catch(async () => {
        await nextLink?.evaluate((el) => (el as HTMLElement).click());
      });
      await this.page.waitForLoadState('networkidle', { timeout: 6000 }).catch(() => {});
      await this.page.waitForTimeout(700);

      const row = await this.findMatchingRow(nombre);
      if (row) {
        return row;
      }
    }
    return null;
  }

  private async searchByNombre(nombre: string): Promise<void> {
    let anyInputFilled = false;
    const searchCandidates = [...this.selectors.searchInputs, 'input[type="search"]'];

    for (const selector of searchCandidates) {
      const input = this.page.locator(selector).first();
      const isVisible = await input.isVisible({ timeout: 1200 }).catch(() => false);
      if (isVisible) {
        await input.fill(nombre);
        anyInputFilled = true;
      }
    }

    if (!anyInputFilled) {
      logger.warn(`No se encontro input de busqueda visible para filtrar "${nombre}"`);
    }

    const clicked = await this.clickBuscarButton();
    if (!clicked && !anyInputFilled) {
      logger.warn('No se detecto boton Buscar; se continua con validacion directa de grilla');
    }

    await this.page.locator('#modalCargando').waitFor({ state: 'hidden', timeout: 6000 }).catch(() => {});
    await this.page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
    await this.page.waitForTimeout(1800);
  }

  private async clickBuscarButton(): Promise<boolean> {
    for (const selector of this.selectors.searchButtons) {
      const button = this.page.locator(selector).first();
      const isVisible = await button.isVisible({ timeout: 1000 }).catch(() => false);
      if (!isVisible) {
        continue;
      }

      try {
        await button.click({ timeout: 3000, force: true });
      } catch {
        await button.evaluate((el) => (el as HTMLElement).click());
      }
      return true;
    }

    return await this.page.evaluate(() => {
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

  private async navigateToIndexWithRetry(indexPath: string, label: string): Promise<void> {
    const currentUrl = this.page.url();
    const absoluteTarget = this.resolveAbsoluteUrl(indexPath, currentUrl);
    const targets = [indexPath, absoluteTarget].filter((v, i, arr) => !!v && arr.indexOf(v) === i) as string[];

    let lastError: unknown;

    for (let attempt = 1; attempt <= 3; attempt++) {
      for (const target of targets) {
        try {
          logger.info(`Navegando a index de ${label} (intento ${attempt}/3): ${target}`);
          await this.page.goto(target, {
            waitUntil: 'domcontentloaded',
            timeout: 30000,
          });
          await this.page.waitForTimeout(600);
          return;
        } catch (error) {
          lastError = error;
          logger.warn(`Navegacion a ${target} fallida en intento ${attempt}: ${String(error)}`);
          await this.page.waitForTimeout(600);
        }
      }
    }

    logger.error(`No fue posible navegar al index de ${label} tras 3 intentos`, lastError);
    throw lastError instanceof Error
      ? lastError
      : new Error(`Fallo de navegacion a index para ${label}`);
  }

  private resolveAbsoluteUrl(pathOrUrl: string, currentUrl: string): string {
    if (/^https?:\/\//i.test(pathOrUrl)) {
      return pathOrUrl;
    }

    try {
      const current = new URL(currentUrl);
      return new URL(pathOrUrl, `${current.protocol}//${current.host}`).toString();
    } catch {
      return pathOrUrl;
    }
  }

  private async isPrimaryFieldVisible(config: CargaEntityConfig): Promise<boolean> {
    const selectors = [...config.primaryFieldSelectors, ...this.selectors.genericNombre];
    for (const selector of selectors) {
      const locator = this.page.locator(selector).first();
      const isVisible = await locator.isVisible({ timeout: 900 }).catch(() => false);
      if (!isVisible) {
        continue;
      }

      const idAttr = (await locator.getAttribute('id'))?.toLowerCase() ?? '';
      if (idAttr === 'search') {
        continue;
      }
      return true;
    }

    const visibleInputs = this.page.locator('input:visible');
    const inputCount = await visibleInputs.count();
    for (let i = 0; i < inputCount; i++) {
      const candidate = visibleInputs.nth(i);
      const idAttr = (await candidate.getAttribute('id'))?.toLowerCase() ?? '';
      const nameAttr = (await candidate.getAttribute('name'))?.toLowerCase() ?? '';
      if (
        (idAttr.includes(config.fieldLabel.toLowerCase()) || nameAttr.includes(config.fieldLabel.toLowerCase()))
        && !idAttr.includes('search')
      ) {
        return true;
      }
    }

    return false;
  }

  private async resolvePrimaryFieldInput(config: CargaEntityConfig): Promise<Locator> {
    const selectors = [...config.primaryFieldSelectors, ...this.selectors.genericNombre];

    for (const selector of selectors) {
      const locator = this.page.locator(selector).first();
      const isVisible = await locator.isVisible({ timeout: 1000 }).catch(() => false);
      if (!isVisible) {
        continue;
      }

      const idAttr = (await locator.getAttribute('id'))?.toLowerCase() ?? '';
      const nameAttr = (await locator.getAttribute('name'))?.toLowerCase() ?? '';
      if (idAttr.includes('search') || nameAttr.includes('search')) {
        continue;
      }

      return locator;
    }

    const visibleInputs = this.page.locator('input:visible');
    const inputCount = await visibleInputs.count();
    for (let i = 0; i < inputCount; i++) {
      const candidate = visibleInputs.nth(i);
      const idAttr = (await candidate.getAttribute('id'))?.toLowerCase() ?? '';
      const nameAttr = (await candidate.getAttribute('name'))?.toLowerCase() ?? '';
      if (
        (idAttr.includes(config.fieldLabel.toLowerCase())
          || nameAttr.includes(config.fieldLabel.toLowerCase())
          || idAttr.includes('nombre')
          || nameAttr.includes('nombre'))
        && !idAttr.includes('search')
      ) {
        return candidate;
      }
    }

    throw new Error(`No se encontro input principal (${config.fieldLabel}) para ${config.label}`);
  }

  private extractIdFromUrl(url: string): string | null {
    const match = url.match(/\/(?:ver|view|editar|edit|update)\/(\d+)/i);
    return match?.[1] ?? null;
  }

  private async extractIdFromRow(row: Locator): Promise<string | null> {
    const editLink = row.locator('a[href*="/editar/"], a[href*="/ver/"], a[href*="/view/"]').first();
    if (await editLink.isVisible({ timeout: 800 }).catch(() => false)) {
      const href = await editLink.getAttribute('href');
      const match = href?.match(/\/(?:editar|edit|ver|view)\/(\d+)/i);
      if (match?.[1]) {
        return match[1];
      }
    }

    const firstCellText = (await row.locator('td').first().textContent())?.trim() ?? '';
    const cellId = firstCellText.match(/^\d+$/)?.[0];
    return cellId ?? null;
  }
}
