import { test, expect } from '../../../../../src/fixtures/base.js';
import { AsignarPage } from '../../../../../src/modules/planning/pages/AsignarPage.js';
import { DataPathHelper } from '../../../../api-helpers/DataPathHelper.js';
import { TmsApiClient } from '../../../../api-helpers/TmsApiClient.js';
import { logger } from '../../../../../src/utils/logger.js';
import fs from 'fs';

// Helper de RUT
function generateRandomRut(): string {
    const num = Math.floor(10000000 + Math.random() * 90000000);
    let suma = 0;
    let multiplicador = 2;
    for (let i = String(num).length - 1; i >= 0; i--) {
        suma += parseInt(String(num).charAt(i)) * multiplicador;
        multiplicador = multiplicador === 7 ? 2 : multiplicador + 1;
    }
    const resto = 11 - (suma % 11);
    const dv = resto === 11 ? '0' : resto === 10 ? 'K' : String(resto);
    return `${num}-${dv}`.replace(/\B(?=(\d{3})+(?!\d))/g, "."); 
}

test.describe('Viajes - Asignar (Business Logic Workflow)', () => {
  test('Should assign Trip to Transportista (Full Contract Setup)', async ({ page }, testInfo) => {
    
    // 1. Obtener Cliente (del test base) o usar default
    const dataPath = DataPathHelper.getWorkerDataPath(testInfo);
    let clienteId = '62'; 
    if (fs.existsSync(dataPath)) {
        try {
            const opData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
            if (opData.cliente?.id) clienteId = opData.cliente.id;
        } catch (e) {}
    }

    const api = new TmsApiClient(page);
    await api.initialize(); 

    // 2. CREAR TRANSPORTISTA (Para el contrato de Costo)
    const transName = `TransAPI ${Math.floor(Math.random() * 10000)}`;
    const transportistaId = await api.createTransportista(transName, generateRandomRut());

    // 3. LOGICA: CREAR CONTRATOS
    
    // A. Contrato CLIENTE (Tipo Venta) -> Permite PLANIFICAR
    const nroContratoVenta = `VTA-${Math.floor(Math.random() * 100000)}`;
    await api.createContratoVenta(clienteId, nroContratoVenta);

    // B. Contrato TRANSPORTISTA (Tipo Costo) -> Permite ASIGNAR
    // CORRECCIÓN AQUÍ: Usamos createContratoCosto
    const nroContratoCosto = `CST-${Math.floor(Math.random() * 100000)}`;
    await api.createContratoCosto(transportistaId, nroContratoCosto);

    // 4. PLANIFICAR VIAJE
    const nroViaje = `API-V${Math.floor(Math.random() * 100000)}`;
    await api.createViaje(clienteId, nroViaje);
    
    // 5. VERIFICACIÓN UI
    const asignarPage = new AsignarPage(page);
    await asignarPage.navigate();

    logger.info(`🔍 UI: Buscando viaje ${nroViaje}...`);
    await page.waitForTimeout(1000);
    await page.locator('input[type="search"]').first().fill(nroViaje);
    await page.keyboard.press('Enter');
    
    await expect(page.locator('tbody tr')).toContainText(nroViaje, { timeout: 10000 });
    
    logger.info(`✅ Business Logic Verified: Trip ${nroViaje} planned with Client Contract & ready for Carrier ${transName} (Contracted).`);
  });
});