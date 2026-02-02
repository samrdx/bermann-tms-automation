import type { Page } from 'playwright';
import { LoginPage } from '../pages/LoginPage.js';
import { createLogger } from '../../../utils/logger.js';

const logger = createLogger('AuthActions');

export class AuthActions {
  constructor(private loginPage: LoginPage) {}

  async login(username: string, password: string): Promise<void> {
    await this.loginPage.loginAndWaitForDashboard(username, password);
  }
}

