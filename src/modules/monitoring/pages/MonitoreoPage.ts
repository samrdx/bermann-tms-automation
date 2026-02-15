import { Page } from '@playwright/test';
import { BasePage } from '../../../core/BasePage.js';
import { config } from '../../../config/environment.js';
import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('MonitoreoPage');

/**
 * Page Object para Monitoreo de Viajes (/viajes/monitoreo).
 *
 * Selectores verificados:
 *   - Filtro ID:         #id
 *   - Botón Buscar:      getByRole('link', { name: 'Buscar' })
 *   - Contenedor:        #registros > div.div_viajes_width > ul.list-group > li (NO usa <table>/<tr>)
 *   - Nro Viaje:         getByText(nroViaje, { exact: true })
 *   - Horario GPS label: getByText('Horario GPS')
 *   - Agregar:           span.manito con onclick="showModalEditTripWithoutGPSManually(...)"
 *   - Modal:             .modal.show / .modal.fade.show
 *
 * Flujo:
 *   buscarViaje(nroViaje)          → filtro #id + click "Buscar" → waitFor texto en #registros
 *   clickAgregarHorarioGPS()       → scroll a "Horario GPS" + click "Agregar" global → modal
 *   confirmarFinalizacion()        → cambiar estado a FINALIZADO + guardar
 *   finalizarViaje(nroViaje)       → orquesta todo
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
    logger.info(`[navegar] Navegando a: ${this.monitoreoUrl}`);
    await this.page.goto(this.monitoreoUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await this.page.waitForLoadState('networkidle');
    logger.info(`[navegar] URL actual: ${this.page.url()}`);
    logger.info('[navegar] Monitoreo cargado');
  }

  // ================================================================
  // 2. BUSCAR VIAJE EN TABLA #registros
  // ================================================================

  /**
   * Filtra por ID de viaje y confirma que aparece en #registros.
   *
   * Estructura DOM de #registros (NO es una tabla HTML):
   *   #registros > div.div_viajes_width > ul.list-group > li.list-group-item
   *   Cada li es una "columna". El nroViaje está en un <span> dentro de un li.
   *
   * Flujo:
   *   1. Llenar input #id con nroViaje
   *   2. Click en link "Buscar"
   *   3. Espera EXPLÍCITA: waitFor del texto nroViaje dentro de #registros
   *   4. Scroll al texto encontrado
   */
  async buscarViaje(nroViaje: string): Promise<void> {
    logger.info(`[buscarViaje] Iniciando búsqueda de viaje [${nroViaje}]...`);

    try {
      // 1. Llenar filtro de ID del viaje
      logger.info('[buscarViaje] Paso 1: Esperando input #id...');
      const inputId = this.page.locator(this.selectors.filtroIdViaje);
      await inputId.waitFor({ state: 'visible', timeout: 10000 });
      logger.info('[buscarViaje] Input #id visible');
      await inputId.clear();
      await inputId.fill(nroViaje);
      logger.info(`[buscarViaje] Filtro ID llenado con: "${nroViaje}"`);

      // 2. Click en "Buscar"
      logger.info('[buscarViaje] Paso 2: Buscando link "Buscar"...');
      const btnBuscar = this.page.getByRole('link', { name: 'Buscar' });
      await btnBuscar.waitFor({ state: 'visible', timeout: 5000 });
      logger.info('[buscarViaje] Link "Buscar" visible, haciendo click...');
      await btnBuscar.click();
      logger.info('[buscarViaje] Click en "Buscar" realizado');

      // 3. ESPERA EXPLÍCITA: Esperar que el nroViaje aparezca dentro de #registros
      logger.info(`[buscarViaje] Paso 3: Esperando texto "${nroViaje}" dentro de #registros...`);
      const textoViaje = this.page.locator(this.selectors.contenedor).getByText(nroViaje, { exact: true }).first();

      try {
        await textoViaje.waitFor({ state: 'visible', timeout: 30000 });
        logger.info(`[buscarViaje] Texto "${nroViaje}" encontrado dentro de #registros`);
      } catch {
        logger.warn(`[buscarViaje] Texto "${nroViaje}" NO apareció en 30s. Reintentando...`);
        await this.takeScreenshot('buscar-viaje-primer-intento-fallido');

        await this.page.reload();
        await this.page.waitForLoadState('networkidle');
        logger.info('[buscarViaje] Página recargada, re-filtrando...');

        await inputId.waitFor({ state: 'visible', timeout: 10000 });
        await inputId.clear();
        await inputId.fill(nroViaje);
        await btnBuscar.click();
        logger.info('[buscarViaje] Re-filtrado ejecutado, esperando texto...');

        await textoViaje.waitFor({ state: 'visible', timeout: 30000 });
        logger.info(`[buscarViaje] Texto "${nroViaje}" encontrado en segundo intento`);
      }

      // 4. Scroll al texto del viaje
      logger.info('[buscarViaje] Paso 4: Scroll al texto del viaje...');
      await textoViaje.scrollIntoViewIfNeeded();
      await this.page.waitForTimeout(300);
      logger.info(`[buscarViaje] Viaje [${nroViaje}] confirmado y visible en #registros`);

    } catch (error) {
      logger.error(`[buscarViaje] Error buscando viaje [${nroViaje}]`, error);
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
   *   ul > li > table.table-condensed > tbody > tr > td > span.manito[onclick="showModalEditTripWithoutGPSManually(...)"]
   *
   * Selectores verificados:
   *   - page.getByText('Horario GPS')
   *   - page.locator('span').filter({ hasText: 'Agregar' }).first()
   */
  async clickAgregarHorarioGPS(): Promise<void> {
    logger.info('[clickAgregarHorarioGPS] Iniciando...');

    // 1. Verificar que "Horario GPS" es visible en la página
    logger.info('[clickAgregarHorarioGPS] Paso 1: Buscando label "Horario GPS"...');
    const labelHorarioGPS = this.page.getByText('Horario GPS');
    try {
      await labelHorarioGPS.first().waitFor({ state: 'visible', timeout: 10000 });
      logger.info('[clickAgregarHorarioGPS] Label "Horario GPS" encontrado y visible');
    } catch {
      logger.warn('[clickAgregarHorarioGPS] Label "Horario GPS" no visible, continuando con Agregar...');
      await this.takeScreenshot('horario-gps-label-no-visible');
    }

    // 2. Buscar span "Agregar" globalmente (único tras filtrar por ID de viaje)
    logger.info('[clickAgregarHorarioGPS] Paso 2: Buscando span "Agregar"...');
    const spanAgregar = this.page.locator('span').filter({ hasText: 'Agregar' }).first();

    await spanAgregar.waitFor({ state: 'visible', timeout: 15000 });
    logger.info('[clickAgregarHorarioGPS] span "Agregar" encontrado y visible');

    // 3. Scroll inteligente al span (puede requerir scroll horizontal/vertical)
    logger.info('[clickAgregarHorarioGPS] Paso 3: Scroll inteligente al span "Agregar"...');
    await spanAgregar.scrollIntoViewIfNeeded();
    await this.page.waitForTimeout(300);
    logger.info('[clickAgregarHorarioGPS] "Agregar" visible tras scroll');

    // 4. Click
    logger.info('[clickAgregarHorarioGPS] Paso 4: Haciendo click en "Agregar"...');
    await spanAgregar.click();
    logger.info('[clickAgregarHorarioGPS] Click en "Agregar" realizado');

    // 5. Esperar que el modal se abra
    logger.info('[clickAgregarHorarioGPS] Paso 5: Esperando apertura del modal...');
    const modal = this.page.locator(this.selectors.modalVisible).first();
    try {
      await modal.waitFor({ state: 'visible', timeout: 15000 });
      logger.info('[clickAgregarHorarioGPS] Modal Horario GPS abierto');
    } catch {
      logger.warn('[clickAgregarHorarioGPS] Modal no detectado, tomando screenshot...');
      await this.takeScreenshot('modal-post-agregar');
    }
  }

  // ================================================================
  // 4. CONFIRMAR FINALIZACIÓN (dentro del modal)
  // ================================================================

  /**
   * Dentro del modal que se abrió al hacer clic en "Agregar":
   *   1. Busca un select con opción "Finalizado" / "FINALIZADO"
   *   2. Cambia el valor via jQuery injection
   *   3. Guarda (botón del modal)
   *   4. Maneja confirmación bootbox si aparece
   */
  async confirmarFinalizacion(): Promise<void> {
    logger.info('[confirmarFinalizacion] Procesando modal de Horario GPS...');

    // Screenshot del modal para diagnóstico
    await this.takeScreenshot('modal-horario-gps-contenido');

    // --- PASO 1: Cambiar estado a FINALIZADO ---
    logger.info('[confirmarFinalizacion] Paso 1: Buscando select con opción FINALIZADO...');
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
      logger.info(`[confirmarFinalizacion] Estado cambiado a "${estadoResult.text}" (value=${estadoResult.value}) en [${estadoResult.selectId}]`);
    } else {
      logger.error(`[confirmarFinalizacion] No se encontró opción FINALIZADO: ${estadoResult.msg}`);
      await this.takeScreenshot('estado-finalizado-no-encontrado');
      throw new Error(`No se pudo cambiar estado a Finalizado: ${estadoResult.msg}`);
    }

    await this.page.waitForTimeout(1000);

    // --- PASO 2: Guardar ---
    logger.info('[confirmarFinalizacion] Paso 2: Buscando botón guardar en el modal...');

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
        logger.info(`[confirmarFinalizacion] Botón guardar encontrado: ${sel}`);
        await btn.scrollIntoViewIfNeeded();
        await btn.click();
        logger.info(`[confirmarFinalizacion] Click en guardar realizado`);
        guardado = true;
        break;
      }
    }

    if (!guardado) {
      logger.warn('[confirmarFinalizacion] Botón guardar no encontrado por locator, usando JS...');
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
    logger.info('[confirmarFinalizacion] Paso 3: Verificando modal de confirmación...');
    try {
      const btnConfirmar = this.page.locator(this.selectors.btnConfirmar).first();
      if (await btnConfirmar.isVisible({ timeout: 5000 })) {
        logger.info('[confirmarFinalizacion] Modal de confirmación detectado, aceptando...');
        await btnConfirmar.click();
        await this.page.waitForTimeout(1000);
        logger.info('[confirmarFinalizacion] Confirmación aceptada');
      }
    } catch {
      logger.info('[confirmarFinalizacion] No apareció modal de confirmación');
    }

    await this.page.waitForLoadState('networkidle').catch(() => {});
    await this.forceCloseModal();

    logger.info('[confirmarFinalizacion] Finalización confirmada exitosamente');
  }

  // ================================================================
  // 5. ORQUESTADOR: finalizarViaje
  // ================================================================

  /**
   * Flujo completo:
   *   1. buscarViaje            → filtro + waitFor explícito + localizar fila
   *   2. clickAgregarHorarioGPS → scroll inteligente + click "Agregar" → modal
   *   3. confirmarFinalizacion  → cambiar estado a FINALIZADO + guardar
   */
  async finalizarViaje(nroViaje: string): Promise<void> {
    logger.info(`[finalizarViaje] === Iniciando finalización de viaje [${nroViaje}] ===`);

    try {
      // Paso 1: Filtrar y confirmar que el viaje aparece en la tabla
      logger.info('[finalizarViaje] Paso 1: buscarViaje...');
      await this.buscarViaje(nroViaje);

      // Paso 2: Click en "Agregar" (Horario GPS) — busca globalmente tras filtrar
      logger.info('[finalizarViaje] Paso 2: clickAgregarHorarioGPS...');
      await this.clickAgregarHorarioGPS();

      // Paso 3: Dentro del modal, cambiar estado a FINALIZADO y guardar
      logger.info('[finalizarViaje] Paso 3: confirmarFinalizacion...');
      await this.confirmarFinalizacion();

      logger.info(`[finalizarViaje] === Viaje [${nroViaje}] finalizado exitosamente ===`);
    } catch (error) {
      logger.error(`[finalizarViaje] Falló finalización de viaje [${nroViaje}]`, error);
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
    logger.info('[forceCloseModal] Cerrando modales Bootstrap...');
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
    logger.info('[forceCloseModal] Modales cerrados');
  }
}
