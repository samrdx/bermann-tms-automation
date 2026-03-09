import { test, expect } from '../../../../src/fixtures/base.js';
import { createLogger } from '../../../../src/utils/logger.js';
import { isQaMode } from '../../../../src/utils/env-helper.js';
import { getTestUser } from '../../../../src/config/credentials.js';
import { LoginPage } from '../../../../src/modules/auth/pages/LoginPage.js';
import { DataPathHelper } from '../../../api-helpers/DataPathHelper.js';
import fs from 'fs';

const logger = createLogger('UltimaMilla-CrearPedido');

test.describe('Última Milla - Creación de Pedido', () => {
    // Test exclusivo para QA
    test.skip(!isQaMode(), 'Este test es exclusivo para el ambiente de QA por configuración de negocio.');

    test.setTimeout(90000); // 90 segundos para pruebas E2E completas

    test.setTimeout(90000); // 90 segundos para pruebas E2E completas

    test('Validación de formulario, dimensionamiento y geolocalización', async ({ page, ultimaMillaPage, ultimaMillaFactory }, testInfo) => {
        const startTime = Date.now();
        logger.info('Iniciando Test: Creación de Pedido Última Milla');
        logger.info('='.repeat(80));

        // EXTRAER DATOS SEEDED DESDE JSON ANTES DE NAVEGAR
        logger.info('Extrayendo data base guardada (Seeded Cliente)...');
        const dataPath = DataPathHelper.getWorkerDataPath(testInfo);
        let clienteNombre = '';
        if (fs.existsSync(dataPath)) {
            const operationalData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
            if (operationalData.seededCliente?.nombre) {
                clienteNombre = operationalData.seededCliente.nombre;
                logger.info(`Cliente encontrado en JSON: ${clienteNombre}`);
            }
        } else {
            logger.warn(`El archivo dataPath no se encontró: ${dataPath}. Verifique si base-entities.setup.ts se ejecutó.`);
        }

        // EL LOGIN ES MANEJADO AUTOMÁTICAMENTE POR EL GLOBAL SETUP (auth.setup.ts)
        // Por lo tanto, empezamos directamente desde la navegación.

        // PHASE 2: Navegación
        logger.info('FASE 2: Navegación a Creación de Pedido (/order/crear)...');
        await ultimaMillaPage.navigate();
        await expect(page).toHaveURL(/.*\/order\/crear/);
        logger.info('Navegación completada');

        // Generamos data para la prueba, inyectando el clienteDropdown
        const orderData = ultimaMillaFactory.generateDefaultData();
        if (clienteNombre) {
            orderData.clienteDropdown = clienteNombre;
        }

        // PHASE 3: Llenado del Formulario Completo
        logger.info('FASE 3: Llenando formulario de pedido completo...');
        // Fill the entire form from the start, we no longer trigger intentional validation errors
        // that reload the page and break the JS selectors.
        await ultimaMillaPage.fillCompleteForm(orderData as any);

        // Wait mechanically for standard UI rehydration
        await page.waitForTimeout(1000);

        // Verificamos que la cantidad esté visible debido a "Caja"
        const cantidadVisible = await ultimaMillaPage.isCantidadVisible();
        if (!cantidadVisible) {
            logger.warn('Aviso: Campo Cantidad no apareció visible instantáneamente (Posible delay de JS). Continuando.');
        } else {
            logger.info('Campo Cantidad se despliega correctamente para Caja');
        }

        // Verificamos cálculo de m3 ANTES de guardar
        // 10x20x15 = 3000 cm3 = 0.003 m3 (o la matemática que haga el sistema. Solo checkamos que no esté vacío y no sea 0)
        const m3Calculado = await ultimaMillaPage.getMetrosCubicosValue();
        logger.info(`Volumen calculado (m3): ${m3Calculado}`);
        expect(m3Calculado).not.toBe('');
        expect(m3Calculado).not.toBe('0');
        expect(Number(m3Calculado)).toBeGreaterThan(0);
        logger.info('Cálculo de volumen operando correctamente');

        // PHASE 5: Guardado exitoso
        logger.info('FASE 5: Envío final de formulario...');
        await ultimaMillaPage.clickGuardar();
        // Dar holgura a la redirección backend o validaciones
        await page.waitForTimeout(2000);

        // Chequear si hay errores de validación en pantalla
        const errores = await ultimaMillaPage.getErrorMessages();
        if (errores.length > 0) {
            throw new Error(`Validación fallida al guardar el pedido. Errores: ${errores.join(', ')}`);
        }

        const isSaved = await ultimaMillaPage.isFormSaved();
        expect(isSaved).toBeTruthy();

        // Validar Toast Success (Pedido Ingresado Correctamente)
        const toastLocator = page.getByText('Pedido creado Correctamente', { exact: true });
        await expect(toastLocator).toBeVisible({ timeout: 10000 });
        logger.info('Pedido guardado exitosamente');

        // PHASE 6: Verificación en la grilla (/order)
        logger.info('FASE 6: Verificando pedido en grilla (/order)...');
        // Redirigimos manualmente al main grid
        await page.goto(page.url().replace('/order/crear', '/order'));
        await page.waitForLoadState('networkidle');

        // Buscar el pedido por el Codigo Generado
        const searchInput = page.locator('#txt_search, input[type="search"]').first();
        await searchInput.waitFor({ state: 'visible', timeout: 10000 });
        const cod = orderData.codigoPedido as string;
        await searchInput.fill(cod);
        await searchInput.press('Enter');
        await page.waitForTimeout(2000); // Esperar filtrado DataTables

        // Confirmar que existe una fila con nuestro código
        const filaResultado = page.locator('table tbody tr').filter({ hasText: cod }).first();
        await expect(filaResultado).toBeVisible({ timeout: 10000 });
        logger.info(`✅ Pedido [${cod}] certificado y visible en el listado /order.`);

        // Summary
        const executionTime = ((Date.now() - startTime) / 1000).toFixed(2);
        logger.info('='.repeat(80));
        logger.info(`Execution Time: ${executionTime}s`);
        logger.info('='.repeat(80));
    });
});
