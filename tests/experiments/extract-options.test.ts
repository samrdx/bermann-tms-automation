import { test } from '@playwright/test';
import { LoginPage } from '../../src/modules/auth/pages/LoginPage.js';
import { TransportistaFormPage } from '../../src/modules/transport/pages/TransportistaPage.js';

test('Extract Tipo Transportista options', async ({ page }) => {
  const loginPage = new LoginPage(page);
  await loginPage.navigate();
  await loginPage.login(process.env.TMS_USERNAME || 'arivas', process.env.TMS_PASSWORD || 'arivas');
  
  const transportistaPage = new TransportistaFormPage(page);
  await transportistaPage.navigate();
  
  // Click the dropdown to open it
  await page.click('button[data-id="transportistas-tipo_transportista_id"]', { force: true });
  await page.waitForTimeout(1000);
  
  // Extract texts from the dropdown
  const options = await page.locator('.dropdown-menu.show').first().locator('.dropdown-item').allTextContents();
  
  console.log('--- AVAILABLE OPTIONS IN QA ---');
  options.forEach((opt, index) => console.log(`[${index}] "${opt.trim()}"`));
  console.log('-------------------------------');
});
