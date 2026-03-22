# Tasks: Stabilize Proforma Cross-Browser Entity Assertions and Index Verification

## Phase 1: Verification Contract Foundation

- [ ] 1.1 Define the accepted Proforma ID validation rule (numeric/system-valid) and codify it as a single constant/helper in `src/modules/finanzas/PrefacturaPage.ts` used by `/proforma/index` verification paths. (Spec: Deterministic `/proforma/index` Lookup and ID Validation -> "index returns a valid Proforma identifier")
- [ ] 1.2 Refactor `src/modules/finanzas/PrefacturaPage.ts` method boundaries so readiness/lookup/extraction remain page-object responsibilities and business pass/fail assertions remain in test suites. (Spec: Page Object and Test Assertion Responsibility Boundary -> "responsibilities are executed at the correct layer")
- [ ] 1.3 Add structured error-context payload/text in `src/modules/finanzas/PrefacturaPage.ts` for lookup failures (transportista used, matched strategy, row text snapshot) to support deterministic debugging across browsers. (Spec: Deterministic `/proforma/index` Lookup and ID Validation -> "lookup finds row but extracted ID is invalid")

## Phase 2: Harden `/proforma/index` Page Object Behavior

- [ ] 2.1 Update `src/modules/finanzas/PrefacturaPage.ts` `waitForProformaIndexGridLoaded` flow to require table-visible, processing-hidden, and rows-ready conditions before any row assertions/extraction. (Spec: Proforma Cross-Browser Entity Verification Contract -> "delayed table rendering after successful creation")
- [ ] 2.2 Update `src/modules/finanzas/PrefacturaPage.ts` `buscarProformaEnIndexPorTransportista` flow to re-check loaded-state criteria after filter/search actions before row lookup. (Spec: Proforma Cross-Browser Entity Verification Contract -> "created Proforma is verified consistently in Chromium and Firefox")
- [ ] 2.3 Implement deterministic row resolution in `src/modules/finanzas/PrefacturaPage.ts` (transportista-first, fallback-first-row only when contract allows) and return extracted ID through the unified validation path. (Spec: Deterministic `/proforma/index` Lookup and ID Validation)
- [ ] 2.4 Ensure `src/modules/finanzas/PrefacturaPage.ts` throws explicit validation errors when ID is empty/null/malformed and includes lookup context in the thrown message/log path. (Spec: Deterministic `/proforma/index` Lookup and ID Validation -> "lookup finds row but extracted ID is invalid")

## Phase 3: Align E2E Suite Assertions to the Contract

- [ ] 3.1 Update `tests/e2e/suites/proforma-crear-e2e.test.ts` to consume page-object readiness/lookup primitives and keep only business-critical entity assertions in the suite layer. (Spec: Page Object and Test Assertion Responsibility Boundary -> "responsibilities are executed at the correct layer")
- [ ] 3.2 Remove duplicated low-level lookup/readiness assertions from `tests/e2e/suites/proforma-crear-e2e.test.ts` when they duplicate page-object guarantees. (Spec: Page Object and Test Assertion Responsibility Boundary -> "duplicated assertion logic appears across layers")
- [ ] 3.3 Update `tests/e2e/suites/finanzas-prefactura-proforma-e2e.test.ts` to use the same unified verification path (no browser-specific branching). (Spec: Proforma Cross-Browser Entity Verification Contract -> "created Proforma is verified consistently in Chromium and Firefox")
- [ ] 3.4 Ensure both suites assert invalid-ID behavior via the surfaced explicit error semantics rather than implicit truthy checks. (Spec: Deterministic `/proforma/index` Lookup and ID Validation -> "lookup finds row but extracted ID is invalid")

## Phase 4: Cross-Browser Verification and Regression Checks

- [ ] 4.1 Run targeted Proforma suites in Chromium and verify no false negatives from index timing/lookup order. (Spec: Proforma Cross-Browser Entity Verification Contract)
- [ ] 4.2 Run targeted Proforma suites in Firefox and verify the same assertion path passes without browser-specific logic. (Spec: Proforma Cross-Browser Entity Verification Contract -> "created Proforma is verified consistently in Chromium and Firefox")
- [ ] 4.3 Execute a negative verification path (invalid/empty ID simulation path or fixture-driven condition) and confirm explicit ID-validation failure messaging is emitted. (Spec: Deterministic `/proforma/index` Lookup and ID Validation -> "lookup finds row but extracted ID is invalid")
- [ ] 4.4 Confirm Chromium baseline behavior remains green for existing happy-path Proforma creation flows after contract hardening. (Proposal: Success Criteria -> "No regression in current Chromium Proforma flow pass behavior")
