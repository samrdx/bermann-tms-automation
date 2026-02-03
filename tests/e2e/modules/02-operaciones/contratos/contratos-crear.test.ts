import { test, expect } from '@playwright/test';
import { ContratosPage } from '../pages/ContratosPage.js';

test.describe('Step 5: Contract Creation', () => {
    let contratosPage: ContratosPage;

    test('Create Contract with RUT Search and Specific Route 715', async ({ page }) => {
        contratosPage = new ContratosPage(page);

        // 1. Data Preparation
        // Target Transportista: ID 258 / 24618893-9
        const transportistaRut = '24618893-9'; 
        const clienteName = 'Cliente Standard'; 
        const tarifaConductor = '20000';
        const tarifaViaje = '50000';

        // 2. Navigate
        await contratosPage.navigateToCreate();

        // 3. Fill Main Form (RUT Based Selection)
        console.log(`Selecting Transportista with RUT: ${transportistaRut}`);
        await contratosPage.fillMainForm(clienteName, transportistaRut, '2025-08-05', '2025-08-10');

        // 4. Add Route & Cargo (Specific IDs + JS Injection)
        console.log('Adding Route 715 and Cargo 715_3...');
        await contratosPage.addSpecificRouteAndCargo(tarifaConductor, tarifaViaje);

        // 5. Save and Rescue ID
        const contractId = await contratosPage.saveAndExtractId();
        console.log(`Contract Created Successfully. ID: ${contractId}`);
        expect(contractId).toBeTruthy();

        // 6. Final Verification
        // Navigate to view page if not already there
        if (!page.url().includes(`/contratos/ver/${contractId}`)) {
            await page.goto(`/contratos/ver/${contractId}`);
        }
        
        // Verify Route 715 (05082025-1) is assigned
        await expect(page.getByText('05082025-1')).toBeVisible();

        // Store ID for Step 6
        process.env.CREATED_CONTRACT_ID = contractId;
    });
});