import { getMobileAuthConfig } from './src/config/mobileAuth.config.ts';
import {
    beginTestDiagnostics,
    clearDiagnosticsContext,
    getDiagnosticsBounds,
    getDiagnosticsContext,
    getDiagnosticsOutputRoot,
    writeFailureDiagnostics
} from './src/core/diagnostics.ts';
import { type NativeElement } from './src/core/NativeBasePage.ts';
import { stabilizeAndroidStartupPermissions } from './src/core/androidStartupPermissionGate.ts';
import { createMobileLogger } from './src/core/logger.ts';

const mobileAuthConfig = getMobileAuthConfig();
const runLegacyPocFallback = process.env.MOBILE_POC_FALLBACK === 'true';
const diagnosticsRunId = process.env.MOBILE_DIAGNOSTICS_RUN_ID ?? new Date().toISOString().replace(/[:.]/g, '-');
const diagnosticsOutputRoot = getDiagnosticsOutputRoot();
const diagnosticsBounds = getDiagnosticsBounds();
const hookLogger = createMobileLogger({ scope: 'wdio.hooks' });

type WdioLogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error' | 'silent';

const resolveWdioLogLevel = (value: string | undefined, fallback: WdioLogLevel): WdioLogLevel => {
    if (!value) {
        return fallback;
    }

    const normalized = value.toLowerCase();

    if (
        normalized === 'trace'
        || normalized === 'debug'
        || normalized === 'info'
        || normalized === 'warn'
        || normalized === 'error'
        || normalized === 'silent'
    ) {
        return normalized;
    }

    return fallback;
};

const resolvedWdioLogLevel = resolveWdioLogLevel(process.env.MOBILE_WDIO_LOG_LEVEL, 'warn');
const resolvedWebdriverLogLevel = resolveWdioLogLevel(process.env.MOBILE_WDIO_WEBDRIVER_LOG_LEVEL, 'error');

const toTestIdentifier = (test: { fullName?: string; title?: string; parent?: string }): string => {
    const candidate = test.fullName ?? [test.parent, test.title].filter(Boolean).join(' ').trim() ?? test.title ?? 'unnamed-test';
    return candidate
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_+|_+$/g, '')
        .slice(0, 120) || 'unnamed-test';
};

const deviceProfile = (): Record<string, unknown> => ({
    deviceName: mobileAuthConfig.capabilities.deviceName,
    platformName: mobileAuthConfig.capabilities.platformName,
    platformVersion: mobileAuthConfig.capabilities.platformVersion ?? 'unspecified',
    appPath: mobileAuthConfig.capabilities.appPath
});

const smokeSpecs = [
    './test/specs/auth/login.native.e2e.ts'
];

const legacyPocSpecs = [
    './test/specs/test.e2e.ts'
];

const selectedSpecs = runLegacyPocFallback
    ? [...smokeSpecs, ...legacyPocSpecs]
    : smokeSpecs;

const capabilities: WebdriverIO.Capabilities[] = mobileAuthConfig.useLegacyCapabilities
    ? [{
        'appium:platformName': mobileAuthConfig.capabilities.platformName,
        'appium:automationName': mobileAuthConfig.capabilities.automationName,
        'appium:deviceName': mobileAuthConfig.capabilities.deviceName,
        'appium:app': mobileAuthConfig.capabilities.appPath,
        'appium:appWaitActivity': mobileAuthConfig.capabilities.appWaitActivity,
        'appium:appWaitDuration': mobileAuthConfig.capabilities.appWaitDuration,
        'appium:adbExecTimeout': mobileAuthConfig.capabilities.adbExecTimeout,
        'appium:newCommandTimeout': mobileAuthConfig.capabilities.newCommandTimeout,
        'appium:noReset': mobileAuthConfig.capabilities.noReset,
        ...(mobileAuthConfig.capabilities.udid
            ? { 'appium:udid': mobileAuthConfig.capabilities.udid }
            : {})
    }]
    : [{
        'appium:platformName': mobileAuthConfig.capabilities.platformName,
        'appium:automationName': mobileAuthConfig.capabilities.automationName,
        'appium:deviceName': mobileAuthConfig.capabilities.deviceName,
        'appium:app': mobileAuthConfig.capabilities.appPath,
        'appium:appWaitActivity': mobileAuthConfig.capabilities.appWaitActivity,
        'appium:appWaitDuration': mobileAuthConfig.capabilities.appWaitDuration,
        'appium:adbExecTimeout': mobileAuthConfig.capabilities.adbExecTimeout,
        'appium:newCommandTimeout': mobileAuthConfig.capabilities.newCommandTimeout,
        'appium:noReset': mobileAuthConfig.capabilities.noReset,
        ...(mobileAuthConfig.capabilities.udid
            ? { 'appium:udid': mobileAuthConfig.capabilities.udid }
            : {}),
        ...(mobileAuthConfig.capabilities.platformVersion
            ? { 'appium:platformVersion': mobileAuthConfig.capabilities.platformVersion }
            : {})
    }];

export const config: WebdriverIO.Config = {
    //
    // ====================
    // Runner Configuration
    // ====================
    // WebdriverIO supports running e2e tests as well as unit and component tests.
    runner: 'local',
    tsConfigPath: './tsconfig.json',
    
    port: 4723,
    //
    // ==================
    // Specify Test Files
    // ==================
    // Define which test specs should run. The pattern is relative to the directory
    // of the configuration file being run.
    //
    // The specs are defined as an array of spec files (optionally using wildcards
    // that will be expanded). The test for each spec file will be run in a separate
    // worker process. In order to have a group of spec files run in the same worker
    // process simply enclose them in an array within the specs array.
    //
    // The path of the spec files will be resolved relative from the directory of
    // of the config file unless it's absolute.
    //
    specs: selectedSpecs,
    // Patterns to exclude.
    exclude: [
        // 'path/to/excluded/files'
    ],
    //
    // ============
    // Capabilities
    // ============
    // Define your capabilities here. WebdriverIO can run multiple capabilities at the same
    // time. Depending on the number of capabilities, WebdriverIO launches several test
    // sessions. Within your capabilities you can overwrite the spec and exclude options in
    // order to group specific specs to a specific capability.
    //
    // First, you can define how many instances should be started at the same time. Let's
    // say you have 3 different capabilities (Chrome, Firefox, and Safari) and you have
    // set maxInstances to 1; wdio will spawn 3 processes. Therefore, if you have 10 spec
    // files and you set maxInstances to 10, all spec files will get tested at the same time
    // and 30 processes will get spawned. The property handles how many capabilities
    // from the same test should run tests.
    //
    maxInstances: 1,
    //
    // If you have trouble getting all important capabilities together, check out the
    // Sauce Labs platform configurator - a great tool to configure your capabilities:
    // https://saucelabs.com/platform/platform-configurator
    //
    capabilities,
    //
    // ===================
    // Test Configurations
    // ===================
    // Define all options that are relevant for the WebdriverIO instance here
    //
    // Level of logging verbosity: trace | debug | info | warn | error | silent
    logLevel: resolvedWdioLogLevel,
    //
    // Set specific log levels per logger
    // loggers:
    // - webdriver, webdriverio
    // - @wdio/browserstack-service, @wdio/lighthouse-service, @wdio/sauce-service
    // - @wdio/mocha-framework, @wdio/jasmine-framework
    // - @wdio/local-runner
    // - @wdio/sumologic-reporter
    // - @wdio/cli, @wdio/config, @wdio/utils
    // Level of logging verbosity: trace | debug | info | warn | error | silent
    logLevels: {
        webdriver: resolvedWebdriverLogLevel,
        webdriverio: resolvedWebdriverLogLevel,
        '@wdio/appium-service': resolvedWdioLogLevel,
        '@wdio/local-runner': resolvedWdioLogLevel
    },
    //
    // If you only want to run your tests until a specific amount of tests have failed use
    // bail (default is 0 - don't bail, run all tests).
    bail: 0,
    //
    // Set a base URL in order to shorten url command calls. If your `url` parameter starts
    // with `/`, the base url gets prepended, not including the path portion of your baseUrl.
    // If your `url` parameter starts without a scheme or `/` (like `some/path`), the base url
    // gets prepended directly.
    // baseUrl: 'http://localhost:8080',
    //
    // Default timeout for all waitFor* commands.
    waitforTimeout: 10000,
    //
    // Default timeout in milliseconds for request
    // if browser driver or grid doesn't send response
    connectionRetryTimeout: 120000,
    //
    // Default request retries count
    connectionRetryCount: 3,
    //
    // Test runner services
    // Services take over a specific job you don't want to take care of. They enhance
    // your test setup with almost no effort. Unlike plugins, they don't add new
    // commands. Instead, they hook themselves up into the test process.
    services: ['appium'],

    // Framework you want to run your specs with.
    // The following are supported: Mocha, Jasmine, and Cucumber
    // see also: https://webdriver.io/docs/frameworks
    //
    // Make sure you have the wdio adapter package for the specific framework installed
    // before running any tests.
    framework: 'mocha',
    
    //
    // The number of times to retry the entire specfile when it fails as a whole
    // specFileRetries: 1,
    //
    // Delay in seconds between the spec file retry attempts
    // specFileRetriesDelay: 0,
    //
    // Whether or not retried spec files should be retried immediately or deferred to the end of the queue
    // specFileRetriesDeferred: false,
    //
    // Test reporter for stdout.
    // The only one supported by default is 'dot'
    // see also: https://webdriver.io/docs/dot-reporter
    reporters: ['spec',['allure', {outputDir: 'allure-results'}]],

    // Options to be passed to Mocha.
    // See the full list at http://mochajs.org/
    mochaOpts: {
        ui: 'bdd',
        timeout: 60000
    },

    //
    // =====
    // Hooks
    // =====
    // WebdriverIO provides several hooks you can use to interfere with the test process in order to enhance
    // it and to build services around it. You can either apply a single function or an array of
    // methods to it. If one of them returns with a promise, WebdriverIO will wait until that promise got
    // resolved to continue.
    /**
     * Gets executed once before all workers get launched.
     * @param {object} config wdio configuration object
     * @param {Array.<Object>} capabilities list of capabilities details
     */
    // onPrepare: function (config, capabilities) {
    // },
    /**
     * Gets executed before a worker process is spawned and can be used to initialize specific service
     * for that worker as well as modify runtime environments in an async fashion.
     * @param  {string} cid      capability id (e.g 0-0)
     * @param  {object} caps     object containing capabilities for session that will be spawn in the worker
     * @param  {object} specs    specs to be run in the worker process
     * @param  {object} args     object that will be merged with the main configuration once worker is initialized
     * @param  {object} execArgv list of string arguments passed to the worker process
     */
    // onWorkerStart: function (cid, caps, specs, args, execArgv) {
    // },
    /**
     * Gets executed just after a worker process has exited.
     * @param  {string} cid      capability id (e.g 0-0)
     * @param  {number} exitCode 0 - success, 1 - fail
     * @param  {object} specs    specs to be run in the worker process
     * @param  {number} retries  number of retries used
     */
    // onWorkerEnd: function (cid, exitCode, specs, retries) {
    // },
    /**
     * Gets executed just before initialising the webdriver session and test framework. It allows you
     * to manipulate configurations depending on the capability or spec.
     * @param {object} config wdio configuration object
     * @param {Array.<Object>} capabilities list of capabilities details
     * @param {Array.<String>} specs List of spec file paths that are to be run
     * @param {string} cid worker id (e.g. 0-0)
     */
    // beforeSession: function (config, capabilities, specs, cid) {
    // },
    /**
     * Gets executed before test execution begins. At this point you can access to all global
     * variables like `browser`. It is the perfect place to define custom commands.
     * @param {Array.<Object>} capabilities list of capabilities details
     * @param {Array.<String>} specs        List of spec file paths that are to be run
     * @param {object}         browser      instance of created browser/device session
     */
    before: async function () {
        await stabilizeAndroidStartupPermissions(
            {
                $: async (selector: string) => {
                    return browser.$(selector) as unknown as NativeElement;
                },
                getCurrentActivity: async () => {
                    return browser.getCurrentActivity();
                },
                getCurrentPackage: async () => {
                    return browser.getCurrentPackage();
                },
                activateApp: async (appId: string) => {
                    await browser.activateApp(appId);
                }
            },
            hookLogger,
            {
                timeoutMs: 25_000,
                pollIntervalMs: 750,
                requiredStableSamples: 2,
                permissionRetries: 1,
                permissionRetryDelayMs: 250,
                targetAppPackage: 'cl.bermann.tms24',
                allowedAppActivityMarkers: ['.MainActivity', 'MainActivity'],
                contextRecoveryAttempts: 2,
                contextRecoverySettleMs: 800
            }
        );
    },
    /**
     * Runs before a WebdriverIO command gets executed.
     * @param {string} commandName hook command name
     * @param {Array} args arguments that command would receive
     */
    // beforeCommand: function (commandName, args) {
    // },
    /**
     * Hook that gets executed before the suite starts
     * @param {object} suite suite details
     */
    // beforeSuite: function (suite) {
    // },
    /**
     * Function to be executed before a test (in Mocha/Jasmine) starts.
     */
    beforeTest: function (test) {
        const testId = toTestIdentifier(test as { fullName?: string; title?: string; parent?: string });
        beginTestDiagnostics(testId);
        hookLogger.info('mobile.test.start', {
            testId,
            fullName: (test as { fullName?: string }).fullName,
            deviceProfile: deviceProfile(),
            diagnosticsRunId
        });
    },
    /**
     * Hook that gets executed _before_ a hook within the suite starts (e.g. runs before calling
     * beforeEach in Mocha)
     */
    // beforeHook: function (test, context, hookName) {
    // },
    /**
     * Hook that gets executed _after_ a hook within the suite starts (e.g. runs after calling
     * afterEach in Mocha)
     */
    // afterHook: function (test, context, { error, result, duration, passed, retries }, hookName) {
    // },
    /**
     * Function to be executed after a test (in Mocha/Jasmine only)
     * @param {object}  test             test object
     * @param {object}  context          scope object the test was executed with
     * @param {Error}   result.error     error object in case the test fails, otherwise `undefined`
     * @param {*}       result.result    return object of test function
     * @param {number}  result.duration  duration of test
     * @param {boolean} result.passed    true if test has passed, otherwise false
     * @param {object}  result.retries   information about spec related retries, e.g. `{ attempts: 0, limit: 0 }`
     */
    afterTest: async function(test, _context, { error, passed }) {
        const currentContext = getDiagnosticsContext();

        if (!passed) {
            try {
                const diagnostics = await writeFailureDiagnostics({
                    testName: (test as { title?: string }).title ?? 'unnamed-test',
                    fullName: (test as { fullName?: string }).fullName,
                    file: (test as { file?: string }).file,
                    sessionId: browser.sessionId,
                    runId: diagnosticsRunId,
                    outputRoot: diagnosticsOutputRoot,
                    error,
                    context: currentContext ?? {
                        testId: toTestIdentifier(test as { fullName?: string; title?: string; parent?: string }),
                        startedAt: new Date().toISOString()
                    },
                    browser: {
                        saveScreenshot: async (filePath: string) => {
                            await browser.saveScreenshot(filePath);
                        },
                        getCurrentActivity: async () => {
                            return browser.getCurrentActivity();
                        },
                        getPageSource: async () => {
                            return browser.getPageSource();
                        },
                        capabilities: browser.capabilities
                    },
                    bounds: diagnosticsBounds
                });

                hookLogger.error('mobile.test.failure', {
                    testId: currentContext?.testId,
                    diagnosticsPath: diagnostics.diagnosticsPath,
                    screenshotPath: diagnostics.screenshotPath,
                    diagnosticsRunId
                });
            } catch (diagnosticsError: unknown) {
                hookLogger.error('mobile.test.failure_diagnostics_error', {
                    diagnosticsRunId,
                    diagnosticsOutputRoot,
                    error: diagnosticsError instanceof Error ? diagnosticsError.message : 'unknown-error'
                });
                await browser.takeScreenshot();
            }
        }

        clearDiagnosticsContext();
    },


    /**
     * Hook that gets executed after the suite has ended
     * @param {object} suite suite details
     */
    // afterSuite: function (suite) {
    // },
    /**
     * Runs after a WebdriverIO command gets executed
     * @param {string} commandName hook command name
     * @param {Array} args arguments that command would receive
     * @param {number} result 0 - command success, 1 - command error
     * @param {object} error error object if any
     */
    // afterCommand: function (commandName, args, result, error) {
    // },
    /**
     * Gets executed after all tests are done. You still have access to all global variables from
     * the test.
     * @param {number} result 0 - test pass, 1 - test fail
     * @param {Array.<Object>} capabilities list of capabilities details
     * @param {Array.<String>} specs List of spec file paths that ran
     */
    // after: function (result, capabilities, specs) {
    // },
    /**
     * Gets executed right after terminating the webdriver session.
     * @param {object} config wdio configuration object
     * @param {Array.<Object>} capabilities list of capabilities details
     * @param {Array.<String>} specs List of spec file paths that ran
     */
    // afterSession: function (config, capabilities, specs) {
    // },
    /**
     * Gets executed after all workers got shut down and the process is about to exit. An error
     * thrown in the onComplete hook will result in the test run failing.
     * @param {object} exitCode 0 - success, 1 - fail
     * @param {object} config wdio configuration object
     * @param {Array.<Object>} capabilities list of capabilities details
     * @param {<Object>} results object containing test results
     */
    // onComplete: function(exitCode, config, capabilities, results) {
    // },
    /**
    * Gets executed when a refresh happens.
    * @param {string} oldSessionId session ID of the old session
    * @param {string} newSessionId session ID of the new session
    */
    // onReload: function(oldSessionId, newSessionId) {
    // }
    /**
    * Hook that gets executed before a WebdriverIO assertion happens.
    * @param {object} params information about the assertion to be executed
    */
    // beforeAssertion: function(params) {
    // }
    /**
    * Hook that gets executed after a WebdriverIO assertion happened.
    * @param {object} params information about the assertion that was executed, including its results
    */
    // afterAssertion: function(params) {
    // }
}
