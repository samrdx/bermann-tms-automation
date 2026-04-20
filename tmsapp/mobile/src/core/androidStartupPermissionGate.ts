import { type NativeDriverAdapter } from './NativeBasePage.ts';
import {
    acceptAndroidLocationPermissionWhileInUseIfPresent,
    acceptAndroidNotificationPermissionIfPresent
} from './androidNotificationPermission.ts';
import { createMobileLogger, type MobileLogger } from './logger.ts';

const DEFAULT_STARTUP_TIMEOUT_MS = 20_000;
const DEFAULT_POLL_INTERVAL_MS = 750;
const DEFAULT_REQUIRED_STABLE_SAMPLES = 2;
const DEFAULT_TARGET_APP_PACKAGE = 'cl.bermann.tms24';
const DEFAULT_ALLOWED_APP_ACTIVITY_MARKERS = ['.MainActivity', 'MainActivity'];
const DEFAULT_CONTEXT_RECOVERY_ATTEMPTS = 2;
const DEFAULT_CONTEXT_RECOVERY_SETTLE_MS = 800;
const MAX_ACTIVITY_TRACE = 8;

const PERMISSION_ACTIVITY_MARKERS = [
    'grantpermissionsactivity',
    'permissioncontroller',
    'packageinstaller'
] as const;

export interface AndroidStartupPermissionGateOptions {
    timeoutMs?: number;
    pollIntervalMs?: number;
    requiredStableSamples?: number;
    permissionRetries?: number;
    permissionRetryDelayMs?: number;
    targetAppPackage?: string;
    allowedAppActivityMarkers?: string[];
    contextRecoveryAttempts?: number;
    contextRecoverySettleMs?: number;
}

export interface AndroidStartupPermissionGateResult {
    stabilized: true;
    elapsedMs: number;
    polls: number;
    permissionBursts: number;
    acceptedLocationPrompts: number;
    acceptedNotificationPrompts: number;
    finalPackage: string;
    finalActivity: string;
}

export class AndroidStartupPermissionGateError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'AndroidStartupPermissionGateError';
    }
}

const sleep = async (ms: number): Promise<void> => {
    await new Promise<void>((resolve) => {
        setTimeout(resolve, ms);
    });
};

const isPermissionControllerActivity = (activity: string): boolean => {
    const normalized = activity.toLowerCase();
    return PERMISSION_ACTIVITY_MARKERS.some((marker) => normalized.includes(marker));
};

const toMessage = (error: unknown): string => {
    if (error instanceof Error) {
        return error.message;
    }

    return 'unknown-error';
};

const normalize = (value: string): string => value.toLowerCase();

const isTargetForegroundContext = (
    currentPackage: string,
    activity: string,
    targetAppPackage: string,
    allowedAppActivityMarkers: string[]
): boolean => {
    const normalizedPackage = normalize(currentPackage);
    const normalizedActivity = normalize(activity);
    const normalizedTargetPackage = normalize(targetAppPackage);
    const packageMatches = normalizedPackage === normalizedTargetPackage;
    const activityMatchesTargetPackage = normalizedActivity.includes(normalizedTargetPackage);
    const activityMatchesAllowedMarker = allowedAppActivityMarkers.some((marker) => {
        return normalizedActivity.includes(normalize(marker));
    });

    if (normalizedPackage === 'unknown') {
        return activityMatchesTargetPackage || activityMatchesAllowedMarker;
    }

    return packageMatches && (activityMatchesTargetPackage || activityMatchesAllowedMarker);
};

export const stabilizeAndroidStartupPermissions = async (
    driver: NativeDriverAdapter,
    logger: MobileLogger = createMobileLogger({ scope: 'AndroidStartupPermissionGate' }),
    options: AndroidStartupPermissionGateOptions = {}
): Promise<AndroidStartupPermissionGateResult> => {
    if (!driver.getCurrentActivity) {
        throw new AndroidStartupPermissionGateError('startup gate requires getCurrentActivity support from driver adapter');
    }

    const timeoutMs = Math.max(1_000, options.timeoutMs ?? DEFAULT_STARTUP_TIMEOUT_MS);
    const pollIntervalMs = Math.max(50, options.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS);
    const requiredStableSamples = Math.max(1, options.requiredStableSamples ?? DEFAULT_REQUIRED_STABLE_SAMPLES);
    const permissionRetries = Math.max(1, options.permissionRetries ?? 2);
    const permissionRetryDelayMs = Math.max(0, options.permissionRetryDelayMs ?? 250);
    const targetAppPackage = options.targetAppPackage ?? DEFAULT_TARGET_APP_PACKAGE;
    const allowedAppActivityMarkers = (
        options.allowedAppActivityMarkers ?? DEFAULT_ALLOWED_APP_ACTIVITY_MARKERS
    ).filter((marker) => marker.trim().length > 0);
    const contextRecoveryAttempts = Math.max(0, options.contextRecoveryAttempts ?? DEFAULT_CONTEXT_RECOVERY_ATTEMPTS);
    const contextRecoverySettleMs = Math.max(0, options.contextRecoverySettleMs ?? DEFAULT_CONTEXT_RECOVERY_SETTLE_MS);
    const startedAt = Date.now();

    let polls = 0;
    let stableSamples = 0;
    let permissionBursts = 0;
    let acceptedLocationPrompts = 0;
    let acceptedNotificationPrompts = 0;
    let contextRecoveryCount = 0;
    let finalPackage = 'unknown';
    let finalActivity = 'unknown';
    const observedContexts: string[] = [];

    const recordContext = (pkg: string, activity: string): void => {
        observedContexts.push(`${pkg}:${activity}`);
        if (observedContexts.length > MAX_ACTIVITY_TRACE) {
            observedContexts.shift();
        }
    };

    while (Date.now() - startedAt < timeoutMs) {
        polls += 1;

        let activity = 'unknown';
        try {
            activity = (await driver.getCurrentActivity()) || 'unknown';
        } catch (error: unknown) {
            logger.debug('android.startup_permission_gate.activity_read_failed', {
                polls,
                error: toMessage(error)
            });
        }

        let currentPackage = 'unknown';
        if (driver.getCurrentPackage) {
            try {
                currentPackage = (await driver.getCurrentPackage()) || 'unknown';
            } catch (error: unknown) {
                logger.debug('android.startup_permission_gate.package_read_failed', {
                    polls,
                    activity,
                    error: toMessage(error)
                });
            }
        }

        finalActivity = activity;
        finalPackage = currentPackage;
        recordContext(currentPackage, activity);

        const inPermissionActivity = isPermissionControllerActivity(activity);

        if (inPermissionActivity) {
            stableSamples = 0;
            permissionBursts += 1;

            logger.info('android.startup_permission_gate.permission_activity_detected', {
                polls,
                activity,
                permissionBursts
            });

            const locationResult = await acceptAndroidLocationPermissionWhileInUseIfPresent(driver, logger, {
                retries: permissionRetries,
                retryDelayMs: permissionRetryDelayMs
            });
            if (locationResult.handled) {
                acceptedLocationPrompts += 1;
            }

            if (!locationResult.handled) {
                const notificationResult = await acceptAndroidNotificationPermissionIfPresent(driver, logger, {
                    retries: permissionRetries,
                    retryDelayMs: permissionRetryDelayMs
                });
                if (notificationResult.handled) {
                    acceptedNotificationPrompts += 1;
                }
            }
        } else {
            const inTargetForegroundContext = isTargetForegroundContext(
                currentPackage,
                activity,
                targetAppPackage,
                allowedAppActivityMarkers
            );

            if (!inTargetForegroundContext) {
                stableSamples = 0;
                logger.info('android.startup_permission_gate.non_app_foreground_detected', {
                    polls,
                    currentPackage,
                    activity,
                    targetAppPackage,
                    contextRecoveryCount
                });

                if (driver.activateApp && contextRecoveryCount < contextRecoveryAttempts) {
                    contextRecoveryCount += 1;
                    logger.info('android.startup_permission_gate.recovery_activate_app', {
                        polls,
                        targetAppPackage,
                        contextRecoveryCount,
                        contextRecoveryAttempts
                    });

                    try {
                        await driver.activateApp(targetAppPackage);
                    } catch (error: unknown) {
                        logger.debug('android.startup_permission_gate.recovery_activate_app_failed', {
                            polls,
                            targetAppPackage,
                            contextRecoveryCount,
                            error: toMessage(error)
                        });
                    }

                    await sleep(contextRecoverySettleMs);
                }
            } else {
                stableSamples += 1;
            }

            if (stableSamples >= requiredStableSamples) {
                const elapsedMs = Date.now() - startedAt;
                logger.info('android.startup_permission_gate.stable', {
                    elapsedMs,
                    polls,
                    permissionBursts,
                    acceptedLocationPrompts,
                    acceptedNotificationPrompts,
                    finalPackage: currentPackage,
                    finalActivity: activity
                });

                return {
                    stabilized: true,
                    elapsedMs,
                    polls,
                    permissionBursts,
                    acceptedLocationPrompts,
                    acceptedNotificationPrompts,
                    finalPackage: currentPackage,
                    finalActivity: activity
                };
            }
        }

        await sleep(pollIntervalMs);
    }

    const elapsedMs = Date.now() - startedAt;
    const diagnostics = {
        timeoutMs,
        elapsedMs,
        polls,
        permissionBursts,
        acceptedLocationPrompts,
        acceptedNotificationPrompts,
        contextRecoveryCount,
        targetAppPackage,
        allowedAppActivityMarkers,
        finalPackage,
        finalActivity,
        recentContexts: observedContexts
    };

    logger.error('android.startup_permission_gate.timeout', diagnostics);
    throw new AndroidStartupPermissionGateError(
        `Android startup did not stabilize within ${timeoutMs}ms. targetAppPackage=${targetAppPackage} finalPackage=${finalPackage} finalActivity=${finalActivity} polls=${polls} permissionBursts=${permissionBursts} contextRecoveryCount=${contextRecoveryCount}`
    );
};
