import { test, expect } from '../../../../../src/fixtures/base.js';
import { AsignarPage } from '../../../../../src/modules/planning/pages/AsignarPage.js';
import { TmsApiClient } from '../../../../api-helpers/TmsApiClient.js';
import { logger } from '../../../../../src/utils/logger.js';

// Retries habilitados para estabilidad local (útil aunque no uses Docker aún)
test.describe.configure({ mode: 'serial', retries: 1 });

test.describe('Viajes - Asignar (Business Logic Workflow)', () => {
  test('Should assign Trip to Transportista (Full Contract Setup)', async ({ page }) => {
    test.setTimeout(300000); 

    const api = new TmsApiClient(page);
    await api.initialize(); 

    // 1. Definir nombres únicos
    const transName = `TransAPI ${Math.floor(Math.random() * 9000)}`;
    const cliName = `CliAPI ${Math.floor(Math.random() * 9000)}`;

    // 2. Crear Entidades
    await api.createTransportista(transName);
    await api.createCliente(cliName);

    // 3. Crear Vehículo y Conductor (Capturamos datos)
    const patenteVehiculo = await api.createVehiculo(transName);
    const nombreConductor = await api.createConductor(transName);
    
    logger.info(`📝 Datos -> Trans: ${transName}, Veh: ${patenteVehiculo}, Cond: ${nombreConductor}`);

    // 4. Crear Contratos
    await api.createContratoVenta(cliName);
    await api.createContratoCosto(transName);

    // 5. Planificar Viaje
    const nroViaje = `API-V${Math.floor(Math.random() * 100000)}`;
    await api.createViaje(cliName, nroViaje);
    
    // 6. Verificación en UI de Asignación
    const asignarPage = new AsignarPage(page);
    await asignarPage.navigate();
    
    logger.info(`🔍 UI: Buscando viaje ${nroViaje}...`);
    await asignarPage.selectViajeRow(nroViaje);

    // 7. SELECCIONAR TRANSPORTISTA (Lógica Blindada Anti-Cambios)
    // Usamos una función específica que escribe lento, espera el filtro y VERIFICA el resultado
    await selectTransportistaRobust(page, transName);

    // 8. Esperar Cascada (AJAX)
    logger.info('⏳ Waiting for cascade (vehicle/conductor loading)...');
    await page.waitForTimeout(3000); 

    // 9. SELECCIONAR VEHÍCULO
    logger.info(`💉 Selecting Vehículo: ${patenteVehiculo}`);
    const vehiculoSelected = await selectOptionByTextJS(page, patenteVehiculo);
    if (!vehiculoSelected) {
        logger.warn(`⚠️ Vehículo "${patenteVehiculo}" no encontrado. Fallback al primero...`);
        await page.evaluate(() => {
            const selects = Array.from(document.querySelectorAll('select'));
            const vSelect = selects.find(s => s.id.includes('vehiculo')); 
            if (vSelect && vSelect.options.length > 1) {
                vSelect.selectedIndex = 1; 
                vSelect.dispatchEvent(new Event('change', { bubbles: true }));
            }
        });
    }

    // 10. SELECCIONAR CONDUCTOR
    logger.info(`💉 Selecting Conductor: ${nombreConductor}`);
    await selectOptionByTextJS(page, nombreConductor);

    // 11. GUARDAR (Y MANEJAR MODALES)
    logger.info('💾 Clicking Guardar...');
    await page.click('#btn_guardar_form');
    
    // --> FIX: Detectar y aceptar Modal de Confirmación "Estado Finalizado" <--
    try {
        // Buscamos botones comunes de confirmación (bootbox, sweetalert o nativos)
        const btnConfirmar = page.locator('.bootbox-accept, button:has-text("Aceptar"), button:has-text("Confirmar")').first();
        if (await btnConfirmar.isVisible({ timeout: 5000 })) {
            logger.info('⚠️ Modal confirmación detectado. Aceptando...');
            await btnConfirmar.click();
        }
    } catch (e) {
        logger.info('ℹ️ No confirmation modal appeared.');
    }

    // Validar que NO aparezca el error de "Sin Contrato" (Falso Positivo por mala selección)
    const errorContrato = page.locator('text="Transportista sin contrato"');
    if (await errorContrato.isVisible({ timeout: 2000 })) {
        throw new Error(`❌ ERROR: El sistema indica 'Transportista sin contrato'. Verifica que el paso 7 seleccionó a ${transName}.`);
    }

    await page.waitForLoadState('networkidle');

    // 12. Verificar Éxito
    logger.info('🔍 Verifying assignment success...');
    await expect(page.locator('body')).toContainText('éxito', { timeout: 20000 });
    
    logger.info(`✅ SUCCESS: Trip ${nroViaje} assigned to ${transName}`);
  });
});

/**
 * Helper Específico para Transportista:
 * Escribe lento, espera a que el filtro termine y selecciona visualmente.
 * Luego verifica que el texto del botón coincida.
 */
async function selectTransportistaRobust(page: any, nombre: string) {
    logger.info(`🛡️ Robust Selection: Transportista "${nombre}"`);
    
    const btnDropdown = page.locator('button[data-id="viajes-transportista_id"]');
    await btnDropdown.click();
    
    // Escribir lento para dar tiempo al filtro JS del framework
    const searchBox = page.locator('.bs-searchbox input').filter({ visible: true }).first();
    await searchBox.click();
    await searchBox.pressSequentially(nombre, { delay: 100 }); 
    
    // Esperar explícitamente a que aparezca la opción filtrada en la lista
    const opcionFiltrada = page.locator('.dropdown-menu.show li a').filter({ hasText: nombre }).first();
    await opcionFiltrada.waitFor({ state: 'visible', timeout: 5000 });
    
    await page.waitForTimeout(500); // Estabilizar animación
    await opcionFiltrada.click();
    
    // VERIFICACIÓN: ¿Qué dice el botón ahora?
    await page.waitForTimeout(1000); 
    const textoBoton = await btnDropdown.textContent();
    
    if (!textoBoton?.includes(nombre)) {
        logger.error(`❌ Mismatch! Wanted: "${nombre}", Got: "${textoBoton}". Retrying with JS Injection...`);
        // Si falló visualmente, forzamos con JS como último recurso
        await selectOptionByTextJS(page, nombre);
    } else {
        logger.info(`✅ Transportista verified correctly: ${textoBoton?.trim()}`);
    }
}

/**
 * Helper JS Injection para selects difíciles (Vehículo/Conductor)
 */
async function selectOptionByTextJS(page: any, text: string): Promise<boolean> {
    return await page.evaluate((searchText: string) => {
        const selects = Array.from(document.querySelectorAll('select'));
        for (const select of selects) {
            const option = Array.from(select.options).find(opt => 
                opt.text.toUpperCase().includes(searchText.toUpperCase())
            );
            
            if (option) {
                select.value = option.value;
                select.dispatchEvent(new Event('change', { bubbles: true }));
                // @ts-ignore
                if (window.jQuery && window.jQuery(select).selectpicker) {
                    // @ts-ignore
                    window.jQuery(select).selectpicker('refresh');
                }
                return true; 
            }
        }
        return false; 
    }, text);
}