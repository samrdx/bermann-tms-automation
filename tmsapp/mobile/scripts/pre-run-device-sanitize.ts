import { spawnSync } from 'node:child_process';

const APP_PACKAGE = 'cl.bermann.tms24';
const DEFAULT_PERMISSIONS = [
    'android.permission.ACCESS_COARSE_LOCATION',
    'android.permission.ACCESS_FINE_LOCATION',
    'android.permission.ACCESS_BACKGROUND_LOCATION',
    'android.permission.POST_NOTIFICATIONS'
];

type CommandResult = {
    ok: boolean;
    stdout: string;
    stderr: string;
    code: number | null;
};

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const skipWakeUnlock = args.includes('--skip-wake-unlock');

const readArg = (name: string): string | undefined => {
    const flag = `--${name}`;
    const index = args.indexOf(flag);
    if (index < 0) {
        return undefined;
    }

    const next = args[index + 1];
    if (!next || next.startsWith('--')) {
        return undefined;
    }

    return next;
};

const udid = readArg('udid') ?? process.env.MOBILE_UDID ?? process.env.ANDROID_SERIAL;

const stamp = (): string => new Date().toISOString();

const log = (message: string, meta?: Record<string, unknown>): void => {
    if (meta) {
        console.log(`[sanitize:${stamp()}] ${message}`, meta);
        return;
    }

    console.log(`[sanitize:${stamp()}] ${message}`);
};

const runAdb = (adbArgs: string[]): CommandResult => {
    const targetArgs = udid ? ['-s', udid, ...adbArgs] : adbArgs;
    const printableCommand = `adb ${targetArgs.join(' ')}`;

    if (dryRun) {
        log('dry-run command', { command: printableCommand });
        return {
            ok: true,
            stdout: '',
            stderr: '',
            code: 0
        };
    }

    const result = spawnSync('adb', targetArgs, {
        encoding: 'utf8',
        stdio: 'pipe'
    });

    return {
        ok: result.status === 0,
        stdout: result.stdout ?? '',
        stderr: result.stderr ?? '',
        code: result.status
    };
};

const ensureSingleConnectedDevice = (): void => {
    if (udid) {
        return;
    }

    const devices = runAdb(['devices']);
    if (!devices.ok) {
        throw new Error(`Unable to list adb devices: ${devices.stderr || devices.stdout}`);
    }

    const connected = devices.stdout
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.endsWith('\tdevice'));

    if (connected.length > 1) {
        throw new Error('Multiple adb devices detected. Set MOBILE_UDID or pass --udid <device-id>.');
    }
};

const logCommandResult = (step: string, result: CommandResult, tolerant = false): void => {
    if (result.ok) {
        log(`${step}: ok`);
        if (result.stdout.trim()) {
            log(`${step}: stdout`, { stdout: result.stdout.trim() });
        }
        return;
    }

    const payload = {
        code: result.code,
        stderr: result.stderr.trim(),
        stdout: result.stdout.trim()
    };

    if (tolerant) {
        log(`${step}: tolerated failure`, payload);
        return;
    }

    throw new Error(`${step} failed: ${JSON.stringify(payload)}`);
};

const sanitize = (): void => {
    log('starting device sanitation', {
        udid: udid ?? 'auto-single-device',
        appPackage: APP_PACKAGE,
        dryRun,
        wakeUnlock: !skipWakeUnlock
    });

    ensureSingleConnectedDevice();

    const forceStopResult = runAdb(['shell', 'am', 'force-stop', APP_PACKAGE]);
    logCommandResult('force-stop app', forceStopResult, true);

    if (!skipWakeUnlock) {
        const wakeResult = runAdb(['shell', 'input', 'keyevent', 'KEYCODE_WAKEUP']);
        logCommandResult('wake screen', wakeResult, true);

        const unlockSwipe = runAdb(['shell', 'input', 'swipe', '500', '1600', '500', '300', '250']);
        logCommandResult('unlock swipe', unlockSwipe, true);
    }

    for (const permission of DEFAULT_PERMISSIONS) {
        const grantResult = runAdb(['shell', 'pm', 'grant', APP_PACKAGE, permission]);
        const tolerated = !grantResult.ok;
        logCommandResult(`grant ${permission}`, grantResult, tolerated);
    }

    log('device sanitation finished');
};

try {
    sanitize();
} catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log('device sanitation failed', { error: message });
    process.exitCode = 1;
}
