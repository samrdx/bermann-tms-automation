# Design: Automatización Finanzas (Prefactura)

## Technical Approach
Implementar un `PrefacturaPage.ts` en `src/modules/finanzas/` e integrar un test End-to-End Atómico en `tests/e2e/suites/prefactura-crear-e2e.test.ts`. El flujo del E2E consistirá programáticamente en la creación de todas las entidades requeridas: Transportista, Conductor, Vehículo y Cliente (usando NamingHelper), generar un Contrato, despachar y finalizar el Viaje, y finalmente ejecutar la interfaz UI de Prefactura.

## Architecture Decisions

### Decision: Modelo de Ejecución de Pruebas (Atómico + Secuencial Legacy)
**Choice**: Implementar dos flujos: un Test Atómico E2E (`prefactura-crear-e2e.test.ts`) que es extensión del viaje-finalizado E2E, y un Test Secuencial/Legacy (`03-finanzas/prefactura/prefactura-crear.test.ts`).
**Alternatives considered**: Tener solamente uno u otro.
**Rationale**: Mantener compatibilidad con la pipeline legacy del proyecto que ejecuta los tests de forma encadenada utilizando `last-run-data-[browser].json`, y seguir promocionando el estándar de resiliencia atómica para validaciones más profundas sin depender del estado global.

### Decision: Interacciones en la UI de Prefactura
**Choice**: Añadir selectores para "Tipo de moneda", "¿Incluye IVA?" y el botón agregar, según lo especificado por el usuario.
**Rationale**: Refleja con precisión la lógica de negocio requerida en la interfaz de usuario.

## Data Flow

    [Entidades Base] ──→ [Contrato] ──→ [Viaje] ──→ [Módulo Monitoreo] ──→ [Status Finalizado]
          │                                                                      │
          └──────────────────────── Módulo Prefactura ◄──────────────────────────┘
                               (Búsqueda, Moneda, IVA, Agregar a Grilla)

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/modules/finanzas/PrefacturaPage.ts` | Create | POM para la manipulación de selectores y acciones de `/prefactura/crear` e `/index`. |
| `tests/e2e/suites/prefactura-crear-e2e.test.ts` | Create | Script de prueba completo (Atómico) extendido desde `viajes-finalizar-e2e.test.ts`. |
| `tests/e2e/modules/03-finanzas/prefactura/prefactura-crear.test.ts` | Create | Script de prueba Legacy/Smoke que lee el Viaje Finalizado del JSON. |

## Interfaces / Contracts

```typescript
// PrefacturaPage public methods interface 
export interface IPrefacturaPage {
  navigateToCrear(): Promise<void>;
  navigateToIndex(): Promise<void>;
  filtrarViajesPorCliente(clienteName: string, fechaDesde: string, fechaHasta: string): Promise<void>;
  generarPrefactura(cantidadViajes: number): Promise<void>;
  buscarPrefacturaEnIndex(clienteName: string): Promise<void>;
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| E2E   | Prefactura completa de Viajes Finalizados | Aislar entidad Cliente > Viaje con monitoreo fin > Crear Prefactura > Verificación exitosa en Grid |

| Layer | What to Test | Approach | Tool |
|-------|--------------|----------|------|
| Currency | drop_currecy_type | "Pesos Chilenos" | Bootstrap Select |
| Includes IVA | drop_include_tax | "Si" | Bootstrap Select |
| Save Button | #btn_guardar | N/A | ID |

## Technical Implementation

- Ninguna por el momento. Módulo de reportes y UI analizados extensivamente.
