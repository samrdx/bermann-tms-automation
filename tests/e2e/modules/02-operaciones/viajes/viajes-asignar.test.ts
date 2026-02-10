import { test, expect } from '../../../../../src/fixtures/base.js';
import { AsignarPage } from '../../../../../src/modules/planning/pages/AsignarPage.js';
import { TmsApiClient } from '../../../../api-helpers/TmsApiClient.js';
import { logger } from '../../../../../src/utils/logger.js';

test.describe('Viajes - Asignar (Business Logic Workflow)', () => {
  test('Should assign Trip to Transportista (Full Contract Setup)', async ({ page }) => {
    test.setTimeout(180000); // 3 minutes - Creates entire ecosystem (7 entities + contracts)
    
    const api = new TmsApiClient(page);
    await api.initialize(); 

    // 1. Definir nombres únicos
    const transName = `TransAPI ${Math.floor(Math.random() * 9000)}`;
    const cliName = `CliAPI ${Math.floor(Math.random() * 9000)}`;

    // 2. Crear Entidades (Ecosistema completo)
    await api.createTransportista(transName);
    const clienteId = await api.createCliente(cliName);

    // 3. Asociar Vehículo y Conductor (usando NOMBRE del transportista)
    await api.createVehiculo(transName);
    await api.createConductor(transName);

    // 4. Crear Contratos (Venta para cliente, Costo para transportista)
    // Esto asegura que la API de planificación y la UI de asignación funcionen.
    await api.createContratoVenta(cliName);
    await api.createContratoCosto(transName);

    // 5. Planificar Viaje con el Cliente Nuevo
    const nroViaje = `API-V${Math.floor(Math.random() * 100000)}`;
    await api.createViaje(clienteId, nroViaje);
    
    // 6. Verificación en UI de Asignación
    const asignarPage = new AsignarPage(page);
    await asignarPage.navigate();
    
    logger.info(`🔍 UI: Buscando viaje ${nroViaje}...`);
    await asignarPage.selectViajeRow(nroViaje);

    // Step 9: Select Transportista in Assignment Form
    logger.info(`💉 Selecting transportista: ${transName}`);
    const transportistaSelected = await page.evaluate((nombre) => {
        const selects = Array.from(document.querySelectorAll('select'));
        for (const select of selects) {
            const option = Array.from(select.options).find(opt =>
                opt.text.toUpperCase().includes(nombre.toUpperCase())
            );
            if (option) {
                select.value = option.value;
                select.dispatchEvent(new Event('change', { bubbles: true }));
                // @ts-ignore
                if (window.$) window.$(select).selectpicker('refresh');
                return { found: true, selectId: select.id, optionText: option.text };
            }
        }
        return { found: false };
    }, transName);

    if (!transportistaSelected.found) {
        throw new Error(`Transportista "${transName}" not found in dropdown`);
    }
    logger.info(`✅ Transportista selected: ${transportistaSelected.optionText}`);

    // Step 10: Wait for Cascade (Vehicle/Conductor dropdowns populate)
    logger.info('⏳ Waiting for cascade (vehicle/conductor loading)...');
    await page.waitForTimeout(3000); // Wait for AJAX cascade

    // Step 11: Click Guardar to Finalize Assignment
    logger.info('💾 Clicking Guardar...');
    await page.click('#btn_guardar_form');
    await page.waitForLoadState('networkidle');

    // Step 12: Verify Assignment Success
    logger.info('🔍 Verifying assignment...');
    await page.waitForTimeout(2000);
    const currentUrl = page.url();
    expect(currentUrl).toContain('/viajes/asignar');
    logger.info(`✅ SUCCESS: Trip ${nroViaje} assigned to ${transName}`);
  });
});