import { BrowserManager } from '../../src/core/BrowserManager.js';
import { LoginPage } from '../../src/pages/LoginPage.js';
import { getTestUser } from '../../src/config/credentials.js';
import { logger } from '../../src/utils/logger.js';

async function experimentalTests() {
  const browser = new BrowserManager({ headless: false });
  
  try {
    await browser.initialize();
    const loginPage = new LoginPage(browser.getPage());

    // EXPERIMENTO 1: Login con credenciales INVÁLIDAS
    logger.info('🧪 EXPERIMENTO 1: Credenciales inválidas');
    await loginPage.login('usuario_falso', 'password_falso');
    
    const hasError = await loginPage.hasErrorMessage();
    logger.info(`¿Hay mensaje de error? ${hasError}`);
    
    if (hasError) {
      const errorMsg = await loginPage.getErrorMessage();
      logger.info(`Mensaje: ${errorMsg}`);
    }
    
    await loginPage.takeScreenshot('login-invalid-credentials');
    
    // Esperar para ver
    await new Promise(resolve => setTimeout(resolve, 3000));
    
  } finally {
    await browser.close();
  }
}

experimentalTests();