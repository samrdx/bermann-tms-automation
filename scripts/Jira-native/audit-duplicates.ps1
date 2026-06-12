<#
.SYNOPSIS
  Audit existing duplicate Jira-native Test Cases under a Test Set.

.DESCRIPTION
  Reads child issues for a Test Set and reports exact/semantic duplicate groups.
  By default this script is read-only. With -CommentResult it can post an opt-in
  recommendation comment to the Test Set. With -Approved it can close/label
  duplicate Test Cases. It never deletes, transitions, labels, or updates Jira
  issues without explicit -Approved.

.PARAMETER TestSetKey
  Jira Test Set issue key, e.g. QA-759.

.PARAMETER EnvFile
  Optional path to .env with JIRA_URL, JIRA_EMAIL, JIRA_API_TOKEN.

.PARAMETER CommentResult
  Posts a structured Jira comment only when duplicate groups are detected.

.PARAMETER DryRun
  Previews comment output without posting it.

.PARAMETER CommentClean
  Allows posting a short OK comment when no duplicate groups are detected.

.PARAMETER Approved
  Allows destructive/semidestructive actions: close, label, or close-and-label
  duplicate Test Cases. Without this switch, everything remains read-only even
  if -Action is specified.

.PARAMETER Action
  What to do with duplicates when -Approved is active: Close (transition only),
  Label (add 'duplicate' label only), CloseAndLabel (both, default).
.NOTES
  Requires curl.exe and PowerShell 5.1+.
#>

param(
  [Parameter(Mandatory = $false)]
  [string]$TestSetKey = '',

  [Parameter(Mandatory = $false)]
  [string]$EnvFile = '',

  [Parameter(Mandatory = $false)]
  [switch]$CommentResult,

  [Parameter(Mandatory = $false)]
  [switch]$DryRun,

  [Parameter(Mandatory = $false)]
  [switch]$CommentClean,

  [Parameter(Mandatory = $false)]
  [switch]$Approved,

  [Parameter(Mandatory = $false)]
  [ValidateSet('Close', 'Label', 'CloseAndLabel')]
  [string]$Action = 'CloseAndLabel'
)

function Get-Utf32Char {
  param([int]$CodePoint)
  return [char]::ConvertFromUtf32($CodePoint)
}

function Save-JsonFile {
  param([string]$Path, [string]$Json)
  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($Path, $Json, $utf8NoBom)
}

function Normalize-Whitespace {
  param([string]$Text)
  if (-not $Text) { return '' }
  return (($Text -replace '\s+', ' ').Trim())
}

function Normalize-SemanticText {
  param([string]$Text)
  $clean = Normalize-Whitespace -Text $Text
  if (-not $clean) { return '' }

  $normalized = $clean.Normalize([Text.NormalizationForm]::FormD)
  $withoutAccents = New-Object System.Text.StringBuilder
  foreach ($char in $normalized.ToCharArray()) {
    if ([Globalization.CharUnicodeInfo]::GetUnicodeCategory($char) -ne [Globalization.UnicodeCategory]::NonSpacingMark) {
      [void]$withoutAccents.Append($char)
    }
  }

  $ascii = $withoutAccents.ToString().Normalize([Text.NormalizationForm]::FormC).ToLowerInvariant()
  return (($ascii -replace '[^\p{L}\p{Nd}]+', ' ') -replace '\s+', ' ').Trim()
}

function Get-TestCaseTitleSemanticText {
  param([string]$Summary)
  $text = Normalize-Whitespace -Text $Summary
  if (-not $text) { return '' }
  $text = $text -replace '^[A-Z]+-\d+\s*\|\s*TC\d+\s*:\s*', ''
  return $text
}

function Get-AdfText {
  param($Nodes)
  $text = ''
  if (-not $Nodes) { return $text }
  foreach ($node in $Nodes) {
    if ($node.type -eq 'text' -and $node.text) { $text += $node.text }
    elseif ($node.content) { $text += Get-AdfText -Nodes $node.content }
    elseif ($node.type -eq 'hardBreak') { $text += "`n" }
  }
  return $text
}

function Get-TestCaseScenarioTextFromAdf {
  param($Description)
  if (-not $Description) { return '' }
  $text = Normalize-Whitespace -Text (Get-AdfText -Nodes $Description.content)
  if ($text -match 'ESCENARIO:\s*(.*?)(?:\s*PASOS DE PRUEBA|\s*Given\b|\s*When\b|\s*Then\b|\s*RESULTADO ACTUAL|$)') {
    return Normalize-Whitespace -Text $Matches[1]
  }
  return ''
}

function Get-TestCaseGwtTextFromAdf {
  param($Description)
  if (-not $Description) { return '' }
  $text = Normalize-Whitespace -Text (Get-AdfText -Nodes $Description.content)
  if ($text -match '(?is)\bGiven\s+(.*?)\s+When\s+(.*?)\s+Then\s+(.*?)(?:\s*RESULTADO ACTUAL|\s*REGISTRO DE|$)') {
    return Normalize-Whitespace -Text "Given $($Matches[1]) When $($Matches[2]) Then $($Matches[3])"
  }
  return ''
}

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

  $lines = Get-Content -LiteralPath $EnvFilePath
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

  $outputFile = Join-Path -Path $env:TEMP -ChildPath "jira_duplicate_audit_$(Get-Random).json"
  $curlArgs = @($Arguments + @('-o', $outputFile))
  curl.exe @curlArgs 2>$null

  if (-not (Test-Path -LiteralPath $outputFile)) { return '' }
  try {
    return [System.IO.File]::ReadAllText($outputFile, [System.Text.Encoding]::UTF8)
  } finally {
    Remove-Item -LiteralPath $outputFile -Force
  }
}

function Invoke-JiraPost {
  param([string]$Url, [string]$Auth, [string]$Endpoint, [string]$BodyFile)
  $curlArgs = @('-s', '-X', 'POST', "${Url}${Endpoint}", '-H', "Authorization: Basic $Auth", '-H', 'Content-Type: application/json', '-d', "@$BodyFile")
  return Invoke-CurlUtf8 -Arguments $curlArgs
}

function Add-JiraComment {
  param([string]$Url, [string]$Auth, [string]$IssueKey, [hashtable]$AdfDoc)

  $body = @{ body = $AdfDoc }
  $json = $body | ConvertTo-Json -Depth 20
  $commentFile = Join-Path -Path $env:TEMP -ChildPath "jira_duplicate_comment_$(Get-Random).json"
  Save-JsonFile -Path $commentFile -Json $json
  try {
    return Invoke-JiraPost -Url $Url -Auth $Auth -Endpoint "/rest/api/3/issue/$IssueKey/comment" -BodyFile $commentFile
  } finally {
    if (Test-Path -LiteralPath $commentFile) { Remove-Item -LiteralPath $commentFile -Force }
  }
}

function Invoke-JiraGet {
  param([string]$Url, [string]$Auth, [string]$Endpoint)
  $curlArgs = @('-s', '-G', "${Url}${Endpoint}", '-H', "Authorization: Basic $Auth", '-H', 'Accept: application/json')
  return Invoke-CurlUtf8 -Arguments $curlArgs
}

function Invoke-JiraPut {
  param([string]$Url, [string]$Auth, [string]$Endpoint, [string]$BodyFile)
  $curlArgs = @('-s', '-X', 'PUT', "${Url}${Endpoint}", '-H', "Authorization: Basic $Auth", '-H', 'Content-Type: application/json', '-d', "@$BodyFile")
  return Invoke-CurlUtf8 -Arguments $curlArgs
}

function Get-JiraTransitionId {
  param([string]$Url, [string]$Auth, [string]$IssueKey)

  $result = Invoke-JiraGet -Url $Url -Auth $Auth -Endpoint "/rest/api/3/issue/$IssueKey/transitions"
  try { $parsed = $result | ConvertFrom-Json } catch { return $null }
  if (-not $parsed.transitions) { return $null }

  $closeNames = @('Close', 'Closed', 'Done', 'Resolve', 'Cerrar', 'Cerrado', 'Hecho', 'Finalizar', 'Finalizado')
  foreach ($t in $parsed.transitions) {
    $name = ($t.name -replace '\s+', ' ').Trim()
    $toName = ($t.to.name -replace '\s+', ' ').Trim()
    foreach ($candidate in $closeNames) {
      if ($name -eq $candidate -or $toName -eq $candidate -or $name -like "*$candidate*" -or $toName -like "*$candidate*") {
        return $t.id
      }
    }
  }
  return $null
}

function Invoke-JiraTransition {
  param([string]$Url, [string]$Auth, [string]$IssueKey, [string]$TransitionId)

  $body = @{ transition = @{ id = $TransitionId } }
  $json = $body | ConvertTo-Json -Depth 10
  $transFile = Join-Path -Path $env:TEMP -ChildPath "jira_transition_$(Get-Random).json"
  Save-JsonFile -Path $transFile -Json $json
  try {
    $response = Invoke-JiraPost -Url $Url -Auth $Auth -Endpoint "/rest/api/3/issue/$IssueKey/transitions" -BodyFile $transFile
    if (-not $response) { return $true }
    try { $parsed = $response | ConvertFrom-Json; return (-not $parsed.errorMessages) } catch { return $false }
  } finally {
    if (Test-Path -LiteralPath $transFile) { Remove-Item -LiteralPath $transFile -Force }
  }
}

function Add-JiraLabel {
  param([string]$Url, [string]$Auth, [string]$IssueKey, [string]$Label)

  $body = @{ update = @{ labels = @(@{ add = $Label }) } }
  $json = $body | ConvertTo-Json -Depth 10
  $labelFile = Join-Path -Path $env:TEMP -ChildPath "jira_label_$(Get-Random).json"
  Save-JsonFile -Path $labelFile -Json $json
  try {
    $response = Invoke-JiraPut -Url $Url -Auth $Auth -Endpoint "/rest/api/3/issue/$IssueKey" -BodyFile $labelFile
    if (-not $response) { return $true }
    try { $parsed = $response | ConvertFrom-Json; return (-not $parsed.errorMessages) } catch { return $false }
  } finally {
    if (Test-Path -LiteralPath $labelFile) { Remove-Item -LiteralPath $labelFile -Force }
  }
}

function Close-DuplicateGroup {
  param(
    [string]$Url,
    [string]$Auth,
    [string]$TestSetKey,
    [array]$DuplicateGroups,
    [string]$Action,
    [switch]$DryRun
  )

  $totalClosed = 0
  $totalLabeled = 0
  $errors = @()

  for ($i = 0; $i -lt $DuplicateGroups.Count; $i++) {
    $group = $DuplicateGroups[$i]
    $keep = Select-KeepCandidate -Records $group.Records
    $toClose = @($group.Records | Where-Object { $_.Key -ne $keep.Key })

    foreach ($record in $toClose) {
      if ($Action -eq 'CloseAndLabel' -or $Action -eq 'Close') {
        $transitionId = Get-JiraTransitionId -Url $Url -Auth $Auth -IssueKey $record.Key
        if (-not $transitionId) {
          $errors += "Group $($i+1): $($record.Key) has no Close/Closed/Done transition available"
        } elseif ($DryRun) {
          Write-Host "  Dry-run: would transition $($record.Key) to Closed" -ForegroundColor Yellow
          $totalClosed++
        } else {
          $ok = Invoke-JiraTransition -Url $Url -Auth $Auth -IssueKey $record.Key -TransitionId $transitionId
          if ($ok) {
            Write-Host "  Transitioned $($record.Key) to Closed status" -ForegroundColor Green
            $totalClosed++
          } else {
            $errors += "Group $($i+1): transition failed for $($record.Key)"
          }
        }
      }

      if ($Action -eq 'CloseAndLabel' -or $Action -eq 'Label') {
        if ($DryRun) {
          Write-Host "  Dry-run: would add label 'duplicate' to $($record.Key)" -ForegroundColor Yellow
          $totalLabeled++
        } else {
          $ok = Add-JiraLabel -Url $Url -Auth $Auth -IssueKey $record.Key -Label 'duplicate'
          if ($ok) {
            Write-Host "  Added label 'duplicate' to $($record.Key)" -ForegroundColor Green
            $totalLabeled++
          } else {
            $errors += "Group $($i+1): label add failed for $($record.Key)"
          }
        }
      }
    }
  }

  if (-not $DryRun -and ($totalClosed -gt 0 -or $totalLabeled -gt 0)) {
    $summaryAdf = @{
      type = 'doc'
      version = 1
      content = @(
        (New-AdfHeading -Level 3 -Text "$(Get-Utf32Char -CodePoint 0x2705) Jira-native BETA: duplicates closed/labeled")
        (New-AdfLabeledParagraph -Label 'Action' -Value $Action)
        (New-AdfLabeledParagraph -Label 'Total closed' -Value ([string]$totalClosed))
        (New-AdfLabeledParagraph -Label 'Total labeled' -Value ([string]$totalLabeled))
        (New-AdfParagraph -Text 'Never hard delete by default because QA evidence may exist.')
      )
    }
    Add-JiraComment -Url $Url -Auth $Auth -IssueKey $TestSetKey -AdfDoc $summaryAdf
    Write-Host "  Posted summary comment to $TestSetKey" -ForegroundColor Gray
  }

  return @{ TotalClosed = $totalClosed; TotalLabeled = $totalLabeled; Errors = $errors }
}

function Invoke-JiraSearch {
  param([string]$Url, [string]$Auth, [string]$Jql, [string]$Fields = '*all')
  $curlArgs = @('-s', '-G', "${Url}/rest/api/3/search/jql", '-H', "Authorization: Basic $Auth", '-H', 'Accept: application/json',
    '--data-urlencode', "jql=$Jql",
    '--data-urlencode', "fields=$Fields",
    '--data-urlencode', 'maxResults=100')
  return Invoke-CurlUtf8 -Arguments $curlArgs
}

function ConvertTo-TestCaseRecord {
  param($Issue)

  $summary = Normalize-Whitespace -Text $Issue.fields.summary
  $titleText = Get-TestCaseTitleSemanticText -Summary $summary
  $scenarioText = Get-TestCaseScenarioTextFromAdf -Description $Issue.fields.description
  $gwtText = Get-TestCaseGwtTextFromAdf -Description $Issue.fields.description
  $created = if ($Issue.fields.created) { [datetime]$Issue.fields.created } else { [datetime]::MaxValue }

  return [pscustomobject]@{
    Key = [string]$Issue.key
    Summary = $summary
    IssueType = [string]$Issue.fields.issuetype.name
    Status = [string]$Issue.fields.status.name
    Created = $created
    ExactSummaryKey = Normalize-SemanticText -Text $summary
    TitleKey = Normalize-SemanticText -Text $titleText
    ScenarioKey = Normalize-SemanticText -Text $scenarioText
    GwtKey = Normalize-SemanticText -Text $gwtText
  }
}

function Test-IsTestCaseChild {
  param($Issue)
  $issueType = Normalize-SemanticText -Text $Issue.fields.issuetype.name
  $summary = Normalize-Whitespace -Text $Issue.fields.summary
  if ($issueType -match '\btest\s*case\b|\bcaso\s*de\s*prueba\b') { return $true }
  if ($summary -match '^\s*[A-Z]+-\d+\s*\|\s*TC\d+\s*:') { return $true }
  return $false
}

function Add-KeyGroup {
  param(
    [hashtable]$Groups,
    [string]$Key,
    [string]$Reason,
    [object]$Record
  )

  if (-not $Key) { return }
  $groupKey = "${Reason}:$Key"
  if (-not $Groups.ContainsKey($groupKey)) {
    $Groups[$groupKey] = [pscustomobject]@{ Reason = $Reason; Records = @() }
  }
  $Groups[$groupKey].Records += $Record
}

function Select-KeepCandidate {
  param([array]$Records)
  return @($Records | Sort-Object Created, Key | Select-Object -First 1)[0]
}

function New-AdfText {
  param([string]$Text, [array]$Marks = @())
  $node = @{ type = 'text'; text = $Text }
  if ($Marks.Count -gt 0) { $node.marks = $Marks }
  return $node
}

function New-AdfStrongText {
  param([string]$Text)
  return New-AdfText -Text $Text -Marks @(@{ type = 'strong' })
}

function New-AdfHeading {
  param([int]$Level, [string]$Text)
  return @{ type = 'heading'; attrs = @{ level = $Level }; content = @(@{ type = 'text'; text = $Text }) }
}

function New-AdfParagraph {
  param([string]$Text)
  return @{ type = 'paragraph'; content = @(@{ type = 'text'; text = $Text }) }
}

function New-AdfLabeledParagraph {
  param([string]$Label, [string]$Value)
  return @{ type = 'paragraph'; content = @((New-AdfStrongText -Text "${Label}: "), (New-AdfText -Text $Value)) }
}

function New-AdfBulletItem {
  param([string]$Text)
  return @{ type = 'listItem'; content = @(@{ type = 'paragraph'; content = @(@{ type = 'text'; text = $Text }) }) }
}

function New-AdfBulletList {
  param([array]$Items)
  return @{ type = 'bulletList'; content = $Items }
}

function New-DuplicateAuditCommentAdf {
  param(
    [string]$TestSetKey,
    [int]$ChildCount,
    [array]$DuplicateGroups,
    [switch]$Clean
  )

  $warning = "$(Get-Utf32Char -CodePoint 0x26A0)$(Get-Utf32Char -CodePoint 0xFE0F)"

  if ($Clean) {
    return @{
      type = 'doc'
      version = 1
      content = @(
        (New-AdfHeading -Level 3 -Text "$warning Jira-native BETA: sin duplicados detectados")
        (New-AdfLabeledParagraph -Label 'Test Set' -Value $TestSetKey)
        (New-AdfLabeledParagraph -Label 'Child Test Case count' -Value ([string]$ChildCount))
        (New-AdfLabeledParagraph -Label 'Status' -Value 'BETA')
      )
    }
  }

  $items = @()
  for ($i = 0; $i -lt $DuplicateGroups.Count; $i++) {
    $group = $DuplicateGroups[$i]
    $keep = Select-KeepCandidate -Records $group.Records
    $details = @($group.Records | ForEach-Object { "$($_.Key) [$($_.Status)]: $($_.Summary)" }) -join ' | '
    $items += New-AdfBulletItem -Text "Grupo $($i + 1): $($group.Reason). Duplicados: $details. Candidato recomendado a conservar: $($keep.Key)."
  }

  return @{
    type = 'doc'
    version = 1
    content = @(
      (New-AdfHeading -Level 3 -Text "$warning Jira-native BETA: duplicados detectados")
      (New-AdfLabeledParagraph -Label 'Test Set' -Value $TestSetKey)
      (New-AdfLabeledParagraph -Label 'Child Test Case count' -Value ([string]$ChildCount))
      (New-AdfLabeledParagraph -Label 'Duplicate group count' -Value ([string]$DuplicateGroups.Count))
      (New-AdfHeading -Level 4 -Text 'Duplicate groups')
      (New-AdfBulletList -Items $items)
      (New-AdfLabeledParagraph -Label 'Recommended action' -Value 'Manual review; after explicit approval, close/label/archive duplicates. Never hard delete by default because QA evidence may exist.')
      (New-AdfLabeledParagraph -Label 'Status' -Value 'BETA')
    )
  }
}

function Show-CommentPreview {
  param([hashtable]$AdfDoc)
  $json = $AdfDoc | ConvertTo-Json -Depth 20
  Write-Host '  Comment preview ADF:' -ForegroundColor Gray
  Write-Host $json -ForegroundColor Gray
}

if (-not $TestSetKey) {
  Write-Host 'Usage: PowerShell -NoProfile -ExecutionPolicy Bypass -File scripts\Jira-native\audit-duplicates.ps1 -TestSetKey QA-759' -ForegroundColor Yellow
  exit 1
}

$TestSetKey = $TestSetKey.Trim().ToUpperInvariant()
$authInfo = Get-JiraAuthHeaders -EnvFilePath $EnvFile
$baseUrl = $authInfo.Url
$auth = $authInfo.Auth

$actionLabel = if ($Approved) { " (close/label approved, Action=$Action)" } else { '' }
Write-Host "Jira-native duplicate remediation audit${actionLabel}" -ForegroundColor Cyan
Write-Host "Test Set: $TestSetKey" -ForegroundColor Cyan
if ($Approved -and -not $DryRun) {
  Write-Host 'Writes: transition/label actions on duplicates. No hard delete.' -ForegroundColor Gray
} elseif ($Approved -and $DryRun) {
  Write-Host 'Writes: none (DryRun). Would close/label duplicates.' -ForegroundColor Gray
} elseif ($CommentResult -and -not $DryRun) {
  Write-Host 'Writes: optional comment only when duplicate groups exist. No transition/delete/label/update.' -ForegroundColor Gray
} else {
  Write-Host 'Writes: none. This command only reads Jira issues.' -ForegroundColor Gray
}
Write-Host ''

$result = Invoke-JiraSearch -Url $baseUrl -Auth $auth -Jql "parent = $TestSetKey ORDER BY created ASC" -Fields 'summary,description,issuetype,status,created'
try { $parsed = $result | ConvertFrom-Json } catch { throw "Jira search response was not valid JSON: $result" }
if ($parsed.errorMessages) { throw "Jira search failed: $($parsed.errorMessages -join '; ')" }

$records = @()
if ($parsed.issues) {
  foreach ($issue in $parsed.issues) {
    if (-not (Test-IsTestCaseChild -Issue $issue)) { continue }
    $records += ConvertTo-TestCaseRecord -Issue $issue
  }
}

$groupsByKey = @{}
foreach ($record in $records) {
  Add-KeyGroup -Groups $groupsByKey -Key $record.ExactSummaryKey -Reason 'exact normalized summary duplicate' -Record $record
  Add-KeyGroup -Groups $groupsByKey -Key $record.TitleKey -Reason 'semantic title/objective duplicate' -Record $record
  Add-KeyGroup -Groups $groupsByKey -Key $record.ScenarioKey -Reason 'semantic scenario duplicate' -Record $record
  Add-KeyGroup -Groups $groupsByKey -Key $record.GwtKey -Reason 'semantic GWT duplicate' -Record $record
}

$duplicateGroups = @()
$seenSets = @{}
foreach ($entry in $groupsByKey.GetEnumerator()) {
  $group = $entry.Value
  if ($group.Records.Count -lt 2) { continue }

  $keys = @($group.Records | Sort-Object Key | ForEach-Object { $_.Key })
  $setKey = $keys -join '|'
  if ($seenSets.ContainsKey($setKey)) {
    $existing = $seenSets[$setKey]
    $existing.Reason = "$($existing.Reason); $($group.Reason)"
    continue
  }

  $duplicateGroup = [pscustomobject]@{
    Reason = $group.Reason
    Records = @($group.Records | Sort-Object Created, Key)
  }
  $duplicateGroups += $duplicateGroup
  $seenSets[$setKey] = $duplicateGroup
}

Write-Host 'Report' -ForegroundColor Yellow
Write-Host "  Test Set key: $TestSetKey"
Write-Host "  Child Test Case count: $($records.Count)"
Write-Host "  Duplicate groups count: $($duplicateGroups.Count)"
Write-Host ''

if ($duplicateGroups.Count -eq 0) {
  Write-Host 'No duplicate Test Case groups detected by normalized summary/title/scenario/GWT keys.' -ForegroundColor Green
  if ($CommentResult -and $CommentClean) {
    $cleanCommentAdf = New-DuplicateAuditCommentAdf -TestSetKey $TestSetKey -ChildCount $records.Count -DuplicateGroups $duplicateGroups -Clean
    if ($DryRun) {
      Write-Host 'Dry-run: would post clean duplicate audit comment.' -ForegroundColor Yellow
      Show-CommentPreview -AdfDoc $cleanCommentAdf
    } else {
      $commentResult = Add-JiraComment -Url $baseUrl -Auth $auth -IssueKey $TestSetKey -AdfDoc $cleanCommentAdf
      try { $commentParsed = $commentResult | ConvertFrom-Json } catch { throw "Jira comment response was not valid JSON: $commentResult" }
      if ($commentParsed.errorMessages) { throw "Jira comment failed: $($commentParsed.errorMessages -join '; ')" }
      Write-Host 'Posted clean duplicate audit comment.' -ForegroundColor Green
    }
  } elseif ($CommentResult) {
    Write-Host 'Clean audit: no comment posted by default. Use -CommentClean to opt in.' -ForegroundColor Gray
  }
  exit 0
}

for ($i = 0; $i -lt $duplicateGroups.Count; $i++) {
  $group = $duplicateGroups[$i]
  $keep = Select-KeepCandidate -Records $group.Records
  Write-Host "Group $($i + 1): $($group.Reason)" -ForegroundColor Yellow
  Write-Host "  Keys: $((@($group.Records | ForEach-Object { $_.Key })) -join ', ')"
  Write-Host "  Recommended keep candidate: $($keep.Key) (oldest child issue in group)"
  Write-Host '  Recommended action: manual review; close duplicate only after approval; do not delete evidence without approval'
  Write-Host '  Summaries:'
  foreach ($record in $group.Records) {
    Write-Host "    - $($record.Key) [$($record.Status)]: $($record.Summary)"
  }
  Write-Host ''
}

if ($CommentResult) {
  $commentAdf = New-DuplicateAuditCommentAdf -TestSetKey $TestSetKey -ChildCount $records.Count -DuplicateGroups $duplicateGroups
  if ($DryRun) {
    Write-Host 'Dry-run: would post duplicate recommendation comment.' -ForegroundColor Yellow
    Show-CommentPreview -AdfDoc $commentAdf
  } else {
    $commentResult = Add-JiraComment -Url $baseUrl -Auth $auth -IssueKey $TestSetKey -AdfDoc $commentAdf
    try { $commentParsed = $commentResult | ConvertFrom-Json } catch { throw "Jira comment response was not valid JSON: $commentResult" }
    if ($commentParsed.errorMessages) { throw "Jira comment failed: $($commentParsed.errorMessages -join '; ')" }
    Write-Host 'Posted duplicate recommendation comment.' -ForegroundColor Green
  }
} else {
  Write-Host 'Comment recommendation available with -CommentResult; no comment posted.' -ForegroundColor Gray
}

# Close/label duplicates with explicit approval (never hard delete)
if ($Approved -and $duplicateGroups.Count -gt 0) {
  Write-Host ''
  Write-Host 'Close/Label phase' -ForegroundColor Yellow
  if ($DryRun) {
    Write-Host '  Preview mode (-DryRun). No Jira changes will be made.' -ForegroundColor Yellow
    $closeResult = Close-DuplicateGroup -Url $baseUrl -Auth $auth -TestSetKey $TestSetKey -DuplicateGroups $duplicateGroups -Action $Action -DryRun
  } else {
    $closeResult = Close-DuplicateGroup -Url $baseUrl -Auth $auth -TestSetKey $TestSetKey -DuplicateGroups $duplicateGroups -Action $Action
  }
  if ($closeResult.Errors.Count -gt 0) {
    Write-Host '  Errors:' -ForegroundColor Red
    foreach ($err in $closeResult.Errors) { Write-Host "    $err" -ForegroundColor Red }
  }
  Write-Host "  Total closed: $($closeResult.TotalClosed), total labeled: $($closeResult.TotalLabeled)" -ForegroundColor Gray
  Write-Host ''
} elseif ($duplicateGroups.Count -gt 0 -and -not $Approved) {
  Write-Host ''
  Write-Host 'Close/label: use -Approved to execute. Use -Approved -DryRun to preview.' -ForegroundColor Gray
  Write-Host ''
}

exit 0
