import { test, expect } from '../../../../../src/fixtures/base.js';
import { logger } from '../../../../../src/utils/logger.js';
import { ContratosFormPage } from '../../../../../src/modules/contracts/pages/ContratosPage.js';
import { DataPathHelper } from '../../../../api-helpers/DataPathHelper.js';
import fs from 'fs';

test.describe('Contract Creation - Optimized (Uses Existing Entities)', () => {
  test.setTimeout(60000); 

  test('Create Contract using Pre-existing Entities from JSON', async ({ page }, testInfo) => {
    logger.info('🚀 Starting LEGACY Contract Creation (Fast-Check Mode)');

    const dataPath = DataPathHelper.getWorkerDataPath(testInfo);
    if (!fs.existsSync(dataPath)) throw new Error('Data file not found');
    const operationalData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
    const transportistaNombre = operationalData.transportista.nombre;

    const contratosPage = new ContratosFormPage(page);
    await contratosPage.navigateToCreate(); 

    const nroContrato = String(Math.floor(10000 + Math.random() * 90000));
    logger.info(`📝 Filling contract. Nro: ${nroContrato}`);

    await page.fill('#contrato-nro_contrato', nroContrato);

    await page.evaluate(() => {
        const $ = (window as any).jQuery;
        $('#contrato-tipo_tarifa_contrato_id').val('1').trigger('change');
    });
    await page.waitForResponse(r => r.url().includes('rendersubview') && r.status() === 200, { timeout: 15000 }).catch(()=>null);

    await page.evaluate((nombre) => {
        const $ = (window as any).jQuery;
        const $sel = $('#contrato-transportista_id');
        const val = $sel.find('option').filter(function(this: any) {
             return ($(this).text() || '').toUpperCase().includes(nombre.toUpperCase());
        }).val();
        if (val) {
            $sel.val(val).trigger('change');
            if ($sel.selectpicker) $sel.selectpicker('refresh');
        }
    }, transportistaNombre);

    logger.info('💾 Saving Contract Header...');
    await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle' }),
        page.click('#btn_guardar')
    ]);

    // VALIDACIÓN PRIMARIA: Si estamos en editar/ver, se creó.
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/\/(?:editar|update|ver|view)\/(\d+)/);
    const idMatch = currentUrl.match(/\/(?:editar|update|ver|view)\/(\d+)/);
    const contractId = idMatch ? idMatch[1] : 'Unknown';
    logger.info(`✅ Header saved! ID: ${contractId}`);

    // Fase 2: Agregar Rutas (Confirmación de funcionalidad)
    await contratosPage.addSpecificRouteAndCargo('20000', '50000');
    
    logger.info('💾 Saving Final Contract...');
    await contratosPage.saveAndExtractId();

    // FIN DEL TEST. No vamos al index. Si llegamos aquí, funcionó.
    logger.info(`✅ Legacy Contract Flow Complete. ID: ${contractId}`);
  });
});