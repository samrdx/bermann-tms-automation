import { execSync } from 'child_process';
import { createLogger } from '../src/utils/logger.js';
import * as fs from 'fs';
import * as path from 'path';

const logger = createLogger('TestRunner');

interface TestSuite {
  name: string;
  script: string;
  critical: boolean;
  category: string;
}

const testSuites: TestSuite[] = [
  // Auth (Critical)
  { 
    name: 'Login', 
    script: 'test:login:headless', 
    critical: true,
    category: 'Auth'
  },
  { 
    name: 'Logout', 
    script: 'test:logout:headless', 
    critical: false,
    category: 'Auth'
  },
  { 
    name: 'Login Negative', 
    script: 'test:login:negative:headless', 
    critical: false,
    category: 'Auth'
  },
  { 
    name: 'Full Flow', 
    script: 'test:full-flow:headless', 
    critical: false,
    category: 'Auth'
  },
  
  // Contratos (Critical)
  { 
    name: 'Contratos - Crear', 
    script: 'test:contratos:crear:headless', 
    critical: true,
    category: 'Contratos'
  },
  
  // Viajes (Critical)
  { 
    name: 'Viajes - Planificar', 
    script: 'test:viajes:planificar:headless', 
    critical: true,
    category: 'Viajes'
  },

];

interface TestResult {
  name: string;
  category: string;
  passed: boolean;
  duration: number;
  error?: string;
}

async function runAllTests() {
    const startTime = Date.now();
    
    logger.info('='.repeat(80));
    logger.info('🚀 BERMANN TMS QA - E2E TEST SUITE');
    logger.info('='.repeat(80));
    logger.info(`Started: ${new Date().toLocaleString()}`);
    logger.info(`Total suites: ${testSuites.length}`);
    logger.info(`Critical tests: ${testSuites.filter(t => t.critical).length}`);
    logger.info('='.repeat(80));
    
    const results: TestResult[] = [];
    let criticalFailures = 0;
    
    // Group by category
    const categories = [...new Set(testSuites.map(t => t.category))];
    
    for (const category of categories) {
      const categoryTests = testSuites.filter(t => t.category === category);
      
      logger.info(`\n📁 ${category.toUpperCase()} (${categoryTests.length} tests)`);
      logger.info('-'.repeat(80));
      
      for (const suite of categoryTests) {
        const criticalLabel = suite.critical ? '🔴 CRITICAL' : '🟡 OPTIONAL';
        logger.info(`\n▶️  ${suite.name} ${criticalLabel}`);
        
        const suiteStartTime = Date.now();
        
        try {
          execSync(`npm run ${suite.script}`, {
            stdio: 'inherit', // Show output for debugging
            timeout: 300000,
            env: { ...process.env, FORCE_COLOR: '0' },
          });
          
          const duration = Date.now() - suiteStartTime;
          results.push({ 
            name: suite.name, 
            category: suite.category,
            passed: true, 
            duration 
          });
          
          logger.info(`   ✅ PASSED (${(duration / 1000).toFixed(1)}s)`);
          
          // Delay between tests for proper cleanup
          if (categoryTests.indexOf(suite) < categoryTests.length - 1) {
            logger.info('   ⏳ Cleanup delay (3s)...');
            await new Promise(resolve => setTimeout(resolve, 3000));
          }
          
        } catch (error) {
          const duration = Date.now() - suiteStartTime;
          const errorMsg = error instanceof Error ? error.message : String(error);
          
          results.push({ 
            name: suite.name,
            category: suite.category,
            passed: false, 
            duration,
            error: errorMsg
          });
          
          logger.error(`   ❌ FAILED (${(duration / 1000).toFixed(1)}s)`);
          
          if (suite.critical) {
            criticalFailures++;
            logger.error(`   ⚠️  CRITICAL TEST FAILURE`);
          }
          
          // Delay after failure too
          if (categoryTests.indexOf(suite) < categoryTests.length - 1) {
            logger.info('   ⏳ Cleanup delay after failure (2s)...');
            await new Promise(resolve => setTimeout(resolve, 2000));
          }
        }
      }
      
      // Delay between categories
      if (categories.indexOf(category) < categories.length - 1) {
        logger.info('\n⏳ Category transition delay (5s)...');
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
    }
    
    // Generate Summary
    const totalDuration = Date.now() - startTime;
    generateSummary(results, criticalFailures, totalDuration);
    
    // Generate HTML Report
    generateHTMLReport(results, criticalFailures, totalDuration);
    
    // Exit code
    if (criticalFailures > 0) {
      logger.error(`\n❌ ${criticalFailures} CRITICAL TEST(S) FAILED - BUILD FAILED`);
      process.exit(1);
    } else {
      logger.info('\n✅ ALL CRITICAL TESTS PASSED - BUILD SUCCESSFUL');
      process.exit(0);
    }
  }

function generateSummary(
  results: TestResult[], 
  criticalFailures: number,
  totalDuration: number
) {
  logger.info('\n' + '='.repeat(80));
  logger.info('📊 TEST EXECUTION SUMMARY');
  logger.info('='.repeat(80));
  
  // By Category
  const categories = [...new Set(results.map(r => r.category))];
  categories.forEach(category => {
    const categoryResults = results.filter(r => r.category === category);
    const passed = categoryResults.filter(r => r.passed).length;
    const total = categoryResults.length;
    const percentage = ((passed / total) * 100).toFixed(0);
    
    logger.info(`\n${category}:`);
    logger.info(`  Tests: ${total}`);
    logger.info(`  Passed: ${passed} (${percentage}%)`);
    logger.info(`  Failed: ${total - passed}`);
  });
  
  // Overall
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const passRate = ((passed / results.length) * 100).toFixed(1);
  
  logger.info('\n' + '-'.repeat(80));
  logger.info('OVERALL RESULTS:');
  logger.info(`  Total Tests: ${results.length}`);
  logger.info(`  Passed: ${passed}`);
  logger.info(`  Failed: ${failed}`);
  logger.info(`  Pass Rate: ${passRate}%`);
  logger.info(`  Critical Failures: ${criticalFailures}`);
  logger.info(`  Total Duration: ${(totalDuration / 1000).toFixed(1)}s`);
  logger.info('='.repeat(80));
  
  // Detailed Results
  logger.info('\nDETAILED RESULTS:');
  logger.info('-'.repeat(80));
  results.forEach(result => {
    const icon = result.passed ? '✅' : '❌';
    const time = (result.duration / 1000).toFixed(1);
    logger.info(`${icon} ${result.name.padEnd(30)} ${time}s`.padEnd(50) + result.category);
  });
  logger.info('-'.repeat(80));
}

function generateHTMLReport(
  results: TestResult[],
  criticalFailures: number,
  totalDuration: number
) {
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const passRate = ((passed / results.length) * 100).toFixed(1);
  
  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bermann TMS QA - Test Report</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f5f5f5;
            padding: 20px;
        }
        .container { max-width: 1200px; margin: 0 auto; }
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px;
            border-radius: 10px;
            margin-bottom: 20px;
        }
        .header h1 { font-size: 32px; margin-bottom: 10px; }
        .header p { opacity: 0.9; }
        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 20px;
        }
        .stat-card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .stat-card h3 { color: #666; font-size: 14px; margin-bottom: 10px; }
        .stat-card .value { font-size: 36px; font-weight: bold; }
        .stat-card.passed .value { color: #10b981; }
        .stat-card.failed .value { color: #ef4444; }
        .stat-card.rate .value { color: #3b82f6; }
        .stat-card.time .value { color: #8b5cf6; font-size: 28px; }
        .results {
            background: white;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        .results h2 { margin-bottom: 20px; color: #333; }
        table {
            width: 100%;
            border-collapse: collapse;
        }
        th {
            background: #f9fafb;
            padding: 12px;
            text-align: left;
            font-weight: 600;
            color: #666;
            border-bottom: 2px solid #e5e7eb;
        }
        td {
            padding: 12px;
            border-bottom: 1px solid #e5e7eb;
        }
        .status {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 600;
        }
        .status.passed {
            background: #d1fae5;
            color: #065f46;
        }
        .status.failed {
            background: #fee2e2;
            color: #991b1b;
        }
        .category {
            display: inline-block;
            padding: 4px 8px;
            background: #e0e7ff;
            color: #3730a3;
            border-radius: 4px;
            font-size: 12px;
        }
        .footer {
            text-align: center;
            margin-top: 40px;
            color: #666;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 Bermann TMS QA Automation</h1>
            <p>E2E Test Execution Report - ${new Date().toLocaleString()}</p>
        </div>
        
        <div class="stats">
            <div class="stat-card passed">
                <h3>Tests Passed</h3>
                <div class="value">${passed}</div>
            </div>
            <div class="stat-card failed">
                <h3>Tests Failed</h3>
                <div class="value">${failed}</div>
            </div>
            <div class="stat-card rate">
                <h3>Pass Rate</h3>
                <div class="value">${passRate}%</div>
            </div>
            <div class="stat-card time">
                <h3>Total Duration</h3>
                <div class="value">${(totalDuration / 1000).toFixed(1)}s</div>
            </div>
        </div>
        
        <div class="results">
            <h2>Test Results (${results.length} tests)</h2>
            <table>
                <thead>
                    <tr>
                        <th>Test Name</th>
                        <th>Category</th>
                        <th>Status</th>
                        <th>Duration</th>
                    </tr>
                </thead>
                <tbody>
                    ${results.map(r => `
                        <tr>
                            <td>${r.name}</td>
                            <td><span class="category">${r.category}</span></td>
                            <td><span class="status ${r.passed ? 'passed' : 'failed'}">${r.passed ? '✅ PASSED' : '❌ FAILED'}</span></td>
                            <td>${(r.duration / 1000).toFixed(1)}s</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
        
        <div class="footer">
            <p>Generated by Bermann TMS QA Automation Framework</p>
            <p>Framework by Samuel Rodriguez - ${new Date().getFullYear()}</p>
        </div>
    </div>
</body>
</html>
  `;
  
  const reportPath = path.join(process.cwd(), 'reports', 'test-report.html');
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, html);
  
  logger.info(`\n📄 HTML Report generated: ${reportPath}`);
  logger.info(`   Open in browser: file://${reportPath}`);
}

// Execute
runAllTests().catch(error => {
  logger.error('Test runner failed:', error);
  process.exit(1);
});