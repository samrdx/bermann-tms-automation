# Jira QA Format

Documentación de los formatos estándar de issue types en el proyecto **QA** (`id: 10911`) de Jira.

> **Entorno**: Jira Cloud — API v3
> **Base URL**: `https://bermann.atlassian.net/rest/api/3`

---

## Issue Types

| Type | ID | Subtask |
| --- | --- | --- |
| Test Set | `11702` | No |
| Historia | `11777` | No |
| Test Case | `11704` | Yes |
| Error | `11778` | No |
| Epic | `11703` | No |
| Test Plan | `11811` | No |
| Retesting | `11880` | No |

---

## 1. Test Set (`11702`)

### Campos usados

| Campo | Key / CustomField | Tipo | Obligatorio |
| --- | --- | --- | --- |
| Resumen | `summary` | string | Sí |
| Descripción | `description` | ADF (Atlassian Document Format) | No |
| Componente/Modulo | `customfield_11712` | Cascading Select | No |
| Tipo de prueba | `customfield_11714` | Single Select | No |
| Ciclos | `customfield_11713` | number | No |
| Etiquetas | `labels` | array[string] | No |

### Formato del Summary

```
TS | <TICKET-KEY> | <Título descriptivo>
```

Ejemplo: `TS | TMSPROD-2210 | Agregar Filtro N° de viaje`

### Componente/Modulo (cascading)

El campo `customfield_11712` es un cascading select. Formato correcto:

```json
"customfield_11712": {
  "value": "TMS",
  "child": {
    "value": "Ultima Milla"
  }
}
```

- `"child"` es un objeto con `"value"`, **no** un string `"childValue"`
- Opciones disponibles para parent: `TMS`
- Child de TMS: `Ultima Milla`

### Tipo de prueba (single select)

Campo `customfield_11714`:

```json
"customfield_11714": {
  "value": "Funcional",
  "id": "12144"
}
```

Valores disponibles: `Funcional`

### Descripción (ADF)

Estructura de 5 secciones separadas por `rule`:

1. **Alcance y Propósito** — heading level 2 + paragraph
2. **Detalles del Entorno** — heading level 2 + bulletList
3. **Listado de Casos de Prueba Incluidos** — heading level 2 + bulletList
4. **Criterios de Aceptación de la Suite** — heading level 2 + bulletList
5. **Cronograma y Responsables** — heading level 2 + bulletList

### Payload completo de ejemplo

```json
{
  "fields": {
    "project": { "id": "10911" },
    "issuetype": { "id": "11702" },
    "summary": "TS | KEY-123 | Título del Test Set",
    "priority": { "id": "3" },
    "labels": ["Automatizado"],
    "customfield_11712": {
      "value": "TMS",
      "child": { "value": "Ultima Milla" }
    },
    "customfield_11714": { "value": "Funcional" },
    "customfield_11713": 1,
    "description": { "type": "doc", "version": 1, "content": [...] }
  }
}
```

---

## 2. Historia (`11777`)

### Campos usados

| Campo | Key / CustomField | Tipo | Obligatorio |
| --- | --- | --- | --- |
| Resumen | `summary` | string | Sí |
| Descripción | `description` | ADF | No |
| Prioridad | `priority` | Single Select | No (default: Medio) |
| Etiquetas | `labels` | array[string] | No |
| Asignado | `assignee` | user | No |
| Fecha de vencimiento | `duedate` | date | No |
| Seguimiento de tiempo | `timetracking` | object | No |
| Entorno de Pruebas | `customfield_11613` | Single Select | No |

### Formato del Summary

```
[QA-Auto] <Título descriptivo>
```

Ejemplo: `[QA-Auto] Automatización: Flujo de Subviajes (Tramos) en Viaje Maestro`

### Descripción (ADF)

Estructura:

1. **🎟️ [QA-Auto] Título** — heading level 2
2. **Descripción** — heading level 3 + paragraph
3. **🛠️ Especificaciones Técnicas (framework)** — heading level 3 + bulletList
4. Rule
5. **🧪 Escenarios / Formatos Documentados** — heading level 3 + sub-headings level 4 + bulletList
6. Rule
7. **⚠️ Consideraciones** — heading level 3 + bulletList
8. Rule
9. **✅ Definition of Done (DoD)** — heading level 3 + bulletList (checklist)

### Payload completo de ejemplo

```json
{
  "fields": {
    "project": { "id": "10911" },
    "issuetype": { "id": "11777" },
    "summary": "[QA-Auto] Título de la Historia",
    "priority": { "id": "3" },
    "assignee": { "id": "712020:2494843c-80ce-4647-9096-908ed721b1f9" },
    "reporter": { "id": "712020:2494843c-80ce-4647-9096-908ed721b1f9" },
    "labels": ["Junio-2026", "Automatizado"],
    "duedate": "2026-06-19",
    "timetracking": { "originalEstimate": "2d" },
    "customfield_11613": { "id": "12004" },
    "description": { "type": "doc", "version": 1, "content": [...] }
  }
}
```

---

## 3. Test Case (`11704`)

### Campos usados

| Campo | Key / CustomField | Tipo | Obligatorio |
| --- | --- | --- | --- |
| Resumen | `summary` | string | Sí |
| Descripción | `description` | ADF | No |
| Principal (parent) | `parent` | issue link | Sí (subtask) |
| Tester | `customfield_10538` | Single Select | No |

### Formato del Summary

```
<PARENT-KEY> | TC<N>: <Título del caso>
```

Ejemplo: `QA-737 | TC5: Persistencia del filtro`

### Descripción (ADF)

Estructura:

1. **📊 ESPECIFICACIONES DEL CASO DE PRUEBA** — heading + rule
2. **ESCENARIO:** — label + text
3. **📑 PASOS DE PRUEBA** — panel (success) con Given/When/Then
4. **🏁 RESULTADO ACTUAL** — bulletList
5. **📝 REGISTRO DE EJECUCIÓN (RESULTADOS)** — bulletList

### Parent (subtask)

Los Test Case son subtasks de un Test Set. Se vinculan mediante:

```json
"parent": { "key": "QA-737" }
```

### Payload completo de ejemplo

```json
{
  "fields": {
    "project": { "id": "10911" },
    "issuetype": { "id": "11704" },
    "parent": { "key": "QA-737" },
    "summary": "QA-737 | TC5: Título del caso",
    "priority": { "id": "3" },
    "customfield_10538": { "value": "Samuel Rodriguez" },
    "description": { "type": "doc", "version": 1, "content": [...] }
  }
}
```

---

## Consideraciones Técnicas

### API Search (deprecada)

`GET /rest/api/3/search` fue deprecada en Agosto 2025. Usar:

```
GET /rest/api/3/search/jql?jql=<JQL>&fields=*all
```

- El nuevo endpoint solo devuelve IDs por defecto — requiere `fields=*all`
- Usa `nextPageToken` en vez de `startAt`
- Requiere restricción de proyecto en JQL
- Parámetros JQL se pasan con `--data-urlencode`

### Issue Update

```http
PUT /rest/api/3/issue/{key}
Content-Type: application/json

{ "fields": { ... } }
```

- Retorna `204 No Content` en éxito
- Solo incluir los campos a modificar

### Issue Create

```http
POST /rest/api/3/issue
Content-Type: application/json

{ "fields": { ... } }
```

- Retorna `{"id": "...", "key": "QA-xxx", "self": "..."}`

### Autenticación

Basic Auth con email + API Token:

```
Authorization: Basic $(echo -n "email:token" | base64)
```

---

## Referencias

- Proyecto QA: `https://bermann.atlassian.net/projects/QA`
- API v3 Docs: `https://developer.atlassian.com/cloud/jira/platform/rest/v3/`
- Skills relacionadas: `tms-atomic-e2e`, `tms-selectors`, `tms-dropdowns`
