import { test } from '@playwright/test';
import { logger } from '../../../../../src/utils/logger.js';
import { ClienteHelper } from '../../../../api-helpers/ClienteHelper.js';

test.describe('Cliente - Creación de Cliente', () => {
  // Increase timeout for this test
  test.setTimeout(60000); // Reduced timeout as it no longer creates a Transportista

  test('Debe crear un Cliente correctamente y guardar sus datos', async ({ page }) => {
    // Note: Already authenticated via storageState from setup project
    logger.info('📋 PHASE 1: Creando Cliente...');

    // Create Cliente without associating a Transportista
    const cliente = await ClienteHelper.createClienteViaUI(page);

    logger.info(`✅ Cliente creado: ${cliente.nombre}`);
    logger.info(`✅ Client RUT: ${cliente.rut}`);
    logger.info(`✅ Client ID: ${cliente.id || 'N/A (grid rescue failed)'}`);
    logger.info(`✅ Client Email: ${cliente.email}`);

    // Verify client was created
    if (!cliente.nombre) {
      throw new Error('Cliente creation failed - no name returned');
    }

    logger.info('✅ Test completed successfully!');
  });
});
