#requires -Version 7.0
param(
    [string]$SourceRoot = (Split-Path -Parent $PSScriptRoot),
    [string]$LegacyDll,
    [string]$LegacyDotnet = 'C:\Program Files\dotnet\dotnet.exe',
    [string]$CandidateDotnet = (Get-Command dotnet -ErrorAction Stop).Source
)
$ErrorActionPreference = 'Stop'
$SourceRoot = (Resolve-Path -LiteralPath $SourceRoot).Path
$repo = Split-Path -Parent $PSScriptRoot
$run = Join-Path $repo ('artifacts/verification/relational-pilot-' + [guid]::NewGuid().ToString('N'))
$appRoot = Join-Path $run 'app'
$runner = Join-Path $repo 'tests/.app/NetWatch-Lite.dll'
$legacy = if ($LegacyDll) { (Resolve-Path -LiteralPath $LegacyDll).Path } else { Join-Path $SourceRoot 'bin/Release/net8.0/NetWatch-Lite.dll' }
New-Item -ItemType Directory -Path $appRoot -Force | Out-Null
if(Test-Path -LiteralPath (Join-Path $SourceRoot 'Data') -PathType Container){New-Item -ItemType Directory -Path (Join-Path $appRoot 'Data') | Out-Null}
$process = $null
$client = [Net.Http.HttpClient]::new()
$report = [ordered]@{ passed=$false; snapshotRoutes=0; documentHashesMatched=$false; rollbackMatched=$false; originalJsonUnchanged=$false; queryCountsMatched=$false; schema=$null }
function Info([string]$Dll,[string]$Root,[string[]]$Arguments) {
    $hostPath = if ($Dll -eq $legacy) { $LegacyDotnet } else { $CandidateDotnet }
    $info = [Diagnostics.ProcessStartInfo]::new($hostPath)
    $info.UseShellExecute=$false; $info.CreateNoWindow=$true; $info.WindowStyle='Hidden'
    $info.RedirectStandardOutput=$true; $info.RedirectStandardError=$true; $info.WorkingDirectory=$Root
    $info.ArgumentList.Add($Dll); $info.ArgumentList.Add('--contentRoot'); $info.ArgumentList.Add($Root)
    foreach($argument in $Arguments){$info.ArgumentList.Add($argument)}
    foreach($key in @($info.Environment.Keys)){if($key -match '^(NetworkMonitor__|Storage__|ASPNETCORE_|DOTNET_ENVIRONMENT)'){$info.Environment.Remove($key)}}
    $info.Environment['ASPNETCORE_ENVIRONMENT']='Production'
    $info.Environment['DOTNET_ROOT']=Split-Path -Parent $hostPath
    $info.Environment['DOTNET_ROOT_X64']=Split-Path -Parent $hostPath
    $info.Environment['DOTNET_ROLL_FORWARD']='LatestPatch'
    return $info
}
function Offline([string]$Name,[string[]]$Arguments){
    $p=[Diagnostics.Process]::new();$p.StartInfo=Info $runner $appRoot $Arguments
    try{$null=$p.Start();$out=$p.StandardOutput.ReadToEndAsync();$err=$p.StandardError.ReadToEndAsync();if(-not $p.WaitForExit(60000)){$p.Kill();throw 'Offline pilot timed out.'}
        [IO.File]::WriteAllText((Join-Path $run "$Name-out.log"),$out.GetAwaiter().GetResult());[IO.File]::WriteAllText((Join-Path $run "$Name-err.log"),$err.GetAwaiter().GetResult())
        if($p.ExitCode -ne 0){throw "Offline pilot failed: $Name"}
    }finally{$p.Dispose()}
}
function Stop-Server {
    if($script:process){if(-not $script:process.HasExited){$script:process.Kill();$script:process.WaitForExit()};$script:stdout.GetAwaiter().GetResult() | Out-File (Join-Path $run "$script:name-out.log");$script:stderr.GetAwaiter().GetResult() | Out-File (Join-Path $run "$script:name-err.log");$script:process.Dispose();$script:process=$null}
}
function Start-Server([string]$Dll,[string]$Root,[string]$Name){
    $listener=[Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback,0);$listener.Start();$port=$listener.LocalEndpoint.Port;$listener.Stop()
    $script:name=$Name;$script:process=[Diagnostics.Process]::new();$script:process.StartInfo=Info $Dll $Root @('--urls',"http://127.0.0.1:$port",'--Storage:Provider','sqlite')
    $null=$script:process.Start();$script:stdout=$script:process.StandardOutput.ReadToEndAsync();$script:stderr=$script:process.StandardError.ReadToEndAsync()
    $base="http://127.0.0.1:$port";$watch=[Diagnostics.Stopwatch]::StartNew()
    while($watch.Elapsed.TotalSeconds -lt 30){if($script:process.HasExited){throw 'Pilot server exited.'};try{$r=$client.GetAsync("$base/api/storage").GetAwaiter().GetResult();try{if($r.IsSuccessStatusCode){return $base}}finally{$r.Dispose()}}catch{};Start-Sleep -Milliseconds 100}
    throw 'Pilot startup timed out.'
}
function Snapshot([string]$Base){
    $result=@{};foreach($route in @('/api/config','/api/config/export','/api/regions','/api/device-types','/api/themes','/api/history','/api/errors','/api/integrations')){$result[$route]=$client.GetStringAsync($Base+$route).GetAwaiter().GetResult()};return $result
}
function Hashes([string]$Root){$result=@{};foreach($file in Get-ChildItem -LiteralPath $Root -File -Recurse -Filter '*.json'){$result[[IO.Path]::GetRelativePath($Root,$file.FullName)]=(Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash};return $result}
try{
    foreach($name in @('wwwroot','docs')){Copy-Item -LiteralPath (Join-Path $repo "tests/.app/$name") -Destination $appRoot -Recurse}
    Copy-Item -LiteralPath (Join-Path $repo 'tests/.app/config.sample.json') -Destination $appRoot
    $original=@{};foreach($file in Get-ChildItem -LiteralPath (Join-Path $SourceRoot 'Data') -Recurse -File -Filter '*.json'){$original[$file.FullName]=(Get-FileHash -LiteralPath $file.FullName).Hash}
    Offline 'snapshot' @('--StorageAction','snapshot-readonly','--StorageSource',(Join-Path $SourceRoot 'netwatch.db'),'--StorageDestination',(Join-Path $appRoot 'netwatch.db'))
    $legacyBase=Start-Server $legacy $appRoot 'legacy'
    $legacyStorage=$client.GetStringAsync("$legacyBase/api/storage").GetAwaiter().GetResult()|ConvertFrom-Json
    if($legacyStorage.schemaVersion -ne 1){throw 'This historical pilot requires a schema-1 baseline. Use test-runtime-upgrade.ps1 for the current schema-2 runtime comparison.'}
    # Initialize legacy defaults/backups on the copy before freezing its baseline.
    $null=Snapshot $legacyBase;Stop-Server
    $before=Snapshot (Start-Server $legacy $appRoot 'legacy-baseline');Stop-Server
    Offline 'export-before' @('--StorageAction','export-json','--StorageDestination',(Join-Path $run 'before'))
    $base=Start-Server $runner $appRoot 'schema2';$after=Snapshot $base
    foreach($route in $before.Keys){if($before[$route] -cne $after[$route]){throw "API snapshot mismatch: $route"};$report.snapshotRoutes++}
    $report.schema=($client.GetStringAsync("$base/api/storage").GetAwaiter().GetResult()|ConvertFrom-Json).schemaVersion
    if($report.schema -ne 2){throw 'Expected schema 2.'}
    $query=$client.GetStringAsync("$base/api/reports/query?size=10").GetAwaiter().GetResult()|ConvertFrom-Json
    $history=$after['/api/history']|ConvertFrom-Json
    $evaluations=@($history.runs|ForEach-Object{$_.results}).Count
    if($query.coverage.runs -ne @($history.runs).Count -or $query.metrics.evaluations -ne $evaluations){throw 'SQL history counts do not match compatible history.'}
    $inventory=$client.GetStringAsync("$base/api/inventory/query?size=10").GetAwaiter().GetResult()|ConvertFrom-Json
    if($inventory.total -ne @(($after['/api/config']|ConvertFrom-Json).devices).Count){throw 'SQL inventory count does not match configuration.'}
    $report.queryCountsMatched=$true
    Stop-Server
    Offline 'export-after' @('--StorageAction','export-json','--StorageDestination',(Join-Path $run 'after'))
    $a=Hashes (Join-Path $run 'before');$b=Hashes (Join-Path $run 'after')
    if($a.Count -ne $b.Count){throw 'Document count changed.'};foreach($key in $a.Keys){if($a[$key] -ne $b[$key]){throw 'Document bytes changed during upgrade.'}};$report.documentHashesMatched=$true
    $backup=Get-ChildItem -LiteralPath (Join-Path $appRoot 'storage-backups/schema-upgrades') -File -Filter '*.db' | Select-Object -First 1
    Offline 'restore' @('--StorageAction','restore-backup','--StorageSource',$backup.FullName,'--StorageDestination',(Join-Path $run 'restored'))
    $rollback=Snapshot (Start-Server $legacy (Join-Path $run 'restored') 'rollback');Stop-Server
    foreach($route in $before.Keys){if($before[$route] -cne $rollback[$route]){throw "Rollback mismatch: $route"}};$report.rollbackMatched=$true
    foreach($path in $original.Keys){if((Get-FileHash -LiteralPath $path).Hash -ne $original[$path]){throw 'Original JSON changed.'}};$report.originalJsonUnchanged=$true
    $report.passed=$true
}finally{Stop-Server;$client.Dispose();$report|ConvertTo-Json -Depth 8|Out-File (Join-Path $run 'result.json')}
Write-Output ($report|ConvertTo-Json -Compress)
Write-Output "Evidence: $run"
