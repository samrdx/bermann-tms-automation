import { BrowserManager } from '../src/core/BrowserManager.js';
import { config } from '../src/config/environment.js';
import { logger } from '../src/utils/logger.js';

async function exploreLogin() {
  const browser = new BrowserManager({ headless: false });
  
  try {
    logger.info('🚀 Iniciando exploración del login...');
    
    await browser.initialize();
    const loginUrl = config.get().baseUrl + '/login';
    await browser.navigate(loginUrl);
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ Navegador abierto en: ' + loginUrl);
    console.log('='.repeat(60));
    console.log('\n📝 INSTRUCCIONES:');
    console.log('1. Presiona F12 para abrir DevTools');
    console.log('2. Click en el ícono de "Inspector" (flecha)');
    console.log('3. Inspecciona cada elemento:');
    console.log('   - Campo de usuario');
    console.log('   - Campo de contraseña');
    console.log('   - Botón de login');
    console.log('   - Mensaje de error (si existe)');
    console.log('\n4. Para cada elemento, anota:');
    console.log('   - id (si tiene)');
    console.log('   - name (si tiene)');
    console.log('   - class (si tiene)');
    console.log('   - type (si tiene)');
    console.log('\n⏳ Esperando 120 segundos para que explores...\n');
    console.log('='.repeat(60) + '\n');
    
    // Esperar 2 minutos
    await new Promise(resolve => setTimeout(resolve, 120000));
    
    logger.info('⏰ Tiempo de exploración terminado');
    
  } catch (error) {
    logger.error('Error durante exploración', error);
  } finally {
    await browser.close();
  }
}

exploreLogin();