import { Stagehand } from '@browserbasehq/stagehand';
import { createLogger } from '../utils/logger.js';
import type { Page } from 'playwright';

const logger = createLogger('StagehandManager');

export interface StagehandConfig {
  env?: 'LOCAL' | 'BROWSERBASE';
  apiKey?: string;
  projectId?: string;
  enableCaching?: boolean;
  modelName?: string;
  debugMode?: boolean;
}

export class StagehandManager {
  private stagehand: Stagehand | null = null;
  private config: StagehandConfig;

  constructor(config: StagehandConfig = {}) {
    this.config = {
      env: config.env ?? 'LOCAL',
      apiKey: config.apiKey ?? process.env.GEMINI_API_KEY ?? '',
      enableCaching: config.enableCaching ?? true,
      modelName: config.modelName ?? 'gemini-2.0-flash',
      debugMode: config.debugMode ?? false,
      ...config,
    };
  }

  async initialize(): Promise<void> {
    logger.info('Initializing Stagehand...');

    try {
      this.stagehand = new Stagehand({
        env: this.config.env ?? 'LOCAL',
        enableCaching: this.config.enableCaching ?? true,
        debugDom: this.config.debugMode ?? false,
      });

      await this.stagehand.init();
      
      logger.info('Stagehand initialized successfully');
      logger.info(`Environment: ${this.config.env}`);
      logger.info(`Caching: ${this.config.enableCaching}`);
    } catch (error) {
      logger.error('Failed to initialize Stagehand', error);
      throw error;
    }
  }

  async getPage(): Promise<Page> {
    if (!this.stagehand) {
      throw new Error('Stagehand not initialized. Call initialize() first.');
    }

    try {
      const page = this.stagehand.page;
      
      if (!page) {
        throw new Error('Stagehand page not available');
      }

      return page;
    } catch (error) {
      logger.error('Failed to get Stagehand page', error);
      throw error;
    }
  }

  async act(instruction: string): Promise<void> {
    if (!this.stagehand) {
      throw new Error('Stagehand not initialized');
    }

    logger.info(`Acting: ${instruction}`);

    try {
      await this.stagehand.act({
        action: instruction,
      });
      
      logger.info(`Action completed: ${instruction}`);
    } catch (error) {
      logger.error(`Action failed: ${instruction}`, error);
      throw error;
    }
  }

  async extract(instruction: string, schema?: any): Promise<any> {
    if (!this.stagehand) {
      throw new Error('Stagehand not initialized');
    }

    logger.info(`Extracting: ${instruction}`);

    try {
      const result = await this.stagehand.extract({
        instruction,
        schema,
      });
      
      logger.info('Extraction completed');
      return result;
    } catch (error) {
      logger.error(`Extraction failed: ${instruction}`, error);
      throw error;
    }
  }

  async observe(instruction?: string): Promise<any> {
    if (!this.stagehand) {
      throw new Error('Stagehand not initialized');
    }

    logger.info(`Observing: ${instruction || 'all elements'}`);

    try {
      const result = instruction 
        ? await this.stagehand.observe({
            instruction,
          })
        : await this.stagehand.observe();
      
      logger.info('Observation completed');
      return result;
    } catch (error) {
      logger.error('Observation failed', error);
      throw error;
    }
  }

  async close(): Promise<void> {
    if (!this.stagehand) {
      logger.warn('Stagehand not initialized, nothing to close');
      return;
    }

    logger.info('Closing Stagehand...');

    try {
      await this.stagehand.close();
      this.stagehand = null;
      logger.info('Stagehand closed successfully');
    } catch (error) {
      logger.error('Failed to close Stagehand', error);
      throw error;
    }
  }

  getStagehand(): Stagehand {
    if (!this.stagehand) {
      throw new Error('Stagehand not initialized');
    }
    return this.stagehand;
  }
}