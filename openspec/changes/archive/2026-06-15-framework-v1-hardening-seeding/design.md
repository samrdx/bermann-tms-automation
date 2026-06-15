# Design: Hardening del PR Gate y Migración de Semántica de Datos V1

## Technical Approach

El enfoque técnico se centra en dos frentes:

1. **Corrección de Semántica de Datos en `DataPathHelper`:**
   - La clase `DataPathHelper` ya tiene las firmas preparadas para el esquema `'v1'`, pero por compatibilidad debemos asegurar que la llamada y el almacenamiento por defecto usen `'v1'`.
   - Las funciones `getSetupConfigDataPath`, `getLegacyEntityDataPath`, `getLegacyBaseDataPath`, `getScopedCargaSetupDataPath` y `getCargaSetupDataPath` deben generar de manera inequívoca los nombres con el formato V1 (`smoke-seed-data-${env}.json` y `e2e-seed-data-${env}.json`).
   - Los fallbacks de lectura en `getLegacyOperationalDataCandidates` seguirán buscando primero el nombre V1 y luego el legacy para evitar errores si no se han regenerado los seeds.

2. **Resolución de Fuga de Selectores (Modal Confirmación):**
   - En `tests/e2e/suites/viajes-asignar-e2e.test.ts` y `tests/e2e/suites/viajes-finalizar-e2e.test.ts`, existe un bloque try/catch que utiliza selectores crudos como `.bootbox-accept` para interactuar con el diálogo modal al guardar la asignación.
   - En lugar de eso, instanciaremos la página `AsignarPage` y delegaremos la interacción llamando a `confirmarAsignacionSiApareceDialogo()` que encapsula el selector dentro del Page Object.

3. **Corrección de Semántica "API" en Suite de Finanzas:**
   - En `tests/e2e/suites/finanzas-prefactura-proforma-e2e.test.ts`, reescribiremos los comentarios y logs de fase que refieran a "API" por "UI seed" o "Preparación por UI".

## Architecture Decisions

### Decision: Reutilizar `AsignarPage.confirmarAsignacionSiApareceDialogo` en lugar de duplicar selectores

**Choice**: Utilizar el método expuesto por el Page Object `AsignarPage`.
**Alternatives considered**: Crear un helper global de modales o duplicar el selector.
**Rationale**: El Page Object `AsignarPage` ya conoce el ciclo de vida del modal de asignación y expone el método `confirmarAsignacionSiApareceDialogo()`. Invocarlo desde los tests del flujo es la forma más limpia y natural bajo el patrón POM para resolver la fuga de selectores.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `tests/e2e/suites/finanzas-prefactura-proforma-e2e.test.ts` | Modify | Reemplazar logs de "Fase 1" que refieren a "(API)" por "(UI seed)" o "(UI)" para evitar confusión semántica. |
| `tests/e2e/suites/viajes-asignar-e2e.test.ts` | Modify | Reemplazar selector crudo `.bootbox-accept` por llamada a `asignarPage.confirmarAsignacionSiApareceDialogo()`. |
| `tests/e2e/suites/viajes-finalizar-e2e.test.ts` | Modify | Reemplazar selector crudo `.bootbox-accept` por llamada a `asignarPage.confirmarAsignacionSiApareceDialogo()`. |
| `tests/api-helpers/DataPathHelper.ts` | Modify | Validar y asegurar que los resolvedores de ruta usen por defecto la versión `'v1'` de los filenames. |

## Interfaces / Contracts

El test delegará la confirmación llamando al Page Object:

```typescript
// En tests/e2e/suites/viajes-asignar-e2e.test.ts
const asignarPage = new AsignarPage(page);
await asignarPage.confirmarAsignacionSiApareceDialogo();
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit / Compilation | Verificar estabilidad de TypeScript | `npm run typecheck` |
| PR Gate Verification | Ejecutar la suite principal de finanzas | `npm run qa:e2e:finanzas-full` |
| E2E Flow Verification | Ejecutar la suite de asignación y finalización | `npx playwright test tests/e2e/suites/viajes-asignar-e2e.test.ts` |

## Migration / Rollout

No data migration required. La capa de compatibilidad de `DataPathHelper.ts` automáticamente lee archivos de datos con el formato legacy si los V1 no existen aún, garantizando retrocompatibilidad al 100%.

## Open Questions

Ninguna.
