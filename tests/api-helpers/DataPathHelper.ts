import path from 'path';
import fs from 'fs';
import { TestInfo } from '@playwright/test';

/**
 * DataPathHelper - Browser-Isolated Data Path Management
 * 
 * Provides centralized logic for generating browser-specific data file paths
 * to enable safe parallel test execution across multiple browsers.
 * 
 * Each browser project gets its own isolated JSON file:
 * - Chromium projects → last-run-data-chromium.json
 * - Firefox projects  → last-run-data-firefox.json
 * - Webkit projects   → last-run-data-webkit.json
 * 
 * This prevents data collisions when running tests in parallel.
 */
export class DataPathHelper {
    /**
     * Map project names to consistent browser identifiers
     * This ensures that base-entities-chromium and chromium use the same data file
     */
    private static readonly PROJECT_TO_BROWSER: Record<string, string> = {
        // Seed transportista projects
        'seed-transportista-chromium': 'chromium',
        'seed-transportista-firefox': 'firefox',

        // Base entities setup projects
        'base-entities-chromium': 'chromium',
        'base-entities-firefox': 'firefox',
        'base-entities-webkit': 'webkit',

        // Test projects
        'chromium': 'chromium',
        'firefox': 'firefox',
        'webkit': 'webkit',
    };

    /**
     * Get browser-specific data path for test data storage
     * 
     * @param testInfo - Playwright TestInfo object containing project metadata
     * @returns Absolute path like: /path/to/project/last-run-data-chromium.json
     * 
     * @example
     * ```typescript
     * test('My test', async ({ page }, testInfo) => {
     *   const dataPath = DataPathHelper.getWorkerDataPath(testInfo);
     *   // chromium/base-entities-chromium: /project/last-run-data-chromium.json
     *   // firefox/base-entities-firefox:   /project/last-run-data-firefox.json
     * });
     * ```
     */
    static getWorkerDataPath(testInfo: TestInfo): string {
        const projectName = testInfo.project.name;
        const browserName = this.PROJECT_TO_BROWSER[projectName] || 'default';
        const env = (process.env.ENV || 'QA').toLowerCase();
        const filename = `last-run-data-${browserName}-${env}.json`;
        const dirPath = path.join(process.cwd(), 'playwright', '.data');

        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }

        return path.join(dirPath, filename);
    }

    /**
     * Get project identifier (browser name)
     * 
     * @param testInfo - Playwright TestInfo object
     * @returns Browser name: 'chromium', 'firefox', 'webkit', etc.
     * 
     * @example
     * ```typescript
     * const browser = DataPathHelper.getProjectIdentifier(testInfo);
     * // Returns: 'chromium', 'firefox', or 'webkit'
     * ```
     */
    static getProjectIdentifier(testInfo: TestInfo): string {
        return testInfo.project.name;
    }

    /**
     * Get worker index for logging and debugging
     * 
     * @param testInfo - Playwright TestInfo object
     * @returns Worker index (0, 1, 2, etc.)
     */
    static getWorkerIndex(testInfo: TestInfo): number {
        return testInfo.workerIndex;
    }

    /**
     * Get browser name from project name
     * 
     * @param testInfo - Playwright TestInfo object
     * @returns Browser name: 'chromium', 'firefox', 'webkit', or 'default'
     */
    static getBrowserName(testInfo: TestInfo): string {
        const projectName = testInfo.project.name;
        return this.PROJECT_TO_BROWSER[projectName] || 'default';
    }
}
