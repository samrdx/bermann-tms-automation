# Proposal: Integrate Unidad de Negocio test into Demo environment

## Intent

We need to replicate the existing QA test flow for Unidad de Negocio creation in Demo, preserving current behavior and adding explicit Demo-oriented conventions:
- Demo execution script with Allure report flow
- `isDemo` constant usage in the test
- Informative emoji logging with created entity summary
- Enforced Demo naming (`Demo_`)

## Scope

### In Scope
- Update `unidadnegocio-crear.test.ts` to be explicitly env-aware (`isDemo`) while keeping one shared test for QA/DEMO.
- Keep and align Allure metadata convention (epic/feature/story + environment/entity parameters for better history traceability).
- Add clear summary logs with emojis including environment, entity name, and entity id.
- Add Demo script(s) in `package.json` following existing naming style.
- Validate Demo naming prefix (`Demo_`) in assertion/logging.

### Out of Scope
- New Page Objects or selector refactors for Unidad de Negocio.
- Changes to CI workflow definitions.
- Any modifications to unrelated entity tests.

## Approach

Use one multi-environment test and extend it with explicit environment handling.

Implementation plan (ordered):

1. Add env flag in test
- Add `const isDemo = process.env.ENV?.toUpperCase() === 'DEMO';`
- Use the flag in logs and Allure parameters.

2. Align Allure nomenclature
- Keep current labels:
  - `allure.epic('TMS Config Flow')`
  - `allure.feature('01-Configuracion')`
  - `allure.story('Unidad de Negocio')`
- Add parameters/attachment for history visibility:
  - `Ambiente`, `UnidadNegocio`, `UnidadNegocioID`, execution time.

3. Add Demo naming guard
- After creation, assert prefix by environment:
  - Demo => `Demo_`
  - QA => `Qa_`
- Keep generator source as `NamingHelper.getUnidadNegocioName()`.

4. Add informative emoji summary logs
- Add final summary block similar to other tests:
  - environment
  - nombre
  - id
  - data file path
  - duration

5. Add package scripts for Demo + Allure
- Add atomic test command:
  - `test:demo:entity:unidadnegocio`
- Add convenience run command (clean + test + report serve):
  - `run:demo:entity:unidadnegocio`
- Keep naming aligned with existing `test:demo:*` and `run:demo:*` conventions.

6. Validate
- Type check: `npx tsc --noEmit`
- Demo run: `npm run test:demo:entity:unidadnegocio`
- Report check: `npm run allure:serve:demo`

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `tests/e2e/modules/00-config/unidadnegocio-crear.test.ts` | Modified | Add `isDemo`, Demo prefix guard, Allure params/attachment, emoji summary logs |
| `package.json` | Modified | Add Demo command(s) for Unidad de Negocio + Allure run flow |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Demo save/navigation slower than QA | Medium | Keep existing timeout, add explicit waits only where needed |
| Prefix assertion fails if naming strategy changes | Low | Keep assertion aligned with `NamingHelper` output and env helper |
| Script naming inconsistency | Low | Follow existing `test:demo:entity:*` and `run:demo:*` conventions |

## Rollback Plan

- Revert `tests/e2e/modules/00-config/unidadnegocio-crear.test.ts` and `package.json`.
- Continue using existing QA-only command `test:qa:entity:unidadnegocio`.

## Dependencies

- Demo credentials and Demo environment availability.
- Existing Allure tooling (`allure-commandline`) already configured.

## Success Criteria

- [ ] Demo command exists and runs the Unidad de Negocio test in DEMO.
- [ ] Allure labels/parameters remain consistent with project style.
- [ ] Test uses `isDemo` constant and logs environment explicitly.
- [ ] Test logs include emoji summary with created entity details.
- [ ] Created Demo Unidad de Negocio follows `Demo_` naming.
