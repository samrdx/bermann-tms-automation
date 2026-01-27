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

// Crear logger
export const logger = winston.createLogger({
  level: config.get().logLevel,
  format: customFormat,
  transports: [
    // Log a archivo - todos los niveles
    new winston.transports.File({
      filename: path.join(logDir, 'app.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Log a archivo - solo errores
    new winston.transports.File({
      filename: path.join(logDir, 'errors.log'),
      level: 'error',
      maxsize: 5242880,
      maxFiles: 5,
    }),
    // Log a consola
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        customFormat
      ),
    }),
  ],
});

// Helper para crear loggers contextuales
export function createLogger(context: string) {
  return {
    info: (message: string, meta?: any) => 
      logger.info(`[${context}] ${message}`, meta),
    error: (message: string, error?: Error | any) => 
      logger.error(`[${context}] ${message}`, error),
    warn: (message: string, meta?: any) => 
      logger.warn(`[${context}] ${message}`, meta),
    debug: (message: string, meta?: any) => 
      logger.debug(`[${context}] ${message}`, meta),
  };
}