# Mobile Auth Spec Migration Guard

## Active smoke path

- Default smoke spec: `test/specs/auth/login.native.e2e.ts`
- Boundary rule: smoke spec calls `MobileLoginFlow` only.
- No direct selectors or `browser.url` calls are allowed in the auth smoke spec.

## Runtime env contract

- Required:
  - `TMS_USERNAME`
  - `TMS_PASSWORD`
- Optional auth:
  - `TMS_COMPANY`
- Optional device targeting:
  - `MOBILE_DEVICE_NAME` (default: `Pixel_AOSP`)
  - `MOBILE_UDID` (recommended for physical devices to avoid auto-pick flakiness)
  - `MOBILE_PLATFORM_VERSION`
- Optional startup/session hardening:
  - `MOBILE_APP_WAIT_ACTIVITY` (default: `*.MainActivity`)
  - `MOBILE_APP_WAIT_DURATION` (default: `120000`)
  - `MOBILE_ADB_EXEC_TIMEOUT` (default: `120000`)
  - `MOBILE_NEW_COMMAND_TIMEOUT` (default: `240`)

## Legacy fallback

- Legacy POC spec remains available as a guarded fallback: `test/specs/test.e2e.ts`
- Toggle: `MOBILE_POC_FALLBACK=true`
- Behavior:
  - `false` (default): runs only the architecture-aligned smoke spec.
  - `true`: runs architecture-aligned smoke spec plus legacy POC fallback spec.

## Rollback path

If a hotfix needs the previous exploratory flow while keeping new module code:

1. Set `MOBILE_POC_FALLBACK=true`
2. Run `npm run wdio`
3. Capture failing evidence before deciding whether to revert any file deletions in a follow-up patch

## Deprecation intent

Legacy POC assets are temporary and should be removed after stable smoke validation in CI.
