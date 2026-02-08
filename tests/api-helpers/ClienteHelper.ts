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
        transportistaAsociado?: string
    ): Promise<Cliente> {
        const baseUrl = config.get().baseUrl;
        const clientePage = new ClienteFormPage(page);

        // Data Generation - UNIQUE NAME with 6-digit Unix seconds to guarantee uniqueness
        // Use % 1000000 to keep names short (TMS truncates long names in dropdowns)
        const unixTs = Math.floor(Date.now() / 1000) % 1000000;
        const rawBaseName = generateShortCompanyName();
        const baseName = rawBaseName.split(' - ')[0].trim(); // Company name before timestamp suffix

        const nombre = `${baseName} ${unixTs}`;
        const nombreFantasia = `${baseName.split(' ')[0]} SpA ${unixTs}`; // e.g. "Titanium SpA 489749"
        const rawRut = generateValidChileanRUT();
        const rut = rawRut.replace(/^(\d{7,8})(\d|k|K)$/, '$1-$2').toUpperCase();
        const calle = generateChileanStreet();
        const email = `${baseName.toLowerCase().replace(/\s/g, '')}@test.cl`;
        const telefono = '+569' + Math.floor(10000000 + Math.random() * 90000000).toString();

        logger.info(`🌱 UI Seeding Cliente: [${nombre}] RUT: ${rut}...`);

        // 1. Navigate
        await clientePage.navigate();

        // 2. Fill Form
        await clientePage.fillNombre(nombre);
        await clientePage.fillRut(rut);
        await clientePage.fillNombreFantasia(nombreFantasia);

        // Select Tipo Cliente
        await clientePage.selectTipoCliente('Distribución');

        // Location
        await clientePage.selectRandomRegion();
        await clientePage.selectRandomCiudad();
        await clientePage.selectRandomComuna();

        await clientePage.fillCalle(calle);
        // Skip Altura (optional)

        // Poligonos
        await clientePage.selectAllPoligonos();

        // Transportista Asociado (if provided)
        if (transportistaAsociado) {
            await clientePage.selectTransportista(transportistaAsociado);
        }

        // Contact
        await clientePage.fillEmail(email);
        await clientePage.fillTelefono(telefono);

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
            // Redirected to Index - RUT-based Grid Rescue
            logger.info('⚠️ Redirected to Index. Executing RUT-based Grid Rescue...');

            await page.goto(`${baseUrl}/clientes/index`);
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
}
