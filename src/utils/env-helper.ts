/**
 * Helper to identify the current execution environment.
 * Helps to handle differences between QA and DEMO environments.
 */

export function isDemoMode(): boolean {
  return process.env.ENV === 'DEMO';
}

export function isQaMode(): boolean {
  const env = process.env.ENV || 'QA';
  return env === 'QA';
}

export function getBaseUrl(): string {
  return isDemoMode() 
    ? 'https://demo.bermanntms.cl' 
    : 'https://moveontruckqa.bermanntms.cl';
}
