# Design: Tipo Servicio Setup

## Architecture Decision
Use Playwright project-level dependency (`seed-tipo-operacion-*`) instead of runtime self-healing creation.

## Data Flow
1. Seed project runs `tipo-operacion-crear.test.ts`.
2. Test writes `seededTipoOperacion` into `playwright/.data/last-run-data-{browser}-{env}.json`.
3. `tipo-servicio-crear.test.ts` reads seeded data in `beforeAll`.
4. Tipo Servicio creation associates selected Tipo Operacion in bootstrap dropdown.
5. Test validates record in `/tiposervicio` search grid and persists `seededTipoServicio`.

## Interface Changes
- New interface: `TipoServicioData { nombre: string; tipoOperacionNombre: string; }`
- Extended worker data contract:
  - `seededTipoOperacion: { nombre: string; createdAt: string; env: string }`
  - `seededTipoServicio` (optional traceability)

## Failure Handling
- Missing seed data: test fails fast with guard clause.
- Dropdown/Save errors: screenshot via BasePage `takeScreenshot()`.
