#requires -Version 5.1
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.IO.Compression.FileSystem
Add-Type -AssemblyName System.IO.Compression

function Assert-PortableVersion([string]$Version) {
    if ($Version.Length -gt 64 -or $Version -notmatch '^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(?:-[0-9A-Za-z]+(?:[.-][0-9A-Za-z]+)*)?$') {
        throw 'Use a full version such as 0.8.0-rc.1 (at most 64 characters).'
    }
}

function Assert-PlainDirectoryChain([string]$Path) {
    $current = [IO.Path]::GetFullPath($Path)
    while ($current) {
        if (Test-Path -LiteralPath $current) {
            $item = Get-Item -LiteralPath $current -Force
            if (-not $item.PSIsContainer -or ($item.Attributes -band [IO.FileAttributes]::ReparsePoint)) {
                throw "Directory must be ordinary, not redirected: $current"
            }
        }
        $parent = [IO.Path]::GetDirectoryName($current)
        if ($parent -eq $current) { break }
        $current = $parent
    }
}

function Resolve-PortableChild([string]$Root, [string]$Relative) {
    if ([string]::IsNullOrWhiteSpace($Relative) -or $Relative -notmatch '^(?:\.playwright/)?[A-Za-z0-9][A-Za-z0-9._/-]*$' -or
        @($Relative.Split('/') | Where-Object { $_ -in @('', '.', '..') }).Count) { throw 'Unsafe relative package path.' }
    $rootPath = [IO.Path]::GetFullPath($Root).TrimEnd('\', '/')
    $path = [IO.Path]::GetFullPath((Join-Path $rootPath $Relative))
    if (-not $path.StartsWith($rootPath + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
        throw 'Package path escaped its root.'
    }
    return $path
}

function Assert-NewPortableDestination([string]$Root, [string]$Path) {
    $rootPath = [IO.Path]::GetFullPath($Root).TrimEnd('\', '/')
    $absolute = [IO.Path]::GetFullPath($Path)
    if (-not $absolute.StartsWith($rootPath + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
        throw 'Generated output must remain inside artifacts/.'
    }
    Assert-PlainDirectoryChain (Split-Path -Parent $absolute)
    if (Test-Path -LiteralPath $absolute) { throw "Output already exists. Use a new version: $absolute" }
}

function Remove-OwnedPortableStaging([string]$ArtifactsRoot, [string]$Path) {
    $parent = [IO.Path]::GetFullPath((Join-Path $ArtifactsRoot '.staging')).TrimEnd('\', '/')
    $resolved = (Resolve-Path -LiteralPath $Path).Path
    if ([IO.Path]::GetDirectoryName($resolved) -ne $parent -or [IO.Path]::GetFileName($resolved) -notmatch '^[0-9a-f]{32}$') {
        throw 'Refusing cleanup outside an owned staging GUID directory.'
    }
    Assert-PlainDirectoryChain $resolved
    $null = @(Get-PortableFiles $resolved)
    Remove-Item -LiteralPath $resolved -Recurse -Force
}

function Write-NewPortableText([string]$Path, [string]$Text) {
    $stream = [IO.File]::Open($Path, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::None)
    try {
        $bytes = (New-Object Text.UTF8Encoding($false)).GetBytes($Text)
        $stream.Write($bytes, 0, $bytes.Length)
    } finally { $stream.Dispose() }
}

function Get-PortableFiles([string]$Root) {
    Assert-PlainDirectoryChain $Root
    $rootPath = [IO.Path]::GetFullPath($Root).TrimEnd('\', '/')
    $queue = New-Object 'System.Collections.Generic.Queue[string]'
    $queue.Enqueue($rootPath)
    while ($queue.Count) {
        foreach ($item in Get-ChildItem -LiteralPath $queue.Dequeue() -Force) {
            if ($item.Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Redirected package entries are not allowed.' }
            if ($item.PSIsContainer) { $queue.Enqueue($item.FullName) }
            else { [pscustomobject]@{ Path = $item.FullName; Relative = $item.FullName.Substring($rootPath.Length + 1).Replace('\', '/'); Length = $item.Length } }
        }
    }
}

function Get-PortableSafeSettings {
    return [ordered]@{
        NetworkMonitor = [ordered]@{ DeviceFilePath = 'config.json'; ProfileFilePath = 'regions.json'; ThemeFilePath = 'themes.json';
            HistoryFilePath = 'monitor-history.json'; ErrorLogFilePath = 'app-errors.json'; IntegrationFilePath = 'integrations.json' }
        Storage = [ordered]@{ Provider = 'auto'; DatabasePath = 'netwatch.db' }
        Logging = @{ LogLevel = [ordered]@{ Default = 'Information'; 'Microsoft.AspNetCore' = 'Warning' } }
        AllowedHosts = 'localhost;127.0.0.1;[::1]'
    }
}

function Get-PortableSafeSample {
    return [ordered]@{
        settings = [ordered]@{ intervalSeconds = 60; timeoutMs = 1000; maxParallelChecks = 50; retryCount = 0; retryDelayMs = 250 }
        devices = @([ordered]@{ name = 'Localhost'; ip = '127.0.0.1'; hostname = 'localhost'; useHostnameForPing = $false;
            region = 'Sample Region'; supportGroup = 'Support Team A'; facility = 'Local'; category = 'Getting Started'; enabled = $true;
            checks = @(@{ type = 'ping' }) })
    }
}

function Assert-PortablePublicPath([string]$Path) {
    $rootDocuments = @('README.md', 'LICENSE', 'THIRD_PARTY_LICENSES.md', 'CHANGELOG.md', 'AGENTS.md', 'CURRENT_STATUS.md', 'CONTRIBUTING.md', 'SECURITY.md')
    $null = Resolve-PortableChild $PSScriptRoot $Path
    if ($Path -notin $rootDocuments -and $Path -notmatch '^(docs|wwwroot)/[A-Za-z0-9_/-][A-Za-z0-9._/-]*\.(md|html|css|js|png|svg|ico)$') {
        throw 'Public content policy cannot include data/configuration/exports or build artifacts.'
    }
}

function Get-PortablePublicFiles {
    $files = @((Get-Content -LiteralPath (Join-Path $PSScriptRoot 'portable-public-files.json') -Raw | ConvertFrom-Json).files)
    $seen = @{}
    foreach ($file in $files) {
        Assert-PortablePublicPath $file
        if ($seen.ContainsKey($file)) { throw 'Duplicate public asset.' }
        $seen[$file] = $true
    }
    return $files
}

function Get-PortableRuntimeFiles([string]$Root) {
    $names = @{}
    foreach ($name in @('NetWatch-Lite.exe', 'NetWatch-Lite.dll', 'NetWatch-Lite.deps.json', 'NetWatch-Lite.runtimeconfig.json', 'hostfxr.dll')) { $names[$name] = $true }
    $deps = Get-Content -LiteralPath (Join-Path $Root 'NetWatch-Lite.deps.json') -Raw | ConvertFrom-Json
    $target = $deps.targets.PSObject.Properties | Where-Object Name -eq $deps.runtimeTarget.name
    if (-not $target -or $deps.runtimeTarget.name -notlike '*win-x64') { throw 'Expected win-x64 runtime dependency metadata.' }
    foreach ($library in $target.Value.PSObject.Properties) {
        foreach ($kind in @('runtime', 'native')) {
            foreach ($asset in $library.Value.$kind.PSObject.Properties) {
                if ($asset.Name -eq '_._') { continue }
                $name = [IO.Path]::GetFileName($asset.Name.Replace('/', '\'))
                if ($name -notmatch '\.(dll|exe)$') { throw 'Unexpected runtime asset extension.' }
                $names[$name] = $true
            }
        }
    }
    return $names
}

function Get-PortableBrowserFiles([string]$Root) {
    $manifest = Get-Content -LiteralPath (Join-Path $PSScriptRoot 'portable-browser-files.json') -Raw | ConvertFrom-Json
    if ($manifest.package -ne 'Microsoft.Playwright' -or $manifest.version -ne '1.64.1') { throw 'Unexpected browser driver version.' }
    $seen = @{}
    foreach ($entry in $manifest.files) {
        if ($entry.path -notmatch '^\.playwright/(package/|node/win32_x64/node.exe$|node/LICENSE$)' -or $seen.ContainsKey($entry.path) -or $entry.sha256 -notmatch '^[0-9a-f]{64}$') { throw 'Invalid browser driver allowlist.' }
        $seen[$entry.path] = $true
        $path = Resolve-PortableChild $Root $entry.path
        Assert-PlainDirectoryChain (Split-Path -Parent $path)
        if (-not (Test-Path -LiteralPath $path -PathType Leaf) -or (Get-Item -LiteralPath $path).Attributes -band [IO.FileAttributes]::ReparsePoint -or
            (Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash.ToLowerInvariant() -ne $entry.sha256) { throw "Browser driver missing or changed: $($entry.path)" }
    }
    if ($seen.Count -ne 117) { throw 'Incomplete browser driver allowlist.' }
    return $seen
}

function Write-PortableManifest([string]$Root) {
    $files = @(Get-PortableFiles $Root | Sort-Object Relative | ForEach-Object {
        [ordered]@{ path = $_.Relative; length = $_.Length; sha256 = (Get-FileHash -LiteralPath $_.Path -Algorithm SHA256).Hash.ToLowerInvariant() }
    })
    Write-NewPortableText (Join-Path $Root 'portable-manifest.json') (([ordered]@{ schemaVersion = 1; files = $files } | ConvertTo-Json -Depth 8) + "`n")
}

function Assert-PortableRuntime($Runtime) {
    $frameworks = @($Runtime.runtimeOptions.includedFrameworks)
    if ($Runtime.runtimeOptions.tfm -ne 'net10.0' -or $frameworks.Count -ne 2 -or
        @($frameworks | Where-Object { $_.name -eq 'Microsoft.NETCore.App' -and $_.version -eq '10.0.15' }).Count -ne 1 -or
        @($frameworks | Where-Object { $_.name -eq 'Microsoft.AspNetCore.App' -and $_.version -eq '10.0.15' }).Count -ne 1 -or
        $Runtime.runtimeOptions.framework -or $Runtime.runtimeOptions.frameworks) {
        throw 'The .NET 10.0.15 and ASP.NET Core 10.0.15 self-contained runtimes must be included.'
    }
}

function Assert-PortablePackage([string]$Root) {
    $actualFiles = @(Get-PortableFiles $Root)
    $metadata = Get-Content -LiteralPath (Join-Path $Root 'portable-release.json') -Raw | ConvertFrom-Json
    Assert-PortableVersion $metadata.version
    if ($metadata.schemaVersion -ne 1 -or $metadata.runtime -ne 'win-x64' -or $metadata.selfContained -ne $true) { throw 'Invalid release metadata.' }
    $runtime = Get-Content -LiteralPath (Join-Path $Root 'NetWatch-Lite.runtimeconfig.json') -Raw | ConvertFrom-Json
    Assert-PortableRuntime $runtime
    $productVersion = [Diagnostics.FileVersionInfo]::GetVersionInfo((Join-Path $Root 'NetWatch-Lite.dll')).ProductVersion
    if (($productVersion -split '\+')[0] -ne $metadata.version) { throw 'Assembly and package versions differ.' }
    $allowed = Get-PortableRuntimeFiles $Root
    foreach ($name in (Get-PortableBrowserFiles $Root).Keys) { $allowed[$name] = $true }
    foreach ($name in Get-PortablePublicFiles) { $allowed[$name] = $true }
    foreach ($name in @('config.sample.json', 'appsettings.json', 'Start-NetWatch.cmd', 'START-HERE.txt', 'portable-release.json', 'portable-manifest.json',
        'licenses/dotnet-runtime/LICENSE.txt', 'licenses/dotnet-runtime/THIRD-PARTY-NOTICES.txt',
        'licenses/aspnetcore-runtime/LICENSE.txt', 'licenses/aspnetcore-runtime/THIRD-PARTY-NOTICES.txt',
        'licenses/sqlite/SQLitePCLRaw-LICENSE.txt', 'licenses/sqlite/Microsoft.Data.Sqlite-LICENSE.txt')) { $allowed[$name] = $true }
    foreach ($file in $actualFiles) { if (-not $allowed.ContainsKey($file.Relative)) { throw "Unapproved/private package file: $($file.Relative)" } }
    foreach ($name in $allowed.Keys) {
        if (-not (Test-Path -LiteralPath (Resolve-PortableChild $Root $name) -PathType Leaf)) { throw "Required package file missing: $name" }
    }
    $settings = Get-Content -LiteralPath (Join-Path $Root 'appsettings.json') -Raw | ConvertFrom-Json | ConvertTo-Json -Depth 15 -Compress
    $sample = Get-Content -LiteralPath (Join-Path $Root 'config.sample.json') -Raw | ConvertFrom-Json | ConvertTo-Json -Depth 15 -Compress
    if ($settings -ne (Get-PortableSafeSettings | ConvertTo-Json -Depth 15 -Compress) -or
        $sample -ne (Get-PortableSafeSample | ConvertTo-Json -Depth 15 -Compress)) { throw 'Only generated neutral settings and loopback sample data may be packaged.' }
    $manifest = Get-Content -LiteralPath (Join-Path $Root 'portable-manifest.json') -Raw | ConvertFrom-Json
    if ($manifest.schemaVersion -ne 1 -or @($manifest.files).Count -ne $actualFiles.Count - 1) { throw 'Invalid manifest file count.' }
    $seen = @{}
    foreach ($entry in $manifest.files) {
        if ($entry.path -eq 'portable-manifest.json' -or $seen.ContainsKey($entry.path)) { throw 'Duplicate/invalid manifest entry.' }
        $seen[$entry.path] = $true
        $path = Resolve-PortableChild $Root $entry.path
        if (-not (Test-Path -LiteralPath $path -PathType Leaf) -or (Get-Item -LiteralPath $path).Length -ne $entry.length -or
            (Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash.ToLowerInvariant() -ne $entry.sha256) { throw "Package hash mismatch: $($entry.path)" }
    }
    return $metadata
}

function Expand-PortableZip([string]$ZipPath, [string]$Destination) {
    Assert-PlainDirectoryChain (Split-Path -Parent $Destination)
    if (Test-Path -LiteralPath $Destination) { throw 'ZIP extraction requires a new directory.' }
    $zip = [IO.Compression.ZipFile]::OpenRead($ZipPath)
    try {
        if ($zip.Entries.Count -eq 0 -or $zip.Entries.Count -gt 3000) { throw 'Invalid ZIP entry count.' }
        $seen = @{}; [long]$size = 0
        foreach ($entry in $zip.Entries) {
            $name = $entry.FullName.Replace('\', '/').TrimEnd('/')
            $null = Resolve-PortableChild $Destination $name
            if ($seen.ContainsKey($name) -or (($entry.ExternalAttributes -shr 16) -band 0xF000) -eq 0xA000) { throw 'Duplicate/redirected ZIP entry.' }
            $seen[$name] = $true; $size += $entry.Length
            if ($size -gt 536870912) { throw 'ZIP exceeds the 512 MiB expanded limit.' }
        }
    } finally { $zip.Dispose() }
    [IO.Compression.ZipFile]::ExtractToDirectory($ZipPath, $Destination)
}
