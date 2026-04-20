import * as assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { describe, it } from 'node:test';

import {
    getDiagnosticsBounds,
    type DiagnosticsBounds,
    writeFailureDiagnostics
} from '../../../src/core/diagnostics.ts';

const createBounds = (overrides: Partial<DiagnosticsBounds> = {}): DiagnosticsBounds => ({
    includePageSourceBody: false,
    pageSourceMaxChars: 64,
    snippetMaxChars: 20,
    ...overrides
});

describe('diagnostics', () => {
    it('writes failure diagnostics json and screenshot metadata', async () => {
        const root = await mkdtemp(path.join(tmpdir(), 'mobile-diagnostics-'));

        const result = await writeFailureDiagnostics({
            testName: 'login smoke',
            fullName: 'auth login smoke should authenticate',
            file: 'test/specs/auth/login.native.e2e.ts',
            runId: 'run-123',
            outputRoot: root,
            error: new Error('boom'),
            context: {
                testId: 'auth_login_smoke',
                startedAt: new Date().toISOString(),
                currentStep: 'credentials_tap_login',
                selector: {
                    key: 'auth.credentials.loginButton',
                    tier: 'primary',
                    strategy: 'accessibility-id',
                    event: 'selector.primary',
                    debtTag: 'none'
                }
            },
            browser: {
                saveScreenshot: async (filePath: string) => {
                    await writeFile(filePath, 'fake-image', 'utf8');
                },
                getCurrentActivity: async () => 'cl.bermann.tms24/.LoginActivity',
                getPageSource: async () => '<hierarchy><node text="Login" /></hierarchy>',
                capabilities: {
                    platformName: 'Android'
                }
            },
            bounds: createBounds()
        });

        const raw = await readFile(result.diagnosticsPath, 'utf8');
        const payload = JSON.parse(raw) as {
            classification: { type: string; message: string };
            runtime: { currentStep?: string; activity?: string };
            artifacts: { screenshotPath?: string; pageSourceHash?: string; pageSourceCaptured?: boolean };
        };

        assert.equal(payload.classification.type, 'Error');
        assert.equal(payload.classification.message, 'boom');
        assert.equal(payload.runtime.currentStep, 'credentials_tap_login');
        assert.equal(payload.runtime.activity, 'cl.bermann.tms24/.LoginActivity');
        assert.equal(typeof payload.artifacts.screenshotPath, 'string');
        assert.equal(typeof payload.artifacts.pageSourceHash, 'string');
        assert.equal(payload.artifacts.pageSourceCaptured, false);
        assert.ok(result.screenshotPath);
    });

    it('captures bounded page source body when enabled', async () => {
        const root = await mkdtemp(path.join(tmpdir(), 'mobile-diagnostics-pagesource-'));

        const result = await writeFailureDiagnostics({
            testName: 'login smoke',
            runId: 'run-pagesource',
            outputRoot: root,
            error: new Error('timeout'),
            context: {
                testId: 'auth_login_pagesource',
                startedAt: new Date().toISOString()
            },
            browser: {
                saveScreenshot: async (filePath: string) => {
                    await writeFile(filePath, 'fake-image', 'utf8');
                },
                getPageSource: async () => '<root>1234567890ABCDEFGHIJKLMNOPQRSTUVWXYZ</root>'
            },
            bounds: createBounds({ includePageSourceBody: true, pageSourceMaxChars: 24 })
        });

        const folder = path.dirname(result.diagnosticsPath);
        const jsonBase = path.basename(result.diagnosticsPath, '.json');
        const pageSourcePath = path.join(folder, `${jsonBase}.pagesource.xml`);
        const boundedSource = await readFile(pageSourcePath, 'utf8');

        assert.equal(boundedSource, '<root>1234567890ABCDEFGH');
    });

    it('applies safe defaults for invalid env bounds', () => {
        const previousMax = process.env.MOBILE_DIAGNOSTICS_PAGE_SOURCE_MAX_CHARS;
        const previousSnippet = process.env.MOBILE_DIAGNOSTICS_SNIPPET_MAX_CHARS;
        process.env.MOBILE_DIAGNOSTICS_PAGE_SOURCE_MAX_CHARS = '-1';
        process.env.MOBILE_DIAGNOSTICS_SNIPPET_MAX_CHARS = 'not-a-number';

        try {
            const bounds = getDiagnosticsBounds();
            assert.equal(bounds.pageSourceMaxChars, 20_000);
            assert.equal(bounds.snippetMaxChars, 400);
        } finally {
            process.env.MOBILE_DIAGNOSTICS_PAGE_SOURCE_MAX_CHARS = previousMax;
            process.env.MOBILE_DIAGNOSTICS_SNIPPET_MAX_CHARS = previousSnippet;
        }
    });
});
