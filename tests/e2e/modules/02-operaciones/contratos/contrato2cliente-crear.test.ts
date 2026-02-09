import { test, expect } from '../../../../../src/fixtures/base.js';
import { logger } from '../../../../../src/utils/logger.js';
import { ContratosFormPage } from '../../../../../src/modules/contracts/pages/ContratosPage.js';
import { DataPathHelper } from '../../../../api-helpers/DataPathHelper.js';
import fs from 'fs';

test.describe('Cliente Contract Creation (Venta Type)', () => {
    test.setTimeout(120000); // Timeout general aumentado

    test('Create Cliente Contract using Pre-existing Entities from JSON', async ({ page }, testInfo) => {
        const startTime = Date.now();
        logger.info('Starting STEP 5.5: Cliente Contract (Venta)');
        
        // 1. Cargar Datos
        const dataPath = DataPathHelper.getWorkerDataPath(testInfo);
        if (!fs.existsSync(dataPath)) throw new Error(`Data file not found at ${dataPath}`);
        
        const operationalData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
        const clienteNombre = operationalData.cliente.nombreFantasia || operationalData.cliente.nombre;

        // 2. Navegar
        const contratosPage = new ContratosFormPage(page);
        await contratosPage.navigateToCreate();

        // 3. Llenar Formulario Básico
        const nroContrato = String(Math.floor(10000 + Math.random() * 90000));
        await page.fill('#contrato-nro_contrato', nroContrato);

        // Tipo Contrato (JS Injection para Selectpicker)
        await page.evaluate(() => {
            const el = document.querySelector('#contrato-tipo_tarifa_contrato_id') as HTMLSelectElement;
            if (el) {
                el.value = '2';
                el.dispatchEvent(new Event('change', { bubbles: true }));
                // @ts-ignore
                if (typeof $ !== 'undefined') $(el).selectpicker('refresh');
            }
        });
        await page.waitForTimeout(500);

        // Tipo Venta (JS Injection)
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
        await page.waitForTimeout(500);

        // 4. Seleccionar Cliente
        logger.info(`Selecting cliente: "${clienteNombre}"`);
        
        // Abrir dropdown usando JS para evitar clicks fallidos
        await page.evaluate(() => {
            const btn = document.querySelector('button[data-id="contrato-cliente_id"]') as HTMLElement;
            if(btn) btn.click();
        });

        const dropdownMenu = page.locator('.dropdown-menu.show').first();
        await dropdownMenu.waitFor({ state: 'visible' });
        
        const searchBox = dropdownMenu.locator('.bs-searchbox input');
        await searchBox.waitFor({ state: 'visible', timeout: 5000 });
        await searchBox.fill(clienteNombre);
        await page.waitForTimeout(1000); // Esperar filtrado
        await page.keyboard.press('ArrowDown');
        await page.waitForTimeout(300);
        await page.keyboard.press('Enter');
        
        if (await dropdownMenu.isVisible()) await page.keyboard.press('Escape');
        
        // Cerrar cualquier modal residual
        await contratosPage.forceCloseModal();

        // =================================================================
        // STEP 5: GUARDADO ROBUSTO (JS INJECTION + RETRY)
        // =================================================================
        logger.info('Clicking Guardar button using JS Injection...');
        
        // Selector EXACTO por ID para evitar "Strict Mode Violation" con botones ocultos
        const saveBtnID = '#btn_guardar'; 
        await page.waitForSelector(saveBtnID, { state: 'attached' });
        await page.waitForTimeout(1000); // Estabilización vital

        let isSaved = false;
        
        // Bucle de reintento (Max 3 intentos)
        for (let i = 1; i <= 3; i++) {
            try {
                logger.info(`Save Attempt ${i}...`);
                
                // Promise.all: Esperar URL Y disparar click al mismo tiempo
                await Promise.all([
                    page.waitForURL(url => !url.toString().includes('/crear'), { timeout: 10000 }),
                    
                    // JS CLICK DIRECTO (Ignora capas transparentes o bloqueos de UI)
                    page.evaluate((sel) => {
                        const btn = document.querySelector(sel) as HTMLElement;
                        if (btn) {
                            btn.click();
                        } else {
                            throw new Error(`Button ${sel} not found`);
                        }
                    }, saveBtnID)
                ]);
                
                isSaved = true;
                logger.info('✅ Navigation successful');
                break; // Salir del bucle si tuvo éxito

            } catch (e) {
                logger.warn(`Save attempt ${i} failed/timed out.`);
                
                // Verificar si hay errores de validación visibles
                const rawErrors = await page.locator('.text-danger, .alert-danger').allTextContents();
                const errors = rawErrors.map(e => e.trim()).filter(e => e.length > 2 && !e.includes('*'));
                
                if (errors.length > 0) {
                    throw new Error(`Validation Errors prevented save: ${errors.join(' | ')}`);
                }
                
                // Esperar antes del siguiente reintento
                await page.waitForTimeout(2000);
            }
        }

        if (!isSaved) throw new Error(`Save failed after 3 attempts. URL stuck at: ${page.url()}`);

        // 6. Extraer ID del Contrato
        const currentUrl = page.url();
        let contractId: string | undefined;
        const editMatch = currentUrl.match(/\/editar\/(\d+)/);
        
        if (editMatch) {
            contractId = editMatch[1];
        } else if (currentUrl.includes('/index')) {
            // Fallback: Buscar en la grilla si redirigió al index
            logger.info('Redirected to index, searching grid...');
            const searchInput = page.locator('input[type="search"]').first();
            await searchInput.fill(nroContrato);
            await page.waitForTimeout(1500);
            const row = page.locator('table tbody tr').first();
            const link = await row.locator('a[href*="/editar/"]').getAttribute('href');
            contractId = link?.match(/\/editar\/(\d+)/)?.[1];
            
            if (contractId) {
                await page.goto(`https://moveontruckqa.bermanntms.cl/contrato/editar/${contractId}`);
            }
        }

        if (!contractId) throw new Error('Failed to extract Contract ID');
        logger.info(`✅ Contract created! ID: ${contractId}`);

        // =================================================================
        // PHASE 2: Agregar Rutas y Cargas
        // =================================================================
        await contratosPage.addSpecificRouteAndCargo('20000', '50000');

        // Guardado Final (También con JS Click por seguridad)
        logger.info('Saving final changes...');
        await page.evaluate(() => {
             const btn = document.querySelector('#btn_guardar') as HTMLElement;
             if(btn) btn.click();
        });
        await page.waitForTimeout(3000); // Esperar guardado pasivo

        // 7. Actualizar JSON
        operationalData.contratoCliente = {
            id: contractId,
            nroContrato: nroContrato,
            tipo: 'Venta',
            clienteNombre: clienteNombre
        };
        fs.writeFileSync(dataPath, JSON.stringify(operationalData, null, 2), 'utf-8');
        logger.info(`Saved contratoCliente.id: ${contractId}`);

        // 8. Verificación Final
        await page.goto(`https://moveontruckqa.bermanntms.cl/contrato/editar/${contractId}`);
        await page.waitForLoadState('networkidle');
        await expect(page.getByText('05082025-1').first()).toBeVisible({ timeout: 10000 });
        
        logger.info('STEP 5.5 COMPLETE');
    });
});