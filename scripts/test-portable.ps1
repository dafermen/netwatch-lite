#requires -Version 5.1
[CmdletBinding(DefaultParameterSetName = 'Zip')]
param(
    [Parameter(Mandatory = $true, ParameterSetName = 'Zip')][string]$ZipPath,
    [Parameter(Mandatory = $true, ParameterSetName = 'Folder')][string]$PortablePath,
    [ValidateSet(1,2)][int]$ExpectedStorageSchema = 2
)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'portable-package.ps1')
Add-Type -AssemblyName System.Net.Http
$artifacts = Join-Path (Split-Path -Parent $PSScriptRoot) 'artifacts'
$run = Join-Path $artifacts ('verification\' + [Guid]::NewGuid().ToString('N'))
Assert-NewPortableDestination $artifacts $run
New-Item -ItemType Directory -Path $run -Force | Out-Null
$copy = Join-Path $run 'package'
$process = $null; $stdout = $null; $stderr = $null; $client = $null; $started = $false
$report = [ordered]@{ schemaVersion = 1; startedUtc = [DateTime]::UtcNow.ToString('o'); passed = $false; version = $null; routes = @(); negativeChecks = @(); error = $null }
try {
    if ($PSCmdlet.ParameterSetName -eq 'Zip') {
        $ZipPath = (Resolve-Path -LiteralPath $ZipPath).Path
        $originalHash = (Get-FileHash -LiteralPath $ZipPath -Algorithm SHA256).Hash
        Expand-PortableZip $ZipPath $copy
    } else {
        $PortablePath = (Resolve-Path -LiteralPath $PortablePath).Path
        $null = Assert-PortablePackage $PortablePath
        $originalHash = (Get-FileHash -LiteralPath (Join-Path $PortablePath 'portable-manifest.json') -Algorithm SHA256).Hash
        New-Item -ItemType Directory -Path $copy | Out-Null
        foreach ($file in Get-PortableFiles $PortablePath) {
            $target = Resolve-PortableChild $copy $file.Relative
            New-Item -ItemType Directory -Path (Split-Path -Parent $target) -Force | Out-Null
            Copy-Item -LiteralPath $file.Path -Destination $target
        }
    }
    $metadata = Assert-PortablePackage $copy
    $report.version = $metadata.version
    # Corrupt only this disposable extraction, then restore its bytes before startup.
    foreach ($relative in @('config.sample.json', 'NetWatch-Lite.dll', 'portable-release.json', '.playwright/package/cli.js', '.playwright/node/win32_x64/node.exe')) {
        $path = Resolve-PortableChild $copy $relative
        $bytes = [IO.File]::ReadAllBytes($path)
        try {
            [IO.File]::WriteAllText($path, 'synthetic corruption')
            $rejected = $false
            try { $null = Assert-PortablePackage $copy } catch { $rejected = $true }
            if (-not $rejected) { throw "Damaged package was accepted: $relative" }
            $report.negativeChecks += "damaged:$relative"
        } finally { [IO.File]::WriteAllBytes($path, $bytes) }
    }
    foreach ($privateName in @('configuration-versions/private.backup.json', 'config.json', 'netwatch.db', 'netwatch.db-wal', '.netwatch-runtime.lock', 'storage-policy.json', '.playwright/package/session.json')) {
    $privateProbe = Join-Path $copy $privateName
    try {
        Write-NewPortableText $privateProbe '{"privateTestSentinel":true}'
        $rejected = $false
        try { $null = Assert-PortablePackage $copy } catch { $rejected = $true }
        if (-not $rejected) { throw 'A runtime configuration was accepted in the package.' }
        $report.negativeChecks += "private-runtime:$privateName"
    } finally { if (Test-Path -LiteralPath $privateProbe) { [IO.File]::Delete($privateProbe) } }
    }
    $null = Assert-PortablePackage $copy
    $listener = New-Object Net.Sockets.TcpListener([Net.IPAddress]::Loopback, 0)
    $listener.Start()
    $port = $listener.LocalEndpoint.Port
    $listener.Stop()
    $info = New-Object Diagnostics.ProcessStartInfo
    $info.FileName = Join-Path $copy 'NetWatch-Lite.exe'
    $info.Arguments = "--urls http://127.0.0.1:$port --contentRoot `"$copy`""
    $info.WorkingDirectory = $run
    $info.UseShellExecute = $false; $info.CreateNoWindow = $true; $info.WindowStyle = 'Hidden'
    $info.RedirectStandardOutput = $true; $info.RedirectStandardError = $true
    # No inherited repository paths, hosting-startup injection, runtime settings or monitoring configuration.
    $info.EnvironmentVariables.Clear()
    foreach ($key in @('SystemRoot', 'WINDIR', 'PATH', 'TEMP', 'TMP', 'SystemDrive', 'COMSPEC')) {
        $value = [Environment]::GetEnvironmentVariable($key)
        if ($value) { $info.EnvironmentVariables[$key] = $value }
    }
    $info.EnvironmentVariables['ASPNETCORE_ENVIRONMENT'] = 'Production'
    $info.EnvironmentVariables['DOTNET_ENVIRONMENT'] = 'Production'
    $process = New-Object Diagnostics.Process
    $process.StartInfo = $info
    $null = $process.Start()
    $started = $true
    $stdout = $process.StandardOutput.ReadToEndAsync(); $stderr = $process.StandardError.ReadToEndAsync()
    $handler = New-Object Net.Http.HttpClientHandler
    $handler.UseProxy = $false
    $client = New-Object Net.Http.HttpClient($handler)
    $client.Timeout = [TimeSpan]::FromSeconds(2)
    $base = "http://127.0.0.1:$port"
    $watch = [Diagnostics.Stopwatch]::StartNew()
    $ready = $false
    while ($watch.Elapsed.TotalSeconds -lt 30) {
        if ($process.HasExited) { throw 'Packaged executable exited before becoming ready.' }
        try {
            $response = $client.GetAsync("$base/").GetAwaiter().GetResult()
            $ready = [int]$response.StatusCode -eq 200
            $response.Dispose()
            if ($ready) { break }
        } catch { }
        Start-Sleep -Milliseconds 100
    }
    if (-not $ready) { throw 'Packaged executable did not become ready within 30 seconds.' }
    $routes = @('/', '/config', '/regions', '/themes', '/device-types', '/peripherals', '/workstations', '/reports', '/integrations', '/diagnostics', '/docs/',
        '/i18n.js', '/i18n-es.js', '/inventory-filters.js', '/monitoring-ui.js', '/http-diagnostics.js', '/diagnostics.js', '/browser-checks.js', '/docs/BROWSER_CHECKS.md', '/docs/VALIDATION_BROWSER_2026-11-12.md', '/api/monitor/inventory', '/api/diagnostics',
        '/management.js', '/docs/PORTABLE.md', '/docs/STORAGE.md', '/docs/RUNTIME.md', '/docs/adr/0008-dotnet10-lts.md', '/docs/VALIDATION_DOTNET10_2026-11-12.md',
        '/api/storage', '/api/config', '/api/regions', '/api/themes', '/api/history', '/api/integrations')
    if ($ExpectedStorageSchema -eq 2) { $routes += @('/reports-sql.js','/storage.js','/api/reports/query','/api/inventory/query','/api/storage/policy','/api/storage/audit','/api/storage/backups') }
    $hasRecovery = Test-Path -LiteralPath (Join-Path $copy 'wwwroot/configuration-versions.js')
    if ($hasRecovery) { $routes += @('/build-info.js','/configuration-versions.js','/api/build','/api/config/versions','/docs/CONFIGURATION_RECOVERY.md','/docs/VALIDATION_RECOVERY_2026-11-13.md') }
    foreach ($route in $routes) {
        $response = $client.GetAsync($base + $route).GetAwaiter().GetResult()
        try {
            if ([int]$response.StatusCode -ne 200) { throw "Package route failed: $route" }
            if ($route -eq '/api/config') {
                $config = $response.Content.ReadAsStringAsync().GetAwaiter().GetResult() | ConvertFrom-Json
                if (@($config.devices).Count -ne 1 -or $config.devices[0].ip -ne '127.0.0.1' -or $config.devices[0].name -ne 'Localhost') { throw 'First-run configuration is not the neutral loopback sample.' }
            }
            if ($route -eq '/api/storage') {
                $storage = $response.Content.ReadAsStringAsync().GetAwaiter().GetResult() | ConvertFrom-Json
                if ($storage.provider -ne 'sqlite' -or $storage.schemaVersion -ne $ExpectedStorageSchema) { throw "Clean first run did not use SQLite schema $ExpectedStorageSchema." }
            }
            if ($route -eq '/api/build') {
                $build = $response.Content.ReadAsStringAsync().GetAwaiter().GetResult() | ConvertFrom-Json
                if ($build.version -ne $metadata.version -or $build.runtime -ne '.NET 10.0.15' -or $build.provider -ne 'sqlite' -or $build.schemaVersion -ne 2) { throw 'Running package build/runtime/storage does not match its release metadata.' }
                if (-not $response.Headers.CacheControl.NoStore) { throw 'Build metadata must not be cached.' }
            }
            $report.routes += [ordered]@{ path = $route; status = 200 }
        } finally { $response.Dispose() }
    }
    if ($hasRecovery) {
        $before = $client.GetStringAsync("$base/api/config").GetAwaiter().GetResult()
        $state = $client.GetStringAsync("$base/api/config/versions").GetAwaiter().GetResult() | ConvertFrom-Json
        if (@($state.versions).Count -ne 0) { throw 'Neutral package unexpectedly has recovery payloads.' }
        $json = '{"devices":[{"name":"Portable recovery synthetic","ip":"127.0.0.1","checks":[{"type":"http","url":"http://127.0.0.1:1/health","followRedirects":true}]}]}'
        function Send-RecoveryUpload([string]$Route, $Guard) {
            $request = New-Object Net.Http.HttpRequestMessage([Net.Http.HttpMethod]::Post, ($base + $Route))
            try {
                $form = New-Object Net.Http.MultipartFormDataContent
                $form.Add((New-Object Net.Http.StringContent($json, [Text.Encoding]::UTF8, 'application/json')), 'configFile', 'synthetic.json')
                $request.Content = $form
                $null = $request.Headers.TryAddWithoutValidation('X-NetWatch-Profile', [string]$Guard.profileId)
                if ($Guard.revision) { $null = $request.Headers.TryAddWithoutValidation('X-NetWatch-Revision', [string]$Guard.revision) }
                if ($Guard.sha256) { $null = $request.Headers.TryAddWithoutValidation('X-NetWatch-Import-SHA256', [string]$Guard.sha256) }
                return $client.SendAsync($request).GetAwaiter().GetResult()
            } finally { $request.Dispose() }
        }
        $preview = Send-RecoveryUpload '/api/config/import/preview' $state
        try { if (-not $preview.IsSuccessStatusCode) { throw 'Native import preview failed.' }; $guard = $preview.Content.ReadAsStringAsync().GetAwaiter().GetResult() | ConvertFrom-Json } finally { $preview.Dispose() }
        if ($client.GetStringAsync("$base/api/config").GetAwaiter().GetResult() -ne $before) { throw 'Native import preview mutated configuration.' }
        $commit = Send-RecoveryUpload '/api/config/import/commit' $guard
        try { if (-not $commit.IsSuccessStatusCode) { throw 'Native reviewed import failed.' } } finally { $commit.Dispose() }
        $repeat = Send-RecoveryUpload '/api/config/import/commit' $guard
        try { if ([int]$repeat.StatusCode -ne 409) { throw 'Native stale import was not rejected.' } } finally { $repeat.Dispose() }
        $state = $client.GetStringAsync("$base/api/config/versions").GetAwaiter().GetResult() | ConvertFrom-Json
        if (@($state.versions).Count -ne 1) { throw 'Native import did not preserve the previous configuration.' }
        $restoreGuard = @{ profileId=$state.profileId; revision=$state.revision; sha256=$state.versions[0].sha256 } | ConvertTo-Json
        $content = New-Object Net.Http.StringContent($restoreGuard, [Text.Encoding]::UTF8, 'application/json')
        try {
            $restored = $client.PostAsync("$base/api/config/versions/$($state.versions[0].id)/restore", $content).GetAwaiter().GetResult()
            try { if (-not $restored.IsSuccessStatusCode) { throw 'Native configuration recovery failed.' } } finally { $restored.Dispose() }
        } finally { $content.Dispose() }
        if ($client.GetStringAsync("$base/api/config").GetAwaiter().GetResult() -ne $before) { throw 'Native recovery changed the original configuration.' }
        $report.recoveryChecks = 'Preview is read-only; reviewed import, stale rejection and profile recovery passed.'
    }
    if (-not (Test-Path -LiteralPath (Join-Path $copy 'netwatch.db') -PathType Leaf)) { throw 'SQLite first-run database missing.' }
    foreach ($file in @('regions.json', 'themes.json', 'integrations.json', 'monitor-history.json', 'storage-policy.json')) {
        if (Test-Path -LiteralPath (Join-Path $copy $file)) { throw "SQLite first run unexpectedly wrote runtime JSON: $file" }
    }
    if (-not (Test-Path -LiteralPath (Join-Path $copy 'regions') -PathType Container)) { throw 'First-run profile directory missing.' }
    $process.Kill(); $process.WaitForExit()
    $manifest = Get-Content -LiteralPath (Join-Path $copy 'portable-manifest.json') -Raw | ConvertFrom-Json
    foreach ($entry in $manifest.files) {
        if ((Get-FileHash -LiteralPath (Resolve-PortableChild $copy $entry.path) -Algorithm SHA256).Hash.ToLowerInvariant() -ne $entry.sha256) { throw 'Startup modified an immutable package file.' }
    }
    if ($ZipPath) {
        if ((Get-FileHash -LiteralPath $ZipPath -Algorithm SHA256).Hash -ne $originalHash) { throw 'Original ZIP was modified.' }
    } else {
        $null = Assert-PortablePackage $PortablePath
        if ((Get-FileHash -LiteralPath (Join-Path $PortablePath 'portable-manifest.json') -Algorithm SHA256).Hash -ne $originalHash) { throw 'Original portable folder changed.' }
    }
    $report.passed = $true
} catch {
    $report.error = $_.Exception.Message
    throw
} finally {
    if ($process) {
        if ($started -and -not $process.HasExited) { $process.Kill(); $process.WaitForExit() }
        if ($stdout) { Write-NewPortableText (Join-Path $run 'stdout.log') $stdout.GetAwaiter().GetResult() }
        if ($stderr) { Write-NewPortableText (Join-Path $run 'stderr.log') $stderr.GetAwaiter().GetResult() }
        $process.Dispose()
    }
    if ($client) { $client.Dispose() }
    $report.finishedUtc = [DateTime]::UtcNow.ToString('o')
    Write-NewPortableText (Join-Path $run 'result.json') (($report | ConvertTo-Json -Depth 8) + "`n")
    Write-Host "Package evidence: $run"
}
Write-Host "PASS: $($report.routes.Count) HTTP routes, $($report.negativeChecks.Count) negative checks, SQLite first run and unchanged source artifact."
