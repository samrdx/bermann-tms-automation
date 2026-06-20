param(
  [string]$RepoPath = (Get-Location).Path
)

$ErrorActionPreference = 'SilentlyContinue'

if (-not (Test-Path -LiteralPath $RepoPath)) {
  exit 0
}

$branch = git -C $RepoPath branch --show-current 2>$null
if (-not $branch) {
  exit 0
}

$status = git -C $RepoPath status --porcelain 2>$null
$aheadBehind = git -C $RepoPath rev-list --count --left-right '@{upstream}...HEAD' 2>$null

$dirty = if ($status) { '*' } else { '' }
$summary = "git:$branch$dirty"

if ($aheadBehind -match '^(\d+)\s+(\d+)$') {
  $behind = [int]$Matches[1]
  $ahead = [int]$Matches[2]

  if ($ahead -gt 0) {
    $summary += " ↑$ahead"
  }

  if ($behind -gt 0) {
    $summary += " ↓$behind"
  }
}

$summary
