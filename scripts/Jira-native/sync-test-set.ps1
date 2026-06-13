<#
.SYNOPSIS
  Sync a Test Set from its parent ticket: rewrites the Test Set description
  based on the parent's requirements and creates subtask Test Cases.

.DESCRIPTION
  Given a Test Set issue key (e.g. QA-744):
  1. Finds the linked User Story through Jira issue links (Test Set tests User Story)
  2. Fetches the linked User Story's description (requirements)
  3. Extracts key sections (Objetivo, Criterios de Aceptacion, Alcance, etc.)
  4. Rewrites the Test Set description in standard QA format
  5. Creates Test Case subtasks from acceptance criteria scenarios

.PARAMETER TestSetKey
  The Jira issue key of the Test Set (e.g. QA-744)

.PARAMETER EnvFile
  Path to .env file with JIRA_URL, JIRA_EMAIL, JIRA_API_TOKEN

.EXAMPLE
  .\scripts\sync-test-set.ps1 -TestSetKey QA-744

.NOTES
  Requires curl.exe and PowerShell 5.1+
#>

param(
  [Parameter(Mandatory = $false)]
  [string]$TestSetKey = '',

  [Parameter(Mandatory = $false)]
  [string]$EnvFile = '',

  [Parameter(Mandatory = $false)]
  [switch]$DryRun,

  [Parameter(Mandatory = $false)]
  [switch]$ValidateOnly,

  [Parameter(Mandatory = $false)]
  [switch]$CommentResult,

  [Parameter(Mandatory = $false)]
  [string]$ParentIssueKey = '',

  [Parameter(Mandatory = $false)]
  [string]$FixtureFile = '',

  [Parameter(Mandatory = $false)]
  [switch]$AnalyzeFixture
)

$noWrite = $DryRun -or $ValidateOnly
$auditLabel = if ($ValidateOnly) { 'VALIDATE ONLY' } elseif ($DryRun) { 'DRY RUN' } else { 'SYNC' }

function Get-JiraAuthHeaders {
  param([string]$EnvFilePath)
  if (-not $EnvFilePath -or -not (Test-Path -LiteralPath $EnvFilePath)) {
    $candidates = @(
      "C:\projects\bermann-tms-automation\.env"
      (Join-Path -Path $PSScriptRoot -ChildPath "..\.env")
      ".env"
    )
    foreach ($c in $candidates) {
      if (Test-Path -LiteralPath $c) { $EnvFilePath = $c; break }
    }
  }
  if (-not (Test-Path -LiteralPath $EnvFilePath)) { throw "Cannot find .env file" }
  $lines = Get-Content -LiteralPath $EnvFilePath
  $url = ($lines | Where-Object { $_ -like 'JIRA_URL=*' } | Select-Object -First 1).Substring(9).Trim()
  $email = ($lines | Where-Object { $_ -like 'JIRA_EMAIL=*' } | Select-Object -First 1).Substring(11).Trim()
  $token = ($lines | Where-Object { $_ -like 'JIRA_API_TOKEN=*' } | Select-Object -First 1).Substring(15).Trim()
  $auth = [Convert]::ToBase64String([Text.Encoding]::ASCII.GetBytes("${email}:${token}"))
  return @{ Url = $url; Auth = $auth }
}

function Invoke-CurlUtf8 {
  param([string[]]$Arguments)

  $outputFile = Join-Path -Path $env:TEMP -ChildPath "jira_curl_$(Get-Random).json"
  $curlArgs = @($Arguments + @('-o', $outputFile))
  curl.exe @curlArgs 2>$null

  if (-not (Test-Path -LiteralPath $outputFile)) { return '' }
  try {
    return [System.IO.File]::ReadAllText($outputFile, [System.Text.Encoding]::UTF8)
  } finally {
    Remove-Item -LiteralPath $outputFile -Force
  }
}

function Invoke-JiraSearch {
  param([string]$Url, [string]$Auth, [string]$Jql, [string]$Fields = '*all')
  $curlArgs = @('-s', '-G', "${Url}/rest/api/3/search/jql", '-H', "Authorization: Basic $Auth", '-H', 'Accept: application/json',
    '--data-urlencode', "jql=$Jql",
    '--data-urlencode', "fields=$Fields",
    '--data-urlencode', 'maxResults=50')
  return Invoke-CurlUtf8 -Arguments $curlArgs
}

function Invoke-JiraGetIssue {
  param([string]$Url, [string]$Auth, [string]$IssueKey)
  $curlArgs = @('-s', '-G', "${Url}/rest/api/3/search/jql", '-H', "Authorization: Basic $Auth", '-H', 'Accept: application/json', '--data-urlencode', "jql=issuekey = $IssueKey", '--data-urlencode', 'fields=*all', '--data-urlencode', 'maxResults=1')
  return Invoke-CurlUtf8 -Arguments $curlArgs
}

function Invoke-JiraGet {
  param([string]$Url, [string]$Auth, [string]$Endpoint)
  $curlArgs = @('-s', "${Url}${Endpoint}", '-H', "Authorization: Basic $Auth", '-H', 'Accept: application/json')
  return Invoke-CurlUtf8 -Arguments $curlArgs
}

function Invoke-JiraPut {
  param([string]$Url, [string]$Auth, [string]$Endpoint, [string]$BodyFile)
  $curlArgs = @('-s', '-X', 'PUT', "${Url}${Endpoint}", '-H', "Authorization: Basic $Auth", '-H', 'Content-Type: application/json', '-d', "@$BodyFile")
  return Invoke-CurlUtf8 -Arguments $curlArgs
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
  $commentFile = Join-Path -Path $env:TEMP -ChildPath "jira_ts_comment_$(Get-Random).json"
  Save-JsonFile -Path $commentFile -Json $json
  try {
    return Invoke-JiraPost -Url $Url -Auth $Auth -Endpoint "/rest/api/3/issue/$IssueKey/comment" -BodyFile $commentFile
  } finally {
    if (Test-Path -LiteralPath $commentFile) { Remove-Item -LiteralPath $commentFile -Force }
  }
}

function Save-JsonFile {
  param([string]$Path, [string]$Json)
  $utf8NoBom = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllText($Path, $Json, $utf8NoBom)
}

function Get-Utf32Char {
  param([int]$CodePoint)
  return [char]::ConvertFromUtf32($CodePoint)
}

function Join-UnicodeText {
  param([object[]]$Parts)
  return ($Parts | ForEach-Object {
    if ($_ -is [int]) { [char]$_ } else { [string]$_ }
  }) -join ''
}

$script:EmojiClipboard = Get-Utf32Char 128203
$script:EmojiComputer = Get-Utf32Char 128187
$script:EmojiFolder = Get-Utf32Char 128450
$script:EmojiChart = Get-Utf32Char 128202
$script:EmojiCalendar = Get-Utf32Char 128197
$script:EmojiSteps = Get-Utf32Char 128209
$script:EmojiFlag = Get-Utf32Char 127937
$script:EmojiMemo = Get-Utf32Char 128221
$script:EmojiCheck = Get-Utf32Char 9989
$script:EmojiWarning = Get-Utf32Char 9888

$script:TextProposito = Join-UnicodeText @('Prop', 0x00F3, 'sito')
$script:TextValidacion = Join-UnicodeText @('validaci', 0x00F3, 'n')
$script:TextAceptacion = Join-UnicodeText @('Aceptaci', 0x00F3, 'n')
$script:TextEjecucion = Join-UnicodeText @('EJECUCI', 0x00D3, 'N')
$script:TextEdicion = Join-UnicodeText @('Edici', 0x00F3, 'n')
$script:TextExito = Join-UnicodeText @(0x00C9, 'xito')
$script:TextModulo = Join-UnicodeText @('m', 0x00F3, 'dulo')
$script:TextSeccion = Join-UnicodeText @('secci', 0x00F3, 'n')
$script:TextSegun = Join-UnicodeText @('seg', 0x00FA, 'n')

function Get-MojibakePatterns {
  return @(
    [string][char]0x00C3,
    [string][char]0x00C2,
    [string][char]0xFFFD,
    [string][char]0x00F0,
    [string][char]0x00D0,
    [string][char]0x252C,
    [string][char]0x251C,
    [string][char]0x2591
  )
}

# Extract plain text from ADF content array
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

# Extract text from an ADF doc (top-level)
function Get-AdfDocText {
  param($Json)
  try { $doc = $Json | ConvertFrom-Json } catch { return '' }
  if (-not $doc.content) { return '' }
  return Get-AdfText -Nodes $doc.content
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

function Get-ScenarioSemanticKey {
  param($Scenario)
  if (-not $Scenario) { return '' }

  $descriptionKey = Normalize-SemanticText -Text $Scenario.Description
  if ($descriptionKey) { return "scenario:$descriptionKey" }

  $gwtKey = Normalize-SemanticText -Text "$($Scenario.Given) $($Scenario.When) $($Scenario.Then)"
  if ($gwtKey) { return "gwt:$gwtKey" }

  return ''
}

function Get-DuplicateScenarioCount {
  param([array]$Scenarios)
  $seen = @{}
  $duplicates = 0
  foreach ($scenario in $Scenarios) {
    $key = Get-ScenarioSemanticKey -Scenario $scenario
    if (-not $key) { continue }
    if ($seen.ContainsKey($key)) { $duplicates++ } else { $seen[$key] = $true }
  }
  return $duplicates
}

function Select-UniqueTestScenarios {
  param([array]$Scenarios)
  $unique = @()
  $seen = @{}
  $number = 1

  foreach ($scenario in $Scenarios) {
    $key = Get-ScenarioSemanticKey -Scenario $scenario
    if (-not $key) { continue }
    if ($seen.ContainsKey($key)) { continue }

    $copy = @{}
    foreach ($property in $scenario.Keys) { $copy[$property] = $scenario[$property] }
    $copy.Number = $number
    $unique += $copy
    $seen[$key] = $true
    $number++
  }

  return $unique
}

function Assert-UniqueTestScenarios {
  param([array]$Scenarios)
  $duplicates = Get-DuplicateScenarioCount -Scenarios $Scenarios
  if ($duplicates -gt 0) { throw "Generated scenario list contains $duplicates duplicate semantic key(s)." }
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

function ConvertTo-LowerInitial {
  param([string]$Text)
  $clean = Normalize-Whitespace -Text $Text
  if (-not $clean) { return '' }
  if ($clean.Length -eq 1) { return $clean.ToLowerInvariant() }
  if ($clean -match '^[A-Z]{2,}\b') { return $clean }
  return $clean.Substring(0, 1).ToLowerInvariant() + $clean.Substring(1)
}

function Normalize-GherkinStepText {
  param([string]$Text)
  $withoutExpectedResult = ([string]$Text) -replace '(?is)\s*(Resultado esperado|Expected result):?.*$', ''
  $clean = Normalize-Whitespace -Text ($withoutExpectedResult -replace '^[\s:.-]+', '' -replace '[\s;]+$', '')
  if (-not $clean) { return '' }
  return $clean.TrimEnd('.')
}

function ConvertTo-TitleCaseInitial {
  param([string]$Text)
  $clean = Normalize-Whitespace -Text $Text
  if (-not $clean) { return '' }
  if ($clean.Length -eq 1) { return $clean.ToUpperInvariant() }
  return $clean.Substring(0, 1).ToUpperInvariant() + $clean.Substring(1)
}

function Limit-TextAtWordBoundary {
  param([string]$Text, [int]$MaxLength)
  $clean = Normalize-Whitespace -Text $Text
  if (-not $clean -or $clean.Length -le $MaxLength) { return $clean }

  $cut = $clean.Substring(0, $MaxLength).TrimEnd(' ', '.', ',', ';', ':')
  $lastSpace = $cut.LastIndexOf(' ')
  if ($lastSpace -gt 20) { $cut = $cut.Substring(0, $lastSpace) }
  return Repair-DanglingTextEnding -Text $cut
}

function Repair-DanglingTextEnding {
  param([string]$Text)
  $clean = Normalize-Whitespace -Text $Text
  if (-not $clean) { return '' }

  $clean = ($clean -replace '[\s\.,;:\-\u2013\u2014]+$', '').Trim()
  $danglingPattern = '(?i)\s+(y\s+se|que\s+se|de\s+la|de\s+los|de\s+las|del|de|para|con|por|en|al|a|la|el|los|las|un|una|unos|unas|que|y|o|u|e|se)$'
  while ($clean -match $danglingPattern) {
    $next = (($clean -replace $danglingPattern, '') -replace '[\s\.,;:\-\u2013\u2014]+$', '').Trim()
    if (-not $next -or $next -eq $clean) { break }
    $clean = $next
  }

  return $clean
}

function Normalize-TestCaseDisplayTitle {
  param([string]$Text)
  $clean = Normalize-Whitespace -Text $Text
  if (-not $clean) { return '' }

  $clean = $clean -replace '\s*;\s*', ' y '
  $clean = $clean -replace '\s*/\s*', ' y '
  $clean = $clean -replace '\s+', ' '
  return Repair-DanglingTextEnding -Text $clean
}

function Remove-GwtFragments {
  param([string]$Text)
  $clean = Normalize-Whitespace -Text $Text
  if (-not $clean) { return '' }
  $clean = $clean -replace '(?i)\b(Given|When|Then|Dado|Cuando|Entonces|And|Y)\b\s*', ''
  $clean = $clean -replace '(?i)\b(el\s+sistema|sistema)\s+(debe|debera|deberia)\s+', ''
  $clean = $clean -replace '(?i)^debe\s+', ''
  return Normalize-Whitespace -Text ($clean -replace '\s*[,;]+\s*', '; ' -replace '\s+\.', '.' -replace '\s{2,}', ' ')
}

function Get-FirstSentenceClause {
  param([string]$Text)
  $clean = Normalize-Whitespace -Text $Text
  if (-not $clean) { return '' }
  $parts = @($clean -split '\s*[.;]\s*' | Where-Object { Normalize-Whitespace -Text $_ })
  if ($parts.Count -gt 0) { return Normalize-Whitespace -Text $parts[0] }
  return $clean
}

function Get-ScenarioTypeLabel {
  param($Scenario)
  $source = Normalize-SemanticText -Text "$($Scenario.Header) $($Scenario.Description) $($Scenario.When) $($Scenario.Then)"
  if ($source -match '\b(error|rechaz|inval|no valid|fall|sin dato|vacio|vacia)\b') { return 'Error' }
  if ($source -match '\b(validacion|validar|obligatori|requerid|exigir|completar|regla|rango|formato|campo requerido)\b') { return $script:TextValidacion }
  if ($source -match '\b(editar|edicion|modificar|actualizar|cambiar)\b') { return $script:TextEdicion }
  if ($source -match '\b(persist|mantener|conservar|guardar|grabado)\b') { return 'Persistencia' }
  if ($source -match '\b(limpiar|restablecer|resetear)\b') { return $script:TextValidacion }
  return 'Happy path'
}

function Get-ScenarioShortTitle {
  param($Scenario, [string]$Capability)
  $candidate = Remove-GwtFragments -Text (Get-FirstSentenceClause -Text $Scenario.Description)
  $source = Normalize-Whitespace -Text "$($Scenario.Description) $($Scenario.When) $($Scenario.Then)"
  $criterion = Normalize-Whitespace -Text $Scenario.Description
  if (-not $candidate) { $candidate = Remove-GwtFragments -Text $Scenario.When }
  if (-not $candidate) { $candidate = $Capability }

  $candidate = $candidate -replace '(?i)^que\s+', ''
  $candidate = $candidate -replace '(?i)^el\s+usuario\s+', ''
  $candidate = $candidate -replace '(?i)^usuario\s+', ''
  $candidate = $candidate -replace '(?i)^se\s+', ''
  $candidate = $candidate -replace '(?i)^pueda\s+', ''
  $candidate = $candidate -replace '(?i)^puede\s+', ''
  $candidate = $candidate -replace '(?i)^debe\s+', ''
  $candidate = $candidate.Trim(' ', '.', ',', ';', ':')

  $quotedLabels = @([regex]::Matches($source, '"([^"]+)"') | ForEach-Object { Normalize-Whitespace -Text $_.Groups[1].Value } | Where-Object { $_ })
  # Skip if the scenario is a negative one ("no mostrar", "no visualizar")
  $isNegativeVisual = $candidate -match '(?i)^no\s+' -or $source -match '(?i)no\s+(debe\s+)?(mostrar|visualizar|ver)\s'
  if (-not $isNegativeVisual -and $source -match '(?i)(visualizar|ver|mostrar|cargar|desplegar).*(datos bancarios)') {
    $specificLabels = @($quotedLabels | Where-Object { (Normalize-SemanticText -Text $_) -ne 'datos bancarios' })
    if ($specificLabels.Count -gt 0) { return "Visualizar campo `"$($specificLabels[0])`" en Datos Bancarios" }
    return "Visualizar $script:TextSeccion `"Datos Bancarios`""
  }
  if ($source -match '(?i)tipo\s+operaci.n') {
    if ($criterion -match '(?i)macrozonas\s+agregadas|visualiza\s+la\s+grilla') { return 'Visualizar Tipo Operacion en Macrozonas Agregadas' }
    if ($criterion -match '(?i)macrozona') { return 'Validar Tipo Operacion por macrozona' }
    if ($criterion -match '(?i)tipo\s+servicio|servicios') { return 'Filtrar servicios por Tipo Operacion' }
    if ($criterion -match '(?i)hist.ric') { return 'Mostrar Tipo Operacion en registros historicos' }
    if ($criterion -match '(?i)consulta|edita|editar|existente') { return 'Mantener Tipo Operacion al consultar o editar' }
    if ($criterion -match '(?i)(valor|dato|informaci.n|correspond|seg.n)') { return 'Validar valor de Tipo Operacion por contrato' }
    if ($criterion -match '(?i)(columna|listado|grilla|tabla|visualizar|mostrar|ver)') { return 'Visualizar columna Tipo Operacion en contratos' }
    return 'Validar Tipo Operacion en contratos'
  }
  if ($candidate -match '(?i)(crear|registrar|agregar).*(conductor)') { return 'Crear conductor' }
  if ($candidate -match '(?i)(editar|modificar|actualizar).*(conductor)') { return 'Editar conductor' }

  # Conductor bank data domain patterns (all ASCII to avoid encoding issues)
  if ($source -match '(?i)visualizar|seccion.*datos.*bancarios') {
    if ($source -match '(?i)crear\s+conductor') { return 'Visualizacion en Crear Conductor' }
    if ($source -match '(?i)editar\s+conductor') { return 'Visualizacion en Editar Conductor' }
  }
  if ($source -match '(?i)obligatori.*rinde|rinde.*obligatori') { return 'Obligatoriedad con Rinde marcado' }
  if ($source -match '(?i)^no\s+marca.*rinde|no\s+marca.*rinde|rinde.*no.*marca') { return 'Rinde no marcado - datos opcionales' }
  if ($source -match '(?i)bloque\s+completo|completar.*bloque|uno\s+o\s+dos\s+campos') { return 'Validacion de bloque completo' }
  if ($source -match '(?i)(?:numero|n.mero)\s+de\s+cuenta.*invalido|invalido.*cuenta') { return 'Validacion de numero de cuenta' }
  if ($source -match '(?i)(?:tipo\s+de\s+cuenta.*rut|cuenta\s+rut|validar.*rut)') { return 'Seleccion de cuenta tipo Cuenta RUT' }
  if ($source -match '(?i)no\s+(?:debe|mostrar|visualizar).*(?:grilla|columna)') { return 'No mostrar datos bancarios en grilla' }
  if ($source -match '(?i)(?:excel|exportar).*(?:columnas|campos|incluir)') { return 'Mostrar campos en Excel' }
  if ($source -match '(?i)mantenedor\s+de\s+caja|generacion\s+txt|transferencias') { return 'Disponibilidad para mantenedor de caja' }

  if ($candidate -match '(?i)(guardar|persist).*') {
    if ($source -match '(?i)(exigir|obligatori|requerid|completar).*(datos bancarios)') { return 'Validar obligatoriedad de Datos Bancarios' }
    if ($source -match '(?i)banco') { return 'Persistir banco del conductor' }
    if ($source -match '(?i)tipo\s+de\s+cuenta') { return 'Persistir tipo de cuenta' }
    if ($source -match '(?i)(nro|numero|número)\s+de\s+cuenta|cuenta\s+bancaria') { return 'Persistir número de cuenta' }
    if ($source -match '(?i)correo|email|e-mail') { return 'Persistir correo de contacto' }
    if ($source -match '(?i)datos bancarios') { return 'Persistir Datos Bancarios' }
    return 'Persistir cambios'
  }

  $candidate = Normalize-TestCaseDisplayTitle -Text $candidate
  $candidate = Limit-TextAtWordBoundary -Text $candidate -MaxLength 70
  return ConvertTo-TitleCaseInitial -Text $candidate
}

function Get-ScenarioFunctionalDescription {
  param($Scenario, [string]$ShortTitle)
  $source = Normalize-Whitespace -Text "$($Scenario.Description) $($Scenario.When) $($Scenario.Then)"
  $criterion = Normalize-Whitespace -Text $Scenario.Description
  if ($source -match '(?i)(visualizar|ver|mostrar|cargar|desplegar).*(datos bancarios).*(rinde).*(banco).*(tipo\s+de\s+cuenta).*((nro|numero|número)\s+de\s+cuenta)') {
    return "Visualizar $script:TextSeccion `"Datos Bancarios`" con campos Rinde, Banco, Tipo de Cuenta y Nro de Cuenta"
  }

  if ($source -match '(?i)tipo\s+operaci.n') {
    if ($criterion -match '(?i)macrozonas\s+agregadas|visualiza\s+la\s+grilla') { return 'Visualizar columna Tipo Operacion en grilla Macrozonas Agregadas' }
    if ($criterion -match '(?i)macrozona') { return 'Validar Tipo Operacion determinado por macrozona del contrato' }
    if ($criterion -match '(?i)tipo\s+servicio|servicios') { return 'Visualizar solo servicios asociados al Tipo Operacion del contrato' }
    if ($criterion -match '(?i)hist.ric') { return 'Mostrar Tipo Operacion correspondiente en registros historicos' }
    if ($criterion -match '(?i)consulta|edita|editar|existente') { return 'Mantener Tipo Operacion visible y consistente al consultar o editar contratos' }
    if ($criterion -match '(?i)(valor|dato|informaci.n|correspond|seg.n)') { return 'Validar valor de Tipo Operacion por contrato' }
    if ($criterion -match '(?i)(columna|listado|grilla|tabla|visualizar|mostrar|ver)') { return 'Visualizar columna Tipo Operacion en listado de contratos' }
    return 'Validar Tipo Operacion en contratos'
  }

  $description = Remove-GwtFragments -Text $Scenario.Description
  if (-not $description) { $description = $ShortTitle }
  if ($description -match ';' -or $description -match '(?i)^(el\s+sistema|sistema|debe|cuando|then|when|given|dado|entonces)\b') {
    $description = $ShortTitle
  }
  $description = Normalize-TestCaseDisplayTitle -Text $description
  $description = Limit-TextAtWordBoundary -Text $description -MaxLength 90
  return ConvertTo-TitleCaseInitial -Text $description
}

function New-TestCaseScenarioModel {
  param(
    [string]$TestSetKey,
    [string]$Capability,
    [array]$Scenarios
  )

  $model = @()
  foreach ($scenario in $Scenarios) {
    $typeLabel = Get-ScenarioTypeLabel -Scenario $scenario
    $shortTitle = Repair-DanglingTextEnding -Text (Get-ScenarioShortTitle -Scenario $scenario -Capability $Capability)
    $functionalDescription = Repair-DanglingTextEnding -Text (Get-ScenarioFunctionalDescription -Scenario $scenario -ShortTitle $shortTitle)
    $summary = Repair-DanglingTextEnding -Text "$TestSetKey | TC$($scenario.Number): $typeLabel - $shortTitle"
    $listItem = Repair-DanglingTextEnding -Text "TC$($scenario.Number): $functionalDescription"

    $model += @{
      Number = $scenario.Number
      TypeLabel = $typeLabel
      ShortTitle = $shortTitle
      FunctionalDescription = $functionalDescription
      Given = $scenario.Given
      When = $scenario.When
      Then = $scenario.Then
      SourceDescription = $scenario.Description
      Summary = $summary
      ListItem = $listItem
    }
  }

  return $model
}

function ConvertTo-SpanishGwtStep {
  param([string]$StepType, [string]$Text)
  $clean = Normalize-GherkinStepText -Text $Text
  if (-not $clean) { return '' }

  switch ($StepType) {
    'Given' {
      if ($clean -match '(?i)^que\s+el\s+usuario\s+(.+)$') { return "el usuario $($Matches[1])" }
      if ($clean -match '(?i)^usuario\s+en\s+pantalla\s+(.+)$') { return "el usuario se encuentra en pantalla $($Matches[1])" }
      if ($clean -match '(?i)^usuario\s+(.+)$') { return "el usuario $($Matches[1])" }
      if ($clean -match '(?i)^el\s+usuario\b') { return ConvertTo-LowerInitial -Text $clean }
      return ConvertTo-LowerInitial -Text $clean
    }
    'When' { return ConvertTo-LowerInitial -Text $clean }
    'Then' {
      if ($clean -match '(?i)^sistema\s+(.+)$') { return "el sistema $($Matches[1])" }
      if ($clean -match '(?i)^el\s+sistema\b') { return ConvertTo-LowerInitial -Text $clean }
      return ConvertTo-LowerInitial -Text $clean
    }
  }
  return ConvertTo-LowerInitial -Text $clean
}

function Get-NormalizedGherkinMarker {
  param([string]$Marker, [string]$PreviousMarker)
  if ($Marker -match '^(?i:Given|Dado)$') { return 'Given' }
  if ($Marker -match '^(?i:When|Cuando)$') { return 'When' }
  if ($Marker -match '^(?i:Then|Entonces)$') { return 'Then' }
  if ($Marker -match '^(?i:And|Y)$') { return $PreviousMarker }
  return ''
}

function Join-GherkinStepText {
  param([string]$Existing, [string]$Additional)
  $cleanAdditional = Normalize-GherkinStepText -Text $Additional
  if (-not $cleanAdditional) { return $Existing }
  if (-not (Normalize-Whitespace -Text $Existing)) { return $cleanAdditional }
  return "$(Normalize-GherkinStepText -Text $Existing). Ademas, $(ConvertTo-LowerInitial -Text $cleanAdditional)"
}

function New-GherkinScenario {
  param([int]$Number, [hashtable]$Steps)
  $given = ConvertTo-SpanishGwtStep -StepType 'Given' -Text $Steps.Given
  $when = ConvertTo-SpanishGwtStep -StepType 'When' -Text $Steps.When
  $then = ConvertTo-SpanishGwtStep -StepType 'Then' -Text $Steps.Then
  if (-not $given -or -not $when -or -not $then) { return $null }

  return @{
    Number = $Number
    Header = 'Gherkin'
    Description = "$(ConvertTo-LowerInitial -Text $when); $(ConvertTo-LowerInitial -Text $then)"
    Given = $given
    When = $when
    Then = $then
    SourceType = 'Gherkin'
  }
}

function Get-GherkinScenariosFromText {
  param([string]$Text, [int]$StartNumber = 1)
  $results = @()
  $source = ([string]$Text) -replace '(?i)(?<!^)(?=\b(Given|Dado|When|Cuando|Then|Entonces)\s+)', "`n"
  if (-not (Normalize-Whitespace -Text $source)) { return $results }

  $pattern = '(?im)(^|[;,\r\n])\s*(Given|Dado|When|Cuando|Then|Entonces|And|Y)\s+'
  $matches = [regex]::Matches($source, $pattern)
  if ($matches.Count -eq 0) { return $results }

  $current = @{ Given = ''; When = ''; Then = '' }
  $previousMarker = ''
  $number = $StartNumber

  for ($i = 0; $i -lt $matches.Count; $i++) {
    $match = $matches[$i]
    $markerText = $match.Groups[2].Value
    $marker = Get-NormalizedGherkinMarker -Marker $markerText -PreviousMarker $previousMarker
    if (-not $marker) { continue }

    if ($marker -eq 'Given' -and (Normalize-Whitespace -Text $current.Given) -and (Normalize-Whitespace -Text $current.When) -and (Normalize-Whitespace -Text $current.Then)) {
      $scenario = New-GherkinScenario -Number $number -Steps $current
      if ($scenario) { $results += $scenario; $number++ }
      $current = @{ Given = ''; When = ''; Then = '' }
    }

    $start = $match.Index + $match.Length
    $end = $source.Length
    if ($i -lt ($matches.Count - 1)) { $end = $matches[$i + 1].Index }
    $stepText = $source.Substring($start, $end - $start)
    $current[$marker] = Join-GherkinStepText -Existing $current[$marker] -Additional $stepText
    $previousMarker = $marker
  }

  $lastScenario = New-GherkinScenario -Number $number -Steps $current
  if ($lastScenario) { $results += $lastScenario }
  return $results
}

function Complete-GherkinTextWithExpectedResult {
  param([string]$Text, [string]$ExpectedResult)
  $clean = Normalize-Whitespace -Text $Text
  $expected = Normalize-Whitespace -Text $ExpectedResult
  if (-not $clean -or -not $expected) { return $clean }
  # Require Given/Dado to appear near start of text (sentence-initial) to avoid false positives like "el acceso fue dado al usuario cuando..."
  $hasGivenStart = $clean -match '(?i)(?:^|\.\s+)(Given|Dado)\b'
  $hasWhen       = $clean -match '(?i)\b(When|Cuando)\b'
  $hasThen       = $clean -match '(?i)\b(Then|Entonces)\b'
  if (-not $hasGivenStart -or -not $hasWhen -or $hasThen) { return $clean }
  # Strip colon prefix like "Entonces:" before adding our own
  if ($expected -notmatch '(?i)^(Then|Entonces)[:\s]') { $expected = "Entonces $expected" }
  $clean = $clean.TrimEnd(' ', '.', ',', ';')
  return "$clean, $expected"
}

function New-AcceptanceScenariosFromCriterionText {
  param(
    [string]$Text,
    [int]$StartNumber,
    [string]$Header = 'Criterio',
    [string]$ExpectedResult = ''
  )

  $clean = Normalize-Whitespace -Text $Text
  if (-not $clean) { return @() }

  $gherkinText = Complete-GherkinTextWithExpectedResult -Text $clean -ExpectedResult $ExpectedResult
  $gherkinScenarios = @(Get-GherkinScenariosFromText -Text $gherkinText -StartNumber $StartNumber)
  if ($gherkinScenarios.Count -gt 0) {
    $converted = @()
    foreach ($scenario in $gherkinScenarios) {
      $copy = @{}
      foreach ($property in $scenario.Keys) { $copy[$property] = $scenario[$property] }
      if ($Header) { $copy.Header = $Header }
      if ($ExpectedResult) { $copy.ExpectedResult = $ExpectedResult }
      $converted += $copy
    }
    return $converted
  }

  $scenario = @{
    Number = $StartNumber
    Header = $Header
    Description = $clean.Trim(' ', '.', ';', ':')
    Given = ''
    When = ''
    Then = ''
  }
  if ($ExpectedResult) { $scenario.ExpectedResult = $ExpectedResult }
  return @($scenario)
}

function Test-AcceptanceCriterionParagraph {
  param([string]$Text)
  $clean = Normalize-Whitespace -Text $Text
  if (-not $clean -or $clean.Length -lt 12) { return $false }
  if ($clean -match '(?i)^criterios?\s+de\s+aceptaci.n:?$') { return $false }
  if ($clean -match '(?i)^(objetivo|alcance|precondiciones|consideraciones|notas?):?$') { return $false }
  if ($clean -match '(?i)\b(Given|Dado|When|Cuando|Then|Entonces)\b') { return $false }
  return $true
}

function Get-ParagraphAcceptanceScenarios {
  param([string[]]$TextBlocks, [int]$StartNumber = 1)
  $results = @()
  $number = $StartNumber

  foreach ($block in $TextBlocks) {
    $clean = Normalize-Whitespace -Text ($block -replace '^\s*[-*•]+\s*', '' -replace '^\s*\d+[.)-]\s*', '')
    if (-not (Test-AcceptanceCriterionParagraph -Text $clean)) { continue }

    $results += @{
      Number = $number
      Header = 'Criterio'
      Description = $clean.Trim(' ', '.', ';', ':')
      SourceType = 'ParagraphCriterion'
    }
    $number++
  }

  return $results
}

function Get-AdfTopLevelBlockTexts {
  param($Doc)
  $blocks = @()
  if (-not $Doc -or -not $Doc.content) { return $blocks }
  foreach ($node in $Doc.content) {
    $text = Normalize-Whitespace -Text (Get-AdfText -Nodes @($node))
    if ($text) { $blocks += @{ Type = [string]$node.type; Text = $text } }
  }
  return $blocks
}

function ConvertTo-AdfDocObject {
  param($Adf)
  if (-not $Adf) { return $null }

  if ($Adf -is [string]) {
    try { return $Adf | ConvertFrom-Json } catch { return $null }
  }

  if ($Adf -is [System.Collections.IDictionary]) {
    if ($Adf.Contains('type') -and $Adf['type'] -eq 'doc') { return $Adf }
    return $null
  }

  if ($Adf.PSObject.Properties['type'] -and $Adf.type -eq 'doc') { return $Adf }
  return $null
}

function Get-AdfLogicalTextLines {
  param($Nodes)
  $lines = @()
  if (-not $Nodes) { return $lines }

  foreach ($node in @($Nodes)) {
    if (-not $node) { continue }
    switch ([string]$node.type) {
      'heading' {
        $text = Normalize-Whitespace -Text (Get-AdfText -Nodes $node.content)
        if ($text) { $lines += $text }
      }
      'paragraph' {
        $text = Normalize-Whitespace -Text (Get-AdfText -Nodes $node.content)
        if ($text) { $lines += $text }
      }
      'listItem' {
        $text = Normalize-Whitespace -Text (Get-AdfText -Nodes $node.content)
        if ($text) { $lines += $text }
        $lines += Get-AdfLogicalTextLines -Nodes $node.content
      }
      default {
        if ($node.content) { $lines += Get-AdfLogicalTextLines -Nodes $node.content }
      }
    }
  }

  return @($lines | Where-Object { Normalize-Whitespace -Text $_ })
}

function Get-AdfLogicalHeadingTexts {
  param($Nodes)
  $headings = @()
  if (-not $Nodes) { return $headings }

  foreach ($node in @($Nodes)) {
    if (-not $node) { continue }
    if ($node.type -eq 'heading') {
      $text = Normalize-Whitespace -Text (Get-AdfText -Nodes $node.content)
      if ($text) { $headings += $text }
    }
    if ($node.content) { $headings += Get-AdfLogicalHeadingTexts -Nodes $node.content }
  }

  return $headings
}

function Get-AdfLogicalListItemTexts {
  param($Nodes)
  $items = @()
  if (-not $Nodes) { return $items }

  foreach ($node in @($Nodes)) {
    if (-not $node) { continue }
    if ($node.type -eq 'listItem') {
      $text = Normalize-Whitespace -Text (Get-AdfText -Nodes $node.content)
      if ($text) { $items += $text }
    }
    if ($node.content) { $items += Get-AdfLogicalListItemTexts -Nodes $node.content }
  }

  return $items
}

function ConvertTo-AdfSemanticSet {
  param([string[]]$Items)
  $set = @{}
  foreach ($item in @($Items)) {
    $key = Normalize-SemanticText -Text $item
    if ($key) { $set[$key] = $true }
  }
  return $set
}

function Get-AdfTestCaseListItemKeys {
  param([string[]]$Items)
  $keys = @()
  foreach ($item in @($Items)) {
    $clean = Normalize-Whitespace -Text $item
    if ($clean -match '^(?i:TC)\s*(\d+)\s*:\s*(.+)$') {
      $number = [int]$Matches[1]
      $textKey = Normalize-SemanticText -Text $Matches[2]
      if ($textKey) { $keys += "tc${number}:$textKey" }
    }
  }
  return $keys
}

function New-TestSetDescriptionSignature {
  param($Adf)

  $doc = ConvertTo-AdfDocObject -Adf $Adf
  if (-not $doc -or -not $doc.content) {
    return @{ Comparable = $false; Reason = 'ADF doc/content missing or unreadable.' }
  }

  $lines = @(Get-AdfLogicalTextLines -Nodes $doc.content)
  $headings = @(Get-AdfLogicalHeadingTexts -Nodes $doc.content)
  $listItems = @(Get-AdfLogicalListItemTexts -Nodes $doc.content)
  $tcItems = @(Get-AdfTestCaseListItemKeys -Items $listItems)

  if ($lines.Count -eq 0 -or $headings.Count -eq 0 -or $listItems.Count -eq 0) {
    return @{ Comparable = $false; Reason = 'ADF semantic text, headings, or list items missing.' }
  }

  return @{
    Comparable = $true
    PlainTextKey = Normalize-SemanticText -Text ($lines -join ' ')
    HeadingSet = ConvertTo-AdfSemanticSet -Items $headings
    ListItemSet = ConvertTo-AdfSemanticSet -Items $listItems
    TestCaseItems = $tcItems
    TestCaseSet = ConvertTo-AdfSemanticSet -Items $tcItems
    HeadingCount = $headings.Count
    ListItemCount = $listItems.Count
    TestCaseCount = $tcItems.Count
  }
}

function Compare-TestSetDescriptionLogically {
  param($CurrentAdf, $ExpectedAdf)

  $current = New-TestSetDescriptionSignature -Adf $CurrentAdf
  $expected = New-TestSetDescriptionSignature -Adf $ExpectedAdf
  if (-not $current.Comparable -or -not $expected.Comparable) {
    $reason = "current: $($current.Reason); expected: $($expected.Reason)"
    return @{ Comparable = $false; Equivalent = $false; Reason = $reason }
  }

  $missingHeadings = @()
  foreach ($key in $expected.HeadingSet.Keys) {
    if (-not $current.HeadingSet.ContainsKey($key)) { $missingHeadings += $key }
  }

  $missingListItems = @()
  foreach ($key in $expected.ListItemSet.Keys) {
    if (-not $current.ListItemSet.ContainsKey($key)) { $missingListItems += $key }
  }

  $missingTestCases = @()
  foreach ($key in $expected.TestCaseSet.Keys) {
    if (-not $current.TestCaseSet.ContainsKey($key)) { $missingTestCases += $key }
  }

  $plainTextMatches = $current.PlainTextKey -eq $expected.PlainTextKey
  $testCaseCountMatches = $current.TestCaseCount -eq $expected.TestCaseCount
  $structureMatches = $missingHeadings.Count -eq 0 -and $missingListItems.Count -eq 0 -and $missingTestCases.Count -eq 0 -and $testCaseCountMatches

  if ($plainTextMatches -and $structureMatches) {
    return @{ Comparable = $true; Equivalent = $true; Reason = "semantic text, headings, list items, and $($expected.TestCaseCount) Test Case list item(s) match." }
  }

  $reasons = @()
  if (-not $plainTextMatches) { $reasons += 'normalized plain text differs' }
  if ($missingHeadings.Count -gt 0) { $reasons += "missing heading(s): $($missingHeadings -join ', ')" }
  if ($missingListItems.Count -gt 0) { $reasons += "missing list item(s): $($missingListItems -join ', ')" }
  if ($missingTestCases.Count -gt 0) { $reasons += "missing Test Case item(s): $($missingTestCases -join ', ')" }
  if (-not $testCaseCountMatches) { $reasons += "Test Case count differs (current $($current.TestCaseCount), expected $($expected.TestCaseCount))" }

  return @{ Comparable = $true; Equivalent = $false; Reason = ($reasons -join '; ') }
}

function Get-AdfDescriptionSemanticKey {
  param($Description)

  $doc = ConvertTo-AdfDocObject -Adf $Description
  if ($doc -and $doc.content) {
    return Normalize-SemanticText -Text (Get-AdfText -Nodes $doc.content)
  }

  if ($Description) { return Normalize-SemanticText -Text ([string]$Description) }
  return ''
}

function Get-TestCaseUpdatePlan {
  param(
    [string]$CurrentSummary,
    $CurrentDescription,
    [string]$ExpectedSummary,
    $ExpectedDescription
  )

  $summaryChanged = (Normalize-Whitespace -Text $CurrentSummary) -ne (Normalize-Whitespace -Text $ExpectedSummary)
  $currentDescriptionKey = Get-AdfDescriptionSemanticKey -Description $CurrentDescription
  $expectedDescriptionKey = Get-AdfDescriptionSemanticKey -Description $ExpectedDescription
  $descriptionChanged = $currentDescriptionKey -ne $expectedDescriptionKey
  $fields = @()
  if ($summaryChanged) { $fields += 'summary' }
  if ($descriptionChanged) { $fields += 'description' }

  return @{
    NeedsUpdate = $fields.Count -gt 0
    SummaryChanged = $summaryChanged
    DescriptionChanged = $descriptionChanged
    Fields = $fields
  }
}

# Build ADF paragraph node
function New-AdfParagraph {
  param([string]$Text)
  return @{ type = 'paragraph'; content = @(@{ type = 'text'; text = $Text }) }
}

function New-AdfHeading {
  param([int]$Level, [string]$Text)
  return @{ type = 'heading'; attrs = @{ level = $Level }; content = @(@{ type = 'text'; text = $Text }) }
}

function New-AdfBulletItem {
  param([string]$Text)
  return @{ type = 'listItem'; content = @(@{ type = 'paragraph'; content = @(@{ type = 'text'; text = $Text }) }) }
}

function New-AdfBulletList {
  param([array]$Items)
  return @{ type = 'bulletList'; content = $Items }
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

function New-AdfLabeledParagraph {
  param([string]$Label, [string]$Value)
  return @{ type = 'paragraph'; content = @((New-AdfStrongText -Text "${Label}: "), (New-AdfText -Text $Value)) }
}

function New-AdfRule {
  return @{ type = 'rule' }
}

function Get-SyncAuditModeLabel {
  param([switch]$CommentResult, [switch]$NoWrite)
  if ($CommentResult -and $NoWrite) { return 'sync-comment (no-write preview)' }
  if ($NoWrite) { return 'no-write preview' }
  if ($CommentResult) { return 'sync-comment' }
  return 'sync'
}

function Get-UpdateStatusText {
  param([bool]$Changed, [switch]$NoWrite)
  if ($Changed -and $NoWrite) { return 'se actualizaria' }
  if ($Changed) { return 'actualizado' }
  return 'sin cambios'
}

function New-JiraNativeAuditCommentAdf {
  param(
    [string]$TestSetKey,
    [string]$ParentKey,
    [string]$ParentSummary,
    [string]$Mode,
    [string]$Result,
    [string]$SummaryStatus,
    [string]$DescriptionStatus,
    [string]$OriginalTaskStatus,
    [string]$OriginalTaskValue,
    [array]$CreatedTestCases,
    [int]$PlannedTestCaseCount,
    [int]$SkippedTestCaseCount,
    [int]$RawDuplicateCount,
    [int]$PostDedupDuplicateCount,
    [string]$QualityStatus
  )

  $createdItems = @()
  $createdLimit = 8
  $createdCount = if ($CreatedTestCases) { $CreatedTestCases.Count } else { 0 }
  for ($i = 0; $i -lt [Math]::Min($createdCount, $createdLimit); $i++) {
    $tc = $CreatedTestCases[$i]
    $createdItems += New-AdfBulletItem -Text "$($tc.Key): $($tc.Summary)"
  }
  if ($createdCount -gt $createdLimit) {
    $createdItems += New-AdfBulletItem -Text "... y $($createdCount - $createdLimit) Test Case(s) mas."
  }
  if ($createdItems.Count -eq 0) {
    $createdItems += New-AdfBulletItem -Text 'Sin Test Cases nuevos en esta ejecucion.'
  }

  $duplicateStatus = if ($RawDuplicateCount -gt 0) { "removidos $RawDuplicateCount; post-dedup $PostDedupDuplicateCount" } else { "sin duplicados; post-dedup $PostDedupDuplicateCount" }
  $originalTaskText = "$OriginalTaskStatus"
  if ($OriginalTaskValue) { $originalTaskText = "$originalTaskText -> $OriginalTaskValue" }

  $content = @(
    (New-AdfHeading -Level 3 -Text "$script:EmojiCheck Jira-native sync BETA ejecutado")
    (New-AdfLabeledParagraph -Label 'Test Set' -Value $TestSetKey)
    (New-AdfLabeledParagraph -Label 'Historia padre' -Value "$ParentKey - $ParentSummary")
    (New-AdfLabeledParagraph -Label 'Modo' -Value $Mode)
    (New-AdfLabeledParagraph -Label 'Resultado' -Value $Result)
    (New-AdfBulletList -Items @(
      (New-AdfBulletItem -Text "Summary: $SummaryStatus"),
      (New-AdfBulletItem -Text "Descripcion: $DescriptionStatus"),
      (New-AdfBulletItem -Text "Tarea Original: $originalTaskText"),
      (New-AdfBulletItem -Text "Test Cases creados: $createdCount de $PlannedTestCaseCount"),
      (New-AdfBulletItem -Text "Test Cases omitidos: $SkippedTestCaseCount"),
      (New-AdfBulletItem -Text "Duplicados: $duplicateStatus"),
      (New-AdfBulletItem -Text "Mojibake/quality gates: $QualityStatus"),
      (New-AdfBulletItem -Text 'Estado: BETA')
    ))
    (New-AdfHeading -Level 4 -Text 'Test Cases creados')
    (New-AdfBulletList -Items $createdItems)
  )

  return @{ type = 'doc'; version = 1; content = $content }
}

# Enrich scenarios with criterion names from source text when the Gherkin parser
# loses them (e.g. bare text nodes in ADF that skip structured parsing).
function ConvertTo-ScenariosWithCriterionNames {
  param([array]$Scenarios, [string]$SourceText)
  $criterionPattern = [regex]'(?i)(?:Criterio|Criterio)\s+\d+\s*:\s*([^\r\n]+?)(?:\s*[\r\n]|$)'
  $criterionMatches = $criterionPattern.Matches($SourceText)
  if ($criterionMatches.Count -eq 0) { return $Scenarios }

  # Grab full criterion lines (e.g. "Criterio 7: Validaci\u00f3n Cuenta RUT")
  $criterionNames = New-Object System.Collections.ArrayList
  for ($m = 0; $m -lt $criterionMatches.Count; $m++) {
    $fullName = $criterionMatches[$m].Value.Trim()
    # Strip the "Criterio N:" prefix to get just the name
    $cleanName = $fullName -replace '(?i)^Criterio\s+\d+\s*:\s*', ''
    $cleanName = $cleanName.Trim().TrimEnd('.', ';', ':')
    if ($cleanName) { [void]$criterionNames.Add($cleanName) }
  }

  if ($criterionNames.Count -eq 0) { return $Scenarios }

  # Match by position: criterion names appear in the same order as scenarios
  $enriched = New-Object System.Collections.ArrayList
  for ($s = 0; $s -lt $Scenarios.Count; $s++) {
    $scenario = $Scenarios[$s]
    # Make a mutable copy
    $copy = @{}
    foreach ($prop in $scenario.Keys) { $copy[$prop] = $scenario[$prop] }

    if ($s -lt $criterionNames.Count) {
      $name = $criterionNames[$s]
      if ($name) {
        $copy.Header = $name
        # Include criterion name in Description for short title generation
        if ($copy.Description -notmatch [regex]::Escape($name)) {
          $copy.Description = "$name. $(ConvertTo-LowerInitial -Text $copy.Description)"
        }
      }
    }

    [void]$enriched.Add($copy)
  }

  return $enriched.ToArray()
}

# Extract acceptance criteria from a TMSPROD ticket's ADF description
function Get-TestScenarios {
  param([string]$AdfJson)
  $scenarios = @()
  try { $doc = $AdfJson | ConvertFrom-Json } catch { return $scenarios }

  $inCriteria = $false
  $inScope = $false
  $scenarioCount = 0
  $criteriaTextBlocks = @()

  foreach ($node in $doc.content) {
    if ($node.type -eq 'heading') {
      $headingText = Get-AdfText -Nodes $node.content
      $inCriteria = $headingText -match 'Criterios de Aceptaci.n|Criterio|Escenarios|Escenario'
      $inScope = $headingText -match 'Alcance'
    }

    if ($inCriteria -and $node.type -eq 'table') {
        # Extract from table
        # Supports:
        #   2 columns: [0]=header,       [1]=description
        #   3 columns: [0]=#,            [1]=criterio,       [2]=detalle/escenario
        #   4 columns: [0]=#,            [1]=criterio,       [2]=detalle/escenario,  [3]=resultado esperado
      foreach ($row in $node.content) {
        if ($row.type -ne 'tableRow') { continue }
        $cells = $row.content
        if (-not $cells -or $cells.Count -lt 2) { continue }
        $cellTexts = @($cells | ForEach-Object { (Get-AdfText -Nodes $_.content).Trim() })
        $nonEmpty = @($cellTexts | Where-Object { $_ -ne '' })
        if ($nonEmpty.Count -lt 2) { continue }
        # Skip header row: first cell matches number pattern AND second+ looks like column name
        if ($nonEmpty.Count -ge 2 -and $nonEmpty[0] -match '^[#Nn].{0,3}$' -and $nonEmpty[1] -match '^(Criterio|Descripci.n|Escenario|Nombre|T.tulo|Detalle|Escenario)') { continue }
        # Also skip if any cell contains table-header keywords
        if (($nonEmpty -join ' ') -match '(?i)^(Criterio|Descripci.n|Escenario|Resultado Esperado|Detalle / Escenario)$') { continue }
        if ($nonEmpty.Count -ge 4) {
          # 4 columns: number, criterio, detalle, resultado esperado
          $newScenarios = @(New-AcceptanceScenariosFromCriterionText -Text $nonEmpty[2] -StartNumber ($scenarioCount + 1) -Header $nonEmpty[1] -ExpectedResult $nonEmpty[3])
          foreach ($scenario in $newScenarios) {
            $scenarios += $scenario
            $scenarioCount = $scenario.Number
          }
        } elseif ($nonEmpty.Count -eq 3) {
          # 3 columns: number, criterio, detalle
          $newScenarios = @(New-AcceptanceScenariosFromCriterionText -Text $nonEmpty[2] -StartNumber ($scenarioCount + 1) -Header $nonEmpty[1])
          foreach ($scenario in $newScenarios) {
            $scenarios += $scenario
            $scenarioCount = $scenario.Number
          }
        } else {
          # 2 columns: header, description (existing behavior)
          $description = $nonEmpty[1]
          if ($description) {
            $newScenarios = @(New-AcceptanceScenariosFromCriterionText -Text $description -StartNumber ($scenarioCount + 1) -Header $nonEmpty[0])
            foreach ($scenario in $newScenarios) {
              $scenarios += $scenario
              $scenarioCount = $scenario.Number
            }
          }
        }
      }
    }

    if ($inCriteria -and $node.type -eq 'bulletList') {
      foreach ($item in $node.content) {
        if ($item.type -ne 'listItem') { continue }
        $text = Get-AdfText -Nodes $item.content
        if ($text -and $text.Trim()) {
          $newScenarios = @(New-AcceptanceScenariosFromCriterionText -Text $text.Trim() -StartNumber ($scenarioCount + 1) -Header 'Criterio')
          foreach ($scenario in $newScenarios) {
            $scenarios += $scenario
            $scenarioCount = $scenario.Number
          }
        }
      }
    }

    if ($inCriteria -and $node.type -match '^(paragraph|panel|blockquote|codeBlock)$') {
      $text = Normalize-Whitespace -Text (Get-AdfText -Nodes @($node))
      if ($text) { $criteriaTextBlocks += $text }
    }

    if ($inCriteria -and $node.type -eq 'orderedList') {
      foreach ($item in $node.content) {
        if ($item.type -ne 'listItem') { continue }
        $text = Normalize-Whitespace -Text (Get-AdfText -Nodes $item.content)
        if ($text) { $criteriaTextBlocks += $text }
      }
    }
  }

  if ($criteriaTextBlocks.Count -gt 0) {
    $gherkinScenarios = Get-GherkinScenariosFromText -Text ($criteriaTextBlocks -join "`n") -StartNumber ($scenarioCount + 1)
    foreach ($scenario in $gherkinScenarios) {
      $scenarios += $scenario
      $scenarioCount = $scenario.Number
    }

    if ($gherkinScenarios.Count -eq 0) {
      $paragraphScenarios = Get-ParagraphAcceptanceScenarios -TextBlocks $criteriaTextBlocks -StartNumber ($scenarioCount + 1)
      foreach ($scenario in $paragraphScenarios) {
        $scenarios += $scenario
        $scenarioCount = $scenario.Number
      }
    }
  }

  if ($scenarios.Count -eq 0) {
    $allText = ((Get-AdfTopLevelBlockTexts -Doc $doc) | ForEach-Object { $_.Text }) -join "`n"
    $scenarios = Get-GherkinScenariosFromText -Text $allText -StartNumber 1

    # Enrich Gherkin-extracted scenarios with criterion names from source text
    if ($scenarios.Count -gt 0) {
      $scenarios = ConvertTo-ScenariosWithCriterionNames -Scenarios $scenarios -SourceText $allText
    }
  }

  # Common enrichment: try to extract criterion names for scenarios missing them
  if ($scenarios.Count -gt 0) {
    $needEnrich = $false
    foreach ($s in $scenarios) {
      if ($s.Header -eq 'Criterio' -or $s.Header -eq 'Gherkin' -or -not $s.Header) { $needEnrich = $true; break }
    }
    if ($needEnrich) {
      # Collect full text from ADF for criterion name extraction
      $collectText = ((Get-AdfTopLevelBlockTexts -Doc $doc) | ForEach-Object { $_.Text }) -join "`n"
      $scenarios = ConvertTo-ScenariosWithCriterionNames -Scenarios $scenarios -SourceText $collectText
    }
  }

  return $scenarios
}

function Get-RealisticGwt {
  <#
  .SYNOPSIS
    Generate realistic, domain-aware Given/When/Then from a scenario description.
    Uses verb pattern matching against the description to produce specific,
    self-contained steps that never reference the parent ticket generically.
  #>
  param(
    [string]$Description,
    [string]$ModuleContext,
    [string]$DomainObject,
    [string]$ExpectedResult,
    [string]$Source
  )

  $gherkinSource = Complete-GherkinTextWithExpectedResult -Text $Description -ExpectedResult $ExpectedResult
  $parsedGherkin = @(Get-GherkinScenariosFromText -Text $gherkinSource -StartNumber 1)
  if ($parsedGherkin.Count -gt 0) {
    $firstGherkin = $parsedGherkin[0]
    return @{
      Given = $firstGherkin.Given
      When = $firstGherkin.When
      Then = $firstGherkin.Then
    }
  }

  $lower = $Description.ToLowerInvariant()
  $given = ''
  $when = ''
  $then = ''

  # Helper: extract a short noun phrase from description for use in steps
  $topicPhrase = $Description
  # Trim leading verbs and "de" to get the core noun
  if ($topicPhrase -match '^(?:validar|verificar|crear|agregar|editar|modificar|eliminar|filtrar|buscar|exportar|importar|cargar|asignar|registrar|actualizar|listar|visualizar|comprobar|revisar)\s+(.+)$') {
    $topicPhrase = $Matches[1]
  }
  $topicPhrase = (Get-Culture).TextInfo.ToTitleCase($topicPhrase.ToLower())
  $actionItem = if ($DomainObject -ne 'registros') { $DomainObject } else { $topicPhrase }

  # Detect action category from description
  $isCreate  = $lower -match '^(?:crear|agregar|registrar|ingresar|nuev|dar\s+de\s+alta)'
  $isEdit    = $lower -match '^(?:editar|modificar|actualizar|cambiar|corregir|ajustar)'
  $isDelete  = $lower -match '^(?:eliminar|borrar|remover|quitar|dar\s+de\s+baja)'
  $isView    = $lower -match '^(?:visualizar|listar|mostrar|ver|consultar|revisar|desplegar|abrir)'
  $isValidate = $lower -match '^(?:validar|verificar|comprobar|asegur|garantiz)'
  $isFilter  = $lower -match '(?:filtro|filtrar|buscar|busqueda|búsqueda)'
  $isExport  = $lower -match '^(?:exportar|descargar)'
  $isImport  = $lower -match '^(?:importar|subir|cargar)\s+(?!masiva)'
  $isError   = $lower -match '(?:error|invalido|inválido|rechaz|excepci.n|fallo|incorrect|err.ne|no\s+deber.a|negativ)'
  $isReset   = $lower -match '(?:limpiar|restablecer|reset|borrar\s+filtro)'
  $isAssign  = $lower -match '^(?:asignar|asociar|vincular)'
  $isBatch   = $lower -match '(?:masiva|batch|lote|masivo|bulk)'
  $isRange   = $lower -match '(?:rango|intervalo|entre|desde|hasta|limite|límite|superior|inferior)'
  $isRequired = $lower -match '(?:obligatorio|requerido|necesario|campo\s+requerido|requisito)'
  $isDuplicate = $lower -match '(?:duplicad|repetid|existente|ya\s+existe)'
  $isFormat  = $lower -match '(?:formato|longitud|c.rcter|patr.n|m.scara|formato\s+incorrecto|caracteres)'

  # Determine action verb and object for When clause based on category
  if ($isCreate) {
    $whenAction = "crea un nuevo $actionItem con los datos especificados en el criterio"
    $thenExpectation = "el $actionItem se crea correctamente y queda disponible en el sistema"
  } elseif ($isEdit) {
    $whenAction = "modifica los campos del $actionItem segun lo indicado en el criterio"
    $thenExpectation = "los cambios se guardan correctamente y el $actionItem refleja los nuevos valores"
  } elseif ($isDelete) {
    $whenAction = "ejecuta la eliminacion del $actionItem seleccionado"
    $thenExpectation = "el $actionItem se elimina del sistema y ya no aparece en las consultas"
  } elseif ($isView) {
    $whenAction = "consulta o accede a la vista de $actionItem en el modulo"
    $thenExpectation = "el sistema muestra la informacion del $actionItem de forma completa y correcta"
  } elseif ($isValidate -and $isError) {
    $whenAction = "ingresa datos que no cumplen con las reglas de validacion para $actionItem"
    $thenExpectation = "el sistema rechaza los datos y muestra un mensaje de error claro"
  } elseif ($isValidate -and $isRange) {
    $whenAction = "ingresa valores en los limites del rango definido para $actionItem"
    $thenExpectation = "el sistema acepta los valores dentro del rango y rechaza los que estan fuera"
  } elseif ($isValidate -and $isRequired) {
    $whenAction = "intenta guardar sin completar los campos obligatorios de $actionItem"
    $thenExpectation = "el sistema muestra un error indicando que los campos requeridos son necesarios"
  } elseif ($isValidate -and $isFormat) {
    $whenAction = "ingresa datos con formato incorrecto o fuera de lo esperado para $actionItem"
    $thenExpectation = "el sistema rechaza el formato invalido y muestra el mensaje de error correspondiente"
  } elseif ($isValidate -and $isDuplicate) {
    $whenAction = "intenta crear un $actionItem con datos que ya existen en el sistema"
    $thenExpectation = "el sistema detecta el duplicado y rechaza la operacion"
  } elseif ($isValidate) {
    $whenAction = "realiza la validacion descrita en el criterio sobre $actionItem"
    $thenExpectation = "el sistema aplica las reglas de validacion y retorna el resultado esperado"
  } elseif ($isFilter) {
    $whenAction = "aplica el filtro o criterio de busqueda sobre los $actionItem disponibles"
    $thenExpectation = "el listado muestra solo los $actionItem que cumplen la condicion aplicada"
  } elseif ($isExport) {
    $whenAction = "exporta o descarga los datos de $actionItem desde el modulo"
    $thenExpectation = "el archivo exportado contiene los datos correctos y puede abrirse sin errores"
  } elseif ($isImport -or $isBatch) {
    $whenAction = "procesa la carga de datos de $actionItem en el sistema"
    $thenExpectation = "los datos se importan correctamente y quedan disponibles en el modulo correspondiente"
  } elseif ($isAssign) {
    $whenAction = "asigna o vincula el $actionItem segun la relacion definida en el criterio"
    $thenExpectation = "la asignacion se realiza correctamente y la relacion queda registrada"
  } elseif ($isReset) {
    $whenAction = "limpia o restablece los valores del formulario de $actionItem"
    $thenExpectation = "los campos vuelven a su estado inicial sin datos ingresados"
  } elseif ($isError) {
    $whenAction = "ingresa datos no validos o incompletos para $actionItem"
    $thenExpectation = "el sistema rechaza la operacion y muestra un mensaje de error apropiado"
  } else {
    # Generic fallback: extract key action from description
    if ($lower -match '^(?:que\s+)?(.+?)(?:\s+(?:en\s+el|en\s+la|para\s+el|para\s+la|del\s+|de\s+la|de\s+los|de\s+las)\s+)') {
      $actionPhrase = $Matches[1]
    } else {
      $actionPhrase = $Description
    }
    $whenAction = "ejecuta la accion: $actionPhrase"
    $thenExpectation = "el sistema responde segun lo definido en el criterio sin errores inesperados"
  }

  # Build Given clause
  if ($isCreate -or $isImport -or $isBatch) {
    $given = "que se requiere $((ConvertTo-LowerInitial -Text $Description)) en el sistema"
  } elseif ($isEdit -or $isDelete -or $isAssign) {
    $given = "que existe un $actionItem registrado en el sistema con los datos necesarios para realizar la operacion"
  } elseif ($isView) {
    $given = "que existen $DomainObject en el sistema y el usuario accede a la funcionalidad correspondiente"
  } elseif ($isFilter) {
    $given = "que existen $DomainObject con datos que coinciden y no coinciden con el criterio de busqueda"
  } elseif ($isValidate -and $isRequired) {
    $given = "que el usuario intenta completar la operacion de $actionItem sin llenar los campos obligatorios"
  } elseif ($isValidate -and $isDuplicate) {
    $given = "que ya existe un registro de $actionItem con los mismos datos en el sistema"
  } elseif ($isValidate) {
    $given = "que el usuario realiza la operacion de validacion sobre $actionItem"
  } elseif ($isReset) {
    $given = "que el usuario ha ingresado datos en el formulario de $actionItem y desea limpiarlos"
  } elseif ($isExport) {
    $given = "que existen $DomainObject disponibles en el modulo para ser exportados"
  } else {
    $given = "que el usuario se encuentra en la funcionalidad de $actionItem y procede con la operacion indicada"
  }

  # Build When clause
  $when = $whenAction

  # Build Then clause: prefer ExpectedResult, then category default, then description-based
  if ($ExpectedResult) {
    $normalizedExpected = ConvertTo-LowerInitial -Text (Normalize-Whitespace -Text $ExpectedResult)
    if ($normalizedExpected -notmatch 'error|fallo|no se|rechaz') {
      $then = $normalizedExpected
    } else {
      $then = $normalizedExpected
    }
  } else {
    $then = $thenExpectation
  }

  # If expected result mentions error and description is about validation, reinforce error messaging
  if ($ExpectedResult -match '(?i)error|mensaje|rechaz|invalido|inválido|falla') {
    $then = ConvertTo-LowerInitial -Text (Normalize-Whitespace -Text $ExpectedResult)
  }

  return @{
    Given = $given
    When = $when
    Then = $then
  }
}

function Limit-TextAtWord {
  param([string]$Text, [int]$MaxLength = 420)
  $clean = Normalize-Whitespace -Text $Text
  if (-not $clean -or $clean.Length -le $MaxLength) { return $clean }

  $limited = $clean.Substring(0, $MaxLength).TrimEnd()
  $lastSpace = $limited.LastIndexOf(' ')
  if ($lastSpace -gt 120) { $limited = $limited.Substring(0, $lastSpace) }
  while ($limited -match '(?i)\s+(de|del|la|el|los|las|que|para|por|con|en|a|al|y|o)$') {
    $limited = ($limited -replace '(?i)\s+(de|del|la|el|los|las|que|para|por|con|en|a|al|y|o)$', '').TrimEnd()
  }
  return $limited.TrimEnd(' ', '.', ',', ';', ':') + '.'
}

function Limit-TextAtSentence {
  param([string]$Text, [int]$MaxLength = 420)
  $clean = Normalize-Whitespace -Text $Text
  if (-not $clean -or $clean.Length -le $MaxLength) { return $clean }

  $sentences = @($clean -split '(?<=[\.!?])\s+' | ForEach-Object { Normalize-Whitespace -Text $_ } | Where-Object { $_ })
  $selected = @()
  foreach ($sentence in $sentences) {
    $candidate = Normalize-Whitespace -Text (($selected + $sentence) -join ' ')
    if ($candidate.Length -le $MaxLength) {
      $selected += $sentence
    } else {
      break
    }
  }

  if ($selected.Count -gt 0) { return Normalize-Whitespace -Text ($selected -join ' ') }
  return Limit-TextAtWord -Text $clean -MaxLength $MaxLength
}

function Convert-UserStoryToFunctionalSummary {
  param([string]$Text)
  $clean = Normalize-Whitespace -Text $Text
  if (-not $clean -or $clean -notmatch '(?i)\bcomo\b.*\bquiero\b.*\bpara\b') { return '' }

  $match = [regex]::Match($clean, '(?is)\bcomo\s+(.+?),\s*quiero\s+(.+?),\s*para\s+(.+?)(?:\.|$)')
  if (-not $match.Success) { return '' }

  $goal = Normalize-Whitespace -Text $match.Groups[2].Value
  $outcome = Normalize-Whitespace -Text $match.Groups[3].Value
  if (-not $goal -or -not $outcome) { return '' }

  $goal = $goal -replace '(?i)^que\s+exista\s+', 'que el sistema cuente con '
  $goal = $goal -replace '(?i)^poder\s+', 'el sistema permita '
  if ($goal -notmatch '(?i)^(que|el\s+sistema)\b') { $goal = "que el sistema permita $goal" }

  return Limit-TextAtSentence -Text "Validar $goal para $outcome." -MaxLength 420
}

function Get-ConciseParentDescriptionSummary {
  param([string]$ParentText)
  $clean = Normalize-Whitespace -Text $ParentText
  if (-not $clean) { return '' }

  # Jira ADF sometimes concatenates labels with text; add separators around known labels.
  $sectionLabels = 'Historia\s+de\s+Usuario|Descripci.n\s+Funcional|Descripci.n|Detalles\s*/\s*Contexto\s*Adicional|Motivo\s*/\s*Justificaci.n|Campos\s+Nuevos\s+Requeridos|Reglas\s+de\s+Negocio|Criterios?\s+de\s+Aceptaci.n|Consideraciones\s+T.cnicas|Resultado\s+Esperado|Mockups?|Moclups?'
  $clean = $clean -replace "(?i)($sectionLabels)", ' $1 '
  $clean = $clean -replace '([\.!?])(?=\p{Lu})', '$1 '
  $clean = Normalize-Whitespace -Text $clean

  $section = ''
  $descriptionMatch = [regex]::Match($clean, '(?is)(?:Descripci.n\s+Funcional|Descripci.n)\s*(.+?)(Detalles\s*/\s*Contexto\s*Adicional|Motivo\s*/\s*Justificaci.n|Campos\s+Nuevos\s+Requeridos|Reglas\s+de\s+Negocio|Criterios?\s+de\s+Aceptaci.n|Consideraciones\s+T.cnicas|Resultado\s+Esperado|Mockups?|Moclups?|$)')
  if ($descriptionMatch.Success) { $section = Normalize-Whitespace -Text $descriptionMatch.Groups[1].Value }

  if (-not $section) {
    $storyMatch = [regex]::Match($clean, '(?is)Historia\s+de\s+Usuario\s*(.+?)(Descripci.n\s+Funcional|Descripci.n|Detalles\s*/\s*Contexto\s*Adicional|Criterios?\s+de\s+Aceptaci.n|Reglas\s+de\s+Negocio|Consideraciones\s+T.cnicas|Resultado\s+Esperado|$)')
    if ($storyMatch.Success) { $section = Normalize-Whitespace -Text $storyMatch.Groups[1].Value }
  }

  if (-not $section) {
    $section = $clean -replace '(?is)Detalles\s*/\s*Contexto\s*Adicional.*$', ''
    $section = $section -replace '(?is)Criterios?\s+de\s+Aceptaci.n.*$', ''
    $section = $section -replace '(?is)Consideraciones\s+T.cnicas.*$', ''
    $section = $section -replace '(?is)Resultado\s+Esperado.*$', ''
    $section = Normalize-Whitespace -Text $section
  }

  if (-not $section) { return '' }
  $section = $section -replace '[\p{So}\p{Cs}]', ' '
  $section = Normalize-Whitespace -Text ($section -replace '([\.!?])(?=\p{Lu})', '$1 ')

  $userStorySummary = Convert-UserStoryToFunctionalSummary -Text $section
  if ($userStorySummary) { return $userStorySummary }

  $sentences = @($section -split '(?<=[\.!?])\s+' | ForEach-Object { Normalize-Whitespace -Text $_ } | Where-Object { $_ -and $_.Length -gt 25 })
  if ($sentences.Count -eq 0) { return Limit-TextAtWord -Text $section -MaxLength 360 }

  $selected = @()
  foreach ($sentence in $sentences) {
    if ($sentence -match '(?i)^Actualmente\b') { continue }
    if ($sentence -match '(?i)^Evaluar\b') { continue }
    if ($sentence -match '(?i)(accion\s+manual|acción\s+manual|riesgo\s+de\s+inconsistencia|volver\s+a\s+editar|genera\s+una\s+accion|genera\s+una\s+acción)') { continue }
    if ($sentence -match '(?i)\b(se\s+requiere|debe|deben|permitir|actualiz|validar|incorporar|generar|calcular|registrar|mostrar|incluir|recalcular|persistir)\b') {
      $selected += $sentence
    }
    if (($selected -join ' ').Length -ge 280 -or $selected.Count -ge 2) { break }
  }

  if ($selected.Count -eq 0) { $selected += $sentences[0] }
  return Limit-TextAtSentence -Text ($selected -join ' ') -MaxLength 420
}

function Get-ParentTicketScopeSummary {
  param(
    [string]$ParentSummary,
    [string]$ParentText,
    [string]$Capability,
    [string]$ModuleContext,
    [string]$Fallback
  )

  $summary = Get-ConciseParentDescriptionSummary -ParentText $ParentText
  if (-not $summary -or $summary.Length -lt 40) { return $Fallback }

  $intro = "Validar $Capability en $ModuleContext."
  if ($ParentSummary -and $summary -match [regex]::Escape($ParentSummary)) { return Limit-TextAtWord -Text $summary -MaxLength 480 }

  $availableForSummary = [Math]::Max(220, 500 - $intro.Length)
  $summary = Limit-TextAtSentence -Text $summary -MaxLength $availableForSummary
  return Limit-TextAtSentence -Text "$intro $summary" -MaxLength 520
}

function Get-ParentStoryAnalysis {
  param(
    [string]$ParentKey,
    [string]$ParentSummary,
    [string]$ParentText,
    [array]$Scenarios
  )

  $source = Normalize-Whitespace -Text "$ParentSummary $ParentText"
  $moduleContext = 'la vista funcional indicada en la historia de usuario'
  $capability = ConvertTo-LowerInitial -Text $ParentSummary
  $domainObject = 'registros'

  if ($source -match '(?i)\bapi\b' -and $source -match '(?i)viajes?' -and $source -match '(?i)asignaci.n|asignar|recursos?') {
    $moduleContext = 'API de Viajes'
    $domainObject = 'viajes con recursos asignados'
  } elseif ($source -match '(?i)(ultima|última)\s+milla|pedidos?') {
    $moduleContext = 'Listado de Pedidos de Ultima Milla'
    $domainObject = 'pedidos'
  } elseif ($source -match '(?i)viajes?|n.?\s*de\s*viaje') {
    $moduleContext = 'Listado de Viajes'
    $domainObject = 'viajes'
  } elseif ($source -match '(?i)prefactura') {
    $moduleContext = 'Prefactura'
    $domainObject = 'prefacturas'
  } elseif ($source -match '(?i)proforma') {
    $moduleContext = 'Proforma'
    $domainObject = 'proformas'
  } elseif ($source -match '(?i)temperatura\s+carga|temperatura') {
    $moduleContext = 'Modulo Temperatura Carga'
    $domainObject = 'temperaturas de carga'
  } elseif ($source -match '(?i)contratos?') {
    $moduleContext = 'Listado de Contratos'
    $domainObject = 'contratos'
  } elseif ($source -match '(?i)carga\s+masiva(?:\s+de\s+conductores)?') {
    $moduleContext = 'Carga Masiva de Conductores'
    $domainObject = 'conductores'
  } elseif ($source -match '(?i)conductores?|mantenedor\s+de\s+conductores') {
    $moduleContext = 'Mantenedor de Conductores'
    $domainObject = 'conductores'
  }

  if ($source -match '(?i)\bapi\b' -and $source -match '(?i)viajes?' -and $source -match '(?i)asignaci.n|asignar|recursos?') {
    $capability = 'creacion de viajes con asignacion automatica de recursos'
  } elseif ($source -match '(?i)temperatura\s+carga|temperatura') {
    $capability = 'crear y modificar reglas de datos de temperatura de carga'
  } elseif ($source -match '(?i)tipo\s+operaci.n.*contratos?|contratos?.*tipo\s+operaci.n') {
    $capability = 'agregar columna Tipo Operacion en contratos'
  } elseif ($source -match '(?i)filtro|filtrar|busqueda|búsqueda') {
    if ($source -match '(?i)n.?\s*de\s*viaje|numero\s+de\s+viaje|número\s+de\s+viaje|id\s+de\s+viaje') {
      $capability = 'filtrar por numero de viaje'
    } elseif ($ParentSummary -match '(?i)filtro\s+(.+)$') {
      $capability = ConvertTo-LowerInitial -Text "filtrar $($Matches[1])"
    } else {
      $capability = 'filtrar resultados del listado'
    }
  } elseif ($capability -match '^(agregar|crear|implementar)\s+') {
    $capability = ($capability -replace '^(agregar|crear|implementar)\s+', '')
  } elseif ($source -match '(?i)r\s*u\s*t\s*.*d.gito.*verificador|d.gito.*verificador.*r\s*u\s*t') {
    $capability = 'validar RUT con digito verificador "K" mayuscula'
  } elseif ($source -match '(?i)carga\s+masiva') {
    $capability = 'carga masiva de conductores'
  }

  if ($capability -match 'filtrar por numero de viaje') {
    $scopeSummary = "Validar que $ParentKey prueba el filtro por numero de viaje en $moduleContext, comprobando que la busqueda retorna solo $domainObject asociados al viaje consultado."
  } elseif ($moduleContext -eq 'Modulo Temperatura Carga') {
    $scopeSummary = "Validar en $moduleContext la creacion y actualizacion de $domainObject, comprobando reglas de obligatoriedad, rangos y rechazo de datos invalidos definidos por $ParentKey."
  } elseif ($source -match '(?i)r\s*u\s*t\s*.*d.gito.*verificador|d.gito.*verificador.*r\s*u\s*t') {
    $scopeSummary = "Validar que la carga masiva de conductores acepte correctamente RUT con digito verificador `"K`" mayuscula, asegurando que todos los RUT validos sean procesados sin impactar otras validaciones ni la integridad de los datos existentes."
  } else {
    $scopeSummary = "Validar $capability en $moduleContext, comprobando el proceso afectado, las reglas funcionales principales y los resultados esperados definidos por $ParentKey."
  }

  $scopeSummary = Get-ParentTicketScopeSummary -ParentSummary $ParentSummary -ParentText $ParentText -Capability $capability -ModuleContext $moduleContext -Fallback $scopeSummary

  $scenarioAnalyses = @()
  foreach ($scenario in $Scenarios) {
    $description = Normalize-Whitespace -Text $scenario.Description
    $lower = $description.ToLowerInvariant()
    $given = Normalize-Whitespace -Text $scenario.Given
    $when = Normalize-Whitespace -Text $scenario.When
    $then = Normalize-Whitespace -Text $scenario.Then

    if (-not $given -or -not $when -or -not $then) {
      # Generate realistic, domain-aware GWT from the description
      $expectedResult = Normalize-Whitespace -Text $scenario.ExpectedResult
      $gwtResult = Get-RealisticGwt -Description $description -ModuleContext $moduleContext -DomainObject $domainObject -ExpectedResult $expectedResult -Source $source
      $given = $gwtResult.Given
      $when = $gwtResult.When
      $then = $gwtResult.Then

      # Domain-specific overrides for well-known modules with hand-crafted steps
      if ($lower -match 'tipo\s+operaci.n' -and $source -match '(?i)contratos?') {
        $given = 'el usuario se encuentra en el Listado de Contratos y existen contratos con Tipo Operacion informado'
        $when = 'consulta la grilla de contratos configurada para mostrar la nueva informacion operacional'
        $then = 'la grilla muestra la columna "Tipo Operacion" con el valor correspondiente para cada contrato'

        if ($lower -match 'macrozonas\s+agregadas|visualiza\s+la\s+grilla') {
          $given = 'el usuario se encuentra en la seccion de macrozonas agregadas de un contrato'
          $when = 'visualiza la grilla "Macrozonas Agregadas"'
          $then = 'la grilla incluye una columna llamada "Tipo Operacion"'
        } elseif ($lower -match 'macrozona') {
          $given = 'el usuario se encuentra editando un contrato con configuracion de Tipo Operacion por macrozona'
          $when = 'agrega una macrozona al contrato'
          $then = 'el campo "Tipo Operacion" queda determinado por la configuracion del contrato y no permite edicion manual'
        } elseif ($lower -match 'tipo\s+servicio|servicios') {
          $given = 'el usuario se encuentra editando un contrato con Tipo Operacion definido y servicios asociados a esa operacion'
          $when = 'selecciona el campo Tipo Servicio del contrato'
          $then = 'el sistema muestra solo servicios asociados al Tipo Operacion del contrato'
        } elseif ($lower -match 'hist.ric') {
          $given = 'el usuario se encuentra en el Listado de Contratos y existen contratos historicos con Tipo Operacion registrado'
          $when = 'consulta los registros historicos del listado'
          $then = 'la columna "Tipo Operacion" muestra la informacion correspondiente para cada registro historico'
        } elseif ($lower -match 'consulta|edita|editar|existente') {
          $given = 'el usuario se encuentra en el Listado de Contratos y existe un contrato previamente registrado con Tipo Operacion'
          $when = 'consulta o edita el contrato existente'
          $then = 'la columna "Tipo Operacion" se mantiene visible y consistente con la informacion registrada'
        } elseif ($lower -match 'columna|listado|grilla|tabla|visualizar|mostrar|ver') {
          $when = 'abre o actualiza el listado de contratos'
          $then = 'la tabla de contratos incluye la columna "Tipo Operacion" visible para el usuario'
        } elseif ($lower -match 'valor|dato|informaci.n|correspond|seg.n') {
          $when = 'revisa los registros del listado de contratos'
          $then = 'cada contrato muestra en "Tipo Operacion" el valor asociado a su configuracion operacional'
        } elseif ($lower -match 'orden|ubicaci.n|posici.n') {
          $when = 'visualiza las columnas disponibles en el listado de contratos'
          $then = 'la columna "Tipo Operacion" se presenta en la ubicacion definida sin desplazar informacion critica del contrato'
        } elseif ($lower -match 'export|descarg') {
          $when = 'exporta el listado de contratos desde la vista'
          $then = 'el archivo exportado incluye la columna "Tipo Operacion" con los valores visibles en la grilla'
        }
      } elseif ($lower -match 'n.?\s*de\s*viaje|numero\s+de\s+viaje|número\s+de\s+viaje|id\s+de\s+viaje') {
        $given = "el usuario se encuentra en $moduleContext y existen $domainObject asociados a un numero de viaje conocido"
        $when = 'ingresa ese numero en el filtro Nro. de viaje y ejecuta la busqueda'
        $then = "el listado muestra solo $domainObject asociados a ese viaje y excluye $domainObject de otros viajes"
      } elseif ($lower -match 'filtro|filtrar|busqueda|búsqueda') {
        $given = "el usuario se encuentra en $moduleContext y existen $domainObject con datos que coinciden y no coinciden con el filtro"
        $when = "aplica el filtro descrito en el criterio: $description"
        $then = "el listado muestra solo $domainObject que cumplen la condicion filtrada"
      } elseif ($lower -match 'limpiar|restablecer') {
        $given = "el usuario se encuentra en $moduleContext con filtros aplicados y resultados filtrados visibles"
        $when = 'limpia los filtros aplicados en la vista'
        $then = "el listado vuelve a mostrar los $domainObject disponibles sin restricciones del filtro anterior"
      } elseif ($lower -match 'persist') {
        $given = "el usuario se encuentra en $moduleContext despues de aplicar una condicion de consulta"
        $when = 'actualiza la vista o navega dentro del flujo permitido por el criterio'
        $then = 'la condicion aplicada se mantiene segun lo definido por el criterio de aceptacion'
      }
    }

    if ($moduleContext -eq 'API de Viajes' -and $lower -match '(solicitud|viaje|recurso|asignaci.n|asignar)') {
      $given = 'que existe una solicitud valida para crear un viaje mediante la API de Viajes'
      $when = 'se envia la solicitud de creacion de viaje con los datos de asignacion de recursos definidos por el criterio'
      $then = 'la API crea el viaje y responde con la asignacion de recursos esperada sin requerir intervencion manual'

      if ($lower -match '(ocupado|no\s+disponible|error|rechaz)') {
        $given = 'que existe una solicitud de creacion de viaje con un recurso ocupado o no disponible'
        $when = 'se envia la solicitud de creacion de viaje para asignar ese recurso'
        $then = 'la API rechaza la asignacion y retorna un error claro sin crear una asignacion invalida'
      } elseif ($lower -match '(m.ltiples|multiples|compiten|mismo\s+recurso)') {
        $given = 'que existen multiples solicitudes de creacion de viajes que compiten por el mismo recurso'
        $when = 'la API procesa las solicitudes de asignacion de recursos'
        $then = 'la API asigna los recursos segun las reglas de prioridad y evita conflictos de asignacion'
      } elseif ($lower -match '(sin\s+informaci.n\s+de\s+recursos|sin\s+recursos)') {
        $given = 'que existe una solicitud de creacion de viaje sin informacion de recursos'
        $when = 'se envia la solicitud a la API de Viajes'
        $then = 'la API responde segun la regla definida para viajes sin recursos y no genera asignaciones incompletas'
      } elseif ($lower -match '(completa|confirmad|registrad)') {
        $given = 'que existe una solicitud completa de creacion de viaje con recursos disponibles'
        $when = 'la API registra el viaje y confirma la asignacion de recursos'
        $then = 'el viaje queda creado con todos los recursos asignados y confirmados'
      }
    }

    $scenarioAnalyses += @{
      Number = $scenario.Number
      Header = $scenario.Header
      Description = $description
      Given = $given
      When = $when
      Then = $then
      ExpectedResult = Normalize-Whitespace -Text $scenario.ExpectedResult
    }
  }

  return @{
    ModuleContext = $moduleContext
    Capability = $capability
    DomainObject = $domainObject
    ScopeSummary = $scopeSummary
    Scenarios = $scenarioAnalyses
  }
}

function Get-ForbiddenSemanticPhrases {
  return @(
    'modulo relacionado',
    'módulo relacionado',
    'sistema responde correctamente',
    'segun el criterio',
    'según el criterio'
  )
}

function Test-GwtSemanticQuality {
  param(
    [string]$Name,
    [string]$Given,
    [string]$When,
    [string]$Then,
    [string]$Criterion
  )

  $errors = @()
  $joined = "$Given`n$When`n$Then".ToLowerInvariant()
  foreach ($phrase in Get-ForbiddenSemanticPhrases) {
    if ($joined.Contains($phrase.ToLowerInvariant())) { $errors += "$Name contains forbidden generic phrase '$phrase'." }
  }

  if ((Normalize-Whitespace -Text $When) -eq (Normalize-Whitespace -Text $Criterion)) {
    $errors += "$Name has a bare criterion-only When step."
  }

  foreach ($step in @(@{ Label = 'Given'; Text = $Given }, @{ Label = 'When'; Text = $When }, @{ Label = 'Then'; Text = $Then })) {
    if (-not (Normalize-Whitespace -Text $step.Text)) { $errors += "$Name has an empty $($step.Label) step." }
  }

  return $errors
}

function Assert-GwtSemanticQuality {
  param(
    [string]$Name,
    [string]$Given,
    [string]$When,
    [string]$Then,
    [string]$Criterion
  )

  $errors = Test-GwtSemanticQuality -Name $Name -Given $Given -When $When -Then $Then -Criterion $Criterion
  if ($errors.Count -gt 0) {
    foreach ($errorText in $errors) { Write-Host "  QUALITY ERROR: $errorText" -ForegroundColor Red }
    throw "$Name failed semantic GWT validation."
  }
}

function Test-TestCaseNamingQuality {
  param([array]$ScenarioModel)
  $errors = @()
  $seenObjectives = @{}
  $allowedTypeLabels = @('Happy path', $script:TextValidacion, 'Error', $script:TextEdicion, 'Persistencia')
  $summaryMaxLength = 120

  foreach ($scenario in $ScenarioModel) {
    $name = "TC$($scenario.Number)"
    $summary = Normalize-Whitespace -Text $scenario.Summary
    $shortTitle = Normalize-Whitespace -Text $scenario.ShortTitle
    $functionalDescription = Normalize-Whitespace -Text $scenario.FunctionalDescription

    foreach ($textInfo in @(
      @{ Label = 'summary'; Text = $summary },
      @{ Label = 'short title'; Text = $shortTitle },
      @{ Label = 'functional description'; Text = $functionalDescription }
    )) {
      $text = [string]$textInfo.Text
      if ($text -match ',;|;;|,,|\s\.|\s{2,}') { $errors += "$name $($textInfo.Label) contains punctuation/spacing artifact: '$text'." }
      if ($text -match '(?i)\b(Given|When|Then|Dado|Cuando|Entonces)\b.*\b(Given|When|Then|Dado|Cuando|Entonces)\b') { $errors += "$name $($textInfo.Label) contains multiple raw GWT clauses." }
      if ($text -match '(?i)(,\s*;|;\s*;|,\s*,|;\s*,)') { $errors += "$name $($textInfo.Label) contains raw criterion punctuation soup." }
    }

    if ($summary.Length -gt $summaryMaxLength) { $errors += "$name summary is too long ($($summary.Length) chars, max $summaryMaxLength)." }
    if ($summary -match '(?i)^\s*([A-Z]+-\d+\s*\|\s*)?TC\d+\s*:\s*(el\s+sistema|debe|cuando|then|when|given|dado|entonces)\b') {
      $errors += "$name summary starts with weak raw GWT fragment."
    }
    if (-not $scenario.TypeLabel -or $allowedTypeLabels -notcontains $scenario.TypeLabel) { $errors += "$name is missing a recognized type label." }
    if ($summary -notmatch '^\S+-\d+\s\|\sTC\d+:\s[^-]+\s-\s\S+') { $errors += "$name summary does not match '<TestSetKey> | TC<N>: <TypeLabel> - <ShortTitle>'." }

    $objectiveKey = Normalize-SemanticText -Text $shortTitle
    if (-not $objectiveKey) {
      $errors += "$name has an empty normalized ShortTitle/objective."
    } elseif ($seenObjectives.ContainsKey($objectiveKey)) {
      $errors += "$name duplicates ShortTitle/objective '$shortTitle' from $($seenObjectives[$objectiveKey]). Source: '$($scenario.SourceDescription)'"
    } else {
      $seenObjectives[$objectiveKey] = $name
    }
  }

  return $errors
}

function Assert-TestCaseNamingQuality {
  param([array]$ScenarioModel)
  $errors = Test-TestCaseNamingQuality -ScenarioModel $ScenarioModel
  if ($errors.Count -gt 0) {
    foreach ($errorText in $errors) { Write-Host "  QUALITY ERROR: $errorText" -ForegroundColor Red }
    throw 'Generated Test Case naming failed quality validation.'
  }
  Write-Host '  Quality OK: Test Case naming model' -ForegroundColor Gray
}

function Assert-ScenarioModelConsistency {
  param([array]$ScenarioModel)
  $listNumbers = @{}
  $summaryNumbers = @{}

  foreach ($scenario in $ScenarioModel) {
    if ($scenario.ListItem -match '^TC(\d+):\s+(.+)$') { $listNumbers[[int]$Matches[1]] = $Matches[2] }
    if ($scenario.Summary -match '\|\sTC(\d+):\s+(.+)$') { $summaryNumbers[[int]$Matches[1]] = $Matches[2] }
  }

  if ($listNumbers.Count -ne $ScenarioModel.Count -or $summaryNumbers.Count -ne $ScenarioModel.Count) {
    throw 'Scenario model consistency failed: Test Set list and Test Case summaries are not 1:1.'
  }

  foreach ($scenario in $ScenarioModel) {
    if (-not $listNumbers.ContainsKey([int]$scenario.Number)) { throw "Scenario model consistency failed: missing list item for TC$($scenario.Number)." }
    if (-not $summaryNumbers.ContainsKey([int]$scenario.Number)) { throw "Scenario model consistency failed: missing summary for TC$($scenario.Number)." }
  }

  Write-Host '  Quality OK: Test Set list and Test Case summaries are consistent' -ForegroundColor Gray
}

function Get-TestSetOriginalTaskFieldUpdate {
  param(
    [string]$Url,
    [string]$Auth,
    [string]$TestSetKey,
    [string]$ParentKey
  )

  $result = @{ FieldId = ''; Value = $null; Status = 'not-discovered'; Warning = '' }

  try {
    $fieldsJson = Invoke-JiraGet -Url $Url -Auth $Auth -Endpoint '/rest/api/3/field'
    $fields = $fieldsJson | ConvertFrom-Json
  } catch {
    $result.Warning = "Could not read Jira fields metadata: $($_.Exception.Message)"
    return $result
  }

  $matches = @($fields | Where-Object { $_.name -eq 'Tarea Original' })
  if ($matches.Count -eq 0) {
    $result.Warning = "Jira field 'Tarea Original' was not found in /rest/api/3/field."
    return $result
  }
  if ($matches.Count -gt 1) {
    $result.Warning = "Multiple Jira fields named 'Tarea Original' were found; refusing to guess."
    return $result
  }

  $field = $matches[0]
  $result.FieldId = $field.id
  $schemaType = ''
  $schemaCustom = ''
  if ($field.schema) {
    $schemaType = [string]$field.schema.type
    $schemaCustom = [string]$field.schema.custom
  }

  try {
    $editMetaJson = Invoke-JiraGet -Url $Url -Auth $Auth -Endpoint "/rest/api/3/issue/$TestSetKey/editmeta"
    $editMeta = $editMetaJson | ConvertFrom-Json
    if (-not $editMeta.fields -or -not $editMeta.fields.PSObject.Properties[$field.id]) {
      $result.Status = 'not-editable'
      $result.Warning = "Jira field 'Tarea Original' ($($field.id)) is not editable on Test Set $TestSetKey."
      return $result
    }
  } catch {
    $result.Warning = "Could not validate editmeta for 'Tarea Original' ($($field.id)): $($_.Exception.Message)"
  }

  if ($schemaType -eq 'string' -and $schemaCustom -match 'url') {
    $result.Value = "$Url/browse/$ParentKey"
  } elseif ($schemaType -eq 'string' -or -not $schemaType) {
    $result.Value = $ParentKey
  } else {
    $result.Status = 'unsupported-schema'
    $result.Warning = "Jira field 'Tarea Original' ($($field.id)) has unsupported schema type '$schemaType'."
    return $result
  }

  $result.Status = 'editable'
  return $result
}

function Get-LinkedUserStoryKey {
  param($TestSetIssue)

  $allowedProjects = @('TMSPROD', 'BS', 'BOS')
  $links = $TestSetIssue.fields.issuelinks
  if (-not $links) { return $null }

  foreach ($link in $links) {
    if ($link.type.name -ne 'Test') { continue }

    # From Test Set perspective: outward=TestSet, inward=Parent
    # The parent is inward (is tested by), so check inwardIssue first
    if ($link.inwardIssue) {
      $key = $link.inwardIssue.key
      $projectKey = ($key -split '-')[0]
      if ($allowedProjects -contains $projectKey) { return $key }
    }

    # Fallback: check outwardIssue in case direction is reversed
    if ($link.outwardIssue) {
      $key = $link.outwardIssue.key
      $projectKey = ($key -split '-')[0]
      if ($allowedProjects -contains $projectKey) { return $key }
    }
  }

  return $null
}

function Test-TestSetTestsParentLink {
  param($TestSetIssue, [string]$ParentKey)

  $links = $TestSetIssue.fields.issuelinks
  if (-not $links) { return $false }

  foreach ($link in $links) {
    if ($link.type.name -ne 'Test') { continue }
    # Jira omits the current issue from issue link payloads; from the Test Set
    # perspective the parent appears as inwardIssue for "tests" links.
    if ($link.inwardIssue -and $link.inwardIssue.key -eq $ParentKey -and $link.type.outward -eq 'tests') { return $true }
    if ($link.outwardIssue -and $link.outwardIssue.key -eq $ParentKey -and $link.type.inward -eq 'is tested by') { return $true }
  }

  return $false
}

function Ensure-TestSetTestsParentLink {
  param(
    [string]$Url,
    [string]$Auth,
    $TestSetIssue,
    [string]$TestSetKey,
    [string]$ParentKey,
    [switch]$NoWrite,
    [string]$ModeLabel = 'DRY RUN'
  )

  if (Test-TestSetTestsParentLink -TestSetIssue $TestSetIssue -ParentKey $ParentKey) {
    Write-Host "  Link exists: $TestSetKey --tests--> $ParentKey" -ForegroundColor Gray
    return
  }

  $linkBody = @{
    type = @{ name = 'Test' }
    inwardIssue = @{ key = $ParentKey }
    outwardIssue = @{ key = $TestSetKey }
  }

  $linkJson = $linkBody | ConvertTo-Json -Depth 10
  Assert-AdfQuality -Name 'Test link payload' -Json $linkJson -ExpectedParentKey $ParentKey -RequiredText @($TestSetKey, $ParentKey) -RequiredEmoji @()

  if ($NoWrite) {
    Write-Host "  ${ModeLabel}: would create link $TestSetKey --tests--> $ParentKey." -ForegroundColor Yellow
    return
  }

  $linkFile = Join-Path -Path $env:TEMP -ChildPath "jira_ts_link_$(Get-Random).json"
  Save-JsonFile -Path $linkFile -Json $linkJson
  $linkResult = Invoke-JiraPost -Url $Url -Auth $Auth -Endpoint '/rest/api/3/issueLink' -BodyFile $linkFile
  Remove-Item -LiteralPath $linkFile -Force

  if ($LASTEXITCODE -ne 0 -or $linkResult) {
    Write-Host "  WARNING: Link creation returned: $linkResult" -ForegroundColor Yellow
  } else {
    Write-Host "  Created link: $TestSetKey --tests--> $ParentKey" -ForegroundColor Green
  }
}

function Test-AdfQuality {
  param(
    [string]$Name,
    [string]$Json,
    [string]$ExpectedParentKey,
    [string]$ExpectedParentSummary = '',
    [string[]]$RequiredText = @(),
    [string[]]$RequiredEmoji = @()
  )

  $errors = @()
  $searchText = $Json
  try { $searchText = $Json + "`n" + [regex]::Unescape($Json) } catch { $searchText = $Json }

  foreach ($pattern in Get-MojibakePatterns) {
    if ($searchText.Contains($pattern)) {
      $index = $searchText.IndexOf($pattern)
      $start = [Math]::Max(0, $index - 40)
      $length = [Math]::Min(120, $searchText.Length - $start)
      $snippet = $searchText.Substring($start, $length).Replace("`r", ' ').Replace("`n", ' ')
      $errors += "$Name contains mojibake marker U+$(([int][char]$pattern).ToString('X4')) near '$snippet'."
    }
  }

  if ($ExpectedParentKey -and -not $searchText.Contains($ExpectedParentKey)) {
    $errors += "$Name is missing parent key $ExpectedParentKey."
  }

  if ($ExpectedParentSummary -and -not $searchText.Contains($ExpectedParentSummary)) {
    $errors += "$Name is missing parent title '$ExpectedParentSummary'."
  }

  foreach ($text in $RequiredText) {
    if ($text -and -not $searchText.Contains($text)) {
      $errors += "$Name is missing required text '$text'."
    }
  }

  foreach ($emoji in $RequiredEmoji) {
    if ($emoji -and -not $searchText.Contains($emoji)) {
      $errors += "$Name is missing required emoji U+$(([char]::ConvertToUtf32($emoji, 0)).ToString('X'))."
    }
  }

  return $errors
}

function Assert-AdfQuality {
  param(
    [string]$Name,
    [string]$Json,
    [string]$ExpectedParentKey,
    [string]$ExpectedParentSummary = '',
    [string[]]$RequiredText = @(),
    [string[]]$RequiredEmoji = @()
  )

  $errors = Test-AdfQuality -Name $Name -Json $Json -ExpectedParentKey $ExpectedParentKey -ExpectedParentSummary $ExpectedParentSummary -RequiredText $RequiredText -RequiredEmoji $RequiredEmoji
  if ($errors.Count -gt 0) {
    foreach ($errorText in $errors) { Write-Host "  QUALITY ERROR: $errorText" -ForegroundColor Red }
    throw "$Name failed ADF quality validation."
  }

  Write-Host "  Quality OK: $Name" -ForegroundColor Gray
}

function Test-TestCaseSummaryQuality {
  param([string[]]$Summaries)
  $errors = @()
  foreach ($summary in @($Summaries)) {
    $clean = Normalize-Whitespace -Text $summary
    if (-not $clean) { continue }
    if ($clean -notmatch '^\S+-\d+\s\|\sTC\d+:\s[^-]+\s-\s\S+') {
      $errors += "Existing Test Case summary does not match '<TestSetKey> | TC<N>: <TypeLabel> - <ShortTitle>': '$clean'."
    }
  }
  return $errors
}

function Assert-VisibleTestCaseOrder {
  param(
    $Subtasks,
    [int]$ExpectedCount
  )

  $visibleTestCases = @()
  foreach ($subtask in @($Subtasks)) {
    $summary = Normalize-Whitespace -Text $subtask.fields.summary
    if (-not $summary) { continue }
    if ($summary -notmatch '\|\s*TC(\d+)\s*:') { continue }

    $visibleTestCases += @{
      Key = $subtask.key
      Summary = $summary
      Number = [int]$Matches[1]
    }
  }

  if ($visibleTestCases.Count -eq 0) { return }

  $limit = [Math]::Min($visibleTestCases.Count, $ExpectedCount)
  $errors = @()
  for ($i = 0; $i -lt $limit; $i++) {
    $expectedNumber = $i + 1
    $actual = $visibleTestCases[$i]
    if ($actual.Number -ne $expectedNumber) {
      $errors += "Visible Test Case order mismatch at position $expectedNumber`: $($actual.Key) shows TC$($actual.Number)."
    }
  }

  if ($visibleTestCases.Count -gt $ExpectedCount) {
    $errors += "Visible Test Case count $($visibleTestCases.Count) exceeds expected count $ExpectedCount."
  }

  if ($errors.Count -gt 0) {
    foreach ($errorText in $errors) { Write-Host "  QUALITY ERROR: $errorText" -ForegroundColor Red }
    Write-Host '  Repair guidance: update existing visible subtasks in place so the parent issue displays TC1..TCN sequentially; do not delete/recreate replacements with higher keys.' -ForegroundColor Yellow
    throw 'Visible Test Case order does not match the Test Set list order.'
  }

  Write-Host '  Quality OK: visible Test Case order' -ForegroundColor Gray
}

function ConvertTo-StringArray {
  param($Value)
  $items = @()
  if (-not $Value) { return $items }
  foreach ($item in @($Value)) {
    $text = Normalize-Whitespace -Text ([string]$item)
    if ($text) { $items += $text }
  }
  return $items
}

function Invoke-FixtureAnalysis {
  param([string]$Path)
  if (-not $Path -or -not (Test-Path -LiteralPath $Path)) { throw "Fixture file not found: $Path" }

  $fixtureJson = [System.IO.File]::ReadAllText($Path, [System.Text.Encoding]::UTF8)
  $fixture = $fixtureJson | ConvertFrom-Json
  $parentKey = if ($fixture.parentKey) { [string]$fixture.parentKey } else { 'TMSPROD-0000' }
  $parentSummary = if ($fixture.parentSummary) { [string]$fixture.parentSummary } else { 'Fixture story' }
  $fixtureTestSetKey = if ($fixture.testSetKey) { [string]$fixture.testSetKey } else { 'QA-000' }
  $description = $fixture.description
  if (-not $description -and $fixture.fields -and $fixture.fields.description) { $description = $fixture.fields.description }
  if (-not $description) { throw "Fixture does not contain an ADF description: $Path" }

  $parentJson = $description | ConvertTo-Json -Depth 50 -Compress
  $parentText = Get-AdfDocText -Json $parentJson
  $rawScenarios = @(Get-TestScenarios -AdfJson $parentJson)
  $rawDuplicateCount = Get-DuplicateScenarioCount -Scenarios $rawScenarios
  $dedupedScenarios = @(Select-UniqueTestScenarios -Scenarios $rawScenarios)
  $dedupedDuplicateCount = Get-DuplicateScenarioCount -Scenarios $dedupedScenarios
  $analysis = Get-ParentStoryAnalysis -ParentKey $parentKey -ParentSummary $parentSummary -ParentText $parentText -Scenarios $dedupedScenarios
  $scenarioModel = @(New-TestCaseScenarioModel -TestSetKey $fixtureTestSetKey -Capability $analysis.Capability -Scenarios $analysis.Scenarios)

  $qualityErrors = @()
  $qualityErrors += Test-AdfQuality -Name 'Fixture parent ADF' -Json $parentJson -ExpectedParentKey ''
  $qualityErrors += Test-TestCaseNamingQuality -ScenarioModel $scenarioModel
  $qualityErrors += Test-TestCaseSummaryQuality -Summaries (ConvertTo-StringArray -Value $fixture.testCaseSummaries)

  $testCaseUpdatePlans = @()
  if ($fixture.existingTestCases) {
    foreach ($existingTestCase in @($fixture.existingTestCases)) {
      $number = [int]$existingTestCase.number
      $expectedScenario = @($scenarioModel | Where-Object { [int]$_.Number -eq $number } | Select-Object -First 1)
      $expectedSummary = if ($existingTestCase.expectedSummary) { [string]$existingTestCase.expectedSummary } elseif ($expectedScenario.Count -gt 0) { [string]$expectedScenario[0].Summary } else { '' }
      $plan = Get-TestCaseUpdatePlan `
        -CurrentSummary ([string]$existingTestCase.currentSummary) `
        -CurrentDescription $existingTestCase.currentDescription `
        -ExpectedSummary $expectedSummary `
        -ExpectedDescription $existingTestCase.expectedDescription

      $testCaseUpdatePlans += @{
        Number = $number
        Key = [string]$existingTestCase.key
        ExpectedSummary = $expectedSummary
        NeedsUpdate = $plan.NeedsUpdate
        SummaryChanged = $plan.SummaryChanged
        DescriptionChanged = $plan.DescriptionChanged
        Fields = $plan.Fields
      }
    }
  }

  $diffResult = $null
  if ($fixture.currentDescription -and $fixture.expectedDescription) {
    $diffResult = Compare-TestSetDescriptionLogically -CurrentAdf $fixture.currentDescription -ExpectedAdf $fixture.expectedDescription
  }

  return @{
    Fixture = [System.IO.Path]::GetFileName($Path)
    ParentKey = $parentKey
    ParentSummary = $parentSummary
    RawScenarioCount = $rawScenarios.Count
    ScenarioCount = $dedupedScenarios.Count
    RawDuplicateCount = $rawDuplicateCount
    DuplicateCount = $dedupedDuplicateCount
    Scenarios = @($dedupedScenarios | ForEach-Object { Normalize-Whitespace -Text $_.Description })
    Summaries = @($scenarioModel | ForEach-Object { $_.Summary })
    ListItems = @($scenarioModel | ForEach-Object { $_.ListItem })
    GwtSteps = @($scenarioModel | ForEach-Object { @{ Number = $_.Number; Given = $_.Given; When = $_.When; Then = $_.Then } })
    TestCaseUpdatePlans = $testCaseUpdatePlans
    QualityStatus = if ($qualityErrors.Count -eq 0) { 'OK' } else { 'FAIL' }
    QualityErrors = $qualityErrors
    Diff = $diffResult
  }
}

# ---------- MAIN ----------

if ($AnalyzeFixture) {
  try {
    $fixtureAnalysis = Invoke-FixtureAnalysis -Path $FixtureFile
    $fixtureAnalysis | ConvertTo-Json -Depth 50
    exit 0
  } catch {
    @{ QualityStatus = 'ERROR'; Error = $_.Exception.Message } | ConvertTo-Json -Depth 10
    exit 1
  }
}

if (-not $TestSetKey) { throw 'TestSetKey is required unless -AnalyzeFixture is used.' }

Write-Host "=== Sync Test Set ===" -ForegroundColor Cyan
Write-Host "Test Set: $TestSetKey`n" -ForegroundColor Cyan
Write-Host "Mode: $auditLabel`n" -ForegroundColor Cyan
if ($ParentIssueKey) { Write-Host "Parent Issue override: $ParentIssueKey`n" -ForegroundColor Cyan }

# 1. Auth
$jira = Get-JiraAuthHeaders -EnvFilePath $EnvFile
$baseUrl = $jira.Url
$auth = $jira.Auth

# 2. Fetch Test Set (using new search/jql API)
Write-Host "[1] Fetching Test Set..." -ForegroundColor Yellow
$searchResult = Invoke-JiraGetIssue -Url $baseUrl -Auth $auth -IssueKey $TestSetKey
$tsResult = $searchResult | ConvertFrom-Json
if (-not $tsResult.issues -or $tsResult.issues.Count -eq 0) {
  Write-Host "ERROR: Test Set $TestSetKey not found." -ForegroundColor Red
  exit 1
}
$testSet = $tsResult.issues[0]

$summary = $testSet.fields.summary
$tsDescription = $testSet.fields.description

Write-Host "  Summary: $summary" -ForegroundColor Gray

# 3. Extract linked User Story key from issue links
Write-Host "[2] Finding linked User Story..." -ForegroundColor Yellow
$parentKey = ''
if ($ParentIssueKey) {
  $parentKey = $ParentIssueKey.Trim().ToUpperInvariant()
  Write-Host "  Using parent issue from -ParentIssueKey for automation/manual trigger." -ForegroundColor Gray
} else {
  $parentKey = Get-LinkedUserStoryKey -TestSetIssue $testSet
}

if (-not $parentKey -and $summary -match 'TS \| ([A-Z]+-\d+) \|') {
  $candidateKey = $Matches[1]
  $candidateProject = ($candidateKey -split '-')[0]
  if (@('TMSPROD', 'BS', 'BOS') -contains $candidateProject) {
    $parentKey = $candidateKey
    Write-Host "  WARNING: Using legacy summary fallback. Prefer Jira issue link type 'Test'." -ForegroundColor Yellow
  }
}

if (-not $parentKey) {
  Write-Host "ERROR: Could not find a linked User Story from TMSPROD, BS, or BOS." -ForegroundColor Red
  Write-Host "  Link the User Story to this Test Set using link type 'Test' (Test Set tests User Story)." -ForegroundColor Red
  exit 1
}
Write-Host "  Linked User Story: $parentKey" -ForegroundColor Gray

# 4. Fetch parent ticket
Write-Host "[3] Fetching parent ticket..." -ForegroundColor Yellow
$parentResult = Invoke-JiraSearch -Url $baseUrl -Auth $auth -Jql "issuekey = $parentKey" -Fields 'summary,description,issuetype,priority,status'
$parentParsed = $parentResult | ConvertFrom-Json
if (-not $parentParsed.issues -or $parentParsed.issues.Count -eq 0) {
  Write-Host "ERROR: Parent ticket $parentKey not found." -ForegroundColor Red
  exit 1
}
$parent = $parentParsed.issues[0]
$parentSummary = $parent.fields.summary
$parentAdf = $parent.fields.description
$expectedSummary = "TS | $parentKey | $parentSummary"

Write-Host "  User Story summary: $parentSummary" -ForegroundColor Gray
Write-Host "  Expected Test Set summary: $expectedSummary" -ForegroundColor Gray

# 5. Get plain text from parent description
Write-Host "[4] Analyzing parent requirements..." -ForegroundColor Yellow
$parentText = ''
if ($parentAdf) {
  $parentJson = $parentAdf | ConvertTo-Json -Depth 20 -Compress
  $parentText = Get-AdfDocText -Json $parentJson
}
Write-Host "  Extracted text length: $($parentText.Length) chars" -ForegroundColor Gray

# 6. Extract scenarios from parent's acceptance criteria
$scenarios = @()
if ($parentAdf) {
  $parentJson = $parentAdf | ConvertTo-Json -Depth 20 -Compress
  $scenarios = Get-TestScenarios -AdfJson $parentJson
}
$rawScenarioCount = $scenarios.Count
$rawDuplicateCount = Get-DuplicateScenarioCount -Scenarios $scenarios
$scenarios = Select-UniqueTestScenarios -Scenarios $scenarios
Assert-UniqueTestScenarios -Scenarios $scenarios
$dedupedDuplicateCount = Get-DuplicateScenarioCount -Scenarios $scenarios
Write-Host "  Found $rawScenarioCount scenario(s), $($scenarios.Count) after semantic deduplication" -ForegroundColor Gray
if ($rawDuplicateCount -gt 0) { Write-Host "  Removed $rawDuplicateCount duplicate scenario(s)" -ForegroundColor Yellow }
Write-Host "  Duplicate scenarios after deduplication: $dedupedDuplicateCount" -ForegroundColor Gray

$analysis = Get-ParentStoryAnalysis -ParentKey $parentKey -ParentSummary $parentSummary -ParentText $parentText -Scenarios $scenarios
$scenarioModel = New-TestCaseScenarioModel -TestSetKey $TestSetKey -Capability $analysis.Capability -Scenarios $analysis.Scenarios
Assert-TestCaseNamingQuality -ScenarioModel $scenarioModel
Assert-ScenarioModelConsistency -ScenarioModel $scenarioModel
Write-Host "  Module/context: $($analysis.ModuleContext)" -ForegroundColor Gray
Write-Host "  Tested capability: $($analysis.Capability)" -ForegroundColor Gray
Write-Host "  Scope summary: $($analysis.ScopeSummary)" -ForegroundColor Gray
if ($noWrite -and $scenarioModel.Count -gt 0) {
  $sample = $scenarioModel[0]
  Write-Host "  ${auditLabel} sample old-style avoided: TC$($sample.Number): $($sample.SourceDescription)" -ForegroundColor Yellow
  Write-Host "  ${auditLabel} sample Test Set list item: $($sample.ListItem)" -ForegroundColor Yellow
  Write-Host "  ${auditLabel} sample Test Case summary: $($sample.Summary)" -ForegroundColor Yellow
}

# 7. Check existing Test Case subtasks to avoid duplicates
Write-Host "[5] Checking existing Test Cases..." -ForegroundColor Yellow
$existingTcResult = Invoke-JiraSearch -Url $baseUrl -Auth $auth -Jql "parent = $TestSetKey" -Fields 'summary,description'
$existingTcParsed = $existingTcResult | ConvertFrom-Json
$existingTcSummaries = @{}
$existingTcSemanticKeys = @{}
$existingTcDescriptions = @{}
$existingTcByNumber = @{}
$existingTcByKey = @{}
if ($existingTcParsed.issues) {
  foreach ($issue in $existingTcParsed.issues) {
    $existingTcSummaries[$issue.fields.summary] = $issue.key
    $existingTcDescriptions[$issue.fields.summary] = $issue.fields.description
    $existingTcByKey[$issue.key] = @{ Key = $issue.key; Summary = $issue.fields.summary; Description = $issue.fields.description }
    if ($issue.fields.summary -match '\|\s*TC(\d+)\s*:') {
      $tcNumberKey = [int]$Matches[1]
      if (-not $existingTcByNumber.ContainsKey($tcNumberKey)) {
        $existingTcByNumber[$tcNumberKey] = @{ Key = $issue.key; Summary = $issue.fields.summary; Description = $issue.fields.description }
      }
    }
    $summaryKey = Normalize-SemanticText -Text (Get-TestCaseTitleSemanticText -Summary $issue.fields.summary)
    if ($summaryKey) { $existingTcSemanticKeys["title:$summaryKey"] = $issue.key }

    $scenarioText = Get-TestCaseScenarioTextFromAdf -Description $issue.fields.description
    $scenarioKey = Normalize-SemanticText -Text $scenarioText
    if ($scenarioKey) { $existingTcSemanticKeys["scenario:$scenarioKey"] = $issue.key }
  }
}
Write-Host "  Found $($existingTcSummaries.Count) existing Test Case(s)" -ForegroundColor Gray

$visibleTestSetJson = Invoke-JiraGet -Url $baseUrl -Auth $auth -Endpoint "/rest/api/3/issue/$TestSetKey`?fields=subtasks"
$visibleTestSet = $visibleTestSetJson | ConvertFrom-Json
Assert-VisibleTestCaseOrder -Subtasks $visibleTestSet.fields.subtasks -ExpectedCount $scenarioModel.Count

# 8. Ensure Jira link semantics: Test Set outward relation 'tests' User Story.
Write-Host "[6] Checking Test link semantics..." -ForegroundColor Yellow
Ensure-TestSetTestsParentLink -Url $baseUrl -Auth $auth -TestSetIssue $testSet -TestSetKey $TestSetKey -ParentKey $parentKey -NoWrite:$noWrite -ModeLabel $auditLabel

Write-Host "[6.1] Discovering Tarea Original field..." -ForegroundColor Yellow
$originalTaskFieldUpdate = Get-TestSetOriginalTaskFieldUpdate -Url $baseUrl -Auth $auth -TestSetKey $TestSetKey -ParentKey $parentKey
if ($originalTaskFieldUpdate.Status -eq 'editable') {
  Write-Host "  Tarea Original field: $($originalTaskFieldUpdate.FieldId)" -ForegroundColor Gray
  Write-Host "  Tarea Original value: $($originalTaskFieldUpdate.Value)" -ForegroundColor Gray
} elseif ($originalTaskFieldUpdate.Warning) {
  Write-Host "  WARNING: $($originalTaskFieldUpdate.Warning)" -ForegroundColor Yellow
} else {
  Write-Host "  WARNING: Tarea Original field status: $($originalTaskFieldUpdate.Status)" -ForegroundColor Yellow
}

# 9. Build new Test Set description
Write-Host "[7] Building new Test Set description..." -ForegroundColor Yellow

$tsContent = @()

# Section 1: Alcance y Proposito
$tsContent += New-AdfHeading -Level 2 -Text "$script:EmojiClipboard Alcance y $script:TextProposito"
$tsContent += New-AdfParagraph -Text $analysis.ScopeSummary
$tsContent += New-AdfRule

# Section 2: Detalles del Entorno
$tsContent += New-AdfHeading -Level 2 -Text "$script:EmojiComputer Detalles del Entorno"
$tsContent += (New-AdfBulletList -Items @(
  (New-AdfBulletItem -Text 'Navegadores: Chrome.'),
  (New-AdfBulletItem -Text 'Dispositivos: Desktop.'),
  (New-AdfBulletItem -Text 'Ambiente: QA.')
))
$tsContent += New-AdfRule

# Section 3: Listado de Casos de Prueba
$tsContent += New-AdfHeading -Level 2 -Text "$script:EmojiFolder Listado de Casos de Prueba Incluidos"

if ($scenarioModel.Count -gt 0) {
  $tcItems = @()
  for ($i = 0; $i -lt $scenarioModel.Count; $i++) {
    $tcItems += New-AdfBulletItem -Text $scenarioModel[$i].ListItem
  }
  $tsContent += (New-AdfBulletList -Items $tcItems)
} else {
  $tsContent += (New-AdfBulletList -Items @(
    (New-AdfBulletItem -Text "TC1: $script:TextValidacion de requerimientos del ticket padre")
  ))
}
$tsContent += New-AdfRule

# Section 4: Criterios de Aceptacion de la Suite
$tsContent += New-AdfHeading -Level 2 -Text "$script:EmojiChart Criterios de $script:TextAceptacion de la Suite"
$tsContent += (New-AdfBulletList -Items @(
  (New-AdfBulletItem -Text "Criterio de $($script:TextExito): 100% de los casos en estado Passed."),
  (New-AdfBulletItem -Text 'Bloqueos: Si TC1 falla, la suite se considera fallida.')
))
$tsContent += New-AdfRule

# Section 5: Cronograma y Responsables
$tsContent += New-AdfHeading -Level 2 -Text "$script:EmojiCalendar Cronograma y Responsables"
$tsContent += (New-AdfBulletList -Items @(
  (New-AdfBulletItem -Text "QA Asignado: Samuel Rodriguez")
))

# Build full ADF doc
$newDescription = @{
  type = 'doc'
  version = 1
  content = $tsContent
}

# 10. Update Test Set summary and description when needed
Write-Host "[8] Checking Test Set summary and description..." -ForegroundColor Yellow
$newDescriptionJson = $newDescription | ConvertTo-Json -Depth 20 -Compress
$currentDescriptionJson = ''
if ($tsDescription) { $currentDescriptionJson = $tsDescription | ConvertTo-Json -Depth 20 -Compress }
$descriptionDiff = Compare-TestSetDescriptionLogically -CurrentAdf $tsDescription -ExpectedAdf $newDescription

$fieldsToUpdate = @{}
if ($summary -ne $expectedSummary) { $fieldsToUpdate.summary = $expectedSummary }
if ($currentDescriptionJson -eq $newDescriptionJson) {
  Write-Host '  Description logically up to date (raw ADF already matches expected content).' -ForegroundColor Gray
} elseif (-not $descriptionDiff.Comparable) {
  Write-Host "  WARNING: Unable to compare Test Set description logically; fallback to update plan. $($descriptionDiff.Reason)" -ForegroundColor Yellow
  $fieldsToUpdate.description = $newDescription
} elseif ($descriptionDiff.Equivalent) {
  Write-Host "  Description logically up to date ($($descriptionDiff.Reason))" -ForegroundColor Gray
} else {
  Write-Host "  Description differs logically: $($descriptionDiff.Reason)" -ForegroundColor Yellow
  $fieldsToUpdate.description = $newDescription
}
if ($originalTaskFieldUpdate.Status -eq 'editable') {
  $currentOriginalTaskValue = $null
  if ($testSet.fields.PSObject.Properties[$originalTaskFieldUpdate.FieldId]) {
    $currentOriginalTaskValue = $testSet.fields.PSObject.Properties[$originalTaskFieldUpdate.FieldId].Value
  }
  if ($currentOriginalTaskValue -ne $originalTaskFieldUpdate.Value) {
    $fieldsToUpdate[$originalTaskFieldUpdate.FieldId] = $originalTaskFieldUpdate.Value
  }
}
if (-not $fieldsToUpdate.ContainsKey('summary')) { Write-Host "  Summary already matches expected content." -ForegroundColor Gray }
if (-not $fieldsToUpdate.ContainsKey('description') -and $currentDescriptionJson -ne $newDescriptionJson -and $descriptionDiff.Comparable -and $descriptionDiff.Equivalent) { Write-Host "  Description raw ADF differs only by Jira normalization; no update needed." -ForegroundColor Gray }
if ($originalTaskFieldUpdate.Status -eq 'editable' -and -not $fieldsToUpdate.ContainsKey($originalTaskFieldUpdate.FieldId)) { Write-Host "  Tarea Original already matches expected content." -ForegroundColor Gray }

$summaryUpdateStatus = Get-UpdateStatusText -Changed $fieldsToUpdate.ContainsKey('summary') -NoWrite:$noWrite
$descriptionUpdateStatus = Get-UpdateStatusText -Changed $fieldsToUpdate.ContainsKey('description') -NoWrite:$noWrite

$updateBody = @{ fields = $fieldsToUpdate }
$updateJson = $updateBody | ConvertTo-Json -Depth 20
$qualityBody = @{ fields = @{ summary = $expectedSummary; description = $newDescription } }
$qualityJson = $qualityBody | ConvertTo-Json -Depth 20
$updateFile = Join-Path -Path $env:TEMP -ChildPath "jira_ts_update_$(Get-Random).json"
Assert-AdfQuality -Name 'Test Set expected content' -Json $qualityJson -ExpectedParentKey $parentKey -ExpectedParentSummary $parentSummary -RequiredText @($expectedSummary, "Criterio de $script:TextExito", "Criterios de $script:TextAceptacion", "Alcance y $script:TextProposito") -RequiredEmoji @($script:EmojiClipboard, $script:EmojiComputer, $script:EmojiFolder, $script:EmojiChart, $script:EmojiCalendar)
Save-JsonFile -Path $updateFile -Json $updateJson

if ($fieldsToUpdate.Count -eq 0) {
  Write-Host "  Test Set summary and description already match expected content." -ForegroundColor Gray
  Remove-Item -LiteralPath $updateFile -Force
} elseif ($noWrite) {
  if ($fieldsToUpdate.ContainsKey('summary')) { Write-Host "  ${auditLabel}: would update summary to: $expectedSummary" -ForegroundColor Yellow }
  if ($fieldsToUpdate.ContainsKey('description')) { Write-Host "  ${auditLabel}: would update Test Set description." -ForegroundColor Yellow }
  if ($originalTaskFieldUpdate.Status -eq 'editable' -and $fieldsToUpdate.ContainsKey($originalTaskFieldUpdate.FieldId)) { Write-Host "  ${auditLabel}: would update Tarea Original ($($originalTaskFieldUpdate.FieldId)) to: $($originalTaskFieldUpdate.Value)" -ForegroundColor Yellow }
  Remove-Item -LiteralPath $updateFile -Force
} else {
  $putResult = Invoke-JiraPut -Url $baseUrl -Auth $auth -Endpoint "/rest/api/3/issue/$TestSetKey" -BodyFile $updateFile
  Remove-Item -LiteralPath $updateFile -Force

  if ($LASTEXITCODE -ne 0) {
    Write-Host "  WARNING: Update may have failed: $putResult" -ForegroundColor Yellow
  } else {
    Write-Host "  Test Set summary/description updated." -ForegroundColor Green
  }
}

# 11. Create Test Case subtasks
Write-Host "[9] Creating Test Case subtasks..." -ForegroundColor Yellow
$createdCount = 0
$skippedCount = 0
$createdTestCases = @()

function Split-GwtByAnd {
  param([string]$Text)
  if ([string]::IsNullOrEmpty($Text)) { return @() }
  $parts = @($Text -split '\s+And\s+' | ForEach-Object { $_.Trim() } | Where-Object { $_ -ne '' })
  if ($parts.Count -le 1) { return ,$Text }
  return $parts
}

function Format-GwtStepsForDisplay {
  param([string]$Given, [string]$When, [string]$Then)
  $lines = @()
  $givenParts = @(Split-GwtByAnd -Text $Given)
  for ($i = 0; $i -lt $givenParts.Count; $i++) {
    $lines += "$(if ($i -eq 0) { 'Given' } else { 'And' }) $($givenParts[$i])"
  }
  $whenParts = @(Split-GwtByAnd -Text $When)
  for ($i = 0; $i -lt $whenParts.Count; $i++) {
    $lines += "$(if ($i -eq 0) { 'When' } else { 'And' }) $($whenParts[$i])"
  }
  $thenParts = @(Split-GwtByAnd -Text $Then)
  for ($i = 0; $i -lt $thenParts.Count; $i++) {
    $lines += "$(if ($i -eq 0) { 'Then' } else { 'And' }) $($thenParts[$i])"
  }
  return $lines
}

function Format-GwtPanelStepsAdf {
  param([string]$Given, [string]$When, [string]$Then)
  $nodes = @()
  $givenParts = @(Split-GwtByAnd -Text $Given)
  for ($i = 0; $i -lt $givenParts.Count; $i++) {
    $prefix = if ($i -eq 0) { 'Given' } else { 'And' }
    $nodes += @{ type = 'text'; text = "$prefix " }
    $nodes += @{ type = 'text'; text = $givenParts[$i] }
    $nodes += @{ type = 'hardBreak' }
  }
  $whenParts = @(Split-GwtByAnd -Text $When)
  for ($i = 0; $i -lt $whenParts.Count; $i++) {
    $prefix = if ($i -eq 0) { 'When' } else { 'And' }
    $nodes += @{ type = 'text'; text = "$prefix " }
    $nodes += @{ type = 'text'; text = $whenParts[$i] }
    $nodes += @{ type = 'hardBreak' }
  }
  $thenParts = @(Split-GwtByAnd -Text $Then)
  for ($i = 0; $i -lt $thenParts.Count; $i++) {
    $prefix = if ($i -eq 0) { 'Then' } else { 'And' }
    $nodes += @{ type = 'text'; text = "$prefix " }
    $nodes += @{ type = 'text'; text = $thenParts[$i] }
    $nodes += @{ type = 'hardBreak' }
  }
  return $nodes
}

for ($i = 0; $i -lt $scenarioModel.Count; $i++) {
  $tcNum = $scenarioModel[$i].Number
  $desc = $scenarioModel[$i].FunctionalDescription
  $sourceDesc = $scenarioModel[$i].SourceDescription

  # Generate Given/When/Then from description
  $givenText = $scenarioModel[$i].Given
  $whenText = $scenarioModel[$i].When
  $thenText = $scenarioModel[$i].Then
  Assert-GwtSemanticQuality -Name "Test Case TC${tcNum} GWT" -Given $givenText -When $whenText -Then $thenText -Criterion $sourceDesc
  if ($noWrite -and $i -eq 0) {
    Write-Host "  ${auditLabel} sample TC${tcNum} GWT:" -ForegroundColor Yellow
    $displayLines = Format-GwtStepsForDisplay -Given $givenText -When $whenText -Then $thenText
    foreach ($line in $displayLines) {
      Write-Host "    $line" -ForegroundColor Gray
    }
  }

  $ruleNode = @{ type = 'rule' }
  $strongMarker = @(@{ type = 'strong' })

  $panelSteps = Format-GwtPanelStepsAdf -Given $givenText -When $whenText -Then $thenText

  $tcDescContent = @(
    $ruleNode
    @{ type = 'heading'; attrs = @{ level = 3 }; content = @(@{ type = 'text'; marks = $strongMarker; text = "$script:EmojiChart ESPECIFICACIONES DEL CASO DE PRUEBA" }) }
    $ruleNode
    @{ type = 'paragraph'; content = @(@{ type = 'text'; marks = $strongMarker; text = 'HISTORIA PADRE: ' }; @{ type = 'text'; text = "$parentKey - $parentSummary" }) }
    @{ type = 'paragraph'; content = @(@{ type = 'text'; marks = $strongMarker; text = 'ESCENARIO: ' }; @{ type = 'text'; text = $desc }) }
    @{ type = 'paragraph'; content = @(@{ type = 'text'; marks = $strongMarker; text = "$script:EmojiSteps PASOS DE PRUEBA" }) }
    @{ type = 'panel'; attrs = @{ panelType = 'success' }; content = @( @{ type = 'paragraph'; content = $panelSteps } ) }
    @{ type = 'paragraph'; content = @(@{ type = 'text'; marks = $strongMarker; text = "$script:EmojiFlag RESULTADO ACTUAL" }) }
    @{ type = 'bulletList'; content = @( @{ type = 'listItem'; content = @( @{ type = 'paragraph'; content = @( @{ type = 'text'; marks = $strongMarker; text = 'RESULTADO ACTUAL: ' } ) } ) } ) }
    @{ type = 'bulletList'; content = @( @{ type = 'listItem'; content = @( @{ type = 'paragraph'; content = @( @{ type = 'text'; marks = $strongMarker; text = 'ESTADO: ' }; @{ type = 'text'; text = '( ) PASADO | ( ) FALLA' } ) } ) } ) }
    $ruleNode
    @{ type = 'paragraph'; content = @(@{ type = 'text'; marks = $strongMarker; text = "$script:EmojiMemo REGISTRO DE $script:TextEjecucion (RESULTADOS)" }) }
    @{ type = 'bulletList'; content = @( @{ type = 'listItem'; content = @( @{ type = 'paragraph'; content = @( @{ type = 'text'; marks = $strongMarker; text = 'EVIDENCIA: ' } ) } ) } ) }
  )

  $tcSummary = $scenarioModel[$i].Summary
  $tcDescriptionDoc = @{
    type = 'doc'
    version = 1
    content = $tcDescContent
  }
  $requiredGwtText = @(Split-GwtByAnd -Text $givenText) + @(Split-GwtByAnd -Text $whenText) + @(Split-GwtByAnd -Text $thenText) + @('Given', 'When', 'Then')
  $requiredText = @($TestSetKey, $tcSummary, $desc) + $requiredGwtText + @("REGISTRO DE $script:TextEjecucion")
  $tcQualityPayload = @{ fields = @{ parent = @{ key = $TestSetKey }; summary = $tcSummary; description = $tcDescriptionDoc } }
  Assert-AdfQuality -Name "Test Case TC${tcNum} payload" -Json ($tcQualityPayload | ConvertTo-Json -Depth 20) -ExpectedParentKey $parentKey -ExpectedParentSummary $parentSummary -RequiredText $requiredText -RequiredEmoji @($script:EmojiChart, $script:EmojiSteps, $script:EmojiFlag, $script:EmojiMemo)

  $newTcSemanticKeys = @()
  $newTitleKey = Normalize-SemanticText -Text (Get-TestCaseTitleSemanticText -Summary $tcSummary)
  $newScenarioKey = Normalize-SemanticText -Text $desc
  $newSourceScenarioKey = Normalize-SemanticText -Text $sourceDesc
  if ($newTitleKey) { $newTcSemanticKeys += "title:$newTitleKey" }
  if ($newScenarioKey) { $newTcSemanticKeys += "scenario:$newScenarioKey" }
  if ($newSourceScenarioKey) { $newTcSemanticKeys += "scenario:$newSourceScenarioKey" }

  if ($existingTcSummaries.ContainsKey($tcSummary)) {
    $existingTcKey = $existingTcSummaries[$tcSummary]
    $currentTcDescription = $existingTcDescriptions[$tcSummary]
    $tcUpdatePlan = Get-TestCaseUpdatePlan -CurrentSummary $tcSummary -CurrentDescription $currentTcDescription -ExpectedSummary $tcSummary -ExpectedDescription $tcDescriptionDoc

    if ($tcUpdatePlan.NeedsUpdate) {
      $fieldLabel = $tcUpdatePlan.Fields -join '/'
      if ($noWrite) {
        Write-Host "  ${auditLabel}: would update TC${tcNum} $fieldLabel on $existingTcKey" -ForegroundColor Yellow
      } else {
        $tcUpdateFields = @{}
        if ($tcUpdatePlan.SummaryChanged) { $tcUpdateFields.summary = $tcSummary }
        if ($tcUpdatePlan.DescriptionChanged) { $tcUpdateFields.description = $tcDescriptionDoc }
        $tcUpdateBody = @{ fields = $tcUpdateFields }
        $tcUpdateJson = $tcUpdateBody | ConvertTo-Json -Depth 20
        $tcUpdateFile = Join-Path -Path $env:TEMP -ChildPath "jira_tc_update_$(Get-Random).json"
        Save-JsonFile -Path $tcUpdateFile -Json $tcUpdateJson
        try {
          [void](Invoke-JiraPut -Url $baseUrl -Auth $auth -Endpoint "/rest/api/3/issue/$existingTcKey" -BodyFile $tcUpdateFile)
          Write-Host "  Updated TC${tcNum}: $existingTcKey $fieldLabel" -ForegroundColor Green
        } finally {
          if (Test-Path -LiteralPath $tcUpdateFile) { Remove-Item -LiteralPath $tcUpdateFile -Force }
        }
      }
    } else {
      Write-Host "  Skipped TC${tcNum}: already exists as $existingTcKey" -ForegroundColor Yellow
    }
    $skippedCount++
    continue
  }

  if ($existingTcByNumber.ContainsKey([int]$tcNum)) {
    $existingByNumber = $existingTcByNumber[[int]$tcNum]
    $existingTcKey = $existingByNumber.Key
    $tcUpdatePlan = Get-TestCaseUpdatePlan -CurrentSummary $existingByNumber.Summary -CurrentDescription $existingByNumber.Description -ExpectedSummary $tcSummary -ExpectedDescription $tcDescriptionDoc
    if (-not $tcUpdatePlan.NeedsUpdate) {
      Write-Host "  Skipped TC${tcNum}: already exists as $existingTcKey (number match)" -ForegroundColor Yellow
    } elseif ($noWrite) {
      Write-Host "  ${auditLabel}: would update TC${tcNum} $($tcUpdatePlan.Fields -join '/') by number match $existingTcKey" -ForegroundColor Yellow
    } else {
      $tcUpdateFields = @{}
      if ($tcUpdatePlan.SummaryChanged) { $tcUpdateFields.summary = $tcSummary }
      if ($tcUpdatePlan.DescriptionChanged) { $tcUpdateFields.description = $tcDescriptionDoc }
      $tcUpdateBody = @{ fields = $tcUpdateFields }
      $tcUpdateJson = $tcUpdateBody | ConvertTo-Json -Depth 20
      $tcUpdateFile = Join-Path -Path $env:TEMP -ChildPath "jira_tc_update_$(Get-Random).json"
      Save-JsonFile -Path $tcUpdateFile -Json $tcUpdateJson
      try {
        [void](Invoke-JiraPut -Url $baseUrl -Auth $auth -Endpoint "/rest/api/3/issue/$existingTcKey" -BodyFile $tcUpdateFile)
        Write-Host "  Updated TC${tcNum}: $existingTcKey $($tcUpdatePlan.Fields -join '/') (number match)" -ForegroundColor Green
      } finally {
        if (Test-Path -LiteralPath $tcUpdateFile) { Remove-Item -LiteralPath $tcUpdateFile -Force }
      }
    }
    $skippedCount++
    continue
  }

  $semanticDuplicateKey = $null
  foreach ($key in $newTcSemanticKeys) {
    if ($existingTcSemanticKeys.ContainsKey($key)) { $semanticDuplicateKey = $key; break }
  }

  if ($semanticDuplicateKey) {
    $existingTcKey = $existingTcSemanticKeys[$semanticDuplicateKey]
    $existingSemantic = $existingTcByKey[$existingTcKey]
    $tcUpdatePlan = Get-TestCaseUpdatePlan -CurrentSummary $existingSemantic.Summary -CurrentDescription $existingSemantic.Description -ExpectedSummary $tcSummary -ExpectedDescription $tcDescriptionDoc
    if (-not $tcUpdatePlan.NeedsUpdate) {
      Write-Host "  Skipped TC${tcNum}: already exists as $existingTcKey (semantic match)" -ForegroundColor Yellow
    } elseif ($noWrite) {
      Write-Host "  ${auditLabel}: would update semantically equivalent TC${tcNum} $($tcUpdatePlan.Fields -join '/') on $existingTcKey" -ForegroundColor Yellow
    } else {
      $tcUpdateFields = @{}
      if ($tcUpdatePlan.SummaryChanged) { $tcUpdateFields.summary = $tcSummary }
      if ($tcUpdatePlan.DescriptionChanged) { $tcUpdateFields.description = $tcDescriptionDoc }
      $tcUpdateBody = @{ fields = $tcUpdateFields }
      $tcUpdateJson = $tcUpdateBody | ConvertTo-Json -Depth 20
      $tcUpdateFile = Join-Path -Path $env:TEMP -ChildPath "jira_tc_update_$(Get-Random).json"
      Save-JsonFile -Path $tcUpdateFile -Json $tcUpdateJson
      try {
        [void](Invoke-JiraPut -Url $baseUrl -Auth $auth -Endpoint "/rest/api/3/issue/$existingTcKey" -BodyFile $tcUpdateFile)
        Write-Host "  Updated TC${tcNum}: $existingTcKey $($tcUpdatePlan.Fields -join '/')" -ForegroundColor Green
      } finally {
        if (Test-Path -LiteralPath $tcUpdateFile) { Remove-Item -LiteralPath $tcUpdateFile -Force }
      }
    }
    $skippedCount++
    continue
  }

  $tcBody = @{
    fields = @{
      project = @{ id = '10911' }
      issuetype = @{ id = '11704' }
      parent = @{ key = $TestSetKey }
      summary = $tcSummary
      priority = @{ id = '3' }
      description = $tcDescriptionDoc
    }
  }

  $tcJson = $tcBody | ConvertTo-Json -Depth 20
  $tcFile = Join-Path -Path $env:TEMP -ChildPath "jira_tc_create_$(Get-Random).json"

  Save-JsonFile -Path $tcFile -Json $tcJson

  if ($noWrite) {
    Write-Host "  ${auditLabel}: would create TC${tcNum}: $tcSummary" -ForegroundColor Yellow
    Remove-Item -LiteralPath $tcFile -Force
    continue
  }

  $tcResult = Invoke-JiraPost -Url $baseUrl -Auth $auth -Endpoint "/rest/api/3/issue" -BodyFile $tcFile
  Remove-Item -LiteralPath $tcFile -Force

  try {
    $tcParsed = $tcResult | ConvertFrom-Json
    if ($tcParsed.key) {
      Write-Host "  Created TC${tcNum}: $($tcParsed.key)" -ForegroundColor Green
      $createdCount++
      $createdTestCases += @{ Key = $tcParsed.key; Summary = $tcSummary }
    } else {
      Write-Host "  Failed TC${tcNum}: $tcResult" -ForegroundColor Red
    }
  } catch {
    Write-Host "  Failed TC${tcNum}: $tcResult" -ForegroundColor Red
  }
}

# Summary
Write-Host "`n=== Sync Complete ===" -ForegroundColor Cyan
Write-Host "Test Set: $TestSetKey" -ForegroundColor Green
Write-Host "Linked User Story: $parentKey ($parentSummary)" -ForegroundColor Green
Write-Host "Semantic scope: $($analysis.ScopeSummary)" -ForegroundColor Green
Write-Host "Tarea Original status: $($originalTaskFieldUpdate.Status) $($originalTaskFieldUpdate.FieldId)" -ForegroundColor Green
Write-Host "Test Cases created: $createdCount / $($scenarioModel.Count)" -ForegroundColor Green
Write-Host "Test Cases skipped: $skippedCount" -ForegroundColor Green

if ($CommentResult) {
  $commentAdf = New-JiraNativeAuditCommentAdf `
    -TestSetKey $TestSetKey `
    -ParentKey $parentKey `
    -ParentSummary $parentSummary `
    -Mode (Get-SyncAuditModeLabel -CommentResult:$CommentResult -NoWrite:$noWrite) `
    -Result 'OK' `
    -SummaryStatus $summaryUpdateStatus `
    -DescriptionStatus $descriptionUpdateStatus `
    -OriginalTaskStatus "$($originalTaskFieldUpdate.Status) $($originalTaskFieldUpdate.FieldId)" `
    -OriginalTaskValue $originalTaskFieldUpdate.Value `
    -CreatedTestCases $createdTestCases `
    -PlannedTestCaseCount $scenarioModel.Count `
    -SkippedTestCaseCount $skippedCount `
    -RawDuplicateCount $rawDuplicateCount `
    -PostDedupDuplicateCount $dedupedDuplicateCount `
    -QualityStatus 'OK; naming, GWT, ADF, deduplicacion y mojibake validados'

  $commentJson = @{ body = $commentAdf } | ConvertTo-Json -Depth 20
  Assert-AdfQuality -Name 'Audit comment payload' -Json $commentJson -ExpectedParentKey $parentKey -ExpectedParentSummary $parentSummary -RequiredText @($TestSetKey, 'Jira-native sync BETA ejecutado', 'Estado: BETA', 'Tarea Original', 'Mojibake/quality gates') -RequiredEmoji @($script:EmojiCheck)

  if ($noWrite) {
    Write-Host "  ${auditLabel}: would add structured audit comment to $TestSetKey." -ForegroundColor Yellow
    Write-Host '  Comment preview ADF:' -ForegroundColor Gray
    Write-Host "  $($commentJson -replace '\s+', ' ')" -ForegroundColor Gray
  } else {
    $commentResult = Add-JiraComment -Url $baseUrl -Auth $auth -IssueKey $TestSetKey -AdfDoc $commentAdf
    if ($LASTEXITCODE -ne 0) {
      Write-Host "  WARNING: Comment may have failed: $commentResult" -ForegroundColor Yellow
    } else {
      Write-Host "  Structured audit comment added to $TestSetKey." -ForegroundColor Green
    }
  }
} elseif ($noWrite) {
  $previewAdf = New-JiraNativeAuditCommentAdf `
    -TestSetKey $TestSetKey `
    -ParentKey $parentKey `
    -ParentSummary $parentSummary `
    -Mode (Get-SyncAuditModeLabel -CommentResult:$false -NoWrite:$noWrite) `
    -Result 'OK' `
    -SummaryStatus $summaryUpdateStatus `
    -DescriptionStatus $descriptionUpdateStatus `
    -OriginalTaskStatus "$($originalTaskFieldUpdate.Status) $($originalTaskFieldUpdate.FieldId)" `
    -OriginalTaskValue $originalTaskFieldUpdate.Value `
    -CreatedTestCases @() `
    -PlannedTestCaseCount $scenarioModel.Count `
    -SkippedTestCaseCount $skippedCount `
    -RawDuplicateCount $rawDuplicateCount `
    -PostDedupDuplicateCount $dedupedDuplicateCount `
    -QualityStatus 'OK; naming, GWT, ADF, deduplicacion y mojibake validados'
  $previewJson = @{ body = $previewAdf } | ConvertTo-Json -Depth 20
  Assert-AdfQuality -Name 'Audit comment preview payload' -Json $previewJson -ExpectedParentKey $parentKey -ExpectedParentSummary $parentSummary -RequiredText @($TestSetKey, 'Jira-native sync BETA ejecutado', 'Estado: BETA', 'Tarea Original', 'Mojibake/quality gates') -RequiredEmoji @($script:EmojiCheck)
  Write-Host "  ${auditLabel}: structured audit comment available only with -CommentResult; no comment posted." -ForegroundColor Gray
}
