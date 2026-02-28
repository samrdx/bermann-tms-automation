# Tasks: Automatización de 'Creación de Pedido' en Última Milla

## Phase 1: Infrastructure / Foundation

- [x] 1.1 Crear `src/modules/ultimamilla/factories/UltimaMillaFactory.ts` para la generación de data (código de 6 dígitos, nombre, correo, teléfono de 8 dígitos).
- [x] 1.2 Crear esqueleto de `src/modules/ultimamilla/pages/UltimaMillaPage.ts` usando la plantilla de `BasePage`.

## Phase 2: Core Implementation (UI Interaction)

- [x] 2.1 Mapear los selectores reales para la página `/order/crear` en la propiedad `selectors` de `UltimaMillaPage.ts` usando herramientas del explorador (Playwright MCP para ver DOM real en QA).
- [x] 2.2 Implementar método en `UltimaMillaPage.ts` para interactuar con la dirección (búsqueda y validación de 'Dirección Seleccionada').
- [x] 2.3 Implementar métodos para el manejo del Tipo de Embalaje, validando el despliegue de Cantidad y Volumen.
- [x] 2.4 Implementar métodos para insertar dimensiones (Ancho, Largo, Alto) y extraer/validar el cálculo en `m3`.
- [x] 2.5 Implementar validaciones de fecha (testear que falta y recibir mensaje rojo).

## Phase 3: Integration / Wiring

- [x] 3.1 Registrar `ultimaMillaPage` y `ultimaMillaFactory` en `src/fixtures/base.ts`.
- [x] 3.2 Crear `tests/e2e/modules/ultimamilla/pedido-crear.test.ts`.
- [x] 3.3 Construir la estructura del test (Phases: 0-Setup, 1-Login, 2-Nav, 3-Validar Fecha, 4-Formulario y Dimensiones, 5-Dirección, 6-Guardado y Toast).

## Phase 4: Testing & Polish

- [x] 4.1 Ejecutar el test localmente asegurando que un fallo o el guardado emitan Logs (Winston) correctamente.
- [x] 4.2 Validar explícitamente el uso de `env-helper.js` (`isQaMode`) como defensa inicial en el bloque del test.
