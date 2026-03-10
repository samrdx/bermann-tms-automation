# Proposal: Finanzas - Prefactura Module

## Intent

Define and implement the automated flow for Prefactura creation in Bermann TMS, ensuring the correct selection of currency and IVA.

## Scope

- **Module**: Finanzas (Prefactura)
- **Features**:
  - Filter trips by client.
  - Select currency (Pesos Chilenos).
  - Select IVA (Si).
  - Add trips to prefactura.
  - Save prefactura.
- **Tests**:
  - `tests/e2e/suites/prefactura-crear-e2e.test.ts` (Atomic E2E)
  - Integration in `package.json` scripts.

## Approach

- Update `PrefacturaPage.ts` with robust selectors and helper methods.
- Implement `selectBootstrapOption` with JS fallbacks.
- Add specific waits for AJAX-dependent fields.

## Verification Plan

### Automated Tests
- Ejecutar el test atómico: `npx playwright test tests/e2e/suites/prefactura-crear-e2e.test.ts`

### Manual Verification
- Verificar en browser que al seleccionar un cliente `Qa_`, el campo "Tipo de moneda" se habilite y permita seleccionar "Pesos Chilenos".
- Confirmar que al filtrar aparezca al menos un viaje y el botón "Agregar" (check verde) sea clickable.

## Prefactura Selection Logic Updates

### Goal Description
Asegurar la selección correcta de "Pesos Chilenos" para moneda y "Si" para IVA.

### Implementation Details
- Se implementó una lógica de reintento con JS fallback en `selectBootstrapOption`.
- Se añadieron esperas explícitas para la carga de dependencias entre campos del formulario.

## Rollback Plan
Si los tests demuestran inestabilidad, se marcarán con `test.skip()` hasta estabilizar los selectores.
