# Jira-native BETA: sincronizar Test Sets

Automatización BETA para sincronizar un Jira QA Test Set desde su Historia padre. El flujo lee la historia, extrae escenarios, actualiza el Test Set y crea Test Cases faltantes solo cuando se ejecuta en modo real.

## Camino rápido

1. Pasale el ticket padre al setup automático (crea Test Set, linkea y previsualiza): `npm run jira:setup -- TMSPROD-2177`.
2. Revisá el output de calidad, escenarios extraídos y plan de sync.
3. Si el plan es correcto, ejecutá el sync real: `npm run jira:sync -- QA-788`.
4. Auditá duplicados históricos sin escrituras si el Test Set ya existía antes de las reglas de deduplicación: `npm run jira:duplicates -- QA-759`.
5. Si el audit detecta duplicados, podés previsualizar el comentario de recomendación sin escribir: `PowerShell -NoProfile -ExecutionPolicy Bypass -File scripts\Jira-native\audit-duplicates.ps1 -TestSetKey QA-759 -CommentResult -DryRun`.
6. Si querés previsualizar el close/label de duplicados sin escribir: `PowerShell -NoProfile -ExecutionPolicy Bypass -File scripts\Jira-native\audit-duplicates.ps1 -TestSetKey QA-759 -Approved -DryRun`.
7. Ejecutá close/label real solo tras revisar el preview: `npm run jira:duplicates:close -- QA-759` (usa `-Approved` automático desde el dispatcher, nunca hard delete).
8. Ejecutá dry-run si querés confirmar el plan con wording de simulación: `npm run jira:dry -- QA-782`.
9. Ejecutá sync real solo si el plan es correcto: `npm run jira:sync -- QA-782`.

## Comandos diarios

| Acción | Comando corto | Escrituras |
| --- | --- | --- |
| Setup automático (crear + linkear + validate) | `npm run jira:setup -- TMSPROD-2177` | Sí, crea Test Set y link |
| Validar | `npm run jira:validate -- QA-782` | No |
| Simular | `npm run jira:dry -- QA-782` | No |
| Auditar duplicados existentes | `npm run jira:duplicates -- QA-759` | No |
| Comentar recomendación de duplicados | `npm run jira:duplicates:comment -- QA-759` | Sí, solo comentario opt-in |
| Cerrar/etiquetar duplicados (aprobado) | `npm run jira:duplicates:close -- QA-759` | Sí, transition + label, nunca hard delete |
| Preview close/label | `PowerShell -NoProfile -ExecutionPolicy Bypass -File scripts\Jira-native\audit-duplicates.ps1 -TestSetKey QA-759 -Approved -DryRun` | No |
| Sincronizar | `npm run jira:sync -- QA-782` | Sí |
| Sincronizar y comentar resultado | `npm run jira:sync:comment -- QA-782` | Sí |
| Tests fixture/offline | `npm run test:jira-native` | No |

También podés usar el dispatcher directo:

```powershell
PowerShell -NoProfile -ExecutionPolicy Bypass -File scripts\Jira-native\jira-native.ps1 validate QA-782 
PowerShell -NoProfile -ExecutionPolicy Bypass -File scripts\Jira-native\jira-native.ps1 dry-run QA-782
PowerShell -NoProfile -ExecutionPolicy Bypass -File scripts\Jira-native\jira-native.ps1 setup TMSPROD-2177
PowerShell -NoProfile -ExecutionPolicy Bypass -File scripts\Jira-native\jira-native.ps1 duplicates QA-759
PowerShell -NoProfile -ExecutionPolicy Bypass -File scripts\Jira-native\jira-native.ps1 duplicates-comment QA-759
PowerShell -NoProfile -ExecutionPolicy Bypass -File scripts\Jira-native\jira-native.ps1 duplicates-close QA-759
PowerShell -NoProfile -ExecutionPolicy Bypass -File scripts\Jira-native\jira-native.ps1 sync QA-782
PowerShell -NoProfile -ExecutionPolicy Bypass -File scripts\Jira-native\jira-native.ps1 sync-comment QA-782
```

Si la Historia padre no está vinculada todavía, pasala como tercer argumento:

```powershell
PowerShell -NoProfile -ExecutionPolicy Bypass -File scripts\Jira-native\jira-native.ps1 validate QA-782 TMSPROD-2054
npm run jira:validate -- QA-782 TMSPROD-2054
```

## Modos de seguridad

| Modo | Qué hace | Cuándo usarlo |
| --- | --- | --- |
| `validate` | Llama `sync-test-set.ps1 -ValidateOnly`. Lee Jira, analiza, valida calidad y muestra el plan. | Primer paso obligatorio antes de cualquier sync. |
| `dry-run` | Llama `sync-test-set.ps1 -DryRun`. Mantiene cero escrituras con mensajes de simulación. | Cuando necesitás compartir o revisar el plan antes de tocar Jira. |
| `duplicates` | Llama `audit-duplicates.ps1`. Lee subtareas Test Case existentes y agrupa duplicados por summary, título/objetivo y texto semántico de descripción/GWT. | Para detectar deuda histórica antes de cualquier remediación manual o automatizada. |
| `setup` | Llama `create-test-set.ps1`. Crea Test Set en QA, linkea al ticket padre y opcionalmente corre validate. | Para arrancar desde cero: pasás el ticket padre y obtenés Test Set + plan de sync. |
| `duplicates-comment` | Llama `audit-duplicates.ps1 -CommentResult`. Publica un comentario ADF con recomendación solo si hay duplicados. | Para dejar evidencia visible antes de cerrar/etiquetar/archivar con aprobación explícita. |
| `duplicates-close` | Llama `audit-duplicates.ps1 -Approved`. Cierra (transition) y/o etiqueta duplicados según `-Action`. | Solo después de revisar el preview con `-Approved -DryRun`. Nunca hard delete. |
| `sync` | Llama `sync-test-set.ps1` sin flags de no-write. | Solo después de validar el plan. |
| `sync-comment` | Llama `sync-test-set.ps1 -CommentResult`. | Cuando querés dejar auditoría visible en el Test Set. |

Los comentarios de auditoría estructurados están en BETA y son opt-in: solo se publican con `sync-comment` / `-CommentResult`. `validate` y `dry-run` mantienen cero escrituras; si se combinan manualmente con `-CommentResult`, muestran que el comentario se habría publicado sin escribir en Jira. El rollout automático por Jira Automation existe como flujo asistido en `.github/workflows/jira-native-testset.yml`, activado al marcar el campo **Test Set Refining → OK** o **Test Set Refining → Resync** en un Test Set existente.

## Remediación de duplicados

`duplicates` es audit-only: no borra, no transiciona, no etiqueta, no comenta y no actualiza Jira. El reporte recomienda un candidato a conservar y una acción segura para revisión humana.

`duplicates-comment` es la primera fase CRUD segura: solo comenta una recomendación ADF en el Test Set cuando hay duplicados. No publica comentarios en audits limpios por defecto; si necesitás documentar un audit limpio, usá `audit-duplicates.ps1 -CommentResult -CommentClean` de forma explícita. Para probar sin escribir, usá `audit-duplicates.ps1 -CommentResult -DryRun`.

`duplicates-close` es la tercera fase CRUD segura: cierra (transition a Closed) y/o etiqueta (`duplicate`) duplicados con aprobación explícita. Usa siempre la API de transiciones de Jira (nunca DELETE), descubre la transición correcta por nombre común (Close, Closed, Done, Cerrar, Cerrado, etc.) y agrega un comentario de resumen al Test Set. El preview usa `audit-duplicates.ps1 -Approved -DryRun`.

La ruta CRUD completa es: `audit -> comment recommendation -> approved close/label`. Por defecto nunca debe hacer hard delete, porque los Test Cases pueden contener evidencia QA. Cualquier acción destructiva o semidestructiva futura tiene que requerir flag explícito y aprobación.

## Quality gates

El script falla o avisa antes de escribir cuando detecta problemas relevantes:

- Test Set inexistente o sin Historia padre detectable.
- Historia padre inexistente.
- Escenarios duplicados por clave semántica.
- Nombres de Test Case fuera del formato esperado.
- Inconsistencia entre lista del Test Set y summaries de Test Cases.
- ADF generado con contenido vacío o estructura inválida.
- Campo `Tarea Original` no editable o no descubierto.

## Troubleshooting

| Síntoma | Causa probable | Acción |
| --- | --- | --- |
| `Cannot find .env file` | Falta `.env` o no está en una ruta conocida. | Crear `.env` con `JIRA_URL`, `JIRA_EMAIL`, `JIRA_API_TOKEN`. |
| `Test Set QA-xxx not found` | Key incorrecta o permisos insuficientes. | Verificar key, proyecto y permisos del token. |
| `Could not find a linked User Story` | Falta link Jira `Test`. | Vincular el Test Set a la Historia/ticket fuente o pasar `ParentIssueKey` como tercer argumento. |
| Se repite `would update Test Set description` | Jira normaliza ADF distinto al JSON local. | El diff lógico compara contenido semántico y evita falsos positivos por normalización ADF. |
| Caracteres raros en consola | Encoding de terminal/PowerShell. | Usar terminal UTF-8 y preferir PowerShell moderno cuando sea posible. |
| `401` o `403` | Token inválido o sin permisos. | Regenerar token y validar acceso al proyecto Jira. |

## Backlog PRO

| Estado | Tarea | Motivo |
| --- | --- | --- |
| BETA done | Endurecer uso de `ValidateOnly` y `CommentResult`. | Ya existen modos sin escritura y comentario opt-in. |
| V1 done | Runner por webhook de Jira Automation. | Trigger por campo **Test Set Refining → OK** (`customfield_11780`) via `repository_dispatch`. |
| BETA done | Diff lógico de ADF. | Compara texto, secciones y Test Cases esperados para reducir falsos positivos por normalización de Jira. |
| BETA done | Comentarios de auditoría estructurados. | Comentario ADF escaneable y opt-in vía `sync-comment`; Automation queda pendiente. |
| V1 done | Opción **Resync** en Test Set Refining para re-sincronizar TS existentes sin desmarcar OK. | Workflow descheckea Resync automáticamente post-sync. |
| Pendiente | Expandir mapper de escenarios de dominio. | Mejorar extracción para módulos y formatos de historias nuevos. |
| BETA done (audit-only) | Comando de remediación de duplicados existentes. | `jira:duplicates` detecta duplicados históricos sin escrituras y recomienda revisión segura. |
| BETA done | Comentario de recomendación para duplicados existentes. | `jira:duplicates:comment` publica solo comentario opt-in; `-DryRun` previsualiza sin escribir. |
| BETA done | CRUD aprobado para cerrar/etiquetar duplicados existentes. | `duplicates-close` con `-Approved` automático; transition + label + comentario de resumen; nunca hard delete; preview con `-Approved -DryRun`. |
| BETA done | Tests CI/script para fixtures de extracción de escenarios. | `npm run test:jira-native` cubre extracción, deduplicación, naming, diff lógico y quality gates con fixtures locales. |
| BETA done | Normalización rica de español/acentos y guía UTF-8. | Forzar UTF-8 en consola y lectura de `.env` para evitar mojibake en Windows. |

## Jira Automation asistida (V1)

El workflow `.github/workflows/jira-native-testset.yml` permite disparar el flujo Jira-native desde GitHub Actions cuando se marca el campo **Test Set Refining** en un Test Set. Soporta dos triggers:

| Checkbox | Comportamiento |
| --- | --- |
| **OK** | Sync normal: valida, sincroniza y comenta. |
| **Resync** | Re-sync cuando el TS ya estaba en OK y necesita actualizarse (ej: se corrigió un bug de parsing). Corre el mismo flujo que OK pero después el workflow **descheckea Resync automáticamente** para que pueda volver a usarse. |

La única precondición manual es que el Test Set esté vinculado a la Historia/ticket fuente mediante el link Jira correspondiente. El campo **Tarea original** no es una precondición manual: durante el sync, el script descubre el ticket fuente desde los links de Jira y completa o actualiza **Tarea original** automáticamente.

### Regla 1: OK (existente — no tocar)

1. Trigger: `Field value changed` → campo **Test Set Refining** (`customfield_11780`).
2. Condition: el cambio agregó `OK` al campo, no solo que el valor final contiene `OK`.
3. Action: `Send web request` hacia GitHub `repository_dispatch`.

### Regla 2: Resync (nueva — crear)

1. Trigger: `Field value changed` → campo **Test Set Refining** (`customfield_11780`).
2. Condition: el cambio agregó `Resync` al campo, no solo que el valor final contiene `Resync`.
3. Action: `Send web request` hacia GitHub `repository_dispatch`.

No agregues reglas que borren, cierren o reparen Test Cases automáticamente desde este trigger. El cleanup de Resync lo hace el workflow automáticamente. Esto evita doble dispatch cuando el workflow limpia `Resync` y el campo queda nuevamente solo con `OK`.

### Web request a GitHub

Endpoint:

```text
POST https://api.github.com/repos/samrdx/bermann-tms-automation/dispatches
```

Headers:

```text
Accept: application/vnd.github+json
Authorization: Bearer <REPO_DISPATCH_TOKEN>
X-GitHub-Api-Version: 2022-11-28
Content-Type: application/json
```

Payload:

```json
{
  "event_type": "jira-testset-ready",
  "client_payload": {
    "testSetKey": "{{issue.key}}",
    "mode": "sync-existing"
  }
}
```

> El payload es idéntico para OK y Resync. El workflow usa el mismo modo `sync-existing` en ambos casos; la única diferencia es que tras un Resync exitoso, el workflow descheckea `Resync` automáticamente vía Jira API.

Para una ejecución manual desde GitHub Actions, usá `workflow_dispatch` con `parentKey` en los modos `full` y `dry-run`, o con `testSetKey` en los modos `validate-only` y `sync-existing`. El modo `dry-run` previsualiza creación sin escribir en Jira. El modo `sync-existing` no crea Test Sets: valida, sincroniza el Test Set indicado con comentario de auditoría y vuelve a validar.

### Secrets requeridos

| Secret | Uso |
| --- | --- |
| `REPO_DISPATCH_TOKEN` | Token usado por Jira Automation para llamar el endpoint de GitHub. En fine-grained PAT, necesita acceso al repo y permiso `Contents: Read and write` para `repository_dispatch`. |
| `JIRA_URL` o `JIRA_BASE_URL` | URL base de Jira, por ejemplo `https://bermann.atlassian.net`. |
| `JIRA_EMAIL` | Email de la cuenta Jira usada por los scripts. |
| `JIRA_API_TOKEN` | API token de Atlassian para la cuenta Jira. |

### Guardrails BETA

- El trigger recomendado es marcar **Test Set Refining → OK** o **→ Resync**; no debe mutar otros campos por su cuenta.
- El workflow ejecuta `npm run test:jira-native` antes de tocar Jira.
- El sync real corre solo después de `jira:validate` exitoso.
- El workflow vuelve a validar después del sync para detectar inconsistencias o problemas de idempotencia.
- No hay deletes ni reparaciones ciegas. Las reglas de duplicados siguen siendo comandos separados con aprobación explícita.
- En falla, revisar el resumen del job y el artefacto `jira-native-testset-logs` antes de reintentar.
- El cleanup de Resync lo hace el workflow automáticamente: después del sync, lee el campo, filtra el option `Resync` y hace PUT si estaba presente.

## Referencia técnica

- Creación automática de Test Set: `scripts/Jira-native/create-test-set.ps1`.
- Sync de Test Set: `scripts/Jira-native/sync-test-set.ps1`.
- Auditoría de duplicados: `scripts/Jira-native/audit-duplicates.ps1`.
- Dispatcher corto: `scripts/Jira-native/jira-native.ps1`.
- Wrapper legacy: `scripts/sync-test-set.ps1`.
- API usada: Jira Cloud REST API v3 con `/rest/api/3/search/jql`.
- Credenciales requeridas: `JIRA_URL`, `JIRA_EMAIL`, `JIRA_API_TOKEN`.
