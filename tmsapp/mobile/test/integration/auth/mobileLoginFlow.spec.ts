import * as assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
    AuthFailureError,
    MobileLoginFlow,
    TransitionTimeoutError,
    type LoginCredentials
} from '../../../src/modules/auth/flows/MobileLoginFlow.ts';
import { createMobileLogger } from '../../../src/core/logger.ts';
import { loginSelectors } from '../../../src/modules/auth/selectors/login.selectors.ts';
import { type NativeDriverAdapter, type NativeElement } from '../../../src/core/NativeBasePage.ts';
import { type SelectorTelemetryEvent } from '../../../src/modules/auth/selectors/selectorRegistry.ts';

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

    async waitForDisplayed(options: { timeout: number; interval: number }): Promise<boolean> {
        const start = Date.now();

        while (Date.now() - start < options.timeout) {
            if (this.displayed) {
                return true;
            }

            await new Promise<void>((resolve) => {
                setTimeout(resolve, options.interval);
            });
        }

        throw new Error('waitForDisplayed timeout');
    }

    async click(): Promise<void> {
        this.clickCount += 1;
        this.onClick?.();
    }

    async setValue(value: string): Promise<void> {
        void value;
    }

    setDisplayed(displayed: boolean): void {
        this.displayed = displayed;
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

const credentials: LoginCredentials = {
    company: 'moveontruckqa',
    username: 'qa-user',
    password: 'qa-pass'
};

const createFlow = (options: {
    fallbackIngreso?: boolean;
    omitIngresoButton?: boolean;
    includeCredentialsTitle?: boolean;
    includeCredentialsControls?: boolean;
    showHomeAfterLogin?: boolean;
    events?: SelectorTelemetryEvent[];
    includeNotificationPermissionPrompt?: boolean;
    includePostLoginLocationPermissionPrompt?: boolean;
}) => {
    const driver = new FakeDriver();
    const events = options.events ?? [];

    const homeMarker = new FakeElement(false);
    const permissionAllowButton = new FakeElement(true, () => {
        permissionAllowButton.setDisplayed(false);
    });
    const locationWhileInUseButton = new FakeElement(false, () => {
        homeMarker.setDisplayed(true);
        locationWhileInUseButton.setDisplayed(false);
    });

    const ingresoSelector = options.fallbackIngreso
        ? loginSelectors['auth.entry.ingresoButton'].fallback[0].selector
        : loginSelectors['auth.entry.ingresoButton'].primary.selector;

    if (!(options.omitIngresoButton ?? false)) {
        driver.register(ingresoSelector, new FakeElement(true));
    }

    if (options.includeNotificationPermissionPrompt) {
        driver.register('id=com.android.permissioncontroller:id/permission_allow_button', permissionAllowButton);
    }

    driver.register(loginSelectors['auth.company.input'].primary.selector, new FakeElement(true));
    driver.register(loginSelectors['auth.company.submitButton'].primary.selector, new FakeElement(true));

    if (options.includeCredentialsTitle ?? true) {
        driver.register(loginSelectors['auth.credentials.title'].primary.selector, new FakeElement(true));
    }

    if (options.includeCredentialsControls ?? true) {
        driver.register(loginSelectors['auth.credentials.usernameInput'].primary.selector, new FakeElement(true));
        driver.register(loginSelectors['auth.credentials.passwordInput'].primary.selector, new FakeElement(true));
        driver.register(
            loginSelectors['auth.credentials.loginButton'].primary.selector,
            new FakeElement(true, () => {
                if (options.includePostLoginLocationPermissionPrompt) {
                    locationWhileInUseButton.setDisplayed(true);
                    return;
                }

                if (options.showHomeAfterLogin ?? false) {
                    homeMarker.setDisplayed(true);
                }
            })
        );
    }

    if (options.includePostLoginLocationPermissionPrompt) {
        driver.register('android=new UiSelector().text("Mientras la app está en uso")', locationWhileInUseButton);
    }

    driver.register(loginSelectors['auth.home.marker'].primary.selector, homeMarker);

    const logger = createMobileLogger({
        scope: 'mobileLoginFlow.spec',
        write: () => {
            // no-op in test
        }
    });

    return {
        flow: new MobileLoginFlow({
            driver,
            logger,
            emitSelectorEvent: (event) => {
                events.push(event);
            },
            transitionTimeoutMs: 60,
            transitionIntervalMs: 15
        }),
        permissionAllowButton
    };
};

describe('mobileLoginFlow integration', () => {
    it('uses fallback selector tier when primary is unavailable', async () => {
        const events: SelectorTelemetryEvent[] = [];
        const { flow } = createFlow({
            fallbackIngreso: true,
            includeCredentialsTitle: true,
            showHomeAfterLogin: true,
            events
        });

        await flow.loginHappyPath(credentials);

        const fallbackEvent = events.find((event) => event.event === 'selector.fallback');
        assert.ok(fallbackEvent);
        assert.equal(fallbackEvent.key, 'auth.entry.ingresoButton');
    });

    it('fails with transition timeout when credentials view never becomes visible', async () => {
        const { flow } = createFlow({
            fallbackIngreso: false,
            includeCredentialsTitle: false,
            includeCredentialsControls: false,
            showHomeAfterLogin: false
        });

        await assert.rejects(
            flow.loginHappyPath(credentials),
            (error: unknown) => {
                assert.ok(error instanceof TransitionTimeoutError);
                assert.equal(error.step, 'company_to_credentials');
                return true;
            }
        );
    });

    it('logs in when credentials title is missing but controls are visible', async () => {
        const { flow } = createFlow({
            fallbackIngreso: false,
            includeCredentialsTitle: false,
            includeCredentialsControls: true,
            showHomeAfterLogin: true
        });

        await flow.loginHappyPath(credentials);
    });

    it('continues from company screen when ingreso button is not available', async () => {
        const { flow } = createFlow({
            omitIngresoButton: true,
            includeCredentialsTitle: true,
            showHomeAfterLogin: true
        });

        await flow.loginHappyPath(credentials);
    });

    it('returns deterministic AuthFailureError for invalid credentials flow', async () => {
        const { flow } = createFlow({
            fallbackIngreso: false,
            includeCredentialsTitle: true,
            showHomeAfterLogin: false
        });

        await assert.rejects(
            flow.loginInvalid(credentials),
            (error: unknown) => {
                assert.ok(error instanceof AuthFailureError);
                assert.equal(error.step, 'invalid_credentials');
                assert.equal(error.message, 'Invalid credentials rejected on credentials screen');
                return true;
            }
        );
    });

    it('accepts Android notification permission prompt before login steps', async () => {
        const { flow, permissionAllowButton } = createFlow({
            fallbackIngreso: false,
            includeCredentialsTitle: true,
            showHomeAfterLogin: true,
            includeNotificationPermissionPrompt: true
        });

        await flow.loginHappyPath(credentials);

        assert.equal(permissionAllowButton.clickCount, 1);
    });

    it('handles post-login location permission prompt without blocking home assertion', async () => {
        const { flow } = createFlow({
            fallbackIngreso: false,
            includeCredentialsTitle: true,
            showHomeAfterLogin: true,
            includePostLoginLocationPermissionPrompt: true
        });

        await flow.loginHappyPath(credentials);
    });
});
