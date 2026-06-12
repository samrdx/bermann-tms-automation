$target = Join-Path -Path $PSScriptRoot -ChildPath 'Jira-native\sync-test-set.ps1'
& $target @args
exit $LASTEXITCODE
