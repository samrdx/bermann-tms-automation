# Project Selectors

This document centralizes all CSS selectors used across the project's Page Object Models (POM).

## AsignarViajesPage

| Nombre | Selector | Prioridad |
| :--- | :--- | :--- |
| **assignment.perfilTemperatura** | `#perfil_temperatura` | Media |
| **assignment.perfilTemperaturaBtn** | `button[data-id="perfil_temperatura"]` | Alta |
| **assignment.transportista** | `#transportista` | Media |
| **assignment.transportistaBtn** | `button[data-id="transportista"]` | Alta |
| **assignment.patentePrincipal** | `#patente_principal` | Media |
| **assignment.patentePrincipalBtn** | `button[data-id="patente_principal"]` | Alta |
| **assignment.patenteSecundaria** | `#patente_secundaria` | Media |
| **assignment.patenteSecundariaBtn** | `button[data-id="patente_secundaria"]` | Alta |
| **assignment.conductores** | `#conductores` | Media |
| **assignment.conductoresBtn** | `button[data-id="conductores"]` | Alta |
| **assignment.recalcular** | `#recalcular` | Media |
| **assignment.btnGuardar** | `#guardar` | Alta |
| **assignment.btnCerrar** | `a.btn.btn-secondary` | Alta |
| **table.container** | `#tabla_asignar` | Media |
| **table.tbody** | `#tabla_asignar tbody` | Media |
| **table.rows** | `#tabla_asignar tbody tr` | Media |
| **pagination.previous** | `.page-link.previous` | Alta |
| **pagination.next** | `.page-link.next` | Alta |
| **pagination.pageLinks** | `.page-link` | Media |
| **dropdownMenu** | `.dropdown-menu.show` | Media |
| **dropdownSearch** | `.bs-searchbox input` | Alta |
| **dropdownItem** | `.dropdown-item` | Media |

## ClienteFormPage

| Nombre | Selector | Prioridad |
| :--- | :--- | :--- |
| **nombre** | `#clientes-nombre` | Alta |
| **rut** | `#clientes-rut` | Alta |
| **nombreFantasia** | `#clientes-nombre_fantasia` | Alta |
| **calle** | `#clientes-calle` | Alta |
| **altura** | `#clientes-altura` | Alta |
| **otros** | `#clientes-otros` | Alta |
| **tipoClienteButton** | `button[data-id="clientes-tipo_cliente_id"]` | Alta |
| **regionButton** | `button[data-id="clientes-region_id"]` | Alta |
| **ciudadButton** | `button[data-id="clientes-ciudad_id"]` | Alta |
| **comunaButton** | `button[data-id="clientes-comuna_id"]` | Alta |
| **btnGuardar** | `#btn_guardar` | Alta |
| **invalidField** | `[aria-invalid="true"]` | Baja |

## ConductorFormPage

| Nombre | Selector | Prioridad |
| :--- | :--- | :--- |
| **usuario** | `#conductores-usuario` | Alta |
| **clave** | `#conductores-clave` | Alta |
| **nombre** | `#conductores-nombre` | Alta |
| **apellido** | `#conductores-apellido` | Alta |
| **documento** | `#conductores-documento` | Alta |
| **telefono** | `#conductores-telefono` | Alta |
| **email** | `#conductores-email` | Alta |
| **vencimientoLicencia** | `#conductores-vencimiento_licencia` | Alta |
| **transportistaButton** | `button[data-id="conductores-transportista_id"]` | Alta |
| **extranjeroButton** | `button[data-id="conductores-extranjero"]` | Alta |
| **licenciaButton** | `button[data-id="conductores-licencia"]` | Alta |
| **btnGuardar** | `#btn_guardar` | Alta |
| **invalidField** | `[aria-invalid="true"]` | Baja |

## ContratosFormPage

| Nombre | Selector | Prioridad |
| :--- | :--- | :--- |
| **nroContrato** | `#contrato-nro_contrato` | Alta |
| **tipoContratoDropdown** | `.filter-option-inner-inner` | Alta |
| **tipoContratoOption** | `.dropdown-item[role="option"]` | Alta |
| **transportistaButton** | `button[data-id="contrato-transportista_id"]` | Alta |
| **transportistaOptions** | `.dropdown-menu.show .dropdown-item` | Media |
| **fechaVencimiento** | `#contrato-fecha_vencimiento` | Alta |
| **valorHora** | `#contrato-valor_hora` | Alta |
| **modalidadButton** | `.btn.dropdown-toggle.btn-light[data-id="modalidad_contrato"]` | Media |
| **modalidadOption** | `.dropdown-item.selected.active` | Media |
| **archivosAdjuntos** | `input[type="file"][name="adjuntos[]"]` | Baja |
| **btnGuardar** | `#btn_guardar` | Alta |
| **btnVolver** | `a.btn.btn-primary[href="/contrato/index"]` | Media |
| **invalidField** | `[aria-invalid="true"]` | Baja |
| **helpBlock** | `.help-block.badge.badge-danger` | Baja |
| **btnOutlineSuccess** | `.btn.btn-outline-success.btn-sm` | Media |
| **btnPlus715** | `#btn_plus_715` | Media |
| **btnCerrarModal** | `.btn.btn-secondary.waves-effect.waves-light` | Baja |
| **btnAddCarga** | `#btn_click_715` | Media |
| **btnAddRuta** | `#btn_plus_ruta_715_19` | Media |
| **inputTarifaViaje** | `#txt_tarifa_extra_715` | Media |
| **inputTarifaConductor** | `#txt_tarifa_conductor_715` | Media |

## DashboardPage

| Nombre | Selector | Prioridad |
| :--- | :--- | :--- |
| **menuHome** | `.fal.fa-home` | Alta |
| **menuViajes** | `.fal.fa-truck` | Alta |
| **menuNotificaciones** | `.fas.fa-bell` | Baja |
| **menuHamburger** | `.mdi.mdi-menu` | Media |
| **userDropdown** | `.nav-link.dropdown-toggle.nav-user:not(#main_notification)` | Alta |
| **userDropdownOpen** | `.dropdown-menu.profile-dropdown.show` | Media |
| **logoutButton** | `a[href="/login/cerrarsesion"]` | Alta |
| **planificarViajes** | `a[href="/viajes/crear"]` | Alta |
| **logoMin** | `.logo-min` | Media |
| **pageTitle** | `title` | Baja |

## LoginPage

| Nombre | Selector | Prioridad |
| :--- | :--- | :--- |
| **usernameInput** | `#login-usuario` | Alta |
| **passwordInput** | `#login-clave` | Alta |
| **loginButton** | `button[type="submit"].btn-success` | Alta |
| **errorMessage** | `[data-notify="message"]` | Baja |
| **forgotPasswordLink** | `a[href="/clave/envioclave"]` | Media |
| **invalidField** | `[aria-invalid="true"]` | Baja |
| **logoMin** | `.logo-min` | Media |

## PlanificarViajesPage

| Nombre | Selector | Prioridad |
| :--- | :--- | :--- |
| **nroViaje** | `#viajes-nro_viaje` | Alta |
| **numeroPlanilla** | `#viajes-numero_planilla` | Alta |
| **valorFlete** | `#viajes-valor_flete` | Alta |
| **tipoOperacion** | `#tipo_operacion_form` | Alta |
| **cliente** | `#viajes-cliente_id` | Alta |
| **tipoServicio** | `#viajes-tipo_servicio_id` | Alta |
| **tipoViaje** | `#viajes-tipo_viaje_id` | Alta |
| **unidadNegocio** | `#viajes-unidad_negocio_id` | Alta |
| **codigoCarga** | `#viajes-carga_id` | Alta |
| **btnAgregarRuta** | `button:has-text("Agregar Ruta")` | Alta |
| **modalRutas** | `#modalRutasSugeridas` | Media |
| **tablaRutas** | `#tabla-rutas tbody tr` | Media |
| **origen** | `#_origendestinoform-origen` | Alta |
| **destino** | `#_origendestinoform-destino` | Alta |
| **fechaEntradaOrigen** | `#_origendestinoform-fechaentradaorigen` | Alta |
| **btnGuardar** | `#btn_guardar_form` | Alta |
| **btnVolver** | `a[href="/viajes/index"]` | Media |

## TransportistaFormPage

| Nombre | Selector | Prioridad |
| :--- | :--- | :--- |
| **nombre** | `#transportistas-nombre` | Alta |
| **razonSocial** | `#transportistas-razon_social` | Alta |
| **documento** | `#transportistas-documento` | Alta |
| **calle** | `#transportistas-calle` | Alta |
| **altura** | `#transportistas-altura` | Alta |
| **otros** | `#transportistas-otros` | Alta |
| **descuento** | `#transportistas-descuento` | Alta |
| **tipoTransportistaButton** | `button[data-id="transportistas-tipo_transportista_id"]` | Alta |
| **regionButton** | `button[data-id="transportistas-region_id"]` | Alta |
| **ciudadButton** | `button[data-id="transportistas-ciudad_id"]` | Alta |
| **comunaButton** | `button[data-id="transportistas-comuna_id"]` | Alta |
| **formaPagoButton** | `button[data-id="transportistas-forma_pago_id"]` | Alta |
| **tercerizarButton** | `button[data-id="transportistas-tercerizar"]` | Alta |
| **btnGuardar** | `#btn_guardar` | Alta |
| **invalidField** | `[aria-invalid="true"]` | Baja |

## VehiculoFormPage

| Nombre | Selector | Prioridad |
| :--- | :--- | :--- |
| **patente** | `#vehiculos-patente` | Alta |
| **muestra** | `#vehiculos-muestra` | Alta |
| **tipoVehiculoButton** | `button[data-id="vehiculos-tipo_vehiculo_id"]` | Alta |
| **tipoRamplaButton** | `button[data-id="vehiculos-tipo_rampla_id"]` | Alta |
| **transportistaButton** | `button[data-id="vehiculos-transportista_id"]` | Alta |
| **capacidadButton** | `button[data-id="vehiculos-capacidad_id"]` | Alta |
| **btnGuardar** | `#btn_guardar` | Alta |
| **invalidField** | `[aria-invalid="true"]` | Baja |