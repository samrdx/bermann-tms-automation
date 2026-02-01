import { Page } from 'playwright';
import { BasePage } from '../core/BasePage.js';
import { config } from '../config/environment.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('LoginPage');

export class LoginPage extends BasePage {
  private readonly selectors = {
    usernameInput: '#login-usuario',
    passwordInput: '#login-clave',
    loginButton: 'button[type="submit"].btn-success',
    errorMessage: '[data-notify="message"]',
    forgotPasswordLink: 'a[href="/clave/envioclave"]',
    invalidField: '[aria-invalid="true"]',
    logoMin: '.logo-min',
  };

  constructor(page: Page) {
    const loginUrl = `${config.get().baseUrl}/login`;
    super(page, loginUrl);
  }

  async fillUsername(username: string): Promise<void> {
    logger.info(`Filling username: ${username}`);
    await this.waitForElement(this.selectors.usernameInput);
    await this.fill(this.selectors.usernameInput, username);
  }

  async fillPassword(password: string): Promise<void> {
    logger.info('Filling password');
    await this.waitForElement(this.selectors.passwordInput);
    await this.fill(this.selectors.passwordInput, password);
  }

  async clickLoginButton(): Promise<void> {
    logger.info('Clicking login button');
    try {
      await this.click(this.selectors.loginButton);
      await this.page.waitForLoadState('networkidle');
    } catch (error) {
      logger.error('Failed to click login button', error);
      await this.takeScreenshot('click-login-error');
      throw error;
    }
  }

  async login(username: string, password: string): Promise<void> {
    logger.info(`Attempting login for user: ${username}`);
    try {
      await this.navigate();
      await this.fillUsername(username);
      await this.fillPassword(password);
      await this.clickLoginButton();
      await this.page.waitForTimeout(3000);
      logger.info('Login attempt completed');
    } catch (error) {
      logger.error('Login failed', error);
      await this.takeScreenshot('login-error');
      throw error;
    }
  }

  async hasErrorMessage(): Promise<boolean> {
    return await this.isVisible(this.selectors.errorMessage);
  }

  async getErrorMessage(): Promise<string> {
    if (await this.hasErrorMessage()) {
      return await this.getText(this.selectors.errorMessage);
    }
    return '';
  }

  async hasInvalidFields(): Promise<boolean> {
    return await this.isVisible(this.selectors.invalidField);
  }

  async isLoginSuccessful(): Promise<boolean> {
    try {
      await this.page.waitForTimeout(2000);
      const currentUrl = this.getCurrentUrl();
      const urlChanged = currentUrl.includes('/site');
      const logoVisible = await this.isVisible(this.selectors.logoMin);
      const isSuccess = urlChanged && logoVisible;
      logger.info(`Login successful: ${isSuccess}`);
      logger.info(`- URL: ${currentUrl}`);
      logger.info(`- Logo visible: ${logoVisible}`);
      return isSuccess;
    } catch (error) {
      logger.error('Error checking login success', error);
      return false;
    }
  }

  async clickForgotPassword(): Promise<void> {
    logger.info('Clicking forgot password link');
    await this.click(this.selectors.forgotPasswordLink);
  }

  async loginAndWaitForDashboard(username: string, password: string): Promise<void> {
    await this.login(username, password);
    await this.waitForNavigation(10000);
    const success = await this.isLoginSuccessful();
    if (!success) {
      const errorMsg = await this.getErrorMessage();
      await this.takeScreenshot('login-failed');
      throw new Error(`Login failed: ${errorMsg || 'Unable to reach dashboard'}`);
    }
    logger.info('✅ Successfully logged in and reached dashboard');
  }

  async isOnLoginPage(): Promise<boolean> {
    const currentUrl = this.getCurrentUrl();
    return currentUrl.includes('/login');
  }

  async clearFields(): Promise<void> {
    logger.info('Clearing login fields');
    await this.page.fill(this.selectors.usernameInput, '');
    await this.page.fill(this.selectors.passwordInput, '');
  }
}