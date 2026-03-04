import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('Navigating to login...');
  await page.goto('https://moveontruckqa.bermanntms.cl/login');
  
  await page.fill('#login-usuario', process.env.TMS_USERNAME || 'arivas');
  await page.fill('#login-clave', process.env.TMS_PASSWORD || 'arivas');
  await page.click('button[type="submit"].btn-success');
  
  console.log('Wait for login navigation...');
  await page.waitForTimeout(3000);

  console.log('Navigating to Transportista...');
  await page.goto('https://moveontruckqa.bermanntms.cl/transportistas/crear');
  await page.waitForLoadState('networkidle');
  
  console.log('Opening Tipo Transportista dropdown...');
  await page.waitForSelector('button[data-id="transportistas-tipo_transportista_id"]', { state: 'visible' });
  await page.click('button[data-id="transportistas-tipo_transportista_id"]');
  
  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'dropdown-debug.png' });
  console.log('Screenshot saved to dropdown-debug.png');
  
  // Also dump HTML
  const selectHtml = await page.locator('select#transportistas-tipo_transportista_id').evaluate(node => node.innerHTML);
  console.log('--- SELECT HTML ---');
  console.log(selectHtml);
  
  await browser.close();
})();
