## Exploration: Demo support for `unidadnegocio-crear.test.ts`

### Current State
`tests/e2e/modules/00-config/unidadnegocio-crear.test.ts` already creates Unidad de Negocio using UI helper and stores JSON data for downstream tests.
The test currently has Allure `epic/feature/story`, but it does not set environment parameter (`Ambiente`) and does not emit a compact final entity summary block.
`package.json` has `test:qa:entity:unidadnegocio` but no equivalent `test:demo:entity:unidadnegocio` command.
`src/utils/NamingHelper.ts` already switches prefixes by environment (`Demo_` for DEMO, `Qa_` for QA).

### Affected Areas
- `tests/e2e/modules/00-config/unidadnegocio-crear.test.ts` - add `isDemo` constant usage, stronger Allure metadata, and summary logging.
- `package.json` - add Demo script(s) for this entity with Demo Allure flow.
- `tests/api-helpers/UnidadNegocioHelper.ts` - no functional change required unless Demo-specific selector behavior appears.

### Approaches
1. **Single multi-env test + Demo scripts** - Keep one test file, branch behavior by `isDemo`.
   - Pros: No duplication, same coverage QA/DEMO, minimal maintenance.
   - Cons: Requires careful env-aware assertions/logging.
   - Effort: Low

2. **Create a separate Demo test file** - Duplicate QA test into a Demo-specific spec.
   - Pros: Isolated behavior per environment.
   - Cons: High drift risk, duplicate maintenance, weaker history comparability.
   - Effort: Medium

### Recommendation
Use **Approach 1** (single multi-env test + Demo scripts).
The framework already supports ENV-based behavior (`playwright.config.ts` + `NamingHelper`), so extending the existing test is the cleanest path.

### Risks
- Demo UI timing may be slower and expose flakiness in post-save verification.
- Prefix verification could fail if naming helper output format changes in the future.
- Adding new scripts without following existing naming style could create command sprawl.

### Ready for Proposal
Yes. Proceed with proposal focused on Demo integration, Allure consistency, `isDemo` usage, emoji logging summary, and `Demo_` prefix guarantees.
