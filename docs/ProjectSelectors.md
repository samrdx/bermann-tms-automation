# Project Selectors

This document centralizes all CSS selectors used across the project's Page Object Models (POM).

## AsignarPage

| Nombre | Selector | Prioridad |
| :--- | :--- | :--- |
| **assignment.btnGuardar** | `#btn_guardar_form` | Alta |
| **table.container** | `#tabla_asignar` | Alta |
| **table.rows** | `#tabla_asignar tbody tr` | Baja |

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
| **poligonosButton** | `button[data-id="clientes-poligonos"]` | Alta |
| **transportistasButton** | `button[data-id="clientes-transportistas"]` | Alta |
| **email** | `#clientes-email` | Alta |
| **telefono** | `#clientes-telefono` | Alta |
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
| **btnGuardar** | `#btn_guardar` | Alta |
| **errorMessages** | `.text-danger, .help-block, .alert-danger, .toast-message` | Baja |
| **tipoContratoDropdown** | `.filter-option-inner-inner` | Baja |
| **tipoContratoOption** | `.dropdown-item[role="option"]` | Baja |
| **transportistaButton** | `button[data-id="contrato-transportista_id"]` | Alta |
| **transportistaOptions** | `.dropdown-menu.show .dropdown-item` | Baja |
| **fechaVencimiento** | `#contrato-fecha_vencimiento` | Alta |
| **valorHora** | `#contrato-valor_hora` | Alta |
| **modalidadButton** | `.btn.dropdown-toggle.btn-light[data-id="modalidad_contrato"]` | Baja |
| **modalidadOption** | `.dropdown-item.selected.active` | Baja |
| **archivosAdjuntos** | `input[type="file"][name="adjuntos[]"]` | Baja |
| **btnVolver** | `a.btn.btn-primary[href="/contrato/index"]` | Media |
| **invalidField** | `[aria-invalid="true"]` | Baja |
| **helpBlock** | `.help-block.badge.badge-danger` | Baja |
| **btnOutlineSuccess** | `.btn.btn-outline-success.btn-sm` | Baja |
| **btnPlus1413** | `#btn_plus_1413` | Alta |
| **btnCerrarModal** | `.btn.btn-secondary.waves-effect.waves-light` | Baja |
| **btnAddCarga** | `#btn_click_1413` | Alta |
| **btnAddRuta** | `#btn_plus_ruta_1413_2` | Alta |
| **inputTarifaViaje** | `#txt_tarifa_extra_1413` | Alta |
| **inputTarifaConductor** | `#txt_tarifa_conductor_1413` | Alta |

## DashboardPage

| Nombre | Selector | Prioridad |
| :--- | :--- | :--- |
| **menuHome** | `.fal.fa-home` | Baja |
| **menuViajes** | `.fal.fa-truck` | Baja |
| **menuNotificaciones** | `.fas.fa-bell` | Baja |
| **menuHamburger** | `.mdi.mdi-menu` | Baja |
| **userDropdown** | `.nav-link.dropdown-toggle.nav-user:not(#main_notification)` | Baja |
| **userDropdownOpen** | `.dropdown-menu.profile-dropdown.show` | Baja |
| **logoutButton** | `a[href="/login/cerrarsesion"]` | Media |
| **planificarViajes** | `a[href="/viajes/crear"]` | Media |
| **logoMin** | `.logo-min` | Baja |
| **pageTitle** | `title` | Baja |

## LoginPage

| Nombre | Selector | Prioridad |
| :--- | :--- | :--- |
| **usernameInput** | `#login-usuario` | Alta |
| **passwordInput** | `#login-clave` | Alta |
| **loginButton** | `button[type="submit"].btn-success` | Media |
| **errorMessage** | `[data-notify="message"]` | Media |
| **logoMin** | `.logo-min` | Baja |
| **forgotPasswordLink** | `a[href="/clave/envioclave"]` | Media |

## MonitoreoPage

| Nombre | Selector | Prioridad |
| :--- | :--- | :--- |
| **filtroIdViaje** | `#id` | Alta |
| **contenedor** | `#registros` | Alta |
| **modalVisible** | `.modal.show, .modal.fade.show, .modal[style*="display: block"]` | Baja |
| **btnConfirmar** | `.bootbox-accept, button:has-text("Aceptar"), button:has-text("Confirmar")` | Baja |

## PlanificarPage

| Nombre | Selector | Prioridad |
| :--- | :--- | :--- |
| **nroViaje** | `#viajes-nro_viaje` | Alta |
| **numeroPlanilla** | `#viajes-numero_planilla` | Alta |
| **valorFlete** | `#viajes-valor_flete` | Alta |
| **btnTipoOperacion** | `button[data-id="tipo_operacion_form"]` | Alta |
| **btnTipoServicio** | `button[data-id="viajes-tipo_servicio_id"]` | Alta |
| **btnTipoViaje** | `button[data-id="viajes-tipo_viaje_id"]` | Alta |
| **btnUnidadNegocio** | `button[data-id="viajes-unidad_negocio_id"]` | Alta |
| **btnCodigoCarga** | `button[data-id="viajes-carga_id"]` | Alta |
| **btnCliente** | `button[data-id="viajes-cliente_id"]` | Alta |
| **btnAgregarRuta** | `button:has-text("Agregar Ruta")` | Baja |
| **modalRutas** | `#modalRutasSugeridas` | Alta |
| **tablaRutas** | `#tabla-rutas tbody tr` | Baja |
| **btnOrigen** | `button[data-id="_origendestinoform-origen"]` | Alta |
| **btnDestino** | `button[data-id="_origendestinoform-destino"]` | Alta |
| **btnGuardar** | `#btn_guardar_form` | Alta |
| **fechaEntradaOrigen** | `#_origendestinoform-fechaentradaorigen` | Alta |

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
