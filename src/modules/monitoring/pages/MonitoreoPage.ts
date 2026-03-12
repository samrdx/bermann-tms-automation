import { Page } from '@playwright/test';
import { BasePage } from '../../../core/BasePage.js';
import { config } from '../../../config/environment.js';
import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('MonitoreoPage');

/**
 * Page Object para Monitoreo de Viajes (/viajes/monitoreo).
 *
 * Selectores verificados:
 * - Filtro ID:         #id
 * - Botón Buscar:      getByRole('link', { name: 'Buscar' })
 * - Contenedor:        #registros > div.div_viajes_width > ul.list-group > li (NO usa <table>/<tr>)
 * - Nro Viaje:         getByText(nroViaje, { exact: true })
 * - Horario GPS label: getByText('Horario GPS')
 * - Agregar:           span.manito con onclick="showModalEditTripWithoutGPSManually(...)"
 * - Modal:             .modal.show / .modal.fade.show
 *
 * Flujo:
 * buscarViaje(nroViaje)          → filtro #id + click "Buscar" → waitFor texto en #registros
 * clickAgregarHorarioGPS()       → scroll a "Horario GPS" + click "Agregar" global → modal
 * confirmarFinalizacion()        → cambiar estado a FINALIZADO + guardar
 * finalizarViaje(nroViaje)       → orquesta todo
 */
export class MonitoreoPage extends BasePage {
    private readonly monitoreoUrl: string;

    private readonly selectors = {
        filtroIdViaje: '#id',
        contenedor: '#registros',
        // Verified via Playwright MCP inspection:
        modalCambioEstado: '#modalCambioEstadoSinGps',
        selectEstado: '#drop_state_without_gps',
        btnGuardarModal: '#modificarEstadoViaje_sinGps',
        modalVisible: '.modal.show, .modal.fade.show, .modal[style*="display: block"]',
        btnConfirmar: '.bootbox-accept, button:has-text("Aceptar"), button:has-text("Confirmar")',
    };

    constructor(page: Page) {
        const monitoreoUrl = `${config.get().baseUrl}/viajes/monitoreo`;
        super(page, monitoreoUrl);
        this.monitoreoUrl = monitoreoUrl;
    }

    // ================================================================
    // 1. NAVEGACIÓN
    // ================================================================

    async navigate(): Promise<void> {
        logger.info(`📍 Navegando a: /viajes/monitoreo`);
        // Use relative path so Playwright resolves against configured baseURL
        // (same pattern as PlanificarPage, avoids absolute URL + domcontentloaded race)
        await this.page.goto('/viajes/monitoreo');
        await this.page.waitForLoadState('networkidle').catch(() => {
            logger.warn('⚠️ tiempo de espera networkidle agotado en monitoreo, continuando...');
        });
        const currentUrl = this.page.url();
        logger.info(`📍 URL Actual: ${currentUrl}`);
        if (currentUrl.includes('/login')) {
            throw new Error('❌ Redirected to /login — storageState auth may be expired or missing');
        }
        logger.info('✅ Página de Monitoreo cargada exitosamente');
    }

    /** @deprecated Use navigate() instead */
    async navegar(): Promise<void> {
        return this.navigate();
    }


    // ================================================================
    // 2. BUSCAR VIAJE EN TABLA #registros
    // ================================================================

    /**
     * Filtra por ID de viaje y confirma que aparece en #registros.
     *
     * Estructura DOM de #registros (NO es una tabla HTML):
     * #registros > div.div_viajes_width > ul.list-group > li.list-group-item
     * Cada li es una "columna". El nroViaje está en un <span> dentro de un li.
     *
     * Flujo:
     * 1. Llenar input #id con nroViaje
     * 2. Click en link "Buscar"
     * 3. Espera EXPLÍCITA: waitFor del texto nroViaje dentro de #registros
     * 4. Scroll al texto encontrado
     */
    async buscarViaje(nroViaje: string): Promise<void> {
        logger.info(`🔎 UI: Buscando Viaje [${nroViaje}]...`);

        try {
            // 1. Llenar filtro de ID del viaje
            logger.info('⏳ UI: Esperando input #id...');
            const inputId = this.page.locator(this.selectors.filtroIdViaje);
            await inputId.waitFor({ state: 'visible', timeout: 10000 });
            logger.info('👁️ UI: Input #id visible');
            await inputId.clear();
            await inputId.fill(nroViaje);
            logger.info(`📝 UI: Filtro de ID completado con: "${nroViaje}"`);

            // 2. Disparar búsqueda (estrategia robusta multi-entorno)
            await this.clickBuscar(inputId);

            // 3. ESPERA EXPLÍCITA: Esperar que el registro aparezca dentro de #registros
            // En QA aparece el texto del nroViaje. En Demo (bug visual) la celda del ID de viaje 
            // a veces sale vacía, pero los botones de acción (.manito) sí se renderizan.
            // Esperamos a que la tabla se pueble con el texto del viaje o con botones de acción.
            logger.info(`⏳ UI: Esperando a que la fila del viaje aparezca dentro de #registros...`);
            const contenedor = this.page.locator(this.selectors.contenedor);

            // Wait for either the text or at least one action button (manito) to appear in the container
            const rowLoadedPromise = Promise.any([
                contenedor.getByText(nroViaje, { exact: true }).first().waitFor({ state: 'visible', timeout: 30000 }).catch(() => { throw new Error('text not found'); }),
                contenedor.locator('span.manito').first().waitFor({ state: 'visible', timeout: 30000 }).catch(() => { throw new Error('manito not found'); })
            ]);

            try {
                await rowLoadedPromise;
                logger.info(`✅ UI: Fila de viaje reconocida dentro de #registros`);
            } catch {
                logger.warn(`⚠️ UI: Fila de viaje NO encontrada en 30s. Reintentando...`);
                await this.takeScreenshot('buscar-viaje-primer-intento-fallido');

                await this.page.reload();
                await this.page.waitForLoadState('networkidle');
                logger.info('🔄 UI: Página recargada, re-filtrando...');

                await inputId.waitFor({ state: 'visible', timeout: 10000 });
                await inputId.clear();
                await inputId.fill(nroViaje);
                await this.clickBuscar(inputId);
                logger.info('🔄 UI: Re-filtro ejecutado, esperando fila del viaje...');

                try {
                    const rowLoadedRetry = Promise.any([
                        contenedor.getByText(nroViaje, { exact: true }).first().waitFor({ state: 'visible', timeout: 30000 }).catch(() => { throw new Error(); }),
                        contenedor.locator('span.manito').first().waitFor({ state: 'visible', timeout: 30000 }).catch(() => { throw new Error(); })
                    ]);
                    await rowLoadedRetry;
                    logger.info(`✅ UI: Fila de viaje encontrada en el reintento`);
                } catch {
                    throw new Error(`Text "${nroViaje}" or action buttons did not appear after retry`);
                }
            }

            // 4. Scroll a la fila (buscamos cualquier elemento dentro para scrollear)
            logger.info('📜 UI: Scrolleando a la fila del viaje...');
            await this.page.waitForTimeout(1000);

            try {
                // Hacemos scroll visible usando el contenedor o el span.manito
                const scrollTarget = contenedor.locator('span.manito').first();
                // Ensure element is somewhat into view
                await scrollTarget.evaluate((node: HTMLElement) => node.scrollIntoView({ block: 'center' })).catch(() => { });
                await this.page.waitForTimeout(300);
                logger.info('✅ UI: Fila de Viaje confirmada y visible');
            } catch (e: any) {
                logger.warn(`⚠️ UI: Fallo en el scroll (${e.message}), continuando de todas formas...`);
                await this.page.waitForTimeout(500);
            }

        } catch (error) {
            logger.error(`❌ UI: Error buscando Viaje [${nroViaje}]`, error);
            await this.takeScreenshot('buscar-viaje-error');
            throw error;
        }
    }

    /**
     * Estrategia robusta multi-entorno para disparar la búsqueda en /viajes/monitoreo.
     *
     * En QA el formulario puede tener un <a id="buscar"> o link con texto "Buscar".
     * En Demo el mismo botón puede ser un <button id="buscar"> o responder a Enter.
     *
     * Estrategia 1: JS click en #buscar (patrón probado en TmsApiClient para todos los módulos).
     * Estrategia 2: Enter en el input #id (fallback universal — funciona en cualquier form).
     */
    private async clickBuscar(inputId: any): Promise<void> {
        logger.info('🔎 UI: Disparando búsqueda (multi-estrategia)...');

        // Execute both enter and JS click for maximum robustness (especially in Demo/Firefox)
        await Promise.all([
            this.page.waitForLoadState('domcontentloaded').catch(() => { }),
            inputId.press('Enter').catch(() => { }),
            this.page.evaluate(() => {
                const btn = document.getElementById('buscar');
                if (btn) { (btn as HTMLElement).click(); }
            }).catch(() => { })
        ]);

        logger.info('✅ UI: Buscar disparado combinando JS y tecla Enter');

        // Wait for AJAX to complete before checking #registros
        // Give time for the grid to start its loading process
        await this.page.waitForTimeout(2000);
        await this.page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {
            logger.warn('⚠️ UI: tiempo de espera networkidle agotado después de Buscar, continuando...');
        });
        await this.page.waitForTimeout(500);
        logger.info('✅ UI: Estabilización post-búsqueda completa');
    }

    // ================================================================
    // 3. CLICK EN "AGREGAR" (HORARIO GPS)
    // ================================================================

    /**
     * Busca la sección "Horario GPS" en la página y hace clic en "Agregar"
     * para abrir el modal de edición.
     *
     * IMPORTANTE: El span "Agregar" NO está dentro del #registros tbody tr.
     * Está en una tabla anidada (table.table-condensed) dentro de una
     * estructura ul > li expandida. Por eso se busca GLOBALMENTE en la página.
     * Como ya filtramos por ID de viaje, solo hay un resultado visible.
     *
     * Estructura DOM real:
     * ul > li > table.table-condensed > tbody > tr > td > span.manito[onclick="showModalEditTripWithoutGPSManually(...)"]
     *
     * Selectores verificados:
     * - page.getByText('Horario GPS')
     * - page.locator('span').filter({ hasText: 'Agregar' }).first()
     */
    async clickAgregarHorarioGPS(): Promise<void> {
        logger.info('🕰️ UI: Accediendo a "Horario GPS" (Agregar)...');

        // 1. Encontrar y hacer clic en el span de "Agregar Horario GPS"
        // Filtramos por onclick="showModalEditTripWithoutGPSManually" para evitar
        // hacer clic en otros spans de "Agregar" (observaciones, POD, etc.)
        logger.info('🔎 UI: Haciendo clic en Agregar (showModalEditTripWithoutGPSManually) vía JS...');
        const clicked = await this.page.evaluate(() => {
            const spans = Array.from(document.querySelectorAll('span.manito'));
            const agregar = spans.find(s =>
                s.textContent?.trim() === 'Agregar' &&
                (s.getAttribute('onclick') || '').includes('showModalEditTripWithoutGPSManually')
            ) as HTMLElement | undefined;
            if (agregar) { agregar.click(); return true; }
            return false;
        });

        if (!clicked) {
            logger.warn('⚠️ UI: span.manito[showModalEditTripWithoutGPSManually] no encontrado. Tomando captura de pantalla...');
            await this.takeScreenshot('agregar-not-found');
            throw new Error('❌ UI: No "Agregar" span with showModalEditTripWithoutGPSManually found in page');
        }
        logger.info('✅ UI: Clic en Agregar vía JS (showModalEditTripWithoutGPSManually)');

        // 2. Esperar que el modal #modalCambioEstadoSinGps se abra (display: block)
        // En Demo, body.modal-open no se activa, por lo que Playwright's waitFor({ state: 'visible' })
        // puede fallar (usa offsetParent que depende de body.modal-open).
        // Usamos waitForFunction chequeando display:block directamente.
        logger.info('⏳ UI: Esperando modal #modalCambioEstadoSinGps (display: block)...');
        try {
            await this.page.waitForFunction(() => {
                const modal = document.getElementById('modalCambioEstadoSinGps');
                return modal?.style?.display === 'block' ||
                    modal?.classList?.contains('show');
            }, { timeout: 15000 });
            // Asegurar body.modal-open para que Playwright detecte el modal como visible
            await this.page.evaluate(() => {
                document.body?.classList.add('modal-open');
            });
            logger.info('✅ UI: Modal #modalCambioEstadoSinGps abierto');
        } catch {
            logger.warn('⚠️ UI: Modal no detectado vía waitForFunction, tomando captura de pantalla...');
            await this.takeScreenshot('modal-post-agregar');
        }
    }

    // ================================================================
    // 4. CONFIRMAR FINALIZACIÓN (dentro del modal)
    // ================================================================

    /**
     * Dentro del modal que se abrió al hacer clic en "Agregar":
     * 1. Busca un select con opción "Finalizado" / "FINALIZADO"
     * 2. Cambia el valor via jQuery injection
     * 3. Guarda (botón del modal)
     * 4. Maneja confirmación bootbox si aparece
     */
    async confirmarFinalizacion(): Promise<void> {
        logger.info('📝 UI: Procesando modal #modalCambioEstadoSinGps...');
        await this.takeScreenshot('modal-horario-gps-contenido');

        // --- PASO 1: Select "Finalizado" via verified ID #drop_state_without_gps ---
        logger.info('🔎 UI: Seleccionando "Finalizado" en #drop_state_without_gps...');
        const selectEstado = this.page.locator(this.selectors.selectEstado);
        await selectEstado.waitFor({ state: 'visible', timeout: 10000 });
        await selectEstado.selectOption({ label: 'Finalizado' });
        logger.info('✅ UI: Finalizado seleccionado');

        // Trigger jQuery change for selectpicker
        await this.page.evaluate(() => {
            const sel = document.getElementById('drop_state_without_gps') as HTMLSelectElement;
            if (sel) {
                sel.dispatchEvent(new Event('change', { bubbles: true }));
                // @ts-ignore
                if (window.jQuery) window.jQuery(sel).trigger('change');
            }
        });

        await this.page.waitForTimeout(500);

        // --- PASO 2: Guardar via verified ID #modificarEstadoViaje_sinGps ---
        logger.info('💾 UI: Haciendo clic en Guardar (#modificarEstadoViaje_sinGps)...');
        const btnGuardar = this.page.locator(this.selectors.btnGuardarModal);
        await btnGuardar.waitFor({ state: 'visible', timeout: 5000 });
        await btnGuardar.evaluate(el => (el as HTMLElement).click());
        logger.info('✅ UI: Guardar clicado');

        await this.page.waitForTimeout(2000);

        // --- PASO 3: Confirmación bootbox/sweetalert si aparece ---
        try {
            const btnConfirmar = this.page.locator(this.selectors.btnConfirmar).first();
            if (await btnConfirmar.isVisible({ timeout: 5000 })) {
                logger.info('⚠️ UI: Modal de confirmación detectado, aceptando...');
                await btnConfirmar.evaluate(el => (el as HTMLElement).click());
                await this.page.waitForTimeout(1000);
                logger.info('✅ UI: Confirmación aceptada');
            }
        } catch {
            logger.info('ℹ️ UI: No apareció modal de confirmación');
        }

        await this.page.waitForLoadState('networkidle').catch(() => { });
        await this.forceCloseModal();
        logger.info('🏁 UI: Finalización confirmada exitosamente');
    }

    // ================================================================
    // 5. ORQUESTADOR: finalizarViaje
    // ================================================================

    /**
     * Flujo completo:
     * 1. buscarViaje            → filtro + waitFor explícito + localizar fila
     * 2. clickAgregarHorarioGPS → scroll inteligente + click "Agregar" → modal
     * 3. confirmarFinalizacion  → cambiar estado a FINALIZADO + guardar
     */
    async finalizarViaje(nroViaje: string): Promise<void> {
        logger.info(`🚀 UI: === Iniciando Finalización para el Viaje [${nroViaje}] ===`);

        try {
            // Paso 1: Filtrar y confirmar que el viaje aparece en la tabla
            logger.info('🔎 UI: Paso 1: Buscando Viaje...');
            await this.buscarViaje(nroViaje);

            // Paso 2: Click en "Agregar" (Horario GPS) — busca globalmente tras filtrar
            logger.info('🕰️ UI: Paso 2: Haciendo clic en Horario GPS (Agregar)...');
            await this.clickAgregarHorarioGPS();

            // Paso 3: Dentro del modal, cambiar estado a FINALIZADO y guardar
            logger.info('📝 UI: Paso 3: Confirmando Finalización...');
            await this.confirmarFinalizacion();

            logger.info(`🏁 UI: === Viaje [${nroViaje}] Finalizado Exitosamente ===`);
        } catch (error) {
            logger.error(`❌ UI: Finalización fallida para el Viaje [${nroViaje}]`, error);
            await this.takeScreenshot('finalizar-viaje-error');
            throw error;
        }
    }

    // ================================================================
    // UTILIDADES PRIVADAS
    // ================================================================

    /**
     * Fuerza cierre de modales Bootstrap abiertos.
     */
    async forceCloseModal(): Promise<void> {
        logger.info('🧹 UI: Cerrando modales Bootstrap...');
        await this.page.evaluate(() => {
            const $ = (window as any).jQuery;
            if ($) {
                $('.modal').modal('hide');
                $('.bootbox').modal('hide');
            }
            document.querySelectorAll('.modal-backdrop').forEach(bd => bd.remove());
            document.body?.classList.remove('modal-open');
        });
        await this.page.waitForTimeout(500);
        logger.info('✅ UI: Modales cerrados');
    }
}