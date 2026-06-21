import { BasePage } from "../../../core/BasePage.js";
import type { Page } from "playwright";
import { expect } from "@playwright/test";
import { createLogger } from "../../../utils/logger.js";

const logger = createLogger("PlanificarViajesPage");

export interface TramoInput {
	origen: string;
	destino: string;
	fechaEntradaOrigen?: string; // DD/MM/AAAA
	kgOrigen?: string;
	kgDestino?: string;
	transportista?: string;
}

export interface TramoExpectedCard {
	origen: string;
	destino: string;
	kg?: string;
	transportista?: string;
}

export class PlanificarPage extends BasePage {
	private readonly selectors = {
		// Inputs Simples
		nroViaje: "#viajes-nro_viaje",
		numeroPlanilla: "#viajes-numero_planilla",
		valorFlete: "#viajes-valor_flete",
		kgViaje: "#viajes-kg",

		// Botones de Dropdowns (Bootstrap Select) - Usamos data-id
		// NOTA: Ambos ambientes (QA y Demo) usan los mismos selectores tipo_operacion_form y viajes-carga_id
		btnTipoOperacion: 'button[data-id="tipo_operacion_form"]',
		btnTipoServicio: 'button[data-id="viajes-tipo_servicio_id"]',
		btnTipoViaje: 'button[data-id="viajes-tipo_viaje_id"]',
		btnUnidadNegocio: 'button[data-id="viajes-unidad_negocio_id"]',
		btnCodigoCarga: 'button[data-id="viajes-carga_id"]',
		btnCliente: 'button[data-id="viajes-cliente_id"]',

		// Ruta
		btnAgregarRuta: 'button:has-text("Agregar Ruta")',
		modalRutas: "#modalRutasSugeridas",
		tablaRutas: "#tabla-rutas tbody tr",

		// Origen/Destino
		btnOrigen: 'button[data-id="_origendestinoform-origen"]',
		btnDestino: 'button[data-id="_origendestinoform-destino"]',

		// Modal Tramos
		btnAbrirModalTramo: 'button:has-text("Agregar Tramo")',
		modalTramoBody: "div.modal-body",
		modalTramoTipoOperacion: 'button[data-id="drop_operation_type_section"]',
		modalTramoTipoServicio: 'button[data-id="drop_service_type_section"]',
		modalTramoTipoViaje: 'button[data-id="drop_type_trip_section"]',
		modalTramoUnidadNegocio: 'button[data-id="drop_business_unit_section"]',
		modalTramoCodigoCarga: 'button[data-id="drop_chargues_section"]',
		modalTramoOrigen: 'button[data-id="drop_origin_zone_section"]',
		modalTramoDestino: 'button[data-id="drop_destination_zone_section"]',
		modalTramoFechaEntradaOrigen: "#entryDateOrigin",
		modalTramoKgGeneral: "#txt_kg_section",
		modalTramoKgOrigen: "#txt_kg_origen_section",
		modalTramoKgDestino: "#txt_kg_destination_section",
		btnModalTramoGuardar: 'div.modal-footer button:has-text("Crear viaje")', // Alternativa: div.modal-footer button:nth-child(2)

		// Modal de advertencia previo a tramos
		btnModalTramoWarningAceptar: 'button:has-text("Aceptar")',
		btnModalTramoWarningCancelar: "button.btn.btn-secondary:visible",
		btnModalTramoWarningCancelarAlt: 'button:has-text("Cancelar")',

		// Tramos Table/Cards (A ser validado visualmente)
		tramosListItems: ".card-body", // Placeholder para la section donde se renderizan las cards

		// Acciones
		btnGuardar: "#btn_guardar_form",
		spinner: "#modalCargando",
		multiplicadorRegistro: "#factor_multiplicador",
	};

	constructor(page: Page) {
		super(page);
	}

	async navigate(): Promise<void> {
		logger.info("Navegando a la página de Planificar Viajes");
		await this.page.goto("/viajes/crear");
		await this.page.waitForLoadState("domcontentloaded");
		await this.page.waitForTimeout(1500); // Allow BS to initialize
	}

	async planificarViaje(
		nroViaje: string,
		operation: string,
		service: string,
		cliente: string,
	): Promise<void> {
		logger.info(`Iniciando Paso 6.4: Planificar Viaje (Flujo Robusto)`);
		logger.info("=".repeat(80));

		await this.navigate();
		await this.fillNroViaje(nroViaje);

		// Paso 2: Select Operation
		await this.selectTipoOperacion(operation);
		await this.waitForLoading(20000);
		await this.page.waitForTimeout(1500);

		// Paso 3: Select Service
		await this.selectTipoServicio(service);
		await this.waitForLoading(20000);
		await this.page.waitForTimeout(1500);

		// Paso 4: Select Cliente
		await this.selectCliente(cliente);
		await this.waitForLoading(20000);

		await this.click(this.selectors.btnGuardar);
	}

	async fillNroViaje(nro?: string): Promise<void> {
		const nroViaje = nro || String(Math.floor(10000 + Math.random() * 90000));
		logger.info(`Completando Nro Viaje: ${nroViaje}`);
		await this.fill(this.selectors.nroViaje, nroViaje);
	}

	async setMultiplicador(n: number): Promise<void> {
		logger.info(`Configurando Multiplicador de registro: ${n}`);
		const input = this.page.locator(this.selectors.multiplicadorRegistro);
		await input.waitFor({ state: "visible", timeout: 5000 });
		await input.fill(String(n));
		await input.dispatchEvent("change");
		await input.blur();
		const currentValue = await input.inputValue();
		expect(Number(currentValue)).toBe(n);
	}

	private async waitForLoading(timeout: number = 20000): Promise<void> {
		const spinner = this.page.locator(this.selectors.spinner);
		try {
			// Small buffer to let spinner appear
			await this.page.waitForTimeout(500);
			if (await spinner.isVisible()) {
				logger.debug("Esperando a que el modal de carga desaparezca...");
				await spinner.waitFor({ state: "hidden", timeout });
				logger.debug("El modal de carga desapareció");
				await this.page.waitForTimeout(500); // Settle time
			}
		} catch (e) {
			logger.warn(
				"Tiempo de espera agotado esperando el modal de carga - continuando de todas formas",
			);
		}
	}

	/**
	 * Private helper to handle persistent modal backdrops that prevent interaction.
	 */
	private async handleModalBackdrop(): Promise<void> {
		const backdrop = this.page.locator(".modal-backdrop");
		if (await backdrop.isVisible().catch(() => false)) {
			logger.info(
				"🛡️ Fondo de modal detectado, eliminándolo forzosamente para desbloquear la UI...",
			);
			await this.page.evaluate(() => {
				document
					.querySelectorAll(".modal-backdrop")
					.forEach((el) => el.remove());
				document.body?.classList.remove("modal-open");
				if (document.body) document.body.style.paddingRight = "";
			});
			await this.page.waitForTimeout(500); // Settle time
		}
	}

	/**
	 * Private helper for Bootstrap Select dropdowns (Hybrid Pattern)
	 */
	private async selectBootstrapDropdown(
		btnSelector: string,
		optionText: string,
		fieldName: string = "Dropdown",
		options: { useSearch?: boolean; pickFirst?: boolean; timeout?: number } = {},
	): Promise<void> {
		const { useSearch = true, pickFirst = false, timeout = 10000 } = options;
		logger.info(`Seleccionando ${fieldName}: [${optionText}] (useSearch=${useSearch}, pickFirst=${pickFirst})`);

		try {
			await this.waitForLoading();

			const visibleSelector = btnSelector.includes(":visible")
				? btnSelector
				: `${btnSelector}:visible`;
			const button = this.page.locator(visibleSelector).first();
			
			// Ensure it's attached and scroll into view
			await button.waitFor({ state: "attached", timeout: 5000 });
			await button.evaluate((node: HTMLElement) => node.scrollIntoView({ block: "center" })).catch(() => {});
			await button.waitFor({ state: "visible", timeout: 5000 });

			// Ensure no backdrop is blocking the dropdown click
			await this.handleModalBackdrop();

			// 1. Open dropdown safely (check if already open)
			await this.page.evaluate((sel) => {
				const cleanSel = sel.replace(":visible", "");
				const btn = document.querySelector(cleanSel) as HTMLElement;
				if (!btn) return;
				const container = btn.closest(".bootstrap-select");
				if (container && !container.classList.contains("show")) {
					btn.click();
				}
			}, visibleSelector);

			// 2. Locate the container and ITS menu
			const container = this.page
				.locator("div.bootstrap-select")
				.filter({ has: button })
				.first();
			const menu = container.locator("div.dropdown-menu.show");
			const list = menu.locator("ul.dropdown-menu");

			// WAIT for options to load (critical for AJAX-driven dropdowns like Carga)
			logger.debug(`Esperando opciones en ${fieldName}...`);
			await this.page.waitForFunction((sel) => {
				const btn = document.querySelector(sel.replace(":visible", "")) as HTMLElement;
				const cont = btn?.closest(".bootstrap-select");
				const select = cont?.querySelector("select") as HTMLSelectElement;
				// Wait for at least one option that is not empty/placeholder
				return select && Array.from(select.options).some(o => o.value && o.value !== "0" && o.value !== "");
			}, visibleSelector, { timeout: 8000 }).catch(() => {
				logger.warn(`⚠️ Timeout esperando opciones nativas en ${fieldName}. Continuando con lo que haya.`);
			});

			const searchInput = menu.locator("div.bs-searchbox input");

			// 3. Search if enabled
			if (useSearch && await searchInput.isVisible({ timeout: 1500 }).catch(() => false)) {
				logger.debug(`Buscando "${optionText}" en ${fieldName}`);
				await searchInput.clear();
				await searchInput.fill(optionText);
				await this.page.waitForTimeout(1000); // Wait for filter
			}

			// 4. Locate and click option
			let option;
			if (pickFirst) {
				// Pick first visible item that is not a header or divider or "No results"
				option = menu.locator("ul.dropdown-menu li a:not(.dropdown-header):not(.divider)").filter({ hasNotText: "No results" }).first();
			} else {
				option = menu.locator("ul.dropdown-menu li a")
					.filter({ hasText: optionText })
					.first();
			}

			try {
				await option.waitFor({ state: "visible", timeout });
				await option.evaluate((node: HTMLElement) => node.scrollIntoView({ block: "center" })).catch(() => {});
				await option.evaluate((node: HTMLElement) => node.click());
			} catch (err) {
				// Log available options for debugging before failing
				const availableOptions = await menu.locator("ul.dropdown-menu li a").allTextContents();
				logger.error(`❌ No se encontró la opción [${optionText}] en [${fieldName}]. Opciones disponibles: ${availableOptions.map(o => o.trim()).filter(o => o).join(" | ")}`);
				throw err;
			}

			// 5. Verification & Force Sync
			await this.page.waitForTimeout(500);
			
			// ALWAYS force sync the underlying <select> to prevent validation errors
			await button.evaluate((btn: HTMLElement, text: string) => {
				const cleanText = text.trim().toLowerCase();
				const container = btn.closest(".bootstrap-select");
				const select = container?.querySelector("select") as HTMLSelectElement;
				if (!select) return;
				
				const options = Array.from(select.options);
				let target = options.find((o) => o.text.trim() === text);
				if (!target) {
					target = options.find((o) => o.text.trim().toLowerCase().includes(cleanText));
				}

				if (target) {
					select.value = target.value;
					select.dispatchEvent(new Event("change", { bubbles: true }));
					// @ts-ignore
					if (window.jQuery && window.jQuery(select).selectpicker) {
						// @ts-ignore
						window.jQuery(select).selectpicker("val", target.value);
						// @ts-ignore
						window.jQuery(select).selectpicker("refresh");
					}
				}
			}, optionText);

			logger.info(`✅ ${fieldName} seleccionado correctamente`);
		} catch (error) {
			logger.error(`Fallo crítico al seleccionar en dropdown [${fieldName}]: ${optionText}`, error);
			await this.takeScreenshot(`fail-${fieldName}`);
			throw error;
		}
	}

	async selectTipoOperacion(tipo: string): Promise<void> {
		try {
			await this.selectBootstrapDropdown(
				this.selectors.btnTipoOperacion,
				tipo,
				"Tipo Operacion",
				{ timeout: 5000 }
			);
		} catch (error) {
			logger.warn(`⚠️ No se pudo seleccionar Tipo Operacion [${tipo}]. Probando fallback prefijo...`);
			await this.selectBootstrapDropdown(
				this.selectors.btnTipoOperacion,
				"Qa_to_",
				"Tipo Operacion (Fallback)",
				{ pickFirst: true }
			);
		}
	}

	async selectTipoServicio(tipo: string): Promise<void> {
		try {
			await this.selectBootstrapDropdown(
				this.selectors.btnTipoServicio,
				tipo,
				"Tipo Servicio",
				{ timeout: 5000 }
			);
		} catch (error) {
			logger.warn(`⚠️ No se pudo seleccionar Tipo Servicio [${tipo}]. Probando fallback prefijo...`);
			await this.selectBootstrapDropdown(
				this.selectors.btnTipoServicio,
				"Qa_TS_",
				"Tipo Servicio (Fallback)",
				{ pickFirst: true }
			);
		}
	}

	async selectTipoViaje(tipo: string = "Normal"): Promise<void> {
		await this.selectBootstrapDropdown(
			this.selectors.btnTipoViaje,
			tipo,
			"Tipo Viaje",
		);
	}

	async selectUnidadNegocio(unidad: string = "Defecto"): Promise<void> {
		try {
			// Intento 1: Seleccionar "Defecto" primero (según requerimiento de prioridad)
			logger.info("Intentando seleccionar Unidad de Negocio por defecto: [Defecto]");
			await this.selectBootstrapDropdown(
				this.selectors.btnUnidadNegocio,
				"Defecto",
				"Unidad Negocio (Defecto)",
				{ timeout: 5000 }
			);
		} catch (error) {
			logger.warn(`⚠️ No se pudo seleccionar la Unidad de Negocio por defecto [Defecto]. Probando fallbacks...`);
			
			// Intento 2: Si el valor original no era "Defecto", intentar seleccionarlo
			if (unidad && unidad !== "Defecto") {
				try {
					logger.info(`Intentando seleccionar Unidad de Negocio específica: [${unidad}]`);
					await this.selectBootstrapDropdown(
						this.selectors.btnUnidadNegocio,
						unidad,
						"Unidad Negocio (Especifica)",
						{ timeout: 5000 }
					);
					return;
				} catch (e) {
					logger.warn(`⚠️ No se pudo seleccionar la Unidad de Negocio específica [${unidad}].`);
				}
			}

			// Intento 3: Probar con prefijo "Qa_UN_"
			try {
				logger.info("Intentando seleccionar la primera Unidad de Negocio disponible con prefijo [Qa_UN_]");
				await this.selectBootstrapDropdown(
					this.selectors.btnUnidadNegocio,
					"Qa_UN_",
					"Unidad Negocio (Fallback Prefijo)",
					{ pickFirst: true, timeout: 5000 }
				);
			} catch (e2) {
				logger.error("❌ Fallaron todas las alternativas para Unidad de Negocio");
				throw new Error(`No se pudo seleccionar ninguna Unidad de Negocio (ni 'Defecto', ni '${unidad}', ni con prefijo). Original: ${error}`);
			}
		}
	}

	async selectCliente(cliente: string): Promise<void> {
		await this.selectBootstrapDropdown(
			this.selectors.btnCliente,
			cliente,
			"Cliente",
		);
		// Sincronización Post-Cliente: Esperar que otros dropdowns reaccionen
		logger.info("⏳ Esperando estabilización del formulario post-selección de cliente...");
		await this.page.waitForTimeout(2000);
	}

	async selectCodigoCarga(carga?: string): Promise<void> {
		logger.info("Seleccionando Código Carga. Priorizando opciones disponibles para el cliente...");
		try {
			const visibleSelector = this.selectors.btnCodigoCarga.includes(":visible")
				? this.selectors.btnCodigoCarga
				: `${this.selectors.btnCodigoCarga}:visible`;
			const button = this.page.locator(visibleSelector).first();

			// Asegurar visibilidad
			await button.waitFor({ state: "visible", timeout: 5000 });

			// Abrir dropdown si no está abierto
			await this.page.evaluate((sel) => {
				const cleanSel = sel.replace(":visible", "");
				const btn = document.querySelector(cleanSel) as HTMLElement;
				if (!btn) return;
				const container = btn.closest(".bootstrap-select");
				if (container && !container.classList.contains("show")) {
					btn.click();
				}
			}, visibleSelector);

			// Localizar el menú
			const container = this.page
				.locator("div.bootstrap-select")
				.filter({ has: button })
				.first();
			const menu = container.locator("div.dropdown-menu.show");

			// Esperar que carguen las opciones nativas (filtradas por cliente)
			await this.page.waitForFunction((sel) => {
				const btn = document.querySelector(sel.replace(":visible", "")) as HTMLElement;
				const cont = btn?.closest(".bootstrap-select");
				const select = cont?.querySelector("select") as HTMLSelectElement;
				return select && Array.from(select.options).some(o => o.value && o.value !== "0" && o.value !== "");
			}, visibleSelector, { timeout: 8000 }).catch(() => {
				logger.warn("⚠️ Timeout esperando opciones nativas en Código Carga");
			});

			const optionsLocator = menu.locator("ul.dropdown-menu li a:not(.dropdown-header):not(.divider)");
			const availableOptions = (await optionsLocator.allTextContents())
				.map(o => o.trim())
				.filter(o => o && o !== "No results" && o !== "No hay resultados");

			if (availableOptions.length === 0) {
				logger.error("❌ El cliente seleccionado no posee ningún Código Carga asociado en su contrato.");
				throw new Error("El cliente seleccionado no posee ningún Código Carga asociado en su contrato.");
			}

			logger.info(`Códigos de carga disponibles en el dropdown: ${availableOptions.join(" | ")}`);

			// Seleccionar por defecto el primero
			let targetCarga = availableOptions[0];

			// Si se especificó una carga y está en las disponibles, la priorizamos
			if (carga && carga !== "Qa_COD_") {
				const matchedOption = availableOptions.find(opt => opt.includes(carga) || carga.includes(opt));
				if (matchedOption) {
					logger.info(`Se encontró coincidencia para la carga solicitada [${carga}]: [${matchedOption}]`);
					targetCarga = matchedOption;
				} else {
					logger.warn(`La carga solicitada [${carga}] no está disponible. Usando primera opción del cliente: [${targetCarga}]`);
				}
			}

			logger.info(`Seleccionando código de carga final: [${targetCarga}]`);
			const option = menu.locator("ul.dropdown-menu li a")
				.filter({ hasText: targetCarga })
				.first();

			await option.waitFor({ state: "visible", timeout: 5000 });
			await option.evaluate((node: HTMLElement) => node.scrollIntoView({ block: "center" })).catch(() => {});
			await option.evaluate((node: HTMLElement) => node.click());

			// Keep the native select in sync. TMS saveTrip() validates the underlying
			// #viajes-carga_id value and runs onchange handlers such as buscarUnidadMedida().
			await button.evaluate((btn: HTMLElement, text: string) => {
				const cleanText = text.trim().toLowerCase();
				const container = btn.closest(".bootstrap-select");
				const select = container?.querySelector("select") as HTMLSelectElement | null;
				if (!select) return;

				const target = Array.from(select.options).find((opt) => {
					const optionText = opt.text.trim();
					return (
						optionText === text ||
						optionText.toLowerCase().includes(cleanText)
					);
				});

				if (!target) return;

				select.value = target.value;
				select.dispatchEvent(new Event("input", { bubbles: true }));
				select.dispatchEvent(new Event("change", { bubbles: true }));
				select.dispatchEvent(new Event("blur", { bubbles: true }));

				const win = window as unknown as {
					jQuery?: ((element: HTMLSelectElement) => {
						selectpicker?: (action: string, value?: string) => void;
					});
				};
				const jqSelect = win.jQuery?.(select);
				jqSelect?.selectpicker?.("val", target.value);
				jqSelect?.selectpicker?.("refresh");
			}, targetCarga);

			await this.page.waitForTimeout(800);

		} catch (error: any) {
			logger.error(`❌ Fallo crítico al seleccionar Código Carga: ${error.message}`);
			throw error;
		}

		await this.page.keyboard.press("Tab");
	}

	async fillKgViaje(kg: string): Promise<void> {
		logger.info(`Completando KG del viaje: ${kg}`);
		const input = this.page
			.locator(`${this.selectors.kgViaje}:visible`)
			.first();

		try {
			await input.waitFor({ state: "visible", timeout: 3000 });
		} catch (error) {
			logger.warn(`⚠️ Campo KG del viaje principal (#viajes-kg) no visible en la UI. Forzando valor para validación de saveTrip().`);
			await this.page.evaluate(({ selector, val }: { selector: string; val: string }) => {
				const el = document.querySelector(selector) as HTMLInputElement | null;
				if (!el) return;
				el.value = val;
				el.dispatchEvent(new Event("input", { bubbles: true }));
				el.dispatchEvent(new Event("change", { bubbles: true }));
				el.dispatchEvent(new Event("blur", { bubbles: true }));
			}, { selector: this.selectors.kgViaje, val: kg });

			const hiddenValue = await this.page
				.locator(this.selectors.kgViaje)
				.inputValue()
				.catch(() => "");
			if (hiddenValue.trim() !== kg) {
				throw new Error(
					`No se pudo forzar KG del viaje oculto. Esperado: [${kg}] | Actual: [${hiddenValue}]`,
				);
			}
			return;
		}

		await input.click();
		await input.fill("");
		await input.type(kg, { delay: 40 });
		await input.blur();
		await this.page.waitForTimeout(300);

		let currentValue = (await input.inputValue().catch(() => "")).trim();
		const normalize = (value: string): number => {
			const cleaned = value
				.replace(/\s/g, "")
				.replace(/\./g, "")
				.replace(/,/g, ".");
			const parsed = Number.parseFloat(cleaned);
			return Number.isFinite(parsed) ? parsed : Number.NaN;
		};

		if (
			!Number.isFinite(normalize(currentValue)) ||
			normalize(currentValue) <= 0
		) {
			await input.evaluate((el: HTMLInputElement, val) => {
				el.value = val;
				el.dispatchEvent(new Event("input", { bubbles: true }));
				el.dispatchEvent(new Event("change", { bubbles: true }));
				el.dispatchEvent(new Event("blur", { bubbles: true }));
			}, kg);
			await this.page.waitForTimeout(300);
			currentValue = (await input.inputValue().catch(() => "")).trim();
		}

		const expected = Number.parseFloat(kg);
		const actual = normalize(currentValue);
		if (!Number.isFinite(actual) || actual !== expected) {
			throw new Error(
				`KG del viaje quedó distinto al esperado. Esperado: [${kg}] | Actual: [${currentValue}]`,
			);
		}
	}

	async agregarRuta(numeroRuta: string): Promise<boolean> {
		logger.info(`Añadiendo ruta: ${numeroRuta}`);
		const routeKey = (numeroRuta.match(/\d+/)?.[0] || numeroRuta).trim();
		await this.handleModalBackdrop();
		const btnAgregar = this.page.locator(this.selectors.btnAgregarRuta).first();

		try {
			await btnAgregar
				.evaluate((el) => el.scrollIntoView({ block: "center" }))
				.catch(() => {});
			await expect(btnAgregar).toBeEnabled({ timeout: 15000 });
			await btnAgregar.evaluate((el) => (el as HTMLElement).click());
			await this.page.waitForTimeout(2000); // Demo might be slow

			// We look for the route in the table
			const rows = this.page.locator(this.selectors.tablaRutas);

			// Si existe buscador en el modal, validar que esté limpio (no buscamos por texto)
			const searchBox = this.page.locator(
				"#modalRutasSugeridas .dataTables_filter input",
			);
			if (await searchBox.isVisible({ timeout: 2000 }).catch(() => false)) {
				const currentFilter = await searchBox.inputValue().catch(() => "");
				if (currentFilter.trim().length > 0) {
					await searchBox.clear();
					await this.page.waitForTimeout(500);
				}
			}

			// Botón directo de agregar ruta por fila
			const quickAddBtn = this.page
				.locator(`//tr[td[contains(., '${routeKey}')]]//i`)
				.first();
			if (await quickAddBtn.isVisible({ timeout: 2500 }).catch(() => false)) {
				await quickAddBtn.click();
				logger.info(
					`Ruta [${numeroRuta}] agregada por botón rápido del modal (key=${routeKey})`,
				);

				logger.info("Esperando a que Origen/Destino se completen...");
				const origenDestinoCompletos = await this.waitForOrigenDestinoCompletos();
				if (!origenDestinoCompletos) return false;

				return true;
			}

			const rowCount = await rows.count();
			let found = false;

			for (let i = 0; i < rowCount; i++) {
				const row = rows.nth(i);
				const text = await row.innerText();
				// Exact match for the ID column or includes
				if (text.includes(numeroRuta) || text.includes(routeKey)) {
					logger.info(`Ruta [${numeroRuta}] encontrada en la fila ${i + 1}`);
					const selectBtn = row.locator(".btn-success, .btn-primary").first();
					await selectBtn
						.evaluate((el) => el.scrollIntoView({ block: "center" }))
						.catch(() => {});
					await selectBtn
						.waitFor({ state: "visible", timeout: 3000 })
						.catch(() => {});
					await selectBtn.evaluate((el) => (el as HTMLElement).click());
					found = true;
					break;
				}
			}

			if (!found) {
				logger.warn(
					`Ruta ${numeroRuta} (key=${routeKey}) no encontrada en la lista. Probando fallback con la primera disponible...`,
				);
				try {
					const firstRow = rows.first();
					await firstRow.waitFor({ state: 'attached', timeout: 5000 });
					const selectBtn = firstRow.locator(".btn-success, .btn-primary").first();
					await selectBtn.waitFor({ state: 'visible', timeout: 3000 });
					await selectBtn.evaluate((el) => el.scrollIntoView({ block: "center" })).catch(() => {});
					await selectBtn.evaluate((el) => (el as HTMLElement).click());
					found = true;
					logger.info("✅ Ruta agregada exitosamente usando la primera disponible del modal (fallback)");
				} catch (fallbackErr) {
					logger.warn(`Fallback a primera ruta no funcionó: no hay filas visibles en la tabla de rutas`);
				}
			}

			if (!found) {
				logger.warn(
					`Ruta ${numeroRuta} (key=${routeKey}) no encontrada ni se pudo usar fallback`,
				);
				await this.page.keyboard.press("Escape").catch(() => {});
				return false;
			}

			// CRITICAL: Wait for Origen/Destino to populate after modal selection
			logger.info("Esperando a que Origen/Destino se completen...");
			const origenDestinoCompletos = await this.waitForOrigenDestinoCompletos();
			if (!origenDestinoCompletos) return false;

			return true;
		} catch (e) {
			logger.error("Fallo en agregarRuta", e);
			await this.page.keyboard.press("Escape").catch(() => {});
			return false;
		}
	}

	async selectOrigen(origen: string): Promise<void> {
		await this.selectBootstrapDropdown(
			this.selectors.btnOrigen,
			origen,
			"Origen",
		);
	}

	async selectDestino(destino: string): Promise<void> {
		await this.selectBootstrapDropdown(
			this.selectors.btnDestino,
			destino,
			"Destino",
		);
	}

	async getSelectedOrigenDestino(): Promise<{ origen: string | null; destino: string | null }> {
		return {
			origen: await this.getBootstrapButtonValue(this.selectors.btnOrigen),
			destino: await this.getBootstrapButtonValue(this.selectors.btnDestino),
		};
	}

	async clickGuardar(): Promise<void> {
		logger.info("Haciendo clic en Guardar...");
		await this.handleModalBackdrop();
		await this.click(this.selectors.btnGuardar);
		await this.page.waitForLoadState("networkidle");
	}

	async isFormSaved(): Promise<boolean> {
		const url = this.page.url();
		return !url.includes("/viajes/crear") || url.includes("id=");
	}

	// --- MÉTODOS DE TRAMOS ---

	async setFechaEntradaOrigen(fecha: string): Promise<void> {
		logger.info(`Completando Fecha Entrada Origen (Tramo): ${fecha}`);
		try {
			const input = this.page.locator(
				this.selectors.modalTramoFechaEntradaOrigen,
			);
			const isReadonly = await input
				.evaluate((el: HTMLInputElement) => el.hasAttribute("readonly"))
				.catch(() => false);

			if (isReadonly) {
				logger.info(`El input de fecha es readonly, usando inyección JS`);
				await input.evaluate((el: HTMLInputElement, val) => {
					el.value = val;
					el.dispatchEvent(new Event("input", { bubbles: true }));
					el.dispatchEvent(new Event("change", { bubbles: true }));
				}, fecha);
			} else {
				await input.fill(fecha);
			}

			// Verificación de persistencia en el input
			const currentValue = await input.inputValue();
			if (currentValue !== fecha) {
				throw new Error(
					`La fecha ingresada (${fecha}) no coincide con el valor actual del input (${currentValue})`,
				);
			}
		} catch (error) {
			logger.error(`Error al ingresar fecha de entrada origen:`, error);
			await this.takeScreenshot("error-fecha-tramo");
			throw error;
		}
	}

	private async acceptTramoWarningIfPresent(timeout = 2000): Promise<boolean> {
		const warningModal = this.page
			.locator(".modal.show")
			.filter({ has: this.page.locator("button", { hasText: "Aceptar" }) })
			.filter({ has: this.page.locator("button", { hasText: "Cancelar" }) })
			.first();

		const isWarningVisible = await warningModal
			.waitFor({ state: "visible", timeout })
			.then(() => true)
			.catch(() => false);
		if (!isWarningVisible) return false;

		logger.info(
			"⚠️ Modal de advertencia de tramos detectado. Aceptando para continuar...",
		);

		const btnAceptar = warningModal
			.locator(this.selectors.btnModalTramoWarningAceptar)
			.first();
		await btnAceptar.click();

		const hidden = await warningModal
			.waitFor({ state: "hidden", timeout: 10000 })
			.then(() => true)
			.catch(() => {
				return false;
			});
		if (!hidden) {
			await this.takeScreenshot("tramo-warning-still-visible");
			throw new Error(
				"El modal de advertencia de tramos siguió visible después de hacer clic en Aceptar.",
			);
		}
		await this.page.waitForTimeout(800);
		return true;
	}

	private async getBootstrapButtonValue(
		btnSelector: string,
	): Promise<string | null> {
		const state = await this.page.evaluate((selector) => {
			const isPlaceholder = (raw: string | null | undefined) => {
				const value = (raw || "").replace(/\s+/g, " ").trim().toLowerCase();
				return !value
					|| /^(seleccione|seleccione\.\.\.|seleccionar|select|nothing selected|nada seleccionado|ninguno|sin seleccionar)$/i.test(value)
					|| value.includes("seleccionar")
					|| value.includes("seleccione")
					|| value.includes("nothing selected")
					|| value.includes("nada seleccionado");
			};

			const buttons = Array.from(document.querySelectorAll(selector)) as HTMLElement[];
			const button = buttons.find((candidate) => {
				const style = window.getComputedStyle(candidate);
				const rect = candidate.getBoundingClientRect();
				return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
			});

			if (!button) return { text: "", value: "", valid: false };

			const dataId = button.getAttribute("data-id") || "";
			const select = dataId
				? document.getElementById(dataId) as HTMLSelectElement | null
					|| document.querySelector(`select[name="${dataId}"]`) as HTMLSelectElement | null
				: null;
			const selectedOptionText = select?.options[select.selectedIndex]?.text || "";
			const buttonText = button.querySelector(".filter-option-inner-inner")?.textContent || button.textContent || "";
			const displayText = selectedOptionText.trim() || buttonText.trim();
			const selectedValue = select?.value?.trim() || "";

			const validText = !isPlaceholder(displayText);
			const validValue = select ? Boolean(selectedValue) : true;

			return { text: displayText.trim(), value: selectedValue, valid: validText && validValue };
		}, btnSelector).catch(() => ({ text: "", value: "", valid: false }));

		if (!state.valid) {
			return null;
		}
		return state.text;
	}

	private async waitForOrigenDestinoCompletos(timeout = 10000): Promise<boolean> {
		return this.page
			.waitForFunction(
				({ origenSelector, destinoSelector }) => {
					const isPlaceholder = (raw: string | null | undefined) => {
						const value = (raw || "").replace(/\s+/g, " ").trim().toLowerCase();
						return !value
							|| /^(seleccione|seleccione\.\.\.|seleccionar|select|nothing selected|nada seleccionado|ninguno|sin seleccionar)$/i.test(value)
							|| value.includes("seleccionar")
							|| value.includes("seleccione")
							|| value.includes("nothing selected")
							|| value.includes("nada seleccionado");
					};

					const getSelectionState = (selector: string) => {
						const buttons = Array.from(document.querySelectorAll(selector)) as HTMLElement[];
						const button = buttons.find((candidate) => {
							const style = window.getComputedStyle(candidate);
							const rect = candidate.getBoundingClientRect();
							return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
						});
						if (!button) return false;

						const dataId = button.getAttribute("data-id") || "";
						const select = dataId
							? document.getElementById(dataId) as HTMLSelectElement | null
								|| document.querySelector(`select[name="${dataId}"]`) as HTMLSelectElement | null
							: null;
						const selectedOptionText = select?.options[select.selectedIndex]?.text || "";
						const buttonText = button.querySelector(".filter-option-inner-inner")?.textContent || button.textContent || "";
						const displayText = selectedOptionText.trim() || buttonText.trim();
						const selectedValue = select?.value?.trim() || "";

						return !isPlaceholder(displayText) && (select ? Boolean(selectedValue) : true);
					};

					return getSelectionState(origenSelector) && getSelectionState(destinoSelector);
				},
				{ origenSelector: this.selectors.btnOrigen, destinoSelector: this.selectors.btnDestino },
				{ timeout },
			)
			.then(() => true)
			.catch(() => {
				logger.warn("⚠️ Origen/Destino no se completaron con valores válidos después de 10s");
				return false;
			});
	}

	private async syncMainSelectionsToTramoModal(): Promise<void> {
		const mappings = [
			{
				main: this.selectors.btnTipoOperacion,
				modal: this.selectors.modalTramoTipoOperacion,
				label: "Modal Tipo Operacion",
			},
			{
				main: this.selectors.btnTipoServicio,
				modal: this.selectors.modalTramoTipoServicio,
				label: "Modal Tipo Servicio",
			},
			{
				main: this.selectors.btnTipoViaje,
				modal: this.selectors.modalTramoTipoViaje,
				label: "Modal Tipo Viaje",
			},
			{
				main: this.selectors.btnUnidadNegocio,
				modal: this.selectors.modalTramoUnidadNegocio,
				label: "Modal Unidad Negocio",
			},
			{
				main: this.selectors.btnCodigoCarga,
				modal: this.selectors.modalTramoCodigoCarga,
				label: "Modal Codigo Carga",
			},
		];

		for (const map of mappings) {
			const value = await this.getBootstrapButtonValue(map.main);
			if (!value) {
				logger.warn(
					`⚠️ No se pudo leer valor del campo principal para ${map.label}`,
				);
				continue;
			}
			await this.selectBootstrapDropdown(
				`${map.modal}:visible`,
				value,
				map.label,
			);
		}
	}

	async addTramo(tramo: TramoInput): Promise<void> {
		logger.info(
			`Añadiendo Tramo: Origen ${tramo.origen} -> Destino ${tramo.destino}`,
		);

		try {
			const tramoOrigenBtnVisible = this.page
				.locator(`${this.selectors.modalTramoOrigen}:visible`)
				.first();
			let tramoModalReady = false;

			for (let attempt = 1; attempt <= 2; attempt++) {
				await this.click(this.selectors.btnAbrirModalTramo);
				const acceptedWarning = await this.acceptTramoWarningIfPresent();
				tramoModalReady = await tramoOrigenBtnVisible
					.waitFor({ state: "visible", timeout: acceptedWarning ? 7000 : 5000 })
					.then(() => true)
					.catch(() => false);

				if (tramoModalReady) break;
				if (attempt === 1) {
					logger.warn(
						"⚠️ El modal de tramo no quedó visible después del primer intento. Reintentando una vez...",
					);
				}
			}

			if (!tramoModalReady) {
				const warningStillVisible = await this.page
					.locator(".modal.show")
					.filter({ has: this.page.locator("button", { hasText: "Aceptar" }) })
					.isVisible()
					.catch(() => false);
				throw new Error(
					warningStillVisible
						? "No se pudo abrir el modal de tramo porque la advertencia sigue visible."
						: "No se pudo abrir el modal de tramo después de aceptar la advertencia y reintentar una vez.",
				);
			}
			await this.page.waitForTimeout(800); // Animation stabilization

			// 2.5. Replicar datos obligatorios del viaje principal en el modal de tramo
			await this.syncMainSelectionsToTramoModal();

			// 3. Origen
			await this.selectBootstrapDropdown(
				`${this.selectors.modalTramoOrigen}:visible`,
				tramo.origen,
				"Modal Tramo Origen",
			);
			if (tramo.fechaEntradaOrigen) {
				await this.setFechaEntradaOrigen(tramo.fechaEntradaOrigen);
			}
			if (tramo.kgOrigen) {
				const kgGeneral = this.page
					.locator(`${this.selectors.modalTramoKgGeneral}:visible`)
					.first();
				if (await kgGeneral.isVisible().catch(() => false)) {
					await kgGeneral.fill(tramo.kgOrigen);
				}
				await this.fill(this.selectors.modalTramoKgOrigen, tramo.kgOrigen);
			}

			// 4. Destino
			await this.selectBootstrapDropdown(
				`${this.selectors.modalTramoDestino}:visible`,
				tramo.destino,
				"Modal Tramo Destino",
			);
			const kgDestinoToUse = tramo.kgDestino ?? tramo.kgOrigen;
			if (kgDestinoToUse) {
				await this.fill(this.selectors.modalTramoKgDestino, kgDestinoToUse);
			}

			// 5. Guardar (Crear viaje tramo)
			const tramoModalVisible = this.page
				.locator(".modal.show")
				.filter({
					has: this.page.locator(`${this.selectors.modalTramoOrigen}:visible`),
				})
				.first();
			const btnGuardarTramo = tramoModalVisible
				.locator('button:has-text("Crear viaje")')
				.first();
			await btnGuardarTramo.waitFor({ state: "visible", timeout: 5000 });
			await btnGuardarTramo.click();
			await tramoModalVisible
				.waitFor({ state: "hidden", timeout: 15000 })
				.catch(() => {
					logger.warn(
						"⚠️ El modal de tramo no se ocultó a tiempo, continuando...",
					);
				});
			await this.page.waitForTimeout(1500); // Esperar que la UI re-renderice la card del tramo
		} catch (error) {
			logger.error(
				`Error durante addTramo (${tramo.origen} -> ${tramo.destino}):`,
				error,
			);
			await this.takeScreenshot("error-add-tramo");
			throw error;
		}
	}

	async addTramos(tramos: TramoInput[]): Promise<void> {
		for (const t of tramos) {
			await this.addTramo(t);
		}
	}

	async getTramosCount(): Promise<number> {
		// Depende del HTML real, pero buscaremos contenedores que tengan texto de origen/destino
		// o un selector más específico si se determina.
		const cards = this.page
			.locator(this.selectors.tramosListItems)
			.filter({ hasText: "Tramo" });
		return await cards.count();
	}

	async assertTramoVisible(tramo: TramoExpectedCard): Promise<void> {
		logger.info(
			`Verificando tramo visible: ${tramo.origen} -> ${tramo.destino}`,
		);
		// Busca dentro de los contenedores posibles (ajustar .card o similar según la UI real)
		const cards = this.page.locator(this.selectors.tramosListItems);
		const count = await cards.count();

		let found = false;
		for (let i = 0; i < count; i++) {
			const cardText = await cards.nth(i).innerText();
			if (cardText.includes(tramo.origen) && cardText.includes(tramo.destino)) {
				found = true;
				if (tramo.kg && !cardText.includes(tramo.kg)) {
					throw new Error(
						`❌ Tramo encontrado pero el KG esperado [${tramo.kg}] no está presente en la card. Texto real: ${cardText}`,
					);
				}
				if (tramo.transportista && !cardText.includes(tramo.transportista)) {
					throw new Error(
						`Tramo encontrado pero el valor esperado [${tramo.transportista}] no es visible en la card. Texto real: ${cardText}`,
					);
				}
				// Assert we don't see Anulado in newly created tramo unless specifically creating an anulado one
				if (cardText.includes("Anulado")) {
					throw new Error(
						`El tramo recién creado aparece como "Anulado". Texto real: ${cardText}`,
					);
				}
				break;
			}
		}
		expect(found).toBeTruthy();
	}
}
