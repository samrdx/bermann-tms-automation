import {
    NativeBasePage,
    NativePageInteractionError,
    type NativeBasePageOptions,
    type WaitOptions
} from '../../../core/NativeBasePage.ts';
import { type LoginSelectorKey } from '../selectors/login.selectors.ts';

const CREDENTIALS_READY_MARKERS: readonly LoginSelectorKey[] = [
    'auth.credentials.usernameInput',
    'auth.credentials.passwordInput',
    'auth.credentials.loginButton'
];

export class CredentialsPage extends NativeBasePage {
    constructor(options: NativeBasePageOptions) {
        super(options);
    }

    async waitForReady(options: WaitOptions = {}): Promise<void> {
        this.getLogger().info('auth.step=credentials_wait_ready');

        const ready = await this.waitForCondition(async () => {
            return this.hasAnyReadyMarkerVisible(this.transitionProbeOptions(options));
        }, options);

        await this.logOptionalTitleVisibility();

        if (!ready) {
            throw new NativePageInteractionError(
                'credentials_wait_ready',
                `credentials-ready-markers-timeout markers=${CREDENTIALS_READY_MARKERS.join(',')}`
            );
        }
    }

    async isReady(options: WaitOptions = {}): Promise<boolean> {
        return this.hasAnyReadyMarkerVisible(options);
    }

    async enterUser(username: string): Promise<void> {
        this.getLogger().info('auth.step=credentials_enter_user');
        await this.setValueSelector('auth.credentials.usernameInput', username, 'credentials_enter_user');
    }

    async enterPassword(password: string): Promise<void> {
        this.getLogger().info('auth.step=credentials_enter_password');
        await this.setValueSelector('auth.credentials.passwordInput', password, 'credentials_enter_password');
    }

    async tapLogin(): Promise<void> {
        this.getLogger().info('auth.step=credentials_tap_login');
        await this.tapSelector('auth.credentials.loginButton', 'credentials_tap_login');
    }

    private async hasAnyReadyMarkerVisible(options: WaitOptions): Promise<boolean> {
        for (const marker of CREDENTIALS_READY_MARKERS) {
            const isVisible = await this.isSelectorVisible(marker, 'credentials_ready_probe', options);
            if (isVisible) {
                return true;
            }
        }

        return false;
    }

    private transitionProbeOptions(options: WaitOptions): WaitOptions {
        const probeTimeoutMs = Math.min(options.intervalMs ?? 500, 750);
        return {
            timeoutMs: probeTimeoutMs,
            intervalMs: Math.min(probeTimeoutMs, 250)
        };
    }

    private async logOptionalTitleVisibility(): Promise<void> {
        const titleVisible = await this.isSelectorVisible('auth.credentials.title', 'credentials_optional_title_probe', {
            timeoutMs: 250,
            intervalMs: 100
        });

        if (!titleVisible) {
            this.getLogger().debug('auth.credentials.title_optional_missing');
        }
    }
}
