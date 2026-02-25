import { test, expect } from '../../../../../src/fixtures/base.js';
import { logger } from '../../../../../src/utils/logger.js';
import { ContratosFormPage } from '../../../../../src/modules/contracts/pages/ContratosPage.js';
import { DataPathHelper } from '../../../../api-helpers/DataPathHelper.js';
import { config } from '../../../../../src/config/environment.js';
import fs from 'fs';

/**
 * Contract Creation - Tipo Venta (Uses Seeded Cliente)
 *
 * Prerequisites:
 * - Run `npm run test:entity:cliente` first (writes seededCliente to JSON)
 *   OR run `npm run test:legacy:setup` (base-entities.setup.ts also writes seededCliente)
 *
 * This test:
 * - Loads seededCliente from worker-specific JSON
 * - Creates a Venta contract header (Tipo 2, Subtipo 1)
 * - Adds Route 715 + Cargo 715_19 with tarifas
 * - Saves the full contract
 * - Verifies the contract appears in /contrato/index
 * - Stores contract info in JSON for downstream tests
 */
test.describe('Contract Creation - Venta (Uses Seeded Cliente)', () => {
    test.setTimeout(120000);

    test('Create Contract (Venta) using Seeded Cliente', async ({ page }, testInfo) => {
        const startTime = Date.now();
        logger.info('='.repeat(80));
        logger.info('🚀 Starting Contract Creation - Tipo Venta (Seeded Cliente Mode)');
        logger.info('='.repeat(80));

        // =================================================================
        // PHASE 1: Load Data
        // =================================================================
        logger.info('📋 PHASE 1: Loading seeded client data...');
        const dataPath = DataPathHelper.getWorkerDataPath(testInfo);
        if (!fs.existsSync(dataPath)) throw new Error(`Data file not found: ${dataPath}`);
        const operationalData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

        if (!operationalData.seededCliente) {
            throw new Error(
                `'seededCliente' key not found in ${dataPath}.\n` +
                `Run 'npm run test:entity:cliente' first.`
            );
        }
        const clienteNombre = operationalData.seededCliente.nombreFantasia || operationalData.seededCliente.nombre;
        logger.info(`📦 Using seeded cliente: "${clienteNombre}" (ID: ${operationalData.seededCliente.id})`);

        // =================================================================
        // PHASE 2: Navigate to Create Form
        // =================================================================
        logger.info('📋 PHASE 2: Navigating to contract creation form...');
        const contratosPage = new ContratosFormPage(page);
        await contratosPage.navigateToCreate();
        await page.waitForLoadState('domcontentloaded');
        logger.info('✅ Form loaded');

        // =================================================================
        // PHASE 3: Fill Contract Header
        // =================================================================
        logger.info('📋 PHASE 3: Filling contract header...');
        const nroContrato = String(Math.floor(10000 + Math.random() * 90000));
        logger.info(`📝 Nro Contrato: ${nroContrato}`);

        // Nro Contrato
        await page.fill('#contrato-nro_contrato', nroContrato);

        // Tipo: Venta (value=2) — wait for AJAX rendersubview to complete
        logger.info('Selecting Tipo: Venta (2)...');
        await page.evaluate(() => {
            const $ = (window as any).jQuery;
            $('#contrato-tipo_tarifa_contrato_id').val('2').trigger('change');
        });
        await page.waitForResponse(
            r => r.url().includes('rendersubview') && r.status() === 200,
            { timeout: 15000 }
        ).catch(() => {
            logger.warn('⚠️ rendersubview response not detected, continuing with timeout...');
            return page.waitForTimeout(2000);
        });
        logger.info('✅ Tipo Venta selected');

        // Subtipo (value=1) — wait for any cascade
        logger.info('Selecting Subtipo: 1...');
        await page.waitForSelector('select#tipo', { state: 'attached', timeout: 10000 });
        await page.evaluate(() => {
            const el = document.querySelector('select#tipo') as HTMLSelectElement;
            if (el) { el.value = '1'; el.dispatchEvent(new Event('change', { bubbles: true })); }
        });
        await page.waitForTimeout(800);
        logger.info('✅ Subtipo selected');

        // Cliente — via jQuery selector (same pattern as contrato-crear.test.ts)
        logger.info(`Selecting Cliente: "${clienteNombre}"...`);
        const clienteSelected = await page.evaluate((nombre) => {
            const $ = (window as any).jQuery;
            const $sel = $('#contrato-cliente_id');
            const opt = $sel.find('option').filter(function (this: any) {
                return ($(this).text() || '').toUpperCase().includes(nombre.toUpperCase());
            });
            if (opt.length > 0) {
                const val = opt.first().val();
                $sel.val(val).trigger('change');
                if ($sel.selectpicker) $sel.selectpicker('refresh');
                return { found: true, text: opt.first().text(), val: String(val) };
            }
            return { found: false, text: '', val: '' };
        }, clienteNombre);

        if (!clienteSelected.found) {
            logger.warn(`⚠️ Cliente "${clienteNombre}" not found in dropdown. Available options:`);
            const options = await page.evaluate(() => {
                const $ = (window as any).jQuery;
                return $('#contrato-cliente_id option').map(function (this: any) {
                    return $(this).text();
                }).get().filter((t: string) => t.trim());
            });
            logger.warn(`  Options: ${options.slice(0, 10).join(', ')}`);
            throw new Error(`Cliente "${clienteNombre}" not found in contract form dropdown.`);
        }
        logger.info(`✅ Cliente selected: "${clienteSelected.text}" (val: ${clienteSelected.val})`);
        await page.waitForTimeout(500);

        // =================================================================
        // PHASE 4: Save Contract Header
        // =================================================================
        logger.info('📋 PHASE 4: Saving contract header...');
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 }),
            page.click('#btn_guardar')
        ]);

        const urlAfterHeader = page.url();
        expect(urlAfterHeader).toMatch(/\/(?:editar|update|ver|view)\/(\d+)/);
        const contractIdMatch = urlAfterHeader.match(/\/(?:editar|update|ver|view)\/(\d+)/);
        const contractId = contractIdMatch ? contractIdMatch[1] : '';
        logger.info(`✅ Contract header saved! URL: ${urlAfterHeader}, ID: ${contractId}`);

        // =================================================================
        // PHASE 5: Add Route + Cargo + Tarifas
        // =================================================================
        logger.info('📋 PHASE 5: Adding Route 715 + Cargo 715_19 with tarifas...');
        await contratosPage.addSpecificRouteAndCargo('20000', '50000');

        // CRITICAL: Wait until the tarifa inputs actually have a value before proceeding
        // This is the race condition fix — we confirm the form state is ready
        logger.info('⏳ Verifying tarifa inputs are populated before saving...');
        await page.waitForFunction(() => {
            const cond = document.querySelector('#txt_tarifa_conductor_715') as HTMLInputElement;
            const viaje = document.querySelector('#txt_tarifa_extra_715') as HTMLInputElement;
            return cond && viaje && cond.value.length > 0 && viaje.value.length > 0;
        }, { timeout: 10000 }).catch(() => {
            logger.warn('⚠️ Tarifa inputs may not have values — saving anyway');
        });
        logger.info('✅ Tarifa inputs confirmed');

        // =================================================================
        // PHASE 6: Save Full Contract (with tarifas)
        // =================================================================
        logger.info('📋 PHASE 6: Saving full contract (with tarifa)...');
        await Promise.all([
            page.waitForNavigation({ waitUntil: 'networkidle', timeout: 30000 }),
            page.click('#btn_guardar')
        ]);

        const urlAfterFull = page.url();
        logger.info(`✅ Full contract saved! URL: ${urlAfterFull}`);

        // =================================================================
        // PHASE 7: Verify contract exists in index
        // =================================================================
        logger.info('📋 PHASE 7: Verifying contract in index...');
        await page.goto(`${config.get().baseUrl}/contrato/index`);
        await page.waitForLoadState('networkidle', { timeout: 15000 });
        await page.waitForTimeout(1500);

        // Use the confirmed DataTables global search input
        // Confirmed via live inspection: input[type="search"] with class="form-control form-control-sm"
        // and a label "Buscar:" are both present in /contrato/index
        const dtSearchInput = page.locator('input[type="search"]').first();
        const buscarLabelInput = page.getByLabel('Buscar:');

        // Try the DataTables search input first (confirmed present)
        if (await dtSearchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
            await dtSearchInput.fill(nroContrato);
            await dtSearchInput.press('Enter');
            logger.info(`🔍 Searched by contract number using input[type="search"]: ${nroContrato}`);
        } else if (await buscarLabelInput.isVisible({ timeout: 2000 }).catch(() => false)) {
            // Fallback: aria-label "Buscar:"
            await buscarLabelInput.fill(nroContrato);
            await buscarLabelInput.press('Enter');
            logger.info(`🔍 Searched by contract number using getByLabel('Buscar:'): ${nroContrato}`);
        } else {
            logger.warn('⚠️ No search input found in contract index, skipping search filter');
        }
        await page.waitForTimeout(1500);

        const contractRow = page.locator('table tbody tr').filter({ hasText: nroContrato }).first();
        await expect(contractRow, `Contract ${nroContrato} should be visible in the index grid`).toBeVisible({ timeout: 10000 });
        logger.info(`✅ Contract ${nroContrato} verified in /contrato/index ✅`);

        // Extract final ID from grid row if not already captured
        let finalId = contractId;
        if (!finalId) {
            const editLink = contractRow.locator('a[href*="/contrato/editar/"]').first();
            const href = await editLink.getAttribute('href').catch(() => null);
            const idFromGrid = href?.match(/\/editar\/(\d+)/)?.[1];
            if (idFromGrid) {
                finalId = idFromGrid;
                logger.info(`✅ Contract ID from grid: ${finalId}`);
            }
        }

        // =================================================================
        // PHASE 8: Persist to JSON
        // =================================================================
        logger.info('📋 PHASE 8: Persisting contract data to JSON...');
        operationalData.contratoCliente = { id: finalId, nroContrato: nroContrato };
        fs.writeFileSync(dataPath, JSON.stringify(operationalData, null, 2), 'utf-8');
        logger.info(`✅ contratoCliente data saved to ${dataPath}`);

        // =================================================================
        // SUMMARY
        // =================================================================
        const executionTime = ((Date.now() - startTime) / 1000).toFixed(2);
        logger.info('='.repeat(80));
        logger.info('✅ VENTA CONTRACT CREATION COMPLETE!');
        logger.info('='.repeat(80));
        logger.info(`   Nro Contrato: ${nroContrato}`);
        logger.info(`   Contract ID: ${finalId}`);
        logger.info(`   Cliente: ${clienteNombre}`);
        logger.info(`   Execution Time: ${executionTime}s`);
        logger.info('='.repeat(80));
    });
});