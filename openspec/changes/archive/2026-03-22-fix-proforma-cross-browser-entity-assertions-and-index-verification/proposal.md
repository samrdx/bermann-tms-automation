# Proposal: Stabilize Proforma Cross-Browser Entity Assertions and Index Verification

## Intent

Increase reliability of the Proforma E2E flows across Chromium and Firefox by removing brittle assertions tied to UI timing and by hardening `/proforma/index` verification semantics. Current failures appear as false negatives when entities are created successfully but index lookup/assertion logic is not robust enough for browser differences.

## Scope

### In Scope
- Define a stable validation contract for Proforma creation and retrieval in E2E tests.
- Harden entity assertion strategy so created entities are verified deterministically across browsers.
- Standardize `/proforma/index` lookup and ID extraction expectations for DataTables timing/loading behavior.
- Align page-object and test-level verification responsibilities for Proforma flows.

### Out of Scope
- Rewriting unrelated finance flows (e.g., full prefactura lifecycle redesign).
- Changing backend API behavior or database fixtures.
- Broad refactors of non-Proforma modules.

## Approach

Use a focused planning-and-hardening approach: document expected Proforma verification behavior first, then update index/query checks to be browser-agnostic, and finally align test assertions with that contract. Prefer deterministic waits and semantic row validation over timing-only checks.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/modules/finanzas/PrefacturaPage.ts` | Modified | Tighten Proforma index loading and ID/row verification behavior used by tests. |
| `tests/e2e/suites/proforma-crear-e2e.test.ts` | Modified | Align entity assertions with resilient cross-browser verification contract. |
| `tests/e2e/suites/finanzas-prefactura-proforma-e2e.test.ts` | Modified | Align chained prefactura+proforma assertions with stable index verification semantics. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Over-constrained assertions still fail under Firefox timing variance | Medium | Define browser-agnostic verification sequence with explicit loaded-state checks. |
| Relaxed checks hide real regressions | Medium | Keep ID extraction and row content assertions strict where behavior is business-critical. |
| Changes affect existing green Chromium runs | Low | Preserve existing happy path behavior and validate against current suite expectations. |

## Rollback Plan

1. Revert the Proforma verification hardening commit(s) affecting page object and E2E suites.
2. Restore previous `PrefacturaPage` and Proforma suite assertion behavior.
3. Re-run Proforma suites in Chromium and Firefox to confirm baseline restoration.

## Dependencies

- Existing Playwright multi-browser projects (Chromium and Firefox).
- Stable access to TMS QA/Demo data paths used by current Proforma suites.

## Success Criteria

- [ ] Proforma suites use a single explicit verification contract for entity assertions and `/proforma/index` checks.
- [ ] Cross-browser runs no longer fail due to index timing/lookup false negatives.
- [ ] ID verification remains deterministic and rejects invalid/empty Proforma IDs.
- [ ] No regression in current Chromium Proforma flow pass behavior.
