# Exploration: Configuracion de Rutas Multi-Ambiente (QA/DEMO)

## Current State

- Existe cobertura de `00-config` para `UnidadNegocio` y `TipoCarga`, pero no para Rutas.
- El framework ya soporta QA/DEMO por `ENV` y `baseURL` en `playwright.config.ts`.
- Hay patrones robustos para dropdowns Bootstrap, logging con Winston y Allure en tests.
- No existe hoy `RutaPage`, ni fixture `rutaPage`, ni scripts NPM para entidad Ruta.

## Affected Areas

- `src/modules/configAdmin/pages/` - Nuevo Page Object para crear rutas.
- `src/utils/NamingHelper.ts` - Nuevo helper de naming para rutas por ambiente.
- `src/fixtures/base.ts` - Exponer fixture tipado para `RutaPage`.
- `tests/e2e/modules/00-config/` - Nuevo test E2E de creacion de ruta.
- `package.json` - Scripts QA/DEMO para ejecutar la nueva prueba.

## Approaches

1. **Page Object dedicado + test por modulo**
   - Pros: mantiene arquitectura actual, reutilizable, menor acoplamiento.
   - Cons: requiere agregar fixture y ajustes de wiring.
   - Effort: Medium

2. **Automatizacion inline en test sin POM**
   - Pros: implementacion inicial mas rapida.
   - Cons: rompe convenciones del proyecto y aumenta deuda tecnica.
   - Effort: Low

## Recommendation

Adoptar **Page Object dedicado + test por modulo** para cumplir AGENTS.md, reutilizar patrones estables de dropdown y dejar soporte multi-ambiente consistente con el resto de `00-config`.

## Risks

- Selectores de origen/destino pueden variar por ambiente o catalogo de datos.
- El boton de guardar o la redireccion final puede diferir (`/ruta` vs `/rutas`).
- Dependencias de datos maestros pueden hacer fallar la creacion de ruta sin setup previo.

## Ready for Proposal

Yes - existen suficientes patrones y contexto en el repo para implementar sin bloquearse.
