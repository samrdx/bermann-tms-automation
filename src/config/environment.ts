import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export interface EnvironmentConfig {
  baseUrl: string;
  environment: 'QA' | 'DEMO';
  headless: boolean;
  timeout: number;
  logLevel: 'error' | 'warn' | 'info' | 'debug';
}

class ConfigManager {
  private config: EnvironmentConfig;

  constructor() {
    this.config = this.loadConfig();
    this.validateConfig();
  }

  private loadConfig(): EnvironmentConfig {
    const env = (process.env.ENV || 'QA').toUpperCase() as 'QA' | 'DEMO';

    return {
      baseUrl: this.getBaseUrl(env),
      environment: env,
      headless: process.env.HEADLESS === 'true',
      timeout: parseInt(process.env.TIMEOUT || '30000'),
      logLevel: (process.env.LOG_LEVEL || 'info') as any,
    };
  }

  private getBaseUrl(env: string): string {
    // 1. Prioridad CI/CD: Si existe BASE_URL explícita, úsala.
    if (process.env.BASE_URL) {
      return process.env.BASE_URL;
    }

    // 2. Ambientes Nativos de la Aplicación
    if (env === 'DEMO') {
      return 'https://demo.bermanntms.cl';
    }

    // Por defecto es QA
    return 'https://moveontruckqa.bermanntms.cl';
  }

  private validateConfig(): void {
    if (!this.config.baseUrl) {
      throw new Error('BASE_URL is not configured for environment: ' + this.config.environment);
    }
  }

  public get(): EnvironmentConfig {
    return { ...this.config };
  }

  public set(key: keyof EnvironmentConfig, value: any): void {
    (this.config as any)[key] = value;
  }
}

export const config = new ConfigManager();
