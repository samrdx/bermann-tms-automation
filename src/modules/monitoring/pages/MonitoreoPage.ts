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
        modalVisible: '.modal.show, .modal.fade.show, .modal[style*="display: block"]',
        btnConfirmar: '.bootbox-accept, button:has-text("Aceptar"), button:has-text("Confirmar")',
    };

    constructor(page: Page) {
        super(page);
        this.monitoreoUrl = `${config.get().baseUrl}/viajes/monitoreo`;
    }

    // ================================================================
    // 1. NAVEGACIÓN
    // ================================================================

    async navegar(): Promise<void> {
        logger.info(`📍 UI: Navigating to: ${this.monitoreoUrl}`);
        await this.page.goto(this.monitoreoUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await this.page.waitForLoadState('networkidle');
        logger.info(`📍 UI: Current URL: ${this.page.url()}`);
        logger.info('✅ UI: Monitoreo page loaded');
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
        logger.info(`🔎 UI: Searching for Viaje [${nroViaje}]...`);

        try {
            // 1. Llenar filtro de ID del viaje
            logger.info('⏳ UI: Waiting for input #id...');
            const inputId = this.page.locator(this.selectors.filtroIdViaje);
            await inputId.waitFor({ state: 'visible', timeout: 10000 });
            logger.info('👁️ UI: Input #id visible');
            await inputId.clear();
            await inputId.fill(nroViaje);
            logger.info(`📝 UI: Filter ID filled with: "${nroViaje}"`);

            // 2. Click en "Buscar"
            logger.info('🔎 UI: Looking for "Buscar" link...');
            const btnBuscar = this.page.getByRole('link', { name: 'Buscar' });
            await btnBuscar.waitFor({ state: 'visible', timeout: 5000 });
            logger.info('👁️ UI: "Buscar" link visible, clicking...');
            await btnBuscar.click();
            logger.info('👆 UI: Clicked "Buscar"');

            // 3. ESPERA EXPLÍCITA: Esperar que el nroViaje aparezca dentro de #registros
            logger.info(`⏳ UI: Waiting for text "${nroViaje}" inside #registros...`);
            const textoViaje = this.page.locator(this.selectors.contenedor).getByText(nroViaje, { exact: true }).first();

            try {
                await textoViaje.waitFor({ state: 'visible', timeout: 30000 });
                logger.info(`✅ UI: Text "${nroViaje}" found inside #registros`);
            } catch {
                logger.warn(`⚠️ UI: Text "${nroViaje}" NOT found in 30s. Retrying...`);
                await this.takeScreenshot('buscar-viaje-primer-intento-fallido');

                await this.page.reload();
                await this.page.waitForLoadState('networkidle');
                logger.info('🔄 UI: Page reloaded, re-filtering...');

                await inputId.waitFor({ state: 'visible', timeout: 10000 });
                await inputId.clear();
                await inputId.fill(nroViaje);
                await btnBuscar.click();
                logger.info('🔄 UI: Re-filter executed, waiting for text...');

                await textoViaje.waitFor({ state: 'visible', timeout: 30000 });
                logger.info(`✅ UI: Text "${nroViaje}" found on retry`);
            }

            // 4. Scroll al texto del viaje
            logger.info('📜 UI: Scrolling to trip text...');
            // Re-localizamos justo antes de interactuar para evitar errores de "detached"
            // y agregamos un pequeño delay para estabilidad del grid
            await this.page.waitForTimeout(1000);

            try {
                const finalLocator = this.page.locator(this.selectors.contenedor).getByText(nroViaje, { exact: true }).first();
                await finalLocator.scrollIntoViewIfNeeded({ timeout: 5000 });
                await this.page.waitForTimeout(300);
                logger.info(`✅ UI: Viaje [${nroViaje}] confirmed & visible in #registros`);
            } catch (e: any) {
                logger.warn(`⚠️ UI: Scroll failed (${e.message}), re-trying one last time...`);
                await this.page.waitForTimeout(500);
                await this.page.locator(this.selectors.contenedor).getByText(nroViaje, { exact: true }).first().scrollIntoViewIfNeeded({ timeout: 1500 }).catch(() => { });
                logger.info(`✅ UI: Viaje [${nroViaje}] found after retry`);
            }

        } catch (error) {
            logger.error(`❌ UI: Error searching for Viaje [${nroViaje}]`, error);
            await this.takeScreenshot('buscar-viaje-error');
            throw error;
        }
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
        logger.info('🕰️ UI: Accessing "Horario GPS" (Agregar)...');

        // 1. Verificar que "Horario GPS" es visible en la página
        logger.info('🔎 UI: Looking for label "Horario GPS"...');
        const labelHorarioGPS = this.page.getByText('Horario GPS');
        try {
            await labelHorarioGPS.first().waitFor({ state: 'visible', timeout: 10000 });
            logger.info('✅ UI: Label "Horario GPS" found');
        } catch {
            logger.warn('⚠️ UI: Label "Horario GPS" not visible, continuing with "Agregar"...');
            await this.takeScreenshot('horario-gps-label-no-visible');
        }

        // 2. Buscar span "Agregar" globalmente (único tras filtrar por ID de viaje)
        logger.info('🔎 UI: Looking for span "Agregar"...');
        const spanAgregar = this.page.locator('span').filter({ hasText: 'Agregar' }).first();

        await spanAgregar.waitFor({ state: 'visible', timeout: 15000 });
        logger.info('✅ UI: Span "Agregar" found & visible');

        // 3. Scroll inteligente al span (puede requerir scroll horizontal/vertical)
        logger.info('📜 UI: Smart scroll to span "Agregar"...');
        await spanAgregar.scrollIntoViewIfNeeded({ timeout: 1500 }).catch(() => { });
        await this.page.waitForTimeout(300);
        logger.info('👁️ UI: "Agregar" visible after scroll');

        // 4. Click
        logger.info('👆 UI: Clicking "Agregar"...');
        await spanAgregar.click();
        logger.info('✅ UI: Clicked "Agregar"');

        // 5. Esperar que el modal se abra
        logger.info('⏳ UI: Waiting for modal to open...');
        const modal = this.page.locator(this.selectors.modalVisible).first();
        try {
            await modal.waitFor({ state: 'visible', timeout: 15000 });
            logger.info('✅ UI: Modal Horario GPS open');
        } catch {
            logger.warn('⚠️ UI: Modal not detected, taking screenshot...');
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
        logger.info('📝 UI: Processing Horario GPS Modal...');

        // Screenshot del modal para diagnóstico
        await this.takeScreenshot('modal-horario-gps-contenido');

        // --- PASO 1: Cambiar estado a FINALIZADO ---
        logger.info('🔎 UI: Searching select for FINALIZADO option...');
        const estadoResult = await this.page.evaluate(() => {
            const modal = document.querySelector('.modal.show')
                || document.querySelector('.modal.fade.show')
                || document.querySelector('.modal[style*="display: block"]');

            const scope = modal || document;
            const selects = Array.from(scope.querySelectorAll('select'));

            for (const select of selects) {
                const options = Array.from(select.options);
                const optFinalizado = options.find(opt =>
                    opt.text.toUpperCase().includes('FINALIZADO') ||
                    opt.value.toUpperCase().includes('FINALIZADO')
                );

                if (optFinalizado) {
                    const selectId = select.id || select.name || '(sin id)';
                    select.value = optFinalizado.value;
                    select.dispatchEvent(new Event('change', { bubbles: true }));

                    // @ts-ignore
                    if (window.jQuery) {
                        // @ts-ignore
                        const $sel = window.jQuery(select);
                        // @ts-ignore
                        $sel.trigger('change');
                        // @ts-ignore
                        if ($sel.selectpicker) $sel.selectpicker('refresh');
                        // @ts-ignore
                        if ($sel.data('select2')) $sel.select2('val', optFinalizado.value);
                    }

                    return { success: true, selectId, value: optFinalizado.value, text: optFinalizado.text };
                }
            }

            // Diagnóstico
            const selectInfo = selects.map(s => {
                const opts = Array.from(s.options).map(o => `"${o.text}"(${o.value})`).join(', ');
                return `#${s.id || s.name || 'sin-id'}: [${opts}]`;
            });
            const inputs = Array.from(scope.querySelectorAll('input, textarea'));
            const inputInfo = inputs.map(i => {
                const el = i as HTMLInputElement;
                return `${el.type}#${el.id || el.name || 'sin-id'}="${el.value}"`;
            });

            return {
                success: false,
                msg: `Selects: ${selectInfo.join(' | ') || 'NINGUNO'} | Inputs: ${inputInfo.join(' | ') || 'NINGUNO'}`,
            };
        });

        if (estadoResult.success) {
            logger.info(`✅ UI: State changed to "${estadoResult.text}" (value=${estadoResult.value}) in [${estadoResult.selectId}]`);
        } else {
            logger.error(`❌ UI: Option FINALIZADO not found: ${estadoResult.msg}`);
            await this.takeScreenshot('estado-finalizado-no-encontrado');
            throw new Error(`No se pudo cambiar estado a Finalizado: ${estadoResult.msg}`);
        }

        await this.page.waitForTimeout(1000);

        // --- PASO 2: Guardar ---
        logger.info('🔎 UI: Searching save button in modal...');

        const guardarSelectors = [
            '.modal.show .btn-primary',
            '.modal.show button:has-text("Guardar")',
            '.modal.show button:has-text("Aceptar")',
            '.modal.show button[type="submit"]',
            '.modal.fade.show .btn-primary',
            '#btn_guardar_form',
        ];

        let guardado = false;
        for (const sel of guardarSelectors) {
            const btn = this.page.locator(sel).first();
            if (await btn.isVisible({ timeout: 2000 }).catch(() => false)) {
                logger.info(`✅ UI: Save button found: ${sel}`);
                await btn.scrollIntoViewIfNeeded({ timeout: 1500 }).catch(() => { });
                await btn.click();
                logger.info(`💾 UI: Clicked Save`);
                guardado = true;
                break;
            }
        }

        if (!guardado) {
            logger.warn('⚠️ UI: Save button not found by locator, using JS...');
            await this.page.evaluate(() => {
                const modal = document.querySelector('.modal.show') || document.querySelector('.modal.fade.show');
                if (modal) {
                    const btn = modal.querySelector('.btn-primary') as HTMLElement
                        || modal.querySelector('button[type="submit"]') as HTMLElement;
                    if (btn) btn.click();
                }
            });
        }

        await this.page.waitForTimeout(2000);

        // --- PASO 3: Confirmación bootbox/sweetalert ---
        logger.info('🔎 UI: Checking confirmation modal...');
        try {
            const btnConfirmar = this.page.locator(this.selectors.btnConfirmar).first();
            if (await btnConfirmar.isVisible({ timeout: 5000 })) {
                logger.info('⚠️ UI: Confirmation modal detected, accepting...');
                await btnConfirmar.click();
                await this.page.waitForTimeout(1000);
                logger.info('✅ UI: Confirmation accepted');
            }
        } catch {
            logger.info('ℹ️ UI: No confirmation modal appeared');
        }

        await this.page.waitForLoadState('networkidle').catch(() => { });
        await this.forceCloseModal();

        logger.info('🏁 UI: Finalization confirmed successfully');
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
        logger.info(`🚀 UI: === Starting Finalization for Viaje [${nroViaje}] ===`);

        try {
            // Paso 1: Filtrar y confirmar que el viaje aparece en la tabla
            logger.info('🔎 UI: Step 1: Searching Viaje...');
            await this.buscarViaje(nroViaje);

            // Paso 2: Click en "Agregar" (Horario GPS) — busca globalmente tras filtrar
            logger.info('🕰️ UI: Step 2: Clicking Horario GPS (Agregar)...');
            await this.clickAgregarHorarioGPS();

            // Paso 3: Dentro del modal, cambiar estado a FINALIZADO y guardar
            logger.info('📝 UI: Step 3: Confirming Finalization...');
            await this.confirmarFinalizacion();

            logger.info(`🏁 UI: === Viaje [${nroViaje}] Finalized Successfully ===`);
        } catch (error) {
            logger.error(`❌ UI: Finalization failed for Viaje [${nroViaje}]`, error);
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
        logger.info('🧹 UI: Closing Bootstrap modals...');
        await this.page.evaluate(() => {
            const $ = (window as any).jQuery;
            if ($) {
                $('.modal').modal('hide');
                $('.bootbox').modal('hide');
            }
            document.querySelectorAll('.modal-backdrop').forEach(bd => bd.remove());
            document.body.classList.remove('modal-open');
        });
        await this.page.waitForTimeout(500);
        logger.info('✅ UI: Modals closed');
    }
}