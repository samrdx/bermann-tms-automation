# Jira Native Tooling Specification

## Purpose

This specification governs the behavior of the Jira Native local toolchain used to synchronize Test Sets and audit duplicate Test Cases in Jira. It defines the constraints on file encoding, terminal inputs/outputs, and requirements for UTF-8 preservation during execution.

## Requirements

### Requirement: UTF-8 Console Enforcement
The toolchain MUST configure the PowerShell host console session output encoding, input encoding, and output pipeline stream encoding to UTF-8 at startup. Emojis and Spanish characters with accents MUST be outputted to the host console without corruption (mojibake).

#### Scenario: Displaying Spanish logs and emojis in console
- **GIVEN** a terminal running PowerShell (5.1 or Core) on Windows.
- **WHEN** any of the Jira Native scripts (dispatcher, sync, audit, create) is executed.
- **THEN** the script MUST configure console encoding to UTF-8.
- **AND** console outputs MUST print acentos (e.g., "Propósito", "validación", "Aceptación") and emojis (like `✅`, `⚠`) cleanly.

### Requirement: UTF-8 Environment Loading
The toolchain MUST read configuration files (specifically `.env` files) using UTF-8 encoding. Non-ASCII characters in environment file values MUST be preserved correctly during reading.

#### Scenario: Reading .env files with special characters
- **GIVEN** a `.env` file containing comments or values with non-ASCII characters.
- **WHEN** `Get-JiraAuthHeaders` is called.
- **THEN** the script MUST read the file using UTF-8 encoding.
- **AND** authentication parameters MUST be extracted without character corruption.
