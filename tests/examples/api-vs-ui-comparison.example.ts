/**
 * Performance Comparison: UI Automation vs API Automation
 *
 * This example demonstrates the speed difference between:
 * - TransportistaHelper (UI automation via Page Objects)
 * - TmsApiClient (API automation via HTTP requests)
 *
 * Run this test to measure actual performance gains.
 */

import { test } from '@playwright/test';
import { TransportistaHelper } from '../api-helpers/TransportistaHelper.js';
import { TmsApiClient } from '../api-helpers/TmsApiClient.js';
import { TransportistaFactory } from '../../src/modules/transport/factories/TransportistaFactory.js';
import { logger } from '../../src/utils/logger.js';

test.describe('Performance Comparison: UI vs API @performance', () => {

  test('Baseline: Create entities via UI automation', async ({ page }) => {
    const startTime = Date.now();

    logger.info('='.repeat(80));
    logger.info('⏱️  BASELINE: UI Automation (Current Method)');
    logger.info('='.repeat(80));

    // Create 4 entities via UI (current method)
    const results = [];

    for (let i = 0; i < 4; i++) {
      const entityStartTime = Date.now();

      const transportista = await TransportistaHelper.createTransportistaViaUI(page);

      const entityTime = ((Date.now() - entityStartTime) / 1000).toFixed(2);
      logger.info(`✅ Entity ${i + 1} created in ${entityTime}s (ID: ${transportista.id})`);

      results.push({
        method: 'UI',
        entity: i + 1,
        time: parseFloat(entityTime),
        id: transportista.id
      });
    }

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    const avgTime = (parseFloat(totalTime) / 4).toFixed(2);

    logger.info('='.repeat(80));
    logger.info(`📊 UI Automation Results:`);
    logger.info(`   Total Time: ${totalTime}s`);
    logger.info(`   Average per Entity: ${avgTime}s`);
    logger.info(`   Entities Created: 4`);
    logger.info('='.repeat(80));
  });

  test.skip('Target: Create entities via API automation', async ({ page }) => {
    // ⚠️ SKIPPED: TmsApiClient not yet implemented
    // Uncomment once TmsApiClient.createTransportista() is implemented

    const startTime = Date.now();

    logger.info('='.repeat(80));
    logger.info('🚀 TARGET: API Automation (Future Method)');
    logger.info('='.repeat(80));

    // Initialize API client
    const apiClient = new TmsApiClient(page);
    await apiClient.initialize();

    // Create 4 entities via API
    const results = [];

    for (let i = 0; i < 4; i++) {
      const entityStartTime = Date.now();

      const data = TransportistaFactory.create();
      const transportistaId = await apiClient.createTransportista(data);

      const entityTime = ((Date.now() - entityStartTime) / 1000).toFixed(2);
      logger.info(`✅ Entity ${i + 1} created in ${entityTime}s (ID: ${transportistaId})`);

      results.push({
        method: 'API',
        entity: i + 1,
        time: parseFloat(entityTime),
        id: transportistaId
      });
    }

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    const avgTime = (parseFloat(totalTime) / 4).toFixed(2);

    logger.info('='.repeat(80));
    logger.info(`📊 API Automation Results:`);
    logger.info(`   Total Time: ${totalTime}s`);
    logger.info(`   Average per Entity: ${avgTime}s`);
    logger.info(`   Entities Created: 4`);
    logger.info('='.repeat(80));

    // Expected results:
    // - Total Time: ~4-8s (vs 60s with UI)
    // - Average: ~1-2s per entity (vs 15s with UI)
    // - Speedup: 6-15x faster
  });

  test.skip('Full Comparison: UI vs API side by side', async ({ page }) => {
    // ⚠️ SKIPPED: Run after API implementation is complete
    // This test will create entities using both methods and compare

    logger.info('='.repeat(80));
    logger.info('📊 FULL COMPARISON: UI vs API');
    logger.info('='.repeat(80));

    // UI Method
    const uiStartTime = Date.now();
    const uiTransportista = await TransportistaHelper.createTransportistaViaUI(page);
    const uiTime = ((Date.now() - uiStartTime) / 1000).toFixed(2);

    // API Method
    const apiClient = new TmsApiClient(page);
    await apiClient.initialize();

    const apiStartTime = Date.now();
    const data = TransportistaFactory.create();
    const apiTransportistaId = await apiClient.createTransportista(data);
    const apiTime = ((Date.now() - apiStartTime) / 1000).toFixed(2);

    // Comparison
    const speedup = (parseFloat(uiTime) / parseFloat(apiTime)).toFixed(2);

    logger.info('='.repeat(80));
    logger.info('📊 Results:');
    logger.info(`   UI Automation: ${uiTime}s`);
    logger.info(`   API Automation: ${apiTime}s`);
    logger.info(`   Speedup: ${speedup}x faster`);
    logger.info('='.repeat(80));
  });
});

/**
 * Expected Results (Projected)
 *
 * Current (UI Automation):
 * - 1 entity: ~15s
 * - 4 entities: ~60s
 * - base-entities.setup.ts: ~60s
 *
 * Future (API Automation):
 * - 1 entity: ~1-2s
 * - 4 entities: ~4-8s
 * - base-entities.setup.ts: ~10s
 *
 * Performance Gain:
 * - Per entity: 6-15x faster
 * - Full setup: 6x faster (60s → 10s)
 * - Total test suite: Saves ~50s per run
 *   - 10 runs/day: Saves 500s = 8 minutes/day
 *   - 50 runs/week: Saves 2500s = 42 minutes/week
 */
