# Proposal: Automatización de 'Creación de Pedido' en Última Milla

## Intent

El objetivo es automatizar el flujo de creación de un pedido (`/order/crear`) para el módulo de Última Milla, asegurando la calidad del proceso crítico de ingreso de solicitudes en el ambiente QA. Esto incluye validar campos obligatorios, la visibilidad condicional de campos dinámicos (como dimensiones según tipo de embalaje), la georreferenciación de direcciones y la confirmación del guardado exitoso.

## Scope

### In Scope

- Creación de Test E2E para el flujo de creación de pedido.
- Validación de campo obligatorio 'Fecha Entrega' con mensaje de error específico.
- Selección dinámica de 'Tipo Embalaje' (Caja) y aserción de la aparición de campos 'Cantidad' y 'Volumen'.
- Lógica de dimensiones: Selección de 'Dimensiones', ingreso de Ancho, Largo y Alto, y verificación del cálculo de m3.
- Búsqueda de dirección en Santiago de Chile y aserción de 'Dirección Seleccionada'.
- Confirmación final mediante Toast de éxito y validación de mantención en la URL de creación.
- Restricción de ejecución al ambiente QA usando `env-helper.ts`.
- Creación de `UltimaMillaPage.ts` usando el patrón POM genérico de la skill `tms-page-objects`.
- Creación de `UltimaMillaFactory.ts` para la generación de data (Código 6 dígitos, Teléfono 8 dígitos, etc.) basado en `tms-data`.

### Out of Scope

- Pruebas negativas adicionales no especificadas.
- Edición o anulación de pedidos (se abordará en otros tests/fases).
- Pruebas en ambiente DEMO (restringido explícitamente a QA).

## Approach

Se utilizará el patrón Page Object Model a través de `UltimaMillaPage` y Data Factory a través de `UltimaMillaFactory`. Se emplearán esperas robustas (wait for selector/state) y la utilería `env-helper.ts` (función `isQaMode()`) para deshabilitar el test si no se corre en QA.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `tests/e2e/modules/ultimamilla/pedido-crear.test.ts` | New | Script de prueba principal |
| `src/modules/ultimamilla/pages/UltimaMillaPage.ts` | New | POM para página de creación |
| `src/modules/ultimamilla/factories/UltimaMillaFactory.ts` | New | Generación de data |
| `src/fixtures/base.ts` | Modified | Registrar nuevos POM y Factory |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Inestabilidad en buscador de direcciones | Medium | Usar esperas de la red y tiempos dinámicos asegurando carga de opciones de Google Maps / backend. |
| Selectores auto-generados cambian | Low | Identificar `id`, `data-id` exactos desde el DOM real usando las directrices de `tms-selectors`. |

## Rollback Plan

Eliminar la carpeta `tests/e2e/modules/ultimamilla` y revertir los cambios de `fixtures/base.ts`.

## Dependencies

- Requiere usuario `arivas` en QA para flujo exitoso de login (resuelto via `getTestUser()`).

## Success Criteria

- [x] Test E2E principal ejecuta de inicio a fin en QA exitosamente.
- [x] Validaciones condicionales y de cálculo de volumen operan sin falsos positivos.
- [x] Test finalizado y ejecutando establemente bajo GH Actions o NPM run localmente en Chromium y Firefox.
