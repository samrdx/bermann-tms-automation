# Mobile Auth CI Promotion Gates

This document defines how mobile native auth smoke transitions from Phase 1 informational mode to required blocking mode.

## Workflow scope and current policy

- Workflow: `.github/workflows/mobile-auth-smoke.yml`
- Triggers: nightly (`schedule`), manual (`workflow_dispatch`), and PR (`pull_request`)
- Execution profile: emulator API 33, `pixel_6`, `maxInstances=1`
- Phase 1 rule: PR signal is non-blocking by design; nightly/manual failures remain actionable

## Ownership

- **QA Automation owner**: maintains workflow, parser, and gate dashboard health
- **Mobile QA owner**: validates triage quality and confirms failure taxonomy accuracy
- **Mobile App owner**: remediates selector debt and native ID drift
- **Release manager**: approves gate promotion and rollback decisions

## Promotion criteria (non-blocking -> blocking)

Promotion to required gate is allowed only when all criteria hold:

1. **Sample size**: at least 20 recent smoke runs (nightly/manual/PR mix is allowed).
2. **Pass rate**: `>= 95%` over the last 20 runs.
3. **Flake signal budget**: `<= 10%` of runs containing retry signals (`retrying_interaction`) or transition timeout noise.
4. **Selector fallback budget**: fallback usage is visible and remains `<= 5%` of observed selector-resolution signals.
5. **Selector debt policy**: no unresolved `selector.debt` events tied to quaternary/quinary tiers for 7 consecutive days.
6. **Operational readiness**: artifacts are present for every failed run (diagnostics JSON + screenshot).

## Evidence source

- Per-run summary: `tmsapp/mobile/artifacts/ci/run-summaries/*.json`
- WDIO logs: `tmsapp/mobile/artifacts/logs/*.log`
- Failure diagnostics: `tmsapp/mobile/artifacts/diagnostics/**/*.json`
- Aggregated metrics: `tmsapp/mobile/artifacts/ci/smoke-metrics.json` and `.md`

## Promotion checklist

1. QA Automation owner posts latest metrics window (20 runs) in PR/issue.
2. Mobile QA owner confirms triage artifacts and error classification quality.
3. Mobile App owner signs off on fallback/debt trend.
4. Release manager approves policy switch: remove PR non-blocking behavior.

## Rollback criteria

If blocking mode is active, revert to informational mode when either condition is met:

- Pass rate drops below `90%` in the latest 10 runs.
- Three consecutive blocking failures are caused by emulator instability or unresolved selector debt.

Rollback action: restore PR non-blocking behavior in workflow while remediation is tracked.
