import { test, expect } from '../../../../../src/fixtures/base.js';
import { MonitoreoPage } from '../../../../../src/modules/monitoring/pages/MonitoreoPage.js';
import { AsignarPage } from '../../../../../src/modules/planning/pages/AsignarPage.js';
import { TmsApiClient } from '../../../../api-helpers/TmsApiClient.js';
import { createLogger } from '../../../../../src/utils/logger.js';
import { generateValidChileanRUT } from '../../../../../src/utils/rutGenerator.js';

const logger = createLogger('ViajesFinalizarTest');

test.describe('Operaciones - Monitoreo - Finalizar Viaje', () => {
  test.setTimeout(420000); // 7 min para creación de datos + test

  test('Debería buscar y finalizar un viaje asignado en Monitoreo', async ({ page }) => {
    const startTime = Date.now();
    logger.info('='.repeat(80));
    logger.info('TEST: Buscar y Finalizar Viaje en Monitoreo');
    logger.info('='.repeat(80));

    // ============================================================
    // FASE 1: PREPARACIÓN DE DATOS (TmsApiClient)
    // ============================================================
    logger.info('FASE 1: Creando ecosistema de datos de prueba...');

    const api = new TmsApiClient(page);
    await api.initialize();

    // Nombres únicos por timestamp para evitar colisiones
    const timestamp = Date.now() % 1000000;
    const transName = `TransMon ${timestamp}`;
    const cliName = `CliMon ${timestamp}`;
    const nroViaje = String(Math.floor(10000 + Math.random() * 90000));

    logger.info(`Datos: Transportista=[${transName}] Cliente=[${cliName}] Viaje=[${nroViaje}]`);

    // 1.1 Entidades base
    await api.createTransportista(transName, generateValidChileanRUT());
    await api.createCliente(cliName);
    const patente = await api.createVehiculo(transName);
    const conductor = await api.createConductor(transName);
    logger.info(`Entidades creadas: Vehiculo=[${patente}] Conductor=[${conductor}]`);

    // 1.2 Contratos (requeridos para crear viajes)
    await api.createContratoVenta(cliName);
    await api.createContratoCosto(transName);
    logger.info('Contratos creados (Venta + Costo)');

    // ── FIX ERROR 1: Estabilización de red entre contratos y viaje ──
    // El backend puede estar aún procesando. Si navegamos inmediatamente,
    // el navegador aborta con net::ERR_ABORTED
    logger.info('Estabilizando navegador antes de crear viaje...');
    await page.waitForLoadState('domcontentloaded').catch(() => {});
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {
      logger.warn('networkidle timeout post-contrato, continuando...');
    });
    await page.waitForTimeout(2000); // Safety buffer for backend processing

    // 1.2.1 Limpiar modales/alertas residuales de creación de contratos
    logger.info('Limpiando modales residuales post-contratos...');
    await page.evaluate(() => {
      const $ = (window as any).jQuery;
      if ($) {
        $('.modal').modal('hide');
        $('.bootbox').modal('hide');
      }
      document.querySelectorAll('.modal-backdrop').forEach(bd => bd.remove());
      document.body.classList.remove('modal-open');
    });
    await page.waitForTimeout(1000);

    // 1.3 Planificar Viaje
    await api.createViaje(cliName, nroViaje);
    logger.info(`Viaje [${nroViaje}] planificado`);

    // ============================================================
    // FASE 1.4: ASIGNAR VIAJE (Patrón probado de viajes-asignar.test.ts)
    // ============================================================
    logger.info(`FASE 1.4: Asignando viaje [${nroViaje}] con Bootstrap Select...`);

    // 1.4.1 Navegar a Asignar y abrir la fila del viaje
    const asignarPage = new AsignarPage(page);
    await asignarPage.navigate();
    await asignarPage.selectViajeRow(nroViaje);

    // 1.4.2 Seleccionar Transportista (escritura lenta + verificación)
    await selectTransportistaRobust(page, transName);

    // 1.4.3 Esperar cascada AJAX (carga de vehículos/conductores)
    logger.info('Esperando cascada AJAX (carga de vehículos/conductores)...');
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {
      logger.warn('networkidle timeout en cascada, continuando...');
    });
    await page.waitForTimeout(500);

    // 1.4.4 Seleccionar Vehículo
    logger.info(`Seleccionando Vehículo: ${patente}`);
    await selectBootstrapDropdownByDataId(page, 'viajes-vehiculo_uno_id', patente);

    // 1.4.5 Seleccionar Conductor
    logger.info(`Seleccionando Conductor: ${conductor}`);
    await selectBootstrapDropdownByDataId(page, 'viajes-conductor_id', conductor);

    // 1.4.6 Verificación final del transportista (puede resetearse tras selección de vehículo/conductor)
    logger.info('Verificación final del Transportista antes de guardar...');
    const finalCheck = await page.evaluate((expectedName: string) => {
      const select = document.querySelector('select[id*="transportista"]') as HTMLSelectElement;
      if (!select) return { correct: false, current: 'SELECT NOT FOUND' };
      const selectedOption = select.options[select.selectedIndex];
      const currentText = selectedOption?.text || '';
      const isCorrect = currentText.toUpperCase().includes(expectedName.toUpperCase());
      return { correct: isCorrect, current: currentText, value: select.value };
    }, transName);

    if (!finalCheck.correct) {
      logger.warn(`TRANSPORTISTA RESET DETECTADO! Actual: "${finalCheck.current}", Esperado: "${transName}"`);
      logger.info('Aplicando fix silencioso (sin eventos para evitar cascada)...');

      await page.evaluate((targetName: string) => {
        const select = document.querySelector('select[id*="transportista"]') as HTMLSelectElement;
        if (!select) return;
        const options = Array.from(select.options);
        const match = options.find(opt => opt.text.toUpperCase().includes(targetName.toUpperCase()));
        if (match) {
          select.value = match.value;
          // @ts-ignore
          if (window.jQuery) {
            // @ts-ignore
            const $sel = window.jQuery(select);
            // @ts-ignore
            if ($sel.selectpicker) $sel.selectpicker('val', match.value);
            // @ts-ignore
            if ($sel.data('select2')) $sel.select2('val', match.value, false);
          }
        }
      }, transName);

      const recheck = await page.evaluate(() => {
        const select = document.querySelector('select[id*="transportista"]') as HTMLSelectElement;
        return select?.options[select.selectedIndex]?.text || 'UNKNOWN';
      });
      logger.info(`Transportista corregido a: "${recheck}"`);
    } else {
      logger.info(`Transportista confirmado: "${finalCheck.current}"`);
    }

    await page.waitForTimeout(300);

    // 1.4.7 Guardar asignación
    logger.info('Guardando asignación...');
    await page.click('#btn_guardar_form');

    // 1.4.8 Manejar modal de confirmación (bootbox / sweetalert)
    try {
      const btnConfirmar = page.locator('.bootbox-accept, button:has-text("Aceptar"), button:has-text("Confirmar")').first();
      if (await btnConfirmar.isVisible({ timeout: 5000 })) {
        logger.info('Modal de confirmación detectado. Aceptando...');
        await btnConfirmar.click();
      }
    } catch {
      logger.info('No apareció modal de confirmación.');
    }

    // 1.4.9 Validar que NO aparezca error de "Sin Contrato"
    const errorContrato = page.locator('text="Transportista sin contrato"');
    if (await errorContrato.isVisible({ timeout: 2000 }).catch(() => false)) {
      throw new Error(`ERROR: El sistema indica 'Transportista sin contrato'. Verifica que se seleccionó a ${transName}.`);
    }

    await page.waitForLoadState('networkidle');

    // ── FIX: Verificación por búsqueda en grid de /viajes/asignar ──
    logger.info('Verificando asignación: esperando redirect a /viajes/asignar...');
    await verifyAssignmentInGrid(page, logger, nroViaje);
    logger.info(`Viaje [${nroViaje}] asignado exitosamente a [${transName}]`);

    // 1.4.11 Limpiar modales residuales post-asignación
    await page.evaluate(() => {
      const $ = (window as any).jQuery;
      if ($) {
        $('.modal').modal('hide');
        $('.bootbox').modal('hide');
      }
      document.querySelectorAll('.modal-backdrop').forEach(bd => bd.remove());
      document.body.classList.remove('modal-open');
    });
    await page.waitForTimeout(500);

    logger.info('FASE 1 COMPLETA: Precondiciones listas');

    // ============================================================
    // FASE 2: NAVEGAR A MONITOREO
    // ============================================================
    logger.info('FASE 2: Navegando a Monitoreo...');

    const monitoreo = new MonitoreoPage(page);
    await monitoreo.navegar();

    logger.info('FASE 2 COMPLETA: Página de Monitoreo cargada');

    // ============================================================
    // FASE 3: BUSCAR + EDITAR + FINALIZAR VIAJE
    // ============================================================
    // finalizarViaje() orquesta todo: buscar fila → scroll → click lápiz → cambiar estado → guardar
    logger.info('FASE 3: Buscando viaje y finalizando...');

    await monitoreo.finalizarViaje(nroViaje);

    logger.info('FASE 3 COMPLETA: Viaje finalizado');

    // ============================================================
    // RESUMEN
    // ============================================================
    const tiempoEjecucion = ((Date.now() - startTime) / 1000).toFixed(2);
    logger.info('='.repeat(80));
    logger.info(`TEST OK: Viaje [${nroViaje}] buscado y finalizado en Monitoreo`);
    logger.info(`Tiempo de ejecución: ${tiempoEjecucion}s`);
    logger.info('='.repeat(80));
  });
});

// ============================================================
// HELPERS DE ASIGNACIÓN (replicados de viajes-asignar.test.ts)
// ============================================================

/**
 * Selección robusta de Transportista:
 * Escribe lento en el searchbox del Bootstrap Select, espera filtrado,
 * selecciona visualmente y verifica el resultado.
 */
async function selectTransportistaRobust(page: any, nombre: string): Promise<void> {
  logger.info(`Selección robusta Transportista: "${nombre}"`);

  const btnDropdown = page.locator('button[data-id="viajes-transportista_id"]');
  await btnDropdown.click();

  // Escribir lento para dar tiempo al filtro JS
  const searchBox = page.locator('.bs-searchbox input').filter({ visible: true }).first();
  await searchBox.click();
  await searchBox.pressSequentially(nombre, { delay: 100 });

  // Esperar a que aparezca la opción filtrada
  const opcionFiltrada = page.locator('.dropdown-menu.show li a').filter({ hasText: nombre }).first();
  await opcionFiltrada.waitFor({ state: 'visible', timeout: 5000 });

  await page.waitForTimeout(500); // Estabilizar animación
  await opcionFiltrada.click();

  // Verificar que el botón refleja la selección
  await page.waitForTimeout(1000);
  const textoBoton = await btnDropdown.textContent();

  if (!textoBoton?.includes(nombre)) {
    logger.error(`Mismatch! Esperado: "${nombre}", Obtenido: "${textoBoton}". Reintentando con JS...`);
    await selectOptionByTextJS(page, nombre);
  } else {
    logger.info(`Transportista verificado: ${textoBoton?.trim()}`);
  }
}

/**
 * Helper para Bootstrap Select usando data-id específico.
 * Abre dropdown, filtra con searchbar, selecciona opción.
 */
async function selectBootstrapDropdownByDataId(page: any, dataId: string, textToSelect: string): Promise<void> {
  try {
    // 1. Abrir dropdown
    const dropdownBtn = page.locator(`button[data-id="${dataId}"]`);
    await dropdownBtn.click();
    await page.waitForTimeout(300);

    // 2. Buscar con searchbar
    const searchInput = page.locator("div.dropdown-menu.show input[aria-label='Search'], div.dropdown-menu.show .bs-searchbox input").first();
    if (await searchInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await searchInput.fill(textToSelect);
      await page.waitForTimeout(500);
    }

    // 3. Seleccionar opción
    const option = page.locator('div.dropdown-menu.show li a span, div.dropdown-menu.show li a').filter({ hasText: textToSelect }).first();
    await option.waitFor({ state: 'visible', timeout: 5000 });
    await option.click();

    logger.info(`Bootstrap dropdown [${dataId}] -> "${textToSelect}"`);
  } catch (e) {
    logger.warn(`selectBootstrapDropdownByDataId falló para "${dataId}": ${e}`);

    // Fallback: JS injection en el select subyacente
    await page.evaluate(({ selectId, text }: { selectId: string; text: string }) => {
      const select = document.getElementById(selectId) as HTMLSelectElement;
      if (!select) return;
      const option = Array.from(select.options).find(opt =>
        opt.text.toUpperCase().includes(text.toUpperCase())
      );
      if (option) {
        select.value = option.value;
        // @ts-ignore
        if (window.jQuery && window.jQuery(select).selectpicker) {
          // @ts-ignore
          window.jQuery(select).selectpicker('refresh');
        }
      }
    }, { selectId: dataId, text: textToSelect });
  }
}

/**
 * Inyección JS para selects difíciles - dispara evento change.
 */
async function selectOptionByTextJS(page: any, text: string): Promise<boolean> {
  return await page.evaluate((searchText: string) => {
    const selects = Array.from(document.querySelectorAll('select'));
    for (const select of selects) {
      const option = Array.from(select.options).find(opt =>
        opt.text.toUpperCase().includes(searchText.toUpperCase())
      );
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
  }, text);
}

/**
 * Verificación determinista: espera redirect a /viajes/asignar,
 * busca el nroViaje en el filtro #search, y verifica que exista en el grid.
 */
async function verifyAssignmentInGrid(page: any, log: any, nroViaje: string): Promise<void> {
  // 1. Esperar a que la página redirija a /viajes/asignar
  await page.waitForURL('**/viajes/asignar**', { timeout: 20000 });
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {
    log.warn('networkidle timeout post-redirect, continuando...');
  });
  log.info(`Redirected to: ${page.url()}`);

  // 2. Buscar el viaje en el filtro de búsqueda
  const searchInput = page.locator('#search');
  await searchInput.waitFor({ state: 'visible', timeout: 10000 });
  await searchInput.fill(nroViaje);
  await searchInput.press('Enter');
  log.info(`Searching for trip: ${nroViaje}`);

  // 3. Esperar a que el grid se actualice
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(1500);

  // 4. Verificar que el viaje aparece en el grid
  const viajeRow = page.locator(`text="${nroViaje}"`).first();
  const isVisible = await viajeRow.isVisible({ timeout: 10000 }).catch(() => false);

  if (!isVisible) {
    const visibleErrors = await page.locator('.alert-danger, .toast-error')
      .allTextContents()
      .catch(() => [] as string[]);
    const errorMsg = visibleErrors.filter((e: string) => e.trim().length > 0).join(' | ');
    throw new Error(`Viaje [${nroViaje}] no encontrado en grid de /viajes/asignar. Errores: ${errorMsg || 'none'}`);
  }

  log.info(`Viaje [${nroViaje}] encontrado en el grid de asignación`);
}
