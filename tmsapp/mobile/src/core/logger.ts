export interface MobileLogMeta {
    [key: string]: unknown;
}

export interface MobileLogger {
    info(message: string, meta?: MobileLogMeta): void;
    debug(message: string, meta?: MobileLogMeta): void;
    error(message: string, meta?: MobileLogMeta): void;
}

export interface MobileLoggerOptions {
    scope?: string;
    level?: MobileLogLevel;
    write?: (line: string, level: 'info' | 'debug' | 'error') => void;
}

export type MobileLogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';

const LOG_LEVEL_PRIORITY: Record<MobileLogLevel, number> = {
    debug: 10,
    info: 20,
    warn: 30,
    error: 40,
    silent: 50
};

const normalizeLogLevel = (value: string | undefined, fallback: MobileLogLevel): MobileLogLevel => {
    if (!value) {
        return fallback;
    }

    const normalized = value.toLowerCase();

    if (
        normalized === 'debug'
        || normalized === 'info'
        || normalized === 'warn'
        || normalized === 'error'
        || normalized === 'silent'
    ) {
        return normalized;
    }

    return fallback;
};

const defaultWriter = (line: string, level: 'info' | 'debug' | 'error'): void => {
    const stream = level === 'error' ? process.stderr : process.stdout;
    stream.write(`${line}\n`);
};

const formatLogLine = (
    level: 'info' | 'debug' | 'error',
    scope: string,
    message: string,
    meta?: MobileLogMeta
): string => JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    scope,
    message,
    ...(meta ? { meta } : {})
});

export const createMobileLogger = (options: MobileLoggerOptions = {}): MobileLogger => {
    const scope = options.scope ?? 'mobile';
    const write = options.write ?? defaultWriter;
    const configuredLevel = normalizeLogLevel(
        options.level ?? process.env.MOBILE_LOG_LEVEL ?? process.env.LOG_LEVEL,
        'info'
    );
    const shouldWrite = (level: 'info' | 'debug' | 'error'): boolean => {
        return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[configuredLevel];
    };

    return {
        info: (message, meta) => {
            if (!shouldWrite('info')) {
                return;
            }

            write(formatLogLine('info', scope, message, meta), 'info');
        },
        debug: (message, meta) => {
            if (!shouldWrite('debug')) {
                return;
            }

            write(formatLogLine('debug', scope, message, meta), 'debug');
        },
        error: (message, meta) => {
            if (!shouldWrite('error')) {
                return;
            }

            write(formatLogLine('error', scope, message, meta), 'error');
        }
    };
};
