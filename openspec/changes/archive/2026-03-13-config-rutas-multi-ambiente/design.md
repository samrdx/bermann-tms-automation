# Design: Configuracion de Rutas Multi-Ambiente (QA/DEMO)

## Technical Approach

Se implementa un nuevo Page Object `RutaPage` dentro de `configAdmin` para encapsular la creacion de rutas en `/ruta/crear`.  
La seleccion de Origen/Destino se hace con estrategia estricta:

1. Abrir dropdown por boton candidato.
2. Esperar opcion hardcodeada.
3. Seleccionar opcion exacta.
4. Esperar 1-2 segundos para cascadas.

Si cualquier seleccion falla, se captura screenshot y se lanza error.

## Architecture Decisions

### Decision: Naming by environment

- **Choice**: `Qa_RT_...` en QA y `Demo_RT_...` en DEMO.
- **Rationale**: facilita trazabilidad y limpieza por ambiente.

### Decision: Strict hardcoded zones

- **Choice**: no fallback dinamico para origen/destino.
- **Rationale**: cumple requerimiento funcional de validacion estricta.

### Decision: Save selector fallback

- **Choice**: selector principal `#btn_guardar` + fallback por texto `Guardar`.
- **Rationale**: formularios legacy del TMS no siempre mantienen un unico selector de accion.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/modules/configAdmin/pages/RutaPage.ts` | New | Encapsula flujo de creacion de ruta |
| `src/utils/NamingHelper.ts` | Modified | Agrega helper `getRutaData()` |
| `src/fixtures/base.ts` | Modified | Expone fixture `rutaPage` |
| `tests/e2e/modules/00-config/ruta-crear.test.ts` | New | Test E2E con Allure + resumen |
| `package.json` | Modified | Scripts de ejecucion QA/DEMO |

## Sequence

1. Test obtiene `rutaData` segun `ENV`.
2. Test navega con `RutaPage.navigateToCreate()`.
3. Test llama `RutaPage.crearRuta(rutaData)`.
4. Page Object completa campos y selecciona zonas hardcodeadas.
5. Page Object guarda y valida `isFormSaved()`.
6. Test genera resumen final en logs y attachment de Allure.

## Selector Discovery Notes

- Selectores base confirmados por requerimiento:
  - `#ruta-nombre_ruta`
  - `#ruta-nro_ruta`
  - opcion origen `1_Agunsa_Lampa_RM`
  - opcion destino `237_Starken_Valdivia`
- Selector de guardado aplicado con fallback:
  - principal `#btn_guardar`
  - alterno `button:has-text("Guardar")`
- Validacion runtime realizada via Playwright execution snapshots (`error-context.md`) para confirmar estructura de formulario y alertas UI.
