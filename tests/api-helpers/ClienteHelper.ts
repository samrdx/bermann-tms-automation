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

        logger.info(`🌱 Sembrado UI Cliente: [${nombre}] RUT: ${rut}...`);

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
        logger.info('💾 Guardando Cliente vía UI...');

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
            if (savedId) logger.info(`✅ ID Rescatado de la Respuesta de Guardado: ${savedId}`);

        } catch (e) {
            logger.warn('⚠️ Falló la intercepción de la respuesta de guardado o la extracción del ID', e);
        }

        // 4. Verify & Rescue ID (Fallback)
        logger.info('⏳ Esperando la finalización del guardado/redirección...');

        // Wait for save to process (don't use strict waitForURL as it may timeout)
        await page.waitForTimeout(3000);

        let id = '';
        const currentUrl = page.url();
        logger.info(`📍 URL Post-guardado: ${currentUrl}`);

        if (savedId) {
            id = savedId;
        } else if (currentUrl.match(/\/(ver|view|editar|edit|update)\//)) {
            const match = currentUrl.match(/\/(?:ver|view|editar|edit|update)\/(\d+)/);
            if (match) {
                id = match[1];
                logger.info(`✅ ID Rescatado de la URL: ${id}`);
            }
        } else {
            // Only goto if we are NOT already there or in a detail page
            const current = page.url();
            if (!current.includes('/clientes/index') && !current.includes('/ver/') && !current.includes('/view/')) {
                logger.info(`🚀 Navegando al índice para rescate: ${baseUrl}/clientes/index`);
                await page.goto(`${baseUrl}/clientes/index`, { waitUntil: 'load', timeout: 30000 });
            }
            await page.waitForTimeout(2000);

            // PRIMARY STRATEGY: Search by RUT - immutable and reliable
            logger.info(`🔍 Buscando por RUT: ${rut}`);

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
                        logger.info(`✅ ID Rescatado vía búsqueda por RUT (data-key): ${id}`);
                    } else {
                        const actionLink = rutRow.locator('a[href*="/ver/"], a[href*="/view/"], a[href*="/editar/"]').first();
                        if (await actionLink.count() > 0) {
                            const href = await actionLink.getAttribute('href');
                            const match = href?.match(/(\d+)/);
                            if (match) {
                                id = match[1];
                                foundViaRut = true;
                                logger.info(`✅ ID Rescatado vía búsqueda por RUT (enlace): ${id}`);
                            }
                        }
                    }
                }
            }

            // FALLBACK STRATEGY: Search by Name
            if (!foundViaRut) {
                logger.warn('⚠️ Falló la búsqueda por RUT, recurriendo a búsqueda por nombre...');

                const nameFilterInput = page.locator('input[name*="[nombre]"]')
                    .or(page.locator('.dataTables_filter input'))
                    .first();

                if (await nameFilterInput.isVisible()) {
                    logger.info(`🔍 Buscando por nombre: ${nombre}`);
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
                            logger.info(`✅ ID Rescatado vía búsqueda por nombre: ${id}`);
                        } else {
                            const actionLink = row.locator('a[href*="/ver/"], a[href*="/view/"], a[href*="/editar/"]').first();
                            if (await actionLink.count() > 0) {
                                const href = await actionLink.getAttribute('href');
                                const match = href?.match(/(\d+)/);
                                if (match) {
                                    id = match[1];
                                    logger.info(`✅ ID Rescatado vía búsqueda por nombre (enlace): ${id}`);
                                }
                            }
                        }
                    }
                } catch (e) {
                    logger.error(`❌ FALLÓ la búsqueda del registro en la grilla por nombre: ${nombre}`, e);
                }
            }

            if (!id) {
                await page.screenshot({ path: `./reports/screenshots/cliente-rescue-id-failed-${Date.now()}.png` });
            }
        }

        if (!id) {
            logger.warn('⚠️ Sembrado UI: No se pudo determinar el ID del Cliente creado. Devolviendo solo los datos básicos.');
        } else {
            logger.info(`✅ Cliente [${nombre}] ID: ${id} sembrado exitosamente`);
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
        logger.info(`📍 URL Post-guardado para extracción de ID: ${currentUrl}`);

        // 1. Attempt to extract from URL (e.g., /ver/123 or /view/123)
        const idMatch = currentUrl.match(/\/(?:ver|view|editar|edit|update)\/(\d+)/);
        if (idMatch) {
            id = idMatch[1];
            logger.info(`✅ ID del Cliente extraído de la URL: ${id}`);
        } else {
            // Redirected to Index or other page - Execute Grid Rescue
            logger.info('⚠️ No se encuentra en la página de ver/editar. Ejecutando Rescate de Grilla...');

            // Ensure we are on the index page
            if (!currentUrl.includes('/clientes/index')) {
                await page.goto(`${baseUrl}/clientes/index`, { waitUntil: 'load', timeout: 30000 });
                await page.waitForTimeout(2000);
            }

            // PRIMARY STRATEGY: Search by RUT
            const cleanRut = rut.replace(/[.-]/g, '');
            logger.info(`🔍 Buscando por RUT: ${rut} (limpio: ${cleanRut})`);

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
                        logger.info(`✅ ID Rescatado vía búsqueda por RUT (data-key): ${id}`);
                    } else {
                        const actionLink = rutRow.locator('a[href*="/ver/"], a[href*="/view/"], a[href*="/editar/"]').first();
                        if (await actionLink.count() > 0) {
                            const href = await actionLink.getAttribute('href');
                            const match = href?.match(/(\d+)/);
                            if (match) {
                                id = match[1];
                                foundViaRut = true;
                                logger.info(`✅ ID Rescatado vía búsqueda por RUT (enlace): ${id}`);
                            }
                        }
                    }
                }
            } else {
                logger.warn('⚠️ El campo de filtro RUT no es visible, intentando búsqueda global...');

                // Try global search input (#search + #buscar) - same as TransportistaHelper
                const searchInput = page.locator('#search');
                if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
                    await searchInput.fill(nombre);
                    const buscarButton = page.locator('#buscar, a#buscar, button#buscar').first();
                    if (await buscarButton.count() > 0) {
                        try {
                            await buscarButton.click({ timeout: 2000 });
                        } catch (e) {
                            logger.info('🔎 Usando escape JS para hacer clic en el botón Buscar...');
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
                logger.warn('⚠️ Falló la búsqueda por RUT, recurriendo a búsqueda por nombre...');

                const nameFilterInput = page.locator('input[name*="[nombre]"]')
                    .or(page.locator('.dataTables_filter input'))
                    .first();

                if (await nameFilterInput.isVisible({ timeout: 3000 }).catch(() => false)) {
                    logger.info(`🔍 Buscando por nombre: ${nombre}`);
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
                            logger.info(`✅ ID Rescatado vía búsqueda por nombre (data-key): ${id}`);
                        } else {
                            const actionLink = row.locator('a[href*="/ver/"], a[href*="/view/"], a[href*="/editar/"]').first();
                            if (await actionLink.count() > 0) {
                                const href = await actionLink.getAttribute('href');
                                const match = href?.match(/(\d+)/);
                                if (match) {
                                    id = match[1];
                                    logger.info(`✅ ID Rescatado vía búsqueda por nombre (enlace): ${id}`);
                                }
                            }
                        }
                    }
                } catch (e) {
                    logger.error(`❌ FALLÓ la búsqueda del registro en la grilla por nombre: ${nombre}`, e);
                }
            }

            if (id === '0') {
                await page.screenshot({ path: `./reports/screenshots/cliente-id-rescue-failed-${Date.now()}.png` });
            }
        }

        if (id !== '0') {
            logger.info(`✅ Cliente [${nombre}] ID: ${id} identificado exitosamente`);
        } else {
            logger.warn(`⚠️ No se pudo determinar el ID del Cliente creado.`);
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
