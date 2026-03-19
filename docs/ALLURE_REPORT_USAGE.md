# Allure Report Usage (Current CI)

## Current status
The latest patch is pushed on branch `codex/fix/ci`.

This folder already looks like a generated Allure report (it has `index.html`, `app.js`, `widgets/`, `data/`):

`C:/Users/samue/OneDrive/Documentos/BERMANN/Allure_Reports`

So you do **not** need to generate it again.

## Open the report from your current folder

### Option A (recommended): run a local web server
1. Open PowerShell.
2. Run:

```powershell
cd "C:/Users/samue/OneDrive/Documentos/BERMANN/Allure_Reports"
python -m http.server 5050
```

3. Open in browser:

`http://localhost:5050`

Notes:
- Keep that terminal open while viewing the report.
- If `python` is not available, see Option B.

### Option B: with Node

```powershell
cd "C:/Users/samue/OneDrive/Documentos/BERMANN/Allure_Reports"
npx --yes http-server -p 5050
```

Then open `http://localhost:5050`.

### Option C: double click `index.html`
It may work, but sometimes JS/assets fail with `file://` mode. If page is blank, use Option A/B.

## If you downloaded a ZIP from Actions

1. Extract ZIP:

```powershell
Expand-Archive -Path "C:/path/to/artifact.zip" -DestinationPath "C:/path/to/unzipped" -Force
```

2. Find `index.html`:

```powershell
Get-ChildItem -Path "C:/path/to/unzipped" -Recurse -Filter index.html
```

3. Start server in the folder that contains that `index.html`.

## If you only have `allure-results` (not generated HTML)
Generate report first:

```powershell
cd "C:/projects/bermann-tms-automation"
npx allure generate allure-results -o allure-report --clean
npx allure open allure-report
```

For QA/DEMO split results:

```powershell
npx allure generate allure-results-qa -o allure-report-qa --clean
npx allure generate allure-results-demo -o allure-report-demo --clean
```

## Troubleshooting
- Blank page: use local server (Option A/B), do not open directly with `file://`.
- Port in use: change `5050` to another port (`5051`, `8080`, etc.).
- Missing files in report folder: make sure `index.html`, `app.js`, `styles.css`, `data/`, `widgets/` exist together.

## CI note
In current workflows, report publication is protected by final gates:
- `tests.yml`: auth + atomic gates per environment.
- `allure-nightly.yml`: nightly final gate validates suites and report/publish steps.
