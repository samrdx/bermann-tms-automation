# Bermann TMS Agent Skills

Repo-local AI skills for Bermann TMS QA automation. These files are operational instructions for AI agents; they are not test fixtures, generated artifacts, or runtime code.

## Source of truth

- Main routing rules: `AGENTS.md`
- Skill files: `.agents/skills/<skill-name>/SKILL.md`
- Do not use a root `skills/` folder; this repo standard is `.agents/skills/`.

## Current skill groups

| Group | Skills | Purpose |
|---|---|---|
| TMS automation | `tms-selectors`, `tms-dropdowns`, `tms-page-objects`, `tms-tests`, `tms-data`, `tms-atomic-e2e`, `tms-ultimamilla`, `tms-allure`, `tms-commits` | Project-specific Playwright/TMS patterns. |
| SDD workflow | `sdd-init`, `sdd-explore`, `sdd-propose`, `sdd-spec`, `sdd-design`, `sdd-tasks`, `sdd-apply`, `sdd-verify`, `sdd-archive` | Spec-driven development phase instructions. |
| Jira / utility | `jira-ticket-writer`, `jql-tickets`, `playwright-cli`, `skill-creator` | Ticket writing, JQL helper, manual browser automation, and skill authoring. |

## Maintenance rules

1. Keep each skill focused on one job.
2. Update `AGENTS.md` when adding, removing, or renaming a skill.
3. Do not add stale installer examples or external template paths here.
4. Do not store secrets, credentials, screenshots, reports, or generated test output in this directory.

## Quick check

Before changing a TMS test or Page Object, load the matching skill from this directory. For example:

- Selectors -> `tms-selectors`
- Dropdowns/date pickers/cascades -> `tms-dropdowns`
- Page Objects -> `tms-page-objects`
- Test files -> `tms-tests`
- Allure metadata/report behavior -> `tms-allure`
