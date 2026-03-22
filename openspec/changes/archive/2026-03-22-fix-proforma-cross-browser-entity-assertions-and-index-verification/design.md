# Design: Stabilize Proforma Cross-Browser Entity Assertions and Index Verification

## Technical Approach

Implement a single verification contract centered on `PrefacturaPage` primitives for `/proforma/index` readiness, row lookup, and ID extraction, while keeping business assertions in E2E tests. The change will harden DataTables synchronization and ID validation so both Chromium and Firefox use the same flow with no browser-specific branching.

## Architecture Decisions

### Decision: Keep readiness and lookup logic in page object, keep business assertions in tests
**Choice**: Consolidate technical synchronization (`wait for table ready`, `find matching row`, `extract id`) inside `PrefacturaPage`, and keep test expectations (`entity must exist`, `id must be valid`) at suite level.
**Alternatives considered**: (1) Keep mixed assertions in both layers, (2) move all assertions into page object.
**Rationale**: This matches existing POM boundaries in the repository, reduces duplicated checks, and prevents contradictory failures between page and suite layers.

### Decision: Use deterministic DataTables loaded-state criteria before row assertions
**Choice**: Require explicit table-visible + processing-hidden + rows-ready checks before lookup in `/proforma/index`.
**Alternatives considered**: fixed sleeps only, or relying on `networkidle` alone.
**Rationale**: Firefox timing variance makes sleep-based and network-only waits flaky for DataTables rendering; loaded-state checks are more stable and map to UI behavior.

### Decision: Enforce strict Proforma ID validation with explicit failure context
**Choice**: Validate extracted ID as non-empty and matching system-valid numeric format, and throw explicit error messages with lookup context.
**Alternatives considered**: accepting any non-`N/A` string or validating only presence.
**Rationale**: Prevents false positives where a row is found but ID is malformed/empty, and improves debug quality in cross-browser failures.

## Data Flow

```text
E2E Test
  -> PrefacturaPage.navigateToProformaIndex()
  -> PrefacturaPage.waitForProformaIndexGridLoaded()
  -> PrefacturaPage.buscarProformaEnIndexPorTransportista(transportista)
      -> apply dropdown filter + click Buscar
      -> re-check DataTables ready state
      -> locate matching row (transportista-first, fallback first row)
      -> extract first-column ID
      -> validate ID format/presence
  -> Test-level assertions on business outcome
```

```text
Sequence (cross-browser)

Test Runner -> Browser(UI): create proforma
Browser(UI) -> /proforma/index: redirect
Test Runner -> PrefacturaPage: verify proforma
PrefacturaPage -> DataTable: wait ready + processing hidden
PrefacturaPage -> DataTable: lookup row + extract ID
PrefacturaPage -> Test Runner: return validated ID or explicit error
Test Runner -> Assertions: entity and ID contract
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/modules/finanzas/PrefacturaPage.ts` | Modify | Harden `/proforma/index` readiness and lookup primitives; strengthen ID extraction/validation and error context. |
| `tests/e2e/suites/proforma-crear-e2e.test.ts` | Modify | Align assertions to the verification contract and avoid duplicated low-level checks. |
| `tests/e2e/suites/finanzas-prefactura-proforma-e2e.test.ts` | Modify | Align chained-flow proforma assertions with the same contract semantics. |

## Interfaces / Contracts

```typescript
export interface ProformaLookupResult {
  id: string;
  matchedBy: 'transportista' | 'fallback-first-row';
  rowText: string;
}

export interface IProformaIndexVerifier {
  navigateToProformaIndex(): Promise<void>;
  waitForProformaIndexGridLoaded(options?: { timeoutMs?: number }): Promise<void>;
  buscarProformaEnIndexPorTransportista(transportistaName: string): Promise<string>;
  // Internal contract:
  // - MUST throw when ID is empty/null/malformed
  // - SHOULD include lookup context in error
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit-like page behavior (within E2E helpers) | ID extraction and validation branch behavior | Exercise page helper paths via deterministic lookup outcomes (valid id, empty id, malformed id). |
| Integration (Page Object + TMS UI) | DataTables readiness and row lookup on `/proforma/index` | Validate ready-state gating before assertions in both Chromium and Firefox projects. |
| E2E | Proforma creation and verification contract | Keep business assertions in suites; ensure same assertion path without browser-specific branching. |

## Migration / Rollout

No migration required.

Rollout plan:
1. Apply page-object hardening first.
2. Update both proforma-related E2E suites to consume the unified contract.
3. Run targeted Chromium and Firefox suites for proforma flows.

## Open Questions

- [ ] Confirm the final accepted Proforma ID regex/format if non-numeric IDs can appear in specific environments.
- [ ] Confirm if lookup context in failures should be attached only to logs or also as Playwright test attachments.
