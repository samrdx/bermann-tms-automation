import { readFile, readdir, stat, writeFile } from 'node:fs/promises';
import * as path from 'node:path';

interface CliArgs {
    historyDir: string;
    diagnosticsDir?: string;
    logsDir?: string;
    outputJson: string;
    outputMd?: string;
    windowRuns: number;
}

interface RunSummary {
    runId?: string;
    runAttempt?: number;
    recordedAt?: string;
    outcome?: string;
    totals?: {
        tests?: number;
        passed?: number;
        failed?: number;
    };
}

interface DiagnosticDoc {
    classification?: {
        type?: string;
    };
    runtime?: {
        selector?: {
            tier?: string;
            event?: string;
            debtTag?: string;
        };
    };
}

const toArgMap = (argv: string[]): Map<string, string> => {
    const map = new Map<string, string>();

    for (let index = 0; index < argv.length; index += 1) {
        const token = argv[index];

        if (!token.startsWith('--')) {
            continue;
        }

        const key = token.slice(2);
        const value = argv[index + 1];

        if (!value || value.startsWith('--')) {
            map.set(key, 'true');
            continue;
        }

        map.set(key, value);
        index += 1;
    }

    return map;
};

const requireArg = (argMap: Map<string, string>, key: string): string => {
    const value = argMap.get(key);

    if (!value || value === 'true') {
        throw new Error(`Missing required argument --${key}`);
    }

    return value;
};

const parseCliArgs = (argv: string[]): CliArgs => {
    const argMap = toArgMap(argv);
    const windowValue = argMap.get('window-runs') ?? '20';
    const parsedWindow = Number.parseInt(windowValue, 10);

    return {
        historyDir: requireArg(argMap, 'history-dir'),
        diagnosticsDir: argMap.get('diagnostics-dir'),
        logsDir: argMap.get('logs-dir'),
        outputJson: requireArg(argMap, 'output-json'),
        outputMd: argMap.get('output-md'),
        windowRuns: Number.isFinite(parsedWindow) && parsedWindow > 0 ? parsedWindow : 20
    };
};

const safeReadJson = async <T>(filePath: string): Promise<T | undefined> => {
    try {
        const raw = await readFile(filePath, 'utf8');
        return JSON.parse(raw) as T;
    } catch {
        return undefined;
    }
};

const listFilesRecursively = async (rootDir: string): Promise<string[]> => {
    const entries = await readdir(rootDir, { withFileTypes: true });
    const result: string[] = [];

    for (const entry of entries) {
        const absolutePath = path.join(rootDir, entry.name);

        if (entry.isDirectory()) {
            result.push(...(await listFilesRecursively(absolutePath)));
            continue;
        }

        result.push(absolutePath);
    }

    return result;
};

const safeListFilesRecursively = async (rootDir: string | undefined): Promise<string[]> => {
    if (!rootDir) {
        return [];
    }

    try {
        const fileStat = await stat(rootDir);
        if (!fileStat.isDirectory()) {
            return [];
        }

        return listFilesRecursively(rootDir);
    } catch {
        return [];
    }
};

const readRunSummaries = async (historyDir: string): Promise<RunSummary[]> => {
    const allFiles = await safeListFilesRecursively(historyDir);
    const summaryFiles = allFiles.filter((filePath) => filePath.endsWith('.json'));

    const summaries: RunSummary[] = [];
    for (const filePath of summaryFiles) {
        const summary = await safeReadJson<RunSummary>(filePath);
        if (summary) {
            summaries.push(summary);
        }
    }

    return summaries;
};

const toTimestamp = (summary: RunSummary): number => {
    const candidate = summary.recordedAt ? Date.parse(summary.recordedAt) : Number.NaN;
    return Number.isFinite(candidate) ? candidate : 0;
};

const collectLogSignals = async (logsDir: string | undefined): Promise<{ fallback: number; debt: number; retries: number }> => {
    const files = (await safeListFilesRecursively(logsDir)).filter((filePath) => filePath.endsWith('.log'));
    let fallback = 0;
    let debt = 0;
    let retries = 0;

    for (const filePath of files) {
        const raw = await readFile(filePath, 'utf8');
        const lines = raw.split(/\r?\n/);

        for (const line of lines) {
            if (!line.trim()) {
                continue;
            }

            try {
                const jsonLine = JSON.parse(line) as {
                    message?: string;
                    meta?: {
                        event?: string;
                    };
                };

                if (jsonLine.message === 'retrying_interaction') {
                    retries += 1;
                }

                if (jsonLine.message === 'selector_resolution') {
                    if (jsonLine.meta?.event === 'selector.fallback') {
                        fallback += 1;
                    }

                    if (jsonLine.meta?.event === 'selector.debt') {
                        debt += 1;
                    }
                }
            } catch {
                continue;
            }
        }
    }

    return { fallback, debt, retries };
};

const collectDiagnosticsSignals = async (
    diagnosticsDir: string | undefined
): Promise<{ transitionTimeouts: number; unknownErrors: number; fallback: number; debt: number }> => {
    const files = (await safeListFilesRecursively(diagnosticsDir)).filter((filePath) => filePath.endsWith('.json'));
    let transitionTimeouts = 0;
    let unknownErrors = 0;
    let fallback = 0;
    let debt = 0;

    for (const filePath of files) {
        const doc = await safeReadJson<DiagnosticDoc>(filePath);
        if (!doc) {
            continue;
        }

        if (doc.classification?.type === 'TransitionTimeoutError') {
            transitionTimeouts += 1;
        }

        if (doc.classification?.type === 'UnknownError') {
            unknownErrors += 1;
        }

        const tier = doc.runtime?.selector?.tier;
        if (tier && tier !== 'primary') {
            fallback += 1;
        }

        const debtTag = doc.runtime?.selector?.debtTag;
        if (debtTag && debtTag !== 'none') {
            debt += 1;
        }
    }

    return { transitionTimeouts, unknownErrors, fallback, debt };
};

const ratioAsPercent = (numerator: number, denominator: number): number => {
    if (denominator <= 0) {
        return 0;
    }

    return Number(((numerator / denominator) * 100).toFixed(2));
};

const main = async (): Promise<void> => {
    const args = parseCliArgs(process.argv.slice(2));
    const summaries = await readRunSummaries(args.historyDir);
    const recent = [...summaries]
        .sort((left, right) => toTimestamp(right) - toTimestamp(left))
        .slice(0, args.windowRuns);

    const totalRuns = recent.length;
    const testsTotal = recent.reduce((sum, run) => sum + (run.totals?.tests ?? 0), 0);
    const testsPassed = recent.reduce((sum, run) => sum + (run.totals?.passed ?? 0), 0);
    const testsFailed = recent.reduce((sum, run) => sum + (run.totals?.failed ?? 0), 0);

    const logSignals = await collectLogSignals(args.logsDir);
    const diagnosticsSignals = await collectDiagnosticsSignals(args.diagnosticsDir);

    const fallbackSignals = logSignals.fallback + diagnosticsSignals.fallback;
    const debtSignals = logSignals.debt + diagnosticsSignals.debt;

    const metrics = {
        generatedAt: new Date().toISOString(),
        windowRunsRequested: args.windowRuns,
        windowRunsObserved: totalRuns,
        passRate: {
            passedTests: testsPassed,
            totalTests: testsTotal,
            failedTests: testsFailed,
            percent: ratioAsPercent(testsPassed, testsTotal)
        },
        flakeSignals: {
            interactionRetries: logSignals.retries,
            transitionTimeouts: diagnosticsSignals.transitionTimeouts,
            unknownErrors: diagnosticsSignals.unknownErrors
        },
        selectorSignals: {
            fallbackCount: fallbackSignals,
            debtCount: debtSignals,
            fallbackRatePercent: ratioAsPercent(fallbackSignals, testsTotal || totalRuns),
            debtRatePercent: ratioAsPercent(debtSignals, testsTotal || totalRuns)
        },
        gateReadiness: {
            sampleTargetMet: totalRuns >= args.windowRuns,
            passRateTargetMet: ratioAsPercent(testsPassed, testsTotal) >= 95,
            recommendedMode: totalRuns >= args.windowRuns && ratioAsPercent(testsPassed, testsTotal) >= 95
                ? 'blocking-candidate'
                : 'informational'
        }
    };

    await writeFile(args.outputJson, `${JSON.stringify(metrics, null, 2)}\n`, 'utf8');

    if (args.outputMd) {
        const markdownReport = [
            '# Mobile Auth Smoke Metrics',
            '',
            `- Generated at: ${metrics.generatedAt}`,
            `- Window observed: ${metrics.windowRunsObserved}/${metrics.windowRunsRequested} runs`,
            `- Pass rate: ${metrics.passRate.percent}% (${metrics.passRate.passedTests}/${metrics.passRate.totalTests})`,
            `- Flake signals: retries=${metrics.flakeSignals.interactionRetries}, transitionTimeouts=${metrics.flakeSignals.transitionTimeouts}, unknownErrors=${metrics.flakeSignals.unknownErrors}`,
            `- Selector signals: fallback=${metrics.selectorSignals.fallbackCount} (${metrics.selectorSignals.fallbackRatePercent}%), debt=${metrics.selectorSignals.debtCount} (${metrics.selectorSignals.debtRatePercent}%)`,
            `- Gate recommendation: ${metrics.gateReadiness.recommendedMode}`,
            ''
        ].join('\n');

        await writeFile(args.outputMd, markdownReport, 'utf8');
    }
};

main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : 'Unknown smoke metrics parser error';
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
});
