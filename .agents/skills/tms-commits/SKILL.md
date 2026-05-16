---
name: tms-commits
description: "Trigger: commit, push, PR, confirmar, comitear. Plan and execute professional commits following project conventions and work-unit discipline."
license: Apache-2.0
metadata:
  author: bermann-qa
  version: "1.0"
---

# tms-commits — Professional Commits for Bermann TMS

## Hard Rules

- **ALWAYS use Conventional Commits**: `type(scope): Short description`
  - Types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `ci`
  - Scope: module name (`skills`, `docs`, `ci`, `auth`, `finanzas`, etc.)
  - Description: imperative, lowercase, no period at end
- **ALWAYS run `npx tsc --noEmit`** before committing — zero errors required
- **ALWAYS check `git status` + `git diff --stat`** before planning commits
- **NEVER commit auto-generated tooling configs** (`.pi/`, `.atl/`, `.claude/`, etc.) — add to `.gitignore` if missing
- **NEVER commit `.env`** or any file with credentials

## Work Unit Discipline

| Rule | Requirement |
|---|---|
| One purpose per commit | A commit = one deliverable behavior, fix, docs unit, or feature |
| Tests with code | Tests belong in the same commit as the code they verify |
| Docs with feature | Documentation belongs with the feature or change it describes |
| Tell a story | Reviewers should understand WHY each commit exists from its message |
| Future PR-ready | Each commit should be a valid standalone unit |

## Pre-commit Checklist

- [ ] `npx tsc --noEmit` passes with zero errors
- [ ] `git status` reviewed — no unintended files included
- [ ] `.gitignore` covers auto-generated/config files
- [ ] Commit message follows `type(scope): description` format
- [ ] Each commit has exactly one clear purpose
- [ ] Rollback is possible without reverting unrelated work

## Commit Message Format

```
type(scope): Short description (imperative, ≤72 chars)

- Bullet point of key change 1
- Bullet point of key change 2
- Reference related artifacts if relevant
```

## Split Decision Table

| Scenario | Approach |
|---|---|
| New feature + its tests + its docs | Single commit: all ships together |
| Bug fix + unrelated formatting | Two commits: fix first, cleanup second |
| Skills creation + doc updates using them | Two commits: skills first, docs second |
| CI config change + code change | Two commits: CI first (isolated risk), code second |
| Pure docs update across files | Single commit: "docs: ..." |

## Examples

```bash
# New skill
git commit -m "feat(skills): add tms-atomic-e2e and tms-ultimamilla skills

- tms-atomic-e2e: patterns for self-contained E2E suites with OperationalDataLoader
- tms-ultimamilla: batch processing, mutation guards, fixture injection"

# Docs update
git commit -m "docs: update project documentation to reflect current architecture

- README: 9 modules, new scripts, updated CI/CD
- CLAUDE/GEMINI: synced with current project state
- AGENTS: fixed skill paths, added new skills and auto-invoke rules
- CLOUD: PR Demo pipeline, concurrency groups, Allure pruning
- TEST-ACTIVES: 20+ tests with status and observations"
```
