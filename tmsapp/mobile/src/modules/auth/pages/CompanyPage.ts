import {
    NativeBasePage,
    type NativeBasePageOptions,
    type WaitOptions
} from '../../../core/NativeBasePage.ts';

export class CompanyPage extends NativeBasePage {
    constructor(options: NativeBasePageOptions) {
        super(options);
    }

    async assertVisible(options: WaitOptions = {}): Promise<void> {
        this.getLogger().info('auth.step=company_assert_visible');
        await this.waitForSelectorVisible('auth.company.input', 'company_assert_visible', options);
    }

    async isVisible(options: WaitOptions = {}): Promise<boolean> {
        this.getLogger().debug('auth.step=company_probe_visible');
        return this.isSelectorVisible('auth.company.input', 'company_probe_visible', options);
    }

    async enterCompany(company: string): Promise<void> {
        this.getLogger().info('auth.step=company_enter', { company });
        await this.setValueSelector('auth.company.input', company, 'company_enter');
    }

    async submitCompany(): Promise<void> {
        this.getLogger().info('auth.step=company_submit');
        await this.tapSelector('auth.company.submitButton', 'company_submit');
    }
}
