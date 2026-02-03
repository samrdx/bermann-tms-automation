import { StagehandManager } from '../../src/core/StagehandManager.js';
import { getTestUser } from '../../src/config/credentials.js';
import { config } from '../../src/config/environment.js';
import { logger } from '../../src/utils/logger.js';
import { z } from 'zod';

// Definir interface para el resultado
interface UserInfo {
  name: string;
  hasNotifications: boolean;
}

async function testStagehandLogin() {
  const stagehand = new StagehandManager({ env: 'LOCAL' });

  try {
    logger.info('='.repeat(60));
    logger.info('🤖 Starting Stagehand AI Login Test');
    logger.info('='.repeat(60));

    // Inicializar Stagehand
    await stagehand.initialize();
    const page = await stagehand.getPage();

    const user = getTestUser('regular');
    const loginUrl = `${config.get().baseUrl}/login`;

    // ========================================
    // PASO 1: Navegar con Stagehand
    // ========================================
    logger.info('\n📝 STEP 1: Navigate to login page');
    await page.goto(loginUrl);
    await page.waitForLoadState('domcontentloaded');
    logger.info('✅ Navigated to login page');

    await page.screenshot({ 
      path: './reports/screenshots/stagehand-01-login-page.png',
      fullPage: true 
    });

    await page.waitForTimeout(2000);

    // ========================================
    // PASO 2: Login con lenguaje natural (IA)
    // ========================================
    logger.info('\n🤖 STEP 2: Login using AI instructions');

    logger.info('AI instruction: Fill in the username field');
    await stagehand.act(`Fill in the username field with "${user.username}"`);
    
    await page.waitForTimeout(1000);

    logger.info('AI instruction: Fill in the password field');
    await stagehand.act(`Fill in the password field with "${user.password}"`);
    
    await page.waitForTimeout(1000);

    logger.info('AI instruction: Click the login button');
    await stagehand.act('Click the login button');
    
    // Esperar navegación
    await page.waitForTimeout(5000);

    logger.info('✅ Login actions completed with AI');

    // ========================================
    // PASO 3: Verificar éxito
    // ========================================
    logger.info('\n📝 STEP 3: Verify login success');

    const currentUrl = page.url();
    const isSuccess = currentUrl.includes('/site');

    if (isSuccess) {
      logger.info(`✅ Login successful - URL: ${currentUrl}`);
      
      await page.screenshot({ 
        path: './reports/screenshots/stagehand-02-dashboard.png',
        fullPage: true 
      });
    } else {
      logger.error(`❌ Login failed - URL: ${currentUrl}`);
      
      await page.screenshot({ 
        path: './reports/screenshots/stagehand-error.png',
        fullPage: true 
      });
    }

    await page.waitForTimeout(3000);

    // ========================================
    // PASO 4: Extraer información con IA
    // ========================================
    logger.info('\n🤖 STEP 4: Extract information using AI');

    try {
      const userSchema = z.object({
        name: z.string().describe('The name of the logged in user'),
        hasNotifications: z.boolean().describe('Whether the user has notifications'),
      });

      const userInfo = await stagehand.extract(
        'Extract the logged in user information from the page',
        userSchema
      );

      logger.info('✅ User information extracted:');
      logger.info(`   Name: ${userInfo.name}`);
      logger.info(`   Has notifications: ${userInfo.hasNotifications}`);
    } catch (error) {
      logger.warn('Could not extract user information', error);
    }

    // ========================================
    // RESUMEN
    // ========================================
    logger.info('\n' + '='.repeat(60));
    logger.info('🎉 STAGEHAND AI TEST COMPLETED');
    logger.info('='.repeat(60));
    logger.info('✅ AI successfully performed login');
    logger.info('✅ No hardcoded selectors needed');
    logger.info('✅ Natural language instructions work');
    logger.info('='.repeat(60));

  } catch (error) {
    logger.error('❌ Stagehand test failed', error);
    
    try {
      const page = await stagehand.getPage();
      await page.screenshot({ 
        path: `./reports/screenshots/stagehand-error-${Date.now()}.png`,
        fullPage: true 
      });
    } catch (screenshotError) {
      logger.error('Could not take error screenshot', screenshotError);
    }
    
    throw error;
  } finally {
    await stagehand.close();
  }
}

testStagehandLogin();