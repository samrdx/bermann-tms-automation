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

- **Confluence Selectors:** [Internal TMS Selector Database]
- **TMS QA Environment:** <https://moveontruckqa.bermanntms.cl>
- **GitHub Repository:** <https://github.com/samrdx/bermann-tms-automation>
- **Project Documentation:** README.md, CLAUDE.md, GEMINI.md
