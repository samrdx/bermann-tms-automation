<#
.SYNOPSIS
  Short command dispatcher for Jira-native Test Set sync and audits.

.EXAMPLE
  .\scripts\Jira-native\jira-native.ps1 validate QA-782

.EXAMPLE
  .\scripts\Jira-native\jira-native.ps1 sync-comment QA-782 TMSPROD-2054
#>

param(
  [Parameter(Position = 0)]
  [string]$Command,

  [Parameter(Position = 1)]
  [string]$TestSetKey,

  [Parameter(Position = 2)]
  [string]$ParentIssueKey
)

# --- UTF-8 encoding: ensure correct display of Spanish accents and emojis ---
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::InputEncoding  = [System.Text.Encoding]::UTF8

function Show-Help {
  Write-Host 'Jira-native Test Set sync dispatcher' -ForegroundColor Cyan
  Write-Host ''
  Write-Host 'Usage:'
  Write-Host '  PowerShell -NoProfile -ExecutionPolicy Bypass -File scripts\Jira-native\jira-native.ps1 <command> <test-set-key> [parent-issue-key]'
  Write-Host ''
  Write-Host 'Commands:'
  Write-Host '  validate      Read-only validation. Maps to sync-test-set.ps1 -ValidateOnly'
  Write-Host '  dry-run       Read-only simulation. Maps to sync-test-set.ps1 -DryRun'
  Write-Host '  sync          Real sync. Updates Jira and creates missing Test Cases'
  Write-Host '  sync-comment  Real sync plus Jira result comment. Maps to -CommentResult'
  Write-Host '  duplicates    Read-only duplicate audit for existing Test Case children'
  Write-Host '  duplicates-comment  Duplicate audit plus opt-in Jira recommendation comment'
  Write-Host '  duplicates-close    Duplicate audit plus approved close/label of duplicates (-Approved, never hard delete)'
  Write-Host '  setup         Create Test Set, link to parent, and show validate plan (pass parent key)'
  Write-Host ''
  Write-Host 'Examples:'
  Write-Host '  PowerShell -NoProfile -ExecutionPolicy Bypass -File scripts\Jira-native\jira-native.ps1 validate QA-782'
  Write-Host '  PowerShell -NoProfile -ExecutionPolicy Bypass -File scripts\Jira-native\jira-native.ps1 validate QA-782 TMSPROD-2054'
  Write-Host '  PowerShell -NoProfile -ExecutionPolicy Bypass -File scripts\Jira-native\jira-native.ps1 duplicates QA-759'
  Write-Host '  PowerShell -NoProfile -ExecutionPolicy Bypass -File scripts\Jira-native\jira-native.ps1 duplicates-comment QA-759'
  Write-Host '  PowerShell -NoProfile -ExecutionPolicy Bypass -File scripts\Jira-native\jira-native.ps1 setup TMSPROD-2177'
}

if (-not $Command -or -not $TestSetKey) {
  Show-Help
  exit 1
}

$normalizedCommand = $Command.Trim().ToLowerInvariant()
$syncScript = Join-Path -Path $PSScriptRoot -ChildPath 'sync-test-set.ps1'
$duplicatesScript = Join-Path -Path $PSScriptRoot -ChildPath 'audit-duplicates.ps1'
$createTsScript = Join-Path -Path $PSScriptRoot -ChildPath 'create-test-set.ps1'

if ($normalizedCommand -eq 'setup') {
  if (-not (Test-Path -LiteralPath $createTsScript)) {
    Write-Error "Cannot find create-test-set script: $createTsScript"
    exit 1
  }
  & $createTsScript -ParentKey $TestSetKey.Trim().ToUpperInvariant()
  exit $LASTEXITCODE
}

if ($normalizedCommand -eq 'duplicates' -or $normalizedCommand -eq 'duplicates-comment' -or $normalizedCommand -eq 'duplicates-close') {
  if (-not (Test-Path -LiteralPath $duplicatesScript)) {
    Write-Error "Cannot find duplicate audit script: $duplicatesScript"
    exit 1
  }
  $duplicatesParams = @{ TestSetKey = $TestSetKey.Trim().ToUpperInvariant() }
  if ($normalizedCommand -eq 'duplicates-comment') { $duplicatesParams.CommentResult = $true }
  if ($normalizedCommand -eq 'duplicates-close') { $duplicatesParams.Approved = $true }
  & $duplicatesScript @duplicatesParams
  exit $LASTEXITCODE
}

if (-not (Test-Path -LiteralPath $syncScript)) {
  Write-Error "Cannot find sync script: $syncScript"
  exit 1
}

$syncParams = @{ TestSetKey = $TestSetKey.Trim().ToUpperInvariant() }

switch ($normalizedCommand) {
  'validate' { $syncParams.ValidateOnly = $true }
  'dry-run' { $syncParams.DryRun = $true }
  'sync' { }
  'sync-comment' { $syncParams.CommentResult = $true }
  default {
    Write-Host "Unknown command: $Command" -ForegroundColor Red
    Write-Host ''
    Show-Help
    exit 1
  }
}

if ($ParentIssueKey) {
  $syncParams.ParentIssueKey = $ParentIssueKey.Trim().ToUpperInvariant()
}

& $syncScript @syncParams
