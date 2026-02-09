import { test, expect } from '../../../../../src/fixtures/base.js';
import { logger } from '../../../../../src/utils/logger.js';
import { ContratosFormPage } from '../../../../../src/modules/contracts/pages/ContratosPage.js';
import { DataPathHelper } from '../../../../api-helpers/DataPathHelper.js';
import fs from 'fs';

test.describe('Cliente Contract Creation (Venta Type)', () => {
    test.setTimeout(120000);

    test('Create Cliente Contract using Pre-existing Entities from JSON', async ({ page }, testInfo) => {
        // ... (Carga de datos y navegación: CÓDIGO IDÉNTICO AL ANTERIOR) ...
        const dataPath = DataPathHelper.getWorkerDataPath(testInfo);
        if (!fs.existsSync(dataPath)) throw new Error(`Data file not found at ${dataPath}`);
        const operationalData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
        const clienteNombre = operationalData.cliente.nombreFantasia || operationalData.cliente.nombre;

        const contratosPage = new ContratosFormPage(page);
        await contratosPage.navigateToCreate();

        // Formulario
        await page.fill('#contrato-nro_contrato', String(Math.floor(10000 + Math.random() * 90000)));
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
             page.waitForURL(url => !url.toString().includes('/crear'), { timeout: 15000 }),
             page.evaluate(() => (document.querySelector('#btn_guardar') as HTMLElement).click())
        ]);

        const currentUrl = page.url();
        const contractId = currentUrl.match(/\/editar\/(\d+)/)?.[1];
        if (!contractId) throw new Error('Failed to extract Contract ID');
        logger.info(`✅ Contract created! ID: ${contractId}`);

        // Add Route
        await contratosPage.addSpecificRouteAndCargo('20000', '50000');

        // Final Save
        logger.info('Saving final changes...');
        await page.evaluate(() => (document.querySelector('#btn_guardar') as HTMLElement).click());
        await page.waitForTimeout(3000);

        // Update JSON
        operationalData.contratoCliente = {
            id: contractId,
            nroContrato: 'AUTO',
            tipo: 'Venta',
            clienteNombre: clienteNombre
        };
        fs.writeFileSync(dataPath, JSON.stringify(operationalData, null, 2), 'utf-8');

        // =================================================================
        // STEP 8: Verification (CON RELOAD)
        // =================================================================
        logger.info('Verifying route creation (Reloading to ensure persistence)...');
        await page.goto(`https://moveontruckqa.bermanntms.cl/contrato/editar/${contractId}`);
        await page.waitForLoadState('networkidle');
        
        // Buscar la celda
        const routeCell = page.getByText('05082025-1').first();
        
        // Verificar existencia primero
        if (await routeCell.count() === 0) {
             logger.warn('Route not found immediately. Retrying reload...');
             await page.reload();
             await page.waitForLoadState('networkidle');
        }

        // Scroll y check
        await routeCell.scrollIntoViewIfNeeded();
        await expect(routeCell).toBeVisible({ timeout: 10000 });
        
        logger.info('Route 715 verified');
        logger.info('STEP 5.5 COMPLETE');
    });
});