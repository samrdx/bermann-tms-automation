# Prefactura CI follow-up after PR #26

## Quick answer

PR #26 (`feat/oc-planificar-save-grid-hardening`) was merged, but its `QA PR SUITE` check failed in the Finanzas Prefactura flow, not in the Planificar/Asignar changes from the PR.

## Evidence

| Item | Value |
| --- | --- |
| PR | <https://github.com/samrdx/bermann-tms-automation/pull/26> |
| CI run | `28000099776` |
| Failing test | `tests/e2e/suites/finanzas-prefactura-proforma-e2e.test.ts` |
| Failing phase | `Fase 3 — Generar Prefactura` |
| Failing code | `src/modules/finanzas/PrefacturaPage.ts:436` |
| Error | `TimeoutError: page.waitForURL: Timeout 15000ms exceeded` |

## What passed before the failure

- Transportista, cliente, vehículo, conductor, and contracts were created.
- Viaje was planned successfully.
- Asignar flow succeeded.
- Monitoreo finalized the viaje successfully.
- The flow reached Prefactura creation and clicked Guardar.

## Current hypothesis

`PrefacturaPage.generarPrefactura()` is too dependent on URL navigation after saving:

```ts
await this.page.waitForURL(/\/prefactura(?:\/index)?(?:\?.*)?$/i, { timeout: 15000 });
```

The app may save successfully but stay on the same route, navigate with a different URL shape, or show a success message without matching this URL wait.

## Recommended next step

Create a new branch from latest `main` and investigate `PrefacturaPage.ts:436`.

Likely fix: use robust save confirmation for Prefactura, similar to the Planificar hardening from PR #26:

- accepted post-save routes,
- domain-specific success messages,
- visible validation/error rejection,
- diagnostics before throwing,
- avoid relying only on `waitForURL`.

## Do not assume

- Do not treat this as a Planificar/Asignar regression without fresh evidence.
- Do not add blind sleeps as the first fix.
- Do not push directly to `main`.
