import { Page } from 'playwright';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('BasePage');

export abstract class BasePage {
  protected page: Page;
  protected url: string;

  constructor(page: Page, url: string = '') {
    this.page = page;
    this.url = url;
  }

  async navigate(): Promise<void> {
    if (!this.url) {
      throw new Error('URL not set for this page');
    }
    logger.info(`Navigating to: ${this.url}`);
    await this.page.goto(this.url, { 
      waitUntil: 'domcontentloaded',
      timeout: 30000 
    });
  }

  async waitForElement(selector: string, timeout: number = 10000): Promise<void> {
    logger.debug(`Waiting for element: ${selector}`);
    await this.page.waitForSelector(selector, { 
      state: 'visible', 
      timeout 
    });
  }

  async fill(selector: string, value: string): Promise<void> {
    logger.debug(`Filling ${selector} with value`);
    await this.page.fill(selector, value);
  }

  async click(selector: string): Promise<void> {
    logger.debug(`Clicking on: ${selector}`);
    await this.page.click(selector);
  }

  async getText(selector: string): Promise<string> {
    logger.debug(`Getting text from: ${selector}`);
    const element = await this.page.locator(selector);
    return await element.textContent() || '';
  }

  async isVisible(selector: string): Promise<boolean> {
    try {
      await this.page.waitForSelector(selector, { 
        state: 'visible', 
        timeout: 3000 
      });
      return true;
    } catch {
      return false;
    }
  }

  async takeScreenshot(name: string): Promise<string> {
    const timestamp = Date.now();
    const screenshotPath = `./reports/screenshots/${name}-${timestamp}.png`;
    await this.page.screenshot({ 
      path: screenshotPath, 
      fullPage: true 
    });
    logger.info(`Screenshot saved: ${screenshotPath}`);
    return screenshotPath;
  }

  async getTitle(): Promise<string> {
    return await this.page.title();
  }

  async waitForNavigation(timeout: number = 10000): Promise<void> {
    await this.page.waitForLoadState('domcontentloaded', { timeout });
  }

  getCurrentUrl(): string {
    return this.page.url();
  }
}