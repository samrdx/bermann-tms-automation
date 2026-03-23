# Engram Integration Guide

This project uses a hybrid SDD artifact strategy:

- Local source of truth in `openspec/`
- Persistent memory in Engram for cross-session continuity

## Mode

Configured in `openspec/config.yaml`:

- `artifact_store.mode: hybrid`
- Engram project: `bermann-tms-automation`

## Required Environment Variables

Add these to your local `.env` (or shell profile / CI secret store):

```env
ENGRAM_BASE_URL=http://localhost:8080
ENGRAM_API_KEY=
ENGRAM_PROJECT=bermann-tms-automation
```

`ENGRAM_PROJECT` is optional at runtime and defaults to `bermann-tms-automation`.
`ENGRAM_API_KEY` is optional for local Engram. Use it only if your Engram endpoint is protected by an auth/proxy layer.

## Topic Key Convention

Use this format consistently:

`sdd/{change-name}/{artifact}`

Examples:

- `sdd/fix-proforma-cross-browser-entity-assertions-and-index-verification/proposal`
- `sdd/fix-proforma-cross-browser-entity-assertions-and-index-verification/spec`
- `sdd/fix-proforma-cross-browser-entity-assertions-and-index-verification/design`
- `sdd/fix-proforma-cross-browser-entity-assertions-and-index-verification/tasks`
- `sdd/fix-proforma-cross-browser-entity-assertions-and-index-verification/verify-report`

## Preflight Check

Run:

```bash
npm run engram:preflight
```

This validates env vars and checks Engram health endpoint.

## Recommended Workflow

1. Run `npm run engram:preflight`
2. Continue normal SDD flow (`/sdd:new`, `/sdd:continue`, `/sdd:apply`, `/sdd:verify`, `/sdd:archive`)
3. Keep `openspec/` artifacts committed as auditable trace
4. Persist key decisions/findings to Engram using the same topic keys

## Troubleshooting

- `ENGRAM_BASE_URL missing`: set env var in `.env` or shell
- `Health check failed`: verify Engram service is running and reachable
- `401/403`: confirm `ENGRAM_API_KEY`
- `No persisted context`: verify topic keys match convention exactly
