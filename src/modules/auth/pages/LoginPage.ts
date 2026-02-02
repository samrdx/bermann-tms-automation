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
    await this.login(username, password);
    await this.page.waitForLoadState('networkidle');

    if (!(await this.isLoginSuccessful())) {
      const error = await this.getErrorMessage();
      throw new Error(`Login failed: ${error}`);
    }
  }

  /* ===================== ASSERTIONS ===================== */

  async isLoginSuccessful(): Promise<boolean> {
    return (
      this.page.url().includes('/site') &&
      (await this.isVisible(this.selectors.logoMin))
    );
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
