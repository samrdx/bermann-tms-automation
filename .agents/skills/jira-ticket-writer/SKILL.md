---
name: jira-ticket-writer
description: >
  Generates Jira-ready QA automation User Stories and subtasks using a
  production template focused on testability and implementation clarity.
  Trigger: When user asks to create a Jira ticket, User Story, QA automation
  story, or split work into implementation subtasks.
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.0"
---

## When to Use

- User asks for a Jira ticket, User Story, or QA automation planning item.
- User needs one story split into technical subtasks.
- User needs a copy/paste checklist for Jira execution and tracking.

## Required Inputs

- Feature or process under test (module, flow, screen).
- Business goal and QA automation goal.
- Scope boundaries (in/out of scope).
- Environments, test data needs, and dependencies.
- Constraints (timeline, blockers, non-functional expectations).

If input is incomplete, infer from project conventions and clearly mark assumptions.

## Output Formats

### A) Full Story Ticket

Provide one complete story with these sections (in order):
1. Context
2. Scope (In/Out)
3. Requirements
4. Acceptance Criteria (testable, Given/When/Then or bullet checks)
5. Definition of Done (DoD)
6. Subtasks
7. Risks/Dependencies
8. Notes for Dev/QA

### B) Split Subtasks

Return granular subtasks grouped by stream:
- Analysis and selectors
- Page Objects/Actions/Flows
- E2E tests and fixtures/data
- Reporting, evidence, and CI checks

Each subtask includes: objective, owner hint (Dev/QA), and done condition.

### C) Copy/Paste Checklist

Return a Jira-friendly checklist with short, actionable lines:
- [ ] requirement validated
- [ ] selector strategy defined
- [ ] automation coverage implemented
- [ ] AC verified in QA env
- [ ] evidence attached (screenshots/logs)
- [ ] docs updated

## Practical Ticket Template

```md
Title: [QA-AUTO][{Module}] {Outcome-focused story title}

## Context
{Why this automation is needed and current pain/risk}

## Scope
### In Scope
- {Flow/path 1}
- {Flow/path 2}

### Out of Scope
- {Explicit exclusion 1}

## Requirements
- {Functional requirement 1}
- {Automation requirement 1}
- {Observability/reporting requirement}

## Acceptance Criteria
1. Given {state}, when {action}, then {expected result}
2. Given {state}, when {action}, then {expected evidence/log/assertion}

## Definition of Done (DoD)
- Test cases implemented and stable in target env
- Page Objects/selectors follow project conventions
- Failures capture screenshot + actionable logs
- Documentation/checklist updated in Jira ticket

## Subtasks
- [ ] Analyze flow and dependencies
- [ ] Implement/update Page Objects and actions
- [ ] Implement E2E scenarios and data strategy
- [ ] Add assertions, logs, and failure evidence
- [ ] Execute and attach run results

## Risks/Dependencies
- {Dependency 1}
- {Risk + mitigation}

## Notes for Dev/QA
- Dev: {integration or feature-flag notes}
- QA: {data setup, environment caveats, reproducibility notes}
```

## Quality Rubric (Lightweight)

Use this quick score before finalizing (0/1 each, target >= 6):
- Clear business and QA context
- Scope boundaries explicit
- Requirements are implementation-actionable
- Acceptance criteria are testable and objective
- DoD includes evidence and stability expectations
- Subtasks are independently executable
- Risks/dependencies identified with mitigation

If score < 6, revise missing sections before delivering.

## Anti-Patterns

- Vague AC ("works correctly", "as expected") without measurable checks.
- Mixing in-scope and out-of-scope items.
- Subtasks that are too broad ("implement automation") with no done condition.
- Missing environment/data assumptions.

## Bilingual Hint

- Default to Spanish-first output for this project.
- Provide optional English variant when user requests "EN" or needs cross-team sharing.
- Keep structure identical across languages to ease copy/paste into Jira.
