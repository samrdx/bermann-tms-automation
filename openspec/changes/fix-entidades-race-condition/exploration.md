## Exploration: Root Cause of Flaky Test in cliente-crear.test.ts and Data Races

### Current State

Currently, running `npm run test:legacy:entidades` executes all tests located in `tests/e2e/modules/01-entidades/`. This includes `transportistas-crear.test.ts`, `cliente-crear.test.ts`, `vehiculo-crear.test.ts`, and `conductor-crear.test.ts`.

The Playwright configuration (`playwright.config.ts`) has `fullyParallel: true`. It defines separate projects for `seed-transportista-chromium` and `chromium`. Crucially, the `chromium` project, which runs `cliente`, `vehiculo`, and `conductor` creation tests, **does not** depend on `seed-transportista-chromium`—both only depend on `setup`.

### Affected Areas

- `playwright.config.ts` — The dependency graph is missing the link between `chromium` test project and `seed-transportista-chromium`.
- `tests/e2e/modules/01-entidades/*/*.test.ts` — The tests all read, mutate, and write to `last-run-data-chromium-<env>.json`. Since they run concurrently (Playwright executes files in parallel by default), they suffer from severe race conditions reading and writing the JSON file, causing data overwrites.

### Approaches

1. **Approach A: Add Project Dependencies in playwright.config.ts**
   - **Description**: Make the `chromium` and `firefox` projects depend on their respective `seed-transportista-*` and `base-entities-*` projects.
   - **Pros**: Playwright native dependency graph handles the execution order naturally. No race conditions between Transportista and Vehiculo/Conductor.
   - **Cons**: Still doesn't solve the write race condition if `cliente-crear.test.ts`, `vehiculo-crear.test.ts`, and `conductor-crear.test.ts` execute in parallel, as they all read/write to the same JSON file simultaneously.
   - **Effort**: Low

2. **Approach B: Use File Locking / Atomic Writes for the JSON Data**
   - **Description**: Implement a safe read-write lock for `DataPathHelper.ts` to allow parallel tests to write to the JSON file without overwriting each other.
   - **Pros**: Allows max parallelization. Very robust.
   - **Cons**: Adds complexity to the test framework utilities. Doesn't solve the fact that `vehiculo` needs `transportista` to finish creating FIRST!
   - **Effort**: Medium

3. **Approach C: Fix Project Dependencies + Serialize Grouped Operations**
   - **Description**: Add `seed-transportista-chromium` as a dependency for `chromium`. Update `npm run test:legacy:entidades` to run the tests serially instead of completely parallel, or use `.serial` inside the test files if they must share an execution order. Also, ensure that base test runners have proper wait constraints.
   - **Pros**: Completely resolves the flakiness and dependency order.
   - **Cons**: Slower execution for `01-entidades`.
   - **Effort**: Low

4. **Approach D: Atomic Test execution with separate Data Files**
   - **Description**: Make tests truly independent by NOT using shared `last-run-data-*.json` for parallel executions unless they are running sequentially in a setup phase (like `base-entities.setup.ts`). `*-crear.test.ts` tests could generate and use their own scope context instead of polluting a shared JSON file.
   - **Pros**: Architectural best practice for E2E testing (Isolated state).
   - **Cons**: Requires refactoring the `01-entidades` tests.
   - **Effort**: Medium

### Recommendation

I recommend **Approach C for immediate stabilization** combined with a robust write function in `DataPathHelper` (part of **Approach B**) if possible, but fixing the Project Dependencies in `playwright.config.ts` is strictly necessary right now.

Specifically:

1. `chromium` must list `seed-transportista-chromium` in its `dependencies` array.
2. The concurrent writes to `last-run-data` require either using `fs.writeFileSync` inside a synchronous queue/lock, OR running `test:legacy:entidades` sequentially (`--workers=1`). Given that `test:legacy:entidades` implies legacy behavior, appending `--workers=1` to the `package.json` script is the safest and quickest fix alongside the playwright dependency addition.

### Risks

- Adding dependencies to `chromium` project might delay other tests unnecessarily. We should ensure the `seed-transportista` project runs fast or consider running it only for the specific tests that need it.

### Ready for Proposal

Yes. The problem is well understood.
