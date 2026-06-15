<#
.SYNOPSIS
  Create a Jira QA Test Set from a parent issue key, link it, and validate.

.DESCRIPTION
  Creates a new Test Set in the QA project linked to the given parent issue
  (User Story, Task, etc.) via the "Test" link type. By default runs validate
  after creation to preview the sync plan.

.PARAMETER ParentKey
  Jira parent issue key, e.g. TMSPROD-2177.

.PARAMETER EnvFile
  Optional path to .env with JIRA_URL, JIRA_EMAIL, JIRA_API_TOKEN.

.PARAMETER DryRun
  Previews Test Set creation without writing to Jira.

.PARAMETER Sync
  After creation, also runs the full sync (not just validate).

.PARAMETER ProjectKey
  Target project key for the Test Set (default: QA).

.NOTES
  Requires curl.exe and PowerShell 5.1+.
  Discovers QA project ID and Test Set issue type dynamically.
#>

param(
  [Parameter(Mandatory = $true)]
  [string]$ParentKey,

  [Parameter(Mandatory = $false)]
  [string]$EnvFile = '',

  [Parameter(Mandatory = $false)]
  [switch]$DryRun,

  [Parameter(Mandatory = $false)]
  [switch]$Sync,

  [Parameter(Mandatory = $false)]
  [string]$ProjectKey = 'QA'
)

# --- UTF-8 encoding: ensure correct display of Spanish accents and emojis ---
$OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::InputEncoding  = [System.Text.Encoding]::UTF8

function Get-JiraAuthHeaders {
  param([string]$EnvFilePath)
  if (-not $EnvFilePath -or -not (Test-Path -LiteralPath $EnvFilePath)) {
    $candidates = @(
      'C:\projects\bermann-tms-automation\.env',
      (Join-Path -Path $PSScriptRoot -ChildPath '..\.env'),
      '.env'
    )
    foreach ($candidate in $candidates) {
      if (Test-Path -LiteralPath $candidate) { $EnvFilePath = $candidate; break }
    }
  }
  if (-not (Test-Path -LiteralPath $EnvFilePath)) { throw 'Cannot find .env file' }

  $lines = Get-Content -LiteralPath $EnvFilePath -Encoding UTF8
  $urlLine = $lines | Where-Object { $_ -like 'JIRA_URL=*' } | Select-Object -First 1
  $emailLine = $lines | Where-Object { $_ -like 'JIRA_EMAIL=*' } | Select-Object -First 1
  $tokenLine = $lines | Where-Object { $_ -like 'JIRA_API_TOKEN=*' } | Select-Object -First 1
  if (-not $urlLine -or -not $emailLine -or -not $tokenLine) { throw 'Missing JIRA_URL, JIRA_EMAIL, or JIRA_API_TOKEN in .env' }

  $url = $urlLine.Substring(9).Trim().TrimEnd('/')
  $email = $emailLine.Substring(11).Trim()
  $token = $tokenLine.Substring(15).Trim()
  $auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("${email}:${token}"))
  return @{ Url = $url; Auth = $auth }
}

function Invoke-CurlUtf8 {
  param([string[]]$Arguments)
  $outputFile = Join-Path -Path $env:TEMP -ChildPath "jira_tscreate_$(Get-Random).json"
  $curlArgs = @($Arguments + @('-o', $outputFile))
  curl.exe @curlArgs 2>$null
  if (-not (Test-Path -LiteralPath $outputFile)) { return '' }
  try {
    return [System.IO.File]::ReadAllText($outputFile, [System.Text.Encoding]::UTF8)
  } finally {
    Remove-Item -LiteralPath $outputFile -Force
  }
}

function Invoke-JiraGet {
  param([string]$Url, [string]$Auth, [string]$Endpoint)
  $curlArgs = @('-s', '-G', "${Url}${Endpoint}", '-H', "Authorization: Basic $Auth", '-H', 'Accept: application/json')
  return Invoke-CurlUtf8 -Arguments $curlArgs
}

function Invoke-JiraPost {
  param([string]$Url, [string]$Auth, [string]$Endpoint, [string]$BodyFile)
  $curlArgs = @('-s', '-X', 'POST', "${Url}${Endpoint}", '-H', "Authorization: Basic $Auth", '-H', 'Content-Type: application/json', '-d', "@$BodyFile")
  return Invoke-CurlUtf8 -Arguments $curlArgs
}

function Save-JsonFile {
  param([string]$Path, [string]$Json)
  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($Path, $Json, $utf8NoBom)
}

function Get-ParentIssue {
  param([string]$Url, [string]$Auth, [string]$Key)
  $result = Invoke-JiraGet -Url $Url -Auth $Auth -Endpoint "/rest/api/3/issue/$Key" --data-urlencode 'fields=summary,project,issuetype'
  try { $parsed = $result | ConvertFrom-Json } catch { throw "Failed to fetch parent issue: $result" }
  if ($parsed.errorMessages) { throw "Parent issue fetch error: $($parsed.errorMessages -join '; ')" }
  return $parsed
}

function Get-ProjectId {
  param([string]$Url, [string]$Auth, [string]$Key)
  $result = Invoke-JiraGet -Url $Url -Auth $Auth -Endpoint "/rest/api/3/project/$Key"
  try { $parsed = $result | ConvertFrom-Json } catch { throw "Failed to fetch project: $result" }
  if ($parsed.errorMessages) { throw "Project fetch error: $($parsed.errorMessages -join '; ')" }
  return @{ Id = $parsed.id; Key = $parsed.key; Name = $parsed.name }
}

function Find-TestSetIssueTypeId {
  param([string]$Url, [string]$Auth, [string]$ProjectId)
  $result = Invoke-JiraGet -Url $Url -Auth $Auth -Endpoint "/rest/api/3/project/$ProjectId" --data-urlencode 'expand=issueTypes'
  try { $parsed = $result | ConvertFrom-Json } catch { return $null }
  if (-not $parsed.issueTypes) { return $null }
  foreach ($t in $parsed.issueTypes) {
    $name = $t.name.Trim()
    if ($name -eq 'Test Set') { return $t.id }
  }
  return $null
}

function New-TestSet {
  param(
    [string]$Url,
    [string]$Auth,
    [string]$ProjectId,
    [string]$IssueTypeId,
    [string]$Summary,
    [switch]$DryRun
  )

  $body = @{
    fields = @{
      project = @{ id = $ProjectId }
      issuetype = @{ id = $IssueTypeId }
      summary = $Summary
      description = @{
        type = 'doc'
        version = 1
        content = @(
          @{ type = 'paragraph'; content = @( @{ type = 'text'; text = "Test Set generado automáticamente." } ) }
        )
      }
    }
  }

  if ($DryRun) {
    Write-Host "  Dry-run: would create Test Set with summary '$Summary'" -ForegroundColor Yellow
    return @{ Key = 'DRY-RUN'; Summary = $Summary }
  }

  $json = $body | ConvertTo-Json -Depth 20
  $bodyFile = Join-Path -Path $env:TEMP -ChildPath "jira_create_ts_$(Get-Random).json"
  Save-JsonFile -Path $bodyFile -Json $json
  try {
    $response = Invoke-JiraPost -Url $Url -Auth $Auth -Endpoint '/rest/api/3/issue' -BodyFile $bodyFile
    try { $parsed = $response | ConvertFrom-Json } catch { throw "Create Test Set response was not valid JSON: $response" }
    if ($parsed.errors) { throw "Create Test Set failed: $($parsed.errors | ConvertTo-Json -Compress)" }
    if (-not $parsed.key) { throw "Create Test Set returned no key: $response" }
    return $parsed
  } finally {
    if (Test-Path -LiteralPath $bodyFile) { Remove-Item -LiteralPath $bodyFile -Force }
  }
}

function New-JiraLink {
  param(
    [string]$Url,
    [string]$Auth,
    [string]$InwardKey,
    [string]$OutwardKey,
    [switch]$DryRun
  )

  $body = @{
    type = @{ name = 'Test' }
    inwardIssue = @{ key = $InwardKey }
    outwardIssue = @{ key = $OutwardKey }
  }

  if ($DryRun) {
    Write-Host "  Dry-run: would link $OutwardKey --tests--> $InwardKey" -ForegroundColor Yellow
    return $true
  }

  $json = $body | ConvertTo-Json -Depth 10
  $bodyFile = Join-Path -Path $env:TEMP -ChildPath "jira_link_ts_$(Get-Random).json"
  Save-JsonFile -Path $bodyFile -Json $json
  try {
    $response = Invoke-JiraPost -Url $Url -Auth $Auth -Endpoint '/rest/api/3/issueLink' -BodyFile $bodyFile
    if ($response -and $response -ne '') {
      try { $parsed = $response | ConvertFrom-Json; if ($parsed.errorMessages) { throw "Link error: $($parsed.errorMessages -join '; ')" } } catch { }
    }
    return $true
  } finally {
    if (Test-Path -LiteralPath $bodyFile) { Remove-Item -LiteralPath $bodyFile -Force }
  }
}

# --- Main ---

$ParentKey = $ParentKey.Trim().ToUpperInvariant()
Write-Host "Jira-native: create Test Set for parent $ParentKey" -ForegroundColor Cyan
Write-Host ""

$authInfo = Get-JiraAuthHeaders -EnvFilePath $EnvFile
$baseUrl = $authInfo.Url
$auth = $authInfo.Auth

# 1. Fetch parent issue
Write-Host "[1] Fetching parent issue $ParentKey..." -ForegroundColor Yellow
$parent = Get-ParentIssue -Url $baseUrl -Auth $auth -Key $ParentKey
$summary = $parent.fields.summary
$parentProjectKey = $parent.fields.project.key
Write-Host "  Summary: $summary"
Write-Host "  Project: $parentProjectKey"
Write-Host ""

# 2. Discover QA project and Test Set issue type
Write-Host "[2] Discovering $ProjectKey project..." -ForegroundColor Yellow
$projectInfo = Get-ProjectId -Url $baseUrl -Auth $auth -Key $ProjectKey
Write-Host "  Project: $($projectInfo.Key) (ID: $($projectInfo.Id))"

$testSetTypeId = Find-TestSetIssueTypeId -Url $baseUrl -Auth $auth -ProjectId $ProjectKey
if (-not $testSetTypeId) {
  Write-Host "  ERROR: Could not find 'Test Set' issue type in $ProjectKey project." -ForegroundColor Red
  exit 1
}
Write-Host "  Test Set issue type ID: $testSetTypeId"
Write-Host ""

# 3. Create Test Set
Write-Host "[3] Creating Test Set in $ProjectKey..." -ForegroundColor Yellow
$tsSummary = "TS | $ParentKey | $summary"
$tsResult = New-TestSet -Url $baseUrl -Auth $auth -ProjectId $projectInfo.Id -IssueTypeId $testSetTypeId -Summary $tsSummary -DryRun:$DryRun
if ($DryRun) {
  Write-Host "  (dry-run) Would create Test Set for $ParentKey" -ForegroundColor Yellow
  Write-Host ""
  Write-Host "Run without -DryRun to create and link."
  exit 0
}
$tsKey = $tsResult.key
Write-Host "  Created: $tsKey ($($tsResult.self))"
Write-Host ""

# 4. Link to parent
Write-Host "[4] Linking $tsKey to $ParentKey..." -ForegroundColor Yellow
$linkOk = New-JiraLink -Url $baseUrl -Auth $auth -InwardKey $ParentKey -OutwardKey $tsKey
if ($linkOk) {
  Write-Host "  Link created: $tsKey --tests--> $ParentKey" -ForegroundColor Green
}
Write-Host ""

# 5. Summary
Write-Host "=== Setup Complete ===" -ForegroundColor Green
Write-Host "Test Set: $tsKey"
Write-Host "Parent:   $ParentKey ($summary)"

if ($Sync) {
  Write-Host ""
  Write-Host "[5] Running sync for $tsKey..." -ForegroundColor Yellow
  $syncScript = Join-Path -Path $PSScriptRoot -ChildPath 'jira-native.ps1'
  & $syncScript sync $tsKey
} else {
  Write-Host ""
  Write-Host "Next step: validate the sync plan (read-only):"
  Write-Host "  npm run jira:validate -- $tsKey"
  Write-Host ""
  Write-Host "If the plan looks correct, sync for real:"
  Write-Host "  npm run jira:sync -- $tsKey"
}

exit 0
