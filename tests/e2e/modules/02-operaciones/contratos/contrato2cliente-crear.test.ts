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
        
        // 1. Cargar Datos
        const dataPath = DataPathHelper.getWorkerDataPath(testInfo);
        if (!fs.existsSync(dataPath)) throw new Error(`Data file not found at ${dataPath}`);
        
        const operationalData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
        const clienteNombre = operationalData.cliente.nombreFantasia || operationalData.cliente.nombre;

        // 2. Navegar
        const contratosPage = new ContratosFormPage(page);
        await contratosPage.navigateToCreate();

        // 3. Llenar Formulario
        const nroContrato = String(Math.floor(10000 + Math.random() * 90000));
        await page.fill('#contrato-nro_contrato', nroContrato);

        // Inyección Tipo Contrato
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

        // Inyección Tipo Venta
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

        // Selección Cliente
        logger.info(`Selecting cliente: "${clienteNombre}"`);
        
        // Abrir dropdown con JS
        await page.evaluate(() => {
            const btn = document.querySelector('button[data-id="contrato-cliente_id"]') as HTMLElement;
            if(btn) btn.click();
        });

        // Esperar menú
        const dropdownMenu = page.locator('div.dropdown-menu.show').first();
        await dropdownMenu.waitFor({ state: 'visible', timeout: 10000 });
        
        // Buscar y seleccionar
        const searchBox = dropdownMenu.locator('.bs-searchbox input');
        await searchBox.waitFor({ state: 'visible', timeout: 5000 });
        await searchBox.fill(clienteNombre);
        await page.waitForTimeout(1000);
        await page.keyboard.press('ArrowDown');
        await page.waitForTimeout(300);
        await page.keyboard.press('Enter');
        
        if (await dropdownMenu.isVisible()) await page.keyboard.press('Escape');
        await contratosPage.forceCloseModal();

        // =================================================================
        // STEP 5: GUARDADO ROBUSTO CON DIAGNÓSTICO
        // =================================================================
        logger.info('Clicking Guardar button...');
        const saveBtnID = '#btn_guardar'; 
        await page.waitForSelector(saveBtnID, { state: 'attached' });
        await page.waitForTimeout(1000);

        let isSaved = false;
        
        for (let i = 1; i <= 3; i++) {
            try {
                logger.info(`Save Attempt ${i}...`);
                
                await Promise.all([
                    page.waitForURL(url => !url.toString().includes('/crear'), { timeout: 10000 }),
                    // JS CLICK DIRECTO
                    page.evaluate((sel) => {
                        const btn = document.querySelector(sel) as HTMLElement;
                        if (btn) btn.click();
                    }, saveBtnID)
                ]);
                
                isSaved = true;
                logger.info('✅ Navigation successful');
                break;

            } catch (e) {
                logger.warn(`Save attempt ${i} failed.`);
                
                // --- FORENSIC DIAGNOSTICS ---
                const rawErrors = await page.locator('.text-danger, .alert-danger').allTextContents();
                const visibleErrors = rawErrors.map(e => e.trim()).filter(e => e.length > 2 && !e.includes('*'));
                
                if (visibleErrors.length > 0) {
                    logger.error(`🚨 BLOCKING ERRORS DETECTED: ${visibleErrors.join(' | ')}`);
                }

                // Check HTML5 invalid fields
                const invalidFields = await page.evaluate(() => {
                    return Array.from(document.querySelectorAll(':invalid')).map(el => el.getAttribute('id') || el.getAttribute('name') || el.tagName);
                });
                
                if (invalidFields.length > 0) {
                    logger.error(`🚨 INVALID FIELDS DETECTED: ${invalidFields.join(', ')}`);
                }
                // -----------------------------
                
                await page.waitForTimeout(2000);
            }
        }

        if (!isSaved) throw new Error(`Save failed after 3 attempts. Check above for validation errors.`);

        // 6. Extract ID
        const currentUrl = page.url();
        let contractId: string | undefined;
        const editMatch = currentUrl.match(/\/editar\/(\d+)/);
        
        if (editMatch) {
            contractId = editMatch[1];
        } else if (currentUrl.includes('/index')) {
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

        // Phase 2: Add Route
        await contratosPage.addSpecificRouteAndCargo('20000', '50000');

        // Final Save
        logger.info('Saving final changes...');
        await page.evaluate(() => {
             const btn = document.querySelector('#btn_guardar') as HTMLElement;
             if(btn) btn.click();
        });
        await page.waitForTimeout(3000);

        // Update JSON
        operationalData.contratoCliente = {
            id: contractId,
            nroContrato: nroContrato,
            tipo: 'Venta',
            clienteNombre: clienteNombre
        };
        fs.writeFileSync(dataPath, JSON.stringify(operationalData, null, 2), 'utf-8');
        logger.info(`Saved contratoCliente.id: ${contractId}`);

        // =================================================================
        // STEP 8: Verification (CORREGIDO CON SCROLL)
        // =================================================================
        await page.goto(`https://moveontruckqa.bermanntms.cl/contrato/editar/${contractId}`);
        await page.waitForLoadState('networkidle');
        
        const routeCell = page.getByText('05082025-1').first();
        
        // Scroll explícito para evitar error "received: hidden"
        await routeCell.scrollIntoViewIfNeeded();
        await expect(routeCell).toBeVisible();
        
        logger.info('Route 715 verified');
        logger.info('STEP 5.5 COMPLETE');
    });
});