# Examples Directory

## Purpose

This directory contains **example files** for reference and manual testing. These files are **NOT executed** in CI/CD pipelines.

## Important Notes

⚠️ **Files in this directory:**
- Are excluded from `npm run test` and GitHub Actions
- Are for educational/reference purposes
- May contain incomplete or experimental code
- Require manual execution

## Available Examples

### api-vs-ui-comparison.example.ts

**Purpose:** Compare performance between UI automation and API automation

**Status:** 🚧 Partially implemented (API client not ready)

**Usage:**
```bash
# Run manually (will skip API tests until implemented)
npx playwright test examples/api-vs-ui-comparison.example.ts
```

**Expected Results:**
- UI automation baseline: ~15s per entity
- API automation target: ~1-2s per entity (when implemented)

## Adding New Examples

1. Create file with `.example.ts` extension
2. Add descriptive comment at top
3. Mark incomplete tests with `.skip()`
4. Document in this README

## Why Examples are Excluded from CI

1. **Performance:** Examples may be slow or experimental
2. **Stability:** May use incomplete features (like TmsApiClient)
3. **Cost:** Avoid unnecessary CI minutes
4. **Focus:** CI should only run production-ready tests

## Running Examples Locally

```bash
# Run all examples
npx playwright test examples/

# Run specific example
npx playwright test examples/api-vs-ui-comparison.example.ts

# Run with UI mode
npx playwright test examples/ --ui
```

---

**Note:** When examples become stable and useful, consider moving them to `tests/` directory.
