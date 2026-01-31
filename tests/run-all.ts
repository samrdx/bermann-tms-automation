import { execSync } from 'child_process';
import { createLogger } from '../src/utils/logger.js';

const logger = createLogger('TestRunner');

interface TestSuite {
  name: string;
  script: string;
  critical: boolean;
}

const testSuites: TestSuite[] = [
  // Critical tests (must pass)
  { name: 'Login', script: 'test:login:headless', critical: true },
  { name: 'Logout', script: 'test:logout:headless', critical: true },
  { name: 'Contratos Crear', script: 'test:contratos:crear:headless', critical: true },
  { name: 'Viajes Planificar', script: 'test:viajes:planificar:headless', critical: true },
  { name: 'Viajes Asignar', script: 'test:viajes:asignar:headless', critical: true },
  
  // Optional tests
  { name: 'Login Negative', script: 'test:login:negative:headless', critical: false },
  { name: 'Full Flow', script: 'test:full-flow:headless', critical: false },
];

async function runAllTests() {
  logger.info('='.repeat(60));
  logger.info('🚀 Running All E2E Tests');
  logger.info('='.repeat(60));
  
  const results: { name: string; passed: boolean; duration: number }[] = [];
  let criticalFailures = 0;
  
  for (const suite of testSuites) {
    logger.info(`\n▶️  Running: ${suite.name}`);
    const startTime = Date.now();
    
    try {
      execSync(`npm run ${suite.script}`, {
        stdio: 'inherit',
        timeout: 300000, // 5 min timeout
      });
      
      const duration = Date.now() - startTime;
      results.push({ name: suite.name, passed: true, duration });
      logger.info(`✅ ${suite.name} - PASSED (${(duration / 1000).toFixed(1)}s)`);
    } catch (error) {
      const duration = Date.now() - startTime;
      results.push({ name: suite.name, passed: false, duration });
      logger.error(`❌ ${suite.name} - FAILED (${(duration / 1000).toFixed(1)}s)`);
      
      if (suite.critical) {
        criticalFailures++;
      }
    }
  }
  
  // Summary
  logger.info('\n' + '='.repeat(60));
  logger.info('📊 TEST SUMMARY');
  logger.info('='.repeat(60));
  
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const totalTime = results.reduce((sum, r) => sum + r.duration, 0);
  
  results.forEach(result => {
    const icon = result.passed ? '✅' : '❌';
    const time = (result.duration / 1000).toFixed(1);
    logger.info(`${icon} ${result.name.padEnd(25)} ${time}s`);
  });
  
  logger.info('='.repeat(60));
  logger.info(`Total: ${results.length} tests`);
  logger.info(`Passed: ${passed} (${((passed / results.length) * 100).toFixed(1)}%)`);
  logger.info(`Failed: ${failed}`);
  logger.info(`Critical failures: ${criticalFailures}`);
  logger.info(`Total time: ${(totalTime / 1000).toFixed(1)}s`);
  logger.info('='.repeat(60));
  
  if (criticalFailures > 0) {
    logger.error(`\n❌ ${criticalFailures} CRITICAL TEST(S) FAILED`);
    process.exit(1);
  } else {
    logger.info('\n✅ ALL CRITICAL TESTS PASSED');
    process.exit(0);
  }
}

runAllTests();