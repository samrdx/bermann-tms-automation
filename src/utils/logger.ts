import winston from 'winston';
import path from 'path';
import { config } from '../config/environment.js';

const logDir = path.join(process.cwd(), 'logs');

// Formato personalizado
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.printf(({ timestamp, level, message, stack }) => {
    let log = `${timestamp} [${level.toUpperCase()}]: ${message}`;
    if (stack) {
      log += `\n${stack}`;
    }
    return log;
  })
);

// Interfaz para nuestro logger personalizado
export interface TMSLogger {
  info: (message: string, meta?: any) => void;
  error: (message: string, error?: Error | any) => void;
  warn: (message: string, meta?: any) => void;
  debug: (message: string, meta?: any) => void;
  fase: (n: number, message: string) => void;
  paso: (message: string) => void;
  subpaso: (message: string) => void;
  success: (message: string) => void;
}

// Variable para evitar log duplicado del ambiente
let envLogged = false;

function logEnvironment() {
  if (!envLogged) {
    const env = process.env.ENV || 'QA';
    const envEmoji = env.toUpperCase() === 'DEMO' ? '🎭' : '🧪';
    baseLogger.info(`ENTORNO: ${env.toUpperCase()} ${envEmoji}`);
    envLogged = true;
  }
}

// Logger base de Winston
const baseLogger = winston.createLogger({
  level: config.get().logLevel,
  format: customFormat,
  transports: [
    new winston.transports.File({
      filename: path.join(logDir, 'app.log'),
      maxsize: 5242880,
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: path.join(logDir, 'errors.log'),
      level: 'error',
      maxsize: 5242880,
      maxFiles: 5,
    }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        customFormat
      ),
    }),
  ],
});

// Helper para crear la estructura de TMSLogger
function wrapLogger(context?: string): TMSLogger {
  const prefix = context ? `[${context}] ` : '';
  
  return {
    info: (message: string, meta?: any) => {
      logEnvironment();
      baseLogger.info(`${prefix}${message}`, meta);
    },
    error: (message: string, error?: Error | any) => {
      logEnvironment();
      baseLogger.error(`${prefix}❌ ${message}`, error);
    },
    warn: (message: string, meta?: any) => {
      logEnvironment();
      baseLogger.warn(`${prefix}⚠️ ${message}`, meta);
    },
    debug: (message: string, meta?: any) => {
      logEnvironment();
      baseLogger.debug(`${prefix}🔍 ${message}`, meta);
    },
    fase: (n: number, message: string) => {
      logEnvironment();
      baseLogger.info('');
      baseLogger.info('='.repeat(80));
      baseLogger.info(`${prefix}[FASE ${n}] 🚀 ${message.toUpperCase()}`);
      baseLogger.info('='.repeat(80));
    },
    paso: (message: string) => {
      logEnvironment();
      baseLogger.info(`${prefix}[PASO] 🟦 ${message}`);
    },
    subpaso: (message: string) => {
      logEnvironment();
      baseLogger.info(`${prefix}[SUBPASO] 🔸 ${message}`);
    },
    success: (message: string) => {
      logEnvironment();
      baseLogger.info(`${prefix}[OK] ✅ ${message}`);
    },
  };
}

// Exportar logger por defecto y generador
export const logger = wrapLogger();
export function createLogger(context: string): TMSLogger {
  return wrapLogger(context);
}
