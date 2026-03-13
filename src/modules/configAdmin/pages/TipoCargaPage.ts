import { BasePage } from '../../../core/BasePage.js';
import type { Page } from 'playwright';
import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('TipoCargaPage');

export interface TipoCargaData {
  tipo: string;
  codigo: string;
}

/**
 * Page Object for Tipo de Carga create/index pages
 * URL Create: /tipocarga/crear
 * URL Index: /tipocarga/index
 */
export class TipoCargaPage extends BasePage {
  private readonly selectors = {
    // Create form fields (confirmed selectors)
    tipo: '#tipocarga-tipo',
    codigo: '#tipocarga-codigo',

    // Index filters
    search: '#search',
    buscar: '#buscar',

    // Actions
    btnGuardar: '#btn_guardar',
    btnGuardarFallback: 'button.btn-success:has-text("Guardar")',

    // Grid
    tableRows: '#tabla table tbody tr, table tbody tr',
  };

  constructor(page: Page) {
    super(page);
  }

  async navigateToCreate(): Promise<void> {
    logger.info('Navegando a la pagina de creacion de Tipo de Carga');
    await this.page.goto('/tipocarga/crear');
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.locator(this.selectors.tipo).waitFor({ state: 'visible', timeout: 10000 });
  }

  async fillTipo(tipo: string): Promise<void> {
    logger.info(`Completando tipo de carga: ${tipo}`);
    try {
      await this.fill(this.selectors.tipo, tipo);
    } catch (error) {
      logger.error('Fallo al completar el tipo de carga', error);
      await this.takeScreenshot('tipocarga-fill-tipo-error');
      throw error;
    }
  }

  async fillCodigo(codigo: string): Promise<void> {
    logger.info(`Completando codigo de carga: ${codigo}`);
    try {
      await this.fill(this.selectors.codigo, codigo);
    } catch (error) {
      logger.error('Fallo al completar el codigo de carga', error);
      await this.takeScreenshot('tipocarga-fill-codigo-error');
      throw error;
    }
  }

  async clickGuardar(): Promise<void> {
    logger.info('Haciendo clic en Guardar para Tipo de Carga');
    try {
      const primary = this.page.locator(this.selectors.btnGuardar).first();
      const fallback = this.page.locator(this.selectors.btnGuardarFallback).first();

      if (await primary.isVisible({ timeout: 3000 }).catch(() => false)) {
        try {
          await primary.click({ timeout: 5000 });
        } catch {
          await primary.evaluate((el) => (el as HTMLElement).click());
        }
      } else if (await fallback.isVisible({ timeout: 3000 }).catch(() => false)) {
        try {
          await fallback.click({ timeout: 5000 });
        } catch {
          await fallback.evaluate((el) => (el as HTMLElement).click());
        }
      } else {
        throw new Error('No se encontro boton Guardar visible');
      }

      await this.page.waitForLoadState('networkidle');
    } catch (error) {
      logger.error('Fallo al guardar Tipo de Carga', error);
      await this.takeScreenshot('tipocarga-click-guardar-error');
      throw error;
    }
  }

  async isFormSaved(): Promise<boolean> {
    try {
      await this.page.waitForTimeout(1500);
      const url = this.page.url();
      return url.includes('/tipocarga/index') || url.includes('/tipocarga/ver/') || url.includes('/tipocarga/view/');
    } catch (error) {
      logger.error('Fallo al verificar guardado del formulario de Tipo de Carga', error);
      return false;
    }
  }

  async navigateToIndex(): Promise<void> {
    logger.info('Navegando al indice de Tipo de Carga');
    await this.page.goto('/tipocarga/index');
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.locator(this.selectors.search).waitFor({ state: 'visible', timeout: 10000 });
  }

  async searchByTipo(tipo: string): Promise<void> {
    logger.info(`Buscando Tipo de Carga en index: ${tipo}`);
    try {
      await this.fill(this.selectors.search, tipo);
      await this.clickBuscarButton();
      await this.page.waitForLoadState('networkidle');
      await this.page.waitForTimeout(1200);
    } catch (error) {
      logger.error(`Fallo al buscar Tipo de Carga "${tipo}" en index`, error);
      await this.takeScreenshot('tipocarga-search-error');
      throw error;
    }
  }

  async validateRowByTipoAndCodigo(tipo: string, codigo: string): Promise<boolean> {
    logger.info(`Validando fila con Tipo "${tipo}" y Codigo "${codigo}"`);
    try {
      const escapedTipo = tipo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const escapedCodigo = codigo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      const matchingRow = this.page
        .locator(this.selectors.tableRows)
        .filter({ hasText: new RegExp(escapedTipo, 'i') })
        .filter({ hasText: new RegExp(escapedCodigo, 'i') })
        .first();

      const isVisible = await matchingRow.isVisible({ timeout: 5000 }).catch(() => false);
      if (!isVisible) {
        logger.warn('No se encontro fila que coincida con Tipo + Codigo');
        await this.takeScreenshot('tipocarga-row-not-found');
        return false;
      }

      logger.info('Fila encontrada correctamente con Tipo + Codigo');
      return true;
    } catch (error) {
      logger.error('Fallo al validar fila de Tipo de Carga en index', error);
      await this.takeScreenshot('tipocarga-validate-row-error');
      return false;
    }
  }

  private async clickBuscarButton(): Promise<void> {
    try {
      const buscarLink = this.page.getByRole('link', { name: 'Buscar' });
      if (await buscarLink.isVisible({ timeout: 3000 }).catch(() => false)) {
        await buscarLink.click({ force: true, timeout: 2000 });
        logger.info('Se hizo clic en Buscar (rol link)');
        return;
      }
    } catch {
      // Fallback below
    }

    logger.info('Aplicando fallback JS para boton Buscar');
    await this.page.evaluate(() => {
      const btn = document.getElementById('buscar');
      if (btn) {
        btn.click();
        return;
      }

      const links = Array.from(document.querySelectorAll('a, button'));
      const buscar = links.find(el => el.textContent?.trim() === 'Buscar');
      if (buscar) {
        (buscar as HTMLElement).click();
      } else {
        console.error('Boton Buscar no encontrado');
      }
    });
    logger.info('Se hizo clic en Buscar (fallback JS)');
  }
}
