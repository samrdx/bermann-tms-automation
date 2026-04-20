import * as path from 'node:path';

const DEFAULT_DEVICE_NAME = 'Pixel_AOSP';
const DEFAULT_PLATFORM_NAME = 'Android';
const DEFAULT_AUTOMATION_NAME = 'UiAutomator2';
const DEFAULT_NEW_COMMAND_TIMEOUT = 240;
const DEFAULT_APP_WAIT_ACTIVITY = '*.MainActivity';
const DEFAULT_APP_WAIT_DURATION = 120000;
const DEFAULT_ADB_EXEC_TIMEOUT = 120000;

export interface MobileAuthConfig {
    credentials: {
        username: string;
        password: string;
        company?: string;
    };
    capabilities: {
        platformName: string;
        automationName: string;
        deviceName: string;
        udid?: string;
        appPath: string;
        platformVersion?: string;
        appWaitActivity: string;
        appWaitDuration: number;
        adbExecTimeout: number;
        newCommandTimeout: number;
        noReset: boolean;
    };
    useLegacyCapabilities: boolean;
}

export class MobileAuthConfigError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'MobileAuthConfigError';
    }
}

const parseBoolean = (value: string | undefined, fallback: boolean): boolean => {
    if (value === undefined || value === '') {
        return fallback;
    }

    return value.toLowerCase() === 'true';
};

const parseNumber = (value: string | undefined, fallback: number, variableName: string): number => {
    if (value === undefined || value === '') {
        return fallback;
    }

    const parsed = Number(value);

    if (Number.isNaN(parsed) || parsed <= 0) {
        throw new MobileAuthConfigError(
            `Invalid ${variableName}. Expected a positive number.`
        );
    }

    return parsed;
};

const parseOptionalString = (value: string | undefined): string | undefined => {
    if (value === undefined) {
        return undefined;
    }

    const normalized = value.trim();
    return normalized === '' ? undefined : normalized;
};

export const createMobileAuthConfig = (
    env: NodeJS.ProcessEnv = process.env
): MobileAuthConfig => {
    const missingVariables = ['TMS_USERNAME', 'TMS_PASSWORD'].filter((key) => {
        const value = env[key];
        return value === undefined || value.trim() === '';
    });

    if (missingVariables.length > 0) {
        throw new MobileAuthConfigError(
            `Missing required environment variables: ${missingVariables.join(', ')}`
        );
    }

    const appPath = env.MOBILE_APP_PATH && env.MOBILE_APP_PATH.trim() !== ''
        ? env.MOBILE_APP_PATH
        : path.resolve(process.cwd(), 'app.apk');

    return {
        credentials: {
            username: env.TMS_USERNAME as string,
            password: env.TMS_PASSWORD as string,
            company: env.TMS_COMPANY
        },
        capabilities: {
            platformName: env.MOBILE_PLATFORM_NAME || DEFAULT_PLATFORM_NAME,
            automationName: env.MOBILE_AUTOMATION_NAME || DEFAULT_AUTOMATION_NAME,
            deviceName: env.MOBILE_DEVICE_NAME || DEFAULT_DEVICE_NAME,
            udid: parseOptionalString(env.MOBILE_UDID),
            appPath,
            platformVersion: env.MOBILE_PLATFORM_VERSION,
            appWaitActivity: parseOptionalString(env.MOBILE_APP_WAIT_ACTIVITY) || DEFAULT_APP_WAIT_ACTIVITY,
            appWaitDuration: parseNumber(
                env.MOBILE_APP_WAIT_DURATION,
                DEFAULT_APP_WAIT_DURATION,
                'MOBILE_APP_WAIT_DURATION'
            ),
            adbExecTimeout: parseNumber(
                env.MOBILE_ADB_EXEC_TIMEOUT,
                DEFAULT_ADB_EXEC_TIMEOUT,
                'MOBILE_ADB_EXEC_TIMEOUT'
            ),
            newCommandTimeout: parseNumber(
                env.MOBILE_NEW_COMMAND_TIMEOUT,
                DEFAULT_NEW_COMMAND_TIMEOUT,
                'MOBILE_NEW_COMMAND_TIMEOUT'
            ),
            noReset: parseBoolean(env.MOBILE_NO_RESET, false)
        },
        useLegacyCapabilities: parseBoolean(env.MOBILE_LEGACY_CAPS, false)
    };
};

let cachedConfig: MobileAuthConfig | undefined;

export const getMobileAuthConfig = (): MobileAuthConfig => {
    if (!cachedConfig) {
        cachedConfig = createMobileAuthConfig();
    }

    return cachedConfig;
};
