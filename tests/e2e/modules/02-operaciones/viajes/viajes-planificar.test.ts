import { test, expect } from "../../../../../src/fixtures/base.js";
import { logger } from "../../../../../src/utils/logger.js";
import { DataPathHelper } from "../../../../api-helpers/DataPathHelper.js";
import { OperationalDataLoader } from "../../../../api-helpers/OperationalDataLoader.js";
import { ClienteHelper } from "../../../../api-helpers/ClienteHelper.js";
import fs from "fs";
import { allure } from "allure-playwright";
import { entityTracker } from "../../../../../src/utils/entityTracker.js";

/**
 * Step 6: Planificar Viaje (Trip Planning)
 *
 * Prerequisites:
 * 1. LEGACY_DATA_SOURCE=entities: correr `npm run qa:regression:entities` / `npm run demo:regression:entities`
 *    o LEGACY_DATA_SOURCE=base: correr `npm run qa:seed:legacy` / `npm run demo:seed:legacy`
 * 2. Crear contrato transportista con `qa|demo:smoke:contract:transportista` (base) o `qa|demo:regression:contract:transportista` (entities)
 * 3. Crear contrato cliente con `qa|demo:smoke:contract:cliente` (base) o `qa|demo:regression:contract:cliente` (entities)
 *
 * This test:
 * - Loads existing entity data from the selected legacy data source
 * - Uses dynamic cliente from JSON
 * - Creates a new viaje (trip) planning record
 * - Verifies trip appears in /viajes/asignar
 * - Stores viaje info in JSON for Step 7
 */
test.describe("[V01] Viajes - Planificar", () => {
	test.setTimeout(240000);

	test("Debe planificar un nuevo Viaje usando entidades del JSON", async ({
		viajesPlanificarPage,
		viajesAsignarPage,
		page,
	}, testInfo) => {
		const startTime = Date.now();
		await allure.epic("TMS Legacy Flow");
		await allure.feature("03-Viajes");
		await allure.story("Planificar Viaje");

		logger.info("=".repeat(80));
		logger.info("Iniciando Paso 6: Planificar Viaje");
		logger.info("=".repeat(80));

		// =================================================================
		// STEP 1: Load JSON Data
		// =================================================================
		logger.info(
			"Cargando datos de entidades existentes del JSON específico del worker...",
		);
		const loadResult = OperationalDataLoader.load<Record<string, any>>(testInfo, {
			logger,
			purpose: "planificar viaje",
		});
		
		let operationalData = loadResult?.data || {};
		const dataPath = loadResult?.candidate?.path || DataPathHelper.getLegacyEntityDataPath(testInfo);
		logger.info(`📦 Data operacional seleccionada: ${dataPath}`);

		// Prefer seededCliente (set by cliente-crear.test.ts OR base-entities.setup.ts).
		// Fall back to legacy `cliente` key for backward compatibility.
		let clienteSource =
			operationalData.seededCliente || operationalData.cliente;
		let clienteNombreFromData = clienteSource?.nombreFantasia || clienteSource?.nombre;

		if (!clienteNombreFromData) {
			logger.info("⚠️ Cliente no encontrado en el JSON de datos. Autogenerando uno bajo demanda vía UI...");
			const generated = await ClienteHelper.createClienteViaUI(page);
			clienteSource = generated;
			clienteNombreFromData = generated.nombreFantasia || generated.nombre;

			// Escribir el cliente autogenerado en el JSON del worker para asegurar sinergia
			const currentData = fs.existsSync(dataPath) ? JSON.parse(fs.readFileSync(dataPath, "utf-8")) : {};
			currentData.seededCliente = clienteSource;
			fs.writeFileSync(dataPath, JSON.stringify(currentData, null, 2), "utf-8");
			logger.info(`✅ Cliente autogenerado guardado exitosamente en ${dataPath}`);
		} else {
			logger.info(`📦 Usando cliente cargado: "${clienteNombreFromData}" (ID: ${clienteSource.id})`);
		}

		logger.info("✅ Todos los prerrequisitos validados");
		logger.info(
			`   Cliente source: ${operationalData.seededCliente ? "seededCliente ✅" : "cliente (fallback) ⚠️"}`
		);
		logger.info(`   Cliente: ${clienteNombreFromData}`);
		logger.info("");

		// Test data
		const nroViaje = String(Math.floor(10000 + Math.random() * 90000));
		const isDemo = process.env.ENV === "DEMO";
			clienteSource.nombreFantasia || clienteSource.nombre;

		// =================================================================
		// STEP 2: environment Configuration
		// =================================================================
		const defaults = {
			// QA usa nomenclatura Qa_to_std_* y Qa_TS_* (creados en smoke config)
			// Los sufijos son dinámicos, el Page Object hará match parcial
			tipoOperacion: isDemo ? "Distribución" : "Qa_to_std_",
			tipoServicio: isDemo ? "Lcl" : "Qa_TS_",
			tipoViaje: isDemo ? "DIRECTO" : "Normal",
			unidadNegocio: isDemo ? "Defecto" : "Defecto",
			cliente: clienteNombreFromData,
			codigoCarga: isDemo ? "CONTENEDOR DRY" : "Qa_COD_",
			ruta: isDemo ? "47" : "Qa_RT_",
			origenManual: isDemo
				? "233_CD SuperZoo_Quilicura"
				: "405_LA FARFANA_Pudahuel",
			destinoManual: isDemo ? "Divisa" : "CXP ANTOFAGASTA",
		};

		let setupConfig: any = {};
		const setupConfigPaths = DataPathHelper.getSetupConfigDataCandidatePaths(testInfo);
		const setupConfigPath = setupConfigPaths.find((candidatePath) => fs.existsSync(candidatePath));
		if (setupConfigPath) {
			setupConfig = JSON.parse(fs.readFileSync(setupConfigPath, "utf-8"));
			logger.info(`📦 Setup config detectado: ${setupConfigPath}`);
		} else {
			logger.warn(
				`⚠️ Setup config no encontrado en ninguna ruta candidata. Se usarán defaults.`,
			);
		}

		const config = {
			tipoOperacion:
				setupConfig?.seededTipoOperacion?.nombre || defaults.tipoOperacion,
			tipoServicio:
				setupConfig?.seededTipoServicio?.nombre || defaults.tipoServicio,
			tipoViaje: defaults.tipoViaje,
			unidadNegocio:
				setupConfig?.unidadNegocio?.nombre || defaults.unidadNegocio,
			cliente: clienteNombreFromData,
			codigoCarga: setupConfig?.seededCarga?.codigo || defaults.codigoCarga,
			ruta:
				setupConfig?.ruta?.nro || setupConfig?.ruta?.nombre || defaults.ruta,
			origenManual: setupConfig?.ruta?.origen || defaults.origenManual,
			destinoManual: setupConfig?.ruta?.destino || defaults.destinoManual,
		};
		const clienteNombre = config.cliente;

		await allure.parameter("Cliente", clienteNombre);
		await allure.parameter("Nro Viaje", nroViaje);
		await allure.parameter("Ambiente", process.env.ENV || "QA");
		await allure.attachment(
			"Entidades Cargadas (JSON)",
			JSON.stringify(
				{
					cliente: clienteNombre,
					clienteId: clienteSource.id,
					nroViaje,
				},
				null,
				2,
			),
			"application/json",
		);

		logger.info(`Environment: ${process.env.ENV || "QA"}`);
		logger.info(`Configuration: ${JSON.stringify(config, null, 2)}`);

		// =================================================================
		// PHASE 1: Navigate to Planificar Viajes
		// =================================================================
		await test.step("Fase 1: Navegar", async () => {
			logger.info("Fase 1: Navegar a Planificar Viajes");
			await viajesPlanificarPage.navigate();
			logger.info("Navegación exitosa");
		});

		// =================================================================
		// PHASE 2: Fill Form with dynamic data
		// CORRECT ORDER BASED ON USER REQUEST + UI:
		// 1. Tipo de Operación
		// 2. Tipo Servicio
		// 3. Cliente (Triggers cascade)
		// 4. Tipo viaje
		// 5. Unidad de negocio
		// 6. Código Carga
		// 7. Ruta (via Modal or Manual Fallback)
		// =================================================================
		await test.step("Fase 2: Completar formulario", async () => {
			logger.info("Fase 2: Completar formulario de viaje");

			// Header Nro Viaje (though not in user numbered list, it's essential)
			await viajesPlanificarPage.fillNroViaje(nroViaje);

			// 1. Tipo de Operación
			await viajesPlanificarPage.selectTipoOperacion(config.tipoOperacion);

			// 2. Tipo Servicio
			await viajesPlanificarPage.selectTipoServicio(config.tipoServicio);

			// 3. Cliente - from setup config when available, otherwise defaults
			logger.info(`Seleccionando Cliente: ${clienteNombre}`);
			await viajesPlanificarPage.selectCliente(clienteNombre);

			// 4. Tipo Viaje
			await viajesPlanificarPage.selectTipoViaje(config.tipoViaje);

			// 5. Unidad de negocio (Robust internal logic)
			await viajesPlanificarPage.selectUnidadNegocio(config.unidadNegocio);

			// 6. Código Carga (Prioriza el disponible del cliente)
			logger.info("Seleccionando Código Carga disponible para el cliente...");
			await viajesPlanificarPage.selectCodigoCarga();

			// 7. Ruta (via Modal or Manual Fallback)
			logger.info(`Intentando agregar Ruta: ${config.ruta}...`);
			let rutaAdded = false;
			try {
				rutaAdded = await viajesPlanificarPage.agregarRuta(config.ruta);
			} catch (error) {
				logger.warn(`⚠️ Error al agregar ruta específica [${config.ruta}]. Probando con prefijo Qa_RT_...`);
				rutaAdded = await viajesPlanificarPage.agregarRuta("Qa_RT_");
			}

			if (!rutaAdded) {
				logger.warn(
					"⚠️ La adición de la ruta falló o se omitió, aplicando el fallback manual de Origen/Destino...",
				);
				if (config.origenManual)
					await viajesPlanificarPage.selectOrigen(config.origenManual);
				if (config.destinoManual)
					await viajesPlanificarPage.selectDestino(config.destinoManual);
			}

			// 7.5 KG del viaje maestro (después de ruta para evitar reset automático)
			await viajesPlanificarPage.fillKgViaje("1");

			logger.info("Formulario completado");
		});



		// =================================================================
		// PHASE 3: Save Viaje and capture ID from redirect URL
		// =================================================================
		let viajeId: string | null = null;

		await test.step("Fase 3: Guardar y capturar ID del Viaje", async () => {
			logger.info("Fase 3: Guardar Viaje");

			// Wait for navigation triggered by Guardar — the TMS redirects to:
			//   /viajes/editar/{id}  or  /viajes/ver/{id}  after a successful save
			const [_] = await Promise.all([
				page
					.waitForNavigation({
						waitUntil: "networkidle",
						timeout: 45000,
					})
					.catch(() => null),
				viajesPlanificarPage.clickGuardar(),
			]);

			// Extract the ID from the final URL
			const finalUrl = page.url();
			logger.info(`URL post-guardado: ${finalUrl}`);

			const urlMatch = finalUrl.match(/\/viajes\/(?:editar|ver)\/(\d+)/);
			if (urlMatch) {
				viajeId = urlMatch[1];
				logger.info(`✅ ID del viaje capturado de la URL: ${viajeId}`);
			} else {
				// Fallback: look for a hidden input or data attribute holding the ID
				viajeId = await page.evaluate(() => {
					const candidateSelectors = [
						'input[name="Viajes[id]"]',
						'input[name="viajes-id"]',
						"[data-viaje-id]",
					];
					for (const sel of candidateSelectors) {
						const el = document.querySelector(sel) as HTMLInputElement | null;
						if (el) return el.value || el.getAttribute("data-viaje-id") || null;
					}
					return null;
				});
				if (viajeId) {
					logger.info(`✅ ID del viaje capturado del DOM: ${viajeId}`);
				} else {
					logger.warn(
						"⚠️ No se pudo capturar el ID del viaje. La prueba de asignación buscará por nroViaje.",
					);
				}
			}

			logger.info("Boton guardar clickeado y navegacion completada");
		});

		// =================================================================
		// PHASE 4: Verification
		// =================================================================
		await test.step("Fase 4: Verificación", async () => {
			logger.info("Fase 4: Verificación");

			// In Demo, we redirect to /viajes/asignar on success, but NO internal ID in URL
			// We'll capture the ID from the first row of the grid instead
			await viajesAsignarPage.navigate();

			// Filtrar por cliente para mayor precisión
			logger.info(`Filtrando grilla de asignación por cliente: ${clienteNombre}`);
			await viajesAsignarPage.selectClienteFilter(clienteNombre);

			let searchTerm = nroViaje;
			let internalGridId: string | null = null;
			if (isDemo) {
				internalGridId = await viajesAsignarPage.getFirstRowId();
				logger.info(
					`✅ ID interno de la grilla capturado en Demo: ${internalGridId}`,
				);
				searchTerm = internalGridId || nroViaje;
			}

			logger.info(`Buscando en la grilla de Asignar usando: ${searchTerm}`);
			const maestroRow = await viajesAsignarPage.findViajeRow(searchTerm);
			const foundInAsignar = !!maestroRow;

			if (foundInAsignar) {
				logger.info(
					`✅ Viaje encontrado en /viajes/asignar usando búsqueda: ${searchTerm}`,
				);
			} else {
				logger.warn(
					`⚠️ Viaje NO encontrado en /viajes/asignar usando búsqueda: ${searchTerm}`,
				);
			}

			expect(
				foundInAsignar,
				`Viaje ${searchTerm} debería ser visible en la grilla de Asignar`,
			).toBe(true);

			if (!maestroRow) {
				throw new Error(
					`No se encontró la fila del viaje maestro ${searchTerm}`,
				);
			}

			await allure.parameter("Nro Viaje Maestro", searchTerm);



			// Save internal grid ID for subsequent tests (e.g., asignar)
			if (isDemo && internalGridId) {
				operationalData.viaje = {
					...operationalData.viaje,
					id: internalGridId,
				};
				fs.writeFileSync(
					dataPath,
					JSON.stringify(operationalData, null, 2),
					"utf-8",
				);
				logger.info(
					`✅ ID interno de la grilla guardado en JSON: viaje.id = ${internalGridId}`,
				);
			}

			entityTracker.register({
				type: "Viaje",
				name: nroViaje,
				id: viajeId || internalGridId || "N/A",
				asociado: clienteNombre,
				estado: "PLANIFICADO",
			});
		});

		// =================================================================
		// STEP 6: Update JSON with Viaje Info
		// =================================================================
		logger.info("Actualizando JSON del worker con la información del viaje...");

		operationalData.viaje = {
			...operationalData.viaje,
			nroViaje: nroViaje,
			cliente: clienteNombre,
			ruta: config.ruta,
			status: "PLANIFICADO",
		};

		fs.writeFileSync(
			dataPath,
			JSON.stringify(operationalData, null, 2),
			"utf-8",
		);
		logger.info(`Saved viaje.nroViaje: ${nroViaje}`);

		// =================================================================
		// FINAL SUMMARY
		// =================================================================
		const executionTime = ((Date.now() - startTime) / 1000).toFixed(2);

		logger.info("=".repeat(80));
		logger.info("PASO 6: ¡PLANIFICAR VIAJE COMPLETADO!");
		logger.info("=".repeat(80));
		logger.info(`Tiempo de ejecución: ${executionTime}s`);
		logger.info("");
		logger.info("Detalles del viaje:");
		logger.info(`   Nro Viaje: ${nroViaje}`);
		logger.info(`   Cliente: ${clienteNombre}`);
		logger.info(`   Ruta: ${config.ruta}`);
		logger.info(`   Status: PLANIFICADO`);
		logger.info("=".repeat(80));
	});

	test("Debe planificar un nuevo Viaje con multiplicador de registro = 2", async ({
		viajesPlanificarPage,
		viajesAsignarPage,
		page,
	}, testInfo) => {
		const startTime = Date.now();
		await allure.epic("TMS Legacy Flow");
		await allure.feature("03-Viajes");
		await allure.story("Planificar Viaje Multiplicador");

		logger.info("=".repeat(80));
		logger.info("Iniciando Paso 6: Planificar Viaje con Multiplicador = 2");
		logger.info("=".repeat(80));

		const loadResult = OperationalDataLoader.load<Record<string, any>>(testInfo, {
			logger,
			purpose: "planificar viaje multiplicador",
		});
		
		let operationalData = loadResult?.data || {};
		const dataPath = loadResult?.candidate?.path || DataPathHelper.getLegacyEntityDataPath(testInfo);

		let clienteSource = operationalData.seededCliente || operationalData.cliente;
		let clienteNombreFromData = clienteSource?.nombreFantasia || clienteSource?.nombre;

		if (!clienteNombreFromData) {
			logger.info("⚠️ Cliente no encontrado en el JSON de datos. Autogenerando uno bajo demanda vía UI...");
			const generated = await ClienteHelper.createClienteViaUI(page);
			clienteSource = generated;
			clienteNombreFromData = generated.nombreFantasia || generated.nombre;

			// Escribir el cliente autogenerado en el JSON del worker para asegurar sinergia
			const currentData = fs.existsSync(dataPath) ? JSON.parse(fs.readFileSync(dataPath, "utf-8")) : {};
			currentData.seededCliente = clienteSource;
			fs.writeFileSync(dataPath, JSON.stringify(currentData, null, 2), "utf-8");
			logger.info(`✅ Cliente autogenerado guardado exitosamente en ${dataPath}`);
		} else {
			logger.info(`📦 Usando cliente cargado: "${clienteNombreFromData}" (ID: ${clienteSource.id})`);
		}

		const nroViaje = String(Math.floor(10000 + Math.random() * 90000));
		const isDemo = process.env.ENV === "DEMO";

		const defaults = {
			tipoOperacion: isDemo ? "Distribución" : "Qa_to_std_",
			tipoServicio: isDemo ? "Lcl" : "Qa_TS_",
			tipoViaje: isDemo ? "DIRECTO" : "Normal",
			unidadNegocio: isDemo ? "Defecto" : "Defecto",
			cliente: clienteNombreFromData,
			codigoCarga: isDemo ? "CONTENEDOR DRY" : "Qa_COD_",
			ruta: isDemo ? "47" : "Qa_RT_",
			origenManual: isDemo ? "233_CD SuperZoo_Quilicura" : "405_LA FARFANA_Pudahuel",
			destinoManual: isDemo ? "Divisa" : "CXP ANTOFAGASTA",
		};

		let setupConfig: any = {};
		const setupConfigPaths = DataPathHelper.getSetupConfigDataCandidatePaths(testInfo);
		const setupConfigPath = setupConfigPaths.find((candidatePath) => fs.existsSync(candidatePath));
		if (setupConfigPath) {
			setupConfig = JSON.parse(fs.readFileSync(setupConfigPath, "utf-8"));
		}

		const config = {
			tipoOperacion: setupConfig?.seededTipoOperacion?.nombre || defaults.tipoOperacion,
			tipoServicio: setupConfig?.seededTipoServicio?.nombre || defaults.tipoServicio,
			tipoViaje: defaults.tipoViaje,
			unidadNegocio: setupConfig?.unidadNegocio?.nombre || defaults.unidadNegocio,
			cliente: clienteNombreFromData,
			codigoCarga: setupConfig?.seededCarga?.codigo || defaults.codigoCarga,
			ruta: setupConfig?.ruta?.nro || setupConfig?.ruta?.nombre || defaults.ruta,
			origenManual: setupConfig?.ruta?.origen || defaults.origenManual,
			destinoManual: setupConfig?.ruta?.destino || defaults.destinoManual,
		};

		await allure.parameter("Cliente", config.cliente);
		await allure.parameter("Multiplicador", "2");
		await allure.parameter("Ambiente", process.env.ENV || "QA");
		await allure.attachment(
			"Entidades Cargadas (JSON)",
			JSON.stringify(
				{
					cliente: config.cliente,
					clienteId: clienteSource.id,
					multiplicador: 2,
				},
				null,
				2,
			),
			"application/json",
		);

		await test.step("Fase 1: Navegar", async () => {
			logger.info("Fase 1: Navegar a Planificar Viajes");
			await viajesPlanificarPage.navigate();
			logger.info("Navegación exitosa");
		});

		await test.step("Fase 2: Completar formulario", async () => {
			logger.info("Fase 2: Completar formulario de viaje");
			await viajesPlanificarPage.selectTipoOperacion(config.tipoOperacion);
			await viajesPlanificarPage.selectTipoServicio(config.tipoServicio);
			await viajesPlanificarPage.selectCliente(config.cliente);
			await viajesPlanificarPage.selectTipoViaje(config.tipoViaje);
			await viajesPlanificarPage.selectUnidadNegocio(config.unidadNegocio);
			await viajesPlanificarPage.selectCodigoCarga();

			let rutaAdded = false;
			try {
				rutaAdded = await viajesPlanificarPage.agregarRuta(config.ruta);
			} catch (error) {
				rutaAdded = await viajesPlanificarPage.agregarRuta("Qa_RT_");
			}

			if (!rutaAdded) {
				if (config.origenManual) await viajesPlanificarPage.selectOrigen(config.origenManual);
				if (config.destinoManual) await viajesPlanificarPage.selectDestino(config.destinoManual);
			}

			await viajesPlanificarPage.fillKgViaje("1");

			// Agregar un Tramo para que el Multiplicador de Registro funcione
			const today = new Date();
			const dd = String(today.getDate()).padStart(2, '0');
			const mm = String(today.getMonth() + 1).padStart(2, '0');
			const yyyy = today.getFullYear();
			const hoyStr = `${dd}/${mm}/${yyyy}`;
			await viajesPlanificarPage.addTramo({
				origen: config.origenManual,
				destino: config.destinoManual,
				fechaEntradaOrigen: hoyStr,
				kgOrigen: "1",
			});

			// Configurar el Multiplicador de Registro en 2
			await viajesPlanificarPage.setMultiplicador(2);
			logger.info("Formulario completado con tramos y multiplicador = 2");
		});

		await test.step("Fase 3: Guardar Viaje", async () => {
			logger.info("Fase 3: Guardar Viaje");
			// Guardar (el sistema se queda en /viajes/crear con formulario limpio al usar multiplicador)
			await viajesPlanificarPage.clickGuardar();
			await page.waitForTimeout(5000); // Darle unos segundos al backend para completar la replicación
			logger.info("Formulario guardado con éxito");
		});

		await test.step("Fase 4: Verificación", async () => {
			logger.info("Fase 4: Verificación");
			// Navegar a Asignar para verificar
			await viajesAsignarPage.navigate();

			// 1. Filtrar por Cliente en la grilla para mayor precisión
			logger.info(`Filtrando grilla de asignación por cliente: ${config.cliente}`);
			await viajesAsignarPage.selectClienteFilter(config.cliente);

			// Obtener el ID del viaje más reciente de la primera fila (que será el duplicado)
			const latestIdStr = await viajesAsignarPage.getFirstRowId();
			if (!latestIdStr) {
				throw new Error("❌ No se pudo obtener el ID de la primera fila en la grilla de Asignación.");
			}

			const duplicateId = latestIdStr;
			const masterId = String(Number(duplicateId) - 1);
			logger.info(`IDs identificados secuencialmente -> Maestro: ${masterId}, Duplicado: ${duplicateId}`);

			await allure.parameter("ID Viaje Maestro", masterId);
			await allure.parameter("ID Viaje Tramo", duplicateId);

			// 2. Buscar y verificar el viaje duplicado en la grilla
			const duplicateRow = await viajesAsignarPage.findViajeRow(duplicateId);
			expect(duplicateRow).not.toBeNull();
			if (duplicateRow) {
				const role = await viajesAsignarPage.getRoleViaje(duplicateRow);
				const maestroVal = await viajesAsignarPage.getViajeMaestroVal(duplicateRow);
				logger.info(`✅ Viaje duplicado encontrado. Rol: "${role}", Viaje Maestro Val: "${maestroVal}"`);
				expect(role).toBe("Viaje tramo");
				expect(maestroVal).toBe(masterId);
			}

			// 3. Buscar y verificar el viaje maestro en la grilla
			const masterRow = await viajesAsignarPage.findViajeRow(masterId);
			expect(masterRow).not.toBeNull();
			if (masterRow) {
				const role = await viajesAsignarPage.getRoleViaje(masterRow);
				const maestroVal = await viajesAsignarPage.getViajeMaestroVal(masterRow);
				logger.info(`✅ Viaje maestro encontrado. Rol: "${role}", Viaje Maestro Val: "${maestroVal}"`);
				expect(role).toBe("Viaje maestro");
				expect(maestroVal === "-" || maestroVal === "").toBe(true);
			}

			entityTracker.register({
				type: "Viaje (Maestro)",
				name: `Maestro #${masterId}`,
				id: masterId,
				asociado: config.cliente,
				estado: "PLANIFICADO",
			});
			entityTracker.register({
				type: "Viaje (Tramo)",
				name: `Tramo #${duplicateId}`,
				id: duplicateId,
				asociado: config.cliente,
				estado: "PLANIFICADO",
			});
		});

		const executionTime = ((Date.now() - startTime) / 1000).toFixed(2);
		logger.info(`Test de Multiplicador finalizado con éxito en ${executionTime}s`);
	});
});
