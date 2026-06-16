## Technical Design: Update README.md with Allure and Demo Info

### Architecture Decision: `GEMINI.md` as Source of Truth
- **Decision**: Use `GEMINI.md` (last updated 2026-03-07) as the authoritative source for project status and structure.
- **Rationale**: `GEMINI.md` is more frequently updated to support AI assistants and currently contains more detailed info than `README.md`.

### Approach
- **Section Syncing**: Group content from `GEMINI.md` into the existing `README.md` structure.
- **Preservation**: Do NOT remove the "Quick Start" or "Docker" sections unless they are incorrect.
- **Modernization**: Use the GitHub-style alerts if applicable, though standard Markdown is preferred for README compatibility.

### Structural Changes
1.  **Overview Section**: Add the "Project Status Dashboard" table before the standard overview.
2.  **Running Tests**: Replace the simple table with grouped bash commands for:
    - Smoke/Auth
    - Atomic E2E (Full Flow)
    - Legacy QA (Dependent)
    - Allure Reports
3.  **CI/CD**: Add the "Hybrid Workflow" description.
4.  **Data Generation**: Add a brief summary of RUT and unique timestamp generation.
