import * as assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { type NativeDriverAdapter, type NativeElement } from '../../../src/core/NativeBasePage.ts';
import {
    acceptAndroidLocationPermissionWhileInUseIfPresent,
    acceptAndroidNotificationPermissionIfPresent
} from '../../../src/core/androidNotificationPermission.ts';
import { createMobileLogger } from '../../../src/core/logger.ts';

class FakeElement implements NativeElement {
    private readonly existing: boolean;
    private readonly displayed: boolean;
    public clickCount = 0;

    constructor(existing: boolean, displayed: boolean) {
        this.existing = existing;
        this.displayed = displayed;
    }

    async isExisting(): Promise<boolean> {
        return this.existing;
    }

    async isDisplayed(): Promise<boolean> {
        return this.displayed;
    }

    async waitForDisplayed(_options: { timeout: number; interval: number }): Promise<boolean> {
        return this.displayed;
    }

    async click(): Promise<void> {
        this.clickCount += 1;
    }

    async setValue(_value: string): Promise<void> {
        return;
    }
}

class FakeDriver implements NativeDriverAdapter {
    private readonly elements = new Map<string, FakeElement>();

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
}

const createSilentLogger = () => createMobileLogger({
    scope: 'androidNotificationPermission.spec',
    write: () => {
        return;
    }
});

describe('androidNotificationPermission', () => {
    it('taps permission using known resource-id selector first', async () => {
        const driver = new FakeDriver();
        const allowElement = new FakeElement(true, true);

        driver.register('id=com.android.permissioncontroller:id/permission_allow_button', allowElement);

        const result = await acceptAndroidNotificationPermissionIfPresent(driver, createSilentLogger(), {
            retries: 1,
            retryDelayMs: 0
        });

        assert.equal(result.handled, true);
        assert.equal(result.strategy, 'resource-id');
        assert.equal(allowElement.clickCount, 1);
    });

    it('falls back to text selectors when permission controller ids are absent', async () => {
        const driver = new FakeDriver();
        const allowElement = new FakeElement(true, true);

        driver.register('android=new UiSelector().text("Permitir")', allowElement);

        const result = await acceptAndroidNotificationPermissionIfPresent(driver, createSilentLogger(), {
            retries: 1,
            retryDelayMs: 0
        });

        assert.equal(result.handled, true);
        assert.equal(result.strategy, 'text');
        assert.equal(allowElement.clickCount, 1);
    });

    it('returns handled=false when dialog is not present', async () => {
        const driver = new FakeDriver();

        const result = await acceptAndroidNotificationPermissionIfPresent(driver, createSilentLogger(), {
            retries: 1,
            retryDelayMs: 0
        });

        assert.equal(result.handled, false);
    });

    it('prefers "Mientras la app está en uso" over generic allow text for location prompts', async () => {
        const driver = new FakeDriver();
        const whileInUseElement = new FakeElement(true, true);
        const allowElement = new FakeElement(true, true);

        driver.register('android=new UiSelector().text("Mientras la app está en uso")', whileInUseElement);
        driver.register('android=new UiSelector().text("Allow")', allowElement);

        const result = await acceptAndroidLocationPermissionWhileInUseIfPresent(driver, createSilentLogger(), {
            retries: 1,
            retryDelayMs: 0
        });

        assert.equal(result.handled, true);
        assert.equal(result.selector, 'android=new UiSelector().text("Mientras la app está en uso")');
        assert.equal(whileInUseElement.clickCount, 1);
        assert.equal(allowElement.clickCount, 0);
    });

    it('no-ops for location permission when prompt is absent', async () => {
        const driver = new FakeDriver();

        const result = await acceptAndroidLocationPermissionWhileInUseIfPresent(driver, createSilentLogger(), {
            retries: 1,
            retryDelayMs: 0
        });

        assert.equal(result.handled, false);
    });
});
