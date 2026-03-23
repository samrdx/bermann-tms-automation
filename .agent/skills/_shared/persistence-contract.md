# Persistence Contract

## Goal

Guarantee recovery of SDD progress across sessions.

## Write Contract

Each persisted artifact SHOULD include:

- `status`
- `executive_summary`
- `artifacts`
- `next_recommended`
- `risks`
- `updated_at`

## Read Contract

Before running a phase, resolve dependencies by topic key:

- proposal depends on optional explore
- spec depends on proposal
- design depends on proposal
- tasks depends on spec + design
- apply depends on tasks + spec + design
- verify depends on spec + tasks
- archive depends on all prior artifacts

## Security Contract

- Never persist `.env` content
- Never persist credentials or auth tokens
- Persist only operational metadata and summaries
