import * as assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createMobileAuthConfig, MobileAuthConfigError } from '../../../src/config/mobileAuth.config.ts';

describe('mobileAuth.config', () => {
    it('throws when required env vars are missing', () => {
        assert.throws(
            () => createMobileAuthConfig({}),
            (error: unknown) => {
                assert.ok(error instanceof Error);
                assert.ok(error instanceof MobileAuthConfigError);
                assert.equal(
                    error.message,
                    'Missing required environment variables: TMS_USERNAME, TMS_PASSWORD'
                );
                return true;
            }
        );
    });

    it('does not leak secret values in validation errors', () => {
        const partialEnv = {
            TMS_USERNAME: '',
            TMS_PASSWORD: 'super-secret-password'
        };

        assert.throws(
            () => createMobileAuthConfig(partialEnv),
            (error: unknown) => {
                assert.ok(error instanceof Error);
                assert.ok(error instanceof MobileAuthConfigError);
                assert.ok(!error.message.includes(partialEnv.TMS_PASSWORD));
                return true;
            }
        );
    });

    it('builds deterministic defaults for emulator capabilities', () => {
        const config = createMobileAuthConfig({
            TMS_USERNAME: 'qa-user',
            TMS_PASSWORD: 'qa-password'
        });

        assert.equal(config.capabilities.deviceName, 'Pixel_AOSP');
        assert.equal(config.capabilities.platformName, 'Android');
        assert.equal(config.capabilities.automationName, 'UiAutomator2');
        assert.equal(config.capabilities.udid, undefined);
        assert.equal(config.capabilities.appWaitActivity, '*.MainActivity');
        assert.equal(config.capabilities.appWaitDuration, 120000);
        assert.equal(config.capabilities.adbExecTimeout, 120000);
        assert.equal(config.capabilities.newCommandTimeout, 240);
        assert.equal(config.useLegacyCapabilities, false);
    });

    it('parses real-device capability overrides from env', () => {
        const config = createMobileAuthConfig({
            TMS_USERNAME: 'qa-user',
            TMS_PASSWORD: 'qa-password',
            MOBILE_UDID: 'R5CT1234ABC',
            MOBILE_APP_WAIT_ACTIVITY: 'com.soyio.login.MainActivity',
            MOBILE_APP_WAIT_DURATION: '150000',
            MOBILE_ADB_EXEC_TIMEOUT: '180000',
            MOBILE_NEW_COMMAND_TIMEOUT: '300'
        });

        assert.equal(config.capabilities.udid, 'R5CT1234ABC');
        assert.equal(config.capabilities.appWaitActivity, 'com.soyio.login.MainActivity');
        assert.equal(config.capabilities.appWaitDuration, 150000);
        assert.equal(config.capabilities.adbExecTimeout, 180000);
        assert.equal(config.capabilities.newCommandTimeout, 300);
    });

    it('throws for invalid numeric timeout env values', () => {
        assert.throws(
            () => createMobileAuthConfig({
                TMS_USERNAME: 'qa-user',
                TMS_PASSWORD: 'qa-password',
                MOBILE_APP_WAIT_DURATION: '0'
            }),
            (error: unknown) => {
                assert.ok(error instanceof Error);
                assert.ok(error instanceof MobileAuthConfigError);
                assert.equal(error.message, 'Invalid MOBILE_APP_WAIT_DURATION. Expected a positive number.');
                return true;
            }
        );
    });
});
