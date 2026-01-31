import { StagehandManager } from '../src/core/StagehandManager.js';
import { getTestUser } from '../src/config/credentials.js';
import { config } from '../src/config/environment.js';
import { logger } from '../src/utils/logger.js';

console.log('🔍 Script started...');

async function testStagehandLoginAI() {
  console.log('🔍 Function called...');
  
  const stagehand = new StagehandManager({ headless: false });

  try {
    console.log('🔍 Try block entered...');
    logger.info('='.repeat(60));
    logger.info('🤖 Testing Stagehand AI Login');
    logger.info('='.repeat(60));

    // Inicializar
    console.log('🔍 About to initialize...');
    await stagehand.initialize();
    console.log('🔍 Initialized!');
    
    const page = stagehand.getPage();
    console.log('🔍 Got page!');
    
    const user = getTestUser('regular');
    console.log('🔍 Got user:', user.username);

    // Navegar
    logger.info('\n📝 STEP 1: Navigate to login');
    console.log('🔍 About to navigate...');
    await page.goto(`${config.get().baseUrl}/login`);
    console.log('🔍 Navigation completed!');
    
    // Esperar
    await new Promise(resolve => setTimeout(resolve, 2000));

    logger.info('✅ On login page');

    await page.screenshot({ 
      path: './reports/screenshots/stagehand-ai-01-login.png',
      fullPage: true 
    });
    console.log('🔍 Screenshot taken!');

    // LOGIN CON IA
    logger.info('\n🤖 STEP 2: Login using AI');
    
    console.log('🔍 About to act (username)...');
    logger.info(`AI: Fill username with "${user.username}"`);
    await stagehand.act(`Type "${user.username}" in the username field`);
    console.log('🔍 Username filled!');
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('🔍 About to act (password)...');
    logger.info('AI: Fill password');
    await stagehand.act(`Type "${user.password}" in the password field`);
    console.log('🔍 Password filled!');
    await new Promise(resolve => setTimeout(resolve, 1000));

    console.log('🔍 About to act (click login)...');
    logger.info('AI: Click login button');
    await stagehand.act('Click the login button');
    console.log('🔍 Login button clicked!');
    
    // Esperar navegación
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Verificar éxito
    logger.info('\n📝 STEP 3: Verify login success');
    const currentUrl = page.url();
    const isSuccess = currentUrl.includes('/site');

    if (isSuccess) {
      logger.info('✅ LOGIN SUCCESSFUL WITH AI!');
      logger.info(`   Current URL: ${currentUrl}`);
      
      await page.screenshot({ 
        path: './reports/screenshots/stagehand-ai-02-success.png',
        fullPage: true 
      });
    } else {
      logger.error('❌ Login failed');
      logger.error(`   Current URL: ${currentUrl}`);
      
      await page.screenshot({ 
        path: './reports/screenshots/stagehand-ai-error.png',
        fullPage: true 
      });
    }

    await new Promise(resolve => setTimeout(resolve, 3000));

    // Estadísticas
    logger.info('\n' + '='.repeat(60));
    logger.info('📊 STAGEHAND AI TEST RESULTS');
    logger.info('='.repeat(60));
    
    const stats = stagehand.getUsageStats();
    logger.info(`✅ Login with AI: ${isSuccess ? 'SUCCESS' : 'FAILED'}`);
    logger.info(`🤖 AI requests used: ${stats.requests}`);
    logger.info(`💰 Total cost: $${stats.estimatedCost.toFixed(4)}`);
    logger.info('='.repeat(60));

  } catch (error) {
    console.error('🔍 ERROR CAUGHT:', error);
    logger.error('❌ Test failed', error);
    
    try {
      const page = stagehand.getPage();
      await page.screenshot({ 
        path: `./reports/screenshots/stagehand-ai-error-${Date.now()}.png`,
        fullPage: true 
      });
    } catch (screenshotError) {
      logger.error('Could not take screenshot', screenshotError);
    }
    
    throw error;
  } finally {
    console.log('🔍 Finally block...');
    await stagehand.close();
    console.log('🔍 Stagehand closed!');
  }
}

console.log('🔍 About to call function...');
testStagehandLoginAI()
  .then(() => {
    console.log('🔍 Test completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('🔍 Test failed with error:', error);
    process.exit(1);
  });