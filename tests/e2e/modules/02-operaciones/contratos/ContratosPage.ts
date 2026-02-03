import { Page, expect } from '@playwright/test';

export class ContratosPage {
    readonly page: Page;

    constructor(page: Page) {
        this.page = page;
    }

    async navigateToCreate() {
        await this.page.goto('/contratos/crear');
        await this.page.waitForLoadState('networkidle');
    }

    /**
     * Fills the main contract form using RUT-based search for Transportista.
     */
    async fillMainForm(clienteName: string, transportistaRut: string, fechaInicio: string, fechaFin: string) {
        // 1. Select Client
        await this.page.click('#select2-cliente_id-container');
        await this.page.fill('.select2-search__field', clienteName);
        await this.page.keyboard.press('Enter');

        // 2. Select Transportista (RUT Search Strategy)
        await this.page.click('#select2-transportista_id-container');
        const searchField = this.page.locator('.select2-search__field');
        await searchField.fill(transportistaRut);
        
        // Wait for the specific result to appear (highlighted)
        await this.page.waitForSelector('.select2-results__option--highlighted', { state: 'visible', timeout: 10000 });
        await this.page.keyboard.press('Enter');

        // 3. Fill Dates
        await this.page.fill('#fecha_inicio', fechaInicio);
        await this.page.fill('#fecha_fin', fechaFin);
    }

    /**
     * Opens modal, selects Route 715 & Cargo 715_3, fills tariffs, and force-closes modal.
     */
    async addSpecificRouteAndCargo(tarifaConductor: string, tarifaViaje: string) {
        await this.page.click('#btn_add_ruta');
        await this.page.waitForSelector('#modal_rutas', { state: 'visible' });

        // Select Specific Route: Route 05082025-1 (ID 715)
        const btnRoute = this.page.locator('a#btn_plus_715');
        await btnRoute.scrollIntoViewIfNeeded();
        await btnRoute.click();

        // Select Specific Cargo: (ID 715_3)
        const btnCargo = this.page.locator('a#btn_plus_ruta_715_3');
        await btnCargo.waitFor({ state: 'visible', timeout: 5000 });
        await btnCargo.click();

        // Fill Tariffs
        await this.page.fill('#tarifa_conductor', tarifaConductor);
        await this.page.fill('#tarifa_viaje', tarifaViaje);

        // Add to grid
        await this.page.click('#btn_guardar_ruta_modal');

        // JS Injection: Force close modal and remove backdrop
        await this.page.evaluate(() => {
            // @ts-ignore
            if (typeof $ !== 'undefined') { $('.modal').modal('hide'); }
            const backdrop = document.querySelector('.modal-backdrop');
            if (backdrop) backdrop.remove();
            document.body.classList.remove('modal-open');
        });
        
        await this.page.waitForTimeout(500); // Allow UI to settle
    }

    async saveAndExtractId(): Promise<string> {
        await this.page.click('#btn_guardar_contrato');
        await this.page.waitForLoadState('networkidle');

        const url = this.page.url();
        const match = url.match(/\/contratos\/(?:ver|editar)\/(\d+)/);
        return (match && match[1]) ? match[1] : '';
    }
}