# Design: Automatización de 'Creación de Pedido' en Última Milla

## Technical Approach

Implementar un script de prueba E2E utilizando Playwright bajo TypeScript, estructurado con el patrón Page Object Model (POM) y Data Factories del framework Bermann TMS. El script se asegurará de correr exclusivamente en el ambiente de QA utilizando la función utilitaria preexistente `env-helper.ts`.

## Architecture Decisions

### Decision: Inclusión de módulo UltimaMilla al framework

**Choice**: Se creará una estructura paralela para `ultimamilla` dentro de `src/modules/` al igual que los módulos de `auth`, `commercial`, `contracts`, `monitoring`, `planning`, `transport`.
**Alternatives considered**: Colocar los POMs interactuando de forma genérica en rutas sueltas.
**Rationale**: Mantiene el principio de Domain-Driven Modules establecido en el framework y asegura escalabilidad futura del módulo de Última Milla.

### Decision: Filtro estricto por Ambiente (QA)

**Choice**: Usar `isQaMode()` dentro del test para evitar que las pruebas interfieran con DEMO.
**Alternatives considered**: Confiar solamente en los tags del test runner (e.g. `npx playwright test --grep @qa`).
**Rationale**: El requerimiento dicta limitación estricta dentro de la propia lógica ("Asegúrate de que corra solo en QA"). Un `if (!isQaMode()) test.skip()` es la defensa en profundidad más robusta.

## Data Flow

    Factory (Random Data) ──→ UltimaMillaPage (Actions) ──→ Playwright (DOM/Browser)
                                  │
                          Assertions (expect)
                                  │
                            Test Report (UI)

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/modules/ultimamilla/pages/UltimaMillaPage.ts` | Create | POM con selectores (id, data-id prioritarios) y métodos para `/order/crear`. |
| `src/modules/ultimamilla/factories/UltimaMillaFactory.ts` | Create | Factory de generación de datos requeridos por la orden. |
| `src/fixtures/base.ts` | Modify | Registrar `ultimaMillaPage` y `ultimaMillaFactory`. |
| `tests/e2e/modules/ultimamilla/pedido-crear.test.ts` | Create | Test E2E principal estructurado por fases. |

## Interfaces / Contracts

```typescript
// en UltimaMillaFactory.ts
export interface UltimaMillaOrderData {
  codigoPedido: string; // 6 dígitos
  nombreCliente: string;
  correo: string;
  telefono: string; // 8 dígitos
  fechaEntrega: string; // Ej: "31-12-2026"
  direccionBusqueda: string; // Ej: "Providencia, Santiago, Chile"
  dimensiones: {
    ancho: string; // max 5 digits
    largo: string; // max 5 digits
    alto: string; // max 5 digits
  }
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| E2E | Creación completa de Pedido de Última Milla | Test Playwright (Chromium y Firefox) validando DOM, cálculos dinámicos de UI y Toasts. |

## Migration / Rollout

No migration required.
