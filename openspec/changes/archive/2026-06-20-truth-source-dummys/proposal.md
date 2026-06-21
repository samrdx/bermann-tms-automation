# Proposal: truth-source-dummys

## Intent

Provide a single, reliable Markdown 'happy path' registry detailing active test entities for manual testers, overwritten on each run using static credentials and dynamic contract/route registration.

## Scope

### In Scope
- Create `docs/manual-happy-paths.md` with QA/DEMO environment sections.
- Overwrite registry file on each run to show only one active 'happy path' set of entities.
- Dynamic contract and route registration during execution.
- Include static credentials in registry for reference.

### Out of Scope
- Accumulating historical entity data across runs.
- Automating other non-happy path flows.

## Capabilities

### New Capabilities
- `happy-path-registry`: Requirements for generating and maintaining the single active happy path markdown document.

### Modified Capabilities
None

## Approach

Create a helper to format active seeded carrier, vehicle, driver, and contract details into markdown. Overwrite `docs/manual-happy-paths.md` during the seeding phase. Integrate dynamic API calls to register contracts/routes during run.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `docs/manual-happy-paths.md` | New | Markdown registry for QA/DEMO environments. |
| `tests/helpers/happy-truth-generator.ts` | New | Formatter and file writer for the registry. |
| `tests/setup.js` | Modified | Hook to trigger registry file overwrite on seeding. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Concurrent test runs overwriting each other's registry | Med | Restrict registry updates to a sequential pre-test seeding phase |

## Rollback Plan

Delete generated registry file and revert test setup/helper files using Git.

## Dependencies

- API endpoints for dynamic route and contract creation.

## Success Criteria

- [ ] `docs/manual-happy-paths.md` exists and contains one active entity set per environment.
- [ ] Subsequent runs overwrite the file instead of appending.
- [ ] Entity sections show correct Name, RUT, Patente, ID, and Contract info.
