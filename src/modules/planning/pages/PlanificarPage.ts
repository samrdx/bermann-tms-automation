import { BasePage } from "../../../core/BasePage.js";
import type { Page } from "playwright";
import { expect } from "@playwright/test";
import { createLogger } from "../../../utils/logger.js";

const logger = createLogger("PlanificarViajesPage");

export interface TramoInput {
	origen: string;
	destino: string;
	fechaEntradaOrigen?: string; // yyyy-mm-dd
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
	): Promise<void> {
		logger.info(`Seleccionando ${fieldName}: [${optionText}]`);

		try {
			await this.waitForLoading();

			const visibleSelector = btnSelector.includes(":visible")
				? btnSelector
				: `${btnSelector}:visible`;
			const button = this.page.locator(visibleSelector).first();
			await button
				.evaluate((node: HTMLElement) =>
					node.scrollIntoView({ block: "center" }),
				)
				.catch(() => {});
			await button.waitFor({ state: "visible", timeout: 5000 });

			// Ensure no backdrop is blocking the dropdown click
			await this.handleModalBackdrop();

			// 1. Open dropdown using the located visible button
			await button.evaluate((node: HTMLElement) => node.click());

			// 2. Locate the container and ITS menu
			const container = this.page
				.locator("div.bootstrap-select")
				.filter({ has: button })
				.first();
			const menu = container.locator("div.dropdown-menu");
			const searchInput = menu.locator("div.bs-searchbox input");

			// 3. Search and select
			if (await searchInput.isVisible({ timeout: 1500 }).catch(() => false)) {
				logger.debug(`Buscando "${optionText}" en ${fieldName}`);
				await searchInput.clear();
				await searchInput.fill(optionText);
				await this.page.waitForTimeout(1000); // Wait for filter
			}

			const option = menu
				.locator("ul.dropdown-menu li a")
				.filter({ hasText: optionText })
				.first();

			await option
				.evaluate((node: HTMLElement) =>
					node.scrollIntoView({ block: "center" }),
				)
				.catch(() => {});
			await option.evaluate((node: HTMLElement) => node.click());

			// 4. Verification & Force Sync
			await this.page.waitForTimeout(800);
			const selectedText = await button.innerText();
			if (!selectedText.toLowerCase().includes(optionText.toLowerCase())) {
				logger.warn(
					`⚠️ La UI del dropdown [${fieldName}] no se actualizó a [${optionText}]. Actual: [${selectedText}]. Forzando valor vía JS...`,
				);
			}

			// ALWAYS force sync the underlying <select> to prevent validation errors
			await button.evaluate((btn: HTMLElement, text: string) => {
				const container = btn.closest(".bootstrap-select");
				const select = container?.querySelector("select") as HTMLSelectElement;
				const options = Array.from(select?.options || []);

				// Try strict match first, then includes
				let target = options.find((o) => o.text.trim() === text);
				if (!target) {
					target = options.find((o) =>
						o.text.trim().toLowerCase().includes(text.toLowerCase()),
					);
				}

				if (select && target) {
					select.value = target.value;
					select.dispatchEvent(new Event("change", { bubbles: true }));
					// Try to trigger bootstrap-select refresh if possible
					try {
						(window as any).$(select).selectpicker("val", target.value);
					} catch (e) {
						/* ignore */
					}
					try {
						(window as any).$(select).selectpicker("refresh");
					} catch (e) {
						/* ignore */
					}
				}
			}, optionText);

			await this.page.waitForTimeout(1000); // Stabilization
		} catch (error) {
			logger.error(`Fallo en el dropdown [${fieldName}]:`, error);
			await this.takeScreenshot(`fail-${fieldName}`);
			throw error;
		}
	}

	async selectTipoOperacion(tipo: string): Promise<void> {
		await this.selectBootstrapDropdown(
			this.selectors.btnTipoOperacion,
			tipo,
			"Tipo Operacion",
		);
	}

	async selectTipoServicio(tipo: string): Promise<void> {
		await this.selectBootstrapDropdown(
			this.selectors.btnTipoServicio,
			tipo,
			"Tipo Servicio",
		);
	}

	async selectTipoViaje(tipo: string = "Normal"): Promise<void> {
		await this.selectBootstrapDropdown(
			this.selectors.btnTipoViaje,
			tipo,
			"Tipo Viaje",
		);
	}

	async selectUnidadNegocio(unidad: string = "Defecto"): Promise<void> {
		await this.selectBootstrapDropdown(
			this.selectors.btnUnidadNegocio,
			unidad,
			"Unidad Negocio",
		);
	}

	async selectCliente(cliente: string): Promise<void> {
		await this.selectBootstrapDropdown(
			this.selectors.btnCliente,
			cliente,
			"Cliente",
		);
	}

	async selectCodigoCarga(carga: string): Promise<void> {
		await this.selectBootstrapDropdown(
			this.selectors.btnCodigoCarga,
			carga,
			"Codigo Carga",
		);
		await this.page.keyboard.press("Tab");
	}

	async fillKgViaje(kg: string): Promise<void> {
		logger.info(`Completando KG del viaje: ${kg}`);
		const input = this.page
			.locator(`${this.selectors.kgViaje}:visible`)
			.first();

		await input.waitFor({ state: "visible", timeout: 5000 });
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
				await this.page
					.waitForFunction(
						() => {
							const o = document.querySelector(
								'button[data-id="_origendestinoform-origen"]',
							) as HTMLElement;
							const d = document.querySelector(
								'button[data-id="_origendestinoform-destino"]',
							) as HTMLElement;
							return (
								o &&
								o.innerText.trim() !== "Seleccione" &&
								d &&
								d.innerText.trim() !== "Seleccione"
							);
						},
						{ timeout: 10000 },
					)
					.catch(() => {
						logger.warn("⚠️ Origen/Destino no se completaron después de 10s");
					});

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
					`Ruta ${numeroRuta} (key=${routeKey}) no encontrada en la lista`,
				);
				await this.page.keyboard.press("Escape").catch(() => {});
				return false;
			}

			// CRITICAL: Wait for Origen/Destino to populate after modal selection
			logger.info("Esperando a que Origen/Destino se completen...");
			await this.page
				.waitForFunction(
					() => {
						const o = document.querySelector(
							'button[data-id="_origendestinoform-origen"]',
						) as HTMLElement;
						const d = document.querySelector(
							'button[data-id="_origendestinoform-destino"]',
						) as HTMLElement;
						return (
							o &&
							o.innerText.trim() !== "Seleccione" &&
							d &&
							d.innerText.trim() !== "Seleccione"
						);
					},
					{ timeout: 10000 },
				)
				.catch(() => {
					logger.warn("⚠️ Origen/Destino no se completaron después de 10s");
				});

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

	private async acceptTramoWarningIfPresent(): Promise<void> {
		const warningModal = this.page
			.locator(".modal.show")
			.filter({ has: this.page.locator("button", { hasText: "Aceptar" }) })
			.filter({ has: this.page.locator("button", { hasText: "Cancelar" }) })
			.first();

		const isWarningVisible = await warningModal.isVisible().catch(() => false);
		if (!isWarningVisible) return;

		logger.info(
			"⚠️ Modal de advertencia de tramos detectado. Aceptando para continuar...",
		);

		const btnAceptar = warningModal
			.locator(this.selectors.btnModalTramoWarningAceptar)
			.first();
		await btnAceptar.click();

		await warningModal
			.waitFor({ state: "hidden", timeout: 10000 })
			.catch(() => {
				logger.warn(
					"⚠️ El modal de advertencia no se ocultó a tiempo, continuando...",
				);
			});
		await this.page.waitForTimeout(800);
	}

	private async getBootstrapButtonValue(
		btnSelector: string,
	): Promise<string | null> {
		const btn = this.page.locator(`${btnSelector}:visible`).first();
		const value = (await btn.innerText().catch(() => "")).trim();
		if (!value || value.toLowerCase().includes("seleccionar")) {
			return null;
		}
		return value;
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
			// 1. Abrir flujo de modal
			await this.click(this.selectors.btnAbrirModalTramo);
			await this.acceptTramoWarningIfPresent();

			// 2. Esperar modal real de tramos (usar botón visible para evitar clones ocultos)
			const tramoOrigenBtnVisible = this.page
				.locator(`${this.selectors.modalTramoOrigen}:visible`)
				.first();
			const tramoVisibleNow = await tramoOrigenBtnVisible
				.isVisible()
				.catch(() => false);
			if (!tramoVisibleNow) {
				// En algunos flujos, tras aceptar advertencia hay que reintentar abrir el modal de tramo
				await this.click(this.selectors.btnAbrirModalTramo);
				await this.acceptTramoWarningIfPresent();
			}
			await tramoOrigenBtnVisible.waitFor({ state: "visible", timeout: 10000 });
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
					logger.warn(
						`⚠️ Tramo encontrado pero el KG [${tramo.kg}] no es visible en la card. Texto real: ${cardText}`,
					);
				}
				if (tramo.transportista && !cardText.includes(tramo.transportista)) {
					logger.warn(
						`⚠️ Tramo encontrado pero el Transportista [${tramo.transportista}] no es visible en la card. Texto real: ${cardText}`,
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
