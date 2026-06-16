# Design: Improved Logging System

### Architecture Decisions

#### 1. Logger API Extension

We will extend the result of `createLogger(context)` to include specialized methods:

| Method | Prefix | Emoji | Usage | Language |
| :--- | :--- | :--- | :--- | :--- |
| `phase(n, msg)` | `[FASE n]` | 🚀 | Secciones principales | Español |
| `step(msg)` | `[PASO]` | 🟦 | Acciones significativas | Español |
| `substep(msg)` | `[SUBPASO]` | 🔸 | Detalles granulares | Español |
| `success(msg)` | `[OK]` | ✅ | Verificación exitosa | Español |
| `error(msg)` | `[ERROR]` | ❌ | Fallos | Español |

#### 2. EntityTracker Implementation

A singleton-like class (reset per test session via Playwright context/fixture) to track created entities.

```typescript
interface Entity {
  type: string;
  name: string;
  id?: string;
  timestamp: number;
}
```

#### 3. Automatic "Final Summary"

The tracker will provide a `getSummaryTable()` method returning a string like:

```text
====================================================================================================
📊 RESUMEN DE ENTIDADES CREADAS
====================================================================================================
🏭 Transportista : [TransProd 123]               | ID: 123
🏢 Cliente       : [CliProd 456]                 | ID: 456
🚚 Vehiculo      : [PFGH-12]                      | Patente: PFGH-12 | Asociado: TransProd 123
👤 Conductor     : [Juan Perez]                  | Asociado: TransProd 123
📄 Contrato      : [987654]                      | Asociado: CliProd 456
🎫 Viaje         : [425903]                       | ID: 425903 | Patente: PFGH-12 | Asociado: TransProd 123 | Estado: FINALIZADO | Conductor: Juan Perez
====================================================================================================
```

### Constraints & Considerations

- **Environment Detection**: The logger should automatically detect if it's running in Demo or QA and log it at the start.
- **Playwright Steps**: The `step()` method should optionally call `test.step()` if it detects it's running inside a Playwright test context.
- **No breaking changes**: Old `info`, `warn`, `error` methods must remain for backward compatibility.

### Verification Plan

- **Unit Test**: Test the `EntityTracker` class in isolation.
- **E2E Pilot**: Run `viajes-finalizar-e2e.test.ts` in QA and Demo.
- **Reporting**: Verify that emojis appear correctly in GitHub Actions logs and Allure reports.
