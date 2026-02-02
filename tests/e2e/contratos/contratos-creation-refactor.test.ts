import { test, expect } from '../../../src/fixtures/base.js';
import { getTestUser } from '../../../src/config/credentials.js';

test.describe('Contract Management (Refactor)', () => {
  // Now we inject 'contractLifecycleFlow' and 'contratosActions' directly
  test('Should create a new contract successfully', async ({ 
    contractLifecycleFlow, 
    contratosActions 
  }) => {
    
    const user = getTestUser('regular');
    const contractData = {
      nroContrato: Date.now().toString().slice(-8),
      tipo: 'Costo',
      transportista: 'Transportadora S.A.I',
      valorHora: '25000'
    };

    await test.step('Execute Creation Flow', async () => {
      await contractLifecycleFlow.createAndVerifyContract(user.username, user.password, contractData);
    });

    await test.step('Verification', async () => {
      await expect(async () => {
        const isEdit = await contratosActions.isEditPage();
        expect(isEdit).toBe(true);
      }).toPass({ timeout: 10000 });
    });
  });
});
