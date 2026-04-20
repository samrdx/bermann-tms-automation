import { getMobileAuthConfig } from '../../../src/config/mobileAuth.config.ts';
import {
    MobileLoginFlow,
    type LoginCredentials
} from '../../../src/modules/auth/flows/MobileLoginFlow.ts';
import { createMobileLogger } from '../../../src/core/logger.ts';
import { createWdioNativeDriverAdapter } from '../../../src/core/wdioNativeDriverAdapter.ts';

/**
 * REVIEW GUARD - keep architecture boundary intact.
 * - This spec MUST call MobileLoginFlow APIs only.
 * - Do not add direct selectors, driver.$ calls, or browser.url usage here.
 * - Selector changes belong in src/modules/auth/selectors/*.
 */

const DEFAULT_COMPANY = 'moveontruckqa';

const createHappyPathCredentials = (): LoginCredentials => {
    const config = getMobileAuthConfig();

    return {
        company: config.credentials.company ?? DEFAULT_COMPANY,
        username: config.credentials.username,
        password: config.credentials.password
    };
};

describe('Native auth smoke - architecture boundary', function () {
    this.timeout(120_000);

    it('logs in through MobileLoginFlow happy path', async () => {
        const logger = createMobileLogger({ scope: 'auth.login.native.e2e' });
        const flow = new MobileLoginFlow({
            driver: createWdioNativeDriverAdapter(),
            logger
        });

        await flow.loginHappyPath(createHappyPathCredentials());
    });
});
