import { BrowserManager } from '../src/core/BrowserManager.js';
import { logger } from '../src/utils/logger.js';
import { config } from '../src/config/environment.js';

async function runTest() {
  const browser = new BrowserManager();

  try {
    logger.info('Starting example test...');

    // Inicializar browser
    await browser.initialize();

    // Navegar a Bermann TMS QA Login
    const tmsUrl = config.get().baseUrl + '/login';
    await browser.navigate(tmsUrl);

    // Tomar screenshot
    await browser.takeScreenshot('bermann-tms-login');

    // Esperar 2 segundos para ver el resultado
    await new Promise(resolve => setTimeout(resolve, 2000));

    logger.info('Test completed successfully!');
  } catch (error) {
    logger.error('Test failed', error);
    throw error;
  } finally {
    await browser.close();
  }
}

runTest();