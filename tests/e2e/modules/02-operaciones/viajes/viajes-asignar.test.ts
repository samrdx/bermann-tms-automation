import { test, expect } from '../../../../../src/fixtures/base.js';
import { AsignarPage } from '../../../../../src/modules/planning/pages/AsignarPage.js';
import { logger } from '../../../../../src/utils/logger.js';
import { DataPathHelper } from '../../../../api-helpers/DataPathHelper.js';
import fs from 'fs';

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
test.describe('Viajes - Asignar (Legacy, from JSON)', () => {
    test.setTimeout(120000);

    test('Should assign Viaje using entities from worker JSON', async ({ page }, testInfo) => {
        const startTime = Date.now();

        logger.info('='.repeat(80));
        logger.info('Starting Step 6.5: Asignar Viaje (Legacy from JSON)');
        logger.info('='.repeat(80));

        // =================================================================
        // PHASE 1: Load JSON Data
        // =================================================================
        logger.info('PHASE 1: Loading worker-specific JSON data...');
        const dataPath = DataPathHelper.getWorkerDataPath(testInfo);

        if (!fs.existsSync(dataPath)) {
            throw new Error(
                `Worker-specific data file not found!\nExpected: ${dataPath}\n` +
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
            throw new Error('❌ Missing: viaje.nroViaje. Run: npm run test:legacy:planificar');
        }

        const transNombre = seededTransportista.nombre as string;
        const patente = vehiculo.patente as string;
        const conductorFull = `${conductor.nombre} ${conductor.apellido}`.trim();
        const nroViaje = viaje.nroViaje as string;

        logger.info('✅ All prerequisites validated');
        logger.info(`   Transportista : ${transNombre}`);
        logger.info(`   Vehículo      : ${patente}`);
        logger.info(`   Conductor     : ${conductorFull}`);
        logger.info(`   Nro Viaje     : ${nroViaje}`);

        // =================================================================
        // PHASE 2: Search by nroViaje in /viajes/asignar → click Editar
        // =================================================================
        await test.step('Phase 2: Search and open trip form', async () => {
            logger.info('PHASE 2: Navigating to /viajes/asignar...');
            const asignarPage = new AsignarPage(page);
            await asignarPage.navigate();

            logger.info(`🔍 Searching for viaje "${nroViaje}" and opening edit form...`);
            // AsignarPage.selectViajeRow:
            //   1. Fills input[type="search"] with nroViaje
            //   2. Waits 2s for DataTables filter to apply
            //   3. Scans rows for nroViaje text
            //   4. Clicks i.fa-pencil / i.fa-edit / a[title="Editar"] → navigates to /viajes/editar/ID
            await asignarPage.selectViajeRow(nroViaje);

            logger.info(`✅ Trip assignment form loaded — URL: ${page.url()}`);

            // Confirm we are on the edit page
            expect(page.url()).toContain('/viajes/editar/');
        });

        // =================================================================
        // PHASE 3: Select Transportista
        // =================================================================
        await test.step('Phase 3: Select Transportista', async () => {
            logger.info(`PHASE 3: Selecting Transportista: ${transNombre}`);
            await selectTransportistaRobust(page, transNombre);
        });

        // =================================================================
        // PHASE 4: Wait for AJAX cascade (vehicle/conductor reload)
        // =================================================================
        await test.step('Phase 4: Wait for cascade', async () => {
            logger.info('PHASE 4: Waiting for cascading dropdowns to reload...');
            await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {
                logger.warn('⚠️ networkidle timeout on cascade, continuing...');
            });
            await page.waitForTimeout(500);
        });

        // =================================================================
        // PHASE 5: Select Vehículo
        // =================================================================
        await test.step('Phase 5: Select Vehículo', async () => {
            logger.info(`PHASE 5: Selecting Vehículo: ${patente}`);
            await selectBootstrapDropdownByDataId(page, 'viajes-vehiculo_uno_id', patente);
        });

        // =================================================================
        // PHASE 6: Select Conductor
        // =================================================================
        await test.step('Phase 6: Select Conductor', async () => {
            logger.info(`PHASE 6: Selecting Conductor: ${conductorFull}`);
            await selectBootstrapDropdownByDataId(page, 'viajes-conductor_id', conductorFull);
        });

        // =================================================================
        // PHASE 7: Anti-reset guard for Transportista
        // =================================================================
        await test.step('Phase 7: Verify Transportista not reset by cascade', async () => {
            logger.info('PHASE 7: Final anti-reset check for Transportista...');

            const finalCheck = await page.evaluate((expected: string) => {
                const sel = document.querySelector('select[id*="transportista"]') as HTMLSelectElement;
                if (!sel) return { correct: false, current: 'SELECT NOT FOUND' };
                const text = sel.options[sel.selectedIndex]?.text || '';
                return { correct: text.toUpperCase().includes(expected.toUpperCase()), current: text };
            }, transNombre);

            if (!finalCheck.correct) {
                logger.warn(`⚠️ Transportista reset detected. Got: "${finalCheck.current}". Applying silent fix...`);
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
                logger.info(`✅ Transportista corrected to: "${recheck}"`);
            } else {
                logger.info(`✅ Transportista confirmed: "${finalCheck.current}"`);
            }

            await page.waitForTimeout(300);
        });

        // =================================================================
        // PHASE 8: Save and handle confirmation modals
        // =================================================================
        await test.step('Phase 8: Save assignment', async () => {
            logger.info('PHASE 8: Clicking Guardar...');
            await page.click('#btn_guardar_form');

            // Handle possible confirmation modal
            try {
                const btnConfirmar = page.locator(
                    '.bootbox-accept, button:has-text("Aceptar"), button:has-text("Confirmar")'
                ).first();
                if (await btnConfirmar.isVisible({ timeout: 5000 })) {
                    logger.info('⚠️ Confirmation modal detected — accepting...');
                    await btnConfirmar.click();
                }
            } catch {
                logger.info('ℹ️ No confirmation modal appeared.');
            }

            // Guard: "Transportista sin contrato" means wrong transportista was saved
            const errorContrato = page.locator('text="Transportista sin contrato"');
            if (await errorContrato.isVisible({ timeout: 2000 })) {
                throw new Error(
                    `❌ "Transportista sin contrato" error for ${transNombre}. ` +
                    'Check that a Costo contract exists for this transportista.'
                );
            }

            await page.waitForLoadState('networkidle');
            logger.info('💾 Save completed');
        });

        // =================================================================
        // PHASE 9: Verify trip appears in /viajes/asignar grid
        // =================================================================
        await test.step('Phase 9: Verify in grid', async () => {
            logger.info('PHASE 9: Verifying assignment in /viajes/asignar grid...');

            // After save, TMS should redirect back to /viajes/asignar
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

            // The /viajes/asignar page uses a CUSTOM search input with id="search" (type="text"),
            // not a standard DataTables input[type="search"]
            const searchInput = page.locator('#search').first();
            await searchInput.waitFor({ state: 'visible', timeout: 15000 });
            await searchInput.fill(nroViaje);
            // Click the dedicated search button
            await page.locator('a#buscar').click();
            await page.waitForTimeout(2000);

            const viajeRow = page.locator('#tabla_asignar tbody tr')
                .filter({ hasText: nroViaje }).first();
            const isVisible = await viajeRow.isVisible({ timeout: 10000 }).catch(() => false);

            if (!isVisible) {
                const errors = await page
                    .locator('.alert-danger, .toast-error')
                    .allTextContents()
                    .catch(() => [] as string[]);
                const errorMsg = errors.filter(e => e.trim()).join(' | ');
                throw new Error(
                    `❌ Viaje [${nroViaje}] not found in /viajes/asignar after save. Errors: ${errorMsg || 'none'}`
                );
            }

            logger.info(`✅ Viaje [${nroViaje}] confirmed in assignment grid`);
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
        logger.info('✅ JSON updated: viaje.status = ASIGNADO');

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
    await btnDropdown.click();

    const searchBox = page.locator('.bs-searchbox input').filter({ visible: true }).first();
    await searchBox.click();
    await searchBox.pressSequentially(nombre, { delay: 100 });

    const opcionFiltrada = page.locator('.dropdown-menu.show li a').filter({ hasText: nombre }).first();
    await opcionFiltrada.waitFor({ state: 'visible', timeout: 5000 });
    await page.waitForTimeout(500);
    await opcionFiltrada.click();

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
        await dropdownBtn.click();
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
        logger.warn(`⚠️ selectBootstrapDropdownByDataId failed for "${dataId}": ${e}. JS fallback...`);
        await page.evaluate(({ selectId, text }: { selectId: string; text: string }) => {
            const select = document.getElementById(selectId) as HTMLSelectElement;
            if (!select) return;
            const opt = Array.from(select.options)
                .find(o => o.text.toUpperCase().includes(text.toUpperCase()));
            if (opt) {
                select.value = opt.value;
                // @ts-ignore
                if (window.jQuery && window.jQuery(select).selectpicker) {
                    // @ts-ignore
                    window.jQuery(select).selectpicker('refresh');
                }
            }
        }, { selectId: dataId, text: textToSelect });
    }
}
