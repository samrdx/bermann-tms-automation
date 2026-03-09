import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('BrowserManager');

export interface BrowserOptions {
  headless?: boolean;
  timeout?: number;
}

export class BrowserManager {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private options: BrowserOptions;

  constructor(options: BrowserOptions = {}) {
    this.options = {
      // Prioritize explicit option, then env var, then default to false
      headless: options.headless ?? (process.env.HEADLESS === 'true'),
      timeout: options.timeout ?? 30000,
    };
  }

  async initialize(): Promise<void> {
    logger.info('Inicializando navegador...');
    
    this.browser = await chromium.launch({
      headless: this.options.headless,
      args: [
        '--start-maximized',
        '--disable-blink-features=AutomationControlled',
      ],
    });

    this.context = await this.browser.newContext({
      viewport: null,
      ignoreHTTPSErrors: true,
    });

    this.page = await this.context.newPage();
    
    const timeout = this.options.timeout ?? 30000;
    this.page.setDefaultTimeout(timeout);
    
    logger.info('Navegador inicializado exitosamente');
  }

  getPage(): Page {
    if (!this.page) {
      throw new Error('Browser not initialized. Call initialize() first.');
    }
    return this.page;
  }

  getBrowser(): Browser {
    if (!this.browser) {
      throw new Error('Browser not initialized. Call initialize() first.');
    }
    return this.browser;
  }

  getContext(): BrowserContext {
    if (!this.context) {
      throw new Error('Browser context not initialized. Call initialize() first.');
    }
    return this.context;
  }

  async close(): Promise<void> {
    logger.info('Cerrando navegador...');
    
    if (this.page) {
      await this.page.close();
      this.page = null;
    }

    if (this.context) {
      await this.context.close();
      this.context = null;
    }

    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }

    logger.info('Navegador cerrado exitosamente');
  }

  async takeScreenshot(name: string): Promise<void> {
    if (!this.page) {
      logger.warn('No se puede tomar captura de pantalla: página no inicializada');
      return;
    }

    const timestamp = Date.now();
    const filename = `./reports/screenshots/${name}-${timestamp}.png`;
    
    await this.page.screenshot({
      path: filename,
      fullPage: true,
    });

    logger.info(`Captura de pantalla guardada: ${filename}`);
  }
}