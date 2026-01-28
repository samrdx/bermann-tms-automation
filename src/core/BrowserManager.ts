import { Browser, BrowserContext, Page, chromium, firefox, webkit } from 'playwright';
import { createLogger } from '../utils/logger.js';
import { config } from '../config/environment.js';

const logger = createLogger('BrowserManager');

export type BrowserType = 'chromium' | 'firefox' | 'webkit';

export interface BrowserOptions {
  browserType?: BrowserType;
  headless?: boolean;
  viewport?: { width: number; height: number };
  timeout?: number;
}

export class BrowserManager {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private options: BrowserOptions;

  constructor(options: BrowserOptions = {}) {
    this.options = {
      browserType: options.browserType || 'chromium',
      headless: options.headless ?? config.get().headless,
      viewport: options.viewport || { width: 1280, height: 720 },
      timeout: options.timeout || config.get().timeout,
    };
  }

  async initialize(): Promise<void> {
    try {
      logger.info('Initializing browser...', this.options);

      // Seleccionar browser
      const browserLauncher = {
        chromium,
        firefox,
        webkit,
      }[this.options.browserType!];

      // Lanzar browser
      this.browser = await browserLauncher.launch({
        headless: this.options.headless,
        args: ['--start-maximized'],
      });

      // Crear contexto
      this.context = await this.browser.newContext({
        viewport: this.options.viewport,
        recordVideo: config.get().environment !== 'prod' ? {
          dir: './reports/videos',
          size: this.options.viewport,
        } : undefined,
      });

      // Configurar timeout por defecto
      this.context.setDefaultTimeout(this.options.timeout!);

      // Crear página
      this.page = await this.context.newPage();

      logger.info('Browser initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize browser', error);
      throw error;
    }
  }

  async navigate(url: string): Promise<void> {
    if (!this.page) {
      throw new Error('Browser not initialized. Call initialize() first.');
    }

    try {
      logger.info(`Navigating to: ${url}`);
      await this.page.goto(url, { waitUntil: 'domcontentloaded' });
      logger.info('Navigation successful');
    } catch (error) {
      logger.error(`Failed to navigate to ${url}`, error);
      throw error;
    }
  }

  getPage(): Page {
    if (!this.page) {
      throw new Error('Browser not initialized. Call initialize() first.');
    }
    return this.page;
  }

  getContext(): BrowserContext {
    if (!this.context) {
      throw new Error('Browser context not initialized.');
    }
    return this.context;
  }

  async takeScreenshot(name: string): Promise<string> {
    if (!this.page) {
      throw new Error('Page not available');
    }

    const screenshotPath = `./reports/screenshots/${name}-${Date.now()}.png`;
    await this.page.screenshot({ path: screenshotPath, fullPage: true });
    logger.info(`Screenshot saved: ${screenshotPath}`);
    return screenshotPath;
  }

  async close(): Promise<void> {
    try {
      logger.info('Closing browser...');
      
      if (this.page) {
        await this.page.close();
      }
      if (this.context) {
        await this.context.close();
      }
      if (this.browser) {
        await this.browser.close();
      }

      this.page = null;
      this.context = null;
      this.browser = null;

      logger.info('Browser closed successfully');
    } catch (error) {
      logger.error('Error closing browser', error);
      throw error;
    }
  }
}