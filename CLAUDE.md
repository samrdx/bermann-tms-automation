# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

QA Automation Framework for Bermann TMS (Transport Management System) using Playwright, TypeScript, and Stagehand AI for intelligent test automation.

**Target Application:** https://moveontruckqa.bermanntms.cl

## Commands

```bash
# Run all tests
npm run test:all

# Individual test suites
npm run test:login           # Login with visible browser
npm run test:login:headless  # Login headless
npm run test:logout          # Logout flow
npm run test:full-flow       # Complete login -> dashboard -> logout
npm run test:login:negative  # Invalid credential scenarios

# AI-powered tests (Stagehand + Gemini)
npm run test:stagehand:ai-login  # Login using natural language AI

# Build and clean
npm run build                # Compile TypeScript
npm run clean                # Remove dist, logs, screenshots
```

## Architecture

### Core Layer (`src/core/`)
- **BrowserManager** - Playwright browser lifecycle (launch, context, page, close). Supports chromium/firefox/webkit, video recording in non-prod environments
- **StagehandManager** - AI automation wrapper using Stagehand v3 with Gemini. Provides `act()`, `extract()`, `observe()` methods for natural language browser control. Tracks usage/cost
- **BasePage** - Abstract base class for Page Objects with common methods: `navigate()`, `fill()`, `click()`, `waitForElement()`, `takeScreenshot()`

### Page Objects (`src/pages/`)
- **LoginPage** - Login form automation with credential handling and success verification
- **DashboardPage** - Post-login navigation, user dropdown, logout functionality

Page Objects extend `BasePage` and define `selectors` object for element locators.

### Configuration (`src/config/`)
- **environment.ts** - ConfigManager singleton loading from `.env`. Exposes `config.get()` for baseUrl, environment, headless, timeout, logLevel
- **credentials.ts** - Test user management via `getTestUser('regular')`

### Utilities (`src/utils/`)
- **logger.ts** - Winston logger with file rotation (`logs/app.log`, `logs/errors.log`). Use `createLogger('Context')` for namespaced logging

## Code Conventions

- All methods must include logging calls
- Use `async/await` throughout
- Page Objects: store selectors in `private readonly selectors` object
- File naming: `NombrePage.ts` for pages, `nombre.test.ts` for tests
- Tests follow pattern: initialize browser -> create page object -> execute actions -> verify -> cleanup in finally block
- Screenshots on error: `await page.takeScreenshot('error-name')`

## Environment Setup

Requires `.env` file with `GEMINI_API_KEY` for AI features. Copy from `.env.example`.

## Output Directories

- `logs/` - Application and error logs (not versioned)
- `reports/screenshots/` - Test screenshots (not versioned)
- `reports/videos/` - Test recordings in dev/staging (not versioned)
