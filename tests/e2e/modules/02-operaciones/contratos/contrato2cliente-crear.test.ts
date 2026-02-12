import { test, expect } from '../../../../../src/fixtures/base.js';
import { logger } from '../../../../../src/utils/logger.js';
import { ContratosFormPage } from '../../../../../src/modules/contracts/pages/ContratosPage.js';
import { DataPathHelper } from '../../../../api-helpers/DataPathHelper.js';
import fs from 'fs';

test.describe('Cliente Contract Creation (Venta Type)', () => {
    test.setTimeout(120000);

    test('Create Cliente Contract using Pre-existing Entities from JSON', async ({ page }, testInfo) => {
        const dataPath = DataPathHelper.getWorkerDataPath(testInfo);
        if (!fs.existsSync(dataPath)) throw new Error(`Data file not found`);
        const operationalData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
        const clienteNombre = operationalData.cliente.nombreFantasia || operationalData.cliente.nombre;

        const contratosPage = new ContratosFormPage(page);
        await contratosPage.navigateToCreate();

        const nroContrato = String(Math.floor(10000 + Math.random() * 90000));
        logger.info(`📝 Creating VENTA contract ${nroContrato} for ${clienteNombre}`);

        await page.fill('#contrato-nro_contrato', nroContrato);
        
        // Tipo Venta
        await page.evaluate(() => {
            const el = document.querySelector('#contrato-tipo_tarifa_contrato_id') as HTMLSelectElement;
            if (el) { el.value = '2'; el.dispatchEvent(new Event('change')); }
        });
        await page.waitForTimeout(1000);

        // Subtipo
        await page.waitForSelector('select#tipo', { state: 'attached' });
        await page.evaluate(() => {
            const el = document.querySelector('select#tipo') as HTMLSelectElement;
            if (el) { el.value = '1'; el.dispatchEvent(new Event('change')); }
        });
        await page.waitForTimeout(500);

        // Cliente
        logger.info(`Selecting cliente: "${clienteNombre}"`);
        await page.evaluate((nombre) => {
            const $ = (window as any).jQuery;
            const $sel = $('#contrato-cliente_id');
            const val = $sel.find('option').filter(function(this: any) {
                 return ($(this).text() || '').toUpperCase().includes(nombre.toUpperCase());
            }).val();
            if(val) {
                $sel.val(val).trigger('change');
            }
        }, clienteNombre);
        await page.waitForTimeout(1000);

        // Guardado (Relajado)
        logger.info('Clicking Guardar button...');
        await page.click('#btn_guardar');

        // Esperamos a que la URL cambie (señal de éxito) en lugar de networkidle
        await expect(page).toHaveURL(/\/contrato\/editar\/\d+/, { timeout: 30000 });

        const currentUrl = page.url();
        const contractId = currentUrl.match(/\/(?:editar|update|ver|view)\/(\d+)/)?.[1];
        logger.info(`✅ Contract created! ID: ${contractId || 'Unknown'}`);

        // Add Route
        await contratosPage.addSpecificRouteAndCargo('20000', '50000');
        await contratosPage.saveAndExtractId();

        // Update JSON & Exit
        if (contractId) {
            operationalData.contratoCliente = { id: contractId, nroContrato: nroContrato };
            fs.writeFileSync(dataPath, JSON.stringify(operationalData, null, 2), 'utf-8');
        }
        logger.info(`✅ Legacy Client Contract Flow Complete.`);
    });
});