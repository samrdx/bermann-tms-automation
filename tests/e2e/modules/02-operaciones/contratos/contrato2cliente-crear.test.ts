import { test, expect } from '../../../../../src/fixtures/base.js';
import { logger } from '../../../../../src/utils/logger.js';
import { ContratosFormPage } from '../../../../../src/modules/contracts/pages/ContratosPage.js';
import { DataPathHelper } from '../../../../api-helpers/DataPathHelper.js';
import fs from 'fs';

/**
 * Step 5.5: Cliente Contract Creation (Type: Venta)
 *
 * Prerequisites:
 * 1. Run base-entities.setup.ts to generate last-run-data.json
 * 2. Cliente must already exist in the system
 *
 * This test:
 * - Loads existing entity data from last-run-data.json
 * - Creates a VENTA type contract for the Cliente
 * - Adds Route 715 and Cargo 19
 * - Saves contratoCliente.id to JSON for Step 6
 */
test.describe('Cliente Contract Creation (Venta Type)', () => {
    test.setTimeout(60000);

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
            throw new Error(
                'Worker-specific data file not found!\n' +
                `Expected: ${dataPath}\n` +
                'Please run base entities setup first:\n' +
                'npm run test:base'
            );
        }

        const operationalData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

        logger.info('Loaded existing entities:');
        logger.info(`   Cliente: ${operationalData.cliente.nombre} (${operationalData.cliente.rut})`);
        logger.info('');

        // Note: Already authenticated via storageState from setup project

        // =================================================================
        // STEP 2: Navigate to Contract Creation
        // =================================================================
        logger.info('Navigating to contract creation...');
        const contratosPage = new ContratosFormPage(page);
        await contratosPage.navigateToCreate();
        logger.info('Navigation complete');
        logger.info('');

        // ===================================================================
        // PHASE 1: Create Basic Cliente Contract (Venta Type)
        // ===================================================================
        logger.info('PHASE 1: Creating Cliente contract (Venta)...');

        // Generate numeric-only contract number (5 digits)
        const nroContrato = String(Math.floor(10000 + Math.random() * 90000));
        const clienteNombre = operationalData.cliente.nombre;

        logger.info(`   Nro Contrato: ${nroContrato}`);
        logger.info(`   Cliente: ${clienteNombre}`);
        logger.info(`   Tipo: Venta (value=2)`);

        // Fill Nro Contrato
        await page.fill('#contrato-nro_contrato', nroContrato);
        await page.waitForTimeout(300);
        logger.info('Nro Contrato filled');

        // Select Tipo Contrato = "Venta" (value='2') - uses selectpicker + onchange
        await page.evaluate((val: string) => {
            const $ = (window as any).$;
            const selectEl = document.querySelector('#contrato-tipo_tarifa_contrato_id') as HTMLSelectElement;
            if ($ && selectEl && $(selectEl).selectpicker) {
                $(selectEl).selectpicker('val', val);
            } else if (selectEl) {
                selectEl.value = val;
            }
            // CRITICAL: Trigger inline onchange="seleccionarEntidadContrato()"
            if (selectEl) {
                selectEl.dispatchEvent(new Event('change', { bubbles: true }));
                if (typeof selectEl.onchange === 'function') {
                    selectEl.onchange(new Event('change'));
                }
            }
        }, '2');
        await page.waitForTimeout(1500);
        logger.info('Selected Tipo Contrato: Venta');

        // After selecting "Venta", a new dropdown appears: "Tipo Contrato de Venta"
        // We need to select "Clientes" (value="1") in this dropdown
        // IMPORTANT: The selector is #tipo (discovered via browser inspection)
        logger.info('Selecting Tipo Contrato de Venta: Clientes');
        const tipoContratoVentaSelect = page.locator('select#tipo');
        await tipoContratoVentaSelect.waitFor({ state: 'attached', timeout: 5000 });

        // Select "Clientes" option (value="1") - uses selectpicker + onchange
        await page.evaluate((val: string) => {
            const $ = (window as any).$;
            const selectEl = document.querySelector('#tipo') as HTMLSelectElement;
            if ($ && selectEl && $(selectEl).selectpicker) {
                $(selectEl).selectpicker('val', val);
            } else if (selectEl) {
                selectEl.value = val;
            }
            if (selectEl) {
                selectEl.dispatchEvent(new Event('change', { bubbles: true }));
                if (typeof selectEl.onchange === 'function') {
                    selectEl.onchange(new Event('change'));
                }
            }
        }, '1');
        await page.waitForTimeout(1500);
        logger.info('Selected Tipo Contrato de Venta: Clientes');

        // Now the Cliente dropdown should appear
        // Dropdown shows abbreviated names (e.g., "CAMINO SPA" instead of full name)
        // Extract first word from cliente name for partial matching
        const searchTerm = clienteNombre.split(' ')[0].toUpperCase(); // e.g., "CAMINO"
        logger.info(`Searching for cliente containing: "${searchTerm}"`);

        // Wait for the select to have options loaded
        const clienteSelect = page.locator('select#contrato-cliente_id');
        await clienteSelect.waitFor({ state: 'attached', timeout: 5000 });
        await page.waitForTimeout(1000); // Wait for options to load

        // Find an option containing our search term (partial match)
        const matchingOption = page.locator(`select#contrato-cliente_id option`).filter({
            hasText: new RegExp(searchTerm, 'i')
        }).first();

        // Check if we found a matching option
        const optionCount = await page.locator(`select#contrato-cliente_id option`).filter({
            hasText: new RegExp(searchTerm, 'i')
        }).count();

        if (optionCount === 0) {
            // Log available options for debugging
            const allOptions = await page.locator('select#contrato-cliente_id option').allTextContents();
            logger.warn(`No option found containing "${searchTerm}". Available: ${allOptions.slice(0, 10).join(', ')}...`);
            throw new Error(`Cliente containing "${searchTerm}" not found in dropdown`);
        }

        const clienteValue = await matchingOption.getAttribute('value');
        const clienteText = await matchingOption.textContent();
        logger.info(`Found cliente: ${clienteText?.trim()} (value=${clienteValue})`);

        // Select using selectpicker + onchange trigger
        if (clienteValue) {
            await page.evaluate((val: string) => {
                const $ = (window as any).$;
                const selectEl = document.querySelector('#contrato-cliente_id') as HTMLSelectElement;
                if ($ && selectEl && $(selectEl).selectpicker) {
                    $(selectEl).selectpicker('val', val);
                } else if (selectEl) {
                    selectEl.value = val;
                }
                if (selectEl) {
                    selectEl.dispatchEvent(new Event('change', { bubbles: true }));
                    if (typeof selectEl.onchange === 'function') {
                        selectEl.onchange(new Event('change'));
                    }
                }
            }, clienteValue);
        }
        await page.waitForTimeout(1000);
        logger.info('Cliente selected');

        // Force close any phantom modals before saving
        await contratosPage.forceCloseModal();
        await page.waitForTimeout(500);

        // Save basic contract - may redirect to /editar or /index
        logger.info('Clicking Guardar button...');
        await page.click('button.btn-success:has-text("Guardar"), #btn_guardar');

        // Wait for navigation (give time for save to process)
        await page.waitForTimeout(3000);

        const currentUrl = page.url();
        logger.info(`Post-save URL: ${currentUrl}`);

        let contractId: string;

        // Try to extract from /contrato/editar/{id} URL
        const editMatch = currentUrl.match(/\/contrato\/editar\/(\d+)/);
        if (editMatch) {
            contractId = editMatch[1];
            logger.info(`✅ Contract created! ID: ${contractId} (redirected to edit page)`);
        } else if (currentUrl.includes('/contrato/index')) {
            // Redirected to index - need to search for the contract
            logger.info('⚠️ Redirected to index page - searching for created contract...');

            // Search by contract number in the grid
            const searchBox = page.locator('input[type="search"]');
            await searchBox.fill(nroContrato);
            await page.waitForTimeout(1500);

            // Find the contract row and extract ID from view/edit link
            const contractRow = page.locator('table tbody tr').filter({ hasText: nroContrato }).first();
            await expect(contractRow).toBeVisible({ timeout: 5000 });

            const viewLink = contractRow.locator('a[href*="/contrato/view/"]').first();
            const viewHref = await viewLink.getAttribute('href');

            const viewMatch = viewHref?.match(/\/contrato\/view\/(\d+)/);
            if (viewMatch) {
                contractId = viewMatch[1];
                logger.info(`✅ Contract created! ID: ${contractId} (found in grid)`);

                // Navigate to edit page
                logger.info(`Navigating to edit page for contract ${contractId}...`);
                await page.goto(`https://moveontruckqa.bermanntms.cl/contrato/editar/${contractId}`);
                await page.waitForTimeout(1500);
            } else {
                throw new Error(`Could not extract contract ID from grid. ViewHref: ${viewHref}`);
            }
        } else {
            throw new Error(`Unexpected URL after save: ${currentUrl}`);
        }

        logger.info('');

        // ===================================================================
        // PHASE 2: Add Route 715 & Cargo (on /contrato/editar/{id} page)
        // ===================================================================
        const tarifaConductor = '20000';
        const tarifaViaje = '50000';

        logger.info('PHASE 2: Adding Route 715 and Cargo...');
        logger.info(`   Tarifa Conductor: ${tarifaConductor}`);
        logger.info(`   Tarifa Viaje: ${tarifaViaje}`);

        await contratosPage.addSpecificRouteAndCargo(tarifaConductor, tarifaViaje);

        logger.info('Route and cargo added');
        logger.info('');

        // ===================================================================
        // STEP 6: Save Contract (Final Save)
        // ===================================================================
        logger.info('Saving contract (final)...');
        // Don't use saveAndExtractId() since we already have the ID and page redirects to index
        await page.click('button.btn-success:has-text("Guardar"), #btn_guardar');
        await page.waitForTimeout(2000);
        logger.info(`Contract saved! ID: ${contractId}`);
        logger.info('');

        // =================================================================
        // STEP 7: Update JSON with Cliente Contract
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
        logger.info('');

        // =================================================================
        // STEP 8: Verification
        // =================================================================
        logger.info('Verifying contract...');
        // After save, page redirects to index. Navigate back to edit page to verify route.
        await page.goto(`https://moveontruckqa.bermanntms.cl/contrato/editar/${contractId}`);
        await page.waitForLoadState('networkidle');
        await expect(page.getByText('05082025-1').first()).toBeVisible({ timeout: 10000 });
        logger.info('Route 715 verified');
        logger.info('');

        // =================================================================
        // STEP 9: Final Summary
        // =================================================================
        const executionTime = ((Date.now() - startTime) / 1000).toFixed(2);

        logger.info('='.repeat(80));
        logger.info('STEP 5.5: CLIENTE CONTRACT COMPLETE!');
        logger.info('='.repeat(80));
        logger.info(`Execution Time: ${executionTime}s`);
        logger.info('');
        logger.info('Contract Details:');
        logger.info(`   ID: ${contractId}`);
        logger.info(`   Tipo: Venta`);
        logger.info(`   Route: 715 (05082025-1)`);
        logger.info(`   Cliente: ${clienteNombre}`);
        logger.info('='.repeat(80));

        // Assertions
        expect(contractId).toBeTruthy();
        expect(contractId).toMatch(/^\d+$/);
    });
});
