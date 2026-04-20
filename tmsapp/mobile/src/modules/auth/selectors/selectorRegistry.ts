import {
    type LoginSelectorKey,
    type SelectorDebtTag,
    type SelectorEntry,
    type SelectorStrategy,
    type SelectorTier,
    type SelectorTierEntry,
    getLoginSelectorEntry,
    loginSelectors
} from './login.selectors.ts';

export class SelectorRegistryError extends Error {
    readonly key: string;

    constructor(message: string, key: string) {
        super(message);
        this.name = 'SelectorRegistryError';
        this.key = key;
    }
}

export interface SelectorResolution {
    key: string;
    selector: string;
    tier: SelectorTier;
    strategy: SelectorStrategy;
    isFallback: boolean;
    debtTag: SelectorDebtTag;
}

export interface SelectorTelemetryEvent {
    event: 'selector.primary' | 'selector.fallback' | 'selector.debt';
    key: string;
    tier: SelectorTier;
    strategy: SelectorStrategy;
    selector: string;
    debtTag: SelectorDebtTag;
}

export type SelectorTelemetryEmitter = (event: SelectorTelemetryEvent) => void;
export type SelectorProbe = (candidate: SelectorTierEntry, entry: SelectorEntry) => Promise<boolean> | boolean;

export interface SelectorResolutionOptions {
    probe?: SelectorProbe;
    emit?: SelectorTelemetryEmitter;
}

const resolveCandidate = async (
    entry: SelectorEntry,
    candidates: SelectorTierEntry[],
    probe: SelectorProbe
): Promise<SelectorTierEntry | undefined> => {
    for (const candidate of candidates) {
        const matched = await probe(candidate, entry);

        if (matched) {
            return candidate;
        }
    }

    return undefined;
};

const emitResolution = (
    entry: SelectorEntry,
    candidate: SelectorTierEntry,
    emit?: SelectorTelemetryEmitter
): void => {
    if (!emit) {
        return;
    }

    const baseEvent = {
        key: entry.key,
        tier: candidate.tier,
        strategy: candidate.strategy,
        selector: candidate.selector,
        debtTag: candidate.debtTag
    };

    if (candidate.tier === 'primary') {
        emit({ event: 'selector.primary', ...baseEvent });
        return;
    }

    emit({ event: 'selector.fallback', ...baseEvent });

    if (candidate.debtTag !== 'none') {
        emit({ event: 'selector.debt', ...baseEvent });
    }
};

const defaultProbe: SelectorProbe = (candidate) => candidate.tier === 'primary';

export const resolveLoginSelector = async (
    key: LoginSelectorKey,
    options: SelectorResolutionOptions = {}
): Promise<SelectorResolution> => {
    const entry = getLoginSelectorEntry(key);
    const probe = options.probe ?? defaultProbe;
    const candidates = [entry.primary, ...entry.fallback];
    const candidate = await resolveCandidate(entry, candidates, probe);

    if (!candidate) {
        throw new SelectorRegistryError(`No selector matched for key ${key}`, key);
    }

    emitResolution(entry, candidate, options.emit);

    return {
        key: entry.key,
        selector: candidate.selector,
        tier: candidate.tier,
        strategy: candidate.strategy,
        isFallback: candidate.tier !== 'primary',
        debtTag: candidate.debtTag
    };
};

export const getSelectorRegistryEntries = (): SelectorEntry[] => Object.values(loginSelectors);

export const validateSelectorRegistry = (): string[] => {
    const violations: string[] = [];

    for (const entry of getSelectorRegistryEntries()) {
        if (!entry.owner) {
            violations.push(`${entry.key}: missing owner`);
        }

        if (!entry.lastValidatedBuild) {
            violations.push(`${entry.key}: missing lastValidatedBuild`);
        }

        for (const fallbackEntry of entry.fallback) {
            if (fallbackEntry.debtTag === 'none') {
                violations.push(`${entry.key}: fallback ${fallbackEntry.tier} must define debtTag`);
            }
        }
    }

    return violations;
};
