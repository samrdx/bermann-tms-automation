import { type NativeDriverAdapter } from './NativeBasePage.ts';
import { createMobileLogger, type MobileLogger } from './logger.ts';

const SELECTOR_DEBT_TEXT_FALLBACK = 'selector_debt:text_fallback';
type PermissionStrategy = 'resource-id' | 'text';

interface PermissionCandidate {
    selector: string;
    strategy: PermissionStrategy;
    debtTag?: string;
}

const NOTIFICATION_RESOURCE_ID_CANDIDATES: readonly PermissionCandidate[] = [
    'id=com.android.permissioncontroller:id/permission_allow_button',
    'id=com.android.permissioncontroller:id/permission_allow_foreground_only_button',
    'id=com.android.permissioncontroller:id/permission_allow_one_time_button',
    'id=com.google.android.permissioncontroller:id/permission_allow_button',
    'id=com.android.packageinstaller:id/permission_allow_button'
].map((selector) => ({ selector, strategy: 'resource-id' as const }));

const LOCATION_RESOURCE_ID_CANDIDATES: readonly PermissionCandidate[] = [
    'id=com.android.permissioncontroller:id/permission_allow_foreground_only_button',
    'id=com.google.android.permissioncontroller:id/permission_allow_foreground_only_button',
    'id=com.android.permissioncontroller:id/permission_allow_button',
    'id=com.google.android.permissioncontroller:id/permission_allow_button',
    'id=com.android.packageinstaller:id/permission_allow_button'
].map((selector) => ({ selector, strategy: 'resource-id' as const }));

const NOTIFICATION_TEXT_CANDIDATES: readonly PermissionCandidate[] = [
    'android=new UiSelector().text("Permitir")',
    'android=new UiSelector().text("ALLOW")',
    'android=new UiSelector().text("Allow")',
    'android=new UiSelector().text("Mientras se usa la app")',
    'android=new UiSelector().text("While using the app")',
    'android=new UiSelector().textContains("Permitir")',
    'android=new UiSelector().textContains("Allow")'
].map((selector) => ({
    selector,
    strategy: 'text' as const,
    debtTag: SELECTOR_DEBT_TEXT_FALLBACK
}));

const LOCATION_TEXT_CANDIDATES: readonly PermissionCandidate[] = [
    'android=new UiSelector().text("Mientras la app está en uso")',
    'android=new UiSelector().text("Mientras se usa la app")',
    'android=new UiSelector().text("While using the app")',
    'android=new UiSelector().textContains("Mientras la app está en uso")',
    'android=new UiSelector().textContains("Mientras se usa")',
    'android=new UiSelector().textContains("While using")',
    'android=new UiSelector().text("Permitir")',
    'android=new UiSelector().text("Allow")',
    'android=new UiSelector().textContains("Permitir")',
    'android=new UiSelector().textContains("Allow")'
].map((selector) => ({
    selector,
    strategy: 'text' as const,
    debtTag: SELECTOR_DEBT_TEXT_FALLBACK
}));

export interface AndroidNotificationPermissionOptions {
    retries?: number;
    retryDelayMs?: number;
}

export interface AndroidNotificationPermissionResult {
    handled: boolean;
    selector?: string;
    strategy: PermissionStrategy;
    debtTag?: string;
}

const DEFAULT_RETRIES = 3;
const DEFAULT_RETRY_DELAY_MS = 500;

const sleep = async (ms: number): Promise<void> => {
    await new Promise<void>((resolve) => {
        setTimeout(resolve, ms);
    });
};

const tryTapCandidates = async (
    driver: NativeDriverAdapter,
    candidates: readonly PermissionCandidate[]
): Promise<AndroidNotificationPermissionResult | null> => {
    for (const candidate of candidates) {
        try {
            const element = await driver.$(candidate.selector);

            if (!(await element.isExisting())) {
                continue;
            }

            if (!(await element.isDisplayed())) {
                continue;
            }

            await element.click();

            return {
                handled: true,
                selector: candidate.selector,
                strategy: candidate.strategy,
                debtTag: candidate.debtTag
            };
        } catch {
            continue;
        }
    }

    return null;
};

export const acceptAndroidNotificationPermissionIfPresent = async (
    driver: NativeDriverAdapter,
    logger: MobileLogger = createMobileLogger({ scope: 'AndroidNotificationPermission' }),
    options: AndroidNotificationPermissionOptions = {}
): Promise<AndroidNotificationPermissionResult> => {
    return acceptAndroidPermissionFromCandidatesIfPresent(
        driver,
        {
            resourceIdCandidates: NOTIFICATION_RESOURCE_ID_CANDIDATES,
            textCandidates: NOTIFICATION_TEXT_CANDIDATES
        },
        logger,
        options,
        'android.notification_permission'
    );
};

export const acceptAndroidLocationPermissionWhileInUseIfPresent = async (
    driver: NativeDriverAdapter,
    logger: MobileLogger = createMobileLogger({ scope: 'AndroidLocationPermission' }),
    options: AndroidNotificationPermissionOptions = {}
): Promise<AndroidNotificationPermissionResult> => {
    return acceptAndroidPermissionFromCandidatesIfPresent(
        driver,
        {
            resourceIdCandidates: LOCATION_RESOURCE_ID_CANDIDATES,
            textCandidates: LOCATION_TEXT_CANDIDATES
        },
        logger,
        options,
        'android.location_permission'
    );
};

const acceptAndroidPermissionFromCandidatesIfPresent = async (
    driver: NativeDriverAdapter,
    candidates: {
        resourceIdCandidates: readonly PermissionCandidate[];
        textCandidates: readonly PermissionCandidate[];
    },
    logger: MobileLogger,
    options: AndroidNotificationPermissionOptions,
    logPrefix: string
): Promise<AndroidNotificationPermissionResult> => {
    const retries = Math.max(1, options.retries ?? DEFAULT_RETRIES);
    const retryDelayMs = Math.max(0, options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS);

    for (let attempt = 1; attempt <= retries; attempt += 1) {
        const byResourceId = await tryTapCandidates(driver, candidates.resourceIdCandidates);
        if (byResourceId) {
            logger.info(`${logPrefix}.accepted`, {
                attempt,
                strategy: byResourceId.strategy,
                selector: byResourceId.selector,
                debtTag: byResourceId.debtTag
            });

            return byResourceId;
        }

        const byText = await tryTapCandidates(driver, candidates.textCandidates);
        if (byText) {
            logger.info(`${logPrefix}.accepted`, {
                attempt,
                strategy: byText.strategy,
                selector: byText.selector,
                debtTag: byText.debtTag
            });

            return byText;
        }

        if (attempt < retries) {
            await sleep(retryDelayMs);
        }
    }

    logger.debug(`${logPrefix}.not_present`);

    return {
        handled: false,
        strategy: 'resource-id'
    };
};
