# Engram Convention

## Project Key

- `bermann-tms-automation`

## Topic Key Format

- `sdd/{change-name}/{artifact}`

Artifacts:

- `explore`
- `proposal`
- `spec`
- `design`
- `tasks`
- `apply-progress`
- `verify-report`
- `archive-report`
- `state`

## Rules

1. Always reuse exact topic keys (no aliases).
2. Save concise executive summary plus decision log.
3. Keep stable identifiers (`change-name`, `artifact`) in lowercase kebab-case.
4. Do not store secrets, credentials, or raw tokens.
