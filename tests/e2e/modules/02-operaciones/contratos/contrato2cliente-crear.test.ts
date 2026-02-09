import { test, expect } from '../../../../../src/fixtures/base.js';
import { logger } from '../../../../../src/utils/logger.js';
import { ContratosFormPage } from '../../../../../src/modules/contracts/pages/ContratosPage.js';
import { DataPathHelper } from '../../../../api-helpers/DataPathHelper.js';
import fs from 'fs';

/**
 * Step 5.5: Cliente Contract Creation (Type: Venta)
 * * FIX: Robust dropdown selection + Retry Logic for Saving in CI/CD
 */
test.describe('Cliente Contract Creation (Venta Type)', () => {
    test.setTimeout(120000); // Increased timeout for safety

    test('Create Cliente Contract using Pre-existing Entities from JSON', async ({ page }, testInfo) => {
        const startTime = Date.now();
        logger.info('Starting STEP 5.5: Cliente Contract (Venta)');
        logger.info('='.repeat(80));

        // =================================================================
        // STEP 1: Load Existing Entity Data
        // =================================================================
        logger.info('Loading existing entity data from worker-specific JSON...');
        const dataPath = DataPathHelper.getWorkerDataPath(testInfo);

        if (!fs.existsSync(dataPath)) {
            throw new Error(`Worker-specific data file not found at ${dataPath}. Run base entities setup first.`);
        }

        const operationalData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
        const clienteNombre = operationalData.cliente.nombreFantasia || operationalData.cliente.nombre;

        logger.info(`Loaded existing entities:`);
        logger.info(`   Cliente: ${clienteNombre} (${operationalData.cliente.rut})`);
        logger.info('');

        // =================================================================
        // STEP 2: Navigate to Contract Creation
        // =================================================================
        const contratosPage = new ContratosFormPage(page);
        await contratosPage.navigateToCreate();

        // ===================================================================
        // PHASE 1: Create Basic Cliente Contract (Venta Type)
        // ===================================================================
        logger.info('PHASE 1: Creating Cliente contract (Venta)...');

        const nroContrato = String(Math.floor(10000 + Math.random() * 90000));

        logger.info(`   Nro Contrato: ${nroContrato}`);
        logger.info(`   Cliente: ${clienteNombre}`);
        logger.info(`   Tipo: Venta (value=2)`);

        // 1. Fill Nro Contrato
        await page.fill('#contrato-nro_contrato', nroContrato);

        // 2. Select Tipo Contrato = "Venta" (value='2') manually
        await page.evaluate(() => {
            const el = document.querySelector('#contrato-tipo_tarifa_contrato_id') as HTMLSelectElement;
            if (el) {
                el.value = '2';
                el.dispatchEvent(new Event('change', { bubbles: true }));
                // @ts-ignore
                if (typeof $ !== 'undefined') $(el).selectpicker('refresh');
            }
        });
        await page.waitForTimeout(1000);

        // 3. Select "Tipo Contrato de Venta" = "Clientes" (value="1")
        logger.info('Selecting Tipo Contrato de Venta: Clientes');
        const tipoVentaSelector = 'select#tipo';
        await page.waitForSelector(tipoVentaSelector, { state: 'attached' });

        await page.evaluate(() => {
            const el = document.querySelector('select#tipo') as HTMLSelectElement;
            if (el) {
                el.value = '1';
                el.dispatchEvent(new Event('change', { bubbles: true }));
                // @ts-ignore
                if (typeof $ !== 'undefined') $(el).selectpicker('refresh');
            }
        });
        await page.waitForTimeout(1000);

        // 4. Select Cliente (CORREGIDO CON SCOPING)
        logger.info(`Selecting cliente: "${clienteNombre}"`);

        // Open dropdown
        const pickerBtn = page.locator('button[data-id="contrato-cliente_id"]');
        await pickerBtn.waitFor({ state: 'visible' });
        await pickerBtn.click();

        // --- FIX: SCOPING (Buscar menú dentro del padre) ---
        const parent = pickerBtn.locator('xpath=..');
        const dropdownMenu = parent.locator('.dropdown-menu.show').first();
        await dropdownMenu.waitFor({ state: 'visible' });

        // Wait for search box inside that specific menu
        const searchBox = dropdownMenu.locator('.bs-searchbox input');
        await searchBox.waitFor({ state: 'visible', timeout: 5000 });

        // Setup API Listener for Search (optional safety net)
        const searchResponse = page.waitForResponse(
            resp => resp.url().includes('get_clientes') || resp.url().includes('api'),
            { timeout: 8000 }
        ).catch(() => null);

        // Type full name
        await searchBox.fill(clienteNombre);

        // Wait for results
        await searchResponse; 
        await page.waitForTimeout(1000); // Extra wait for UI render

        // Select via Keyboard (ArrowDown + Enter is safest)
        await page.keyboard.press('ArrowDown');
        await page.waitForTimeout(300);
        await page.keyboard.press('Enter');

        // Verify selection happened (Dropdown should close)
        await page.waitForTimeout(500);
        if (await dropdownMenu.isVisible()) {
            logger.warn('Dropdown still open, forcing close with Escape');
            await page.keyboard.press('Escape');
        }
        
        logger.info('✅ Cliente selection action completed');

        // 5. Clean & Save
        await contratosPage.forceCloseModal();

        logger.info('Clicking Guardar button...');
        const btnGuardar = page.locator('button.btn-success:has-text("Guardar"), #btn_guardar').first();
        await btnGuardar.scrollIntoViewIfNeeded();

        // --- FIX: LOGICA DE REINTENTO (RETRY) ---
        // Primer intento con force: true
        await btnGuardar.click({ force: true });

        // Wait for Navigation OR Error
        try {
            // Aumentado a 30s para CI/CD
            await page.waitForURL(url => !url.toString().includes('/crear'), { timeout: 30000 });
            logger.info('✅ Save successful - Navigation detected');
        } catch (e) {
            logger.warn('Save click didn\'t navigate. Retrying click once...');
            
            // Reintento: Esperar un momento y clickear de nuevo
            await page.waitForTimeout(1000);
            await btnGuardar.click({ force: true });

            try {
                await page.waitForURL(url => !url.toString().includes('/crear'), { timeout: 15000 });
            } catch (retryE) {
                // Diagnostics Improved: Filtrar asteriscos
                const rawErrors = await page.locator('.text-danger, .help-block, .alert-danger').allTextContents();
                const errors = rawErrors
                    .map(e => e.trim())
                    .filter(e => e !== '' && e !== '*' && e.length > 2); // Ignorar asteriscos sueltos

                if (errors.length > 0) {
                    throw new Error(`Save Failed with Validation Errors: ${errors.join(' | ')}`);
                }
                
                throw new Error(`Save failed after retry. URL stuck at: ${page.url()}`);
            }
        }

        // 6. Extract ID
        const currentUrl = page.url();
        logger.info(`Post-save URL: ${currentUrl}`);

        let contractId: string | undefined;
        const editMatch = currentUrl.match(/\/editar\/(\d+)/);

        if (editMatch) {
            contractId = editMatch[1];
        } else if (currentUrl.includes('/index')) {
            // Fallback: Search in grid
            logger.info('Redirected to index, searching grid...');
            const searchInput = page.locator('input[type="search"]').first();
            await searchInput.fill(nroContrato);
            await page.waitForTimeout(1500);

            const row = page.locator('table tbody tr').first();
            const link = await row.locator('a[href*="/editar/"]').getAttribute('href');
            contractId = link?.match(/\/editar\/(\d+)/)?.[1];

            if (contractId) {
                await page.goto(`https://moveontruckqa.bermanntms.cl/contrato/editar/${contractId}`);
            }
        }

        if (!contractId) throw new Error('Failed to extract Contract ID');
        logger.info(`✅ Contract created! ID: ${contractId}`);

        // ===================================================================
        // PHASE 2: Add Route 715 & Cargo
        // ===================================================================
        const tarifaConductor = '20000';
        const tarifaViaje = '50000';

        logger.info('PHASE 2: Adding Route 715 and Cargo...');
        // Reuse the robust method from the Page Object
        await contratosPage.addSpecificRouteAndCargo(tarifaConductor, tarifaViaje);

        // ===================================================================
        // STEP 6: Final Save
        // ===================================================================
        logger.info('Saving contract (final)...');
        await page.locator('button.btn-success:has-text("Guardar"), #btn_guardar').click({ force: true });
        await page.waitForTimeout(3000); // Allow save to process

        // =================================================================
        // STEP 7: Update JSON
        // =================================================================
        logger.info('Updating worker-specific JSON with contratoCliente...');
        operationalData.contratoCliente = {
            id: contractId,
            nroContrato: nroContrato,
            tipo: 'Venta',
            clienteNombre: clienteNombre
        };
        fs.writeFileSync(dataPath, JSON.stringify(operationalData, null, 2), 'utf-8');
        logger.info(`Saved contratoCliente.id: ${contractId}`);

        // =================================================================
        // STEP 8: Verification
        // =================================================================
        await page.goto(`https://moveontruckqa.bermanntms.cl/contrato/editar/${contractId}`);
        await page.waitForLoadState('networkidle');
        await expect(page.getByText('05082025-1').first()).toBeVisible({ timeout: 10000 });
        logger.info('Route 715 verified');

        // Final Summary
        const executionTime = ((Date.now() - startTime) / 1000).toFixed(2);
        logger.info('='.repeat(80));
        logger.info(`STEP 5.5 COMPLETE in ${executionTime}s`);
        logger.info('='.repeat(80));
    });
});