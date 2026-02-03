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

        // Data Generation
        const nombre = generateShortCompanyName();
        const rawRut = generateValidChileanRUT();
        // Format RUT with dots (XX.XXX.XXX-Y) for strict validation
        const documento = rawRut.replace(/^(\d{1,2})(\d{3})(\d{3})(-[\dkK])$/, '$1.$2.$3$4');

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

        // Select Type (Specific String to avoid Strict Mode violation)
        if (type === 'Propio') {
            await transportistaPage.selectTipoTransportista('Propio Con Flota No Genera');
        } else {
            await transportistaPage.selectTipoTransportista('Tercero');
        }

        await page.waitForTimeout(500);

        // Location - Random selections
        await transportistaPage.selectRandomRegion();
        await transportistaPage.selectRandomCiudad();
        await transportistaPage.selectRandomComuna();

        await transportistaPage.fillCalle(calle);
        await transportistaPage.fillAltura(altura);

        // Optional/Conditional fields
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

            // Try to get ID from response
            const respText = await response.text();
            try {
                const json = JSON.parse(respText);
                if (json.id) savedId = json.id;
                else if (json.transportistaId) savedId = json.transportistaId;
            } catch (e) {
                // Not JSON, check headers if redirect
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
        // Wait for URL change to either /index or /ver/{id}
        await page.waitForURL(url => url.toString().includes('/index') || url.toString().match(/\/(ver|view|editar|edit|update)\//), { timeout: 10000 });

        let id = '';
        const currentUrl = page.url();
        logger.info(`📍 Post-save URL: ${currentUrl}`);

        if (savedId) {
            id = savedId;
        } else if (currentUrl.match(/\/(ver|view|editar|edit|update)\//)) {
            // Easy rescue from URL (covers ver/edit/etc)
            const match = currentUrl.match(/\/(?:ver|view|editar|edit|update)\/(\d+)/);
            if (match) {
                id = match[1];
                logger.info(`✅ ID Rescued from URL: ${id}`);
            }
        } else {
            // Redirected to Index -> Rescue from Grid (Retry & Scrape Strategy)
            logger.info('⚠️ Redirected to Index. Executing Retry & Scrape strategy...');

            // 1. Navigate & Wait for DB Propagation
            await page.goto(`${baseUrl}/transportistas/index`);
            await page.waitForTimeout(2000); // Checkpoint: Wait for DB logic

            // 2. Search by Unique Name (Wait for Input first)
            const filterInput = page.locator('input[name="TransportistasSearch[nombre]"]')
                .or(page.locator('input[name="TransportistaSearch[nombre]"]'))
                .or(page.locator('.dataTables_filter input'))
                .or(page.locator('thead input').first())
                .first();

            if (await filterInput.isVisible()) {
                logger.info(`🔍 Searching for: ${nombre}`);
                await filterInput.fill(nombre);
                await filterInput.press('Enter');
                // Don't just wait for time, wait for request or UI change if possible, but 1s is safe with expect loop next
                await page.waitForTimeout(1000);
            }

            // 3. Extract ID (Row Found, but Column 1 is Name, not ID)
            logger.info('⏳ Waiting for valid data in grid...');
            try {
                // Wait for the row to appear (containing the text)
                const row = page.locator('table tbody tr').first();
                await expect(row).toBeVisible({ timeout: 10000 });

                // DEBUG: Log the HTML of the row to see structure
                const rowHtml = await row.innerHTML();
                logger.info(`🔍 DEBUG - ROW HTML: ${rowHtml}`);
                // Check outer HTML for data-key
                const outerHtml = await row.evaluate(el => el.outerHTML);
                logger.info(`🔍 DEBUG - ROW OUTER HTML: ${outerHtml}`);

                // Strategy 1: Check data-key attribute (Standard YiiGird/Bootstrap)
                const dataKey = await row.getAttribute('data-key');
                if (dataKey) {
                    id = dataKey;
                    logger.info(`✅ Confirmed ID from data-key: ${id}`);
                } else {
                    // Strategy 2: Extract from "View" or "Edit" Icon Link
                    const actionLink = row.locator('a[href*="/ver/"], a[href*="/view/"], a[href*="/editar/"]').first();
                    if (await actionLink.count() > 0) {
                        const href = await actionLink.getAttribute('href');
                        const match = href?.match(/\/(\d+)/);
                        if (match) {
                            id = match[1];
                            logger.info(`✅ Rescued ID from Action Link: ${id}`);
                        }
                    }
                }

            } catch (e) {
                logger.warn('⚠️ Row not found or ID extraction failed.', e);
            }
        }

        if (!id) {
            logger.error('❌ UI Seeding Failed: Could not determine ID of created Transportista.');
            throw new Error('UI Seeding Failed: ID not found');
        }

        logger.info(`✅ Successfully seeded Transportista [${nombre}] ID: ${id}`);

        return {
            id,
            nombre,
            documento,
            razonSocial
        };
    }
}
