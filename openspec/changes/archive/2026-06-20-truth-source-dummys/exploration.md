## Exploration: Registry File (Source of Truth) for Manual Testing

### Current State
Currently, E2E test data is dynamically seeded via entity setup projects or scripts (e.g., `npm run qa:seed:legacy`). The output of these seeding runs is stored as transient JSON files (e.g., `smoke-seed-data-QA.json` or `e2e-seed-data-QA.json`) under the gitignored `playwright/.data/` directory.
Tests load this data using the `OperationalDataLoader.ts` helper, which relies on paths resolved by `DataPathHelper.ts`.
This approach works well for automated regression suites but does not provide a stable, human-readable, and extensible registry for manual testers. The transient data is overwritten frequently, lacks credentials, does not explicitly link transportistas to contracts or route lists, and does not record the contract type (`ruta` or `macrozona`).

### Affected Areas
- `tests/api-helpers/DataPathHelper.ts` — Needs to support resolving the path for the manual test registry file (e.g. `getManualTestDataPath()`).
- `tests/fixtures/manual-test-data.template.json` — A static skeleton/template JSON file to check into Git.
- `tests/fixtures/manual-test-data-QA.json` (and other environments) — The dynamic registry files containing the generated dummys, added to `.gitignore`.
- `tests/api-helpers/ManualRegistryHelper.ts` — A new helper class to handle loading, reading, and updating registry variables (e.g. contract details, routes, and credentials).
- `tests/helpers/auth.setup.ts` / Seeding Scripts — Setup workflows that generate transportistas, contracts, and routes will be modified to write their outputs to the registry.

### Approaches
1. **Approach 1: Single Appended JSON File (`tests/fixtures/manual-test-data.json`)**
   - **Description**: A unified, static JSON file in `tests/fixtures/` that stores credentials and generated entities.
   - **Pros**: Direct integration with existing Node fs/path helpers; easy for manual testers to locate a single file.
   - **Cons**: Merging data from different environments (e.g., QA and Demo) into one file can cause confusion and collisions.
   - **Effort**: Low

2. **Approach 2: Environment-Suffixed JSON Registry (`tests/fixtures/manual-test-data-{env}.json`)**
   - **Description**: Generates separate registry files for each environment (e.g., `manual-test-data-qa.json`, `manual-test-data-demo.json`), matching the existing env-scoped naming pattern used in `DataPathHelper.ts`.
   - **Pros**: Clean segregation of test data across environments; prevents cross-contamination.
   - **Cons**: Slightly more file-lookup logic in `DataPathHelper.ts`.
   - **Effort**: Low

3. **Approach 3: YAML-Based Registry**
   - **Description**: Uses a YAML file format instead of JSON to allow comments, making it highly readable for manual testers.
   - **Pros**: Humans can read, edit, and add manual annotations/comments directly in the file.
   - **Cons**: Requires a third-party NPM dependency (like `yaml` or `js-yaml`) to parse and serialize back during automated execution, which adds bloat and risks syntax errors during dynamic writing.
   - **Effort**: Medium

### Recommendation
We recommend **Approach 2** (Environment-Suffixed JSON Registry) with a helper class `ManualRegistryHelper.ts` to manage reading and writing.

**Registry Schema Proposal (`tests/fixtures/manual-test-data-QA.json`):**
```json
{
  "lastUpdated": "2026-06-20T23:28:11Z",
  "credentials": {
    "admin": {
      "username": "admin@bermann.cl",
      "password": "SecretPassword123"
    },
    "transportista": {
      "username": "qa_tra_andes@gmail.com",
      "password": "SecretPassword123"
    }
  },
  "transportistas": [
    {
      "id": "227",
      "nombre": "Qa_tra_andes_421",
      "rut": "39331742-6",
      "hasContract": true,
      "contract": {
        "id": "388",
        "nroContrato": "063527",
        "type": "ruta",
        "routes": [
          "Ruta Norte-Sur",
          "Santiago - Antofagasta"
        ]
      },
      "conductor": {
        "nombre": "Qa_con_ana Qa_con_soto",
        "rut": "72.488.439-3"
      },
      "vehiculo": {
        "patente": "Qa_veh_RM5222"
      }
    }
  ]
}
```

**Implementation Steps:**
1. Create a `tests/fixtures/manual-test-data.template.json` containing empty placeholders:
   ```json
   {
     "lastUpdated": "",
     "credentials": {},
     "transportistas": []
   }
   ```
2. Add `tests/fixtures/manual-test-data-*.json` to the project `.gitignore`.
3. Add helper method `getManualTestDataPath()` in `DataPathHelper.ts` targeting `tests/fixtures/manual-test-data-${env}.json`.
4. Create `tests/api-helpers/ManualRegistryHelper.ts` to expose methods such as:
   - `writeCredentials(role, username, password)`
   - `registerTransportista(transportistaData)`
   - `updateContractInfo(transportistaId, contractData)`
5. Update seeding scripts to call these methods during runtime setup.

### Risks
- **Parallel Write Collisions**: If tests run in parallel (multiple workers) and write to the same registry, the file may become corrupted.
  *Mitigation*: Restrict registry updates to sequential setup suites (which run before parallel worker tests start) or implement synchronous file operations.
- **Git Merge Conflicts**: Dynamic test runs updating the registry locally could pollute git commits.
  *Mitigation*: Keep the actual data files gitignored and only commit the template.
- **Data Obsolescence**: System environments change, and older seeded records may get purged or deactivated.
  *Mitigation*: Always regenerate and rewrite the registry on a clean seeding run.

### Ready for Proposal
Yes — The orchestrator should proceed with creating the change proposal file and setting up the specification (delta spec) for this implementation.
