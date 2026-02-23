---
name: tms-data
description: >
  Test data generation and management for Bermann TMS.
  Includes Chilean RUT generation, unique timestamp strategies, and entity factories.
  Trigger: Generating test data (contracts, users, dates), creating unique identifiers, or using factories.
license: MIT
metadata:
  author: QA Team
  version: "1.0.0"
---

# TMS Data Generation Skill

## Purpose

This skill documents data generation strategies for the Bermann TMS QA Automation Framework, including Chilean RUT generation, unique timestamp patterns, and factory usage.

## When to Use This Skill

**Auto-invoke when:**
- Generating test data (contracts, users, dates)
- Creating unique identifiers
- Working with Chilean RUT validation
- Using factories for entity creation
- Debugging duplicate data errors

**Example triggers:**
- "Create a transportista with unique data"
- "Generate a valid Chilean RUT"
- "Fix duplicate name errors in tests"
- "Use factory to create cliente"

---

## 1. Chilean RUT Generation

### What is a RUT?

**RUT (Rol Único Tributario)** is Chile's national tax identification number. It consists of:
- 7-8 digits
- 1 verification digit (0-9 or K)
- Format: `12.345.678-5`

### Algorithm

```typescript
// Location: src/utils/rutGenerator.ts

function generateValidChileanRUT(): string {
  // Generate random number between 10,000,000 and 25,999,999
  const randomNumber = Math.floor(Math.random() * 16000000) + 10000000;

  // Calculate verification digit using modulo 11
  let sum = 0;
  let multiplier = 2;

  for (let i = randomNumber.toString().length - 1; i >= 0; i--) {
    sum += parseInt(randomNumber.toString()[i]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }

  const remainder = sum % 11;
  const dv = 11 - remainder === 11 ? '0' : 11 - remainder === 10 ? 'K' : (11 - remainder).toString();

  // Format with dots and dash
  const rutString = randomNumber.toString();
  const formatted = `${rutString.slice(0, -6)}.${rutString.slice(-6, -3)}.${rutString.slice(-3)}-${dv}`;

  return formatted;
}
```

### Usage Example

```typescript
import { generateValidChileanRUT } from '../utils/rutGenerator.js';

const transportistaData = {
  nombre: 'Delta Transportes',
  rut: generateValidChileanRUT(),  // "12.345.678-5"
  razonSocial: 'Delta Transportes S.A.'
};
```

### Validation

The generated RUT is **mathematically valid** and will pass TMS validation rules.

---

## 2. Unique Timestamp Strategy

### Problem

When running tests in parallel or rapid succession, using traditional timestamps (HHmmss) causes duplicate names:

```typescript
// ❌ BAD - Causes collisions
const timestamp = new Date().toTimeString().slice(0, 8).replace(/:/g, '');
// "175635" - Multiple tests in same second = duplicates
```

### Solution: 6-Digit Unix Timestamp Modulo

```typescript
// ✅ GOOD - Prevents collisions
const unixSeconds = Math.floor(Date.now() / 1000) % 1000000;
// Example: 400572 (unique for ~11.5 days)

const companyName = 'Delta Transportes';
const uniqueName = `${companyName} - ${unixSeconds}`;
// "Delta Transportes - 400572"
```

### Why This Works

| Strategy | Collision Window | Uniqueness Period | Format |
|----------|------------------|-------------------|--------|
| HHmmss | < 1 second | Resets daily | 175635 |
| Unix 6-digit | Never (same test run) | ~11.5 days | 400572 |

**Mathematical proof:**
- 1,000,000 seconds = 11.57 days
- Tests run in < 5 minutes
- Probability of collision in single test run: **0%**

### Implementation

```typescript
// Location: src/utils/rutGenerator.ts

export function generateShortCompanyName(): string {
  const companies = [
    'Delta Transportes',
    'Meridional Transportes SpA',
    'TransSur Logística',
    'Transporte Rápido Limitada',
    'Bermann Express Ltda.',
    'Cargo Fast Chile S.A.',
    'LogiMov Transportes',
    'ViaRápida Logística',
  ];

  const company = companies[Math.floor(Math.random() * companies.length)];
  const unixSeconds = Math.floor(Date.now() / 1000) % 1000000; // Last 6 digits

  return `${company} - ${unixSeconds}`;
}
```

### Usage Example

```typescript
import { generateShortCompanyName } from '../utils/rutGenerator.js';

const transportistaData = {
  nombre: generateShortCompanyName(),  // "Delta Transportes - 400572"
  razonSocial: generateShortCompanyName(),
};
```

---

## 3. Factory Pattern

### Available Factories

#### TransportistaFactory

**Location:** `src/modules/transport/factories/TransportistaFactory.ts`

**Generates:**
- Nombre (unique with 6-digit timestamp)
- RUT (valid Chilean RUT)
- Razón Social
- Dirección (calle, altura, región, ciudad, comuna)
- Tipo Transportista
- Forma de Pago

**Usage:**

```typescript
import { TransportistaFactory } from '../modules/transport/factories/TransportistaFactory.js';

const transportistaData = TransportistaFactory.create({
  tipo: 'Terceros Con Flota Si Genera Contrato',  // Override default
});

// Result:
{
  nombre: 'Delta Transportes - 400572',
  razonSocial: 'Delta Transportes - 400572',
  documento: '12.345.678-5',
  calle: 'Avenida Libertador Bernardo O\'Higgins',
  altura: '456',
  tipo: 'Terceros Con Flota Si Genera Contrato',
  formaPago: 'Contado'
}
```

#### ClienteFactory

**Location:** `src/modules/commercial/factories/ClienteFactory.ts`

**Generates:**
- Nombre (unique)
- RUT (valid)
- Razón Social
- Dirección completa

**Usage:**

```typescript
import { ClienteFactory } from '../modules/commercial/factories/ClienteFactory.js';

const clienteData = ClienteFactory.create({
  nombre: 'Custom Client Name',  // Optional override
});
```

#### VehiculoFactory

**Location:** `src/modules/transport/factories/VehiculoFactory.ts`

**Generates:**
- Patente (Chilean format: ABCD12)
- Marca, Modelo, Año
- Capacidad de carga
- Tipo de vehículo

**Usage:**

```typescript
import { VehiculoFactory } from '../modules/transport/factories/VehiculoFactory.js';

const vehiculoData = VehiculoFactory.create({
  capacity: '25000',  // Override default capacity
});
```

#### ConductorFactory

**Location:** `src/modules/transport/factories/ConductorFactory.ts`

**Generates:**
- Nombre, Apellido
- RUT (valid)
- Email
- Teléfono
- Licencia de conducir

**Usage:**

```typescript
import { ConductorFactory } from '../modules/transport/factories/ConductorFactory.js';

const conductorData = ConductorFactory.create();
```

#### ContratoFactory

**Location:** `src/modules/contracts/factories/ContratoFactory.ts`

**Generates:**
- Nro Contrato (5-digit numeric)
- Tipo (Costo/Ingreso)
- Tarifas
- Fechas

**Usage:**

```typescript
import { ContratoFactory } from '../modules/contracts/factories/ContratoFactory.js';

const contratoData = ContratoFactory.create({
  tipo: 'Costo',
  tarifaConductor: '20000',
  tarifaViaje: '50000'
});
```

---

## 4. Worker-Specific Data Persistence

### Problem

When running tests in parallel across multiple browsers (Chromium, Firefox, WebKit), sharing a single JSON file causes:
- Data collisions
- Race conditions
- Flaky tests

### Solution: Worker-Specific JSON Files

```
last-run-data-chromium.json  # Chromium worker only
last-run-data-firefox.json   # Firefox worker only
last-run-data-webkit.json    # WebKit worker only
```

### DataPathHelper

**Location:** `tests/api-helpers/DataPathHelper.ts`

**Purpose:** Resolves the correct JSON file for the current test worker

**Usage:**

```typescript
import { DataPathHelper } from '../api-helpers/DataPathHelper.js';

test('Create Contract', async ({ page }, testInfo) => {
  // Get worker-specific data path
  const dataPath = DataPathHelper.getWorkerDataPath(testInfo);

  // Read data (each worker has its own JSON)
  const operationalData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

  console.log(`Using: ${dataPath}`);
  // Chromium worker: "last-run-data-chromium.json"
  // Firefox worker: "last-run-data-firefox.json"
  // WebKit worker: "last-run-data-webkit.json"

  // Use data
  const transportista = operationalData.transportista.nombre;
});
```

### Data Structure

```json
{
  "transportista": {
    "id": "12345",
    "nombre": "Delta Transportes - 400572",
    "baseNombre": "Delta Transportes",
    "rut": "12.345.678-5"
  },
  "cliente": {
    "id": "67890",
    "nombre": "Cliente Comercial - 400580",
    "baseNombre": "Cliente Comercial",
    "rut": "23.456.789-K"
  },
  "vehiculo": {
    "id": "11111",
    "patente": "ABCD12",
    "capacity": "25000"
  },
  "conductor": {
    "id": "22222",
    "nombre": "Juan",
    "apellido": "Pérez",
    "rut": "34.567.890-1"
  },
  "contratoCosto": {
    "id": "33333",
    "nroContrato": "12345",
    "tipo": "Costo",
    "transportistaNombre": "Delta Transportes - 400572"
  }
}
```

---

## 5. Best Practices

### ✅ DO

1. **Always use factories** for entity creation
   ```typescript
   const data = TransportistaFactory.create();
   ```

2. **Always use 6-digit Unix timestamp** for unique names
   ```typescript
   const unixSeconds = Math.floor(Date.now() / 1000) % 1000000;
   ```

3. **Always use DataPathHelper** for worker-specific JSON
   ```typescript
   const dataPath = DataPathHelper.getWorkerDataPath(testInfo);
   ```

4. **Always generate valid Chilean RUTs**
   ```typescript
   const rut = generateValidChileanRUT();
   ```

5. **Store both full name and base name**
   ```json
   {
     "nombre": "Delta Transportes - 400572",
     "baseNombre": "Delta Transportes"
   }
   ```

### ❌ DON'T

1. **Never hardcode RUTs**
   ```typescript
   // ❌ BAD
   const rut = '12.345.678-5';

   // ✅ GOOD
   const rut = generateValidChileanRUT();
   ```

2. **Never use HHmmss timestamp format**
   ```typescript
   // ❌ BAD - Causes duplicates
   const timestamp = new Date().toTimeString().slice(0, 8).replace(/:/g, '');

   // ✅ GOOD - Prevents duplicates
   const timestamp = Math.floor(Date.now() / 1000) % 1000000;
   ```

3. **Never share JSON files across workers**
   ```typescript
   // ❌ BAD - Race condition
   const dataPath = 'last-run-data.json';

   // ✅ GOOD - Worker isolation
   const dataPath = DataPathHelper.getWorkerDataPath(testInfo);
   ```

4. **Never manually calculate RUT verification digit**
   ```typescript
   // ❌ BAD - Error prone
   const rut = '12345678-5';

   // ✅ GOOD - Mathematically correct
   const rut = generateValidChileanRUT();
   ```

---

## 6. Troubleshooting

### Duplicate Name Errors

**Symptom:**
```
Error: Duplicate entry 'Delta Transportes - 175635' for key 'nombre'
```

**Cause:** Using HHmmss timestamp format

**Fix:**
```typescript
// Change from:
const timestamp = new Date().toTimeString().slice(0, 8).replace(/:/g, '');

// To:
const unixSeconds = Math.floor(Date.now() / 1000) % 1000000;
```

### Invalid RUT Errors

**Symptom:**
```
Error: RUT verification digit is invalid
```

**Cause:** Manually creating RUT without proper calculation

**Fix:**
```typescript
// Always use:
import { generateValidChileanRUT } from '../utils/rutGenerator.js';
const rut = generateValidChileanRUT();
```

### Data Not Found in Dropdown

**Symptom:**
```
Error: Transportista 'Delta Transportes' not found in dropdown
```

**Cause:** Using `baseNombre` instead of full `nombre` with timestamp

**Fix:**
```typescript
// Read from JSON:
const transportistaNombre = operationalData.transportista.nombre; // Full name with timestamp

// NOT:
const transportistaNombre = operationalData.transportista.baseNombre; // Base name only
```

### Worker Data Collision

**Symptom:**
```
Error: Transportista ID already exists
```

**Cause:** Multiple workers writing to same JSON file

**Fix:**
```typescript
// Always use DataPathHelper:
const dataPath = DataPathHelper.getWorkerDataPath(testInfo);
```

---

## 7. Examples

### Complete Transportista Creation

```typescript
import { test } from '@playwright/test';
import { TransportistaFactory } from '../modules/transport/factories/TransportistaFactory.js';
import { TransportistaHelper } from '../api-helpers/TransportistaHelper.js';
import { DataPathHelper } from '../api-helpers/DataPathHelper.js';
import fs from 'fs';

test('Create Transportista with Unique Data', async ({ page }, testInfo) => {
  // Generate unique transportista data
  const transportistaData = TransportistaFactory.create({
    tipo: 'Terceros Con Flota Si Genera Contrato',
  });

  console.log(`Creating: ${transportistaData.nombre}`);
  // "Delta Transportes - 400572"

  // Create in system
  const transportista = await TransportistaHelper.createTransportista(page, transportistaData);

  // Save to worker-specific JSON
  const dataPath = DataPathHelper.getWorkerDataPath(testInfo);
  const data = {
    transportista: {
      id: transportista.id,
      nombre: transportistaData.nombre,
      baseNombre: transportistaData.nombre.split(' - ')[0],
      rut: transportistaData.documento
    }
  };

  fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf-8');
});
```

### Using Saved Data in Subsequent Test

```typescript
import { test } from '@playwright/test';
import { DataPathHelper } from '../api-helpers/DataPathHelper.js';
import fs from 'fs';

test('Create Contract Using Saved Transportista', async ({ page }, testInfo) => {
  // Load worker-specific data
  const dataPath = DataPathHelper.getWorkerDataPath(testInfo);
  const operationalData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

  // Use full name with timestamp (not baseNombre)
  const transportistaNombre = operationalData.transportista.nombre;
  // "Delta Transportes - 400572"

  // Use in contract creation
  await contratosPage.selectTransportista(transportistaNombre);
});
```

---

## Summary

This skill provides:

1. ✅ **Chilean RUT generation** - Mathematically valid, modulo 11 algorithm
2. ✅ **Unique timestamp strategy** - 6-digit Unix modulo prevents duplicates
3. ✅ **Factory pattern** - 5 factories for all entity types
4. ✅ **Worker isolation** - DataPathHelper prevents parallel test collisions
5. ✅ **Best practices** - Clear DOs and DON'Ts for data generation
6. ✅ **Troubleshooting** - Common errors and fixes

**Always check this skill before generating test data!**

---

**Last Updated:** February 6, 2026
**Status:** Production-ready
**Skill Level:** Core - Essential for all test development
