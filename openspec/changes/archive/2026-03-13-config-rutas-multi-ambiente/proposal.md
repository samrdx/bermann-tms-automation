# Proposal: Configuracion de Rutas Multi-Ambiente (QA/DEMO)

## Intent

Automatizar la creacion de rutas comerciales para QA y DEMO en el modulo `00-config`, asegurando trazabilidad por ambiente, seleccion estricta de origen/destino y reporteria estandar (Winston + Allure).

## Scope

### In Scope
- Crear `RutaPage` con metodo `crearRuta(...)` y manejo robusto de errores.
- Agregar naming helper de ruta por ambiente (`Qa_RT_` / `Demo_RT_`).
- Exponer fixture `rutaPage` en `src/fixtures/base.ts`.
- Crear test `ruta-crear.test.ts` con `test.step`, Allure y resumen final.
- Agregar scripts NPM para QA/DEMO en ejecucion headless y headed.
- Crear artefactos SDD del cambio (exploration, proposal, spec, design, tasks).

### Out of Scope
- Refactor general de otros modulos de configuracion.
- Cambios de negocio en el backend de rutas.
- Mantenimiento de catalogos maestros de zonas.

## Approach

Implementar un Page Object nuevo en `configAdmin` que encapsule:
- Navegacion a `/ruta/crear`.
- Completado de `nombre` y `nro ruta`.
- Seleccion estricta de origen/destino hardcodeados (sin fallback dinamico).
- Guardado con verificaciones y evidencia en error.

El test de modulo orquesta el flujo, adjunta metadatos a Allure y deja un resumen final en log/attachment.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/modules/configAdmin/pages/RutaPage.ts` | New | POM para creacion de rutas |
| `src/utils/NamingHelper.ts` | Modified | Helper de naming `Qa_RT_` / `Demo_RT_` |
| `src/fixtures/base.ts` | Modified | Fixture tipado `rutaPage` |
| `tests/e2e/modules/00-config/ruta-crear.test.ts` | New | Test E2E de ruta multi-ambiente |
| `package.json` | Modified | Scripts QA/DEMO para entidad Ruta |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Opcion hardcodeada no disponible en ambiente | Medium | Fallar rapido con screenshot y error descriptivo |
| Selector de Guardar no uniforme | Medium | Usar selector primario + fallback por texto |
| Redireccion post-guardado variable | Low | Verificar varias rutas esperadas (`index`/`ver`) |

## Rollback Plan

Revertir el commit del cambio (`git revert <commit>`) para eliminar `RutaPage`, fixture, test y scripts sin afectar pruebas existentes.

## Dependencies

- Credenciales validas en `.env`.
- Zonas de origen/destino hardcodeadas presentes en QA/DEMO.
- Configuracion Allure ya operativa (existente en el proyecto).

## Success Criteria

- [ ] `npx tsc --noEmit` sin errores por los nuevos cambios.
- [ ] `npm run test:qa:entity:ruta` ejecuta el flujo de creacion de ruta.
- [ ] `npm run test:demo:entity:ruta` ejecuta el flujo de creacion de ruta.
- [ ] El test registra resumen final con emojis requeridos y attachment de Allure.
