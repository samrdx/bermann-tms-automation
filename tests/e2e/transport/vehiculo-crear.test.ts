import { test, expect } from '../../../src/fixtures/base.js';
import { getTestUser } from '../../../src/config/credentials.js';
import { logger } from '../../../src/utils/logger.js';
import { generatePatente } from '../../../src/utils/rutGenerator.js';

test.describe('Transport - Vehiculo Creation', () => {

  test('Should create a new Vehiculo successfully', async ({
    page,
    loginPage,
    dashboardPage,
    vehiculoPage,
  }) => {
    
    // Test data
    const user = getTestUser('regular');
    const testData = {
      patente: generatePatente(),
      muestra: `Vehiculo Test ${Date.now()}`,
      transportista: 'Transportes Norte', // Assuming this exists or can be found via search
      tipoVehiculo: 'RAMPLA', // Adjust based on options
      tipoRampla: 'Plana', // Adjust based on options
      capacidad: '10000', // Adjust based on options
    };

    await test.step('Phase 1: Login', async () => {
        logger.info('🔐 PHASE 1: Login');
        await loginPage.loginAndWaitForDashboard(user.username, user.password);
        expect(await dashboardPage.isOnDashboard()).toBe(true);
        logger.info('✅ Login successful');
    });

    await test.step('Phase 2: Navigate', async () => {
        logger.info('Compass PHASE 2: Navigate to Create Vehiculo');
        await vehiculoPage.navigate();
        logger.info('✅ Navigation successful');
    });

    await test.step('Phase 3: Fill Form', async () => {
        logger.info('📝 PHASE 3: Fill Vehiculo Form');
        await vehiculoPage.fillPatente(testData.patente);
        await vehiculoPage.fillMuestra(testData.muestra);
        
        // Select Transportista (Critical: Cascading)
        // We need to use a known transportista or search for one. 
        // Using "Transportes" might find many, but the page object handles partial match/search.
        await vehiculoPage.selectTransportista('Transportes'); 
        
        await vehiculoPage.selectTipoVehiculo(testData.tipoVehiculo);
        await vehiculoPage.selectTipoRampla(testData.tipoRampla);
        await vehiculoPage.selectCapacidad(testData.capacidad);
        
        logger.info('✅ Form filled');
    });

    await test.step('Phase 4: Save', async () => {
        logger.info('💾 PHASE 4: Save Vehiculo');
        await vehiculoPage.clickGuardar();
        await page.waitForTimeout(2000);
        logger.info('✅ Vehiculo saved');
    });

    await test.step('Phase 5: Verify', async () => {
        logger.info('✅ PHASE 5: Verification');
        const isSaved = await vehiculoPage.isFormSaved();
        expect(isSaved).toBeTruthy();
        logger.info('✅ Test PASSED');
    });
  });
});
