## Exploration: Update README.md with Allure and Demo Info

### Current State
The `README.md` file was last updated in February 2026. Since then, the framework has evolved:
- **Allure Reports**: New scripts and reporting infrastructure added (`allure:serve`, `allure:generate`, etc.).
- **Demo Environment**: Full support for Demo site with specialized scripts (`test:demo:*`).
- **Monitoring Module**: A 6th module has been fully implemented.
- **Test Classification**: Distinction between "Atomic" (independent) and "Legacy" (sequential/dependent) tests.
- **Pass Rate**: 100% verified on Chromium and Firefox (WebKit removed).
- **Project Structure**: Some files like `last-run-data-webkit.json` are obsolete and should be removed from documentation.

### Affected Areas
- `README.md` — Content update to reflect current state.

### Approaches
1. **Full Sync with GEMINI.md** — Adopt the updated structure and tables from `GEMINI.md` into `README.md`.
   - Pros: Consistent documentation, uses already verified information.
   - Cons: Requires careful merging to preserve user-facing README sections like "Quick Start".
   - Effort: Low

### Recommendation
I recommend doing a full sync of the technical info and status dashboard from `GEMINI.md` into `README.md`, while maintaining the "Quick Start" and "Prerequisites" sections at the top for first-time users.

### Risks
- Minor discrepancies if `GEMINI.md` has any typos (none found during exploration).

### Ready for Proposal
Yes — The requirements are clear and the source of truth (`GEMINI.md`) is available.
