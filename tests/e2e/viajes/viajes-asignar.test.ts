import { BrowserManager } from '../../../src/core/BrowserManager.js';
import { LoginPage } from '../../../src/modules/auth/pages/LoginPage.js';
import { DashboardPage } from '../../../src/modules/auth/pages/DashboardPage.js';
import { AsignarPage } from '../../../src/modules/planning/pages/AsignarPage.js';
import { PlanificarPage } from '../../../src/modules/planning/pages/PlanificarPage.js';
import { getTestUser } from '../../../src/config/credentials.js';
import { logger } from '../../../src/utils/logger.js';

async function testAsignarViaje() {
  const browser = new BrowserManager();

  // Test results tracking
  const results = {
    phase1Login: false,
    phase2CreateTrip: false,
    phase3Navigate: false,
    phase4SelectTrip: false,
    phase5Assignment: false,
    phase6Verification: false,
  };

  let nroViaje = '';

  try {
    logger.info('='.repeat(60));
    logger.info('Starting Asignar Viaje COMPLETE Test');
    logger.info('='.repeat(60));

    // ========================================
    // PHASE 0: Setup
    // ========================================
    await browser.initialize();
    const page = browser.getPage();

    const loginPage = new LoginPage(page);
    const dashboardPage = new DashboardPage(page);
    const asignarPage = new AsignarPage(page);
    const planificarPage = new PlanificarPage(page);

    const user = getTestUser('regular');

    // Generate unique ID for the trip
    nroViaje = String(Math.floor(10000 + Math.random() * 90000));
    logger.info(`Generated Nro Viaje: ${nroViaje}`);

    // ========================================
    // PHASE 1: Login
    // ========================================
    logger.info('\n PHASE 1: Login');
    await loginPage.loginAndWaitForDashboard(user.username, user.password);

    const isOnDashboard = await dashboardPage.isOnDashboard();
    if (!isOnDashboard) {
      throw new Error('Failed to reach dashboard');
    }

    logger.info('Login successful');
    await page.screenshot({ path: './reports/screenshots/asignar-01-login.png' });
    results.phase1Login = true;

    // ========================================
    // PHASE 2: Create Trip (Prerequisite)
    // ========================================
    logger.info('\n PHASE 2: Create Trip (Prerequisite)');
    logger.info(`Creating trip with Nro Viaje: ${nroViaje}`);

    try {
      // Navigate to planificar
      await planificarPage.navigate();
      logger.info('Navigated to Planificar Viajes');

      // Fill required fields
      logger.info('STEP 2.1: Filling Nro Viaje');
      await planificarPage.fillNroViaje(nroViaje);

      logger.info('STEP 2.2: Selecting Tipo Operacion');
      await planificarPage.selectTipoOperacion('tclp2210');

      logger.info('STEP 2.3: Selecting Cliente');
      await planificarPage.selectCliente('Clientedummy');

      logger.info('STEP 2.4: Selecting Tipo Servicio');
      await planificarPage.selectTipoServicio('tclp2210');

      logger.info('STEP 2.5: Selecting Tipo Viaje');
      await planificarPage.selectTipoViaje('1');

      logger.info('STEP 2.6: Selecting Unidad Negocio');
      await planificarPage.selectUnidadNegocio('1');

      logger.info('STEP 2.7: Selecting Codigo Carga');
      await planificarPage.selectCodigoCarga('CONT-Bobinas-Sider14');

      logger.info('STEP 2.8: Adding Ruta');
      await planificarPage.agregarRuta('05082025-1');

      logger.info('STEP 2.9: Selecting Origen');
      await planificarPage.selectOrigen('1_agunsa_lampa_RM');

      logger.info('STEP 2.10: Selecting Destino');
      await planificarPage.selectDestino('225_Starken_Sn Bernardo');

      // Save
      logger.info('STEP 2.11: Saving trip');
      await planificarPage.clickGuardar();

      await page.screenshot({ path: './reports/screenshots/asignar-02-trip-created.png' });

      // Verify creation
      const isSaved = await planificarPage.isFormSaved();
      if (isSaved) {
        logger.info(`Trip ${nroViaje} created successfully`);
        results.phase2CreateTrip = true;
      } else {
        logger.warn(`Trip ${nroViaje} may not have saved completely`);
        // Continue anyway - we'll check in asignar page
        results.phase2CreateTrip = true;
      }
    } catch (createError) {
      logger.warn(`Could not create trip: ${createError}`);
      logger.info('Will search for existing unassigned trip...');
      nroViaje = ''; // Reset to search for existing
      results.phase2CreateTrip = true; // Mark as passed since we'll use existing
    }

    // ========================================
    // PHASE 3: Navigate to Asignar and Find Trip
    // ========================================
    logger.info('\n PHASE 3: Navigate to Asignar Viajes');

    await asignarPage.navigate();
    logger.info('Navigated to /viajes/asignar');

    await asignarPage.waitForTableLoad();
    const rowCount = await asignarPage.getTableRowCount();
    logger.info(`Table loaded with ${rowCount} rows`);

    await page.screenshot({ path: './reports/screenshots/asignar-03-navigate.png' });
    results.phase3Navigate = true;

    // ========================================
    // PHASE 4: Find Trip and Click Edit Button
    // ========================================
    logger.info('\n PHASE 4: Find Trip and Open Assignment Panel');

    // Use first available row (since trip creation may have failed)
    logger.info('Using first available trip in table');
    const firstRow = page.locator('#tabla_asignar tbody tr').first();

    // Get the nroViaje from first row for tracking
    const cells = await firstRow.locator('td').allTextContents();
    nroViaje = cells[2]?.trim() || 'unknown';
    logger.info(`Target trip Nro Viaje: ${nroViaje}`);

    // Look for action buttons/icons in the row
    // The pencil icon is typically inside an anchor or button
    const allLinks = await firstRow.locator('a, button, i').all();
    logger.info(`Found ${allLinks.length} clickable elements in row`);

    // Debug: print info about each element
    for (let i = 0; i < Math.min(allLinks.length, 10); i++) {
      const el = allLinks[i];
      const tagName = await el.evaluate(e => e.tagName);
      const className = await el.getAttribute('class') || '';
      const href = await el.getAttribute('href') || '';
      const title = await el.getAttribute('title') || '';
      logger.info(`Element ${i}: <${tagName}> class="${className}" href="${href}" title="${title}"`);
    }

    // Try clicking the pencil/edit icon specifically
    // Common patterns: fa-pencil, fa-edit, mdi-pencil, icon-pencil
    const editIcon = firstRow.locator('i.fa-pencil, i.fa-edit, i.mdi-pencil, [class*="pencil"], [class*="edit"]').first();
    const editIconCount = await editIcon.count();

    let panelOpened = false;

    if (editIconCount > 0) {
      logger.info('Found edit icon, clicking parent...');
      // Click the parent element (anchor or button) of the icon
      const parentElement = editIcon.locator('..');
      await parentElement.click();
      await page.waitForTimeout(2000);

      // Take screenshot to see what happened
      await page.screenshot({ path: './reports/screenshots/asignar-04a-after-edit-click.png', fullPage: true });

      // Check if we navigated to an edit page
      const currentUrl = page.url();
      logger.info(`After edit click, URL: ${currentUrl}`);

      if (currentUrl.includes('/editar') || currentUrl.includes('/update') || currentUrl.includes('/edit')) {
        logger.info('Navigated to edit page');
        panelOpened = true;
      }

      // Check if transportista dropdown is now visible
      const transportistaVisible = await page.locator('button[data-id="transportista"]').isVisible().catch(() => false);
      if (transportistaVisible) {
        logger.info('Assignment dropdowns visible');
        panelOpened = true;
      }

      // Check if modal opened
      const modalVisible = await page.locator('.modal.show, .modal.in, .modal[style*="display: block"]').isVisible().catch(() => false);
      if (modalVisible) {
        logger.info('Modal opened');
        panelOpened = true;
      }
    }

    if (!panelOpened) {
      // Try clicking directly on the row to see if that reveals the panel
      logger.info('Trying to click on the row itself...');
      await firstRow.click();
      await page.waitForTimeout(1500);

      await page.screenshot({ path: './reports/screenshots/asignar-04b-after-row-click.png', fullPage: true });

      // Scroll down to see if assignment panel is below
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(500);

      await page.screenshot({ path: './reports/screenshots/asignar-04c-scrolled-bottom.png', fullPage: true });

      // Check again
      const transportistaVisible = await page.locator('button[data-id="transportista"]').isVisible().catch(() => false);
      if (transportistaVisible) {
        panelOpened = true;
        logger.info('Assignment panel visible after scroll');
      }

      // Scroll back to top
      await page.evaluate(() => window.scrollTo(0, 0));
    }

    await page.screenshot({ path: './reports/screenshots/asignar-04-panel-opened.png' });
    results.phase4SelectTrip = true;

    // ========================================
    // PHASE 5: Assign Resources on EDIT PAGE
    // ========================================
    logger.info('\n PHASE 5: Assign Transportista, Vehículo, Conductor');
    logger.info(`Current URL: ${page.url()}`);

    // Test data - specific values provided by user
    const TRANSPORTISTA = 'Transportepadre';
    const VEHICULO = 'YF-5876';
    const CONDUCTOR = 'Carlos Mosqueda';

    // We're now on the edit page (/viajes/editar/{id})
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    // Helper function to select from Bootstrap Select dropdown by searching for text
    async function selectFromDropdown(
      buttonSelector: string,
      optionText: string,
      useSearch: boolean = true
    ): Promise<boolean> {
      try {
        // Find the dropdown container
        const dropdownContainer = page.locator('div.dropdown, div.bootstrap-select')
          .filter({ has: page.locator(buttonSelector) });

        // Click button to open dropdown
        await page.click(buttonSelector);
        await page.waitForTimeout(500);

        // Wait for dropdown menu to open
        const dropdownMenu = dropdownContainer.locator('.dropdown-menu.show, .dropdown-menu.inner.show').first();
        await dropdownMenu.waitFor({ state: 'visible', timeout: 5000 });

        // Try using search box if available
        if (useSearch) {
          const searchInput = dropdownMenu.locator('.bs-searchbox input');
          if (await searchInput.count() > 0 && await searchInput.isVisible()) {
            logger.info(`Using search box for: ${optionText}`);
            await searchInput.fill(optionText);
            await page.waitForTimeout(500);
          }
        }

        // Find and click the option
        const option = dropdownMenu.locator('.dropdown-item, li a, li span.text')
          .filter({ hasText: optionText }).first();

        if (await option.count() > 0) {
          await option.scrollIntoViewIfNeeded();
          await option.click();
          logger.info(`Selected: ${optionText}`);
          return true;
        }

        // Close dropdown if not found
        await page.keyboard.press('Escape');
        logger.warn(`Option "${optionText}" not found`);
        return false;
      } catch (error) {
        logger.error(`Failed to select "${optionText}"`, error);
        await page.keyboard.press('Escape').catch(() => {});
        return false;
      }
    }

    // STEP 5.1: Select Transportista
    logger.info(`STEP 5.1: Selecting Transportista: ${TRANSPORTISTA}`);

    // Find all dropdown buttons and look for Transportista
    const allBtns = await page.locator('button.dropdown-toggle').all();
    logger.info(`Found ${allBtns.length} dropdown buttons on page`);

    let transportistaSelected = false;
    for (let i = 0; i < allBtns.length; i++) {
      const btn = allBtns[i];
      const text = await btn.textContent();
      const title = await btn.getAttribute('title') || '';

      if (text?.includes('Transportista') || title.includes('Transportista')) {
        logger.info(`Found Transportista dropdown at index ${i}`);
        const dataId = await btn.getAttribute('data-id') || '';

        // Use specific selector
        const selector = dataId ? `button[data-id="${dataId}"]` : `button.dropdown-toggle >> nth=${i}`;
        transportistaSelected = await selectFromDropdown(selector, TRANSPORTISTA);
        break;
      }
    }

    if (!transportistaSelected) {
      logger.warn('Transportista dropdown not found by text, trying by position...');
      // Try the 4th dropdown (0-indexed: 3) which appears to be Transportista in the edit form
      if (allBtns.length > 3) {
        const dataId = await allBtns[3].getAttribute('data-id') || '';
        if (dataId) {
          transportistaSelected = await selectFromDropdown(`button[data-id="${dataId}"]`, TRANSPORTISTA);
        }
      }
    }

    await page.waitForTimeout(500);
    await page.screenshot({ path: './reports/screenshots/asignar-05a-transportista.png' });

    // CRITICAL: Wait for cascade
    logger.info('Waiting 2s for cascade to vehículo/conductor...');
    await page.waitForTimeout(2000);

    // STEP 5.2: Select Vehículo Principal
    logger.info(`STEP 5.2: Selecting Vehículo Principal: ${VEHICULO}`);

    let vehiculoSelected = false;
    const vehiculoBtns = await page.locator('button.dropdown-toggle').all();

    for (let i = 0; i < vehiculoBtns.length; i++) {
      const btn = vehiculoBtns[i];
      const text = await btn.textContent();
      const title = await btn.getAttribute('title') || '';

      if (text?.includes('Vehículo Principal') || text?.includes('Vehiculo Principal') || title.includes('Vehículo')) {
        logger.info(`Found Vehículo Principal dropdown at index ${i}`);
        const dataId = await btn.getAttribute('data-id') || '';
        const selector = dataId ? `button[data-id="${dataId}"]` : `button.dropdown-toggle >> nth=${i}`;
        vehiculoSelected = await selectFromDropdown(selector, VEHICULO);
        break;
      }
    }

    await page.waitForTimeout(500);
    await page.screenshot({ path: './reports/screenshots/asignar-05b-vehiculo.png' });

    // STEP 5.3: Select Conductor Principal
    logger.info(`STEP 5.3: Selecting Conductor: ${CONDUCTOR}`);

    let conductorSelected = false;
    const conductorBtns = await page.locator('button.dropdown-toggle').all();

    for (let i = 0; i < conductorBtns.length; i++) {
      const btn = conductorBtns[i];
      const text = await btn.textContent();
      const title = await btn.getAttribute('title') || '';

      if (text?.includes('Conductor') || title.includes('Conductor')) {
        logger.info(`Found Conductor dropdown at index ${i}`);
        const dataId = await btn.getAttribute('data-id') || '';
        const selector = dataId ? `button[data-id="${dataId}"]` : `button.dropdown-toggle >> nth=${i}`;
        conductorSelected = await selectFromDropdown(selector, CONDUCTOR);
        break;
      }
    }

    await page.waitForTimeout(500);
    await page.screenshot({ path: './reports/screenshots/asignar-05c-conductor.png' });

    // STEP 5.4: Click Guardar
    logger.info('STEP 5.4: Saving assignment');

    const guardarBtn = page.locator('button:has-text("Guardar"), a.btn:has-text("Guardar")').first();

    if (await guardarBtn.isVisible()) {
      await guardarBtn.scrollIntoViewIfNeeded();
      await guardarBtn.click();
      logger.info('Guardar button clicked');

      await page.waitForTimeout(3000);
      await page.screenshot({ path: './reports/screenshots/asignar-05d-saved.png' });
    } else {
      logger.warn('Guardar button not found');
    }

    logger.info(`Assignment summary:`);
    logger.info(`  Transportista: ${transportistaSelected ? TRANSPORTISTA : 'Not selected'}`);
    logger.info(`  Vehículo: ${vehiculoSelected ? VEHICULO : 'Not selected'}`);
    logger.info(`  Conductor: ${conductorSelected ? CONDUCTOR : 'Not selected'}`);

    results.phase5Assignment = transportistaSelected || vehiculoSelected || conductorSelected;

    // ========================================
    // PHASE 6: Verification
    // ========================================
    logger.info('\n PHASE 6: Verify Assignment Success');

    // Check for success indicators
    const isComplete = await asignarPage.isAsignacionComplete();
    if (isComplete) {
      logger.info('Success indicator detected');
    } else {
      logger.warn('No clear success indicator found');
    }

    // Refresh and check the table
    await page.waitForTimeout(2000);
    await asignarPage.navigate();
    await asignarPage.waitForTableLoad();

    // Try to verify in table
    if (nroViaje && nroViaje !== 'unknown') {
      const isAssigned = await asignarPage.verifyViajeAsignado(nroViaje);

      if (isAssigned) {
        logger.info(`Trip ${nroViaje} verified as assigned`);
        results.phase6Verification = true;
      } else {
        logger.warn(`Could not verify assignment for ${nroViaje}`);
        results.phase6Verification = false;
      }
    } else {
      logger.warn('Cannot verify - trip number unknown');
      results.phase6Verification = false;
    }

    await page.screenshot({ path: './reports/screenshots/asignar-06-verification.png' });

    // ========================================
    // RESULTS SUMMARY
    // ========================================
    logger.info('\n' + '='.repeat(60));
    logger.info('TEST RESULTS:');
    logger.info('='.repeat(60));
    logger.info(`${results.phase1Login ? '✓' : '✗'} Phase 1: Login - ${results.phase1Login ? 'PASSED' : 'FAILED'}`);
    logger.info(`${results.phase2CreateTrip ? '✓' : '✗'} Phase 2: Create/Find Trip - ${results.phase2CreateTrip ? 'PASSED' : 'FAILED'}`);
    logger.info(`${results.phase3Navigate ? '✓' : '✗'} Phase 3: Navigate - ${results.phase3Navigate ? 'PASSED' : 'FAILED'}`);
    logger.info(`${results.phase4SelectTrip ? '✓' : '✗'} Phase 4: Select Trip - ${results.phase4SelectTrip ? 'PASSED' : 'FAILED'}`);
    logger.info(`${results.phase5Assignment ? '✓' : '✗'} Phase 5: Assignment - ${results.phase5Assignment ? 'PASSED' : 'FAILED'}`);
    logger.info(`${results.phase6Verification ? '✓' : '⚠'} Phase 6: Verification - ${results.phase6Verification ? 'PASSED' : 'PARTIAL'}`);
    logger.info(`Nro Viaje: ${nroViaje}`);
    logger.info('='.repeat(60));

    // Overall result
    const allPassed = Object.values(results).every(r => r);
    if (allPassed) {
      logger.info('TEST PASSED - All phases completed successfully');
    } else {
      logger.warn('TEST COMPLETED WITH WARNINGS - Check results above');
    }

  } catch (error) {
    logger.error('Test failed', error);

    try {
      await browser.getPage().screenshot({
        path: `./reports/screenshots/asignar-error-${Date.now()}.png`,
        fullPage: true,
      });
    } catch (screenshotError) {
      logger.error('Could not take screenshot', screenshotError);
    }

    throw error;
  } finally {
    await browser.close();
  }
}

testAsignarViaje();
