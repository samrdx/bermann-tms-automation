import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export interface EnvironmentConfig {
  geminiApiKey: string;
  baseUrl: string;
  environment: 'dev' | 'staging' | 'prod';
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
    const env = (process.env.ENVIRONMENT || 'dev') as 'dev' | 'staging' | 'prod';
    
    return {
      geminiApiKey: process.env.GEMINI_API_KEY || '',
      baseUrl: this.getBaseUrl(env),
      environment: env,
      headless: process.env.HEADLESS === 'true',
      timeout: parseInt(process.env.TIMEOUT || '30000'),
      logLevel: (process.env.LOG_LEVEL || 'info') as any,
    };
  }

  private getBaseUrl(env: string): string {
    const urls: Record<string, string> = {
      dev: process.env.BASE_URL_DEV || '',
      staging: process.env.BASE_URL_STAGING || '',
      prod: process.env.BASE_URL_PROD || '',
    };
    return urls[env] || urls.dev;
  }

  private validateConfig(): void {
    if (!this.config.geminiApiKey) {
      throw new Error('GEMINI_API_KEY is required in .env file');
    }
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