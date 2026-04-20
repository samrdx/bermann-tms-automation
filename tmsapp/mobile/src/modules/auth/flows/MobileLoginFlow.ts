import {
    type NativeDriverAdapter,
    type WaitOptions,
    type NativeBasePageOptions,
    NativePageInteractionError
} from '../../../core/NativeBasePage.ts';
import {
    acceptAndroidLocationPermissionWhileInUseIfPresent,
    acceptAndroidNotificationPermissionIfPresent
} from '../../../core/androidNotificationPermission.ts';
import { setDiagnosticsSelector, setDiagnosticsStep } from '../../../core/diagnostics.ts';
import { createMobileLogger, type MobileLogger } from '../../../core/logger.ts';
import { type SelectorTelemetryEmitter } from '../selectors/selectorRegistry.ts';
import { CompanyPage } from '../pages/CompanyPage.ts';
import { CredentialsPage } from '../pages/CredentialsPage.ts';
import { EntryPage } from '../pages/EntryPage.ts';
import { HomePage } from '../pages/HomePage.ts';

const DEFAULT_TRANSITION_TIMEOUT_MS = 15_000;
const ENTRY_COMPANY_PROBE_TIMEOUT_MS = 1_200;
const ENTRY_COMPANY_PROBE_INTERVAL_MS = 200;

export interface LoginCredentials {
    company: string;
    username: string;
    password: string;
}

export interface MobileLoginFlowContract {
    loginHappyPath(input: LoginCredentials): Promise<void>;
    loginInvalid(input: LoginCredentials): Promise<void>;
}

export interface MobileLoginFlowOptions {
    driver: NativeDriverAdapter;
    logger?: MobileLogger;
    emitSelectorEvent?: SelectorTelemetryEmitter;
    transitionTimeoutMs?: number;
    transitionIntervalMs?: number;
}

export class SelectorResolutionError extends Error {
    readonly step: string;

    constructor(step: string, message: string) {
        super(message);
        this.name = 'SelectorResolutionError';
        this.step = step;
    }
}

export class TransitionTimeoutError extends Error {
    readonly step: string;
    readonly timeoutMs: number;

    constructor(step: string, timeoutMs: number, message: string) {
        super(message);
        this.name = 'TransitionTimeoutError';
        this.step = step;
        this.timeoutMs = timeoutMs;
    }
}

export class AuthFailureError extends Error {
    readonly step: string;

    constructor(step: string, message: string) {
        super(message);
        this.name = 'AuthFailureError';
        this.step = step;
    }
}

export class MobileLoginFlow implements MobileLoginFlowContract {
    private readonly driver: NativeDriverAdapter;
    private readonly logger: MobileLogger;
    private readonly credentialsPage: CredentialsPage;
    private readonly companyPage: CompanyPage;
    private readonly entryPage: EntryPage;
    private readonly homePage: HomePage;
    private readonly transitionWait: WaitOptions;

    constructor(options: MobileLoginFlowOptions) {
        this.driver = options.driver;
        this.logger = options.logger ?? createMobileLogger({ scope: 'MobileLoginFlow' });

        const diagnosticsAwareEmitter: SelectorTelemetryEmitter = (event) => {
            setDiagnosticsSelector(event);
            options.emitSelectorEvent?.(event);
        };

        const pageOptions: NativeBasePageOptions = {
            driver: options.driver,
            logger: this.logger,
            emitSelectorEvent: diagnosticsAwareEmitter
        };

        this.entryPage = new EntryPage(pageOptions);
        this.companyPage = new CompanyPage(pageOptions);
        this.credentialsPage = new CredentialsPage(pageOptions);
        this.homePage = new HomePage(pageOptions);
        this.transitionWait = {
            timeoutMs: options.transitionTimeoutMs ?? DEFAULT_TRANSITION_TIMEOUT_MS,
            intervalMs: options.transitionIntervalMs ?? 500
        };
    }

    async loginHappyPath(input: LoginCredentials): Promise<void> {
        await this.handleSystemPermissionCheckpoints('system_permission_pre_login');

        await this.enterCompanyStepFromEntryBoundary();

        await this.rethrowSelector('company_enter', async () => {
            await this.companyPage.enterCompany(input.company);
        });

        await this.rethrowSelector('company_submit', async () => {
            await this.companyPage.submitCompany();
        });

        await this.rethrowTransition('company_to_credentials', async () => {
            await this.credentialsPage.waitForReady(this.transitionWait);
        });

        await this.rethrowSelector('credentials_enter_user', async () => {
            await this.credentialsPage.enterUser(input.username);
        });

        await this.rethrowSelector('credentials_enter_password', async () => {
            await this.credentialsPage.enterPassword(input.password);
        });

        await this.rethrowSelector('credentials_tap_login', async () => {
            await this.credentialsPage.tapLogin();
        });

        await this.handleSystemPermissionCheckpoints('system_permission_post_login_tap');

        await this.assertHomeLoadedWithPermissionCheckpoint();

        this.logger.info('auth.step=login_happy_path_success');
    }

    async loginInvalid(input: LoginCredentials): Promise<void> {
        await this.loginUntilSubmit(input);

        await this.rethrowSelector('credentials_tap_login_invalid', async () => {
            await this.credentialsPage.tapLogin();
        });

        const reachedHome = await this.homePage.isLoaded({ timeoutMs: 3_000, intervalMs: 250 });
        if (reachedHome) {
            throw new AuthFailureError('invalid_credentials', 'Invalid login unexpectedly reached home state');
        }

        const stayedOnCredentials = await this.credentialsPage.isReady({ timeoutMs: 3_000, intervalMs: 250 });
        if (!stayedOnCredentials) {
            throw new AuthFailureError('invalid_credentials', 'Could not verify auth failure state after invalid login');
        }

        throw new AuthFailureError('invalid_credentials', 'Invalid credentials rejected on credentials screen');
    }

    private async loginUntilSubmit(input: LoginCredentials): Promise<void> {
        await this.handleSystemPermissionCheckpoints('system_permission_pre_login');

        await this.enterCompanyStepFromEntryBoundary();

        await this.rethrowSelector('company_enter', async () => {
            await this.companyPage.enterCompany(input.company);
        });

        await this.rethrowSelector('company_submit', async () => {
            await this.companyPage.submitCompany();
        });

        await this.rethrowTransition('company_to_credentials', async () => {
            await this.credentialsPage.waitForReady(this.transitionWait);
        });

        await this.rethrowSelector('credentials_enter_user', async () => {
            await this.credentialsPage.enterUser(input.username);
        });

        await this.rethrowSelector('credentials_enter_password', async () => {
            await this.credentialsPage.enterPassword(input.password);
        });
    }

    private async rethrowSelector(step: string, action: () => Promise<void>): Promise<void> {
        setDiagnosticsStep(step);

        try {
            await action();
        } catch (error: unknown) {
            if (error instanceof NativePageInteractionError) {
                throw new SelectorResolutionError(step, error.message);
            }

            if (error instanceof Error) {
                throw new SelectorResolutionError(step, error.message);
            }

            throw new SelectorResolutionError(step, 'unknown-selector-resolution-error');
        }
    }

    private async enterCompanyStepFromEntryBoundary(): Promise<void> {
        try {
            await this.rethrowSelector('entry_tap_ingreso', async () => {
                await this.entryPage.tapIngreso();
            });
        } catch (error: unknown) {
            if (!(error instanceof SelectorResolutionError) || error.step !== 'entry_tap_ingreso') {
                throw error;
            }

            const companyAlreadyVisible = await this.companyPage.isVisible({
                timeoutMs: ENTRY_COMPANY_PROBE_TIMEOUT_MS,
                intervalMs: ENTRY_COMPANY_PROBE_INTERVAL_MS
            });

            if (!companyAlreadyVisible) {
                throw error;
            }

            this.logger.info('auth.step=entry_tap_ingreso_skipped_company_visible', {
                probeTimeoutMs: ENTRY_COMPANY_PROBE_TIMEOUT_MS,
                cause: error.message
            });

            return;
        }

        await this.rethrowSelector('company_assert_visible', async () => {
            await this.companyPage.assertVisible();
        });
    }

    private async handleSystemPermissionCheckpoints(step: string): Promise<void> {
        setDiagnosticsStep(step);

        const notificationResult = await acceptAndroidNotificationPermissionIfPresent(this.driver, this.logger, {
            retries: 3,
            retryDelayMs: 500
        });

        if (notificationResult.handled) {
            return;
        }

        await acceptAndroidLocationPermissionWhileInUseIfPresent(this.driver, this.logger, {
            retries: 2,
            retryDelayMs: 350
        });
    }

    private async assertHomeLoadedWithPermissionCheckpoint(): Promise<void> {
        try {
            await this.rethrowTransition('login_to_home', async () => {
                await this.homePage.assertLoaded(this.transitionWait);
            });
        } catch (error: unknown) {
            if (!(error instanceof TransitionTimeoutError)) {
                throw error;
            }

            await this.handleSystemPermissionCheckpoints('system_permission_before_home_assert_retry');

            await this.rethrowTransition('login_to_home_retry_after_permission', async () => {
                await this.homePage.assertLoaded(this.transitionWait);
            });
        }
    }

    private async rethrowTransition(step: string, action: () => Promise<void>): Promise<void> {
        setDiagnosticsStep(step);

        try {
            await action();
        } catch (error: unknown) {
            if (error instanceof TransitionTimeoutError) {
                throw error;
            }

            if (error instanceof SelectorResolutionError) {
                throw error;
            }

            if (error instanceof NativePageInteractionError) {
                throw new TransitionTimeoutError(step, this.transitionWait.timeoutMs ?? DEFAULT_TRANSITION_TIMEOUT_MS, error.message);
            }

            if (error instanceof Error) {
                throw new TransitionTimeoutError(step, this.transitionWait.timeoutMs ?? DEFAULT_TRANSITION_TIMEOUT_MS, error.message);
            }

            throw new TransitionTimeoutError(step, this.transitionWait.timeoutMs ?? DEFAULT_TRANSITION_TIMEOUT_MS, 'unknown-transition-timeout-error');
        }
    }
}
