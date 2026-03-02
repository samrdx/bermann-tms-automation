# Proposal: Demo Environment Support in package.json

## Intent

The user needs to clearly identify which automated tests are fully supported in the Demo environment, reflect this capability in `package.json` through comments or new scripts, and then run a complete execution of all existing tests in the order they appear in `package.json`.

## Scope

### In Scope

- Document existing tests compatible with the Demo environment (Transportista, Cliente, Vehiculo, Conductor, Contrato-Costo).
- Update `package.json` with descriptive comments about how to execute tests in the Demo environment.
- Add specific `test:demo:*` command suites for easily running supported flows in Demo environment using `cross-env ENV=DEMO`.
- Execute all existing tests sequentially to verify system stability as requested.

### Out of Scope

- Fixing or stabilizing tests that currently fail in Demo (if any unexpected failures occur during the sequential run, they will be reported and handled separately).

## Approach

1. Modify `package.json` to insert clearly labeled sections for Demo environments using `cross-env ENV=DEMO`.
2. Provide Demo specific commands like `test:demo:entidades` and `test:demo:contratos`.
3. Provide an implementation plan to the user for review.
4. Upon approval, apply the `package.json` changes.
5. Execute all existing tests sequentially as defined in the `QA` suite of `package.json` (running `QA` to verify baseline, or do you want the full run to be on `Demo`? The prompt says "una prueba de todos los test que tenemos", implying a normal complete regression run, typically on QA).

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `package.json` | Modified | Add comments and `test:demo:*` scripts. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Sequence test failure | High | Since we must execute all tests in order, a failure in early tests (e.g. setup) might cascade. We will run them sequentially and report any failures. |

## Rollback Plan

Revert changes to `package.json` using `git restore package.json`.

## Success Criteria

- [ ] `package.json` clearly identifies and provides commands for Demo environment tests.
- [ ] User approves the SDD proposal.
- [ ] A sequential test execution of all tests is completed.
