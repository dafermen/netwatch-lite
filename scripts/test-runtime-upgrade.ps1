#requires -Version 7.0
param(
    [string]$SourceRoot = (Split-Path -Parent $PSScriptRoot),
    [string]$LegacyDll,
    [string]$LegacyDotnet = 'C:\Program Files\dotnet\dotnet.exe',
    [string]$CandidateDll,
    [string]$CandidateDotnet = (Get-Command dotnet -ErrorAction Stop).Source
)
$ErrorActionPreference = 'Stop'
$repo = Split-Path -Parent $PSScriptRoot
$SourceRoot = (Resolve-Path -LiteralPath $SourceRoot).Path
if (-not $LegacyDll) { $LegacyDll = Join-Path $SourceRoot 'bin/Release/net8.0/NetWatch-Lite.dll' }
if (-not $CandidateDll) { $CandidateDll = Join-Path $repo 'tests/.app/NetWatch-Lite.dll' }
foreach ($path in @($LegacyDll, $LegacyDotnet, $CandidateDll, $CandidateDotnet)) {
    if (-not (Test-Path -LiteralPath $path -PathType Leaf)) { throw "Required runtime pilot file missing: $path" }
}
foreach ($baseline in @(@{dll=$LegacyDll;tfm='net8.0'}, @{dll=$CandidateDll;tfm='net10.0'})) {
    $config = Get-Content -LiteralPath ([IO.Path]::ChangeExtension($baseline.dll, 'runtimeconfig.json')) -Raw | ConvertFrom-Json
    if ($config.runtimeOptions.tfm -cne $baseline.tfm) { throw 'Runtime pilot framework does not match its baseline.' }
}
$run = Join-Path $repo ('artifacts/verification/runtime-pilot-' + [guid]::NewGuid().ToString('N'))
$appRoot = Join-Path $run 'app'
$null = New-Item -ItemType Directory -Path $appRoot, (Join-Path $appRoot 'Data') -Force
$routes = @('/api/config', '/api/config/export', '/api/regions', '/api/device-types', '/api/themes', '/api/history', '/api/errors', '/api/integrations')
$report = [ordered]@{passed=$false; apiSnapshotsMatched=0; rollbackMatched=$false; documentBytesMatched=$false; originalJsonUnchanged=$false; schema=$null; queryCountsMatched=$false; observations=@()}
$client = [Net.Http.HttpClient]::new()
$client.Timeout = [TimeSpan]::FromSeconds(20)
$script:server = $null
function ProcessInfo([string]$HostPath, [string]$Dll, [string[]]$Arguments) {
    $info = [Diagnostics.ProcessStartInfo]::new($HostPath)
    $info.UseShellExecute = $false; $info.CreateNoWindow = $true; $info.WindowStyle = 'Hidden'
    $info.RedirectStandardOutput = $true; $info.RedirectStandardError = $true
    $info.WorkingDirectory = $appRoot
    $info.ArgumentList.Add($Dll); $info.ArgumentList.Add('--contentRoot'); $info.ArgumentList.Add($appRoot)
    foreach ($argument in $Arguments) { $info.ArgumentList.Add($argument) }
    foreach ($key in @($info.Environment.Keys)) {
        if ($key -match '^(NetworkMonitor__|Storage__|ASPNETCORE_|DOTNET_ENVIRONMENT)') { $null = $info.Environment.Remove($key) }
    }
    $info.Environment['ASPNETCORE_ENVIRONMENT'] = 'Production'
    $info.Environment['DOTNET_ROOT'] = Split-Path -Parent $HostPath
    $info.Environment['DOTNET_ROOT_X64'] = Split-Path -Parent $HostPath
    $info.Environment['DOTNET_ROLL_FORWARD'] = 'LatestPatch'
    return $info
}
function Offline([string]$Name, [string[]]$Arguments) {
    $process = [Diagnostics.Process]::new()
    $process.StartInfo = ProcessInfo $CandidateDotnet $CandidateDll $Arguments
    try {
        $null = $process.Start(); $stdout = $process.StandardOutput.ReadToEndAsync(); $stderr = $process.StandardError.ReadToEndAsync()
        if (-not $process.WaitForExit(60000)) { $process.Kill(); throw "Pilot action timed out: $Name" }
        [IO.File]::WriteAllText((Join-Path $run "$Name-out.log"), $stdout.GetAwaiter().GetResult())
        [IO.File]::WriteAllText((Join-Path $run "$Name-err.log"), $stderr.GetAwaiter().GetResult())
        if ($process.ExitCode -ne 0) { throw "Pilot action failed: $Name" }
    } finally { $process.Dispose() }
}
function Stop-Server {
    if ($script:server) {
        if (-not $script:server.HasExited) { $script:server.Kill(); $script:server.WaitForExit() }
        [IO.File]::WriteAllText((Join-Path $run "$script:label-out.log"), $script:stdout.GetAwaiter().GetResult())
        [IO.File]::WriteAllText((Join-Path $run "$script:label-err.log"), $script:stderr.GetAwaiter().GetResult())
        $script:server.Dispose(); $script:server = $null
    }
}
function Start-Server([string]$HostPath, [string]$Dll, [string]$Label) {
    $listener = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback, 0)
    $listener.Start(); $port = $listener.LocalEndpoint.Port; $listener.Stop()
    $script:label = $Label; $script:server = [Diagnostics.Process]::new()
    $script:server.StartInfo = ProcessInfo $HostPath $Dll @('--urls', "http://127.0.0.1:$port", '--Storage:Provider', 'sqlite')
    $watch = [Diagnostics.Stopwatch]::StartNew()
    $null = $script:server.Start(); $script:stdout = $script:server.StandardOutput.ReadToEndAsync(); $script:stderr = $script:server.StandardError.ReadToEndAsync()
    $base = "http://127.0.0.1:$port"
    while ($watch.Elapsed.TotalSeconds -lt 30) {
        if ($script:server.HasExited) { throw "Pilot server exited: $Label" }
        try {
            $storage = $client.GetStringAsync("$base/api/storage").GetAwaiter().GetResult() | ConvertFrom-Json
            if ($storage.provider -ne 'sqlite' -or $storage.schemaVersion -ne 2) { throw 'Expected unchanged SQLite schema 2.' }
            $script:server.Refresh()
            $report.observations += [ordered]@{stage=$Label;startupMs=$watch.ElapsedMilliseconds;workingSetBytes=$script:server.WorkingSet64}
            $report.schema = $storage.schemaVersion
            return $base
        } catch { Start-Sleep -Milliseconds 100 }
    }
    throw "Pilot server not ready: $Label"
}
function Snapshot([string]$Base) {
    $values = @{}
    foreach ($route in $routes) { $values[$route] = $client.GetStringAsync($Base + $route).GetAwaiter().GetResult() }
    return $values
}
function Hashes([string]$Root) {
    $values = @{}
    foreach ($file in Get-ChildItem -LiteralPath $Root -Recurse -File -Filter '*.json') {
        $values[[IO.Path]::GetRelativePath($Root, $file.FullName)] = (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash
    }
    return $values
}
function Assert-Hashes($Before, $After) {
    if ($Before.Count -ne $After.Count) { throw 'Private document count changed.' }
    foreach ($key in $Before.Keys) { if ($Before[$key] -cne $After[$key]) { throw 'Private document bytes changed.' } }
}
try {
    $published = Split-Path -Parent $CandidateDll
    foreach ($name in @('wwwroot', 'docs', 'config.sample.json', 'appsettings.json')) {
        Copy-Item -LiteralPath (Join-Path $published $name) -Destination $appRoot -Recurse
    }
    $original = Hashes (Join-Path $SourceRoot 'Data')
    Offline 'snapshot' @('--StorageAction', 'snapshot-readonly', '--StorageSource', (Join-Path $SourceRoot 'netwatch.db'), '--StorageDestination', (Join-Path $appRoot 'netwatch.db'))
    $before = Snapshot (Start-Server $LegacyDotnet $LegacyDll 'net8-before'); Stop-Server
    $before | ConvertTo-Json -Depth 8 | Out-File -LiteralPath (Join-Path $run 'baseline-api-private.json')
    Offline 'export-before' @('--Storage:Provider', 'sqlite', '--StorageAction', 'export-json', '--StorageDestination', (Join-Path $run 'before-documents'))
    $base = Start-Server $CandidateDotnet $CandidateDll 'net10'
    $after = Snapshot $base
    foreach ($route in $routes) { if ($before[$route] -cne $after[$route]) { throw "API snapshot changed: $route" }; $report.apiSnapshotsMatched++ }
    $history = $after['/api/history'] | ConvertFrom-Json
    $query = $client.GetStringAsync("$base/api/reports/query?size=10").GetAwaiter().GetResult() | ConvertFrom-Json
    $inventory = $client.GetStringAsync("$base/api/inventory/query?size=10").GetAwaiter().GetResult() | ConvertFrom-Json
    if ($query.coverage.runs -ne @($history.runs).Count -or $query.metrics.evaluations -ne @($history.runs | ForEach-Object { $_.results }).Count -or
        $inventory.total -ne @(($after['/api/config'] | ConvertFrom-Json).devices).Count) { throw 'Relational totals changed.' }
    $report.queryCountsMatched = $true; Stop-Server
    Offline 'verify' @('--Storage:Provider', 'sqlite', '--StorageAction', 'verify')
    Offline 'export-after' @('--Storage:Provider', 'sqlite', '--StorageAction', 'export-json', '--StorageDestination', (Join-Path $run 'after-documents'))
    Assert-Hashes (Hashes (Join-Path $run 'before-documents')) (Hashes (Join-Path $run 'after-documents'))
    $report.documentBytesMatched = $true
    $rollback = Snapshot (Start-Server $LegacyDotnet $LegacyDll 'net8-rollback'); Stop-Server
    foreach ($route in $routes) { if ($rollback[$route] -cne $before[$route]) { throw "Rollback API changed: $route" } }
    $report.rollbackMatched = $true
    Assert-Hashes $original (Hashes (Join-Path $SourceRoot 'Data')); $report.originalJsonUnchanged = $true
    $report.passed = $true
} finally {
    Stop-Server; $client.Dispose()
    $report | ConvertTo-Json -Depth 8 | Out-File -LiteralPath (Join-Path $run 'result.json')
}
$report | ConvertTo-Json -Depth 8 -Compress
Write-Host "Private runtime pilot evidence: $run"
