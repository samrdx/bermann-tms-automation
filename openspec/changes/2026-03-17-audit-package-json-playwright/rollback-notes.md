# Rollback Notes: Audit and Normalize Playwright Orchestration

## Scope Covered

- `package.json` canonical script layer (`pw:test:*`) and legacy passthrough aliases.
- `playwright.config.ts` centralization through `src/config/playwright-orchestration.ts`.
- Auth setup alignment to `tests/helpers/auth.setup.ts`.

## Fast Rollback Procedure

1. Restore `package.json`, `playwright.config.ts`, `tests/helpers/auth.setup.ts`, and `src/config/playwright-orchestration.ts` from the previous stable commit.
2. Validate baseline with:
   - `npx tsc --noEmit`
   - `npx playwright test --list --project=config-fase1-chromium --project=config-fase1-firefox`
3. Run one legacy smoke command in QA and one in DEMO:
   - `npm run test:qa:e2e:ci -- --list`
   - `npm run test:demo:e2e:ci -- --list`
4. Confirm expected artifact directories are restored:
   - `test-results-qa`, `test-results-demo`
   - `playwright-report-qa`, `playwright-report-demo`
   - `allure-results-qa`, `allure-results-demo`

## Known Safe Fallbacks

- Keep using `test:*` legacy commands as user-facing entrypoints if canonical rollout is paused.
- Revert to pre-centralization config if helper contract changes break project dependency wiring.

## Verification Checklist After Rollback

- [ ] TypeScript compiles (`npx tsc --noEmit`)
- [ ] Auth setup project resolves and writes `playwright/.auth/user-<env>.json`
- [ ] QA and DEMO list outputs show environment-specific project names
- [ ] Composite scripts do not serve/open reports after a failing test step
