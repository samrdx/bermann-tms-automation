# Mobile Auth Smoke Triage Guide

This guide defines first-response triage for failed runs in `tmsapp/mobile/test/specs/auth/login.native.e2e.ts`.

## Artifacts emitted on failure

- Screenshot: `artifacts/diagnostics/<run-id>/<test-id>-<timestamp>.png`
- Machine-readable diagnostics: `artifacts/diagnostics/<run-id>/<test-id>-<timestamp>.json`
- Optional bounded page source: `artifacts/diagnostics/<run-id>/<test-id>-<timestamp>.pagesource.xml`

The diagnostics JSON includes:

- `classification.type` and `classification.message` (error taxonomy)
- `runtime.currentStep` (last flow step before failure)
- `runtime.selector` (selector key/tier/strategy/debt tag from registry telemetry)
- `runtime.activity` (native Android activity)
- `artifacts.pageSourceHash` and `artifacts.pageSourceLength`
- `policy.includePageSourceBody` and `artifacts.pageSourceMaxChars` (bounded-output policy)

## Failure taxonomy

- `SelectorResolutionError`: selector lookup or interaction failed (usually selector drift or stale fallback chain)
- `TransitionTimeoutError`: state transition did not complete in allotted timeout
- `AuthFailureError`: invalid credentials flow outcome or auth rejection behavior issue
- `NativePageInteractionError`: low-level interaction issue wrapped upstream in flow-level typed errors
- `UnknownError`: non-typed failure captured by the diagnostics writer

## First-response checklist

1. Open diagnostics JSON and read `runtime.currentStep` first.
2. Check `runtime.selector.tier`:
   - `primary`: likely app behavior change, timing issue, or backend/auth instability.
   - `secondary`/`tertiary`: selector fallback used; treat as selector debt and verify primary IDs.
   - `quaternary`/`quinary`: temporary debt paths; escalate to app team for stable IDs.
3. Verify `runtime.activity` and screenshot alignment:
   - Mismatch between expected screen and activity implies transition bug.
   - Correct activity but missing element implies selector drift.
4. Compare `artifacts.pageSourceHash` with previous failing runs:
   - Same hash across failures suggests deterministic app state issue.
   - Different hash suggests flaky rendering/timing.
5. If `classification.type` is `TransitionTimeoutError`, validate emulator performance and recent timeout changes before touching selectors.

## Bounded output policy

- Default behavior writes screenshot + JSON only.
- Full page source body is opt-in via `MOBILE_DIAGNOSTICS_INCLUDE_PAGE_SOURCE=true`.
- Page source output is bounded by `MOBILE_DIAGNOSTICS_PAGE_SOURCE_MAX_CHARS` (default `20000`).
- JSON snippet preview is bounded by `MOBILE_DIAGNOSTICS_SNIPPET_MAX_CHARS` (default `400`).

## Recommended escalation path

1. **Selector fallback/debt**: file selector debt task and request accessibility IDs.
2. **Transition timeout**: inspect emulator health and app startup latency, then review wait policy.
3. **Auth failure on valid credentials**: verify environment credentials/secrets and backend auth status.
4. **Repeated unknown errors**: attach diagnostics JSON and screenshot to incident, include run ID.
