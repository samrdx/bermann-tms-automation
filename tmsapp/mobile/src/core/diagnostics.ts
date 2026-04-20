import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import * as path from 'node:path';

import { type SelectorTelemetryEvent } from '../modules/auth/selectors/selectorRegistry.ts';

const DEFAULT_OUTPUT_ROOT = path.resolve(process.cwd(), 'artifacts', 'diagnostics');
const DEFAULT_PAGE_SOURCE_MAX_CHARS = 20_000;
const DEFAULT_SNIPPET_MAX_CHARS = 400;

export interface DiagnosticsBounds {
    includePageSourceBody: boolean;
    pageSourceMaxChars: number;
    snippetMaxChars: number;
}

export interface DiagnosticsContext {
    testId: string;
    startedAt: string;
    currentStep?: string;
    selector?: {
        key: string;
        tier: string;
        strategy: string;
        event: string;
        debtTag: string;
    };
}

export interface FailureDiagnosticsInput {
    testName: string;
    file?: string;
    fullName?: string;
    sessionId?: string;
    runId: string;
    outputRoot?: string;
    error?: unknown;
    context: DiagnosticsContext;
    browser: {
        saveScreenshot(filePath: string): Promise<void>;
        getCurrentActivity?: () => Promise<string>;
        getPageSource?: () => Promise<string>;
        capabilities?: unknown;
    };
    bounds: DiagnosticsBounds;
}

export interface FailureDiagnosticsResult {
    diagnosticsPath: string;
    screenshotPath?: string;
}

let runtimeContext: DiagnosticsContext | undefined;

const getEnvBoolean = (value: string | undefined): boolean => value === 'true';

const getEnvInt = (value: string | undefined, fallback: number): number => {
    if (!value) {
        return fallback;
    }

    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) {
        return fallback;
    }

    return parsed;
};

const sanitizeFileToken = (raw: string): string => {
    return raw
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 120);
};

const toErrorMeta = (error: unknown): { type: string; message: string; stack?: string } => {
    if (error instanceof Error) {
        return {
            type: error.name,
            message: error.message,
            ...(error.stack ? { stack: error.stack } : {})
        };
    }

    return {
        type: 'UnknownError',
        message: typeof error === 'string' ? error : 'Unknown error'
    };
};

const hashString = (value: string): string => {
    return createHash('sha256').update(value).digest('hex');
};

const ensureArtifactDir = async (outputRoot: string, runId: string): Promise<string> => {
    const runDir = path.join(outputRoot, sanitizeFileToken(runId));
    await mkdir(runDir, { recursive: true });
    return runDir;
};

const buildDefaultTestId = (testName: string): string => {
    return sanitizeFileToken(testName) || 'unnamed_test';
};

const toRelativePath = (value: string): string => path.relative(process.cwd(), value);

export const getDiagnosticsBounds = (): DiagnosticsBounds => ({
    includePageSourceBody: getEnvBoolean(process.env.MOBILE_DIAGNOSTICS_INCLUDE_PAGE_SOURCE),
    pageSourceMaxChars: getEnvInt(process.env.MOBILE_DIAGNOSTICS_PAGE_SOURCE_MAX_CHARS, DEFAULT_PAGE_SOURCE_MAX_CHARS),
    snippetMaxChars: getEnvInt(process.env.MOBILE_DIAGNOSTICS_SNIPPET_MAX_CHARS, DEFAULT_SNIPPET_MAX_CHARS)
});

export const getDiagnosticsOutputRoot = (): string => {
    const customOutput = process.env.MOBILE_DIAGNOSTICS_OUTPUT_DIR;
    return customOutput ? path.resolve(process.cwd(), customOutput) : DEFAULT_OUTPUT_ROOT;
};

export const beginTestDiagnostics = (testId: string): void => {
    runtimeContext = {
        testId,
        startedAt: new Date().toISOString()
    };
};

export const setDiagnosticsStep = (step: string): void => {
    if (!runtimeContext) {
        return;
    }

    runtimeContext = {
        ...runtimeContext,
        currentStep: step
    };
};

export const setDiagnosticsSelector = (event: SelectorTelemetryEvent): void => {
    if (!runtimeContext) {
        return;
    }

    runtimeContext = {
        ...runtimeContext,
        selector: {
            key: event.key,
            tier: event.tier,
            strategy: event.strategy,
            event: event.event,
            debtTag: event.debtTag
        }
    };
};

export const getDiagnosticsContext = (): DiagnosticsContext | undefined => {
    if (!runtimeContext) {
        return undefined;
    }

    return {
        ...runtimeContext
    };
};

export const clearDiagnosticsContext = (): void => {
    runtimeContext = undefined;
};

export const writeFailureDiagnostics = async (input: FailureDiagnosticsInput): Promise<FailureDiagnosticsResult> => {
    const outputRoot = input.outputRoot ?? getDiagnosticsOutputRoot();
    const runDir = await ensureArtifactDir(outputRoot, input.runId);
    const testToken = sanitizeFileToken(input.context.testId || buildDefaultTestId(input.testName));
    const baseName = `${testToken}-${Date.now()}`;
    const screenshotPath = path.join(runDir, `${baseName}.png`);
    const diagnosticsPath = path.join(runDir, `${baseName}.json`);

    let screenshotSaved = false;
    try {
        await input.browser.saveScreenshot(screenshotPath);
        screenshotSaved = true;
    } catch {
        screenshotSaved = false;
    }

    const activity = await input.browser.getCurrentActivity?.();
    const pageSource = await input.browser.getPageSource?.();
    const pageSourceHash = typeof pageSource === 'string' ? hashString(pageSource) : undefined;
    const pageSourceLength = typeof pageSource === 'string' ? pageSource.length : undefined;
    const boundedPageSource =
        input.bounds.includePageSourceBody && typeof pageSource === 'string'
            ? pageSource.slice(0, input.bounds.pageSourceMaxChars)
            : undefined;

    const diagnosticsDocument = {
        test: {
            name: input.testName,
            fullName: input.fullName,
            file: input.file,
            id: input.context.testId,
            startedAt: input.context.startedAt,
            failedAt: new Date().toISOString(),
            runId: input.runId,
            sessionId: input.sessionId
        },
        classification: toErrorMeta(input.error),
        runtime: {
            currentStep: input.context.currentStep,
            selector: input.context.selector,
            activity,
            capabilities: input.browser.capabilities
        },
        artifacts: {
            screenshotPath: screenshotSaved ? toRelativePath(screenshotPath) : undefined,
            diagnosticsPath: toRelativePath(diagnosticsPath),
            pageSourceHash,
            pageSourceLength,
            pageSourceSnippet: boundedPageSource?.slice(0, input.bounds.snippetMaxChars),
            pageSourceCaptured: Boolean(boundedPageSource),
            pageSourceMaxChars: input.bounds.pageSourceMaxChars
        },
        policy: {
            includePageSourceBody: input.bounds.includePageSourceBody,
            boundedOutput: true
        }
    };

    await writeFile(diagnosticsPath, `${JSON.stringify(diagnosticsDocument, null, 2)}\n`, 'utf8');

    if (boundedPageSource) {
        const pageSourcePath = path.join(runDir, `${baseName}.pagesource.xml`);
        await writeFile(pageSourcePath, boundedPageSource, 'utf8');
    }

    return {
        diagnosticsPath,
        ...(screenshotSaved ? { screenshotPath } : {})
    };
};
