# Proposal: Audit and Normalize Playwright Orchestration

## Intent

The current `package.json` has become the primary orchestration layer for test execution, environment selection, reporting, and flow composition. That works today, but the command surface is already large and duplicated across QA and DEMO. This change aims to reduce script drift, make the runner easier to reason about, and move long-lived orchestration rules into `playwright.config.ts` where Playwright can manage them as project configuration instead of shell composition.

## Scope

### In Scope
- Audit the current Playwright-related script catalog in `package.json`.
- Define a normalized naming convention for scripts without changing behavior yet.
- Plan a staged migration of orchestration rules into `playwright.config.ts` and Playwright project dependencies.
- Document rollback and success criteria before implementation starts.

### Out of Scope
- No direct implementation changes to scripts, config, or tests in this proposal.
- No renaming of files or test cases yet.
- No removal of legacy entrypoints until the migration is verified.

## Scale Diagnosis

If the project size doubles, the current script model will scale poorly in predictable ways:
- The number of near-duplicate commands will likely grow faster than the suite itself, because QA and DEMO already mirror each other closely.
- Shell-string orchestration will create more path drift, more environment drift, and more failure-mode drift.
- Long chains like `clean -> test -> generate -> open/serve` will become harder to maintain and easier to break when one step changes.
- Discovery cost will rise for new contributors, because the "shape" of a command is not consistent across `test:*`, `run:*`, and `allure:*` families.
- CI feedback will degrade if orchestration remains encoded in `package.json` instead of a shared config layer that can express dependencies, retries, and reporters once.

## Approach

### Refactor Proposal for `package.json`
- Keep `package.json` as the public entrypoint, but make it a thin alias layer instead of the source of orchestration logic.
- Normalize script names to a stable pattern:
  - `test:<env>:<domain>:<scenario>` for direct test entrypoints.
  - `run:<env>:<domain>:<scenario>` for "clean + execute + report" flows.
  - `allure:<action>:<env>` and `clean:<target>` for utilities.
- Prefer kebab-case tokens for scenario names and avoid mixed naming styles such as `tipo-servicio-setup` alongside `tipooperacion`.
- Avoid embedding long command chains in scripts when a Playwright project dependency or config option can express the same intent.
- Keep only a small set of user-facing aliases per scenario, rather than separate QA and DEMO copies of the same shell string.

### Naming Convention Recommendations
- Use a fixed token order: `verb:env:area:scenario[:mode]`.
- Use `qa` and `demo` consistently as environment tokens.
- Use `entity`, `legacy`, `flow`, `trip`, or `auth` as domain tokens only when they map to a real suite boundary.
- Use `headed`, `ci`, `debug`, or `full` only when the mode materially changes execution behavior.
- Treat script names as stable API, so naming should describe intent rather than implementation details like file paths.

### Roadmap to Move Orchestration Into `playwright.config.ts`
1. Promote environment and reporter defaults into Playwright config so `ENV`, `HEADLESS`, trace, retries, and output locations are resolved centrally.
2. Model repeated suites as Playwright projects with explicit `dependencies` so setup phases run before dependent test phases.
3. Encode QA and DEMO as configuration variants instead of duplicating shell strings for every script.
4. Replace chained npm script orchestration with config-driven project execution for multi-step flows.
5. Keep `package.json` as a compatibility layer that invokes `playwright test --project=...` or a small number of canonical wrapper scripts.
6. After parity is proven, remove redundant aliases and preserve only the smallest stable public command set.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `C:/projects/bermann-tms-automation/package.json` | Modified | Script catalog will be normalized and simplified after implementation. |
| `C:/projects/bermann-tms-automation/playwright.config.ts` | Modified | Orchestration defaults, project dependencies, and output behavior will move here. |
| `C:/projects/bermann-tms-automation/tests/e2e/**` | Indirect | Suite routing may change once projects and dependencies own execution order. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Script renaming may break developer muscle memory or external docs. | Medium | Keep aliases during migration and document the new naming convention early. |
| Moving orchestration into Playwright config may surface hidden suite coupling. | Medium | Migrate in stages and validate each project dependency chain separately. |
| QA and DEMO parity could drift during the transition. | Medium | Use one shared config pattern and compare both environments after every step. |
| Legacy shell chains may hide failure propagation issues until replaced. | High | Replace chained shell logic with config-driven dependencies and verify exit codes. |
| Over-centralizing logic in config could make the file harder to read. | Low | Keep the config declarative and avoid embedding business logic in helpers unless needed. |

## Rollback Plan

Keep the current `package.json` script names and existing Playwright config behavior available until the new flow is proven. If the migration causes regressions, revert the config changes first, then restore the prior script definitions from version control. Because this proposal is intentionally additive, rollback should be limited to restoring the previous script aliases and removing any new project dependency wiring, without touching test content.

## Dependencies

- Playwright project modeling must support the target suite boundaries cleanly.
- The existing QA and DEMO environments must remain available during migration.
- Existing reporter and artifact paths must remain compatible while aliases are still in place.

## Success Criteria

- [ ] Script naming follows one documented convention across QA, DEMO, utility, and report commands.
- [ ] At least 50% of the repeated orchestration logic is removed from `package.json` after implementation.
- [ ] QA and DEMO flows are reproducible through Playwright project configuration without long shell chains.
- [ ] Setup-dependent flows use `playwright.config.ts` project dependencies instead of nested npm script composition.
- [ ] Rollback can restore the previous behavior without modifying test code.
- [ ] CI and local runs produce equivalent suite selection, exit codes, and artifact locations for the migrated commands.
