# Proposal: Tipo Servicio Setup with Tipo Operacion Dependency

## Intent
Implement automated creation of Tipo de Servicio in TMS with a hard dependency on Tipo de Operacion seed data.

## Scope
### In Scope
- Create `TipoServicioPage` with robust bootstrap dropdown handling.
- Create `tipo-servicio-crear.test.ts` under `01-entidades/config`.
- Persist and consume `seededTipoOperacion` in worker data JSON.
- Add Playwright project dependencies so Tipo Servicio does not run if Tipo Operacion seed fails.
- Add npm scripts for QA/DEMO and Allure runs in ordered flow.

### Out of Scope
- Automating optional `Cuenta Contable`.
- Adding API seeding fallback for Tipo Operacion.

## Approach
Reuse existing DataPathHelper and browser-isolated seed-data pattern already used by transportista/cliente/conductor flows. Add dedicated seed projects and enforce dependencies at Playwright project level.

## Affected Areas
| Area | Impact | Description |
|------|--------|-------------|
| `playwright.config.ts` | Modified | Added seed projects and project dependencies |
| `src/modules/configAdmin/pages/` | New/Modified | Added TipoServicioPage and fixture wiring |
| `tests/e2e/modules/01-entidades/config/` | New/Modified | Added Tipo Servicio test and upgraded Tipo Operacion seed behavior |
| `package.json` | Modified | Added QA/DEMO scripts and ordered Allure runs |

## Risks
| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Dropdown selector mismatch in environment | Medium | data-id primary selector + fallback + screenshot on error |
| Seed JSON missing in isolated execution | Medium | `beforeAll` guard with explicit error message |

## Rollback Plan
Revert changes in `playwright.config.ts`, `base.ts`, new Tipo Servicio files, and added npm scripts.

## Dependencies
- Existing auth setup (`tests/helpers/auth.setup.ts`)
- Existing `DataPathHelper` and worker data JSON strategy

## Success Criteria
- [x] `npx tsc --noEmit` passes.
- [x] `playwright --list` shows seed Tipo Operacion before Tipo Servicio.
- [x] Ordered scripts for QA/DEMO and Allure are available.
