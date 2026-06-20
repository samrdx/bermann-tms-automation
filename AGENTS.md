# Bermann TMS QA Automation - Agent Guidelines

`AGENTS.md` is the project-level source of truth for AI workflow in this repository.

- Use this file for repo-specific rules, skill routing, and stable conventions.
- Use `README.md` for human onboarding and execution examples.
- Use `package.json` and `playwright.config.ts` as the source of truth for scripts, projects, and runtime behavior.
- Keep `CLAUDE.md` and `GEMINI.md` aligned with this file and avoid repeating volatile metrics there.

---

## Available Project Skills

These are the repo-local skills currently present under `.agents/skills/`.

### TMS Skills

| Skill | Purpose |
| --- | --- |
| `tms-selectors` | Selector priority rules and Confluence-backed lookup |
| `tms-dropdowns` | Bootstrap Select, cascading dropdowns, and date picker patterns |
| `tms-page-objects` | Page Object Model structure for TMS modules |
| `tms-tests` | Test structure, assertions, logging, and failure handling |
| `tms-data` | Test data generation, naming, and Chilean RUT helpers |
| `tms-atomic-e2e` | Atomic E2E suites for finanzas and viajes |
| `tms-ultimamilla` | Ultima Milla module flows and batch behavior |
| `tms-allure` | Allure reporting conventions |
| `tms-commits` | Commit discipline for this repo |

### Jira / Utility Skills

| Skill | Purpose |
| --- | --- |
| `jira-ticket-writer` | Jira-ready QA automation stories and subtasks |
| `jql-tickets` | Ready-to-test JQL query |
| `jira-qa-format` | Jira QA issue type formats (Test Set, Historia, Test Case) |
| `atlassian-mcp` | Atlassian MCP integration for Jira and Confluence |
| `jira-integration` | Jira REST API patterns for issue CRUD and search |
| `jira-automation` | Jira Automation rules, sprint management, workflows |
| `playwright-cli` | Browser automation from the CLI |
| `skill-creator` | Creating or evolving repo-local skills |

### SDD Skills

| Skill | Purpose |
| --- | --- |
| `sdd-init` | Initialize SDD context |
| `sdd-explore` | Explore a change before implementation |
| `sdd-propose` | Write a change proposal |
| `sdd-spec` | Write delta specs |
| `sdd-design` | Write technical design |
| `sdd-tasks` | Break work into implementation tasks |
| `sdd-apply` | Implement planned tasks |
| `sdd-verify` | Verify implementation against specs |
| `sdd-archive` | Archive a completed SDD change |

---

## Auto-Invoke Rules

Load the relevant skill before generating code.

| Action | Skill |
| --- | --- |
| Creating or refactoring a Page Object | `tms-page-objects` |
| Working with any TMS selector | `tms-selectors` |
| Working with any dropdown, date picker, or cascade | `tms-dropdowns` |
| Writing or restructuring a test file | `tms-tests` |
| Generating entity data or unique names | `tms-data` |
| Creating atomic E2E flows for prefactura, proforma, viajes | `tms-atomic-e2e` |
| Working in Ultima Milla | `tms-ultimamilla`, `tms-selectors`, `tms-dropdowns` |
| Updating Allure labels, suites, or report behavior | `tms-allure` |
| Preparing commits for this repo | `tms-commits` |
| Creating Jira QA automation tickets | `jira-ticket-writer` |
| Getting ready-to-test ticket JQL | `jql-tickets` |
| Running browser automation manually | `playwright-cli` |
| Creating or documenting Jira QA issue formats | `jira-qa-format` |
| Using Atlassian Jira/Confluence MCP | `atlassian-mcp` |
| Doing Jira REST API work | `jira-integration` |
| Setting up Jira Automation rules | `jira-automation` |
| Starting or continuing SDD work | matching `sdd-*` skill |

---

## Critical Rules

1. Never invent selectors. Check Confluence first and follow `tms-selectors`.
2. Never guess dropdown behavior. Follow `tms-dropdowns`.
3. Keep selectors inside Page Objects, not inside tests.
4. Use Winston logging. Do not leave `console.log` in project code.
5. Capture screenshots on failure paths.
6. Do not use `.fill()` on readonly date inputs unless the skill pattern explicitly allows it.
7. Wait after cascading selections when the UI needs server-side refresh.
8. Prefer stable, documented commands from `package.json` over ad-hoc Playwright CLI commands.
9. Always execute SDD in `interactive` mode, using `hybrid` artifact store (both local files in `openspec/` and memory in `engram`), and checking PR sizes via `ask-on-risk` (400-line budget limit).
10. Maintain `openspec/` structure strictly: central specs in `openspec/specs/` MUST follow the modular numbering (`00-config`, `01-entidades`, `02-operaciones`, `03-finanzas`, `05-ci-cd`, `99-utilidades`). Active changes reside in `openspec/changes/` and MUST be moved to `openspec/changes/archive/` prefixed with `YYYY-MM-DD-` upon completion.
11. Never execute `git push` without presenting a summary of accomplishments and remaining work, and obtaining explicit user authorization first.
12. Morning Start & Context Preflight: At the start of the day or session, the agent MUST inspect Engram (`mem_search`/`mem_context`) and the `openspec/changes/` directory to discover what task was in progress. The agent MUST state the active branch and active task to the user, and ask: "Estamos en la rama `<nombre>` trabajando en `<tarea>`. ¿Querés que sigamos con este trabajo o preferís que cree una nueva rama para otra tarea?". If continuing, the agent MUST automatically run `git checkout <rama>` to enter the branch. If starting a new task, the agent MUST suggest a new branch name according to Rule 13 (e.g. `feat/agy-<nueva-tarea>`) and check it out automatically after confirmation. The agent MUST NOT write code until the branch state is confirmed.
13. Parallel Agent Branching & Commit Conventions: To enable seamless parallel development across multiple agents (OpenCode = OC, Claude = CL, Antigravity = AGY) working on independent features, the following standards MUST be followed:
    - Branch naming format: `feat/<agent-prefix>-<feature-name>` (e.g., `feat/agy-viajes`, `feat/cl-proforma`, `feat/oc-prefactura`).
    - Commit message format: `<agent-prefix> | <conventional-commit>` (e.g., `oc | feat(finanzas): add seed data`, `cl | feat(pom): implement proforma page`, `agy | test(e2e): add regression scenarios`).
    - Daily Sync Rule: Before starting any code block, the agent MUST run `git fetch origin && git merge origin/main` to pull updates from main and resolve conflicts early.
14. Dependency & Environment Sync (npm install): 
    - The agent MUST automatically run `npm install` at the start of the daily session and whenever `package.json` changes (e.g. after branch checkouts, merging `origin/main` or pulling).
    - Periodically (every 4 hours of active work), the agent should run a quick check by executing `npm install` and `npm run typecheck` to verify that local dependencies and code types are perfectly synchronized and compilation is intact, alerting the user immediately if another agent introduced type errors.
15. GitHub PR Automation: Pull Requests are not automatically created on GitHub by `git push`. Therefore, immediately after a successful `git push` and user approval, the agent MUST offer to automatically run `gh pr create` (using the GitHub CLI) to create a draft or final PR, or generate a direct PR creation URL if the CLI is not available.
16. Post-Merge Auto-Cleanup & Sync: When the user merges a PR, the agent MUST automatically detect this or act upon user confirmation to clean up the workspace by running:
    1. Check out main: `git checkout main`
    2. Pull updates: `git pull origin main`
    3. Delete the local merged branch: `git branch -d <nombre-rama>` (safely)
    4. Sync packages: `npm install`
    This ensures the local workspace returns to main and updates all dependencies automatically without leaving dead branches behind.

---

## Repo Reality Check

These are the stable facts that current docs should reflect.

- Main web automation stack: Playwright + TypeScript + Winston.
- Supported web environments: `QA` and `DEMO`.
- Web browser target: Google Chrome via Playwright `channel: 'chrome'`; project names like `chromium-qa` and `chromium-demo` remain historical.
- Auth setup project name in `playwright.config.ts`: `Autorización`.
- Main workflow file: `.github/workflows/tests.yml`.
- Current workflow is `QA PR SUITE` and runs `typecheck` + `qa:e2e:finanzas-full` on QA.
- Skills live in `.agents/skills/`, not `skills/`.
- The repo also contains mobile automation in `tmsapp/mobile/` using WDIO.

---

## Project Structure

| Area | Path | Notes |
| --- | --- | --- |
| Core | `src/core/` | `BasePage.ts`, `BrowserManager.ts` |
| Config | `src/config/` | Environment and credentials |
| Utils | `src/utils/` | Logger, naming, RUT generation, env helpers |
| Modules | `src/modules/` | `auth`, `commercial`, `configAdmin`, `contracts`, `finanzas`, `monitoring`, `planning`, `transport`, `ultimamilla` |
| API helpers | `tests/api-helpers/` | `TmsApiClient`, `DataPathHelper`, `OperationalDataLoader`, helpers |
| E2E tests | `tests/e2e/` | `auth`, `modules`, `suites` |
| Scripts | `scripts/` | `run-playwright-suite.mjs`, CI validation, Engram, SDD |
| CI | `.github/workflows/` | Pull request automation |
| Mobile | `tmsapp/mobile/` | WDIO-based mobile automation |

---

## Verification Commands

Use commands that actually exist in `package.json`.

```bash
npm run typecheck
npm run qa:e2e:all
npm run demo:e2e:finanzas-full
npm run qa:smoke:ultimamilla:batch
npm run qa:config:smoke:all
```

If you need the exact current script name, check `package.json` before documenting it.

---

## Documentation Rules

When updating `AGENTS.md`, `CLAUDE.md`, or `GEMINI.md`:

1. Prefer durable facts over success metrics that go stale.
2. Do not claim a pass rate, test count, or branch policy unless it is actively verified.
3. Reference `.agents/skills/`, not `skills/`.
4. Reference real scripts from `package.json`.
5. Reference real Playwright project names from `playwright.config.ts`.
6. Keep `CLAUDE.md` and `GEMINI.md` as mirrors.

---

## Resources

- Confluence selectors database: <https://bermann.atlassian.net/wiki/spaces/QA/database/95125505>
- QA environment: <https://moveontruckqa.bermanntms.cl>
- Demo environment: <https://demo.bermanntms.cl>
- Repository: <https://github.com/samrdx/bermann-tms-automation>
- Human onboarding: `README.md`
- Architecture reference: `docs/ARCHITECTURE.md`
- CI/CD reference: `docs/CI_CD_SETUP.md`
