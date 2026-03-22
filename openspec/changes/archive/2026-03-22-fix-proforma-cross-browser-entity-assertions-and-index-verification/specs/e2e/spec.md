# Delta for e2e

## ADDED Requirements

### Requirement: Proforma Cross-Browser Entity Verification Contract

Proforma end-to-end suites MUST validate entity creation using a browser-agnostic verification sequence that is deterministic in Chromium and Firefox.

#### Scenario: Happy path - created Proforma is verified consistently in Chromium and Firefox

- GIVEN a Proforma is created successfully from the UI flow
- WHEN the suite executes post-save verification
- THEN the suite MUST wait for index/list readiness before asserting row content
- AND the suite MUST assert business-critical row fields for the created entity
- AND the same assertions MUST pass without browser-specific branching in Chromium and Firefox

#### Scenario: Edge case - delayed table rendering after successful creation

- GIVEN the Proforma save request succeeds but index rows render with delay
- WHEN verification starts immediately after redirect to `/proforma/index`
- THEN the suite MUST use deterministic loaded-state checks before row assertions
- AND the suite SHALL fail only when readiness and lookup criteria are not met within the defined timeout

### Requirement: Deterministic `/proforma/index` Lookup and ID Validation

Verification on `/proforma/index` MUST retrieve and validate the created Proforma identifier using stable lookup semantics that reject empty or malformed IDs.

#### Scenario: Happy path - index returns a valid Proforma identifier

- GIVEN `/proforma/index` has loaded and contains the newly created Proforma row
- WHEN the suite performs lookup and extracts the Proforma identifier
- THEN the identifier MUST be present and non-empty
- AND the identifier MUST match the expected numeric or system-valid format
- AND the resulting assertion MUST confirm the row corresponds to the created entity

#### Scenario: Edge case - lookup finds row but extracted ID is invalid

- GIVEN the expected row is displayed in `/proforma/index`
- WHEN extracted identifier value is empty, null, or malformed
- THEN verification MUST fail with an explicit ID validation error
- AND the failure output SHOULD include lookup context needed for debugging

### Requirement: Page Object and Test Assertion Responsibility Boundary

The verification contract SHALL separate low-level index readiness and row retrieval logic from high-level business assertions to reduce flaky checks and duplicated logic.

#### Scenario: Happy path - responsibilities are executed at the correct layer

- GIVEN the Proforma suite triggers a create-and-verify flow
- WHEN verification runs through page object and test layers
- THEN page object methods MUST provide stable readiness, lookup, and extraction primitives
- AND test cases MUST assert business outcomes using those primitives

#### Scenario: Edge case - duplicated assertion logic appears across layers

- GIVEN both page object and test layer attempt to assert the same business condition
- WHEN maintenance updates are introduced for cross-browser behavior
- THEN the contract SHOULD require consolidation to a single assertion owner
- AND duplicated assertions MAY be removed to avoid contradictory failures
