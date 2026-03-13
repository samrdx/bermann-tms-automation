import { chromium } from 'playwright';
import { getTestUser } from '../../src/config/credentials.js';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const user = getTestUser('admin');

  console.log('Logging in...');
  await page.goto('https://moveontruckqa.bermanntms.cl/login');
  await page.fill('#login-usuario', user.username);
  await page.fill('#login-clave', user.password);
  await page.click('button[type="submit"]');
  
  await page.waitForTimeout(5000);
  
  console.log('Navigating to capacities create...');
  await page.goto('https://moveontruckqa.bermanntms.cl/capacities/create');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: 'capacities-create.png' });

  console.log('DOM Dump Create:');
  const createHtml = await page.evaluate(() => {
    return document.querySelector('body')?.innerHTML || 'No body found';
  });
  
  console.log(createHtml);

  await browser.close();
})();
