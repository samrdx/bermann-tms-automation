# Design: Operation Time Configuration

## Technical Approach
Implement a new Page Object `TipoOperacionPage` in the `configAdmin` module. This page will encapsulate all locators and actions related to the `/tipooperacion/crear` route. We will also implement a comprehensive E2E test that verifies the functionality in both QA and Demo environments using the existing multi-environment infrastructure.

## Architecture Decisions

### Decision: Module Placement
**Choice**: `src/modules/configAdmin/`
**Alternatives considered**: `src/modules/transport/`
**Rationale**: Operation Types are administrative configurations similar to `TipoCarga` and `UnidadNegocio`, which are already in `configAdmin`.

### Decision: Environment Handling
**Choice**: Use `BASE_URL` from environment configuration.
**Alternatives considered**: Hardcoded URLs.
**Rationale**: The framework already supports `ENV=QA` and `ENV=DEMO`, and the user specifically requested switching between them.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src/modules/configAdmin/pages/TipoOperacionPage.ts` | Create | New Page Object class. |
| `tests/e2e/modules/01-entidades/config/tipo-operacion-crear.test.ts` | Create | New E2E test suite. |

## Interfaces / Contracts

```typescript
export interface TipoOperacionData {
  nombre: string;
  tiempoPrevio: string; // HH:mm
  permanenciaOrigen: string; // HH:mm
  permanenciaDestino: string; // HH:mm
  validarHorarios: boolean;
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| E2E | Form filling and saving | Playwright test using `TipoOperacionPage`. |
| E2E | Environment compatibility | Run tests in both QA and Demo environments. |
| Reporting | Pass/Fail visibility | Allure integration with `test.step`. |

## Migration / Rollout
No migration required. New functionality only.

## Open Questions
- Is there an index search for Operation Types? (Assuming yes, following the pattern of `TipoCarga`).
