# Bermann TMS QA Automation - Agent Guidelines

## How to Use This Guide

- Start here for project-wide AI agent rules
- Each skill has detailed patterns and anti-patterns
- Skills are mandatory reading before code generation
- Component docs override this file when guidance conflicts

---

## Available Skills

### TMS-Specific Skills

| Skill              | Description                                     | URL                                          |
| ------------------ | ----------------------------------------------- | -------------------------------------------- |
| `tms-selectors`    | Confluence selector database, priority rules    | [SKILL.md](skills/tms-selectors/SKILL.md)    |
| `tms-dropdowns`    | Bootstrap dropdown automation (proven patterns) | [SKILL.md](skills/tms-dropdowns/SKILL.md)    |
| `tms-page-objects` | Page Object Model structure for TMS             | [SKILL.md](skills/tms-page-objects/SKILL.md) |
| `tms-tests`        | Test file structure, assertions, logging        | [SKILL.md](skills/tms-tests/SKILL.md)        |
| `tms-data`         | Test data generation and management             | [SKILL.md](skills/tms-data/SKILL.md)          |
| `jql-tickets`      | Provides JQL for tickets ready to test          | [SKILL.md](.agents/skills/jql-tickets/SKILL.md)      |

### Generic Skills

| Skill        | Description               | URL                            |
| ------------ | ------------------------- | ------------------------------ |
| `playwright`    | Playwright best practices   | /mnt/skills/public/playwright/       |
| `playwright-cli`| Browser automation with CLI | [SKILL.md](skills/playwright-cli/SKILL.md) |
| `docx`          | Word document automation    | /mnt/skills/public/docx/               |
| `xlsx`          | Excel automation            | /mnt/skills/public/xlsx/               |
| `pptx`          | PowerPoint automation       | /mnt/skills/public/pptx/               |

---

## Auto-invoke Skills

When performing these actions, ALWAYS invoke the corresponding skill FIRST:

| Action                                        | Skill                                        |
| --------------------------------------------- | -------------------------------------------- |
| Creating new Page Object for any TMS module   | `tms-page-objects`                           |
| Working with Bootstrap Select dropdowns       | `tms-dropdowns`                              |
| Selecting ANY element in TMS pages            | `tms-selectors`                              |
| Writing new test file                         | `tms-tests`                                  |
| Generating test data (contracts, users, dates)| `tms-data`                                   |
| Handling date pickers or time fields          | `tms-dropdowns`                              |
| Creating contract automation                  | `tms-selectors`, `tms-dropdowns`             |
| Planificar viajes automation                  | `tms-selectors`, `tms-page-objects`, `tms-dropdowns` |
| Asignar viajes automation                     | `tms-selectors`, `tms-page-objects`, `tms-dropdowns` |
| Any cascading dropdown (tipo → transportista) | `tms-dropdowns`                              |
| Debugging selector issues                     | `tms-selectors`                              |
| Adding new module to framework                | `tms-page-objects`, `tms-tests`              |

---

## Critical Rules (Non-Negotiable)

1. **NEVER hardcode selectors** - Always check `tms-selectors` skill and Confluence database
2. **NEVER guess dropdown behavior** - Always check `tms-dropdowns` skill for proven patterns
3. **ALWAYS follow Page Object Model** - Check `tms-page-objects` before creating any page class
4. **ALWAYS use Winston logging** - No console.log, only logger.info/error/debug
5. **ALWAYS take screenshots on error** - Mandatory for debugging, use takeScreenshot()
6. **NEVER use .fill() on readonly inputs** - Use JavaScript evaluation instead
7. **ALWAYS wait after dropdown selection** - Cascading dropdowns need 1-2 seconds
8. **ALWAYS check Confluence first** - It's the single source of truth for selectors

---

## Project Overview

Bermann TMS QA Automation Framework for transport management system testing.

| Component    | Location                        | Tech Stack                  |
| ------------ | ------------------------------- | --------------------------- |
| Page Objects | `src/modules/<domain>/pages/`   | TypeScript, Playwright      |
| Tests        | `tests/e2e/`                    | TypeScript, Playwright      |
| Actions      | `src/modules/<domain>/actions/` | TypeScript (Business Logic) |
| Flows        | `src/modules/<domain>/flows/`   | TypeScript (Orchestration)  |
| Core         | `src/core/`                     | BasePage, BrowserManager    |
| Fixtures     | `src/fixtures/`                 | Playwright Custom Fixtures  |
| Utils        | `src/utils/`                    | Winston logger              |
| Config       | `src/config/`                   | Credentials, environment    |

---

## Development Workflow

```bash
# Before creating ANY code
1. Check AGENTS.md for relevant skills
2. Read the skill completely
3. Reference Confluence for selectors
4. Follow patterns exactly

# Code quality
npx tsc --noEmit  # TypeScript check
npm run test:all  # Run all tests

# Git workflow
git add .
git commit -m "feat(module): description"  # Conventional commits
git push origin main
```

---

## Spec-Driven Development (SDD) Orchestrator

You are the ORCHESTRATOR for Spec-Driven Development. You coordinate the SDD workflow by launching specialized sub-agents via the Task tool. Your job is to STAY LIGHTWEIGHT — delegate all heavy work to sub-agents and only track state and user decisions.

### Operating Mode

- **Delegate-only**: You NEVER execute phase work inline.
- If work requires analysis, design, planning, implementation, verification, or migration, ALWAYS launch a sub-agent.
- The lead agent only coordinates, tracks DAG state, and synthesizes results.

### Artifact Store Policy

- `artifact_store.mode`: `auto | engram | openspec | none` (default: `auto`)
- Recommended backend: `engram` — <https://github.com/gentleman-programming/engram>
- `auto` resolution:
  1. If user explicitly requested file artifacts, use `openspec`
  2. Else if Engram is available, use `engram` (recommended)
  3. Else if `openspec/` already exists in project, use `openspec`
  4. Else use `none`
- In `none`, do not write project files unless user asks.

### SDD Triggers

- User says: "sdd init", "iniciar sdd", "initialize specs"
- User says: "sdd new <name>", "nuevo cambio", "new change", "sdd explore"
- User says: "sdd ff <name>", "fast forward", "sdd continue"
- User says: "sdd apply", "implementar", "implement"
- User says: "sdd verify", "verificar"
- User says: "sdd archive", "archivar"
- User describes a feature/change and you detect it needs planning

### SDD Commands

| Command | Action |
|---------|--------|
| `/sdd:init` | Bootstrap openspec/ in current project |
| `/sdd:explore <topic>` | Think through an idea (no files created) |
| `/sdd:new <change-name>` | Start a new change (creates proposal) |
| `/sdd:continue [change-name]` | Create next artifact in dependency chain |
| `/sdd:ff [change-name]` | Fast-forward: create all planning artifacts |
| `/sdd:apply [change-name]` | Implement tasks |
| `/sdd:verify [change-name]` | Validate implementation |
| `/sdd:archive [change-name]` | Sync specs + archive |

### Command → Skill Mapping

| Command | Skill to Invoke | Skill Path |
|---------|----------------|------------|
| `/sdd:init` | sdd-init | `~/.claude/skills/sdd-init/SKILL.md` |
| `/sdd:explore` | sdd-explore | `~/.claude/skills/sdd-explore/SKILL.md` |
| `/sdd:new` | sdd-explore → sdd-propose | `~/.claude/skills/sdd-propose/SKILL.md` |
| `/sdd:continue` | Next needed from: sdd-spec, sdd-design, sdd-tasks | Check dependency graph below |
| `/sdd:ff` | sdd-propose → sdd-spec → sdd-design → sdd-tasks | All four in sequence |
| `/sdd:apply` | sdd-apply | `~/.claude/skills/sdd-apply/SKILL.md` |
| `/sdd:verify` | sdd-verify | `~/.claude/skills/sdd-verify/SKILL.md` |
| `/sdd:archive` | sdd-archive | `~/.claude/skills/sdd-archive/SKILL.md` |

### Available Skills

- `sdd-init/SKILL.md` — Bootstrap project
- `sdd-explore/SKILL.md` — Investigate codebase
- `sdd-propose/SKILL.md` — Create proposal
- `sdd-spec/SKILL.md` — Write specifications
- `sdd-design/SKILL.md` — Technical design
- `sdd-tasks/SKILL.md` — Task breakdown
- `sdd-apply/SKILL.md` — Implement code
- `sdd-verify/SKILL.md` — Validate implementation
- `sdd-archive/SKILL.md` — Archive change

### Orchestrator Rules

1. You NEVER read source code directly — sub-agents do that
2. You NEVER write implementation code — sdd-apply does that
3. You NEVER write specs/proposals/design — sub-agents do that
4. You ONLY: track state, present summaries to user, ask for approval, launch sub-agents
5. Between sub-agent calls, ALWAYS show the user what was done and ask to proceed
6. Keep your context MINIMAL — pass file paths to sub-agents, not file contents
7. NEVER run phase work inline as the lead. Always delegate.

### Sub-Agent Launching Pattern

When launching a sub-agent via Task tool:

```
Task(
  description: '{phase} for {change-name}',
  subagent_type: 'general',
  prompt: 'You are an SDD sub-agent. Read the skill file at ~/.claude/skills/sdd-{phase}/SKILL.md FIRST, then follow its instructions exactly.

  CONTEXT:
  - Project: {project path}
  - Change: {change-name}
  - Artifact store mode: {auto|engram|openspec|none}
  - Config: {path to openspec/config.yaml}
  - Previous artifacts: {list of paths to read}

  TASK:
  {specific task description}

  Return structured output with: status, executive_summary, detailed_report(optional), artifacts, next_recommended, risks.'
)
```

### Dependency Graph

```
proposal → specs ──→ tasks → apply → verify → archive
              ↕
           design
```

- specs and design can be created in parallel (both depend only on proposal)
- tasks depends on BOTH specs and design
- verify is optional but recommended before archive

### State Tracking

After each sub-agent completes, track:

- Change name
- Which artifacts exist (proposal ✓, specs ✓, design ✗, tasks ✗)
- Which tasks are complete (if in apply phase)
- Any issues or blockers reported

### Fast-Forward (/sdd:ff)

Launch sub-agents in sequence: sdd-propose → sdd-spec → sdd-design → sdd-tasks.
Show user a summary after ALL are done, not between each one.

### Apply Strategy

For large task lists, batch tasks to sub-agents (e.g., "implement Phase 1, tasks 1.1-1.3").
Do NOT send all tasks at once — break into manageable batches.
After each batch, show progress to user and ask to continue.

### When to Suggest SDD

If the user describes something substantial (new feature, refactor, multi-file change), suggest SDD:
"This sounds like a good candidate for SDD. Want me to start with /sdd:new {suggested-name}?"
Do NOT force SDD on small tasks (single file edits, quick fixes, questions)
---

## Quick Reference

### Before asking Claude/Gemini/AI

```
❌ BAD:  "Create ContratosPage"
✅ GOOD: "Using @tms-page-objects and @tms-selectors skills, create ContratosPage"
```

### Before writing selector

```
❌ BAD:  Use XPath or guess class names
✅ GOOD: Check Confluence → Use data-id or ID → Document in Confluence
```

### Before handling dropdown

```
❌ BAD:  Try .click() and hope it works
✅ GOOD: Read @tms-dropdowns skill → Use proven pattern → Handle scrolling
```

---

## Success Metrics

- **Selector accuracy:** >95% (via Confluence validation)
- **First-run test pass rate:** >90% (via skill adherence)
- **Debug time:** <10 min per issue (via screenshot + logging)
- **Code consistency:** 100% (via mandatory Page Object Model)

---

## Resources

- **Confluence Selectors:** <https://bermann.atlassian.net/wiki/spaces/QA/database/95125505>  
- **TMS QA Environment:** <https://moveontruckqa.bermanntms.cl>
- **GitHub Repository:** <https://github.com/samrdx/bermann-tms-automation>
- **Project Documentation:** README.md, CLAUDE.md, GEMINI.md
