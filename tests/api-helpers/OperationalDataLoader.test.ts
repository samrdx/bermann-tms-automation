import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import test, { afterEach } from 'node:test';

import { DataPathHelper } from './DataPathHelper.js';
import { OperationalDataLoader } from './OperationalDataLoader.js';

type MockTestInfo = {
    project: { name: string };
    workerIndex: number;
};

type CapturedLog = {
    level: 'info' | 'warn';
    message: string;
    meta?: unknown;
};

const ORIGINAL_ENV = {
    ENV: process.env.ENV,
    LEGACY_DATA_SOURCE: process.env.LEGACY_DATA_SOURCE,
    LEGACY_RUN_ID: process.env.LEGACY_RUN_ID
};

const touchedPaths = new Set<string>();

afterEach(() => {
    for (const filePath of touchedPaths) {
        fs.rmSync(filePath, { force: true });
    }
    touchedPaths.clear();

    for (const [key, value] of Object.entries(ORIGINAL_ENV)) {
        if (value === undefined) {
            delete process.env[key];
        } else {
            process.env[key] = value;
        }
    }
});

function createTestInfo(projectName = 'chromium'): MockTestInfo {
    return {
        project: { name: projectName },
        workerIndex: 0
    };
}

function createLogger(logs: CapturedLog[]) {
    return {
        info(message: string, meta?: unknown) {
            logs.push({ level: 'info', message, meta });
        },
        warn(message: string, meta?: unknown) {
            logs.push({ level: 'warn', message, meta });
        }
    };
}

function writeCandidateData(filePath: string, content: string): void {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content, 'utf-8');
    touchedPaths.add(filePath);
}

test('loads preferred source when primary candidate exists', () => {
    process.env.ENV = 'QA';
    process.env.LEGACY_DATA_SOURCE = 'entities';
    process.env.LEGACY_RUN_ID = 'preferred-source';

    const testInfo = createTestInfo('chromium') as never;
    const [primaryCandidate] = DataPathHelper.getLegacyOperationalDataCandidates(testInfo);
    writeCandidateData(primaryCandidate.path, JSON.stringify({ seededTransportista: { nombre: 'Transportes QA' } }));

    const logs: CapturedLog[] = [];
    const result = OperationalDataLoader.loadOrThrow(testInfo, {
        logger: createLogger(logs),
        purpose: 'contratos'
    });

    assert.equal(result.usedFallback, false);
    assert.equal(result.candidate.source, 'entities');
    assert.equal((result.data as { seededTransportista: { nombre: string } }).seededTransportista.nombre, 'Transportes QA');
    assert.equal(logs.filter((entry) => entry.level === 'info').length, 1);
    assert.match(logs[0].message, /Usando data operacional primaria/);
});

test('falls back deterministically and warns when preferred source is missing', () => {
    process.env.ENV = 'QA';
    process.env.LEGACY_DATA_SOURCE = 'entities';
    process.env.LEGACY_RUN_ID = 'fallback-source';

    const testInfo = createTestInfo('firefox') as never;
    const [, fallbackCandidate] = DataPathHelper.getLegacyOperationalDataCandidates(testInfo);
    writeCandidateData(fallbackCandidate.path, JSON.stringify({ cliente: { nombre: 'Cliente Base' } }));

    const logs: CapturedLog[] = [];
    const result = OperationalDataLoader.loadOrThrow(testInfo, {
        logger: createLogger(logs)
    });

    assert.equal(result.usedFallback, true);
    assert.equal(result.candidate.source, 'base');
    assert.equal((result.data as { cliente: { nombre: string } }).cliente.nombre, 'Cliente Base');
    assert.ok(logs.some((entry) => entry.level === 'warn' && /No existe data operacional/.test(entry.message)));
    assert.ok(logs.some((entry) => entry.level === 'warn' && /Usando fallback determinístico/.test(entry.message)));
});

test('skips corrupt json and continues with the next candidate', () => {
    process.env.ENV = 'DEMO';
    process.env.LEGACY_DATA_SOURCE = 'base';
    process.env.LEGACY_RUN_ID = 'corrupt-json';

    const testInfo = createTestInfo('chromium') as never;
    const [primaryCandidate, fallbackCandidate] = DataPathHelper.getLegacyOperationalDataCandidates(testInfo);
    writeCandidateData(primaryCandidate.path, '{ invalid json');
    writeCandidateData(fallbackCandidate.path, JSON.stringify({ seededCliente: { nombre: 'Cliente Entities' } }));

    const logs: CapturedLog[] = [];
    const result = OperationalDataLoader.loadOrThrow(testInfo, {
        logger: createLogger(logs)
    });

    assert.equal(result.usedFallback, true);
    assert.equal(result.candidate.source, 'entities');
    assert.equal((result.data as { seededCliente: { nombre: string } }).seededCliente.nombre, 'Cliente Entities');
    assert.ok(logs.some((entry) => entry.level === 'warn' && /No se pudo parsear data operacional/.test(entry.message)));
});

test('throws actionable missing-data error when no candidate is available', () => {
    process.env.ENV = 'DEMO';
    process.env.LEGACY_DATA_SOURCE = 'base-entities';
    process.env.LEGACY_RUN_ID = 'missing-data';

    const testInfo = createTestInfo('webkit') as never;

    assert.throws(
        () => OperationalDataLoader.loadOrThrow(testInfo, {
            purpose: 'prefactura'
        }),
        (error: unknown) => {
            assert.ok(error instanceof Error);
            assert.match(error.message, /Missing operational data for prefactura/);
            assert.match(error.message, /lookupKey=webkit:demo:missing-data/);
            assert.match(error.message, /requested=base-entities/);
            assert.match(error.message, /Seed prerequisite: npm run demo:seed:legacy/);
            assert.match(error.message, /legacy-base-entities-data-webkit-demo-missing-data\.json/);
            assert.match(error.message, /legacy-entities-data-webkit-demo-missing-data\.json/);
            return true;
        }
    );
});
