import assert from 'node:assert/strict';
import test, { afterEach } from 'node:test';

import { DataPathHelper } from './DataPathHelper.js';

type MockTestInfo = {
    project: { name: string };
    workerIndex: number;
};

const ORIGINAL_ENV = {
    ENV: process.env.ENV,
    LEGACY_DATA_SOURCE: process.env.LEGACY_DATA_SOURCE,
    LEGACY_RUN_ID: process.env.LEGACY_RUN_ID
};

afterEach(() => {
    restoreEnv();
});

function restoreEnv(): void {
    for (const [key, value] of Object.entries(ORIGINAL_ENV)) {
        if (value === undefined) {
            delete process.env[key];
        } else {
            process.env[key] = value;
        }
    }
}

function createTestInfo(projectName = 'chromium'): MockTestInfo {
    return {
        project: { name: projectName },
        workerIndex: 0
    };
}

test('normalizes legacy operational aliases and builds deterministic lookup metadata', () => {
    process.env.ENV = 'QA';
    process.env.LEGACY_DATA_SOURCE = 'base-entities';
    process.env.LEGACY_RUN_ID = 'Run 42 / QA';

    const context = DataPathHelper.getLegacyOperationalDataLookupContext(createTestInfo('base-entities-chromium') as never);

    assert.equal(context.browserName, 'chromium');
    assert.equal(context.env, 'qa');
    assert.equal(context.requestedSource, 'base-entities');
    assert.equal(context.normalizedSource, 'base');
    assert.equal(context.runId, 'run-42-qa');
    assert.equal(context.runIdSuffix, '-run-42-qa');
    assert.equal(context.lookupKey, 'chromium:qa:run-42-qa');
    assert.equal(context.seedCommand, 'npm run qa:seed:legacy');
});

test('returns ordered candidate metadata keyed by browser env and run id', () => {
    process.env.ENV = 'DEMO';
    process.env.LEGACY_DATA_SOURCE = 'entities';
    process.env.LEGACY_RUN_ID = 'batch-7';

    const candidates = DataPathHelper.getLegacyOperationalDataCandidates(createTestInfo('firefox') as never);

    assert.equal(candidates.length, 2);
    assert.deepEqual(
        candidates.map(({ source, isPrimary, priority, lookupKey, seedCommand }) => ({
            isPrimary,
            lookupKey,
            priority,
            seedCommand,
            source
        })),
        [
            {
                isPrimary: true,
                lookupKey: 'firefox:demo:batch-7',
                priority: 0,
                seedCommand: 'npm run demo:regression:entities',
                source: 'entities'
            },
            {
                isPrimary: false,
                lookupKey: 'firefox:demo:batch-7',
                priority: 1,
                seedCommand: 'npm run demo:regression:entities',
                source: 'base'
            }
        ]
    );

    assert.match(candidates[0].path, /legacy-entities-data-firefox-demo-batch-7\.json$/);
    assert.match(candidates[1].path, /legacy-base-entities-data-firefox-demo-batch-7\.json$/);
    assert.deepEqual(
        DataPathHelper.getLegacyOperationalDataCandidatePaths(createTestInfo('firefox') as never),
        candidates.map((candidate) => candidate.path)
    );
});
