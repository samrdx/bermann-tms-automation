# TMS API Endpoints Documentation

## Purpose

This document records TMS REST API endpoints discovered through Chrome DevTools inspection. These endpoints enable **true API automation** (direct HTTP calls) instead of UI automation.

**Status:** 🚧 Work in Progress - Endpoints being discovered

---

## How to Discover Endpoints

### Step-by-Step Process

1. **Open TMS QA in Chrome**
   ```
   https://moveontruckqa.bermanntms.cl
   ```

2. **Open DevTools**
   - Press `F12` or right-click → Inspect
   - Go to **Network** tab
   - Check "Preserve log" ✅

3. **Perform Action Manually**
   - Example: Create a Transportista
   - Fill form and click "Guardar"

4. **Capture Request**
   - Find POST request in Network tab (look for `/crear` or `/create`)
   - Right-click → Copy → **Copy as fetch (Node.js)**
   - Paste below in corresponding section

5. **Document Here**
   - Endpoint URL
   - Request method (POST/GET/PUT/DELETE)
   - Headers required
   - Request body structure
   - Response structure

---

## Authentication

### Session Cookies Required

All API requests require authenticated session cookies:

```
Cookie: PHPSESSID=abc123xyz; _csrf=def456; remember_me=...
```

**How to obtain:**
1. Login via UI (auth.setup.ts)
2. Extract cookies from `page.context().cookies()`
3. Pass in `Cookie` header for all subsequent requests

---

## Transportistas Endpoints

### Create Transportista

**Status:** 🔍 TO BE INVESTIGATED

**Endpoint:** (Unknown - needs investigation)
```
POST /transportistas/crear
or
POST /api/transportistas
```

**Headers:**
```
Content-Type: application/x-www-form-urlencoded
Cookie: PHPSESSID=...; _csrf=...
X-Requested-With: XMLHttpRequest (maybe required)
```

**Request Body:** (Unknown - capture from DevTools)
```
Example structure (to be verified):

Transportista[nombre]=Delta Transportes - 400572
Transportista[rut]=12.345.678-5
Transportista[razon_social]=Delta Transportes - 400572
Transportista[tipo_id]=3
Transportista[forma_pago_id]=1
Transportista[direccion][calle]=Av. Libertador
Transportista[direccion][altura]=456
Transportista[direccion][region_id]=13
Transportista[direccion][ciudad_id]=1
Transportista[direccion][comuna_id]=15
Transportista[tercerizar]=No
```

**Response:** (Unknown - capture from DevTools)
```json
Example structure (to be verified):

{
  "success": true,
  "id": "12345",
  "transportistaId": "12345",
  "redirect": "/transportistas/ver/12345"
}
```

**TODO:**
- [ ] Create transportista manually in TMS QA
- [ ] Capture request from Chrome DevTools
- [ ] Copy as fetch (Node.js)
- [ ] Paste here
- [ ] Implement in TmsApiClient.ts

---

### Get Transportista by ID

**Status:** 🔍 TO BE INVESTIGATED

**Endpoint:**
```
GET /transportistas/ver/{id}
or
GET /api/transportistas/{id}
```

---

### Update Transportista

**Status:** 🔍 TO BE INVESTIGATED

**Endpoint:**
```
PUT /transportistas/editar/{id}
or
POST /transportistas/editar/{id}
```

---

### Delete Transportista

**Status:** 🔍 TO BE INVESTIGATED

**Endpoint:**
```
DELETE /transportistas/eliminar/{id}
or
POST /transportistas/eliminar/{id}
```

---

## Clientes Endpoints

### Create Cliente

**Status:** 🔍 TO BE INVESTIGATED

**Endpoint:**
```
POST /clientes/crear
or
POST /api/clientes
```

**Request Body:** (To be discovered)

**Response:** (To be discovered)

**TODO:**
- [ ] Investigate endpoint
- [ ] Document structure
- [ ] Implement in TmsApiClient.ts

---

## Vehiculos Endpoints

### Create Vehiculo

**Status:** 🔍 TO BE INVESTIGATED

**Endpoint:**
```
POST /vehiculos/crear
or
POST /api/vehiculos
```

**TODO:**
- [ ] Investigate endpoint
- [ ] Document structure
- [ ] Implement in TmsApiClient.ts

---

## Conductores Endpoints

### Create Conductor

**Status:** 🔍 TO BE INVESTIGATED

**Endpoint:**
```
POST /conductores/crear
or
POST /api/conductores
```

**TODO:**
- [ ] Investigate endpoint
- [ ] Document structure
- [ ] Implement in TmsApiClient.ts

---

## Contratos Endpoints

### Create Contrato

**Status:** 🔍 TO BE INVESTIGATED

**Endpoint:**
```
POST /contratos/crear
or
POST /api/contratos
```

**TODO:**
- [ ] Investigate endpoint
- [ ] Document structure

---

## Viajes Endpoints

### Planificar Viaje

**Status:** 🔍 TO BE INVESTIGATED

### Asignar Viaje

**Status:** 🔍 TO BE INVESTIGATED

---

## Investigation Progress

| Entity | Endpoint Discovered | Request Structure | Response Structure | Implemented |
|--------|-------------------|-------------------|-------------------|-------------|
| Transportista | ❌ | ❌ | ❌ | ❌ |
| Cliente | ❌ | ❌ | ❌ | ❌ |
| Vehiculo | ❌ | ❌ | ❌ | ❌ |
| Conductor | ❌ | ❌ | ❌ | ❌ |
| Contrato | ❌ | ❌ | ❌ | ❌ |
| Viaje (Planificar) | ❌ | ❌ | ❌ | ❌ |
| Viaje (Asignar) | ❌ | ❌ | ❌ | ❌ |

---

## Example: How to Copy Request from DevTools

### Visual Guide

```
1. Open Chrome DevTools (F12)

2. Go to Network tab
   ┌─────────────────────────────────────────┐
   │ Network  Console  Sources  Application  │
   │ ┌───────────────────────────────────┐   │
   │ │ ☑ Preserve log                    │   │
   │ └───────────────────────────────────┘   │
   └─────────────────────────────────────────┘

3. Perform action (e.g., create transportista)

4. Find POST request in list
   ┌─────────────────────────────────────────┐
   │ Name              Method    Status       │
   │ crear             POST      200          │  ← This one!
   │ index             GET       200          │
   └─────────────────────────────────────────┘

5. Right-click → Copy → Copy as fetch (Node.js)
   ┌─────────────────────────────────────────┐
   │ Copy                                 ▶   │
   │   Copy as fetch (Node.js)           ← ! │
   │   Copy as cURL                           │
   │   Copy as PowerShell                     │
   └─────────────────────────────────────────┘

6. Paste result here in this document

7. Convert to TypeScript in TmsApiClient.ts
```

---

## Example: Converting fetch to TypeScript

### Step 1: Copied from DevTools

```javascript
// Copied from Chrome DevTools
fetch("https://moveontruckqa.bermanntms.cl/transportistas/crear", {
  "headers": {
    "content-type": "application/x-www-form-urlencoded",
    "cookie": "PHPSESSID=abc123; _csrf=xyz789"
  },
  "body": "Transportista%5Bnombre%5D=Delta+Transportes&Transportista%5Brut%5D=12345678-5",
  "method": "POST"
});
```

### Step 2: Converted to TypeScript (TmsApiClient)

```typescript
async createTransportista(data: TransportistaData): Promise<string> {
  const response = await this.page.request.post(
    `${this.baseUrl}/transportistas/crear`,
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': this.getCookieHeader()
      },
      form: {
        'Transportista[nombre]': data.nombre,
        'Transportista[rut]': data.documento,
        // ... other fields
      }
    }
  );

  const responseData = await response.json();
  return responseData.id;
}
```

---

## Next Steps

### Week 1: Investigation Phase

- [ ] Day 1: Investigate Transportista endpoints
- [ ] Day 2: Investigate Cliente endpoints
- [ ] Day 3: Investigate Vehiculo + Conductor endpoints
- [ ] Day 4: Document all findings
- [ ] Day 5: Implement TmsApiClient methods

### Week 2: Implementation Phase

- [ ] Day 1-2: Implement all TmsApiClient methods
- [ ] Day 3: Create API-based setup test
- [ ] Day 4: Compare performance (UI vs API)
- [ ] Day 5: Update documentation

### Expected Results

| Metric | Current (UI) | Target (API) | Improvement |
|--------|-------------|--------------|-------------|
| Setup Time | 60s | 10s | 6x faster |
| Reliability | 95% | 99%+ | More stable |
| Maintenance | High | Low | Less brittle |

---

## Notes

- TMS may use Yii2 framework (check for `_csrf` tokens)
- Some endpoints may require AJAX headers (`X-Requested-With: XMLHttpRequest`)
- Response may be JSON or redirect (check `Location` header)
- Session cookies expire after 30 minutes of inactivity

---

**Document Status:** 🚧 In Progress
**Last Updated:** February 6, 2026
**Owner:** QA Team
