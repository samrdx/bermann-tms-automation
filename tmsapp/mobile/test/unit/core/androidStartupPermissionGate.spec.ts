import * as assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { type NativeDriverAdapter, type NativeElement } from '../../../src/core/NativeBasePage.ts';
import {
    AndroidStartupPermissionGateError,
    stabilizeAndroidStartupPermissions
} from '../../../src/core/androidStartupPermissionGate.ts';
import { createMobileLogger } from '../../../src/core/logger.ts';

class FakeElement implements NativeElement {
    private displayed: boolean;
    private readonly onClick?: () => void;
    public clickCount = 0;

    constructor(displayed: boolean, onClick?: () => void) {
        this.displayed = displayed;
        this.onClick = onClick;
    }

    async isExisting(): Promise<boolean> {
        return true;
    }

    async isDisplayed(): Promise<boolean> {
        return this.displayed;
    }

    async waitForDisplayed(_options: { timeout: number; interval: number }): Promise<boolean> {
        return this.displayed;
    }

    async click(): Promise<void> {
        this.clickCount += 1;
        this.onClick?.();
    }

    async setValue(_value: string): Promise<void> {
        return;
    }

    setDisplayed(displayed: boolean): void {
        this.displayed = displayed;
    }
}

class FakeDriver implements NativeDriverAdapter {
    private readonly elements = new Map<string, FakeElement>();
    private readonly activitySequence: string[];
    private readonly packageSequence: string[];
    private readonly fallbackActivity: string;
    private readonly fallbackPackage: string;
    private readonly onActivateApp?: (appId: string, driver: FakeDriver) => void;

    public activateAppCalls = 0;

    constructor(
        activitySequence: string[],
        packageSequence: string[] = ['unknown'],
        onActivateApp?: (appId: string, driver: FakeDriver) => void
    ) {
        if (activitySequence.length === 0) {
            throw new Error('activitySequence must contain at least one activity');
        }

        if (packageSequence.length === 0) {
            throw new Error('packageSequence must contain at least one package');
        }

        this.activitySequence = activitySequence;
        this.packageSequence = packageSequence;
        this.fallbackActivity = activitySequence[activitySequence.length - 1] as string;
        this.fallbackPackage = packageSequence[packageSequence.length - 1] as string;
        this.onActivateApp = onActivateApp;
    }

    register(selector: string, element: FakeElement): void {
        this.elements.set(selector, element);
    }

    async $(selector: string): Promise<NativeElement> {
        const element = this.elements.get(selector);
        if (!element) {
            throw new Error(`Element not found: ${selector}`);
        }

        return element;
    }

    async getCurrentActivity(): Promise<string> {
        if (this.activitySequence.length === 0) {
            return this.fallbackActivity;
        }

        const [current, ...rest] = this.activitySequence;
        this.activitySequence.length = 0;
        this.activitySequence.push(...rest);
        return current;
    }

    async getCurrentPackage(): Promise<string> {
        if (this.packageSequence.length === 0) {
            return this.fallbackPackage;
        }

        const [current, ...rest] = this.packageSequence;
        this.packageSequence.length = 0;
        this.packageSequence.push(...rest);
        return current;
    }

    async activateApp(appId: string): Promise<void> {
        this.activateAppCalls += 1;
        this.onActivateApp?.(appId, this);
    }

    setActivitySequence(sequence: string[]): void {
        this.activitySequence.length = 0;
        this.activitySequence.push(...sequence);
    }

    setPackageSequence(sequence: string[]): void {
        this.packageSequence.length = 0;
        this.packageSequence.push(...sequence);
    }
}

const createSilentLogger = () => createMobileLogger({
    scope: 'androidStartupPermissionGate.spec',
    write: () => {
        return;
    }
});

describe('androidStartupPermissionGate', () => {
    it('stabilizes startup after handling permission controller activity', async () => {
        const driver = new FakeDriver([
            'com.android.permissioncontroller.permission.ui.GrantPermissionsActivity',
            '.MainActivity',
            '.MainActivity'
        ], ['unknown', 'cl.bermann.tms24', 'cl.bermann.tms24']);

        const whileInUse = new FakeElement(true, () => {
            whileInUse.setDisplayed(false);
        });
        const allowForegroundOnlyButton = new FakeElement(true, () => {
            allowForegroundOnlyButton.setDisplayed(false);
        });
        const allowButton = new FakeElement(true, () => {
            allowButton.setDisplayed(false);
        });

        driver.register('android=new UiSelector().text("Mientras la app está en uso")', whileInUse);
        driver.register('id=com.android.permissioncontroller:id/permission_allow_foreground_only_button', allowForegroundOnlyButton);
        driver.register('id=com.android.permissioncontroller:id/permission_allow_button', allowButton);

        const result = await stabilizeAndroidStartupPermissions(driver, createSilentLogger(), {
            timeoutMs: 2_500,
            pollIntervalMs: 50,
            requiredStableSamples: 2,
            permissionRetries: 1,
            permissionRetryDelayMs: 0
        });

        assert.equal(result.stabilized, true);
        assert.equal(result.permissionBursts, 1);
        assert.equal(result.acceptedLocationPrompts, 1);
        assert.equal(result.acceptedNotificationPrompts, 0);
        assert.equal(result.finalPackage, 'cl.bermann.tms24');
        assert.equal(result.finalActivity, '.MainActivity');
        assert.equal(allowForegroundOnlyButton.clickCount, 1);
        assert.equal(allowButton.clickCount, 0);
    });

    it('does not consider launcher context stable', async () => {
        const driver = new FakeDriver([
            '.launcher.Launcher',
            '.launcher.Launcher',
            '.launcher.Launcher'
        ], ['com.google.android.apps.nexuslauncher']);

        await assert.rejects(
            stabilizeAndroidStartupPermissions(driver, createSilentLogger(), {
                timeoutMs: 1_000,
                pollIntervalMs: 50,
                requiredStableSamples: 1,
                contextRecoveryAttempts: 0
            }),
            (error: unknown) => {
                assert.ok(error instanceof AndroidStartupPermissionGateError);
                assert.match(error.message, /did not stabilize/i);
                assert.match(error.message, /finalPackage=com.google.android.apps.nexuslauncher/i);
                assert.match(error.message, /launcher/i);
                return true;
            }
        );
    });

    it('recovers from launcher context by activating target app', async () => {
        const driver = new FakeDriver(
            ['.launcher.Launcher', '.launcher.Launcher'],
            ['com.google.android.apps.nexuslauncher', 'com.google.android.apps.nexuslauncher'],
            (appId, fakeDriver) => {
                if (appId === 'cl.bermann.tms24') {
                    fakeDriver.setActivitySequence(['.MainActivity', '.MainActivity']);
                    fakeDriver.setPackageSequence(['cl.bermann.tms24', 'cl.bermann.tms24']);
                }
            }
        );

        const result = await stabilizeAndroidStartupPermissions(driver, createSilentLogger(), {
            timeoutMs: 2_000,
            pollIntervalMs: 50,
            requiredStableSamples: 2,
            contextRecoveryAttempts: 1,
            contextRecoverySettleMs: 0
        });

        assert.equal(result.stabilized, true);
        assert.equal(result.finalPackage, 'cl.bermann.tms24');
        assert.equal(result.finalActivity, '.MainActivity');
        assert.equal(driver.activateAppCalls, 1);
    });

    it('fails with diagnostics when startup remains in permission controller', async () => {
        const driver = new FakeDriver([
            'com.android.permissioncontroller.permission.ui.GrantPermissionsActivity',
            'com.android.permissioncontroller.permission.ui.GrantPermissionsActivity',
            'com.android.permissioncontroller.permission.ui.GrantPermissionsActivity'
        ]);

        await assert.rejects(
            stabilizeAndroidStartupPermissions(driver, createSilentLogger(), {
                timeoutMs: 1_000,
                pollIntervalMs: 50,
                permissionRetries: 1,
                permissionRetryDelayMs: 0
            }),
            (error: unknown) => {
                assert.ok(error instanceof AndroidStartupPermissionGateError);
                assert.match(error.message, /did not stabilize/i);
                assert.match(error.message, /GrantPermissionsActivity/);
                return true;
            }
        );
    });

    it('fails fast when driver adapter does not expose current activity', async () => {
        const driver: NativeDriverAdapter = {
            $: async (_selector: string) => {
                throw new Error('unused');
            }
        };

        await assert.rejects(
            stabilizeAndroidStartupPermissions(driver, createSilentLogger(), {
                timeoutMs: 1_000,
                pollIntervalMs: 50
            }),
            (error: unknown) => {
                assert.ok(error instanceof AndroidStartupPermissionGateError);
                assert.match(error.message, /getCurrentActivity/i);
                return true;
            }
        );
    });
});
