import * as assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { loginSelectors } from '../../../src/modules/auth/selectors/login.selectors.ts';
import {
    resolveLoginSelector,
    validateSelectorRegistry
} from '../../../src/modules/auth/selectors/selectorRegistry.ts';

describe('selectorRegistry', () => {
    it('resolves primary selector without fallback event', async () => {
        const events: string[] = [];

        const resolved = await resolveLoginSelector('auth.entry.ingresoButton', {
            probe: (candidate) => candidate.selector === loginSelectors['auth.entry.ingresoButton'].primary.selector,
            emit: (event) => {
                events.push(event.event);
            }
        });

        assert.equal(resolved.tier, 'primary');
        assert.equal(resolved.isFallback, false);
        assert.deepEqual(events, ['selector.primary']);
    });

    it('resolves fallback selector and emits debt signal', async () => {
        const events: string[] = [];
        const fallbackCandidate = loginSelectors['auth.credentials.loginButton'].fallback[0];

        const resolved = await resolveLoginSelector('auth.credentials.loginButton', {
            probe: (candidate) => candidate.selector === fallbackCandidate.selector,
            emit: (event) => {
                events.push(event.event);
            }
        });

        assert.equal(resolved.tier, 'secondary');
        assert.equal(resolved.isFallback, true);
        assert.notEqual(resolved.debtTag, 'none');
        assert.deepEqual(events, ['selector.fallback', 'selector.debt']);
    });

    it('validates explicit debt tags in fallback tiers', () => {
        const violations = validateSelectorRegistry();

        assert.deepEqual(violations, []);
    });

    it('keeps explicit xpath fallback for ingreso button regression', () => {
        const ingresoFallback = loginSelectors['auth.entry.ingresoButton'].fallback;
        const xpathTier = ingresoFallback.find((candidate) => candidate.strategy === 'xpath');
        const textContainsTier = ingresoFallback.find((candidate) => candidate.selector.includes('textContains("INGRESO")'));

        assert.ok(textContainsTier);
        assert.equal(textContainsTier.tier, 'secondary');
        assert.equal(textContainsTier.debtTag, 'text-fallback-risk');

        assert.ok(xpathTier);
        assert.equal(xpathTier.tier, 'tertiary');
        assert.equal(xpathTier.selector, '//android.widget.Button[@text="INGRESO"]');
        assert.equal(xpathTier.debtTag, 'xpath-last-resort');
    });
});
