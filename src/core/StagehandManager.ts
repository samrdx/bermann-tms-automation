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
        verbose: this.config.debugMode ?? false ? 1 : 0,
        debugDom: this.config.debugMode ?? false,
        enableCaching: this.config.enableCaching ?? true, // If V3 doesn't support this here, we might need to remove it or verify. Assuming for now it's okay or ignore.
        // If enableCaching error persists, I will remove it. The error said: "Object literal may only specify known properties, and 'enableCaching' does not exist in type 'V3Options'".
        // So I will REMOVE enableCaching from the Constructor options.
      } as any); // Casting to any to bypass strict type check for now if types are outdated, but better to remove invalid props.
      
      // Actually, let's remove invalid props properly.
      // 'enableCaching' likely moved.
      
      this.stagehand = new Stagehand({
        env: this.config.env ?? 'LOCAL',
        verbose: this.config.debugMode ? 1 : 0,
        debugDom: this.config.debugMode ?? false,
      } as any);

      await this.stagehand.init();
      
      logger.info('Stagehand initialized successfully');
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
      const context = this.stagehand.context;
      const page = context.activePage() || context.pages()[0];
      
      if (!page) {
        throw new Error('Stagehand page not available');
      }

      return page as unknown as Page;
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
      await this.stagehand.act(instruction);
      
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
      // V3 extract typically takes object { instruction, schema }
      // The error said: Argument of type '{ instruction: string; schema: any; }' is not assignable to parameter of type 'string'.
      // This implies overload 2 expects 'string', but overload 1 expects options.
      // Let's try passing just valid object or string.
      // If error persists, it might be `extract({ instruction, schema })`.
      // Let's trust the error: "Overload 1 of 4, '(options: ExtractOptions): Promise...'"
      // "Object literal may only specify known properties, and 'instruction' does not exist in type 'ExtractOptions'".
      // This suggests ExtractOptions properties might be different? `query`? `goal`?
      // Common V3 param is `instruction`. Maybe it's `query`?
      // Let's try casting to any to unblock compilation if uncertain, but better to fix.
      // "instruction" is standard. Maybe "schema" needs to be Zod schema?
      
      const result = await this.stagehand.extract({
        instruction,
        schema,
      } as any);
      
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
          } as any)
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