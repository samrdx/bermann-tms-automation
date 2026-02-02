import { BrowserManager } from '../../src/core/BrowserManager.js';
import { LoginPage } from '../../src/modules/auth/pages/LoginPage.js';
import { TransportistaFormPage } from '../../src/modules/transport/pages/TransportistaPage.js';
import { getTestUser } from '../../src/config/credentials.js';
import { logger } from '../../src/utils/logger.js';

async function debugTransportista() {
  const browser = new BrowserManager({ headless: false });
  
  try {
    logger.info('🔍 STARTING DEBUG SCRIPT');
    await browser.initialize();
    const page = browser.getPage();
    
    const loginPage = new LoginPage(page);
    const transportistaForm = new TransportistaFormPage(page);
    const user = getTestUser('regular');
    
    // Login
    await loginPage.loginAndWaitForDashboard(user.username, user.password);
    await transportistaForm.navigate();
    await page.waitForTimeout(2000);

    logger.info('📸 Taking initial screenshot');
    await page.screenshot({ path: './reports/screenshots/debug-01-initial.png', fullPage: true });

    // Inspect Region Button
    logger.info('🔍 Inspecting Region Button');
    const regionBtn = page.locator('button[data-id="transportistas-region_id"]');
    
    if (await regionBtn.count() > 0) {
        logger.info('✅ Region button found!');
        logger.info('Outer HTML:', await regionBtn.evaluate(el => el.outerHTML));
        logger.info('Is Visible:', await regionBtn.isVisible());
        logger.info('Is Enabled:', await regionBtn.isEnabled());
    } else {
        logger.error('❌ Region button NOT found with selector: button[data-id="transportistas-region_id"]');
        
        // Dump all buttons with data-id
        const buttons = await page.$$('button[data-id]');
        logger.info(`Found ${buttons.length} buttons with data-id:`);
        for (const btn of buttons) {
            console.log(await btn.evaluate(el => el.outerHTML));
        }
    }

    // Try to open it
    logger.info('🖱️ Attempting to click Region button...');
    if (await regionBtn.count() > 0) {
        await regionBtn.click({ force: true });
        await page.waitForTimeout(1000);
        
        logger.info('📸 Taking screenshot after click');
        await page.screenshot({ path: './reports/screenshots/debug-02-after-click.png', fullPage: true });
        
        // Inspect Dropdown Menus
        const menus = await page.$$('.dropdown-menu');
        logger.info(`Found ${menus.length} dropdown menus`);
        for (const menu of menus) {
            const isVisible = await menu.isVisible();
            const classes = await menu.getAttribute('class');
            logger.info(`Menu: classes="${classes}", visible=${isVisible}`);
        }
    }

  } catch (error) {
    logger.error('❌ Debug failed', error);
  } finally {
    // await browser.close(); // Keep open for manual inspection if needed, or close
    await browser.close();
  }
}

debugTransportista();
