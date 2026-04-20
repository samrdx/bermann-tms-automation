import {
    NativeBasePage,
    type NativeBasePageOptions
} from '../../../core/NativeBasePage.ts';

export class EntryPage extends NativeBasePage {
    constructor(options: NativeBasePageOptions) {
        super(options);
    }

    async tapIngreso(): Promise<void> {
        this.getLogger().info('auth.step=entry_tap_ingreso');
        await this.tapSelector('auth.entry.ingresoButton', 'entry_tap_ingreso');
    }
}
