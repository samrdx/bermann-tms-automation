import { BasePage } from '../../../core/BasePage.js';
import type { Page } from 'playwright';
import { expect } from '@playwright/test';
import { createLogger } from '../../../utils/logger.js';
import { isDemoMode } from '../../../utils/env-helper.js';

const logger = createLogger('ContratosFormPage');

export class ContratosFormPage extends BasePage {
  private readonly selectors = {
    nroContrato: '#contrato-nro_contrato',
    btnGuardar: '#btn_guardar',
    errorMessages: '.text-danger, .help-block, .alert-danger, .toast-message'
  };

  constructor(page: Page) {
    super(page);
  }

  async navigateToCreate(): Promise<void> {
    logger.info('Navigating to Contrato creation page');
    await this.page.goto('/contrato/crear');
    await this.page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => {
      logger.warn('⚠️ navigateToCreate: networkidle timeout — continuing anyway');
    });
  }

  async fillBasicContractInfo(nroContrato: string, transportistaNombre: string): Promise<string> {
    logger.info('📝 Filling basic contract information');
    try {
      if (!this.page.url().includes('/contrato/crear')) {
        await this.navigateToCreate();
      }

      await this.fill(this.selectors.nroContrato, nroContrato);

      logger.info('🔽 Selecting Tipo Contrato = Costo...');
      const tipoBtn = 'button[data-id="contrato-tipo_tarifa_contrato_id"]';
      if (await this.isVisible(tipoBtn)) {
        await this.page.click(tipoBtn);
        await this.page.waitForTimeout(400);
        await this.page.click('.bootstrap-select.show .dropdown-menu .dropdown-item:has-text("Costo")');
      }

      await this.page.waitForTimeout(2500);

      logger.info(`🔽 Selecting transportista: "${transportistaNombre}"...`);
      const transBtn = 'button[data-id="contrato-transportista_id"]';
      if (await this.isVisible(transBtn)) {
        await this.page.click(transBtn);
        await this.page.waitForTimeout(600);

        const searchBox = this.page.locator('.bootstrap-select.show .bs-searchbox input');
        if (await searchBox.isVisible()) {
          await searchBox.fill(transportistaNombre);
          await this.page.waitForTimeout(800);
          const activeItem = this.page.locator('.bootstrap-select.show .dropdown-menu .dropdown-item.active');
          if (await activeItem.count() > 0) {
            await activeItem.first().click();
          } else {
            await this.page.locator('.bootstrap-select.show .dropdown-menu .dropdown-item:not(.hidden)').first().click();
          }
        }
      }
      
      await this.clickGuardar();

      const currentUrl = this.page.url();
      const match = currentUrl.match(/\/editar\/(\d+)/);
      if (match) return match[1];
      if (currentUrl.includes('/index')) return 'UNKNOWN_ID_BUT_SAVED';

      return 'SAVED_UNKNOWN_ID';

    } catch (error) {
      logger.error('CRITICAL FAILURE in fillBasicContractInfo', error);
      throw error;
    }
  }

  private async clickGuardar(): Promise<void> {
    logger.info('💾 Clicking Guardar...');
    await this.click(this.selectors.btnGuardar);
    await this.page.waitForTimeout(5000);
  }
}
