---
name: jql-tickets
description: >
  Provides the predefined JQL query for "ALL READY TO TEST" filter.
  Trigger: When the user asks for JQL related to "tickets" or "ready to test" or specifically types "/tickets".
license: Apache-2.0
metadata:
  author: tms-qa
  version: "1.0"
---

## When to Use

- When the user asks for the JQL query for tickets ready for testing.
- When the user types `/tickets`.

## Critical Patterns

The JQL query for the "ALL READY TO TEST" filter is:
`status IN ("READY FOR TEST", "Test in progress") AND assignee != 5ffcdf92b66825010ee9e248 ORDER BY assignee ASC, created DESC`

## Commands

```
/tickets
```
