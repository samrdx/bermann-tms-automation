# Design: Soporte UTF-8 y Normalización de Acentos en Jira Native

## Technical Approach

Inyectar un bloque de inicialización de codificación UTF-8 al comienzo de cada script de PowerShell que forma parte del toolchain Jira-native, inmediatamente después del bloque `param()`. Además, agregar `-Encoding UTF8` a todas las llamadas `Get-Content` que leen el archivo `.env`.

El cambio es mecánico y repetitivo: el mismo patrón se aplica en 4 archivos. No se modifica lógica de negocio ni funciones de parsing.

## Architecture Decisions

### Decision: Inyectar encoding inline en cada script vs. extraer a un módulo compartido

**Choice**: Inyectar inline en cada script.
**Alternatives considered**: Crear un módulo `.psm1` compartido con `Initialize-Utf8Encoding` e importarlo con `Import-Module`.
**Rationale**: Los scripts se invocan de forma independiente (vía `npm run`, el dispatcher, o ejecución directa). Un módulo compartido agregaría una dependencia de carga que no existe hoy. El patrón inline es 3 líneas, fácil de auditar, y consistente con la estructura actual donde cada script es autocontenido. Si en el futuro se extrae un módulo de infraestructura compartida, se puede migrar en ese momento.

### Decision: Configurar `[Console]::InputEncoding` además de `OutputEncoding`

**Choice**: Configurar ambas.
**Alternatives considered**: Configurar solo `OutputEncoding` y `$OutputEncoding`.
**Rationale**: En sesiones interactivas de PowerShell o cuando el input viene de pipe/redirección, `InputEncoding` en ANSI puede corromper datos. Configurar las tres variables es el patrón estándar recomendado para UTF-8 completo en PowerShell sobre Windows.

## Data Flow

```
Terminal (usuario o CI)
    │
    ▼
jira-native.ps1 (dispatcher)
    │  ← UTF-8 encoding init aquí
    ▼
sync-test-set.ps1 / create-test-set.ps1 / audit-duplicates.ps1
    │  ← UTF-8 encoding init aquí (cada script es autocontenido)
    │
    ├─► Get-JiraAuthHeaders ─► Get-Content .env (-Encoding UTF8)
    │
    ├─► Invoke-CurlUtf8 ─► curl.exe ─► Jira API (JSON UTF-8)
    │                    ─► [System.IO.File]::ReadAllText(..., UTF8)
    │
    └─► Write-Host ─► Console ─► [Console]::OutputEncoding = UTF8
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `scripts/Jira-native/jira-native.ps1` | Modify | Agregar bloque UTF-8 init después de `param()` (línea 21→22) |
| `scripts/Jira-native/sync-test-set.ps1` | Modify | Agregar bloque UTF-8 init después de `param()` (línea 52→53); agregar `-Encoding UTF8` en `Get-Content` (línea 69) |
| `scripts/Jira-native/create-test-set.ps1` | Modify | Agregar bloque UTF-8 init después de `param()` (línea 45→46); agregar `-Encoding UTF8` en `Get-Content` (línea 61) |
| `scripts/Jira-native/audit-duplicates.ps1` | Modify | Agregar bloque UTF-8 init después de `param()` (línea 61→62); agregar `-Encoding UTF8` en `Get-Content` (línea 151) |

## Interfaces / Contracts

El bloque de inicialización es idéntico en los 4 scripts:

```powershell
# --- UTF-8 encoding: ensure correct display of Spanish accents and emojis ---
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::InputEncoding  = [System.Text.Encoding]::UTF8
```

La modificación de `Get-Content` es mecánica:

```diff
- $lines = Get-Content -LiteralPath $EnvFilePath
+ $lines = Get-Content -LiteralPath $EnvFilePath -Encoding UTF8
```

No se alteran firmas de funciones ni contratos de retorno.

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit/fixtures | Que los tests existentes de parsing siguen funcionando | `npm run test:jira-native` (8 tests existentes) |
| Manual | Que la consola muestra acentos y emojis correctamente | Ejecutar `npm run jira:validate -- QA-XXX` en PowerShell y verificar que los mensajes con `Propósito`, `validación`, emojis `✅`/`⚠` se rendericen sin mojibake |

## Migration / Rollout

No migration required. Los cambios son transparentes y retrocompatibles.

## Open Questions

Ninguna. El diseño es mecánico y no tiene decisiones abiertas.
