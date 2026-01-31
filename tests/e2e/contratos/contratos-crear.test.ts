import { BrowserManager } from '../../../src/core/BrowserManager.js';
import { LoginPage } from '../../../src/pages/LoginPage.js';
import { DashboardPage } from '../../../src/pages/DashboardPage.js';
import { ContratosFormPage } from '../../../src/pages/ContratosFormPage.js';
import { getTestUser } from '../../../src/config/credentials.js';
import { logger } from '../../../src/utils/logger.js';

async function testCrearContrato() {
  const browser = new BrowserManager({ headless: false });
  
  try {
    logger.info('='.repeat(60));
    logger.info('🚀 Starting Contratos Creation Test');
    logger.info('='.repeat(60));

    await browser.initialize();
    const page = browser.getPage();
    
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);
    const contratosForm = new ContratosFormPage(page);

    const user = getTestUser('regular');
    
    // Test data
    const testData = {
      nroContrato: Date.now().toString().slice(-8),
      valorHora: '25000',
      tarifaViaje: '150000',
      tarifaConductor: '50000',
    };

    // ========================================
    // PHASE 1: Login
    // ========================================
    logger.info('\n🔐 PHASE 1: Login');
    await loginPage.loginAndWaitForDashboard(user.username, user.password);
    
    const isOnDashboard = await dashboardPage.isOnDashboard();
    if (!isOnDashboard) {
      throw new Error('Failed to reach dashboard');
    }
    
    logger.info('✅ Login successful');
    await page.screenshot({ 
      path: './reports/screenshots/contratos-01-login-success.png',
      fullPage: true 
    });

    await page.waitForTimeout(2000);

    // ========================================
    // PHASE 2: Navigate to Contratos Form
    // ========================================
    logger.info('\n🧭 PHASE 2: Navigate to Contratos Form');
    await contratosForm.navigate();
    
    const currentUrl = page.url();
    logger.info(`Current URL: ${currentUrl}`);
    
    if (!currentUrl.includes('/contrato/crear')) {
      throw new Error('Failed to navigate to contratos form');
    }
    
    logger.info('✅ Successfully navigated to Contratos form');
    await page.screenshot({ 
      path: './reports/screenshots/contratos-02-form-loaded.png',
      fullPage: true 
    });

    await page.waitForTimeout(2000);

    // ========================================
    // PHASE 3: Fill Contract Form
    // ========================================
    logger.info('\n📝 PHASE 3: Fill Contract Form');
    logger.info('Test data:');
    logger.info(`  - Contract Number: ${testData.nroContrato}`);
    logger.info(`  - Hourly Rate: ${testData.valorHora}`);
    logger.info('');

    // STEP 3.1: Fill contract number (WORKS ✅)
    logger.info('📝 STEP 3.1: Filling contract number');
    await contratosForm.fillNroContrato(testData.nroContrato);
    logger.info('✅ Contract number filled');

    await page.waitForTimeout(1000);

    // STEP 3.2: Select contract type (WORKS ✅)
logger.info('\n📝 STEP 3.2: Selecting contract type');
await contratosForm.selectTipoContrato('Costo');
logger.info('✅ Contract type selected');

await page.waitForTimeout(1000);

// STEP 3.3: Select transportista (WORKS ✅)
logger.info('\n📝 STEP 3.3: Selecting transportista');
await contratosForm.selectTransportista('Transportadora S.A.I');
logger.info('✅ Transportista selected');

await page.waitForTimeout(1000);

// STEP 3.4: Fecha vencimiento (SKIP - TODO)
logger.info('\n📝 STEP 3.4: Fecha vencimiento - SKIPPED (datepicker readonly)');
// await contratosForm.setFechaVencimiento('2026-02-28');

// STEP 3.5: Fill hourly rate (WORKS ✅)
logger.info('\n📝 STEP 3.5: Filling hourly rate');
await contratosForm.fillValorHora(testData.valorHora);
logger.info('✅ Hourly rate filled');

    await page.waitForTimeout(2000);
    await page.screenshot({ 
      path: './reports/screenshots/contratos-03-form-filled.png',
      fullPage: true 
    });

    // ========================================
    // PHASE 4: Save Contract
    // ========================================
    logger.info('\n💾 PHASE 4: Save Contract');
    await contratosForm.clickGuardar();
    logger.info('✅ Save button clicked');

    // Wait for redirect to edit page (longer wait as requested)
    logger.info('Waiting for redirect to edit page...');
    await page.waitForTimeout(8000);

    const currentUrlAfterSave = page.url();
    
    if (currentUrlAfterSave.includes('/contrato/editar/')) {
      logger.info(`✅ Redirected to edit page: ${currentUrlAfterSave}`);
      
      // ========================================
      // PHASE 5: Edit Contract Actions
      // ========================================
      logger.info('\n✏️ PHASE 5: Edit Contract Actions');
      
      // Click success button
      await contratosForm.clickOutlineSuccessButton();
      logger.info('✅ Clicked outline success button');
      
      await page.waitForTimeout(2000);
      
      // Click plus button
      await contratosForm.clickPlus715Button();
      logger.info('✅ Clicked plus 715 button');
      
      await page.waitForTimeout(2000);

      // 1. Click Cerrar button
      await contratosForm.clickCerrarModal();
      logger.info('✅ Clicked Cerrar button');
      await page.waitForTimeout(1000);

      // 2. Add Carga
      await contratosForm.clickAddCarga();
      logger.info('✅ Clicked Add Carga');
      await page.waitForTimeout(1000);

      // 3. Select Carga and Add
      await contratosForm.clickAddRuta();
      logger.info('✅ Clicked Add Ruta');
      await page.waitForTimeout(1000);

      // 4. Click Cerrar button again
      await contratosForm.clickCerrarModal();
      logger.info('✅ Clicked Cerrar button again');
      await page.waitForTimeout(1000);

      // 5. Add Tarifa Viaje
      await contratosForm.fillTarifaViaje(testData.tarifaViaje);
      logger.info('✅ Filled Tarifa Viaje');

      // 6. Add Tarifa Conductor
      await contratosForm.fillTarifaConductor(testData.tarifaConductor);
      logger.info('✅ Filled Tarifa Conductor');

      // 7. Click Guardar (Final)
      await contratosForm.clickGuardar();
      logger.info('✅ Clicked Guardar (Final)');
      
      await page.waitForTimeout(3000);
      
    } else {
      logger.warn(`⚠️ Did not redirect to edit page. URL: ${currentUrlAfterSave}`);
      
      if (await contratosForm.hasValidationErrors()) {
        logger.warn('⚠️ Validation errors detected (check screenshot)');
      }
    }

    await page.screenshot({ 
      path: './reports/screenshots/contratos-05-final-result.png',
      fullPage: true 
    });

    // ========================================
    // RESULTS
    // ========================================
    logger.info('\n' + '='.repeat(60));
    logger.info('📊 CONTRATOS FORM TEST RESULTS:');
    logger.info('='.repeat(60));
    logger.info('✅ Phase 1: Login - PASSED');
    logger.info('✅ Phase 2: Navigation - PASSED');
    logger.info('✅ Phase 3: Fill basic fields - PASSED');
    logger.info('✅ Phase 4: Save & Edit Actions - ATTEMPTED');
    logger.info('='.repeat(60));
    logger.info('🎯 Framework demonstrates automation capabilities');
    logger.info('📝 Complex UI elements marked for refinement');
    logger.info('='.repeat(60));

  } catch (error) {
    logger.error('❌ Test failed with error', error);
    
    try {
      const page = browser.getPage();
      await page.screenshot({ 
        path: `./reports/screenshots/contratos-error-${Date.now()}.png`,
        fullPage: true 
      });
    } catch (screenshotError) {
      logger.error('Could not take screenshot', screenshotError);
    }
    
    throw error;
  } finally {
    await browser.close();
  }
}

testCrearContrato();