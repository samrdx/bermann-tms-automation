# Tasks: Soporte UTF-8 y Normalización de Acentos en Jira Native

## Review Workload Forecast

- Estimated changed lines: ~30 (4 archivos × ~7 líneas cada uno)
- 400-line budget risk: None
- Chained PRs recommended: No
- Decision needed before apply: No

## Phase 1: Implementación (encoding init + Get-Content)

- [x] 1.1 Agregar bloque UTF-8 init en `scripts/Jira-native/jira-native.ps1` después de `param()`
- [x] 1.2 Agregar bloque UTF-8 init en `scripts/Jira-native/sync-test-set.ps1` después de `param()` y agregar `-Encoding UTF8` en `Get-Content` de `Get-JiraAuthHeaders`
- [x] 1.3 Agregar bloque UTF-8 init en `scripts/Jira-native/create-test-set.ps1` después de `param()` y agregar `-Encoding UTF8` en `Get-Content` de `Get-JiraAuthHeaders`
- [x] 1.4 Agregar bloque UTF-8 init en `scripts/Jira-native/audit-duplicates.ps1` después de `param()` y agregar `-Encoding UTF8` en `Get-Content` de `Get-JiraAuthHeaders`

## Phase 2: Verificación

- [x] 2.1 Ejecutar `npm run test:jira-native` — 8/8 pass, 0 fail
- [x] 2.2 Ejecutar `npm run typecheck` — pass, sin errores

## Phase 3: Documentación

- [x] 3.1 Actualizar backlog en `scripts/Jira-native/README.md` — marcado como BETA done
