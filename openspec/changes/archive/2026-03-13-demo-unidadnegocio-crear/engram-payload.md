# Engram Payload - demo-unidadnegocio-crear

## Metadata
- change: demo-unidadnegocio-crear
- archived_at: 2026-03-13
- archive_path: openspec/changes/archive/2026-03-13-demo-unidadnegocio-crear
- verify_verdict: PASS WITH WARNINGS

## Summary
Se implemento soporte Demo para `unidadnegocio-crear.test.ts` reutilizando el mismo test QA con logica por ambiente.

Cambios implementados:
- Uso de `isDemo` (`process.env.ENV?.toUpperCase() === 'DEMO'`)
- Guard de prefijo por ambiente (`Demo_` / `Qa_`)
- Metadata Allure ampliada (`Ambiente`, `UnidadNegocio`, `UnidadNegocioID`, `UnidadNegocioPrefix`, `Duracion`)
- Attachment JSON de resumen para Allure
- Logging informativo con emojis y bloque resumen de entidad creada
- Scripts agregados:
  - `test:demo:entity:unidadnegocio`
  - `run:demo:entity:unidadnegocio`

## Verification Evidence
- Type check: `cmd /c npx tsc --noEmit` (PASS)
- Script listing: `npm run test:demo:entity:unidadnegocio -- --list` (PASS)

## Artifacts
- exploration.md
- proposal.md
- verify-report.md

Todos ubicados en:
`openspec/changes/archive/2026-03-13-demo-unidadnegocio-crear/`
