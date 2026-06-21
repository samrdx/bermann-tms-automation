# Design: Truth Source Dummys (manual-happy-paths.md)

## Technical Approach
We will modify the contract seeding tests (`contrato-crear.test.ts` and `contrato2cliente-crear.test.ts`) to capture dynamic contract metadata (IDs, contract numbers, types, routes, expiration dates) and store them in the environment's seed JSON file (`smoke-seed-data-${env}.json` or `e2e-seed-data-${env}.json`). Currently, the transportista cost contract is only stored in `entityTracker` and is missing from the transient seed JSON.
A new helper utility, `happy-truth-generator.ts`, will read these seed files and static credentials to compile a clean Markdown table which is then synchronously written to `docs/manual-happy-paths.md` for developers and QAs.

## Architecture Decisions

| Option | Tradeoff | Decision |
|---|---|---|
| **Sync vs Async FS Operations** | Async operations can lead to partial or missing writes if the test process exits immediately. Sync blocks but ensures safety. | **Use synchronous operations** (`fs.writeFileSync`, `fs.readFileSync`) to ensure the file is completely written before tests finish. |
| **Hook / Trigger Placement** | Running in global teardown lacks spec test contexts. Running inside contract test files ensures immediate update. | **Trigger generation directly** at the end of `contrato-crear.test.ts` and `contrato2cliente-crear.test.ts`. |
| **Output File Location** | Storing in a temp dir is clean but harder to locate. Storing in `docs/` is intuitive. | **Write to `docs/manual-happy-paths.md`** and recommend adding it to `.gitignore` to avoid git churn. |

## Data Flow
```
[Tests: Contrato/Cliente] ──(Dynamic IDs/Routes)──> [smoke-seed-data-dev.json]
                                                             │
                                                        (Read Seed File)
                                                             ▼
[Static Credentials] ─────────────────────────────> [happy-truth-generator.ts]
                                                             │
                                                        (Sync Write)
                                                             ▼
                                                [docs/manual-happy-paths.md]
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `tests/helpers/happy-truth-generator.ts` | Create | Script reading dynamic seed data and static credentials, formatting the markdown table, and writing it. |
| `tests/contrato-crear.test.ts` | Modify | Update to capture generated cost/transportista contract details and write to seed JSON, then call generator. |
| `tests/contrato2cliente-crear.test.ts` | Modify | Update to capture generated client contract details and write to seed JSON, then call generator. |
| `docs/manual-happy-paths.md` | Create | Dynamically generated Markdown file detailing the credentials and active test entities. |
| `.gitignore` | Modify | Add `docs/manual-happy-paths.md` to prevent repo churn. |

## Interfaces / Contracts

```typescript
interface SeedData {
  transportista?: { id: string; name: string };
  cliente?: { id: string; name: string };
  driver?: { id: string; rut: string; name: string };
  vehicle?: { id: string; patente: string };
  clientContract?: ContractDetails;
  transportistaContract?: ContractDetails;
}

interface ContractDetails {
  id: string;
  number: string;
  type: 'ruta' | 'macrozona';
  routes: string[];
  expirationDate: string;
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | Markdown Table Generation | Validate that mock data parses correctly into Markdown rows. |
| Integration | Seeding Execution Flow | Verify that running the test suites correctly outputs `docs/manual-happy-paths.md` with realistic values. |

## Migration / Rollout
No database migration needed. This is an improvement to local test automation docs.

## Open Questions
- [x] Should `docs/manual-happy-paths.md` be added to `.gitignore`? (Yes, added to .gitignore)
- [ ] Should we include dynamic environment urls (e.g. TMS login portal) to the top of the table?
