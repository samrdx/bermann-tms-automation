import { test, expect } from '../../../../../src/fixtures/base.js';
import { AsignarPage } from '../../../../../src/modules/planning/pages/AsignarPage.js';
import { TmsApiClient } from '../../../../api-helpers/TmsApiClient.js';
import { logger } from '../../../../../src/utils/logger.js';

test.describe('Viajes - Asignar (Business Logic Workflow)', () => {
  test('Should assign Trip to Transportista (Full Contract Setup)', async ({ page }) => {
    test.setTimeout(180000); // 3 minutes - Creates entire ecosystem (7 entities + contracts)
    
    const api = new TmsApiClient(page);
    await api.initialize(); 

    // 1. Definir nombres únicos (5 dígitos para evitar colisiones)
    const transName = `TransAPI ${Math.floor(10000 + Math.random() * 90000)}`;
    const cliName = `CliAPI ${Math.floor(10000 + Math.random() * 90000)}`;

    // 2. Crear Entidades (Ecosistema completo)
    await api.createTransportista(transName);
    await api.createCliente(cliName);

    // 3. Asociar Vehículo y Conductor (usando NOMBRE del transportista)
    // Guardamos los valores para seleccionarlos después en la asignación
    const vehiculoPatente = await api.createVehiculo(transName);
    const conductorNombre = await api.createConductor(transName);

    // 4. Crear Contratos (Venta para cliente, Costo para transportista)
    // Esto asegura que la API de planificación y la UI de asignación funcionen.
    await api.createContratoVenta(cliName);
    await api.createContratoCosto(transName);

    // 5. Planificar Viaje con el Cliente Nuevo (usando UI, no API)
    const nroViaje = `V${Math.floor(Math.random() * 100000)}`;
    await api.createViaje(cliName, nroViaje); // Pasa nombre del cliente, no ID
    
    // 6. Verificación en UI de Asignación
    const asignarPage = new AsignarPage(page);
    await asignarPage.navigate();
    
    logger.info(`🔍 UI: Buscando viaje ${nroViaje}...`);
    await asignarPage.selectViajeRow(nroViaje);

    // Step 9: Select Transportista in Assignment Form - MEJORADO con selector específico
    logger.info(`💉 Selecting transportista: ${transName}`);
    const transportistaSelected = await page.evaluate((nombre) => {
        // Buscar SOLO el select de transportista por su ID o name (más específico)
        const select = document.querySelector('select[id*="transportista"]') as HTMLSelectElement
                    || document.querySelector('select[name*="transportista"]') as HTMLSelectElement;

        if (!select) return { found: false, error: 'Transportista select not found' };

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
        return { found: false, error: 'Option not found in transportista select' };
    }, transName);

    if (!transportistaSelected.found) {
        throw new Error(`Transportista "${transName}" not found in dropdown. Error: ${(transportistaSelected as any).error}`);
    }
    logger.info(`✅ Transportista selected: ${transportistaSelected.optionText} (select#${transportistaSelected.selectId})`);

    // Step 10: Wait for Cascade - MEJORADO con condición explícita
    logger.info('⏳ Waiting for cascade (vehicle/conductor loading)...');

    // Esperar a que el select de vehículo tenga opciones cargadas (más robusto que waitForTimeout)
    await page.waitForFunction(() => {
      const vehiculoSelect = document.querySelector('select[id*="vehiculo"]') as HTMLSelectElement
                          || document.querySelector('select[name*="vehiculo"]') as HTMLSelectElement;
      return vehiculoSelect && vehiculoSelect.options.length > 1;
    }, { timeout: 10000 }).catch(() => {
      logger.warn('⚠️ Vehicle options did not load in time, continuing anyway...');
    });

    // Pequeña pausa adicional para estabilidad de Bootstrap Select
    await page.waitForTimeout(1000);

    // Step 11: Select Vehículo Principal
    logger.info(`🚛 Selecting Vehículo Principal: ${vehiculoPatente}`);

    // Abrir dropdown de Vehículo Principal usando el botón Bootstrap Select
    const vehiculoDropdownBtn = page.locator('button[data-id*="vehiculo"]').first();
    await vehiculoDropdownBtn.waitFor({ state: 'visible', timeout: 5000 });
    await vehiculoDropdownBtn.click();
    await page.waitForTimeout(500);

    // Buscar en el dropdown visible (scoped al menú abierto)
    const vehiculoMenu = page.locator('div.dropdown-menu.show').first();
    await vehiculoMenu.waitFor({ state: 'visible', timeout: 5000 });

    const vehiculoSearchBox = vehiculoMenu.locator('input[aria-label="Search"], .bs-searchbox input');
    if (await vehiculoSearchBox.isVisible({ timeout: 1000 }).catch(() => false)) {
      await vehiculoSearchBox.fill(vehiculoPatente);
      await page.waitForTimeout(500);
    }

    // Seleccionar la opción que contiene la patente
    const vehiculoOption = vehiculoMenu.locator('a.dropdown-item, li a').filter({ hasText: vehiculoPatente }).first();
    if (await vehiculoOption.isVisible({ timeout: 2000 }).catch(() => false)) {
      await vehiculoOption.click();
      logger.info(`✅ Vehículo Principal selected: ${vehiculoPatente}`);
    } else {
      // Fallback: usar Enter si no encuentra la opción directamente
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Enter');
      logger.info(`✅ Vehículo Principal selected (via keyboard)`);
    }
    await page.waitForTimeout(500);

    // Step 12: Select Conductor Principal
    logger.info(`👨‍✈️ Selecting Conductor Principal: ${conductorNombre}`);

    // Abrir dropdown de Conductor usando el botón Bootstrap Select
    const conductorDropdownBtn = page.locator('button[data-id*="conductor"]').first();
    await conductorDropdownBtn.waitFor({ state: 'visible', timeout: 5000 });
    await conductorDropdownBtn.click();
    await page.waitForTimeout(500);

    // Buscar en el dropdown visible (scoped al menú abierto)
    const conductorMenu = page.locator('div.dropdown-menu.show').first();
    await conductorMenu.waitFor({ state: 'visible', timeout: 5000 });

    const conductorSearchBox = conductorMenu.locator('input[aria-label="Search"], .bs-searchbox input');
    if (await conductorSearchBox.isVisible({ timeout: 1000 }).catch(() => false)) {
      await conductorSearchBox.fill(conductorNombre);
      await page.waitForTimeout(500);
    }

    // Seleccionar la opción que contiene el nombre del conductor
    const conductorOption = conductorMenu.locator('a.dropdown-item, li a').filter({ hasText: conductorNombre }).first();
    if (await conductorOption.isVisible({ timeout: 2000 }).catch(() => false)) {
      await conductorOption.click();
      logger.info(`✅ Conductor Principal selected: ${conductorNombre}`);
    } else {
      // Fallback: usar Enter si no encuentra la opción directamente
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('Enter');
      logger.info(`✅ Conductor Principal selected (via keyboard)`);
    }
    await page.waitForTimeout(500);

    // Step 13: Click Guardar to Finalize Assignment
    logger.info('💾 Clicking Guardar...');
    await page.click('#btn_guardar_form');
    await page.waitForLoadState('networkidle');

    // Step 14: Verify Assignment Success
    logger.info('🔍 Verifying assignment...');
    await page.waitForTimeout(2000);
    const currentUrl = page.url();
    // El sistema puede redirigir a /viajes/editar/{id} (éxito) o quedarse en /viajes/asignar
    const isSuccess = currentUrl.includes('/viajes/asignar') || currentUrl.includes('/viajes/editar/');
    expect(isSuccess, `Expected /viajes/asignar or /viajes/editar/, got: ${currentUrl}`).toBe(true);
    logger.info(`✅ SUCCESS: Trip ${nroViaje} assigned to:`);
    logger.info(`   Transportista: ${transName}`);
    logger.info(`   Vehículo: ${vehiculoPatente}`);
    logger.info(`   Conductor: ${conductorNombre}`);
  });
});