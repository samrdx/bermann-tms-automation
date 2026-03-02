import { Page, expect } from '@playwright/test';
import { logger } from '../../src/utils/logger.js';
import {
    generateValidChileanRUT,
    generateShortCompanyName,
    generateChileanStreet,
    generateStreetNumber
} from '../../src/utils/rutGenerator.js';
import { config } from '../../src/config/environment.js';
import { ClienteFormPage } from '../../src/modules/commercial/pages/ClientePage.js';

export interface Cliente {
    id: string;
    nombre: string;
    nombreFantasia: string;
    rut: string;
    email: string;
}

export class ClienteHelper {

    /**
     * Creates a Cliente via UI interactions using the Page Object.
     * 
     * @param page Playwright Page object
     * @param transportistaAsociado - Name of Transportista to associate (from dropdown)
     */
    static async createClienteViaUI(
        page: Page,
    ): Promise<Cliente> {
        const baseUrl = config.get().baseUrl;
        const clientePage = new ClienteFormPage(page);

        // Data Generation - Short name + 4 digits (same pattern as Transportista)
        const shortNames = ['Distribuidora', 'Comercial', 'Importadora', 'Logistica', 'Servicios', 'Industrial', 'Global', 'Central'];
        const baseName = shortNames[Math.floor(Math.random() * shortNames.length)];
        const fourDigits = Math.floor(Math.random() * 9000) + 1000;

        const nombre = `${baseName} ${fourDigits}`;
        const nombreFantasia = `${baseName} ${fourDigits} SpA`;
        const rawRut = generateValidChileanRUT();
        const rut = rawRut.replace(/^(\d{7,8})(\d|k|K)$/, '$1-$2').toUpperCase();
        const calle = generateChileanStreet();
        const email = `${baseName.toLowerCase().replace(/\s/g, '')}@test.cl`;

        logger.info(`🌱 UI Seeding Cliente: [${nombre}] RUT: ${rut}...`);

        // 1. Navigate
        await clientePage.navigate();

        // 2. Fill Form
        await clientePage.fillNombre(nombre);
        await clientePage.fillRut(rut);
        await clientePage.fillNombreFantasia(nombreFantasia);

        // Select Tipo Cliente
        await clientePage.selectTipoCliente('Distribución');

        // Location (with cascade retry)
        await clientePage.selectRandomLocationCascade();

        await clientePage.fillCalle(calle);
        // Skip Altura (optional)

        // Poligonos
        await clientePage.selectAllPoligonos();

        // Note: Transportista Asociado skipped (user decision 2026-02-26)
        // Note: Email and Telefono fields do NOT exist in the form

        // 3. Save & Intercept Response
        logger.info('💾 Saving Cliente via UI...');

        let savedId = '';

        try {
            const [response] = await Promise.all([
                page.waitForResponse(resp => resp.url().includes('/clientes/crear') && resp.request().method() === 'POST', { timeout: 10000 }),
                clientePage.clickGuardar()
            ]);

            const respText = await response.text();
            try {
                const json = JSON.parse(respText);
                if (json.id) savedId = json.id;
                else if (json.clienteId) savedId = json.clienteId;
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

        // Wait for save to process (don't use strict waitForURL as it may timeout)
        await page.waitForTimeout(3000);

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
            // Only goto if we are NOT already there or in a detail page
            const current = page.url();
            if (!current.includes('/clientes/index') && !current.includes('/ver/') && !current.includes('/view/')) {
                logger.info(`🚀 Navigating to index for rescue: ${baseUrl}/clientes/index`);
                await page.goto(`${baseUrl}/clientes/index`, { waitUntil: 'load', timeout: 30000 });
            }
            await page.waitForTimeout(2000);

            // PRIMARY STRATEGY: Search by RUT - immutable and reliable
            logger.info(`🔍 Searching by RUT: ${rut}`);

            const rutFilterInput = page.locator('input[name*="[rut]"]')
                .or(page.locator('input[name*="ClienteSearch[rut]"]'))
                .or(page.locator('input[name*="ClientesSearch[rut]"]'))
                .first();

            let foundViaRut = false;
            if (await rutFilterInput.isVisible({ timeout: 3000 }).catch(() => false)) {
                // Clean RUT for search (remove formatting like dots and hyphens)
                const searchRut = rut.replace(/[.-]/g, '');
                await rutFilterInput.fill(searchRut);
                await rutFilterInput.press('Enter');
                await page.waitForTimeout(1500);

                // Look for row containing the RUT (partial match on first 6 digits)
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

            // FALLBACK STRATEGY: Search by Name
            if (!foundViaRut) {
                logger.warn('⚠️ RUT search failed, falling back to name-based search...');

                const nameFilterInput = page.locator('input[name*="[nombre]"]')
                    .or(page.locator('.dataTables_filter input'))
                    .first();

                if (await nameFilterInput.isVisible()) {
                    logger.info(`🔍 Searching by name: ${nombre}`);
                    await nameFilterInput.fill(nombre);
                    await nameFilterInput.press('Enter');
                    await page.waitForTimeout(1500);
                }

                try {
                    const row = page.locator('table tbody tr').filter({ hasText: nombre.split(' ')[0] }).first();
                    if (await row.count() > 0) {
                        const dataKey = await row.getAttribute('data-key');
                        if (dataKey) {
                            id = dataKey;
                            logger.info(`✅ Rescued ID via name search: ${id}`);
                        } else {
                            const actionLink = row.locator('a[href*="/ver/"], a[href*="/view/"], a[href*="/editar/"]').first();
                            if (await actionLink.count() > 0) {
                                const href = await actionLink.getAttribute('href');
                                const match = href?.match(/(\d+)/);
                                if (match) {
                                    id = match[1];
                                    logger.info(`✅ Rescued ID via name search (link): ${id}`);
                                }
                            }
                        }
                    }
                } catch (e) {
                    logger.error(`❌ FAILED to find record in grid by name: ${nombre}`, e);
                }
            }

            if (!id) {
                await page.screenshot({ path: `./reports/screenshots/cliente-rescue-id-failed-${Date.now()}.png` });
            }
        }

        if (!id) {
            logger.warn('⚠️ UI Seeding: Could not determine ID of created Cliente. Returning data only.');
        } else {
            logger.info(`✅ Successfully seeded Cliente [${nombre}] ID: ${id}`);
        }

        return {
            id,
            nombre,
            nombreFantasia,
            rut,
            email
        };
    }

    /**
     * Extracts Cliente ID and details after a UI creation.
     * Same pattern as TransportistaHelper.extractTransportistaIdAndName.
     * 
     * @param page Playwright Page object
     * @param nombre The full name of the Cliente
     * @param rut The RUT of the Cliente
     * @param baseNombre The base name (without digits)
     * @param nombreFantasia The nombre fantasía
     * @returns A Cliente object with extracted ID and other details.
     */
    static async extractClienteIdAndName(
        page: Page,
        nombre: string,
        rut: string,
        baseNombre: string,
        nombreFantasia: string
    ): Promise<Cliente> {
        const baseUrl = config.get().baseUrl;
        let id = '0';
        const currentUrl = page.url();
        logger.info(`📍 Post-save URL for ID extraction: ${currentUrl}`);

        // 1. Attempt to extract from URL (e.g., /ver/123 or /view/123)
        const idMatch = currentUrl.match(/\/(?:ver|view|editar|edit|update)\/(\d+)/);
        if (idMatch) {
            id = idMatch[1];
            logger.info(`✅ Cliente ID extracted from URL: ${id}`);
        } else {
            // Redirected to Index or other page - Execute Grid Rescue
            logger.info('⚠️ Not on view/edit page. Executing Grid Rescue...');

            // Ensure we are on the index page
            if (!currentUrl.includes('/clientes/index')) {
                await page.goto(`${baseUrl}/clientes/index`, { waitUntil: 'load', timeout: 30000 });
                await page.waitForTimeout(2000);
            }

            // PRIMARY STRATEGY: Search by RUT
            const cleanRut = rut.replace(/[.-]/g, '');
            logger.info(`🔍 Searching by RUT: ${rut} (clean: ${cleanRut})`);

            const rutFilterInput = page.locator('input[name*="[rut]"]')
                .or(page.locator('input[name*="ClienteSearch[rut]"]'))
                .or(page.locator('input[name*="ClientesSearch[rut]"]'))
                .first();

            let foundViaRut = false;
            if (await rutFilterInput.isVisible({ timeout: 3000 }).catch(() => false)) {
                await rutFilterInput.fill(cleanRut);
                await rutFilterInput.press('Enter');
                await page.waitForTimeout(1500);

                const rutRow = page.locator('table tbody tr')
                    .filter({ hasText: new RegExp(cleanRut.slice(0, 6), 'i') })
                    .first();

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
            } else {
                logger.warn('⚠️ RUT filter input not visible, trying global search...');

                // Try global search input (#search + #buscar) - same as TransportistaHelper
                const searchInput = page.locator('#search');
                if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
                    await searchInput.fill(nombre);
                    const buscarButton = page.locator('#buscar, a#buscar, button#buscar').first();
                    if (await buscarButton.count() > 0) {
                        try {
                            await buscarButton.click({ timeout: 2000 });
                        } catch (e) {
                            logger.info('🔎 Using JS fallback to click Buscar button...');
                            await buscarButton.evaluate((btn) => (btn as HTMLElement).click());
                        }
                    } else {
                        await searchInput.press('Enter');
                    }
                    await page.waitForTimeout(2000);
                }
            }

            // FALLBACK STRATEGY: Search by Name
            if (!foundViaRut && id === '0') {
                logger.warn('⚠️ RUT search failed, falling back to name-based search...');

                const nameFilterInput = page.locator('input[name*="[nombre]"]')
                    .or(page.locator('.dataTables_filter input'))
                    .first();

                if (await nameFilterInput.isVisible({ timeout: 3000 }).catch(() => false)) {
                    logger.info(`🔍 Searching by name: ${nombre}`);
                    await nameFilterInput.fill(nombre);
                    await nameFilterInput.press('Enter');
                    await page.waitForTimeout(1500);
                }

                try {
                    const nameRegex = new RegExp(nombre.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
                    const row = page.locator('table tbody tr')
                        .filter({ hasText: nameRegex })
                        .first();

                    if (await row.count() > 0) {
                        const dataKey = await row.getAttribute('data-key');
                        if (dataKey) {
                            id = dataKey;
                            logger.info(`✅ Rescued ID via name search (data-key): ${id}`);
                        } else {
                            const actionLink = row.locator('a[href*="/ver/"], a[href*="/view/"], a[href*="/editar/"]').first();
                            if (await actionLink.count() > 0) {
                                const href = await actionLink.getAttribute('href');
                                const match = href?.match(/(\d+)/);
                                if (match) {
                                    id = match[1];
                                    logger.info(`✅ Rescued ID via name search (link): ${id}`);
                                }
                            }
                        }
                    }
                } catch (e) {
                    logger.error(`❌ FAILED to find record in grid by name: ${nombre}`, e);
                }
            }

            if (id === '0') {
                await page.screenshot({ path: `./reports/screenshots/cliente-id-rescue-failed-${Date.now()}.png` });
            }
        }

        if (id !== '0') {
            logger.info(`✅ Successfully identified Cliente [${nombre}] ID: ${id}`);
        } else {
            logger.warn(`⚠️ Could not determine ID of created Cliente.`);
        }

        return {
            id,
            nombre,
            nombreFantasia,
            rut,
            email: '' // Email field does not exist in the form
        };
    }
}
