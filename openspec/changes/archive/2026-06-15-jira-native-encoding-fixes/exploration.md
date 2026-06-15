## Exploration: UTF-8 encoding support and rich Spanish/accent normalization in Jira Native scripts

### Current State
Currently:
1. `Get-Content -LiteralPath $EnvFilePath` in `Get-JiraAuthHeaders` (in `sync-test-set.ps1`, `create-test-set.ps1`, and `audit-duplicates.ps1`) does not specify `-Encoding UTF8`. On Windows PowerShell (5.1), this reads using the system ANSI page, potentially corrupting non-ASCII characters in path names or variables if `.env` contains special characters.
2. In PowerShell, the default Console Input and Output encoding (and `$OutputEncoding`) is often set to ANSI (windows-1252), which causes terminal logs containing Spanish accents (like `Propósito`, `validación`, `Aceptación`) to be printed as mojibake.
3. The scripts define emoji variables and Spanish texts utilizing unicode conversion (like `[char]0x00F3` etc.) to mitigate direct string corruption in ANSI-saved files, but this doesn't guarantee correct display if the terminal's console encoding itself is ANSI.

### Affected Areas
- `scripts/Jira-native/sync-test-set.ps1` — `Get-JiraAuthHeaders` environment reading and script initialization.
- `scripts/Jira-native/create-test-set.ps1` — `Get-JiraAuthHeaders` and script initialization.
- `scripts/Jira-native/audit-duplicates.ps1` — `Get-JiraAuthHeaders` and script initialization.
- `scripts/Jira-native/jira-native.ps1` — entry point dispatcher, console encoding setup.

### Approaches
1. **Force UTF-8 Console and File Encoding in Scripts** — Set `$OutputEncoding`, `[Console]::OutputEncoding`, and `[Console]::InputEncoding` to UTF-8 at the beginning of each PowerShell script entry point, and add `-Encoding UTF8` to all `Get-Content` calls.
   - Pros: Correctly handles all Spanish accents and emojis across all PowerShell sessions and host terminals on Windows. No mojibake in logs or terminal.
   - Cons: Minimal overhead of setting console properties at startup (safe and standard).
   - Effort: Low

2. **Handle encoding outside via CMD/Bash wrappers** — Use `chcp 65001` in batch files or runner environments.
   - Pros: Keeps PowerShell scripts unchanged.
   - Cons: Doesn't fix direct execution of `.ps1` files from user terminals; depends on the runner configuration.
   - Effort: Medium

### Recommendation
Approach 1 is the recommended approach. It guarantees self-contained encoding correctness, protecting the script outputs regardless of how they are invoked (via the dispatcher, node, or direct PowerShell execution).

### Risks
- Changing `[Console]::OutputEncoding` might affect other scripts in the same session if they run inside the same persistent PowerShell process. However, this is standard and highly recommended for modern UTF-8 environments.

### Ready for Proposal
Yes — I will generate the proposal artifact.
