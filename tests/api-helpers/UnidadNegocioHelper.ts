import { Page, expect } from '@playwright/test';
import { logger } from '../../src/utils/logger.js';
import { config } from '../../src/config/environment.js';
import { NamingHelper } from '../../src/utils/NamingHelper.js';
import { UnidadNegocioPage } from '../../src/modules/configAdmin/pages/UnidadNegocioPage.js';

export interface UnidadNegocio {
    id: string;
    nombre: string;
    baseNombre: string;
}

export class UnidadNegocioHelper {

    /**
     * Clicks the "Buscar" button on the TMS grid index pages.
     * Uses the proven pattern from TmsApiClient: link role first, JS fallback for Firefox.
     */
    static async clickBuscarButton(page: Page): Promise<void> {
        try {
            const buscarLink = page.getByRole('link', { name: 'Buscar' });
            if (await buscarLink.isVisible({ timeout: 3000 }).catch(() => false)) {
                await buscarLink.click({ force: true, timeout: 1500 });
                logger.info('🔎 Se hizo clic en el botón Buscar (rol link)');
                return;
            }
        } catch {
            // Fallback below
        }

        // JS fallback (Firefox-safe): click #buscar element directly
        logger.info('🔎 Usando fallback de JS para hacer clic en el botón Buscar...');
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
        logger.info('🔎 Se hizo clic en el botón Buscar (fallback de JS)');
    }


    /**
     * Extracts Unidad de Negocio ID and other details after UI creation.
     * Assumes redirection to a 'view' or 'edit' page containing the ID in the URL.
     * If redirected to index, it will attempt a grid search.
     * 
     * @param page Playwright Page object
     * @param nombre The full name of the Unidad de Negocio (with timestamp)
     * @returns A UnidadNegocio object with extracted ID and other details.
     */
    static async extractUnidadNegocioIdAndName(
        page: Page,
        nombre: string,
        baseNombre: string,
    ): Promise<UnidadNegocio> {
        const baseUrl = config.get().baseUrl;
        let id = '0';
        let currentUrl = page.url();
        logger.info(`📍 URL posterior al guardado para extracción de ID: ${currentUrl}`);

        // 1. Attempt to extract from URL (e.g., /unidadnegocio/ver/123 or /unidadnegocio/editar/123)
        const idMatch = currentUrl.match(/\/(?:ver|view|editar|edit)\/(\d+)/);
        if (idMatch) {
            id = idMatch[1];
            logger.info(`✅ ID de Unidad de Negocio extraído de la URL: ${id}`);
        } else {
            // If redirected to index, try to find in grid
            logger.info('⚠️ No se encuentra en la página de ver/editar. Ejecutando Rescate de Grilla...');

            // Ensure we are on the index page for grid search
            if (!currentUrl.includes('/unidadnegocio/index')) {
                await page.goto(`${baseUrl}/unidadnegocio/index`);
                await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => logger.warn('Tiempo de espera de red agotado durante la navegación al índice.'));
                await page.waitForTimeout(2000);
            }

            // Perform grid search (assuming a search input and a table with edit links)
            // This part might need adjustment based on actual UI of /unidadnegocio/index
            logger.info(`🔍 Buscando por nombre en grilla: ${nombre}`);
            const searchInput = page.locator('#search'); // Common search input selector
            if (await searchInput.isVisible({ timeout: 5000 }).catch(() => false)) {
                await searchInput.fill(nombre);
                await UnidadNegocioHelper.clickBuscarButton(page); // Use the robust click method
                await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => { });
                await page.waitForTimeout(2000);
            } else {
                logger.warn('⚠️ El campo de búsqueda #search no se encontró en la página de índice');
            }

            const nameRegex = new RegExp(nombre.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
            const matchingRow = page.locator('#tabla_unidad_negocio tbody tr') // Corrected table ID
                .filter({ hasText: nameRegex })
                .first();

            if (await matchingRow.count() > 0) {
                const editLink = matchingRow.locator('a[href*="/editar/"]').first();
                if (await editLink.count() > 0) {
                    const href = await editLink.getAttribute('href');
                    const match = href?.match(/\/editar\/(\d+)/);
                    if (match) {
                        id = match[1];
                        logger.info(`✅ ID rescatado via busqueda en grilla (editar link): ${id}`);
                    }
                }
            } else {
                logger.warn(`⚠️ No se encontró fila en grilla que coincida con: ${nombre}`);
                await page.screenshot({ path: `./reports/screenshots/unidadnegocio-grid-no-match-${Date.now()}.png` });
            }

            if (id === '0') {
                logger.warn(`⚠️ Rescate de Grilla: No se pudo determinar el ID de la Unidad de Negocio.`);
                await page.screenshot({ path: `./reports/screenshots/unidadnegocio-id-rescue-failed-${Date.now()}.png` });
            }
        }

        if (id === '0') {
            logger.error(`❌ No se pudo extraer el ID de la Unidad de Negocio para: ${nombre}`);
            throw new Error(`Failed to extract Unidad de Negocio ID for: ${nombre}`);
        }

        logger.info(`✅ ID de Unidad de Negocio [${nombre}] extraído exitosamente: ${id}`);
        return {
            id,
            nombre,
            baseNombre,
        };
    }

    /**
     * Creates a Unidad de Negocio via UI Interactions using the Page Object.
     * 
     * @param page Playwright Page object
     * @returns A UnidadNegocio object with details of the created entity.
     */
    static async createUnidadNegocioViaUI(
        page: Page
    ): Promise<UnidadNegocio> {
        const unidadNegocioPage = new UnidadNegocioPage(page);

        // Data Generation using NamingHelper
        const nombre = NamingHelper.getUnidadNegocioName();
        const baseNombre = nombre.split(' - ')[0]; // Assuming name format "BaseName - ###"

        logger.info(`🌱 UI Sembrando Unidad de Negocio: [${nombre}]...`);

        // 1. Navigate
        await unidadNegocioPage.navigate();

        // 2. Fill Form
        await unidadNegocioPage.fillNombre(nombre);

        // 3. Save
        logger.info('💾 Guardando Unidad de Negocio vía UI...');
        await unidadNegocioPage.clickGuardar();

        // 4. Verify & Rescue ID
        logger.info('⏳ Esperando que finalice el guardado/redirección y extrayendo ID...');
        await page.waitForURL(url => url.toString().includes('/unidadnegocio/index') || !!url.toString().match(/\/(ver|view|editar|edit)\//), { timeout: 30000 });

        const createdUnidadNegocio = await this.extractUnidadNegocioIdAndName(page, nombre, baseNombre);

        if (!createdUnidadNegocio.id || createdUnidadNegocio.id === '0') {
            logger.warn('⚠️ Sembrado UI: No se pudo determinar el ID de la Unidad de Negocio creado. Devolviendo solo los datos básicos.');
        } else {
            logger.info(`✅ Unidad de Negocio [${createdUnidadNegocio.nombre}] ID: ${createdUnidadNegocio.id} sembrado exitosamente`);
        }

        return createdUnidadNegocio;
    }
}
