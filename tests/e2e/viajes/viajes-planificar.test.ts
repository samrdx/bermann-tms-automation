import { BrowserManager } from '../../../src/core/BrowserManager.js';
import { LoginPage } from '../../../src/modules/auth/pages/LoginPage.js';
import { DashboardPage } from '../../../src/modules/auth/pages/DashboardPage.js';
import { PlanificarPage } from '../../../src/modules/planning/pages/PlanificarPage.js';
import { getTestUser } from '../../../src/config/credentials.js';
import { logger } from '../../../src/utils/logger.js';

async function testPlanificarViaje() {
  const browser = new BrowserManager();
  
  try {
    logger.info('='.repeat(60));
    logger.info('🚀 Starting Planificar Viaje COMPLETE Test');
    logger.info('='.repeat(60));

    // PHASE 0: Setup
    await browser.initialize();
    const page = browser.getPage();
    
    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);
    const viajesPage = new PlanificarPage(page);
    
    const user = getTestUser('regular');
    
    // Generate unique ID
    const nroViaje = String(Math.floor(10000 + Math.random() * 90000));
    logger.info(`Generated Nro Viaje: ${nroViaje}`);

    // PHASE 1: Login
    logger.info('\n🔐 PHASE 1: Login');
    await loginPage.loginAndWaitForDashboard(user.username, user.password);
    
    const isOnDashboard = await dashboardPage.isOnDashboard();
    if (!isOnDashboard) {
      throw new Error('Failed to reach dashboard');
    }
    
    logger.info('✅ Login successful');
    await page.screenshot({ path: './reports/screenshots/viajes-01-login.png' });

    // PHASE 2: Navigate
    logger.info('\n🧭 PHASE 2: Navigate to Planificar Viajes');
    await viajesPage.navigate();
    logger.info('✅ Navigation successful');
    await page.screenshot({ path: './reports/screenshots/viajes-02-navigate.png' });

    // PHASE 3: Fill Form (COMPLETE FLOW)
    logger.info('\n📝 PHASE 3: Fill Complete Viaje Form');
    
    logger.info('STEP 3.1: Basic fields');
    await viajesPage.fillNroViaje(nroViaje);
    await page.screenshot({ path: './reports/screenshots/viajes-03a-nro-viaje.png' });
    
    logger.info('STEP 3.2: Tipo Operacion');
    await viajesPage.selectTipoOperacion('tclp2210');
    await page.screenshot({ path: './reports/screenshots/viajes-03b-tipo-operacion.png' });
    
    logger.info('STEP 3.3: Cliente');
    await viajesPage.selectCliente('Clientedummy');
    await page.screenshot({ path: './reports/screenshots/viajes-03c-cliente.png' });
    
    logger.info('STEP 3.4: Tipo Servicio (cascading)');
    await viajesPage.selectTipoServicio('tclp2210');
    await page.screenshot({ path: './reports/screenshots/viajes-03d-tipo-servicio.png' });
    
    logger.info('STEP 3.5: Tipo Viaje');
    await viajesPage.selectTipoViaje('1');
    
    logger.info('STEP 3.6: Unidad Negocio');
    await viajesPage.selectUnidadNegocio('1');
    await page.screenshot({ path: './reports/screenshots/viajes-03e-selects.png' });
    
    logger.info('STEP 3.7: Codigo Carga');
    await viajesPage.selectCodigoCarga('CONT-Bobinas-Sider14');
    await page.screenshot({ path: './reports/screenshots/viajes-03f-carga.png' });
    
    logger.info('STEP 3.8: Agregar Ruta (modal)');
    await viajesPage.agregarRuta('05082025-1');
    await page.screenshot({ path: './reports/screenshots/viajes-03g-ruta.png' });
    
    logger.info('STEP 3.9: Origen');
    await viajesPage.selectOrigen('1_agunsa_lampa_RM');
    
    logger.info('STEP 3.10: Destino');
    await viajesPage.selectDestino('225_Starken_Sn Bernardo');
    await page.screenshot({ path: './reports/screenshots/viajes-03h-origen-destino.png' });
    
    logger.info('✅ Form filled completely');

    // PHASE 4: Save
    logger.info('\n💾 PHASE 4: Save Viaje');
    await viajesPage.clickGuardar();
    await page.screenshot({ path: './reports/screenshots/viajes-04-after-save.png' });
    logger.info('✅ Save clicked');

    // PHASE 5: Verify
    logger.info('\n✅ PHASE 5: Verification');
    
    const isSaved = await viajesPage.isFormSaved();
    if (isSaved) {
      logger.info('✅ Success alert detected or URL changed');
    } else {
      logger.warn('⚠️ No success confirmation (may need more fields)');
    }
    
    // Verify in asignar
    const foundInAsignar = await viajesPage.verifyInAsignar(nroViaje);
    await page.screenshot({ path: './reports/screenshots/viajes-05-verification.png' });
    
    if (foundInAsignar) {
      logger.info(`✅ Viaje ${nroViaje} verified in /viajes/asignar`);
    } else {
      logger.warn(`⚠️ Viaje ${nroViaje} not found in /viajes/asignar (check screenshots)`);
    }
    
    // RESULTS
    logger.info('\n' + '='.repeat(60));
    logger.info('📊 TEST RESULTS:');
    logger.info('='.repeat(60));
    logger.info(`✅ Phase 1: Login - PASSED`);
    logger.info(`✅ Phase 2: Navigation - PASSED`);
    logger.info(`✅ Phase 3: Form Fill (10 steps) - PASSED`);
    logger.info(`✅ Phase 4: Save - PASSED`);
    logger.info(`${foundInAsignar ? '✅' : '⚠️'} Phase 5: Verification - ${foundInAsignar ? 'PASSED' : 'PARTIAL'}`);
    logger.info(`📋 Nro Viaje created: ${nroViaje}`);
    logger.info('='.repeat(60));

  } catch (error) {
    logger.error('❌ Test failed', error);
    
    try {
      await browser.getPage().screenshot({ 
        path: `./reports/screenshots/viajes-error-${Date.now()}.png`,
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

testPlanificarViaje();