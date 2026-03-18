# Tasks: Audit and Normalize Playwright Orchestration

## Phase 1: Foundation / Orchestration Primitives

- [x] 1.1 Create `src/config/playwright-orchestration.ts` with the typed runtime contract from the design: environment parsing, base URL resolution, timeout/headless policy, artifact directory builders, and project descriptor helpers.
- [x] 1.2 Reuse and, if needed, align `tests/helpers/auth.setup.ts` as the auth setup entrypoint that writes the env-specific storage state file at `playwright/.auth/user-<env>.json` for downstream projects.
- [x] 1.3 Define the canonical project names and dependency graph in the helper module so setup phases can be referenced consistently from `playwright.config.ts` and from targeted verification commands.

## Phase 2: Core Implementation / Playwright Config Centralization

- [x] 2.1 Refactor `playwright.config.ts` to consume `src/config/playwright-orchestration.ts` for environment selection, base URL routing, worker policy, retries, timeouts, headless behavior, and reporter/output paths.
- [x] 2.2 Rebuild the Playwright `projects` array in `playwright.config.ts` so auth, config setup, base-entities setup, and main suite projects use explicit `dependencies` instead of chained npm scripts.
- [x] 2.3 Ensure QA and DEMO project variants share the same structure but resolve to isolated storage-state, `test-results-*`, `playwright-report-*`, and `allure-results-*` directories through the centralized helper.
- [x] 2.4 Remove any remaining inline orchestration logic from `playwright.config.ts` that duplicates the helper contract, keeping the file declarative and limited to config assembly.

## Phase 3: Integration / Package Script Wiring

- [x] 3.1 Normalize the canonical Playwright entrypoints in `package.json` so the primary QA and DEMO scripts call the appropriate Playwright projects or project groups instead of embedding long shell chains.
- [x] 3.2 Preserve legacy aliases in `package.json` as passthrough wrappers during migration, including the existing QA/DEMO setup, entity, legacy, flow, and full-run commands.
- [x] 3.3 Update composite run scripts in `package.json` so cleanup, test execution, and report generation/serving follow the new config-driven flow and stop on the first failing step.
- [x] 3.4 Align the combined QA + DEMO orchestration entrypoint in `package.json` with the isolated project model so each environment runs independently and keeps separate artifacts.

## Phase 4: Testing / Verification

- [x] 4.1 Verify the canonical QA entrypoints against the spec scenario "Run a canonical QA entrypoint" by running the migrated QA scripts and confirming the active environment, suite selection, and zero exit code on success.
- [x] 4.2 Verify the canonical DEMO entrypoints against the spec scenario "Run the same capability in DEMO" by running the migrated DEMO scripts and confirming Demo-specific config, suite selection, and zero exit code on success.
- [x] 4.3 Verify the legacy alias scenario "Legacy alias remains available during migration" by executing at least one migrated legacy command path and confirming it preserves the same observable behavior as the canonical command.
- [x] 4.4 Verify the config-centralization scenarios "QA local execution resolves through config", "Demo execution resolves through config", "CI execution resolves with CI policy", and "Missing environment input falls back to the default supported environment" by checking `ENV=QA`, `ENV=DEMO`, `CI=true`, and unset `ENV` behavior through targeted Playwright invocations or `--list` output.
- [x] 4.5 Verify the dependency-sequencing scenarios "Setup projects run before dependent suites" and "Failed prerequisite stops downstream execution" by running the setup chain and confirming downstream projects wait for prerequisites and stop when a prerequisite fails.
- [x] 4.6 Verify the artifact-isolation scenarios "QA and DEMO runs write separate outputs" and "Environment-specific cleanup does not cross-contaminate" by comparing output directories after separate QA and DEMO runs and after targeted cleanup.
- [x] 4.7 Verify the composite-run scenarios "Successful run reaches the reporting step" and "Failed test step blocks reporting" by exercising one passing composite flow and one forced-failure flow to confirm report generation only happens after success.
- [x] 4.8 Verify the cross-environment aggregation scenarios "Combined run executes both environments" and "One environment fails in the combined run" by running the combined QA/DEMO entrypoint and confirming isolated outputs, independent exit handling, and failure propagation.
- [x] 4.9 Run `npx tsc --noEmit` and a focused Playwright smoke pass for the migrated script surface to catch type drift, project naming mismatches, or alias regressions before cleanup.

## Phase 5: Cleanup / Documentation

- [x] 5.1 Update the repository command documentation, such as `README.md` or the closest scripts reference, to describe the canonical script naming convention and the new Playwright project-driven execution model.
- [x] 5.2 Remove obsolete duplicated shell chains and migration-only comments from `package.json` once parity is confirmed, keeping only the smallest stable public command surface.
- [x] 5.3 Record the final rollback notes for the orchestration migration in the change artifacts so the previous script bodies and config wiring can be restored quickly if needed.
