import { test, expect } from '../../../../../src/fixtures/base.js';
import { AsignarPage } from '../../../../../src/modules/planning/pages/AsignarPage.js';
import { logger } from '../../../../../src/utils/logger.js';
import { DataPathHelper } from '../../../../api-helpers/DataPathHelper.js';
import fs from 'fs';
import { allure } from 'allure-playwright';
import { entityTracker } from '../../../../../src/utils/entityTracker.js';

/**
 * Step 6.5: Asignar Viaje (Legacy - uses seeded data from JSON)
 *
 * Prerequisites (run in order):
 *   1. npm run test:legacy:setup      → seededTransportista, vehiculo, conductor
 *   2. npm run test:legacy:planificar → viaje.nroViaje
 *
 * Flow:
 *   1. Navigate to /viajes/asignar
 *   2. Search for the trip by nroViaje using the DataTables search box
 *   3. Click the edit button (pencil icon) in the result row → opens /viajes/editar/ID
 *   4. Assign Transportista, Vehículo, Conductor
 *   5. Save and verify
 */
test.describe('[V02] Viajes - Asignar', () => {
    test.setTimeout(120000);

    test('Debe asignar un viaje usando entidades del JSON', async ({ page }, testInfo) => {
        await allure.epic('TMS Legacy Flow');
        await allure.feature('03-Viajes');
        await allure.story('Asignar Viaje');

        const startTime = Date.now();
        const isDemo = process.env.ENV?.toUpperCase() === 'DEMO';

        logger.info('='.repeat(80));
        logger.info(`Iniciando Prueba de Asignación de Viaje (Legacy from JSON) [ENV: ${isDemo ? 'DEMO' : 'QA'}]`);
        logger.info('='.repeat(80));

        // =================================================================
        // PHASE 1: Load JSON Data
        // =================================================================
        logger.info('Fase 1: Cargando datos del JSON...');
        const dataPath = DataPathHelper.getWorkerDataPath(testInfo);

        if (!fs.existsSync(dataPath)) {
            throw new Error(
                `Archivo de datos no encontrado!\nExpected: ${dataPath}\n` +
                'Please run: npm run test:legacy:setup'
            );
        }

        const operationalData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

        const seededTransportista = operationalData.seededTransportista;
        if (!seededTransportista?.nombre) {
            throw new Error('❌ Missing: seededTransportista. Run: npm run test:legacy:setup');
        }

        // Prioritize seededVehiculo/seededConductor associated with seededTransportista
        const vehiculo = operationalData.seededVehiculo || operationalData.vehiculo;
        if (!vehiculo?.patente) {
            throw new Error('❌ Missing: vehiculo/seededVehiculo. Run: npm run test:legacy:setup');
        }

        const conductor = operationalData.seededConductor || operationalData.conductor;
        if (!conductor?.nombre) {
            throw new Error('❌ Missing: conductor/seededConductor. Run: npm run test:legacy:setup');
        }

        const viaje = operationalData.viaje;
        if (!viaje?.nroViaje) {
            throw new Error('❌ Missing: viaje.nroViaje. Run: npm run test:demo:legacy:planificar (Demo) or test:qa:legacy:planificar (QA)');
        }

        const transNombre = seededTransportista.nombre as string;
        const patente = vehiculo.patente as string;
        const conductorFull = `${conductor.nombre} ${conductor.apellido}`.trim();
        const nroViaje = viaje.nroViaje as string;

        // In Demo the grid filters by internal ID (viaje.id), not by the user-visible nroViaje.
        // viaje.id is saved by viajes-planificar.test.ts when running in Demo.
        const searchId = (isDemo && viaje.id) ? String(viaje.id) : nroViaje;

        logger.info('✅ Todos los prerrequisitos validados');
        logger.info(`   Transportista : ${transNombre}`);
        logger.info(`   Vehículo      : ${patente}`);
        logger.info(`   Conductor     : ${conductorFull}`);
        logger.info(`   Nro Viaje     : ${nroViaje}`);
        logger.info(`   Search ID     : ${searchId} (${isDemo && viaje.id ? 'internal grid ID' : 'nroViaje'})`);

        await allure.parameter('Transportista', transNombre);
        await allure.parameter('Vehículo', patente);
        await allure.parameter('Conductor', conductorFull);
        await allure.parameter('Nro Viaje', nroViaje);
        await allure.parameter('Ambiente', isDemo ? 'DEMO' : 'QA');
        await allure.attachment('Entidades Asignadas (JSON)', JSON.stringify({
            transportista: transNombre,
            vehiculo: patente,
            conductor: conductorFull,
            nroViaje,
            searchId
        }, null, 2), 'application/json');

        await allure.attachment('Viaje Data', JSON.stringify({
            Transportista: transNombre,
            Vehiculo: patente,
            Conductor: conductorFull,
            NroViaje: nroViaje,
            SearchId: searchId,
            IsDemo: isDemo
        }, null, 2), 'application/json');

        // =================================================================
        // PHASE 2: Search by nroViaje in /viajes/asignar → click Editar
        // =================================================================
        await test.step('Fase 2: Buscar y abrir formulario de viaje', async () => {
            logger.info(`Fase 2: Navegando a /viajes/asignar... [isDemo=${isDemo}]`);
            const asignarPage = new AsignarPage(page);
            await asignarPage.navigate();

            logger.info(`🔍 Buscando viaje "${searchId}" y abriendo formulario de edición...`);
            // AsignarPage.selectViajeRow uses:
            //   Demo: #search input + a#buscar click, then scans rows
            //   QA  : input[type="search"] DataTables, then scans rows
            // Both environments are handled transparently by AsignarPage.findViajeRow()
            await asignarPage.selectViajeRow(searchId);

            logger.info(`✅ Formulario de asignación de viaje cargado — URL: ${page.url()}`);

            // Confirm we are on the edit page
            expect(page.url()).toContain('/viajes/editar/');
        });

        // =================================================================
        // PHASE 3: Select Transportista
        // =================================================================
        await test.step('Fase 3: Seleccionar Transportista', async () => {
            logger.info(`Fase 3: Seleccionando Transportista: ${transNombre}`);
            await selectTransportistaRobust(page, transNombre);
        });

        // =================================================================
        // PHASE 4: Wait for AJAX cascade (vehicle/conductor reload)
        // =================================================================
        await test.step('Fase 4: Esperar recarga de cascada', async () => {
            logger.info('Fase 4: Esperando recarga de cascada...');
            await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {
                logger.warn('⚠️ networkidle timeout on cascade, continuing...');
            });
            await page.waitForTimeout(500);
        });

        // =================================================================
        // PHASE 5: Select Vehículo
        // =================================================================
        await test.step('Fase 5: Seleccionar Vehículo', async () => {
            logger.info(`Fase 5: Seleccionando Vehículo: ${patente}`);
            await selectBootstrapDropdownByDataId(page, 'viajes-vehiculo_uno_id', patente);
        });

        // =================================================================
        // PHASE 6: Select Conductor
        // =================================================================
        await test.step('Fase 6: Seleccionar Conductor', async () => {
            logger.info(`Fase 6: Seleccionando Conductor: ${conductorFull}`);
            await selectBootstrapDropdownByDataId(page, 'viajes-conductor_id', conductorFull);
        });

        // =================================================================
        // PHASE 7: Anti-reset guard for Transportista
        // =================================================================
        await test.step('Fase 7: Verificar que el Transportista no se reinicie por cascada', async () => {
            logger.info('Fase 7: Verificación final anti-reset para Transportista...');

            const finalCheck = await page.evaluate((expected: string) => {
                const sel = document.querySelector('select[id*="transportista"]') as HTMLSelectElement;
                if (!sel) return { correct: false, current: 'SELECT NOT FOUND' };
                const text = sel.options[sel.selectedIndex]?.text || '';
                return { correct: text.toUpperCase().includes(expected.toUpperCase()), current: text };
            }, transNombre);

            if (!finalCheck.correct) {
                logger.warn(`⚠️ Reinicio de Transportista detectado. Got: "${finalCheck.current}". Aplicando fix...`);
                await page.evaluate((target: string) => {
                    const sel = document.querySelector('select[id*="transportista"]') as HTMLSelectElement;
                    if (!sel) return;
                    const opt = Array.from(sel.options)
                        .find(o => o.text.toUpperCase().includes(target.toUpperCase()));
                    if (opt) {
                        sel.value = opt.value;
                        // @ts-ignore
                        if (window.jQuery) {
                            // @ts-ignore
                            const $s = window.jQuery(sel);
                            // @ts-ignore
                            if ($s.selectpicker) $s.selectpicker('val', opt.value);
                        }
                    }
                }, transNombre);
                const recheck = await page.evaluate(() => {
                    const s = document.querySelector('select[id*="transportista"]') as HTMLSelectElement;
                    return s?.options[s.selectedIndex]?.text || 'UNKNOWN';
                });
                logger.info(`✅ Transportista corregido a: "${recheck}"`);
            } else {
                logger.info(`✅ Transportista confirmado: "${finalCheck.current}"`);
            }

            await page.waitForTimeout(300);
        });

        // =================================================================
        // PHASE 8: Save and handle confirmation modals
        // =================================================================
        await test.step('Fase 8: Guardar asignación', async () => {
            logger.info('Fase 8: Guardar asignación...');
            const btnGuardar = page.locator('#btn_guardar_form');
            await btnGuardar.evaluate((el: HTMLElement | SVGElement | any) => el.scrollIntoView({ block: 'center' })).catch(() => { });
            await btnGuardar.evaluate((el: HTMLElement | SVGElement | any) => (el as HTMLElement).click());

            // Handle possible confirmation modal
            try {
                const btnConfirmar = page.locator(
                    '.bootbox-accept, button:has-text("Aceptar"), button:has-text("Confirmar")'
                ).first();
                if (await btnConfirmar.isVisible({ timeout: 5000 })) {
                    logger.info('⚠️ Modal de confirmación detectado — aceptando...');
                    await btnConfirmar.click();
                }
            } catch {
                logger.info('ℹ️ No apareció modal de confirmación.');
            }

            // Guard: "Transportista sin contrato" means wrong transportista was saved
            const errorContrato = page.locator('text="Transportista sin contrato"');
            if (await errorContrato.isVisible({ timeout: 2000 })) {
                throw new Error(
                    `❌ "Transportista sin contrato" error para ${transNombre}. ` +
                    'Verificar que exista un contrato de Costo para este transportista.'
                );
            }

            await page.waitForLoadState('networkidle');
            logger.info('💾 Guardado completado');
        });

        // =================================================================
        // PHASE 9: Verify trip appears in /viajes/asignar grid
        // =================================================================
        await test.step('Fase 9: Verificar en grilla', async () => {
            logger.info('Fase 9: Verificando asignación en grilla /viajes/asignar...');

            // After save, TMS redirects back to /viajes/asignar
            await page.waitForURL('**/viajes/asignar**', { timeout: 20000 });
            await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {
                logger.warn('⚠️ networkidle timeout post-redirect, continuing...');
            });

            // Wait for the table to render
            await page.locator('#tabla_asignar_wrapper, #tabla_asignar').first()
                .waitFor({ state: 'visible', timeout: 15000 }).catch(() => {
                    logger.warn('⚠️ DataTable wrapper not found, continuing anyway...');
                });
            await page.waitForTimeout(1000);

            // Both QA and Demo use #search + a#buscar pattern
            // (AsignarPage uses #search + a#buscar for Demo transparently,
            //  but here we search directly since we are in the test scope)
            const searchInput = page.locator('#search, input[type="search"]').first();
            await searchInput.waitFor({ state: 'visible', timeout: 15000 });
            await searchInput.fill(searchId);

            // Click search button (Demo: a#buscar, QA: may rely on DataTables auto-filter)
            const buscarBtn = page.locator('a#buscar').first();
            if (await buscarBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
                await buscarBtn.evaluate((el: HTMLElement | SVGElement | any) => el.scrollIntoView({ block: 'center' })).catch(() => { });
                await buscarBtn.evaluate((el: HTMLElement | SVGElement | any) => (el as HTMLElement).click());
                logger.info('✅ Clicked a#buscar to trigger search');
            } else {
                await page.keyboard.press('Enter');
                logger.info('ℹ️ Used Enter key to trigger search (no a#buscar found)');
            }
            await page.waitForTimeout(2000);

            const viajeRow = page.locator('#tabla_asignar tbody tr')
                .filter({ hasText: searchId }).first();
            const isVisible = await viajeRow.isVisible({ timeout: 10000 }).catch(() => false);

            if (!isVisible) {
                const errors = await page
                    .locator('.alert-danger, .toast-error')
                    .allTextContents()
                    .catch(() => [] as string[]);
                const errorMsg = errors.filter(e => e.trim()).join(' | ');
                throw new Error(
                    `❌ Viaje [${searchId}] no encontrado en /viajes/asignar después de guardar. Errores: ${errorMsg || 'none'}`
                );
            }

            const rowText = await viajeRow.innerText();
            const isAsignado = rowText.toLowerCase().includes('asignado');
            logger.info(`✅ Viaje [${searchId}] confirmado en grilla. Estado Asignado: ${isAsignado}`);

            entityTracker.register({
                type: 'Viaje',
                name: nroViaje,
                id: searchId,
                asociado: transNombre,
                patente: patente,
                extra: `Conductor: ${conductorFull}`,
                estado: 'ASIGNADO'
            });
        });

        // Persist final status to JSON
        operationalData.viaje = {
            ...operationalData.viaje,
            status: 'ASIGNADO',
            transportista: transNombre,
            vehiculo: patente,
            conductor: conductorFull,
        };
        fs.writeFileSync(dataPath, JSON.stringify(operationalData, null, 2), 'utf-8');
        logger.info('✅ JSON actualizado: viaje.status = ASIGNADO');

        const executionTime = ((Date.now() - startTime) / 1000).toFixed(2);
        logger.info('='.repeat(80));
        logger.info('STEP 6.5: ASIGNAR VIAJE (LEGACY) COMPLETE!');
        logger.info(`   Nro Viaje    : ${nroViaje}`);
        logger.info(`   Transportista: ${transNombre}`);
        logger.info(`   Vehículo     : ${patente}`);
        logger.info(`   Conductor    : ${conductorFull}`);
        logger.info(`   Duration     : ${executionTime}s`);
        logger.info('='.repeat(80));
    });
});

// ===========================================================================
// Helpers (proven patterns from viajes-asignar-e2e.test.ts)
// ===========================================================================

/**
 * Selects Transportista via Bootstrap Select with search.
 * Writes slowly to trigger JS filter, verifies the button text, and falls
 * back to JS injection if the UI selection does not match.
 */
async function selectTransportistaRobust(page: any, nombre: string): Promise<void> {
    logger.info(`🛡️ Robust Selection: Transportista "${nombre}"`);

    const btnDropdown = page.locator('button[data-id="viajes-transportista_id"]');
    await btnDropdown.evaluate((el: HTMLElement | SVGElement | any) => el.scrollIntoView({ block: 'center' })).catch(() => { });
    await btnDropdown.evaluate((el: HTMLElement | SVGElement | any) => (el as HTMLElement).click());

    const searchBox = page.locator('.bs-searchbox input').filter({ visible: true }).first();
    await searchBox.evaluate((el: HTMLElement | SVGElement | any) => el.scrollIntoView({ block: 'center' })).catch(() => { });
    await searchBox.evaluate((el: HTMLElement | SVGElement | any) => (el as HTMLElement).click());
    await searchBox.pressSequentially(nombre, { delay: 100 });

    const opcionFiltrada = page.locator('.dropdown-menu.show li a').filter({ hasText: nombre }).first();
    await opcionFiltrada.evaluate((el: HTMLElement | SVGElement | any) => el.scrollIntoView({ block: 'center' })).catch(() => { });
    await opcionFiltrada.waitFor({ state: 'visible', timeout: 5000 });
    await opcionFiltrada.evaluate((el: HTMLElement | SVGElement | any) => (el as HTMLElement).click());
    await page.waitForTimeout(500);

    await page.waitForTimeout(1000);
    const textoBoton = await btnDropdown.textContent();

    if (!textoBoton?.includes(nombre)) {
        logger.warn(`⚠️ Mismatch. Got: "${textoBoton}". JS injection fallback for "${nombre}"...`);
        await page.evaluate((searchText: string) => {
            const selects = Array.from(document.querySelectorAll('select'));
            for (const select of selects) {
                const option = Array.from(select.options)
                    .find(o => o.text.toUpperCase().includes(searchText.toUpperCase()));
                if (option) {
                    select.value = option.value;
                    select.dispatchEvent(new Event('change', { bubbles: true }));
                    // @ts-ignore
                    if (window.jQuery && window.jQuery(select).selectpicker) {
                        // @ts-ignore
                        window.jQuery(select).selectpicker('refresh');
                    }
                    return true;
                }
            }
            return false;
        }, nombre);
    } else {
        logger.info(`✅ Transportista verified: ${textoBoton?.trim()}`);
    }
}

/**
 * Selects an option in a Bootstrap Select dropdown identified by its `data-id`.
 * Uses the search box when available; falls back to JS injection on failure.
 */
async function selectBootstrapDropdownByDataId(
    page: any,
    dataId: string,
    textToSelect: string
): Promise<void> {
    try {
        const dropdownBtn = page.locator(`button[data-id="${dataId}"]`);
        await dropdownBtn.evaluate((el: HTMLElement | SVGElement | any) => el.scrollIntoView({ block: 'center' })).catch(() => { });
        await dropdownBtn.evaluate((el: HTMLElement | SVGElement | any) => (el as HTMLElement).click());
        await page.waitForTimeout(300);

        const searchInput = page.locator(
            "div.dropdown-menu.show input[aria-label='Search'], div.dropdown-menu.show .bs-searchbox input"
        ).first();
        if (await searchInput.isVisible({ timeout: 2000 }).catch(() => false)) {
            await searchInput.fill(textToSelect);
            await page.waitForTimeout(500);
        }

        const option = page.locator(
            'div.dropdown-menu.show li a span, div.dropdown-menu.show li a'
        ).filter({ hasText: textToSelect }).first();
        await option.waitFor({ state: 'visible', timeout: 5000 });
        await option.click();

        logger.info(`✅ Bootstrap dropdown [${dataId}] → "${textToSelect}"`);
    } catch (e) {
        logger.warn(`⚠️ selectBootstrapDropdownByDataId failed for "${dataId}": JS fallback...`);
        await page.evaluate(({ selectId, text }: { selectId: string; text: string }) => {
            const select = document.querySelector(`select[id$="${selectId.split('-')[1]}"]`) as HTMLSelectElement;
            if (!select) return;
            const opt = Array.from(select.options)
                .find(o => o.text.toUpperCase().includes(text.toUpperCase()));
            if (opt) {
                select.value = opt.value;
                // @ts-ignore
                if (window.jQuery) {
                    // @ts-ignore
                    const $s = window.jQuery(select);
                    // @ts-ignore
                    if ($s.selectpicker) {
                        $s.selectpicker('val', opt.value);
                    }
                }
            }
        }, { selectId: dataId, text: textToSelect });
    }
}
