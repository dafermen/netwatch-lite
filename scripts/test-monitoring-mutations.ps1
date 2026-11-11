#requires -Version 5.1
$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
$run = Join-Path $repo ('artifacts/verification/monitoring-mutations-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $run | Out-Null
$mutations = @(
    @{ name='ignore-type-scope'; file='Services/MonitorExecutionService.cs'; before='if (!string.IsNullOrWhiteSpace(deviceType))'; after='if (false)' },
    @{ name='ignore-facility-scope'; file='Services/MonitorExecutionService.cs'; before='if (!string.IsNullOrWhiteSpace(facilityName))'; after='if (false)' },
    @{ name='ignore-category-scope'; file='Services/MonitorExecutionService.cs'; before='if (!string.IsNullOrWhiteSpace(categoryName))'; after='if (false)' },
    @{ name='omit-result-classification'; file='Services/NetworkMonitorService.cs'; before='DeviceType = device.DeviceType,'; after='DeviceType = null,' }
)
$sourceFiles = @('NetWatch.csproj','Program.cs','Directory.Build.props','Directory.Packages.props','global.json','Assets/netwatch-lite.ico',
    'tests/NetWatch.ContractTests/NetWatch.ContractTests.csproj','tests/NetWatch.ContractTests/NetWatchApplicationFactory.cs',
    'tests/NetWatch.ContractTests/DashboardDeviceTypeTests.cs','docs/README.md')
foreach ($directory in @('Models','Services')) {
    $sourceFiles += @(Get-ChildItem -LiteralPath (Join-Path $repo $directory) -File -Filter '*.cs' | ForEach-Object { "$directory/$($_.Name)" })
}
$original = @{}; foreach ($case in $mutations) { $original[$case.file]=(Get-FileHash -LiteralPath (Join-Path $repo $case.file)).Hash }
$results = @()
foreach ($case in @(@{name='baseline'}) + $mutations) {
    $workspace = Join-Path $run $case.name
    New-Item -ItemType Directory -Path $workspace,(Join-Path $workspace 'wwwroot') | Out-Null
    foreach ($relative in $sourceFiles) {
        $target=Join-Path $workspace $relative
        New-Item -ItemType Directory -Path (Split-Path -Parent $target) -Force | Out-Null
        Copy-Item -LiteralPath (Join-Path $repo $relative) -Destination $target
    }
    if ($case.file) {
        $target=Join-Path $workspace $case.file
        $body=[IO.File]::ReadAllText($target)
        if ([regex]::Matches($body,[regex]::Escape($case.before)).Count -ne 1) { throw 'Mutation target is not unique.' }
        [IO.File]::WriteAllText($target,$body.Replace($case.before,$case.after),(New-Object Text.UTF8Encoding($false)))
    }
    $evidence=Join-Path $workspace 'results'
    $ErrorActionPreference='Continue'
    & dotnet test (Join-Path $workspace 'tests/NetWatch.ContractTests/NetWatch.ContractTests.csproj') -c Release -m:1 `
        --filter 'FullyQualifiedName~DashboardDeviceTypeTests' --logger 'trx;LogFileName=result.trx' --results-directory $evidence `
        -- RunConfiguration.MaxCpuCount=1 xUnit.ParallelizeTestCollections=false 2>&1 | Out-File -LiteralPath (Join-Path $workspace 'test.log') -Encoding utf8
    $code=$LASTEXITCODE
    $ErrorActionPreference='Stop'
    $trxPath=Join-Path $evidence 'result.trx'
    if (-not (Test-Path -LiteralPath $trxPath)) { throw "No test receipt for $($case.name); build/tool failure is not a killed mutant." }
    [xml]$trx=Get-Content -LiteralPath $trxPath -Raw
    $failed=@($trx.SelectNodes("//*[local-name()='UnitTestResult' and @outcome='Failed']")).Count
    if ($case.name -eq 'baseline' -and ($code -ne 0 -or $failed)) { throw 'Baseline tests failed.' }
    if ($case.name -ne 'baseline' -and ($code -eq 0 -or $failed -eq 0)) { throw "Mutant survived: $($case.name)" }
    $results += [ordered]@{name=$case.name;exitCode=$code;failedTests=$failed;killed=($case.name -ne 'baseline')}
    Write-Host "PASS: $($case.name)"
}
foreach ($file in $original.Keys) {
    if ((Get-FileHash -LiteralPath (Join-Path $repo $file)).Hash -ne $original[$file]) { throw 'Source changed during mutation validation; inspect without reverting it.' }
}
[ordered]@{scope='Four hand-selected monitoring scope mutants; not whole-application coverage';killed=4;total=4;results=$results} |
    ConvertTo-Json -Depth 6 | Out-File -LiteralPath (Join-Path $run 'result.json') -Encoding utf8
Write-Host "Mutation evidence: $run"
$global:LASTEXITCODE = 0
