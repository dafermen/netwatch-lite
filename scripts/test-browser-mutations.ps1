#requires -Version 5.1
$ErrorActionPreference='Stop'
$repo=Split-Path -Parent $PSScriptRoot
$run=Join-Path $repo ('artifacts/verification/browser-mutations-'+[guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $run|Out-Null
$unit='tests/NetWatch.UnitTests/NetWatch.UnitTests.csproj'
$contract='tests/NetWatch.ContractTests/NetWatch.ContractTests.csproj'
$unitFilter='FullyQualifiedName~BrowserCheckRulesTests'
$contractFilter='FullyQualifiedName~ReadySession_RejectsRedirectsContentErrorsAndDeadlines'
$cases=@(
 @{name='unit-baseline';project=$unit;filter=$unitFilter},
 @{name='ignore-final-origin';project=$unit;filter=$unitFilter;file='Services/BrowserCheckRules.cs';before='!SameOrigin(target, current)';after='false'},
 @{name='ignore-required-query';project=$unit;filter=$unitFilter;file='Services/BrowserCheckRules.cs';before='return expected.All(pair => actual.TryGetValue(pair.Key, out var values) && pair.Value.SequenceEqual(values));';after='return true;'},
 @{name='ignore-explicit-session-header';project=$unit;filter=$unitFilter;file='Services/BrowserCheckEndpoints.cs';before='&& request.Headers["X-NetWatch-Browser"] == "1"';after='&& true'},
 @{name='redirect-baseline';project=$contract;filter=$contractFilter},
 @{name='ignore-redirect-navigation-guard';project=$contract;filter=$contractFilter;file='Services/BrowserCheckService.cs';before='&& !BrowserCheckRules.CanNavigate(session.Check, payload.GetProperty("request").GetProperty("url").GetString()!)';after='&& false'}
)
$files=@('NetWatch.csproj','Program.cs','Directory.Build.props','Directory.Packages.props','global.json','Assets/netwatch-lite.ico',
 $unit,$contract,'tests/NetWatch.UnitTests/BrowserCheckRulesTests.cs','tests/NetWatch.ContractTests/BrowserMonitoringTests.cs','tests/NetWatch.ContractTests/NetWatchApplicationFactory.cs','docs/README.md')
foreach($directory in @('Models','Services')) {$files+=@(Get-ChildItem -LiteralPath (Join-Path $repo $directory) -File -Filter '*.cs'|ForEach-Object{"$directory/$($_.Name)"})}
$original=@{};foreach($file in @($cases.file|Where-Object{$_}|Select-Object -Unique)){$original[$file]=(Get-FileHash -LiteralPath (Join-Path $repo $file)).Hash}
$results=@()
$caseOrdinal=0
foreach($case in $cases) {
 # Keep copied driver paths below Windows MAX_PATH even in longer CI checkout roots.
 $workspace=Join-Path $run ('c'+$caseOrdinal.ToString('D2'));$caseOrdinal++
 New-Item -ItemType Directory -Path $workspace,(Join-Path $workspace 'wwwroot')|Out-Null
 foreach($file in $files) {$target=Join-Path $workspace $file;New-Item -ItemType Directory -Path (Split-Path -Parent $target) -Force|Out-Null;Copy-Item -LiteralPath (Join-Path $repo $file) -Destination $target}
 if($case.file) {
  $target=Join-Path $workspace $case.file;$body=[IO.File]::ReadAllText($target)
  if([regex]::Matches($body,[regex]::Escape($case.before)).Count -ne 1){throw 'Mutation target is not unique.'}
  [IO.File]::WriteAllText($target,$body.Replace($case.before,$case.after),(New-Object Text.UTF8Encoding($false)))
 }
 $evidence=Join-Path $workspace 'results'
 $ErrorActionPreference='Continue'
 & dotnet test (Join-Path $workspace $case.project) -c Release -m:1 --filter $case.filter --logger 'trx;LogFileName=result.trx' --results-directory $evidence -- RunConfiguration.MaxCpuCount=1 xUnit.ParallelizeTestCollections=false 2>&1|Out-File -LiteralPath (Join-Path $workspace 'test.log') -Encoding utf8
 $code=$LASTEXITCODE;$ErrorActionPreference='Stop'
 $trxPath=Join-Path $evidence 'result.trx'
 if(-not(Test-Path -LiteralPath $trxPath)){throw "No test receipt for $($case.name); tool/build failure is not a killed mutant."}
 [xml]$trx=Get-Content -LiteralPath $trxPath -Raw
 if(@($trx.SelectNodes("//*[local-name()='UnitTestResult']")).Count -eq 0){throw 'No mutation assertions executed.'}
 $failed=@($trx.SelectNodes("//*[local-name()='UnitTestResult' and @outcome='Failed']")).Count
 if(-not $case.file -and ($code -ne 0 -or $failed)){throw 'Baseline failed.'}
 if($case.file -and ($code -eq 0 -or $failed -eq 0)){throw "Mutant survived: $($case.name)"}
 $results+=[ordered]@{name=$case.name;workspace=[IO.Path]::GetFileName($workspace);exitCode=$code;failedTests=$failed;killed=[bool]$case.file}
 Write-Host "PASS: $($case.name)"
}
foreach($file in $original.Keys){if((Get-FileHash -LiteralPath (Join-Path $repo $file)).Hash -ne $original[$file]){throw 'Source changed during mutation validation; do not revert it.'}}
[ordered]@{scope='Four sampled browser guard mutants, not whole-application mutation coverage';killed=4;total=4;results=$results}|ConvertTo-Json -Depth 6|Out-File -LiteralPath (Join-Path $run 'result.json') -Encoding utf8
Write-Host "Browser mutation evidence: $run"
$global:LASTEXITCODE=0
