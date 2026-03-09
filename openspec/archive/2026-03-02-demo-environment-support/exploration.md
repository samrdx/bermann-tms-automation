## Exploration: Demo Environment Support in Tests & package.json Updates

### Current State

Currently, the Bermann TMS QA Automation Framework has multiple environments configured (`QA` and `Demo`). The `package.json` contains test scripts mostly geared towards the `QA` environment by default. There are specific conditional logics built into the tests (e.g., using `isDemoMode()`) in entity creation tests (`vehiculo-crear.test.ts`, `transportistas-crear.test.ts`, `cliente-crear.test.ts`) which prepare them to run safely on Demo. Contract tests (`contrato-crear.test.ts`) have also been actively adapted for the Demo environment previously.

### Affected Areas

- `package.json` — Needs to be organized with clear Demo scripts or comments indicating cross-environment execution capability.

### Approaches

1. **Approach 1: Duplicate Scripts with `cross-env ENV=DEMO` Prefix**
   - Pros: Explicit commands for every granular test for Demo.
   - Cons: Clutters `package.json` significantly.
   - Effort: Low

2. **Approach 2: Add Dedicated Demo Suites & Clarify Existing Scripts using Comments**
   - Pros: Keeps `package.json` clean. Uses `cross-env` to define clear Demo runs for supported flows (e.g. `test:demo:entidades`, `test:demo:contratos`). Comments explain how to use `ENV=DEMO` generically.
   - Cons: Still requires reading the scripts to find Demo specifics.
   - Effort: Low

### Recommendation

**Approach 2**: The framework supports environments via `ENV=DEMO`. We should add clear comments in `package.json` explaining this capability, and introduce dedicated Demo suite scripts (e.g., `test:demo:entidades`, `test:demo:setup`) to make Demo execution a first-class citizen without duplicating every single granular script.

Based on codebase analysis, the tests explicitly ready for Demo are:

- `tests/e2e/modules/01-entidades/transport/transportistas-crear.test.ts`
- `tests/e2e/modules/01-entidades/clientes/cliente-crear.test.ts`
- `tests/e2e/modules/01-entidades/vehiculos/vehiculo-crear.test.ts`
- `tests/e2e/modules/01-entidades/conductor/conductor-crear.test.ts`
- `tests/e2e/modules/02-operaciones/contratos/contrato-crear.test.ts`

### Risks

- Some modules (like trips/ultima-milla or contrato2cliente) might not have been fully stabilized for the Demo environment yet.

### Ready for Proposal

Yes
