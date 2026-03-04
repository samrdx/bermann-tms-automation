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
import { TmsApiClient } from './TmsApiClient.js';
import { isDemoMode } from '../../src/utils/env-helper.js';

export interface Transportista {
    id: string;
    nombre: string;
    baseNombre: string;
    documento: string;
    razonSocial: string;
}

export class TransportistaHelper {

    /**
     * Extracts Transportista ID and other details after a UI creation.
     * This logic is adapted from TmsApiClient.createTransportista and TransportistaHelper.createTransportistaViaUI.
     * 
     * @param page Playwright Page object
     * @param nombre The full name of the Transportista (with timestamp)
     * @param documento The RUT of the Transportista
     * @param baseNombre The base name of the Transportista (without timestamp)
     * @param razonSocial The reason social of the Transportista
     * @returns A Transportista object with extracted ID and other details.
     */
    static async extractTransportistaIdAndName(
        page: Page,
        nombre: string,
        documento: string,
        baseNombre: string,
        razonSocial: string
    ): Promise<Transportista> {
        const baseUrl = config.get().baseUrl;
        let id = '0';
        let currentUrl = page.url();
        logger.info(`📍 Post-save URL for ID extraction: ${currentUrl}`);

        let savedId = ''; // Variable to hold ID from response if intercepted

        // Try to rescue ID from response if available (this is usually from createTransportistaViaUI)
        // For direct test, we assume this is already handled by createTransportistaViaUI or not applicable.
        // So, we'll focus on URL and grid search.

        // 1. Attempt to extract from URL (e.g., /view/123)
        let idMatch = currentUrl.match(/\/(?:ver|view|editar|update)\/(\d+)/);
        if (idMatch) {
            id = idMatch[1];
            logger.info(`✅ Transportista ID extracted from URL: ${id}`);
        } else {
            // Redirected to Index or other page - Execute Grid Rescue
            logger.info('⚠️ Not on view/edit page. Executing Grid Rescue...');

            // Ensure we are on the index page for grid search
            if (!currentUrl.includes('/transportistas/index')) {
                await page.goto(`${baseUrl}/transportistas/index`);
                await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => logger.warn('Network idle timeout during navigation to index.'));
                await page.waitForTimeout(2000);
            }

            // STRATEGY: Search by name using #search + #buscar
            // TMS transportista index has NO per-column filters (no RUT filter),
            // only a global #search input and a #buscar link button.
            // TMS also lowercases names (e.g. "EcoTrans" → "Ecotrans"),
            // so we must use case-insensitive matching.
            logger.info(`🔍 Searching by name: ${nombre}`);
            const searchInput = page.locator('#search');

            if (await searchInput.isVisible({ timeout: 5000 }).catch(() => false)) {
                await searchInput.fill(nombre);

                // Click the Buscar button (TMS requires button click, not Enter)
                await TransportistaHelper.clickBuscarButton(page);
                await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => { });
                await page.waitForTimeout(2000);
            } else {
                logger.warn('⚠️ #search input not found on index page');
            }

            // TMS grid rows have NO data-key attributes.
            // ID is only available via the edit link: /transportistas/editar/{id}
            // Use case-insensitive regex since TMS normalizes names to lowercase
            const nameRegex = new RegExp(nombre.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
            const matchingRow = page.locator('#tabla_transportistas tbody tr')
                .filter({ hasText: nameRegex })
                .first();

            if (await matchingRow.count() > 0) {
                const editLink = matchingRow.locator('a[href*="/editar/"]').first();
                if (await editLink.count() > 0) {
                    const href = await editLink.getAttribute('href');
                    const match = href?.match(/\/editar\/(\d+)/);
                    if (match) {
                        id = match[1];
                        logger.info(`✅ Rescued ID via grid search (edit link): ${id}`);
                    }
                }

                // Fallback: try onclick in badge span (e.g. cambiarEstado(1376, 1))
                if (id === '0') {
                    const badge = matchingRow.locator('span[onclick*="cambiarEstado"]').first();
                    if (await badge.count() > 0) {
                        const onclick = await badge.getAttribute('onclick');
                        const match = onclick?.match(/cambiarEstado\((\d+)/);
                        if (match) {
                            id = match[1];
                            logger.info(`✅ Rescued ID via grid search (badge onclick): ${id}`);
                        }
                    }
                }
            } else {
                logger.warn(`⚠️ No row found matching: ${nombre}`);
                await page.screenshot({ path: `./reports/screenshots/transportista-grid-no-match-${Date.now()}.png` });
            }

            if (id === '0') {
                logger.warn(`⚠️ Grid Rescue: Could not determine ID of created Transportista.`);
                await page.screenshot({ path: `./reports/screenshots/transportista-id-rescue-failed-${Date.now()}.png` });
            }
        }

        if (id === '0') {
            logger.error(`❌ Could not extract Transportista ID for: ${nombre}`);
            throw new Error(`Failed to extract Transportista ID for: ${nombre}`);
        }

        logger.info(`✅ Successfully extracted Transportista [${nombre}] ID: ${id}`);
        return {
            id,
            nombre,
            baseNombre,
            documento,
            razonSocial
        };
    }

    /**
     * Clicks the "Buscar" button on the TMS grid index pages.
     * Uses the proven pattern from TmsApiClient: link role first, JS fallback for Firefox.
     */
    static async clickBuscarButton(page: Page): Promise<void> {
        try {
            const buscarLink = page.getByRole('link', { name: 'Buscar' });
            if (await buscarLink.isVisible({ timeout: 3000 }).catch(() => false)) {
                await buscarLink.click();
                logger.info('🔎 Clicked Buscar button (link role)');
                return;
            }
        } catch {
            // Fallback below
        }

        // JS fallback (Firefox-safe): click #buscar element directly
        logger.info('🔎 Using JS fallback to click Buscar button...');
        await page.evaluate(() => {
            const btn = document.getElementById('buscar');
            if (btn) btn.click();
            else {
                // Try finding any link/button with text "Buscar"
                const links = Array.from(document.querySelectorAll('a, button'));
                const buscar = links.find(el => el.textContent?.trim() === 'Buscar');
                if (buscar) (buscar as HTMLElement).click();
                else console.error('Botón Buscar no encontrado');
            }
        });
        logger.info('🔎 Clicked Buscar button (JS fallback)');
    }

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

        // Data Generation - UNIQUE NAME with 6-digit Unix seconds to guarantee uniqueness
        // Use % 1000000 to keep names short (TMS truncates long names in dropdowns)
        const unixTs = Math.floor(Date.now() / 1000) % 1000000;
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

        // Select Type - Use "Terceros" in Demo, otherwise "Terceros Con Flota Si Genera Contrato"
        const transportistaType = isDemoMode() ? 'Terceros' : 'Terceros Con Flota Si Genera Contrato';
        await transportistaPage.selectTipoTransportista(transportistaType);

        await page.waitForTimeout(500);

        // Location
        await transportistaPage.selectRandomLocationCascade();

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
            // Redirected to Index - Execute #search-based Grid Rescue
            logger.info('⚠️ Redirected to Index. Executing Grid Rescue...');

            if (!currentUrl.includes('/transportistas/index')) {
                await page.goto(`${baseUrl}/transportistas/index`);
                await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => logger.warn('Network idle timeout during navigation to index.'));
                await page.waitForTimeout(2000);
            }

            // PRIMARY STRATEGY: Search using global #search + #buscar
            logger.info(`🔍 Searching via global #search: ${nombre}`);
            const searchInput = page.locator('#search');

            if (await searchInput.isVisible({ timeout: 5000 }).catch(() => false)) {
                await searchInput.fill(nombre);
                await TransportistaHelper.clickBuscarButton(page);
                await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => { });
                await page.waitForTimeout(2000);
            } else {
                logger.warn('⚠️ #search input not found on index page');
            }

            // Extract ID from the matching row
            const nameRegex = new RegExp(nombre.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
            const matchingRow = page.locator('#tabla_transportistas tbody tr')
                .filter({ hasText: nameRegex })
                .first();

            if (await matchingRow.count() > 0) {
                // Try from edit link first
                const editLink = matchingRow.locator('a[href*="/editar/"]').first();
                if (await editLink.count() > 0) {
                    const href = await editLink.getAttribute('href');
                    const match = href?.match(/\/editar\/(\d+)/);
                    if (match) {
                        id = match[1];
                        logger.info(`✅ Rescued ID via grid search (edit link): ${id}`);
                    }
                }

                // Fallback: try onclick in badge span (active/inactive)
                if (!id) {
                    const badge = matchingRow.locator('span[onclick*="cambiarEstado"]').first();
                    if (await badge.count() > 0) {
                        const onclick = await badge.getAttribute('onclick');
                        const match = onclick?.match(/cambiarEstado\((\d+)/);
                        if (match) {
                            id = match[1];
                            logger.info(`✅ Rescued ID via grid search (badge onclick): ${id}`);
                        }
                    }
                }
            } else {
                logger.warn(`⚠️ No row found matching: ${nombre}`);
                await page.screenshot({ path: `./reports/screenshots/transportista-grid-no-match-${Date.now()}.png` });
            }

            if (!id) {
                logger.warn('⚠️ Grid Rescue: Could not determine ID of created Transportista.');
                await page.screenshot({ path: `./reports/screenshots/transportista-id-rescue-failed-${Date.now()}.png` });
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
