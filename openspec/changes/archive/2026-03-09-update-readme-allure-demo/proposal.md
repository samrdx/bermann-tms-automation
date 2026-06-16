## Proposal: Update README.md with Allure and Demo Info

### Goal
Sync the user-facing `README.md` with the current state of the framework to include Allure reporting and Demo environment information.

### Intent
Ensure the main entry point for the repository provides accurate, up-to-date, and useful information for both humans and AI agents.

### Scope
- Update the **Project Status Dashboard** (from `GEMINI.md`).
- Update the **Metric table** (from `GEMINI.md`).
- Update **Running Tests** section to include:
  - Allure reporting scripts.
  - New Demo environment scripts.
  - Distinction between Atomic and Legacy tests.
- Update **Project Structure** to remove obsolete WebKit refs and add new module/helper folders.
- Update **Environment Variables** with standard `TMS_USERNAME` / `TMS_PASSWORD` format.

### Rollback Plan
- Revert `README.md` to previous git state.

### Affected Areas
- `README.md`

### Verification
- Manual verification of link integrity.
- Verify that scripts in `README.md` match `package.json`.
- Check formatting of new tables.
