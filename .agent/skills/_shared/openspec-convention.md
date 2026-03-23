# OpenSpec Convention

## Active Changes

- Path: `openspec/changes/{change-name}/`

Expected files by phase:

- `proposal.md`
- `specs/<domain>/spec.md`
- `design.md`
- `tasks.md`
- `verify-report.md` (after verify)

## Archive

- Path: `openspec/changes/archive/{YYYY-MM-DD}-{change-name}/`
- Keep all planning and verification artifacts intact.

## Hybrid Mode Rule

In hybrid mode:

1. Keep OpenSpec as file-based audit trail
2. Mirror key summaries to Engram using the same change name
3. Treat divergence as an error and resolve immediately
