import {
    resolveLoginSelector,
    SelectorRegistryError,
    type SelectorTelemetryEmitter,
    type SelectorTelemetryEvent
} from '../modules/auth/selectors/selectorRegistry.ts';
import { type LoginSelectorKey } from '../modules/auth/selectors/login.selectors.ts';
import { createMobileLogger, type MobileLogger } from './logger.ts';

const DEFAULT_WAIT_TIMEOUT_MS = 10_000;
const DEFAULT_WAIT_INTERVAL_MS = 500;
const DEFAULT_TRANSITION_TIMEOUT_MS = 15_000;
const DEFAULT_TRANSITION_INTERVAL_MS = 500;
const DEFAULT_LOOKUP_RETRIES = 2;
const LOOKUP_BACKOFF_MS = 200;

export interface NativeElement {
    isExisting(): Promise<boolean>;
    isDisplayed(): Promise<boolean>;
    waitForDisplayed(options: { timeout: number; interval: number }): Promise<boolean>;
    click(): Promise<void>;
    setValue(value: string): Promise<void>;
    getText?(): Promise<string>;
}

export interface NativeDriverAdapter {
    $(selector: string): Promise<NativeElement>;
    getCurrentActivity?(): Promise<string>;
    getCurrentPackage?(): Promise<string>;
    activateApp?(appId: string): Promise<void>;
}

export interface WaitOptions {
    timeoutMs?: number;
    intervalMs?: number;
}

export interface NativeBasePageOptions {
    driver: NativeDriverAdapter;
    logger?: MobileLogger;
    emitSelectorEvent?: SelectorTelemetryEmitter;
    waitForDisplayedMs?: number;
    waitForDisplayedIntervalMs?: number;
    interactionRetries?: number;
}

export class NativePageInteractionError extends Error {
    readonly step: string;

    constructor(step: string, message: string) {
        super(message);
        this.name = 'NativePageInteractionError';
        this.step = step;
    }
}

export abstract class NativeBasePage {
    private readonly driver: NativeDriverAdapter;
    private readonly logger: MobileLogger;
    private readonly emitSelectorEvent?: SelectorTelemetryEmitter;
    private readonly waitForDisplayedMs: number;
    private readonly waitForDisplayedIntervalMs: number;
    private readonly interactionRetries: number;

    protected constructor(options: NativeBasePageOptions) {
        this.driver = options.driver;
        this.logger = options.logger ?? createMobileLogger({ scope: this.constructor.name });
        this.emitSelectorEvent = options.emitSelectorEvent;
        this.waitForDisplayedMs = options.waitForDisplayedMs ?? DEFAULT_WAIT_TIMEOUT_MS;
        this.waitForDisplayedIntervalMs = options.waitForDisplayedIntervalMs ?? DEFAULT_WAIT_INTERVAL_MS;
        this.interactionRetries = options.interactionRetries ?? 2;
    }

    protected getDriver(): NativeDriverAdapter {
        return this.driver;
    }

    protected getLogger(): MobileLogger {
        return this.logger;
    }

    protected async tapSelector(key: LoginSelectorKey, step: string): Promise<void> {
        const element = await this.resolveElement(key, step);

        await this.withInteractionRetry(step, async () => {
            await element.click();
        });
    }

    protected async setValueSelector(key: LoginSelectorKey, value: string, step: string): Promise<void> {
        const element = await this.resolveElement(key, step);

        await this.withInteractionRetry(step, async () => {
            await element.setValue(value);
        });
    }

    protected async waitForSelectorVisible(key: LoginSelectorKey, step: string, options: WaitOptions = {}): Promise<void> {
        await this.resolveElement(key, step, options);
    }

    protected async isSelectorVisible(key: LoginSelectorKey, step: string, options: WaitOptions = {}): Promise<boolean> {
        try {
            await this.resolveElement(key, step, options);
            return true;
        } catch {
            return false;
        }
    }

    protected async waitForCondition(predicate: () => Promise<boolean>, options: WaitOptions = {}): Promise<boolean> {
        const timeoutMs = options.timeoutMs ?? DEFAULT_TRANSITION_TIMEOUT_MS;
        const intervalMs = options.intervalMs ?? DEFAULT_TRANSITION_INTERVAL_MS;
        const start = Date.now();

        while (Date.now() - start < timeoutMs) {
            if (await predicate()) {
                return true;
            }

            await this.sleep(intervalMs);
        }

        return false;
    }

    protected async waitForCurrentActivityContains(activityFragment: string, options: WaitOptions = {}): Promise<boolean> {
        if (!this.driver.getCurrentActivity) {
            return false;
        }

        return this.waitForCondition(
            async () => {
                const activity = await this.driver.getCurrentActivity?.();
                return typeof activity === 'string' && activity.includes(activityFragment);
            },
            options
        );
    }

    private async resolveElement(key: LoginSelectorKey, step: string, options: WaitOptions = {}): Promise<NativeElement> {
        for (let attempt = 1; attempt <= DEFAULT_LOOKUP_RETRIES + 1; attempt += 1) {
            try {
                const resolution = await resolveLoginSelector(key, {
                    probe: async (candidate) => {
                        try {
                            const candidateElement = await this.driver.$(candidate.selector);
                            return candidateElement.isExisting();
                        } catch {
                            return false;
                        }
                    },
                    emit: this.selectorEmitter(step)
                });

                const element = await this.driver.$(resolution.selector);
                await element.waitForDisplayed({
                    timeout: options.timeoutMs ?? this.waitForDisplayedMs,
                    interval: options.intervalMs ?? this.waitForDisplayedIntervalMs
                });

                return element;
            } catch (error: unknown) {
                if (error instanceof SelectorRegistryError) {
                    throw new NativePageInteractionError(step, `selector-resolution-failed key=${error.key}`);
                }

                if (attempt <= DEFAULT_LOOKUP_RETRIES && this.isRetryableLookupError(error)) {
                    this.logger.info('retrying_selector_lookup', { step, key, attempt });
                    await this.sleep(LOOKUP_BACKOFF_MS * attempt);
                    continue;
                }

                if (error instanceof Error) {
                    throw new NativePageInteractionError(step, `element-resolution-failed ${error.message}`);
                }

                throw new NativePageInteractionError(step, 'element-resolution-failed unknown-error');
            }
        }

        throw new NativePageInteractionError(step, 'element-resolution-failed exhausted-lookup-retries');
    }

    private selectorEmitter(step: string): SelectorTelemetryEmitter {
        return (event: SelectorTelemetryEvent) => {
            this.emitSelectorEvent?.(event);

            const level = event.event === 'selector.primary' ? 'debug' : 'info';
            this.logger[level]('selector_resolution', {
                step,
                event: event.event,
                key: event.key,
                tier: event.tier,
                strategy: event.strategy,
                debtTag: event.debtTag
            });
        };
    }

    private async withInteractionRetry(step: string, action: () => Promise<void>): Promise<void> {
        for (let attempt = 1; attempt <= this.interactionRetries + 1; attempt += 1) {
            try {
                await action();
                return;
            } catch (error: unknown) {
                if (!this.isRetryableInteractionError(error) || attempt > this.interactionRetries) {
                    if (error instanceof Error) {
                        throw new NativePageInteractionError(step, `interaction-failed ${error.message}`);
                    }

                    throw new NativePageInteractionError(step, 'interaction-failed unknown-error');
                }

                this.logger.info('retrying_interaction', { step, attempt });
                await this.sleep(200);
            }
        }
    }

    private isRetryableInteractionError(error: unknown): boolean {
        if (!(error instanceof Error)) {
            return false;
        }

        const message = error.message.toLowerCase();
        return message.includes('stale') || message.includes('not interactable');
    }

    private isRetryableLookupError(error: unknown): boolean {
        if (!(error instanceof Error)) {
            return false;
        }

        const message = error.message.toLowerCase();
        return message.includes('no such element')
            || message.includes('element not found')
            || message.includes('stale element reference')
            || message.includes('invalid element state');
    }

    private async sleep(ms: number): Promise<void> {
        await new Promise<void>((resolve) => {
            setTimeout(resolve, ms);
        });
    }
}
