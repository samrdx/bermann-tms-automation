import { Page } from '@playwright/test';
import { BasePage } from '../../../core/BasePage.js';
import { config } from '../../../config/environment.js';
import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('LoginPage');

export class LoginPage extends BasePage {
  private readonly selectors = {
    usernameInput: '#login-usuario',
    passwordInput: '#login-clave',
    loginButton: 'button[type="submit"].btn-success',
    errorMessage: '[data-notify="message"]',
    logoMin: '.logo-min',
  };

  constructor(page: Page) {
    super(page, `${config.get().baseUrl}/login`);
  }

  /* ===================== ACTIONS ===================== */

  async fillUsername(username: string): Promise<void> {
    await this.fill(this.selectors.usernameInput, username);
  }

  async fillPassword(password: string): Promise<void> {
    await this.fill(this.selectors.passwordInput, password);
  }

  async clickLoginButton(): Promise<void> {
    await this.click(this.selectors.loginButton);
  }

  async login(username: string, password: string): Promise<void> {
    logger.info(`Login with user ${username}`);
    await this.navigate();
    await this.fillUsername(username);
    await this.fillPassword(password);
    await this.clickLoginButton();
  }

  async loginAndWaitForDashboard(
    username: string,
    password: string
  ): Promise<void> {
    logger.info(`Attempting login for user: ${username} and waiting for dashboard...`);
    await this.login(username, password);
    
    // Wait for either the URL to change to /site OR the error message to appear
    try {
      await Promise.race([
        this.page.waitForURL((url) => url.toString().includes('/site'), { timeout: 20000 }),
        this.page.waitForSelector(this.selectors.errorMessage, { state: 'visible', timeout: 10000 })
      ]);
    } catch (error) {
      logger.warn('Login wait timed out (neither dashboard nor error appeared quickly)', error);
    }

    // Check specific failure first
    if (await this.hasErrorMessage()) {
      const errorMsg = await this.getErrorMessage();
      logger.error(`Login failed with error: ${errorMsg}`);
      await this.takeScreenshot('login-failed-error');
      throw new Error(`Login failed: ${errorMsg}`);
    }

    // Check success
    if (await this.isLoginSuccessful()) {
      logger.info('Login confirmed: User is on dashboard');
      return;
    }

    // Verification failed (stuck on login page without error, or somewhere else)
    const currentUrl = this.page.url();
    logger.error(`Login failed. Current URL: ${currentUrl}`);
    await this.takeScreenshot('login-failed-unknown');
    throw new Error(`Login failed: Stuck on URL ${currentUrl} without specific error message`);
  }

  /* ===================== ASSERTIONS ===================== */

  async isLoginSuccessful(): Promise<boolean> {
    try {
      // Explicit wait with CI-friendly timeout
      await this.page.waitForSelector(this.selectors.logoMin, {
        state: 'visible',
        timeout: 10000  // Increased from 3s to 10s for CI environments
      });
      return this.page.url().includes('/site');
    } catch (error) {
      logger.warn('Logo not visible after 10s, login may have failed');
      return false;
    }
  }

  async isOnLoginPage(): Promise<boolean> {
    const url = this.getCurrentUrl();
    return url.includes('/login');
  }

  async hasErrorMessage(): Promise<boolean> {
    return this.isVisible(this.selectors.errorMessage);
  }

  async getErrorMessage(): Promise<string | null> {
    if (await this.isVisible(this.selectors.errorMessage)) {
      return this.getText(this.selectors.errorMessage);
    }
    return null;
  }

  /**
   * Métodos requeridos por AuthActions y tests
   * (Restaurados para compatibilidad)
   */
}
