import {
    NativeBasePage,
    type NativeBasePageOptions,
    type WaitOptions
} from '../../../core/NativeBasePage.ts';

export class HomePage extends NativeBasePage {
    constructor(options: NativeBasePageOptions) {
        super(options);
    }

    async assertLoaded(options: WaitOptions = {}): Promise<void> {
        this.getLogger().info('auth.step=home_assert_loaded');
        await this.waitForSelectorVisible('auth.home.marker', 'home_assert_loaded', options);
    }

    async isLoaded(options: WaitOptions = {}): Promise<boolean> {
        return this.isSelectorVisible('auth.home.marker', 'home_is_loaded', options);
    }
}
