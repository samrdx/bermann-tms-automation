# CI/CD Setup Guide

## GitHub Actions Configuration

### Overview

The project uses GitHub Actions for continuous integration testing. The workflow runs:
- **Smoke tests:** Quick auth verification (~2 minutes)
- **Full E2E tests:** Complete test suite (~10 minutes)

---

## Repository Secrets Configuration

### Required Secrets

Navigate to: `GitHub Repository → Settings → Secrets and variables → Actions`

#### 1. TMS_USER

**Description:** TMS QA environment username

**Value:** `arivas` (or your test user)

**How to add:**
```
1. Go to: https://github.com/[your-repo]/settings/secrets/actions
2. Click "New repository secret"
3. Name: TMS_USER
4. Secret: arivas
5. Click "Add secret"
```

#### 2. TMS_PASS

**Description:** TMS QA environment password

**Value:** `arivas` (or your test password)

**How to add:**
```
1. Go to: https://github.com/[your-repo]/settings/secrets/actions
2. Click "New repository secret"
3. Name: TMS_PASS
4. Secret: arivas
5. Click "Add secret"
```

**Note:** If secrets are not configured, workflow falls back to default values (arivas/arivas)

---

## Workflow Files

### Main Workflow: `.github/workflows/tests.yml`

**Triggers:**
- Push to `main` or `develop` branches
- Pull requests to `main`
- Manual trigger (workflow_dispatch)

**Jobs:**

#### 1. Smoke Tests (Fast - ~2 minutes)
```yaml
- Verify TypeScript compilation
- Run auth.setup.ts (login test)
- Upload results
```

**Purpose:** Quick feedback on basic functionality

#### 2. Full E2E Tests (~10 minutes)
```yaml
- Install dependencies
- Run all chromium tests with setup
- Upload HTML report
- Upload screenshots on failure
- Comment PR with results
```

**Purpose:** Complete regression testing

---

## Local Testing Before CI

### 1. Verify TypeScript Compilation

```bash
npx tsc --noEmit
```

**Expected:** No errors

### 2. Run Smoke Tests Locally

```bash
# Set environment variables (Windows)
set TMS_USER=arivas
set TMS_PASS=arivas

# Set environment variables (Linux/Mac)
export TMS_USER=arivas
export TMS_PASS=arivas

# Run auth setup only
npx playwright test tests/helpers/auth.setup.ts --project=setup
```

**Expected:** ✅ 1 test passed

### 3. Run Full Test Suite

```bash
# Run chromium only (same as CI)
npx playwright test --project=chromium
```

**Expected:** All tests pass or skip gracefully

---

## Viewing CI Results

### GitHub Actions UI

1. **Go to:** `GitHub Repository → Actions tab`
2. **Select:** Latest workflow run
3. **View:**
   - Test results summary
   - Job logs
   - Artifacts (reports, screenshots, logs)

### Download Artifacts

**Available artifacts:**
- `playwright-report-chromium` - HTML test report
- `test-results-chromium` - Raw test results
- `screenshots-chromium` - Screenshots of failures
- `logs-chromium` - Winston logs
- `last-run-data-chromium` - Worker-specific JSON data
- `smoke-test-results` - Smoke test report

**How to download:**
```
1. GitHub → Actions → [Workflow run]
2. Scroll to "Artifacts" section
3. Click artifact name to download
```

---

## Troubleshooting CI Failures

### Issue 1: TypeScript Compilation Errors

**Symptom:**
```
Step "Verify TypeScript compilation" fails
Error: TS2307: Cannot find module...
```

**Solution:**
```bash
# Locally run:
npx tsc --noEmit

# Fix any errors, then commit
git add .
git commit -m "fix: resolve TypeScript errors"
git push
```

---

### Issue 2: Authentication Failures

**Symptom:**
```
Step "Run smoke tests" fails
Error: Timeout waiting for .logo-min selector
```

**Possible causes:**
1. Wrong credentials in GitHub Secrets
2. TMS QA environment down
3. TMS login page changed

**Solution:**

**Check secrets:**
```
GitHub → Settings → Secrets → Actions
Verify:
  TMS_USER = arivas
  TMS_PASS = arivas
```

**Test locally:**
```bash
export TMS_USER=arivas
export TMS_PASS=arivas
npx playwright test tests/helpers/auth.setup.ts --project=setup --headed
```

**Check TMS QA:**
```
Visit: https://moveontruckqa.bermanntms.cl
Verify site is accessible
Try manual login with arivas/arivas
```

---

### Issue 3: Base Entities Setup Failures

**Symptom:**
```
Step "Run E2E tests" fails
Error: Worker-specific data file not found!
Expected: last-run-data-chromium.json
```

**Cause:** Tests depend on base-entities.setup.ts running first

**Solution:**

The playwright.config.ts already has dependencies configured:
```typescript
projects: [
  { name: 'setup', testMatch: /auth\.setup\.ts/ },
  {
    name: 'base-entities-chromium',
    dependencies: ['setup']  // ✅ Runs after auth
  },
  {
    name: 'chromium',
    dependencies: ['setup', 'base-entities-chromium']  // ✅ Runs after both
  }
]
```

**Verify locally:**
```bash
# This should run in order: setup → base-entities → tests
npx playwright test --project=chromium
```

---

### Issue 4: Headless Mode Issues

**Symptom:**
```
Tests pass locally but fail in CI
Error: Element not visible / Timeout
```

**Cause:** Some elements behave differently in headless mode

**Solution:**

**Test locally in headless:**
```bash
npx playwright test --project=chromium --headed=false
```

**If issue persists, add explicit waits:**
```typescript
// In page object
await this.page.waitForSelector(selector, { state: 'visible' });
await this.page.waitForTimeout(500); // Last resort
```

---

### Issue 5: Network Timeouts

**Symptom:**
```
Error: Timeout 60000ms exceeded waiting for network response
```

**Cause:** TMS QA slow or unstable in CI

**Solution:**

**Increase timeout in playwright.config.ts:**
```typescript
export default defineConfig({
  timeout: 90000,  // Increase from 60000
  use: {
    navigationTimeout: 45000,  // Add navigation timeout
    actionTimeout: 15000,      // Add action timeout
  }
});
```

---

## Workflow Optimization

### Current Configuration

| Setting | Value | Reason |
|---------|-------|--------|
| Browsers | Chromium only | Faster CI (3x faster than 3 browsers) |
| Workers | 1 | Sequential for stability |
| Timeout | 30 minutes | Enough for 13 tests |
| Retries | 0 | Fail fast, no retries (for now) |

### Future Optimizations (After API Automation)

```yaml
# When API automation is implemented:
strategy:
  matrix:
    browser: [chromium, firefox, webkit]  # Add all browsers

timeout-minutes: 15  # Reduced from 30 (6x faster setup)
```

---

## Branch Protection Rules

### Recommended Settings

**Go to:** `GitHub → Settings → Branches → Branch protection rules`

**For `main` branch:**

```yaml
✅ Require a pull request before merging
✅ Require status checks to pass before merging
   Required checks:
     - test / smoke-tests
     - test / test (chromium)
✅ Require branches to be up to date before merging
❌ Require deployments to succeed (not needed)
❌ Require signed commits (optional)
```

**Effect:**
- No direct pushes to main
- All PRs must pass CI before merge
- Prevents broken code in production

---

## Manual Workflow Trigger

### Run Workflow Manually

**Use case:** Test changes without pushing

**Steps:**
```
1. GitHub → Actions tab
2. Select "QA Tests CI" workflow
3. Click "Run workflow" button (top right)
4. Select branch
5. Click "Run workflow" (green button)
```

**When to use:**
- Testing workflow changes
- Re-running failed tests
- Testing on feature branch

---

## Cost & Performance

### GitHub Actions Free Tier

| Plan | Minutes/month | Cost |
|------|---------------|------|
| Public repo | Unlimited | Free |
| Private repo | 2000 minutes | Free |
| Additional | 1000 minutes | $0.008/min |

### Current Usage

| Job | Duration | Monthly Cost (50 runs) |
|-----|----------|------------------------|
| Smoke tests | 2 min | Free |
| Full E2E tests | 10 min | Free (500 min total) |
| **Total** | **12 min** | **$0** |

**Note:** Well within free tier limits

---

## Monitoring & Alerts

### Email Notifications

**GitHub automatically sends emails for:**
- ❌ Workflow failures
- ✅ Workflow success (configurable)

**Configure:**
```
GitHub → Settings → Notifications → Actions
Select: "Only notify for failed workflows"
```

### Slack Integration (Optional)

**Future enhancement:**
```yaml
- name: Slack notification
  uses: 8398a7/action-slack@v3
  with:
    status: ${{ job.status }}
    webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

---

## Debugging Failed Runs

### Step-by-Step Guide

1. **Go to failed run:**
   ```
   GitHub → Actions → [Failed workflow]
   ```

2. **Identify failed step:**
   ```
   Look for red X marks in job steps
   Expand step to see error logs
   ```

3. **Download artifacts:**
   ```
   Scroll to "Artifacts" section
   Download:
     - playwright-report (HTML report with screenshots)
     - logs (Winston logs)
     - screenshots (failure screenshots)
   ```

4. **Analyze locally:**
   ```bash
   # Unzip playwright-report
   # Open index.html in browser
   # Click failed test to see:
   #   - Screenshot
   #   - Error message
   #   - Stack trace
   ```

5. **Reproduce locally:**
   ```bash
   # Run exact same test
   npx playwright test [test-file] --project=chromium --headed=false
   ```

6. **Fix and re-run:**
   ```bash
   # Fix issue
   git add .
   git commit -m "fix: resolve CI failure"
   git push

   # CI will automatically re-run
   ```

---

## Best Practices

### ✅ DO

1. **Run tests locally before pushing:**
   ```bash
   npx tsc --noEmit
   npx playwright test --project=chromium
   ```

2. **Use meaningful commit messages:**
   ```bash
   git commit -m "fix: resolve auth timeout in CI"
   git commit -m "feat: add reportes module tests"
   ```

3. **Check CI status before merging:**
   - Wait for green checkmark
   - Review test report artifacts

4. **Keep secrets secure:**
   - Never commit credentials to code
   - Use GitHub Secrets for sensitive data

### ❌ DON'T

1. **Don't skip CI:**
   - Don't push with `[skip ci]` unless absolutely necessary
   - CI is your safety net

2. **Don't ignore flaky tests:**
   - Fix them immediately
   - Flaky tests undermine confidence

3. **Don't hardcode credentials:**
   ```typescript
   // ❌ BAD
   const user = 'arivas';

   // ✅ GOOD
   const user = process.env.TMS_USER || 'arivas';
   ```

---

## Next Steps

### Week 1: Stabilize CI

- [ ] Configure GitHub Secrets (TMS_USER, TMS_PASS)
- [ ] Verify all tests pass in CI
- [ ] Enable branch protection rules
- [ ] Document any CI-specific issues

### Week 2: Optimize

- [ ] Implement API automation (6x faster)
- [ ] Reduce CI execution time
- [ ] Add more browsers (firefox, webkit)

### Week 3: Scale

- [ ] Add visual regression tests
- [ ] Add accessibility tests
- [ ] Implement nightly full regression suite

---

## Quick Reference

### Environment Variables

| Variable | CI Value | Local Default |
|----------|----------|---------------|
| TMS_USER | From GitHub Secret | From credentials.ts |
| TMS_PASS | From GitHub Secret | From credentials.ts |
| BASE_URL_DEV | moveontruckqa.bermanntms.cl | Same |
| HEADLESS | true | false |
| TIMEOUT | 60000 | 60000 |

### Useful Commands

```bash
# Verify TypeScript
npx tsc --noEmit

# Run smoke tests
npx playwright test tests/helpers/auth.setup.ts --project=setup

# Run chromium only (like CI)
npx playwright test --project=chromium

# Run in headless (like CI)
npx playwright test --project=chromium --headed=false

# View HTML report
npx playwright show-report
```

---

**Document Status:** ✅ Complete
**Last Updated:** February 6, 2026
**Next Review:** After first successful CI run
