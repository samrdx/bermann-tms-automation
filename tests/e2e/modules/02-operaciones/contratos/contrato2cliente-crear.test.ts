import { test, expect } from '../../../../../src/fixtures/base.js';
import { logger } from '../../../../../src/utils/logger.js';
import { ContratosFormPage } from '../../../../../src/modules/contracts/pages/ContratosPage.js';
import { DataPathHelper } from '../../../../api-helpers/DataPathHelper.js';
import fs from 'fs';

test.describe('Cliente Contract Creation (Venta Type)', () => {
    test.setTimeout(120000);

    test('Create Cliente Contract using Pre-existing Entities from JSON', async ({ page }, testInfo) => {
        const dataPath = DataPathHelper.getWorkerDataPath(testInfo);
        if (!fs.existsSync(dataPath)) throw new Error(`Data file not found at ${dataPath}`);
        const operationalData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
        const clienteNombre = operationalData.cliente.nombreFantasia || operationalData.cliente.nombre;

        const contratosPage = new ContratosFormPage(page);
        await contratosPage.navigateToCreate();

        // --- FIX 1: Guardar el número en variable para poder buscarlo luego ---
        const nroContrato = String(Math.floor(10000 + Math.random() * 90000));
        logger.info(`📝 Creating VENTA contract ${nroContrato} for ${clienteNombre}`);

        // Formulario
        await page.fill('#contrato-nro_contrato', nroContrato);
        
        await page.evaluate(() => {
            const el = document.querySelector('#contrato-tipo_tarifa_contrato_id') as HTMLSelectElement;
            if (el) { el.value = '2'; el.dispatchEvent(new Event('change')); }
        });
        await page.waitForTimeout(500);

        await page.waitForSelector('select#tipo', { state: 'attached' });
        await page.evaluate(() => {
            const el = document.querySelector('select#tipo') as HTMLSelectElement;
            if (el) { el.value = '1'; el.dispatchEvent(new Event('change')); }
        });
        await page.waitForTimeout(500);

        logger.info(`Selecting cliente: "${clienteNombre}"`);
        await page.evaluate(() => { const btn = document.querySelector('button[data-id="contrato-cliente_id"]') as HTMLElement; if(btn) btn.click(); });
        
        const menu = page.locator('div.dropdown-menu.show').first();
        await menu.waitFor({state:'visible'});
        await menu.locator('.bs-searchbox input').fill(clienteNombre);
        await page.waitForTimeout(1000);
        await page.keyboard.press('ArrowDown');
        await page.keyboard.press('Enter');
        if(await menu.isVisible()) await page.keyboard.press('Escape');
        await contratosPage.forceCloseModal();

        // Guardado Inicial
        logger.info('Clicking Guardar button...');
        await page.waitForSelector('#btn_guardar');
        await Promise.all([
             page.waitForNavigation({ waitUntil: 'networkidle' }), // Usamos wait for navigation generico
             page.evaluate(() => (document.querySelector('#btn_guardar') as HTMLElement).click())
        ]);

        const currentUrl = page.url();
        const contractId = currentUrl.match(/\/(?:editar|update|ver|view)\/(\d+)/)?.[1];
        // Si no capturamos ID es warning pero seguimos si la URL cambió
        logger.info(`✅ Contract created! ID: ${contractId || 'Unknown'}`);

        // Add Route
        await contratosPage.addSpecificRouteAndCargo('20000', '50000');

        // Final Save
        logger.info('Saving final changes...');
        await contratosPage.saveAndExtractId();

        // Update JSON
        if (contractId) {
            operationalData.contratoCliente = {
                id: contractId,
                nroContrato: nroContrato, // Guardamos el numero real
                tipo: 'Venta',
                clienteNombre: clienteNombre
            };
            fs.writeFileSync(dataPath, JSON.stringify(operationalData, null, 2), 'utf-8');
        }

        // =================================================================
        // STEP 8: Verification - FIX ROBUSTO
        // =================================================================
        logger.info('🔍 PHASE 4: Verifying contract in table...');

        if (!page.url().includes('/contrato/index')) {
            await page.goto('https://moveontruckqa.bermanntms.cl/contrato/index');
        }
        await page.waitForLoadState('networkidle');

        // --- FIX 2: Búsqueda explícita por Nro Contrato ---
        logger.info(`🔎 Filtering table by Nro: ${nroContrato}`);
        const searchBox = page.locator('input[type="search"]').first();
        await searchBox.waitFor({ state: 'visible' });
        await searchBox.fill(nroContrato);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(1500); // Esperar que la tabla se refresque

        // Verificar fila
        const contractRow = page.locator('table tbody tr')
          .filter({ hasText: nroContrato })
          .first();

        await expect(contractRow).toBeVisible({ timeout: 15000 });
        logger.info(`✅ Contract ${nroContrato} verified successfully in index.`);
    });
});