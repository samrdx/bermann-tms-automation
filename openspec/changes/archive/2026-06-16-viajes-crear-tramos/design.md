# Design: Viajes - Crear Tramos

## Technical Approach

Extender `PlanificarPage` para soportar creación explícita de tramos (origen/destino/fecha) antes de guardar el viaje en `/viajes/crear`. Se mantiene el patrón actual del módulo: Bootstrap Select robusto + fallback JS + validación posterior en grilla de `/viajes/asignar`.

> Nota: no se encontró `proposal.md` del change en `openspec/changes/viajes-crear-tramos`; este diseño usa el comportamiento existente de `PlanificarPage` y `viajes-planificar.test.ts` como baseline.

## Architecture Decisions

### Decision Table

| Option                                                    | Tradeoff                                                    | Decision                                                             |
| --------------------------------------------------------- | ----------------------------------------------------------- | -------------------------------------------------------------------- |
| Modificar `viajes-planificar.test.ts` para incluir tramos | Menos archivos, pero mayor complejidad en un test existente | ✅ Elegido: preserva flujo legacy ya integrado con JSON de entidades |
| Crear test nuevo `viajes-crear-tramos.test.ts`            | Aisla mejor, pero duplica setup y datos                     | ❌ No elegido para esta fase                                         |
| Crear `TramosSection` separado                            | Mejor separación, pero sobrediseño para alcance actual      | ❌ No elegido; se agrega al `PlanificarPage` actual                  |

### Decision Table (Selectores)

| Option                                            | Tradeoff                               | Decision      |
| ------------------------------------------------- | -------------------------------------- | ------------- |
| Usar IDs/data-id confirmados y fallback por texto | Más código defensivo, menos flaky      | ✅ Elegido    |
| Selectores sólo por texto visible                 | Frágil entre QA/Demo                   | ❌ No elegido |
| XPath absoluto                                    | Rápido de escribir, alta inestabilidad | ❌ No elegido |

## Data Flow

```text
Test viajes-planificar
  -> PlanificarPage.navigate(/viajes/crear)
  -> completar campos base (operación/servicio/cliente/carga)
  -> crear tramo(s) [origen, destino, fechaEntrada]
  -> assert tramo en tabla/resumen
  -> click Guardar
  -> redirect /viajes/(editar|ver)
  -> AsignarPage.findViajeRow(nroViaje|id)
  -> assert estado PLANIFICADO
```

Secuencia crítica de tramos:

```text
Test -> PlanificarPage.addTramo(data)
PlanificarPage -> Bootstrap Select (origen/destino)
PlanificarPage -> input fechaEntrada
PlanificarPage -> botón Agregar tramo
PlanificarPage -> tabla tramos (count + contenido)
```

## File Changes

| File                                                                | Action | Description                                                     |
| ------------------------------------------------------------------- | ------ | --------------------------------------------------------------- |
| `src/modules/planning/pages/PlanificarPage.ts`                      | Modify | Agregar métodos de tramos y assertions de UI intermedia.        |
| `tests/e2e/modules/02-operaciones/viajes/viajes-planificar.test.ts` | Modify | Integrar fase “Crear Tramo(s)” y validaciones antes de guardar. |
| `docs/ProjectSelectors.md`                                          | Modify | Registrar selectores reales de tramos descubiertos.             |
| `docs/project-selectors.csv`                                        | Modify | Agregar filas de selectores de tramos con prioridad.            |

## Interfaces / Contracts

```ts
export interface TramoInput {
  origen: string;
  destino: string;
  fechaEntradaOrigen?: string; // yyyy-mm-dd
}

// PlanificarPage (new public methods)
addTramo(tramo: TramoInput): Promise<void>;
addTramos(tramos: TramoInput[]): Promise<void>;
getTramosCount(): Promise<number>;
assertTramoVisible(tramo: TramoInput): Promise<void>;
```

### Selector Contract (initial)

- Confirmados:
  - `button[data-id="_origendestinoform-origen"]`
  - `button[data-id="_origendestinoform-destino"]`
  - `#_origendestinoform-fechaentradaorigen`
  - `#btn_guardar_form`
- A descubrir/normalizar en implementación (con fallback):
  - Botón agregar tramo: `button:has-text("Agregar Tramo")` o equivalente
  - Tabla/lista tramos: `#tabla-tramos tbody tr` o `table tbody tr` dentro del bloque Origen/Destino

## Assertions Plan

- UI intermedia:
  1. `getTramosCount()` incrementa tras `addTramo`.
  2. `assertTramoVisible` valida texto origen/destino en fila.
  3. Si fecha se envía, validar valor visible o persistido en input.
- Guardado: 4. URL final sale de `/viajes/crear` y contiene `/viajes/editar/` o `/viajes/ver/`. 5. En `/viajes/asignar`, `findViajeRow` retorna fila para `nroViaje` o ID interno (Demo).

## Testing Strategy

| Layer       | What to Test                                | Approach                                                                                  |
| ----------- | ------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Page Object | `addTramo`, `addTramos`, validaciones tabla | Playwright test focalizado sobre `/viajes/crear` con datos controlados.                   |
| Integration | Flujo planificar + guardar                  | Extender `viajes-planificar.test.ts` con fase de tramos.                                  |
| E2E         | No regresión en QA/Demo                     | Ejecutar `test:viajes:planificar` en ambos ambientes y verificar persistencia en asignar. |

## Migration / Rollout

No migration required. Rollout en 2 pasos: (1) habilitar métodos en Page Object, (2) activar fase de tramos en test legacy.

## Open Questions

- [ ] Confirmar ruta exacta del proposal de `viajes-crear-tramos`.
- [ ] Confirmar selector final del botón “Agregar Tramo” en QA y Demo.
- [ ] Definir si el alcance exige 1 tramo mínimo o múltiples tramos obligatorios.
