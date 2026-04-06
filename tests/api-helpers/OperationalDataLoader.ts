import fs from 'fs';
import type { TestInfo } from '@playwright/test';

import {
    DataPathHelper,
    type LegacyOperationalDataCandidate,
    type LegacyOperationalDataLookupContext
} from './DataPathHelper.js';

export interface OperationalDataLoaderLogger {
    info?: (message: string, meta?: unknown) => void;
    warn?: (message: string, meta?: unknown) => void;
}

export interface OperationalDataLoadOptions {
    logger?: OperationalDataLoaderLogger;
    prerequisiteCommand?: string;
    purpose?: string;
    source?: string;
}

export interface OperationalDataLoadResult<T = Record<string, unknown>> {
    candidate: LegacyOperationalDataCandidate;
    candidates: LegacyOperationalDataCandidate[];
    data: T;
    usedFallback: boolean;
}

export class OperationalDataLoader {
    private static logInfo(logger: OperationalDataLoaderLogger | undefined, message: string): void {
        logger?.info?.(message);
    }

    private static logWarn(logger: OperationalDataLoaderLogger | undefined, message: string, meta?: unknown): void {
        logger?.warn?.(message, meta);
    }

    private static formatContextSummary(context: LegacyOperationalDataLookupContext): string {
        return `lookupKey=${context.lookupKey}; requested=${context.requestedSource}; normalized=${context.normalizedSource}`;
    }

    private static buildMissingDataError(
        candidates: LegacyOperationalDataCandidate[],
        options: OperationalDataLoadOptions
    ): Error {
        const [primaryCandidate] = candidates;
        const context = primaryCandidate
            ? this.formatContextSummary(primaryCandidate)
            : 'lookupKey=unknown; requested=unknown; normalized=unknown';
        const expectedPaths = candidates.map((candidate) => candidate.path).join(' | ') || 'N/A';
        const prerequisiteCommand = options.prerequisiteCommand
            || primaryCandidate?.seedCommand
            || 'Run the matching seed flow before the operational suite';
        const purpose = options.purpose ? ` for ${options.purpose}` : '';

        return new Error(
            `❌ Missing operational data${purpose}. ${context}. ` +
            `Expected one of: [${expectedPaths}]. ` +
            `Seed prerequisite: ${prerequisiteCommand}`
        );
    }

    static load<T = Record<string, unknown>>(
        testInfo: TestInfo,
        options: OperationalDataLoadOptions = {}
    ): OperationalDataLoadResult<T> | undefined {
        const candidates = DataPathHelper.getLegacyOperationalDataCandidates(testInfo, options.source);

        for (const candidate of candidates) {
            if (!fs.existsSync(candidate.path)) {
                this.logWarn(
                    options.logger,
                    `No existe data operacional en ${candidate.path}. ${this.formatContextSummary(candidate)}`
                );
                continue;
            }

            try {
                const data = JSON.parse(fs.readFileSync(candidate.path, 'utf-8')) as T;

                if (candidate.isPrimary) {
                    this.logInfo(
                        options.logger,
                        `Usando data operacional primaria: ${candidate.path} (${this.formatContextSummary(candidate)})`
                    );
                } else {
                    this.logWarn(
                        options.logger,
                        `Usando fallback determinístico de data operacional: ${candidate.path} ` +
                        `(selected=${candidate.source}; ${this.formatContextSummary(candidate)})`
                    );
                }

                return {
                    candidate,
                    candidates,
                    data,
                    usedFallback: !candidate.isPrimary
                };
            } catch (error) {
                this.logWarn(
                    options.logger,
                    `No se pudo parsear data operacional en ${candidate.path}. ${this.formatContextSummary(candidate)}`,
                    error
                );
            }
        }

        this.logWarn(
            options.logger,
            `No se encontró data operacional válida en ninguna ruta candidata. rutas=[${candidates.map((candidate) => candidate.path).join(' | ')}]`
        );

        return undefined;
    }

    static loadOrThrow<T = Record<string, unknown>>(
        testInfo: TestInfo,
        options: OperationalDataLoadOptions = {}
    ): OperationalDataLoadResult<T> {
        const result = this.load<T>(testInfo, options);
        if (result) {
            return result;
        }

        throw this.buildMissingDataError(
            DataPathHelper.getLegacyOperationalDataCandidates(testInfo, options.source),
            options
        );
    }
}
