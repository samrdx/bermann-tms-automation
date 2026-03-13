import { BasePage } from '../../../core/BasePage.js';
import type { Page } from 'playwright';
import { createLogger } from '../../../utils/logger.js';
import { test } from '@playwright/test';

const logger = createLogger('TipoOperacionPage');

export interface TipoOperacionData {
  nombre: string;
  tiempoPrevio: string; // HH:mm
  permanenciaOrigen: string; // HH:mm
  permanenciaDestino: string; // HH:mm
  validarHorarios: boolean;
}

/**
 * Page Object for Tipo de Operación creation and management.
 * Standard location: /tipooperacion/crear
 */
export class TipoOperacionPage extends BasePage {
  private readonly selectors = {
    nombre: '#tipooperacion-nombre',
    tiempoPrevio: '#tipooperacion-tiempo_previo',
    permanenciaOrigen: '#tipooperacion-permanencia_origen',
    permanenciaDestino: '#tipooperacion-permanencia_destino',
    chkHorarios: 'input[type="checkbox"]',
    btnGuardar: '#btn_guardar',
    btnGuardarFallback: 'button.btn-success:has-text("Guardar")',
    // Search selectors
    searchInput: '#search',
    btnBuscar: '#buscar',
    gridRow: (name: string) => `table.table >> text="${name}"`,
  };

  constructor(page: Page) {
    super(page);
  }

  async navigateToCreate(): Promise<void> {
    logger.info('Navegando a la página de creación de Tipo de Operación');
    await this.page.goto('/tipooperacion/crear');
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.locator(this.selectors.nombre).waitFor({ state: 'visible', timeout: 10000 });
  }

  async fillForm(data: TipoOperacionData): Promise<void> {
    await test.step('Completar formulario de Tipo de Operación', async () => {
      logger.info(`Completando formulario para: ${data.nombre}`);
      
      await test.step('Ingresar Nombre', async () => {
        await this.fill(this.selectors.nombre, data.nombre);
      });

      await test.step('Ingresar Tiempo Previo', async () => {
        await this.fill(this.selectors.tiempoPrevio, data.tiempoPrevio);
      });

      await test.step('Ingresar Permanencia Origen', async () => {
        await this.fill(this.selectors.permanenciaOrigen, data.permanenciaOrigen);
      });

      await test.step('Ingresar Permanencia Destino', async () => {
        await this.fill(this.selectors.permanenciaDestino, data.permanenciaDestino);
      });

      if (data.validarHorarios) {
        await test.step('Activar validación de horarios', async () => {
          const checkbox = this.page.locator(this.selectors.chkHorarios).first();
          if (!(await checkbox.isChecked())) {
            await checkbox.check();
          }
        });
      }
    });
  }

  async clickGuardar(): Promise<void> {
    await test.step('Guardar Tipo de Operación', async () => {
      logger.info('Haciendo clic en Guardar');
      const primary = this.page.locator(this.selectors.btnGuardar).first();
      const fallback = this.page.locator(this.selectors.btnGuardarFallback).first();

      if (await primary.isVisible({ timeout: 3000 }).catch(() => false)) {
        await primary.click();
      } else if (await fallback.isVisible({ timeout: 3000 }).catch(() => false)) {
        await fallback.click();
      } else {
        throw new Error('No se encontró el botón Guardar');
      }

      await this.page.waitForLoadState('networkidle');
    });
  }

  async isFormSaved(): Promise<boolean> {
    await this.page.waitForTimeout(1500);
    const url = this.page.url();
    // Usually redirects to /view or /index
    return url.includes('/tipooperacion/ver') || url.includes('/tipooperacion/view') || url.includes('/tipooperacion/index');
  }

  async navigateToIndex(): Promise<void> {
    await test.step('Navegar al índice de Tiempos Operacionales', async () => {
      logger.info('Navegando al índice de Tipo de Operación');
      await this.page.goto('/tipooperacion/index');
      await this.page.waitForLoadState('domcontentloaded');
    });
  }

  async searchAndVerify(name: string): Promise<boolean> {
    return await test.step(`Buscar y verificar el Tipo de Operación: ${name}`, async () => {
      logger.info(`Buscando: ${name}`);
      await this.fill(this.selectors.searchInput, name);
      await this.click(this.selectors.btnBuscar);
      await this.page.waitForTimeout(1500); // Esperar a que se actualice la grilla
      return await this.isVisible(this.selectors.gridRow(name));
    });
  }
}
