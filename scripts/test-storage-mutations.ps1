#requires -Version 5.1
$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
$run = Join-Path $repo ('artifacts/verification/storage-mutations-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $run | Out-Null
$mutations = @(
    @{ name = 'skip-previous-backup'; file = 'Services/LocalDataStore.cs'; before = 'if (createBackup && overwrite)'; after = 'if (false)' },
    @{ name = 'skip-write-commit'; file = 'Services/LocalDataStore.cs'; before = "action(connection, transaction);`n        cancellationToken.ThrowIfCancellationRequested();`n        transaction.Commit();"; after = "action(connection, transaction);`n        cancellationToken.ThrowIfCancellationRequested();" },
    @{ name = 'ignore-newer-schema'; file = 'Services/LocalDataStore.cs'; before = 'if (version > CurrentSchemaVersion)'; after = 'if (version > 1000)' },
    @{ name = 'ignore-changed-migration-source'; file = 'Services/StorageMaintenance.cs'; before = 'hash != Hash(source.Value)'; after = 'false' },
    @{ name = 'skip-relational-projection'; file = 'Services/LocalDataStore.cs'; before = 'RelationalSchema.Synchronize(connection, transaction, key, bytes, audit: true, previous);'; after = '// Mutant: projection omitted.' },
    @{ name = 'skip-upgrade-backup'; file = 'Services/RelationalSchema.cs'; before = 'if (backupUpgrade)'; after = 'if (false)' }
)
$sourceFiles = @('NetWatch.csproj', 'Program.cs', 'Directory.Build.props', 'Directory.Packages.props', 'global.json', 'Assets/netwatch-lite.ico',
    'tests/NetWatch.IntegrationTests/NetWatch.IntegrationTests.csproj')
foreach ($directory in @('Models', 'Services', 'tests/NetWatch.IntegrationTests')) {
    $base = Join-Path $repo $directory
    $sourceFiles += @(Get-ChildItem -LiteralPath $base -File -Filter '*.cs' | ForEach-Object { "$directory/$($_.Name)" })
}
$results = @()
foreach ($case in @(@{name='baseline'}) + $mutations) {
    $workspace = Join-Path $run $case.name
    New-Item -ItemType Directory -Path $workspace | Out-Null
    foreach ($relative in $sourceFiles) {
        $target = Join-Path $workspace $relative
        New-Item -ItemType Directory -Path (Split-Path -Parent $target) -Force | Out-Null
        Copy-Item -LiteralPath (Join-Path $repo $relative) -Destination $target
    }
    if ($case.file) {
        $target = Join-Path $workspace $case.file
        $body = [IO.File]::ReadAllText($target).Replace("`r`n", "`n")
        if ([regex]::Matches($body, [regex]::Escape($case.before)).Count -ne 1) { throw 'Mutation target is not unique.' }
        [IO.File]::WriteAllText($target, $body.Replace($case.before, $case.after), (New-Object Text.UTF8Encoding($false)))
    }
    $evidence = Join-Path $workspace 'results'
    $previousErrorAction = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    # Storage-only mutants never launch a browser; avoid needless driver copies in nested Windows paths.
    & dotnet test (Join-Path $workspace 'tests/NetWatch.IntegrationTests/NetWatch.IntegrationTests.csproj') -c Release -p:PlaywrightPlatform=none `
        --filter 'FullyQualifiedName~LocalDataStoreTests|FullyQualifiedName~RelationalUpgradeTests' --logger 'trx;LogFileName=result.trx' --results-directory $evidence 2>&1 |
        Out-File -LiteralPath (Join-Path $workspace 'test.log') -Encoding utf8
    $code = $LASTEXITCODE
    $ErrorActionPreference = $previousErrorAction
    $trxPath = Join-Path $evidence 'result.trx'
    if (-not (Test-Path -LiteralPath $trxPath)) { throw "No valid test result for $($case.name); compilation/tool failure is not a killed mutant." }
    [xml]$trx = Get-Content -LiteralPath $trxPath -Raw
    $failed = @($trx.SelectNodes("//*[local-name()='UnitTestResult' and @outcome='Failed']")).Count
    if ($case.name -eq 'baseline' -and ($code -ne 0 -or $failed)) { throw 'Baseline tests failed.' }
    if ($case.name -ne 'baseline' -and ($code -eq 0 -or $failed -eq 0)) { throw "Mutant survived: $($case.name)" }
    $results += [ordered]@{ name=$case.name; exitCode=$code; failedTests=$failed; killed=($case.name -ne 'baseline') }
    Write-Host "PASS: $($case.name)"
}
[ordered]@{ scope='Six hand-selected storage mutants; not whole-application mutation coverage'; killed=6; total=6; results=$results } |
    ConvertTo-Json -Depth 6 | Out-File -LiteralPath (Join-Path $run 'result.json') -Encoding utf8
Write-Host "Mutation evidence: $run"
$global:LASTEXITCODE = 0
