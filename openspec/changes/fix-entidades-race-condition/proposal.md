# Proposal: Fix Race Condition in Legacy Entities Tests

## Intent

The goal of this change is to eliminate test flakiness and data corruption present when running `npm run test:legacy:entidades`. Users have observed that `cliente-crear.test.ts` fails sporadically and that `vehiculo` and `conductor` end up with the wrong `transportista` data.

## Problem Statement

When running `npm run test:legacy:entidades`, Playwright launches all tests in `tests/e2e/modules/01-entidades/*` concurrently because the `chromium` project does not depend on `seed-transportista-chromium`. This causes two critical race conditions:

1. **Execution Race**: `vehiculo-crear` and `conductor-crear` attempt to read `transportista` data before `transportistas-crear` has finished writing it, causing them to use old data from previous runs.
2. **File I/O Race**: `cliente-crear`, `vehiculo-crear`, and `conductor-crear` run completely concurrently, reading and writing `last-run-data-*.json` at the exact same millisecond. This causes their writes to overwrite each other (e.g., `seededCliente` is saved, but `seededVehiculo` overwrites the file, destroying the `seededCliente` key).

## Proposed Approach

1. Modify `package.json`: Add `--workers=1` to the `test:legacy:entidades` script to ensure these dependent data-creation tests run sequentially, eliminating the File I/O Race Condition entirely.
2. Modify `playwright.config.ts`: Add `seed-transportista-*` as a dependency to the main `chromium` and `firefox` projects so that the foundation data is guaranteed to exist before any dependent test (like vehiculo or conductor) is launched.

## Scope

- Modify `package.json` scripts
- Modify `playwright.config.ts` dependencies

## Success Criteria

- Running `npm run test:legacy:entidades` reliably creates all entities without overwriting the `last-run-data` file.
- `vehiculo` and `conductor` use the exact `transportista` seeded in the same execution.
- No flaky test failures related to data files.
