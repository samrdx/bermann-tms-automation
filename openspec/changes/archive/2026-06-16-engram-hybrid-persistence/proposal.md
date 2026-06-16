# Proposal: Engram Hybrid Persistence

## Intent

Enable and standardize a hybrid persistence model (Engram + OpenSpec) for Spec-Driven Development (SDD) in the `bermann-tms-automation` project. This change ensures that the AI orchestration process correctly tracks state across sessions using Engram while generating human-readable artifacts in the repository (`openspec/` folder) for review and version control.

## Scope

### In Scope
- Define rules and workflows for hybrid persistence in `AGENTS.md` and SDD skills.
- Ensure all SDD phases (propose, spec, design, tasks, apply, verify, archive) read from and write to both Engram memory and filesystem.
- Setup fallback mechanisms if Engram is unavailable.

### Out of Scope
- Removing OpenSpec local files entirely (must remain hybrid).
- Developing the Engram API backend (using existing API).

## Approach

1. Update the orchestrator configuration (`openspec/config.yaml`) to enforce `artifact_store.mode: hybrid`.
2. Standardize the `topic_key` format (`sdd/{change-name}/{artifact}`) for all agent interactions.
3. Update agent instructions (e.g. `AGENTS.md` and `skills/sdd-*/SKILL.md`) to read dependencies from Engram first, falling back to the filesystem, and write outputs to both.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `AGENTS.md` | Modified | Update orchestrator rules for hybrid mode |
| `openspec/config.yaml` | Modified | Formalize hybrid mode settings |
| `skills/sdd-*` | Modified | Update read/write logic for SDD artifacts |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Context loss on sync failure | Low | Filesystem fallback guarantees artifacts are available. |
| Memory duplication | Medium | Use unique, deterministic `topic_key`s for all upsert operations. |

## Rollback Plan

Revert `artifact_store.mode` back to `openspec` in `openspec/config.yaml` and rollback any script/agent prompt changes to their previous single-store state.

## Dependencies

- Engram API availability
- `openspec` local tooling

## Success Criteria

- [ ] Agents can resume SDD workflows across context resets using Engram.
- [ ] Markdown artifacts are consistently generated in `openspec/changes/{change-name}/` for human review.
- [ ] Fallback to local filesystem works if the Engram API is mocked or down.