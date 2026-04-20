import { type NativeDriverAdapter, type NativeElement } from './NativeBasePage.ts';

export const createWdioNativeDriverAdapter = (): NativeDriverAdapter => ({
    $: async (selector: string): Promise<NativeElement> => {
        return driver.$(selector) as unknown as NativeElement;
    },
    getCurrentActivity: async (): Promise<string> => {
        return driver.getCurrentActivity();
    }
});
