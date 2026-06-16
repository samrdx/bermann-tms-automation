# Proposal: Stabilize Conductor Test (Multi-Environment)

Follow the stabilization pattern for `conductor-crear.test.ts`.

## Proposed Changes

- **ConductorPage.ts**: Hybrid dropdown selection via `page.evaluate()` and robust date filling for "vencimiento licencia".
- **conductor-crear.test.ts**: Pre-save data capture for `last-run-data` and setting "vencimiento licencia" to "2026-12-31".

## Verification

- QA and Demo command runs.
