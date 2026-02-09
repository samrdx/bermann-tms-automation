import { test, expect } from '../../../../../src/fixtures/base.js';
import { logger } from '../../../../../src/utils/logger.js';
import { ContratosFormPage } from '../../../../../src/modules/contracts/pages/ContratosPage.js';
import { DataPathHelper } from '../../../../api-helpers/DataPathHelper.js';
import fs from 'fs';

test.describe('Cliente Contract Creation (Venta Type)', () => {
    test.setTimeout(120000);

    test('Create Cliente Contract using Pre-existing Entities from JSON', async ({ page }, testInfo) => {
        const startTime = Date.now();
        logger.info('Starting STEP 5.5: Cliente Contract (Venta)');
        
        const dataPath = DataPathHelper.getWorkerDataPath(testInfo);
        if (!fs.existsSync(dataPath)) throw new Error(`Data file not found at ${dataPath}`);
        const operationalData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
        const clienteNombre = operationalData.cliente.nombreFantasia || operationalData.cliente.nombre;

        const contratosPage = new ContratosFormPage(page);
        await contratosPage.navigateToCreate();

        const nroContrato = String(Math.floor(10000 + Math.random() * 90000));
        await page.fill('#contrato-nro_contrato', nroContrato);

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

        // Select Cliente
        logger.info(`Selecting cliente: "${clienteNombre}"`);
        const pickerBtn = page.locator('button[data-id="contrato-cliente_id"]');
        await pickerBtn.waitFor({ state: 'visible' });
        await pickerBtn.click();

        const parent = pickerBtn.locator('xpath=..');
        const dropdownMenu = parent.locator('.dropdown-menu.show').first();
        await dropdownMenu.waitFor({ state: 'visible' });
        const searchBox = dropdownMenu.locator('.bs-searchbox input');
        await searchBox.waitFor({ state: 'visible', timeout: 5000 });
        await searchBox.fill(clienteNombre);
        await page.waitForTimeout(1000);
        await page.keyboard.press('ArrowDown');
        await page.waitForTimeout(300);
        await page.keyboard.press('Enter');
        
        if (await dropdownMenu.isVisible()) await page.keyboard.press('Escape');
        await contratosPage.forceCloseModal();

        // --- SAVE LOGIC ---
        logger.info('Clicking Guardar button...');
        const btnGuardar = page.locator('button.btn-success:has-text("Guardar"), #btn_guardar').first();
        await btnGuardar.scrollIntoViewIfNeeded();
        
        // Estabilización
        await page.waitForTimeout(1500);

        try {
            await Promise.all([
                 page.waitForURL(url => !url.toString().includes('/crear'), { timeout: 15000 }),
                 btnGuardar.click({ force: true })
            ]);
            logger.info('✅ Save successful (1st try)');
        } catch (e) {
            logger.warn('Save timed out. Retrying...');
            
            // Check errors
            const rawErrors = await page.locator('.text-danger, .help-block, .alert-danger').allTextContents();
            const errors = rawErrors.map(e => e.trim()).filter(e => e.length > 2 && !e.includes('*'));
            if (errors.length > 0) throw new Error(`Validation Errors: ${errors.join('|')}`);

            await page.waitForTimeout(1000);
            await btnGuardar.click({ force: true });
            
            try {
                await page.waitForURL(url => !url.toString().includes('/crear'), { timeout: 15000 });
            } catch (retryE) {
                throw new Error(`Save failed after retry. URL stuck at: ${page.url()}`);
            }
        }

        // Extract ID
        const currentUrl = page.url();
        let contractId: string | undefined;
        const editMatch = currentUrl.match(/\/editar\/(\d+)/);
        if (editMatch) contractId = editMatch[1];
        else if (currentUrl.includes('/index')) {
            const searchInput = page.locator('input[type="search"]').first();
            await searchInput.fill(nroContrato);
            await page.waitForTimeout(1500);
            const row = page.locator('table tbody tr').first();
            const link = await row.locator('a[href*="/editar/"]').getAttribute('href');
            contractId = link?.match(/\/editar\/(\d+)/)?.[1];
            if (contractId) await page.goto(`https://moveontruckqa.bermanntms.cl/contrato/editar/${contractId}`);
        }

        if (!contractId) throw new Error('Failed to extract Contract ID');
        logger.info(`✅ Contract created! ID: ${contractId}`);

        await contratosPage.addSpecificRouteAndCargo('20000', '50000');

        await page.locator('button.btn-success:has-text("Guardar"), #btn_guardar').click({ force: true });
        await page.waitForTimeout(3000);

        operationalData.contratoCliente = {
            id: contractId,
            nroContrato: nroContrato,
            tipo: 'Venta',
            clienteNombre: clienteNombre
        };
        fs.writeFileSync(dataPath, JSON.stringify(operationalData, null, 2), 'utf-8');
        logger.info(`Saved contratoCliente.id: ${contractId}`);

        await page.goto(`https://moveontruckqa.bermanntms.cl/contrato/editar/${contractId}`);
        await page.waitForLoadState('networkidle');
        await expect(page.getByText('05082025-1').first()).toBeVisible({ timeout: 10000 });
        
        logger.info('STEP 5.5 COMPLETE');
    });
});