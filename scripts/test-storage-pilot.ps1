#requires -Version 5.1
param([Parameter(Mandatory=$true)][string]$SourceRoot, [string]$PublishedRoot)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'portable-package.ps1')
Add-Type -AssemblyName System.Net.Http
$repo = Split-Path -Parent $PSScriptRoot
$SourceRoot = (Resolve-Path -LiteralPath $SourceRoot).Path
if (-not $PublishedRoot) { $PublishedRoot = Join-Path $repo 'tests/.app' }
$PublishedRoot = (Resolve-Path -LiteralPath $PublishedRoot).Path
Assert-PlainDirectoryChain $SourceRoot
Assert-PlainDirectoryChain $PublishedRoot
$run = Join-Path $repo ('artifacts/verification/storage-pilot-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $run | Out-Null
$appRoot = Join-Path $run 'app'
$rollbackRoot = Join-Path $run 'rollback-app'
$dotnet = (Get-Command dotnet).Source
$client = New-Object Net.Http.HttpClient
$client.Timeout = [TimeSpan]::FromSeconds(10)
$script:server = $null
$sourceLease = $null
$report = [ordered]@{ passed=$false; sourceFiles=0; snapshotRoutes=0; migrationDocuments=0; exactIdempotence=$false;
    rollbackMatches=$false; sourceUnchanged=$false; engineVersion=$null; migrationMs=0; sqliteReadMs=0; peakWorkingSetBytes=0 }
function Copy-PublicRuntime([string]$Target) {
    New-Item -ItemType Directory -Path $Target | Out-Null
    foreach ($file in Get-PortableFiles $PublishedRoot) {
        $path = Join-Path $Target $file.Relative
        New-Item -ItemType Directory -Path (Split-Path -Parent $path) -Force | Out-Null
        Copy-Item -LiteralPath $file.Path -Destination $path
    }
}
function Process-Info([string]$Root, [string]$Arguments) {
    $info = New-Object Diagnostics.ProcessStartInfo
    $info.FileName = $dotnet
    $info.Arguments = '"' + (Join-Path $appRoot 'NetWatch-Lite.dll') + '" --contentRoot "' + $Root + '" ' + $Arguments
    $info.WorkingDirectory = $Root
    $info.UseShellExecute=$false; $info.CreateNoWindow=$true; $info.WindowStyle='Hidden'
    $info.RedirectStandardOutput=$true; $info.RedirectStandardError=$true
    foreach ($key in @($info.EnvironmentVariables.Keys)) {
        if ($key -match '^(NetworkMonitor__|Storage__|ASPNETCORE_|DOTNET_ENVIRONMENT)') { $info.EnvironmentVariables.Remove($key) }
    }
    $info.EnvironmentVariables['ASPNETCORE_ENVIRONMENT']='Production'
    $info.EnvironmentVariables['DOTNET_ENVIRONMENT']='Production'
    return $info
}
function Stop-PilotServer {
    if (-not $script:server) { return }
    $process=$script:server.process
    if (-not $process.HasExited) { $process.Kill(); $process.WaitForExit() }
    Write-NewPortableText (Join-Path $run ($script:server.name+'-stdout.log')) $script:server.stdout.GetAwaiter().GetResult()
    Write-NewPortableText (Join-Path $run ($script:server.name+'-stderr.log')) $script:server.stderr.GetAwaiter().GetResult()
    $process.Dispose(); $script:server=$null
}
function Start-PilotServer([string]$Root, [string]$Provider, [string]$Name) {
    $listener=New-Object Net.Sockets.TcpListener([Net.IPAddress]::Loopback,0)
    $listener.Start(); $port=$listener.LocalEndpoint.Port; $listener.Stop()
    $process=New-Object Diagnostics.Process
    $process.StartInfo=Process-Info $Root "--urls http://127.0.0.1:$port --Storage:Provider $Provider"
    $null=$process.Start()
    $script:server=@{ process=$process; stdout=$process.StandardOutput.ReadToEndAsync(); stderr=$process.StandardError.ReadToEndAsync(); name=$Name }
    $base="http://127.0.0.1:$port"
    $watch=[Diagnostics.Stopwatch]::StartNew()
    while($watch.Elapsed.TotalSeconds -lt 30) {
        if($process.HasExited){throw 'Pilot process exited before readiness.'}
        try {
            $response=$client.GetAsync("$base/api/storage").GetAwaiter().GetResult()
            try {if([int]$response.StatusCode -eq 200){return $base}} finally{$response.Dispose()}
        } catch { }
        Start-Sleep -Milliseconds 100
    }
    throw 'Pilot startup timed out.'
}
function Offline([string]$Name, [string]$Arguments) {
    $process=New-Object Diagnostics.Process
    $process.StartInfo=Process-Info $appRoot $Arguments
    try {
        $null=$process.Start()
        $stdout=$process.StandardOutput.ReadToEndAsync(); $stderr=$process.StandardError.ReadToEndAsync()
        if(-not $process.WaitForExit(60000)){ $process.Kill(); $process.WaitForExit(); throw 'Offline pilot command timed out.' }
        $out=$stdout.GetAwaiter().GetResult(); $err=$stderr.GetAwaiter().GetResult()
        Write-NewPortableText (Join-Path $run ($Name+'-stdout.log')) $out
        Write-NewPortableText (Join-Path $run ($Name+'-stderr.log')) $err
        if($process.ExitCode -ne 0){throw "Pilot command failed: $Name (see private local logs)."}
        return ($out | ConvertFrom-Json)
    } finally { $process.Dispose() }
}
function Snapshot([string]$Base) {
    $values=[ordered]@{}
    foreach($route in @('/api/config','/api/config/export','/api/regions','/api/device-types','/api/themes','/api/history','/api/errors','/api/integrations')) {
        $values[$route]=$client.GetStringAsync($Base+$route).GetAwaiter().GetResult()
    }
    return $values
}
function Compare-Snapshot($Expected,$Actual) {
    foreach($key in $Expected.Keys) {if($Expected[$key] -cne $Actual[$key]){throw "Provider/rollback mismatch at $key (no operator source was restored)."}}
}
try {
    # Hold only the current source folder's maintenance lease; all launches below use private copies.
    $sourceLease=[IO.File]::Open((Join-Path $SourceRoot '.netwatch-runtime.lock'),[IO.FileMode]::OpenOrCreate,[IO.FileAccess]::ReadWrite,[IO.FileShare]::None)
    Copy-PublicRuntime $appRoot
    $sources=@()
    foreach($name in @('config.json','regions.json','themes.json','monitor-history.json','app-errors.json','integrations.json')) {
        foreach($path in @((Join-Path $SourceRoot $name),(Join-Path $SourceRoot ([IO.Path]::ChangeExtension($name,'.backup.json'))))) {
            if(Test-Path -LiteralPath $path -PathType Leaf){$sources+=Get-Item -LiteralPath $path}
        }
    }
    if(Test-Path -LiteralPath (Join-Path $SourceRoot 'Data') -PathType Container) {
        Assert-PlainDirectoryChain (Join-Path $SourceRoot 'Data')
        $sources+=@(Get-PortableFiles (Join-Path $SourceRoot 'Data') | Where-Object Relative -like '*.json' | ForEach-Object {Get-Item -LiteralPath $_.Path})
    }
    $hashes=@{}
    foreach($file in $sources){
        if($file.Attributes -band [IO.FileAttributes]::ReparsePoint){throw 'Redirected operator document rejected.'}
        $relative=$file.FullName.Substring($SourceRoot.TrimEnd('\').Length+1)
        $target=Join-Path $appRoot $relative
        New-Item -ItemType Directory -Path (Split-Path -Parent $target) -Force | Out-Null
        Copy-Item -LiteralPath $file.FullName -Destination $target
        $hashes[$file.FullName]=(Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash
    }
    $report.sourceFiles=$hashes.Count
    $jsonBase=Start-PilotServer $appRoot 'json' 'json'
    $baseline=Snapshot $jsonBase
    $fingerprints=@()
    foreach($route in $baseline.Keys){
        $hash=[Security.Cryptography.SHA256]::Create()
        try{$bytes=$hash.ComputeHash([Text.Encoding]::UTF8.GetBytes($baseline[$route]))}finally{$hash.Dispose()}
        $fingerprints+=[ordered]@{route=$route;sha256=([BitConverter]::ToString($bytes)).Replace('-','').ToLowerInvariant()}
    }
    Write-NewPortableText (Join-Path $run 'api-fingerprints.json') (($fingerprints | ConvertTo-Json -Depth 4)+"`n")
    Stop-PilotServer
    $timer=[Diagnostics.Stopwatch]::StartNew()
    $migration=Offline 'migrate' '--StorageAction migrate-json'
    $report.migrationMs=$timer.ElapsedMilliseconds
    $report.migrationDocuments=$migration.DocumentCount
    $null=Offline 'verify' '--StorageAction verify'
    $database=Join-Path $appRoot 'netwatch.db'
    $before=(Get-FileHash -LiteralPath $database -Algorithm SHA256).Hash
    $repeated=Offline 'repeat' '--StorageAction migrate-json'
    if(-not $repeated.AlreadyMigrated -or (Get-FileHash -LiteralPath $database -Algorithm SHA256).Hash -ne $before){throw 'Migration repeat was not an exact no-op.'}
    $report.exactIdempotence=$true
    $sqliteBase=Start-PilotServer $appRoot 'auto' 'sqlite'
    $storage=$client.GetStringAsync($sqliteBase+'/api/storage').GetAwaiter().GetResult() | ConvertFrom-Json
    if($storage.provider -ne 'sqlite'){throw 'Pilot did not switch to SQLite.'}
    $report.engineVersion=$storage.engineVersion
    $timer.Restart()
    Compare-Snapshot $baseline (Snapshot $sqliteBase)
    $report.sqliteReadMs=$timer.ElapsedMilliseconds
    $report.snapshotRoutes=$baseline.Count
    $script:server.process.Refresh()
    $report.peakWorkingSetBytes=$script:server.process.PeakWorkingSet64
    Stop-PilotServer
    $null=Offline 'backup' '--StorageAction backup'
    $export=Join-Path $run 'export'
    $null=Offline 'export' ('--StorageAction export-json --StorageDestination "'+$export+'"')
    Copy-PublicRuntime $rollbackRoot
    foreach($file in Get-PortableFiles $export){
        $target=Join-Path $rollbackRoot $file.Relative
        New-Item -ItemType Directory -Path (Split-Path -Parent $target) -Force | Out-Null
        Copy-Item -LiteralPath $file.Path -Destination $target
    }
    $rollbackBase=Start-PilotServer $rollbackRoot 'json' 'rollback'
    Compare-Snapshot $baseline (Snapshot $rollbackBase)
    $report.rollbackMatches=$true
    Stop-PilotServer
    foreach($path in $hashes.Keys){if((Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash -ne $hashes[$path]){throw 'An original source changed during the pilot; it was not reverted.'}}
    $report.sourceUnchanged=$true
    $report.passed=$true
} finally {
    Stop-PilotServer
    if($sourceLease){$sourceLease.Dispose()}
    $client.Dispose()
    Write-NewPortableText (Join-Path $run 'result.json') (($report | ConvertTo-Json -Depth 5)+"`n")
    Write-Host "Private pilot evidence: $run"
}
Write-Host ($report | ConvertTo-Json -Compress)
