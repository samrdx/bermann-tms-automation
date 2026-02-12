# Agent Assistance Prompts

Proven prompts and interaction patterns for AI-assisted test automation development in the Bermann TMS project.

This document captures **how to get good results** from AI agents. For project context, see [CLAUDE.md](CLAUDE.md). For skills index, see [AGENTS.md](AGENTS.md).

---

## Which Agent for What

| Agent | Best For | Context File |
| --- | --- | --- |
| Claude (Claude Code / claude.ai) | Strategic planning, architecture, debugging, multi-file refactors | [CLAUDE.md](CLAUDE.md) |
| Gemini (Google AI Studio) | Code generation, pattern replication, quick utilities | This file |
| Cursor AI | Inline completion, small refactors, file-scoped edits | `.cursorrules` |
| All agents | Must follow [AGENTS.md](AGENTS.md) skills system | [AGENTS.md](AGENTS.md) |

---

## Proven Prompts for Code Generation

### Creating a New Page Object

```text
Using the tms-page-objects skill (skills/tms-page-objects/SKILL.md), create [ModuleName]Page.ts.

Context:
- Module location: src/modules/[domain]/pages/
- Extends BasePage from src/core/BasePage.ts
- Uses Winston logger

Selectors (from Confluence):
- [field1]: '#selector-1'
- [field2]: 'button[data-id="selector-2"]'
- [dropdown]: '.bs-searchbox input[type="text"]'

Required methods:
- navigate() -> goes to /[route]
- fill[Field1]() -> fills the form field
- select[Dropdown]() -> selects dropdown option
- submit() -> clicks save button

Follow the same pattern as ContratosFormPage.ts.
```

**Why this works:** References the skill explicitly, provides Confluence selectors, specifies the template file.

### Creating a New Test File

```text
Using the tms-tests skill, create [module-action].test.ts.

Requirements:
- 4-phase structure (Setup, Navigation, Action, Verification)
- Loads data from last-run-data-{browser}.json via DataPathHelper
- Uses [PageName]Page for all interactions
- Winston logging at each phase
- Screenshots on error
- 60-second timeout

Data needed from JSON:
- transportistaName (from base-entities setup)
- clienteName (from base-entities setup)

Reference: contrato-crear.test.ts for the pattern.
```

### Creating a New Factory

```text
Using the tms-data skill, create [ModuleName]Factory.ts.

Requirements:
- Location: src/modules/[domain]/factories/
- Static method generate() returns a typed data object
- Uses generateValidChileanRUT() from src/utils/rutGenerator.ts
- Uses timestamp strategy for unique names: Math.floor(Date.now() / 1000) % 1000000
- All fields typed with an interface

Reference: TransportistaFactory.ts for the pattern.
```

### Working with Bootstrap Dropdowns

```text
Using the tms-dropdowns skill, implement the [dropdownName] dropdown.

Dropdown characteristics:
- Type: [Simple / Long with Scroll / With Search / Cascading / Date Picker]
- Approximate option count: [number]
- Has search box: [yes/no]
- Is cascading from: [parent dropdown name, if applicable]

Selector (from Confluence):
- Toggle button: 'button[data-id="[field-id]"]'
- Search input: '.bs-searchbox input[type="text"]' (if applicable)

If cascading, wait 1.5s after parent selection before interacting.
```

### Debugging Selector Issues

```text
A selector is not working in the [ModuleName] page.

Current selector: '[selector]'
Expected behavior: [what should happen]
Actual behavior: [what happens instead]
Error message: [paste error]

Check tms-selectors skill for priority rules.
The page URL is: https://moveontruckqa.bermanntms.cl/[route]

Suggest alternative selectors following the priority order:
1. id
2. data-id
3. name attribute
4. aria-*
5. CSS class (last resort)
```

---

## Proven Prompts for Architecture and Planning

### Adding a New Module to the Framework

```text
I need to add a new module for [ModuleName] to the automation framework.

The TMS page is at: /[route]
It has these form fields: [list fields with their HTML attributes]
It has these dropdowns: [list dropdowns with type]

Plan the full implementation:
1. Page Object (following tms-page-objects skill)
2. Factory (following tms-data skill)
3. Test file (following tms-tests skill)
4. Integration with base-entities.setup.ts (if needed)
5. npm script in package.json

Follow the same structure as the contracts module (src/modules/contracts/).
```

### Debugging CI Failures

```text
The GitHub Actions workflow [playwright.yml / tests.yml] is failing.

Error output:
[paste relevant error lines]

Job that failed: [atomic-suite / legacy-suite / test]
Step that failed: [step name]

Check:
1. Are the GitHub Secrets configured? (USERNAME_DEV, PASSWORD_DEV)
2. Is the BASE_URL reachable from GitHub runners?
3. Is the Playwright version matching between package.json and Docker image?
4. Are there timeout issues? (CI uses 180s timeout vs 60s local)

Reference: CLOUD.md for CI architecture, docs/CI_CD_SETUP.md for setup.
```

### Analyzing Test Flakiness

```text
The test [test-name] passes locally but fails intermittently in CI.

Local config: 3 workers, 0 retries, 60s timeout
CI config: 1 worker, 2 retries, 180s timeout

Symptoms:
- [describe what happens]
- Fails approximately [X]% of the time

Possible causes to investigate:
1. Timing issues (CI is slower - need longer waits?)
2. Cascading dropdown not loaded (need waitForTimeout after parent?)
3. Data collision (another CI run using same QA environment?)
4. Session state (auth token expired during long test?)

Reference the tms-dropdowns skill for timing patterns.
```

---

## Anti-Patterns: Prompts That Don't Work

| Bad Prompt | Why It Fails | Better Prompt |
| --- | --- | --- |
| "Create a page object for Contratos" | Too vague, no selectors, no skill reference | "Using tms-page-objects skill, create ContratosFormPage with these Confluence selectors: [list]" |
| "Fix this test" | No context about what fails or where | "The contrato-crear test fails at Phase 3 with timeout on selector '#save-btn'. Here's the error: [paste]" |
| "Make it faster" | No metrics or constraints | "The full-flow suite takes 130s, target is 90s. Profile which test step is slowest" |
| "Add a dropdown" | Doesn't specify type or behavior | "Using tms-dropdowns skill, add a cascading dropdown for Tipo -> Transportista with search" |
| "Write tests for everything" | Scope too broad | "Write a test for creating a Vehiculo entity, following the transportistas-crear.test.ts pattern" |

---

## Prompt Techniques That Improve Output

1. **Always reference the skill:** "Using the tms-dropdowns skill..." forces the agent to read authoritative patterns first.

2. **Provide Confluence selectors:** Don't let the AI guess selectors. Paste the exact IDs, data-ids, and class names from the Confluence database.

3. **Specify the template file:** "Follow the pattern in ContratosFormPage.ts" gives the agent a concrete example to match.

4. **Include the data shape:** When tests need JSON data, describe what fields are expected and where they come from.

5. **Set constraints:** "TypeScript strict mode, no `any`, Winston logging, .js extensions on imports" prevents common mistakes.

6. **Describe the dropdown type:** Bootstrap Select dropdowns have 5 distinct patterns. Telling the agent which type prevents trial-and-error.

7. **Reference the phase structure:** "4-phase test: Setup, Navigation, Action, Verification" ensures consistent test organization.

---

## Session Workflow: Start-to-Finish for New Module

A recommended sequence for adding a complete new module to the framework:

```text
Prompt 1 (Architecture):
"I need to add a [Module] module. The TMS page is at /[route].
Plan the file structure following existing patterns."

Prompt 2 (Page Object):
"Using tms-page-objects skill, create [Module]Page.ts with these selectors: [list].
Follow ContratosFormPage.ts as template."

Prompt 3 (Factory):
"Using tms-data skill, create [Module]Factory.ts.
Use RUT generator and timestamp strategy for unique data."

Prompt 4 (Test):
"Using tms-tests skill, create [module]-crear.test.ts.
4-phase structure, loads from JSON, screenshots on error."

Prompt 5 (Integration):
"Add [Module] creation to base-entities.setup.ts Step [N].
Create [Module]Helper.ts in tests/api-helpers/.
Add npm script 'test:[module]' to package.json."

Prompt 6 (Verification):
"Run npx tsc --noEmit to check compilation.
Run the new test in headed mode for visual verification."
```

---

## Changelog

| Date | Change |
| --- | --- |
| 2026-02-12 | Repurposed from Gemini agent context to Agent Assistance Prompts reference |
| 2026-02-09 | Original creation as Gemini-specific context document |
