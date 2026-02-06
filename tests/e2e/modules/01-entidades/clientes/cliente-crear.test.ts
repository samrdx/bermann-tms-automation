import { test } from '@playwright/test';
import { logger } from '../../../../../src/utils/logger.js';
import { LoginPage } from '../../../../../src/modules/auth/pages/LoginPage.js';
import { getTestUser } from '../../../../../src/config/credentials.js';
import { ClienteHelper } from '../../../../api-helpers/ClienteHelper.js';
import { TransportistaHelper } from '../../../../api-helpers/TransportistaHelper.js';

test.describe('Cliente - Create', () => {
  // Increase timeout for this complex multi-entity seeding test
  test.setTimeout(120000);
  
  test('should create a new client with all required fields', async ({ page }) => {
    // Note: Already authenticated via storageState from setup project
    logger.info('📋 PHASE 1: Seeding Transportista (for association)...');
    
    // Seed a Transportista first (required for "Transportistas Asociados" form field)
    const transportista = await TransportistaHelper.createTransportistaViaUI(page, 'Propio');
    
    if (!transportista.nombre) {
      throw new Error('Failed to seed Transportista - cannot proceed with Client creation');
    }

    logger.info(`✅ Transportista seeded: ${transportista.nombre}`);

    logger.info('📋 PHASE 2: Creating Client...');

    // Create Cliente using the seeded Transportista's base name (without timestamp)
    const transportistaSearchName = transportista.baseNombre || transportista.nombre.split(' - ')[0];
    
    const cliente = await ClienteHelper.createClienteViaUI(page, transportistaSearchName);

    logger.info(`✅ Cliente created: ${cliente.nombre}`);
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
