# Tasks: Configuracion de Rutas Multi-Ambiente (QA/DEMO)

## Phase 1: SDD Artifacts

- [x] 1.1 Crear `exploration.md` con estado actual, riesgos y recomendacion.
- [x] 1.2 Crear `proposal.md` con alcance, rollback y criterios de exito.
- [x] 1.3 Crear `spec.md` con requisitos Given/When/Then.
- [x] 1.4 Crear `design.md` con decisiones tecnicas.

## Phase 2: Framework Integration

- [x] 2.1 Crear `src/modules/configAdmin/pages/RutaPage.ts`.
- [x] 2.2 Agregar helper de naming de rutas en `src/utils/NamingHelper.ts`.
- [x] 2.3 Exponer fixture `rutaPage` en `src/fixtures/base.ts`.

## Phase 3: E2E Coverage

- [x] 3.1 Crear `tests/e2e/modules/00-config/ruta-crear.test.ts`.
- [x] 3.2 Incorporar pasos Allure y resumen final en logs/attachment.
- [x] 3.3 Agregar scripts QA/DEMO en `package.json`.
- [x] 3.4 Verificar persistencia post-creacion mediante busqueda en indice (`#search` + `#buscar`).

## Phase 4: Verification

- [x] 4.1 Ejecutar `npx tsc --noEmit`.
- [x] 4.2 Ejecutar `npm run test:qa:entity:ruta`.
- [x] 4.3 Ejecutar `npm run test:demo:entity:ruta`.

## Verification Notes

- `npx tsc --noEmit`: OK.
- `test:qa:entity:ruta`: OK (3 passed: setup + chromium + firefox).
- `test:demo:entity:ruta`: OK (3 passed: setup + chromium + firefox).
- Ajuste aplicado: seleccion aleatoria de zonas en rango `1_..467_` para evitar colisiones de pares fijos.
- Ajuste aplicado: verificacion de registro creado en `/ruta/index` usando `#search` y `#buscar`.
