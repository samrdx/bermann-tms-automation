import assert from 'node:assert/strict';
import test from 'node:test';

import { ClientResolver } from './ClientResolver.js';

test('returns seededCliente.nombreFantasia when available', () => {
    process.env.ENV = 'QA';

    const clientName = ClientResolver.resolveClientName({
        seededCliente: {
            nombreFantasia: 'Mi Cliente QA',
            nombre: 'Empresa QA'
        },
        cliente: {
            nombreFantasia: 'Cliente legado',
            nombre: 'Empresa legado'
        }
    });

    assert.equal(clientName, 'Mi Cliente QA');
});

test('returns cliente.nombre when seededCliente is missing', () => {
    process.env.ENV = 'QA';

    const clientName = ClientResolver.resolveClientName({
        cliente: {
            nombre: 'Empresa XYZ'
        }
    });

    assert.equal(clientName, 'Empresa XYZ');
});

test('returns environment fallback when data is missing', () => {
    process.env.ENV = 'qa';
    assert.equal(ClientResolver.resolveClientName(undefined), 'Qa_');

    process.env.ENV = 'demo';
    assert.equal(ClientResolver.resolveClientName(undefined), 'Demo_');
});

test('returns dropdown candidates prioritizing razon social before nombre fantasia', () => {
    const candidates = ClientResolver.getDropdownCandidates({
        seededCliente: {
            nombre: 'Empresa QA',
            nombreFantasia: 'Mi Cliente QA'
        },
        cliente: {
            nombre: 'Empresa legado',
            nombreFantasia: 'Cliente legado'
        }
    });

    assert.deepEqual(candidates, [
        'Empresa QA',
        'Mi Cliente QA',
        'Empresa legado',
        'Cliente legado'
    ]);
});

test('deduplicates dropdown candidates case-insensitively and ignores empty values', () => {
    const candidates = ClientResolver.getDropdownCandidates({
        seededCliente: {
            nombre: '  Empresa QA  ',
            nombreFantasia: 'empresa qa'
        },
        cliente: {
            nombre: '   ',
            nombreFantasia: 'Cliente legado'
        }
    });

    assert.deepEqual(candidates, [
        'Empresa QA',
        'Cliente legado'
    ]);
});
