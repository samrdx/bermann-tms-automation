import { Page, expect } from '@playwright/test';
import { logger } from '../../src/utils/logger.js';
import {
    generateValidChileanRUT,
    generateShortCompanyName,
    generateChileanStreet,
    generateStreetNumber
} from '../../src/utils/rutGenerator.js';
import { config } from '../../src/config/environment.js';
import { TransportistaFormPage } from '../../src/modules/transport/pages/TransportistaPage.js';

export interface Transportista {
    id: string;
    nombre: string;
    baseNombre: string;
    documento: string;
    razonSocial: string;
}

export class TransportistaHelper {

    /**
     * Creates a Transportista via UI Interactions using the Page Object.
     * Use this when API seeding is unreliable or silent.
     * 
     * @param page Playwright Page object
     * @param type 'Propio' | 'Tercero'
     */
    static async createTransportistaViaUI(
        page: Page,
        type: 'Propio' | 'Tercero' = 'Propio'
    ): Promise<Transportista> {
        const baseUrl = config.get().baseUrl;
        const transportistaPage = new TransportistaFormPage(page);

        // Data Generation - UNIQUE NAME with full Unix seconds to guarantee uniqueness
        const unixTs = Math.floor(Date.now() / 1000);
        const rawBaseName = generateShortCompanyName();
        const baseNombre = rawBaseName.split(' - ')[0].trim();
        const nombre = `${baseNombre} ${unixTs}`;
        const rawRut = generateValidChileanRUT();
        const documento = rawRut.replace(/^(\d{7,8})(\d|k|K)$/, '$1-$2').toUpperCase();

        const razonSocial = nombre;
        const calle = generateChileanStreet();
        const altura = generateStreetNumber();

        logger.info(`🌱 UI Seeding Transportista: [${nombre}] RUT: ${documento}...`);

        // 1. Navigate
        await transportistaPage.navigate();

        // 2. Fill Form
        await transportistaPage.fillNombre(nombre);
        await transportistaPage.fillRazonSocial(razonSocial);
        await transportistaPage.fillDocumento(documento);

        // Select Type - Always use "Terceros Con Flota Si Genera Contrato" for contract generation
        await transportistaPage.selectTipoTransportista('Terceros Con Flota Si Genera Contrato');

        await page.waitForTimeout(500);

        // Location
        await transportistaPage.selectRandomRegion();
        await transportistaPage.selectRandomCiudad();
        await transportistaPage.selectRandomComuna();

        await transportistaPage.fillCalle(calle);
        await transportistaPage.fillAltura(altura);

        // Optional fields
        await transportistaPage.selectFormaPago('Contado');
        await transportistaPage.selectTercerizar('No');

        // 3. Save & Intercept Response
        logger.info('💾 Saving Transportista via UI...');

        let savedId = '';

        try {
            const [response] = await Promise.all([
                page.waitForResponse(resp => resp.url().includes('/transportistas/crear') && resp.request().method() === 'POST', { timeout: 10000 }),
                transportistaPage.clickGuardar()
            ]);

            const respText = await response.text();
            try {
                const json = JSON.parse(respText);
                if (json.id) savedId = json.id;
                else if (json.transportistaId) savedId = json.transportistaId;
            } catch (e) {
                const location = response.headers()['location'];
                if (location && location.match(/\/(ver|view|editar|edit|update)\//)) {
                    const match = location.match(/\/(?:ver|view|editar|edit|update)\/(\d+)/);
                    if (match) savedId = match[1];
                }
            }
            if (savedId) logger.info(`✅ ID Rescued from Save Response: ${savedId}`);

        } catch (e) {
            logger.warn('⚠️ Failed to intercept save response or extract ID', e);
        }

        // 4. Verify & Rescue ID (Fallback)
        logger.info('⏳ Waiting for save completion/redirection...');
        await page.waitForURL(url => url.toString().includes('/index') || !!url.toString().match(/\/(ver|view|editar|edit|update)\//), { timeout: 30000 });

        let id = '';
        const currentUrl = page.url();
        logger.info(`📍 Post-save URL: ${currentUrl}`);

        if (savedId) {
            id = savedId;
        } else if (currentUrl.match(/\/(ver|view|editar|edit|update)\//)) {
            const match = currentUrl.match(/\/(?:ver|view|editar|edit|update)\/(\d+)/);
            if (match) {
                id = match[1];
                logger.info(`✅ ID Rescued from URL: ${id}`);
            }
        } else {
            // Redirected to Index - Execute RUT-based Grid Rescue
            logger.info('⚠️ Redirected to Index. Executing RUT-based Grid Rescue...');

            await page.goto(`${baseUrl}/transportistas/index`);
            await page.waitForTimeout(2000);

            // PRIMARY STRATEGY: Search by RUT (Documento) - immutable and reliable
            logger.info(`🔍 Searching by RUT: ${documento}`);
            
            const rutFilterInput = page.locator('input[name*="[documento]"]')
                .or(page.locator('input[name*="[rut]"]'))
                .or(page.locator('thead th:has-text("RUT") + th input, thead input').first())
                .first();

            let foundViaRut = false;
            if (await rutFilterInput.isVisible({ timeout: 3000 }).catch(() => false)) {
                // Clean RUT for search (remove formatting)
                const searchRut = documento.replace(/[.-]/g, '');
                await rutFilterInput.fill(searchRut);
                await rutFilterInput.press('Enter');
                await page.waitForTimeout(1500);
                
                // Look for row containing the RUT
                const rutRow = page.locator('table tbody tr').filter({ hasText: new RegExp(searchRut.slice(0, 6), 'i') }).first();
                
                if (await rutRow.count() > 0) {
                    const dataKey = await rutRow.getAttribute('data-key');
                    if (dataKey) {
                        id = dataKey;
                        foundViaRut = true;
                        logger.info(`✅ Rescued ID via RUT search (data-key): ${id}`);
                    } else {
                        const actionLink = rutRow.locator('a[href*="/ver/"], a[href*="/view/"], a[href*="/editar/"]').first();
                        if (await actionLink.count() > 0) {
                            const href = await actionLink.getAttribute('href');
                            const match = href?.match(/(\d+)/);
                            if (match) {
                                id = match[1];
                                foundViaRut = true;
                                logger.info(`✅ Rescued ID via RUT search (link): ${id}`);
                            }
                        }
                    }
                }
            }

            // FALLBACK STRATEGY: Search by Name (less reliable due to TMS normalization)
            if (!foundViaRut) {
                logger.warn('⚠️ RUT search failed, falling back to name-based search...');
                
                const filterInput = page.locator('input[name*="[nombre]"]')
                    .or(page.locator('.dataTables_filter input'))
                    .or(page.locator('thead input').first())
                    .first();

                if (await filterInput.isVisible()) {
                    logger.info(`🔍 Searching by name: ${baseNombre}`);
                    await filterInput.fill(baseNombre);
                    await filterInput.press('Enter');
                    await page.waitForTimeout(1500);
                }

                // Case-insensitive search through rows
                try {
                    const allRows = page.locator('table tbody tr');
                    const rowCount = await allRows.count();
                    
                    for (let i = 0; i < rowCount; i++) {
                        const currentRow = allRows.nth(i);
                        const text = await currentRow.innerText();
                        
                        if (text.toLowerCase().includes(baseNombre.toLowerCase())) {
                            const dataKey = await currentRow.getAttribute('data-key');
                            if (dataKey) {
                                id = dataKey;
                                logger.info(`✅ Rescued ID via name search: ${id}`);
                                break;
                            }
                            
                            const actionLink = currentRow.locator('a[href*="/ver/"], a[href*="/view/"], a[href*="/editar/"]').first();
                            if (await actionLink.count() > 0) {
                                const href = await actionLink.getAttribute('href');
                                const match = href?.match(/(\d+)/);
                                if (match) {
                                    id = match[1];
                                    logger.info(`✅ Rescued ID via name search (link): ${id}`);
                                    break;
                                }
                            }
                        }
                    }
                } catch (e) {
                    logger.error(`❌ FAILED to find record in grid by name: ${baseNombre}`, e);
                }
            }

            if (!id) {
                await page.screenshot({ path: `./reports/screenshots/rescue-id-failed-${Date.now()}.png` });
            }
        }

        if (!id) {
            logger.warn('⚠️ UI Seeding: Could not determine ID of created Transportista. Returning Name only.');
        } else {
            logger.info(`✅ Successfully seeded Transportista [${nombre}] ID: ${id}`);
        }

        return {
            id,
            nombre,
            baseNombre,
            documento,
            razonSocial
        };
    }
}
