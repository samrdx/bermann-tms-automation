import { BasePage } from '../../../core/BasePage.js';
import type { Page } from 'playwright';
import { createLogger } from '../../../utils/logger.js';
import type { UltimaMillaOrderData } from '../factories/UltimaMillaFactory.js';

const logger = createLogger('UltimaMillaFormPage');

/**
 * Page Object for Ultima Milla Order creation page
 * URL: /order/crear
 */
export class UltimaMillaFormPage extends BasePage {

    // 1. SELECTORS (Private)
    private readonly selectors = {
        // Inputs de texto directos
        codigoPedido: '#pedido-codigo',
        nombreCliente: '#pedido-nombre_cliente',
        correo: '#pedido-correo_cliente',
        telefono: '#pedido-telefono_cliente',
        fechaEntrega: '#pedido-fecha_entrega',

        // Dirección
        direccionBusqueda: '#text_direction_client',

        // Bootstrap Selects (Botones que abren el dropdown)
        tipoEmbalajeButton: 'button[data-id="pedido-tipo_embalaje_id"]',
        volumenButton: 'button[data-id="text_volumen"]',
        unidadNegocioButton: 'button[data-id="pedido-unidad_negocio_id"]',
        clienteButton: 'button[data-id="pedido-cliente_id"]',
        ventanaHorariaButton: 'button[data-id="pedido-ventana_horaria_id"]',
        tipoPedidoButton: 'button[data-id="pedido-tipo_pedido_id"]',

        // Dimensiones
        cantidad: '#pedido-cantidad',
        peso: '#pedido-peso',
        dimensionesContenedor: '#dimensiones-container', // To verify if needed for wait
        ancho: '#pedido-ancho',
        largo: '#pedido-largo',
        alto: '#pedido-alto',
        m3: '#pedido-metros_cubicos',

        // Acciones y validaciones
        btnGuardar: 'button.btn-success:has-text("Guardar")',
        invalidField: '[aria-invalid="true"], .has-error',
        errorMessage: '.help-block, .invalid-feedback',
        toastSuccess: '.toast-success'
    };

    // 2. CONSTRUCTOR
    constructor(page: Page) {
        super(page);
    }

    private buildClienteSelectionErrorMessage(environment: string | undefined, candidates: string[], availableOptions: string[], attempts: string[]): string {
        const resolvedEnvironment = (environment || process.env.ENV || 'UNKNOWN').trim().toUpperCase() || 'UNKNOWN';
        const attemptsSummary = attempts.length > 0 ? attempts.join(' | ') : 'sin intentos registrados';
        const availableSummary = availableOptions.length > 0 ? availableOptions.join(' | ') : 'sin opciones visibles/cargadas';

        return `No se pudo seleccionar cliente en Última Milla. ambiente=${resolvedEnvironment}; candidatos=[${candidates.join(' | ')}]; opcionesDisponibles=[${availableSummary}]; intentos=[${attemptsSummary}]`;
    }

    // 3. NAVIGATION
    async navigate(): Promise<void> {
        await this.page.goto('/order/crear');
        await this.page.waitForLoadState('domcontentloaded');
    }

    // 4. ACTION METHODS
    async fillCompleteForm(
        data: UltimaMillaOrderData,
        options?: {
            clienteDropdownCandidates?: string[];
            environment?: string;
        }
    ): Promise<void> {
        logger.info(`Llenando formulario de Pedido: ${data.codigoPedido}`);

        await this.fill(this.selectors.codigoPedido, data.codigoPedido);
        await this.fill(this.selectors.nombreCliente, data.nombreCliente);
        await this.fill(this.selectors.correo, data.correo);
        await this.fill(this.selectors.telefono, data.telefono);

        if (data.fechaEntrega) {
            await this.fill(this.selectors.fechaEntrega, data.fechaEntrega);
            await this.page.locator('h4:has-text("Pedido")').first().click();
            await this.page.keyboard.press('Escape'); // Cerrar el datepicker overlay
            await this.page.waitForTimeout(500);
        }

        await this.selectUnidadNegocio();
        if (options?.clienteDropdownCandidates && options.clienteDropdownCandidates.length > 0) {
            await this.selectClienteFromCandidates(options.clienteDropdownCandidates, {
                environment: options.environment
            });
        } else {
            await this.selectCliente(data.clienteDropdown);
        }
        await this.selectVentanaHoraria('Todo El Dia');

        // Seleccionar embalaje y llenar cantidad y peso revelados
        await this.selectTipoEmbalaje('Caja');
        await this.fill(this.selectors.cantidad, '1');
        await this.fill(this.selectors.peso, data.peso);

        // Luego de manejar el embalaje, asignamos el tipo de pedido
        await this.selectTipoPedido('Entrega');

        if (data.dimensiones) {
            await this.selectVolumen('Dimensiones');
            await this.fill(this.selectors.ancho, data.dimensiones.ancho);
            await this.fill(this.selectors.largo, data.dimensiones.largo);
            await this.fill(this.selectors.alto, data.dimensiones.alto);
            await this.page.keyboard.press('Tab');
            await this.page.waitForTimeout(500);
        }

        await this.fillDireccion(data.direccionBusqueda);
    }

    // --- Bootstrap Select Helpers ---

    async selectBootstrapDropdown(buttonSelector: string, textToSelect?: string): Promise<void> {
        // Extraemos data-id si existe para usar el JS fallback
        const dataIdMatch = buttonSelector.match(/data-id="([^"]+)"/);
        const dataId = dataIdMatch ? dataIdMatch[1] : null;

        try {
            await this.click(buttonSelector);
            await this.page.waitForTimeout(500); // Dar holgura a la animación BS

            // Si tenemos un texto específico, buscar en la caja de búsqueda del dropdown
            if (textToSelect) {
                const searchInput = this.page.locator("div.dropdown-menu.show input[aria-label='Search'], div.dropdown-menu.show .bs-searchbox input").first();
                if (await searchInput.isVisible({ timeout: 2000 }).catch(() => false)) {
                    await searchInput.fill(textToSelect);
                    await this.page.waitForTimeout(500); // Wait for filter
                }

                // Clickea la opción filtrada específica o cualquier `a` válido
                const option = this.page.locator('div.dropdown-menu.show li:not(.disabled) a').filter({ hasText: textToSelect }).first();
                await option.waitFor({ state: 'visible', timeout: 3000 });
                await option.click();
            } else {
                // Click primera opción válida
                await this.page.locator('div.dropdown-menu.show ul.dropdown-menu li:not(.disabled) a').first().click();
            }
            await this.page.waitForTimeout(500); // Esperar que cierre/aplique para evitar "Empty option" flag
        } catch (e) {
            logger.warn(`⚠️ selectBootstrapDropdown falló para "${buttonSelector}": ${e}. Usando JS Fallback...`);
            if (dataId && textToSelect) {
                const matchedOption = await this.page.evaluate(({ selectId, text }: { selectId: string; text: string }) => {
                    const select = document.getElementById(selectId) as HTMLSelectElement;
                    if (!select) return null;
                    const opt = Array.from(select.options)
                        .find(o => o.text.toUpperCase().includes(text.toUpperCase()));
                    if (opt) {
                        select.value = opt.value;
                        select.dispatchEvent(new Event('change', { bubbles: true }));
                        // @ts-ignore
                        if (window.jQuery && window.jQuery(select).selectpicker) {
                            // @ts-ignore
                            window.jQuery(select).selectpicker('refresh');
                        }
                        return opt.text;
                    }
                    return null;
                }, { selectId: dataId, text: textToSelect });

                if (!matchedOption) {
                    throw new Error(`No se encontró la opción "${textToSelect}" para el dropdown ${buttonSelector}`);
                }
            } else {
                throw new Error(`Select Helper Fallback failed: Couldn't extract dataId or no Text Provided. CSS: ${buttonSelector}`);
            }
            await this.page.waitForTimeout(500);
        }
    }

    async selectUnidadNegocio(): Promise<void> {
        logger.info('Seleccionando primera Unidad de Negocio disponible');
        await this.selectBootstrapDropdown(this.selectors.unidadNegocioButton);
    }

    async selectCliente(nombreCliente?: string): Promise<void> {
        logger.info(`Seleccionando Cliente: ${nombreCliente || 'El primero disponible'}`);
        await this.selectBootstrapDropdown(this.selectors.clienteButton, nombreCliente);
    }

    async selectClienteFromCandidates(
        candidates: string[],
        context?: {
            environment?: string;
        }
    ): Promise<string> {
        const normalizedCandidates = candidates
            .map(candidate => candidate?.trim())
            .filter((candidate): candidate is string => Boolean(candidate));

        if (normalizedCandidates.length === 0) {
            throw new Error(this.buildClienteSelectionErrorMessage(context?.environment, [], [], ['sin candidatos válidos']));
        }

        const attempts: string[] = [];

        for (const candidate of normalizedCandidates) {
            try {
                logger.info(`Intentando seleccionar cliente candidato: ${candidate}`);
                await this.selectCliente(candidate);
                logger.info(`✅ Cliente seleccionado con candidato: ${candidate}`);
                return candidate;
            } catch (error) {
                const reason = error instanceof Error ? error.message : String(error);
                attempts.push(`${candidate}: ${reason}`);
                logger.warn(`No se pudo seleccionar cliente con candidato "${candidate}". Intentando fallback si existe...`, error);
            }
        }

        const availableOptions = await this.page.evaluate((selectId: string) => {
            const select = document.getElementById(selectId) as HTMLSelectElement | null;
            if (!select) {
                return [] as string[];
            }

            return Array.from(select.options)
                .map(option => option.text.trim())
                .filter(option => option.length > 0)
                .slice(0, 20);
        }, 'pedido-cliente_id').catch(() => [] as string[]);

        throw new Error(this.buildClienteSelectionErrorMessage(context?.environment, normalizedCandidates, availableOptions, attempts));
    }

    async selectVentanaHoraria(ventana: string): Promise<void> {
        logger.info(`Seleccionando Ventana Horaria: ${ventana}`);
        await this.selectBootstrapDropdown(this.selectors.ventanaHorariaButton, ventana);
    }

    async selectTipoPedido(tipo: string): Promise<void> {
        logger.info(`Seleccionando Tipo Pedido: ${tipo}`);
        await this.selectBootstrapDropdown(this.selectors.tipoPedidoButton, tipo);
    }

    async selectTipoEmbalaje(tipo: string): Promise<void> {
        logger.info(`Seleccionando Tipo de Embalaje: ${tipo}`);
        await this.selectBootstrapDropdown(this.selectors.tipoEmbalajeButton, tipo);
    }

    async selectVolumen(tipo: string): Promise<void> {
        logger.info(`Seleccionando Tipo de Volumen: ${tipo}`);
        await this.selectBootstrapDropdown(this.selectors.volumenButton, tipo);
    }

    // --- Google Places Helper ---

    async fillFechaEntrega(fecha: string): Promise<void> {
        logger.info(`Validando completado: completando fecha de entrega: ${fecha}`);
        await this.fill(this.selectors.fechaEntrega, fecha);
        await this.page.locator('h4:has-text("Pedido")').first().click(); // Click out to trigger validation/blur
        await this.page.keyboard.press('Escape'); // Cerrar explícitamente el datepicker
        await this.page.waitForTimeout(500);
    }

    async fillDireccion(direccion: string): Promise<void> {
        logger.info(`Buscando dirección y georreferenciando: ${direccion}`);
        await this.fill(this.selectors.direccionBusqueda, direccion);
        // Clic en el botón buscar por indicación (lupa) para accionar la API directamente
        await this.page.locator('i.fas.fa-search-location').click();

        // Esperamos holgura de 2 segundos para que el mapa y los campos invisibles de lat/lng se actualicen via ajax
        await this.page.waitForTimeout(2000);
    }

    async fillDimensiones(ancho: string, largo: string, alto: string): Promise<void> {
        logger.info('Volviendo a completar dimensiones para activar el recálculo de m3 vía Javascript');

        // Esperar explícitamente a que JS y Bootstrap retiren el 'display: none' tras seleccionar Volumen->Dimensiones
        await this.page.waitForSelector(this.selectors.ancho, { state: 'visible', timeout: 5000 }).catch(() => {
            logger.warn('⚠️ `#pedido-ancho` no se hizo visible a tiempo. El clear() podría fallar.');
        });

        // Limpiar para forzar un cambio real de valor que dispare los eventos JS
        await this.page.locator(this.selectors.ancho).clear();
        await this.page.locator(this.selectors.largo).clear();
        await this.page.locator(this.selectors.alto).clear();

        await this.fill(this.selectors.ancho, ancho);
        await this.fill(this.selectors.largo, largo);
        await this.fill(this.selectors.alto, alto);

        // Despachar eventos explícitos por si el "fill" de Playwright no detona los listeners customizados de TMS
        await this.page.locator(this.selectors.ancho).dispatchEvent('change');
        await this.page.locator(this.selectors.largo).dispatchEvent('change');
        await this.page.locator(this.selectors.alto).dispatchEvent('change');
        await this.page.locator(this.selectors.alto).dispatchEvent('blur');

        // Click out (h4 "Pedido") en lugar de Tab, para evitar hacer foco accidental en FechaEntrega y abrir el datepicker
        await this.page.locator('h4:has-text("Pedido")').first().click();
        await this.page.waitForTimeout(500);
    }

    // --- Validation Helpers ---

    async getErrorMessages(): Promise<string[]> {
        await this.page.waitForSelector(this.selectors.errorMessage, { state: 'visible', timeout: 2000 }).catch(() => { });
        const messages = await this.page.locator(this.selectors.errorMessage).allTextContents();
        return messages.map(m => m.trim()).filter(m => m.length > 0);
    }

    async getMetrosCubicosValue(): Promise<string> {
        return this.page.locator(this.selectors.m3).inputValue();
    }

    async isCantidadVisible(): Promise<boolean> {
        try {
            // Wait up to 3000ms for the JS to re-show the field after a validation reload
            await this.page.waitForSelector(this.selectors.cantidad, { state: 'visible', timeout: 3000 });
            return true;
        } catch {
            return false;
        }
    }

    async clickGuardar(): Promise<void> {
        logger.info('Haciendo clic en el botón guardar');
        try {
            await this.click(this.selectors.btnGuardar);
        } catch (error) {
            logger.error('Fallo al guardar', error);
            await this.takeScreenshot('save-error');
            throw error;
        }
    }

    // 5. VERIFICATION METHODS
    async isFormSaved(): Promise<boolean> {
        try {
            const url = this.page.url();
            return url.includes('/order/crear');
        } catch {
            return false;
        }
    }
}
