#requires -Version 5.1
$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
$run = Join-Path $repo ('artifacts/verification/uxmut-' + [guid]::NewGuid().ToString('N').Substring(0,8))
New-Item -ItemType Directory -Path $run | Out-Null
$mutations = @(
    @{ name='lock-order'; project='Contract'; file='Services/JsonDeviceRepository.Versions.cs'; matches=2;
       pattern='return await _profileRepository\.WithActiveProfileTransactionAsync<object>\(async profile =>\s*\{\s*var state = await VersionState\(profile, token\);';
       after="return await _storage.WithTransactionAsync<object>(async () =>`n            {`n                var profile = await _profileRepository.GetActiveProfileAsync(token);`n                var state = await VersionState(profile, token);" },
    @{ name='revision'; project='Contract'; file='Services/JsonDeviceRepository.Versions.cs'; before='if (request.ProfileId != profile.Id || request.Revision != revision)'; after='if (false)' },
    @{ name='reviewed-file'; project='Contract'; file='Services/JsonDeviceRepository.Versions.cs'; before='if (Digest(bytes) != request.Sha256)'; after='if (false)' },
    @{ name='snapshot'; project='Contract'; file='Services/JsonDeviceRepository.Versions.cs'; before='await SaveRecoveryPoint(state.Profile, state.Bytes, state.Configuration, state.Vault, "Before import", token);'; after='await Task.CompletedTask;' },
    @{ name='integrity'; project='Contract'; file='Services/JsonDeviceRepository.Versions.cs'; before='if (bytes.Length != entry.Size || bytes.Length > MaxConfigurationBytes || Digest(bytes) != entry.Sha256)'; after='if (false)' },
    @{ name='hop-limit'; project='Unit'; file='Services/HttpCheckService.cs'; before='public const int MaxRedirects = 5;'; after='public const int MaxRedirects = 50;' },
    @{ name='downgrade'; project='Unit'; file='Services/HttpCheckService.cs'; before='if (current.Scheme == "https" && next.Scheme != "https")'; after='if (false)' },
    @{ name='login'; project='Unit'; file='Services/HttpCheckService.cs'; before='if (check.FollowRedirects && IsIdentityProvider(current))'; after='if (false)' },
    @{ name='default-off'; project='Unit'; file='Services/HttpCheckService.cs'; before='if (check.FollowRedirects && statusCode is 301 or 302 or 303 or 307 or 308)'; after='if (statusCode is 301 or 302 or 303 or 307 or 308)' }
)
$files = @('NetWatch.csproj','Program.cs','Directory.Build.props','Directory.Packages.props','global.json','Assets/netwatch-lite.ico','docs/README.md',
    'tests/NetWatch.ContractTests/NetWatch.ContractTests.csproj','tests/NetWatch.ContractTests/NetWatchApplicationFactory.cs','tests/NetWatch.ContractTests/ConfigurationVersionsTests.cs',
    'tests/NetWatch.UnitTests/NetWatch.UnitTests.csproj','tests/NetWatch.UnitTests/HttpCheckServiceTests.cs')
foreach ($directory in @('Models','Services')) {
    $files += @(Get-ChildItem -LiteralPath (Join-Path $repo $directory) -File -Filter '*.cs' | ForEach-Object { "$directory/$($_.Name)" })
}
$original = @{}
foreach ($case in $mutations) { $original[$case.file]=(Get-FileHash -LiteralPath (Join-Path $repo $case.file)).Hash }
$results = @()
$index = 0
foreach ($case in @(@{ name='baseline-unit'; project='Unit' }, @{ name='baseline-contract'; project='Contract' }) + $mutations) {
    $workspace = Join-Path $run ('c' + $index.ToString('00')); $index++
    New-Item -ItemType Directory -Path $workspace,(Join-Path $workspace 'wwwroot') | Out-Null
    foreach ($relative in $files) {
        $target = Join-Path $workspace $relative
        New-Item -ItemType Directory -Path (Split-Path -Parent $target) -Force | Out-Null
        Copy-Item -LiteralPath (Join-Path $repo $relative) -Destination $target
    }
    if ($case.file) {
        $target = Join-Path $workspace $case.file
        $body = [IO.File]::ReadAllText($target)
        if ($case.pattern) {
            if ([regex]::Matches($body,$case.pattern).Count -ne $case.matches) { throw 'Unexpected lock-order mutation scope.' }
            $body=[regex]::Replace($body,$case.pattern,$case.after)
        } else {
            if ([regex]::Matches($body,[regex]::Escape($case.before)).Count -ne 1) { throw "Mutation target is not unique: $($case.name)" }
            $body=$body.Replace($case.before,$case.after)
        }
        [IO.File]::WriteAllText($target,$body,(New-Object Text.UTF8Encoding($false)))
    }
    $project = "tests/NetWatch.$($case.project)Tests/NetWatch.$($case.project)Tests.csproj"
    $filter = if ($case.project -eq 'Unit') { 'FullyQualifiedName~HttpCheckServiceTests' } else { 'FullyQualifiedName~ConfigurationVersionsTests' }
    $evidence = Join-Path $workspace 'results'
    $ErrorActionPreference = 'Continue'
    & dotnet test (Join-Path $workspace $project) -c Release -m:1 -p:PlaywrightPlatform=none --filter $filter `
        --logger 'trx;LogFileName=result.trx' --results-directory $evidence `
        -- RunConfiguration.MaxCpuCount=1 xUnit.ParallelizeTestCollections=false 2>&1 | Out-File -LiteralPath (Join-Path $workspace 'test.log') -Encoding utf8
    $code = $LASTEXITCODE
    $ErrorActionPreference = 'Stop'
    $receipt = Join-Path $evidence 'result.trx'
    if (-not (Test-Path -LiteralPath $receipt)) { throw "Build/tool failure is not a killed mutant: $($case.name)" }
    [xml]$trx = Get-Content -LiteralPath $receipt -Raw
    $failed = @($trx.SelectNodes("//*[local-name()='UnitTestResult' and @outcome='Failed']")).Count
    $baseline = $case.name.StartsWith('baseline')
    if ($baseline -and ($code -ne 0 -or $failed)) { throw "Baseline failed: $($case.name)" }
    if (-not $baseline -and ($code -eq 0 -or $failed -eq 0)) { throw "Mutant survived: $($case.name)" }
    $results += [ordered]@{ name=$case.name; exitCode=$code; failedTests=$failed; killed=(-not $baseline) }
    Write-Host "PASS: $($case.name)"
}
foreach ($file in $original.Keys) {
    if ((Get-FileHash -LiteralPath (Join-Path $repo $file)).Hash -ne $original[$file]) { throw 'Source changed during mutation testing; do not revert user edits.' }
}
[ordered]@{ scope='Nine hand-selected recovery/redirect mutants, not whole-application coverage'; killed=$mutations.Count; total=$mutations.Count; results=$results } |
    ConvertTo-Json -Depth 6 | Out-File -LiteralPath (Join-Path $run 'result.json') -Encoding utf8
Write-Host "Mutation evidence: $run"
$global:LASTEXITCODE = 0
