# GitHub Actions CI/CD Setup Guide

## Problem Fixed

Tests were failing in GitHub Actions with error:

```
❌ 7/7 tests FAILED in ~1.2s each
```

**Root Cause:** Missing GitHub Secrets for user credentials.

---

## ✅ Solution Applied

Updated [`.github/workflows/tests.yml`](file:///c:/projects/bermann-tms-automation/.github/workflows/tests.yml) with:

1. **Missing environment variables** for credentials
2. **Improved configuration**:
   - Node.js 20 (was 18)
   - `npm ci` instead of `npm install` (faster, reproducible)
   - Added workflow_dispatch for manual triggers
   - Added test report and logs upload

---

## 🔑 Required GitHub Secrets

You **MUST** add the following secrets to your GitHub repository:

### How to Add Secrets:

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add each secret below:

| Secret Name      | Description                                    | Example Value |
| ---------------- | ---------------------------------------------- | ------------- |
| `USERNAME_DEV`   | QA environment username (maps to regular user) | `arivas`      |
| `PASSWORD_DEV`   | QA environment password (maps to regular user) | `arivas`      |
| `GEMINI_API_KEY` | Gemini API key (optional, for Stagehand tests) | `AIza...`     |

**Note:** The codebase automatically maps `USERNAME_DEV`/`PASSWORD_DEV` (CI/CD style) to `TEST_REGULAR_USER`/`TEST_REGULAR_PASS` (local dev style) via [`credentials.ts`](file:///c:/projects/bermann-tms-automation/src/config/credentials.ts).

### Without these secrets, the tests WILL FAIL!

The tests need to log in to the TMS system, which requires credentials.

---

## 📋 Workflow Configuration

Current configuration in `tests.yml`:

```yaml
env:
  # User Credentials (REQUIRED)
  USERNAME_DEV: ${{ secrets.USERNAME_DEV }}
  PASSWORD_DEV: ${{ secrets.PASSWORD_DEV }}

  # URLs
  BASE_URL_DEV: https://moveontruckqa.bermanntms.cl

  # Configuration
  HEADLESS: true
  TIMEOUT: 30000
```

---

## 🚀 How to Trigger Tests

### Automatic Triggers:

- **Push to `main` branch** → Runs tests automatically
- **Pull Request to `main`** → Runs tests automatically

### Manual Trigger:

1. Go to **Actions** tab in GitHub
2. Select "QA Tests" workflow
3. Click "Run workflow"

---

## 📊 Artifacts Generated

After each test run, the following artifacts are uploaded:

| Artifact        | When       | Retention |
| --------------- | ---------- | --------- |
| **test-report** | Always     | 30 days   |
| **screenshots** | Always     | 7 days    |
| **logs**        | On failure | 7 days    |

Download artifacts from the GitHub Actions run page.

---

## ✅ Next Steps

1. **Add the required secrets** to GitHub (see above)
2. **Commit and push** the updated `tests.yml` file
3. **Trigger a test run** (push to main or manual trigger)
4. **Verify** tests pass in GitHub Actions

---

**Last Updated:** 2026-02-02  
**Fixed By:** Antigravity AI Agent
