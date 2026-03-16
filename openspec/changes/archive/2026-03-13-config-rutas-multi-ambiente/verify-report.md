# Verify Report: config-rutas-multi-ambiente

## Verification Date

2026-03-13

## Scope Verified

- Ruta creation flow in QA and DEMO
- Random Origin/Destination selection in allowed range `1_..467_`
- Naming by environment (`Qa_RT_` and `Demo_RT_`)
- Post-creation persistence check via search controls `#search` and `#buscar` on `/ruta/index`
- Allure metadata and summary logging with required emojis

## Commands Executed

```bash
npx tsc --noEmit
npm run test:qa:entity:ruta
npm run test:demo:entity:ruta
```

## Results

- `npx tsc --noEmit`: PASS
- `npm run test:qa:entity:ruta`: PASS (3 passed: setup + chromium + firefox)
- `npm run test:demo:entity:ruta`: PASS (3 passed: setup + chromium + firefox)

## Evidence Highlights

- QA sample run selected random zones:
  - Origen: `240_Rahue_Colina`
  - Destino: `226_Starken_Osorno`
- DEMO sample run selected random zones:
  - Origen: `236_Ecolab_Lampa`
  - Destino: `231_Mini BF_Pudahuel`
- In both environments, created routes were found in index using:
  - `page.locator("#search")`
  - `page.locator("#buscar")`

## Status

ARCHIVED

No critical issues detected in final verification.
