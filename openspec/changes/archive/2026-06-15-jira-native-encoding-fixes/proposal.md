# Proposal: Soporte UTF-8 y Normalización de Acentos en Jira Native

## Intent

Resolver los problemas de codificación (*mojibake*) en la consola de Windows y asegurar que la lectura del archivo `.env` sea compatible con UTF-8. Esto garantiza la integridad del parseo de caracteres especiales del español (como acentos y eñes) provenientes de Jira antes de impactar los Test Cases.

## Scope

### In Scope
- Forzar la codificación de la consola de PowerShell de entrada, salida y `$OutputEncoding` a UTF-8 al inicio de todos los scripts.
- Agregar de manera explícita `-Encoding UTF8` en todas las lecturas de archivo `.env` realizadas mediante `Get-Content`.
- Asegurar que los logs del despachador e integraciones muestren los caracteres españoles de manera correcta.

### Out of Scope
- Modificar el motor de parseo lógico de Gherkin/ADF (se mantiene igual, solo se mejora la lectura del stream de entrada y la salida de consola).
- Implementar nuevas reglas de extracción de escenarios.

## Approach

Implementaremos la Approach 1 recomendada en la exploración:
1. Al inicio de cada script de PowerShell (`jira-native.ps1`, `sync-test-set.ps1`, `create-test-set.ps1`, `audit-duplicates.ps1`), configurar:
   ```powershell
   $OutputEncoding = [System.Text.Encoding]::UTF8
   [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
   [Console]::InputEncoding = [System.Text.Encoding]::UTF8
   ```
2. Modificar las funciones `Get-JiraAuthHeaders` para usar `Get-Content -LiteralPath $EnvFilePath -Encoding UTF8`.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `scripts/Jira-native/jira-native.ps1` | Modified | Inicialización de codificación de consola |
| `scripts/Jira-native/sync-test-set.ps1` | Modified | Inicialización y lectura de `.env` |
| `scripts/Jira-native/create-test-set.ps1` | Modified | Inicialización y lectura de `.env` |
| `scripts/Jira-native/audit-duplicates.ps1` | Modified | Inicialización y lectura de `.env` |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Incompatibilidad con versiones de PowerShell viejas (v4 o inferior) | Low | El proyecto requiere PowerShell 5.1+ de manera oficial. |
| Persistencia de codificación en consolas compartidas | Low | Solo aplica a la sesión de consola que ejecuta la automatización. |

## Rollback Plan

Revertir los cambios en los scripts de PowerShell con `git checkout -- scripts/Jira-native/` para restaurar la inicialización y el uso por defecto de `Get-Content`.

## Dependencies

- Ninguna.

## Success Criteria

- [ ] Las ejecuciones de los comandos `validate`, `dry-run` y `duplicates` muestran correctamente acentos (`Propósito`, `validación`, `Aceptación`) y emojis sin mojibake.
- [ ] La lectura del archivo `.env` mediante `Get-JiraAuthHeaders` se realiza de forma exitosa usando `-Encoding UTF8`.
- [ ] `npm run test:jira-native` se ejecuta y pasa correctamente.
