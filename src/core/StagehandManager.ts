import { Stagehand } from '@browserbasehq/stagehand';
import type { AnyPage } from '@browserbasehq/stagehand';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('StagehandManager');

export interface StagehandConfig {
  apiKey?: string;
  modelName?: string;
  headless?: boolean;
  verbose?: boolean;
  enableCaching?: boolean;
}

export interface UsageStats {
  requests: number;
  estimatedCost: number;
  averageCostPerRequest: number;
}

export class StagehandManager {
  private stagehand: Stagehand | null = null;
  private pageCache: AnyPage | null = null;
  private config: StagehandConfig;
  
  // Tracking de uso
  private requestCount = 0;
  private totalCost = 0;

  constructor(config: StagehandConfig = {}) {
    this.config = {
      apiKey: config.apiKey || process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY,
      // Stagehand v3 supports Gemini models via provider "google"
      // (e.g. "gemini-1.5-flash", "gemini-2.0-flash").
      modelName: config.modelName || 'gemini-2.0-flash',
      headless: config.headless ?? false,
      verbose: config.verbose ?? true,
      enableCaching: config.enableCaching ?? true,
    };
  }

  async initialize(): Promise<void> {
    try {
      logger.info(`🤖 Initializing Stagehand with model: ${this.config.modelName}...`);
      
      if (!this.config.apiKey) {
        throw new Error('API Key is required. Add GEMINI_API_KEY to your .env file');
      }

      logger.info(`🔑 API Key: ${this.config.apiKey.substring(0, 20)}...`);

      // Configuración que Stagehand acepta
      this.stagehand = new Stagehand({
        env: 'LOCAL',
        apiKey: this.config.apiKey,
        verbose: this.config.verbose ? 1 : 0,
        localBrowserLaunchOptions: {
          headless: this.config.headless,
        },
        model: this.config.modelName ?? 'gemini-2.0-flash',
      });

      await this.stagehand.init();
      
      logger.info(`✅ Stagehand initialized with ${this.config.modelName}`);
      
      // Obtener page via V3Context (Stagehand v3)
      let page = this.stagehand.context.activePage();
      if (!page) {
        try {
          page = await this.stagehand.context.awaitActivePage(5000);
        } catch {
          // ignore and fallback to creating a new page
        }
      }
      if (!page) {
        logger.info('Creating new page...');
        page = await this.stagehand.context.newPage();
        logger.info('✅ New page created');
      } else {
        logger.info('✅ Using existing page from context');
      }

      this.pageCache = page;
      
      logger.info('✅ Stagehand ready');
      logger.info(`💰 Using: ${this.config.modelName}`);
    } catch (error) {
      logger.error('Failed to initialize Stagehand', error);
      throw error;
    }
  }

  async act(instruction: string): Promise<void> {
    if (!this.stagehand) {
      throw new Error('Stagehand not initialized');
    }

    this.requestCount++;
    logger.info(`🤖 AI Request #${this.requestCount}: "${instruction}"`);
    
    try {
      const startTime = Date.now();
      
      await this.stagehand.act(instruction);
      
      const duration = Date.now() - startTime;
      
      // Estimación de costo
      const estimatedCost = 0.002; // ~$0.002 por request
      this.totalCost += estimatedCost;
      
      logger.info(`✅ Action completed in ${duration}ms`);
      logger.info(`💰 Estimated cost: $${this.totalCost.toFixed(4)}`);
      
    } catch (error) {
      logger.error(`❌ Failed to act: "${instruction}"`, error);
      throw error;
    }
  }

  async extract<T>(instruction: string, schema?: any): Promise<T> {
    if (!this.stagehand) {
      throw new Error('Stagehand not initialized');
    }

    this.requestCount++;
    logger.info(`🤖 AI Extract #${this.requestCount}: "${instruction}"`);
    
    try {
      const startTime = Date.now();
      const options: any = { instruction };
      if (schema) {
        options.schema = schema;
      }
      
      const result = await this.stagehand.extract(options);
      const duration = Date.now() - startTime;
      
      const estimatedCost = 0.005;
      this.totalCost += estimatedCost;
      
      logger.info(`✅ Extraction completed in ${duration}ms`);
      logger.info(`💰 Estimated cost: $${this.totalCost.toFixed(4)}`);
      
      return result as T;
    } catch (error) {
      logger.error(`❌ Failed to extract: "${instruction}"`, error);
      throw error;
    }
  }

  async observe(instruction?: string): Promise<any> {
    if (!this.stagehand) {
      throw new Error('Stagehand not initialized');
    }

    this.requestCount++;
    logger.info(`🤖 AI Observe #${this.requestCount}${instruction ? `: "${instruction}"` : ''}`);
    
    try {
      const startTime = Date.now();
      const result = instruction ? await this.stagehand.observe(instruction) : await this.stagehand.observe();
      const duration = Date.now() - startTime;
      
      const estimatedCost = 0.003;
      this.totalCost += estimatedCost;
      
      logger.info(`✅ Observation completed in ${duration}ms`);
      logger.info(`💰 Estimated cost: $${this.totalCost.toFixed(4)}`);
      
      return result;
    } catch (error) {
      logger.error('Failed to observe', error);
      throw error;
    }
  }

  getPage(): AnyPage {
    if (!this.pageCache) {
      throw new Error('Page not available');
    }
    return this.pageCache;
  }

  getUsageStats(): UsageStats {
    return {
      requests: this.requestCount,
      estimatedCost: this.totalCost,
      averageCostPerRequest: this.totalCost / (this.requestCount || 1),
    };
  }

  logUsageStats(): void {
    const stats = this.getUsageStats();
    logger.info('📊 Stagehand Usage Statistics:');
    logger.info(`   Total requests: ${stats.requests}`);
    logger.info(`   Estimated cost: $${stats.estimatedCost.toFixed(4)}`);
    logger.info(`   Avg cost/request: $${stats.averageCostPerRequest.toFixed(4)}`);
    logger.info(`   Free credit remaining: ~$${(5 - stats.estimatedCost).toFixed(2)}`);
  }

  async close(): Promise<void> {
    if (this.stagehand) {
      logger.info('Closing Stagehand...');
      
      this.logUsageStats();
      
      try {
        await this.stagehand.close();
        this.stagehand = null;
        this.pageCache = null;
        logger.info('✅ Stagehand closed');
      } catch (error) {
        logger.error('Error closing Stagehand', error);
        throw error;
      }
    }
  }
}