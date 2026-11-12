#requires -Version 5.1
param([Parameter(Mandatory = $true)][string]$Version)
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'portable-package.ps1')
Assert-PortableVersion $Version
$repoRoot = Split-Path -Parent $PSScriptRoot
$artifacts = Join-Path $repoRoot 'artifacts'
$name = "NetWatch-Lite-v$Version-win-x64"
$portable = Join-Path $artifacts "portable\$name"
$zipPath = Join-Path $artifacts "packages\$name.zip"
$stage = Join-Path $artifacts ('.staging\' + [Guid]::NewGuid().ToString('N'))
foreach ($path in @($portable, $zipPath, "$zipPath.sha256", $stage)) { Assert-NewPortableDestination $artifacts $path }
Assert-PlainDirectoryChain $artifacts
New-Item -ItemType Directory -Path $artifacts -Force | Out-Null
$lockPath = Join-Path $artifacts '.publish.lock'
$lock = $null
try {
    # CreateNew also serializes different versions: parallel MSBuild/promotion cannot race.
    $lock = [IO.File]::Open($lockPath, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::None)
    foreach ($path in @($portable, $zipPath, "$zipPath.sha256", $stage)) { Assert-NewPortableDestination $artifacts $path }
    New-Item -ItemType Directory -Path $stage | Out-Null
    $raw = Join-Path $stage 'publish'
    $package = Join-Path $stage 'package'
    $build = Join-Path $stage 'build'
    $project = Join-Path $repoRoot 'NetWatch.csproj'
    Push-Location $repoRoot
    try {
        dotnet publish $project -c Release -r win-x64 --self-contained true --artifacts-path $build -o $raw `
            "-p:Version=$Version" -p:NetWatchPortable=true -p:PublishSingleFile=false -p:PublishTrimmed=false `
            -p:PublishReadyToRun=false -p:DebugType=None -p:GenerateDocumentationFile=false
        if ($LASTEXITCODE -ne 0) { throw 'dotnet publish failed. No version was promoted.' }
    } finally { Pop-Location }
    New-Item -ItemType Directory -Path $package | Out-Null
    $runtimeFiles = Get-PortableRuntimeFiles $raw
    foreach ($relative in $runtimeFiles.Keys) {
        Copy-Item -LiteralPath (Resolve-PortableChild $raw $relative) -Destination (Resolve-PortableChild $package $relative)
    }
    foreach ($relative in Get-PortablePublicFiles) {
        $source = Resolve-PortableChild $repoRoot $relative
        Assert-PlainDirectoryChain (Split-Path -Parent $source)
        if ((Get-Item -LiteralPath $source).Attributes -band [IO.FileAttributes]::ReparsePoint) { throw 'Redirected public source file.' }
        $destination = Resolve-PortableChild $package $relative
        New-Item -ItemType Directory -Path (Split-Path -Parent $destination) -Force | Out-Null
        Copy-Item -LiteralPath $source -Destination $destination
    }
    Write-NewPortableText (Join-Path $package 'appsettings.json') ((Get-PortableSafeSettings | ConvertTo-Json -Depth 15) + "`n")
    Write-NewPortableText (Join-Path $package 'config.sample.json') ((Get-PortableSafeSample | ConvertTo-Json -Depth 15) + "`n")
    $runtime = Get-Content -LiteralPath (Join-Path $raw 'NetWatch-Lite.runtimeconfig.json') -Raw | ConvertFrom-Json
    $assetsFiles = @(Get-ChildItem -LiteralPath $build -Recurse -Filter project.assets.json -File)
    if ($assetsFiles.Count -ne 1) { throw 'Unable to locate the isolated restore metadata.' }
    $assets = Get-Content -LiteralPath $assetsFiles[0].FullName -Raw | ConvertFrom-Json
    foreach ($framework in $runtime.runtimeOptions.includedFrameworks) {
        $id = if ($framework.name -eq 'Microsoft.NETCore.App') { 'dotnet-runtime' } else { 'aspnetcore-runtime' }
        $packageName = $framework.name.ToLowerInvariant() + '.runtime.win-x64'
        foreach ($notice in @('LICENSE.txt', 'THIRD-PARTY-NOTICES.txt')) {
            $source = $null
            foreach ($folder in $assets.packageFolders.PSObject.Properties.Name) {
                $candidate = Join-Path $folder "$packageName\$($framework.version)\$notice"
                if (Test-Path -LiteralPath $candidate -PathType Leaf) { $source = $candidate; break }
                if ($id -eq 'aspnetcore-runtime' -and $notice -eq 'LICENSE.txt') {
                    $nuspec = Join-Path $folder "$packageName\$($framework.version)\$packageName.nuspec"
                    if (Test-Path -LiteralPath $nuspec -PathType Leaf) {
                        [xml]$spec = Get-Content -LiteralPath $nuspec -Raw
                        if ($spec.package.metadata.license.type -eq 'expression' -and $spec.package.metadata.license.InnerText -eq 'MIT') {
                            $source = Join-Path $PSScriptRoot 'notices\aspnetcore-LICENSE.txt'
                            break
                        }
                    }
                }
            }
            if (-not $source) { throw "Runtime license/notice missing for $packageName." }
            $target = Join-Path $package "licenses\$id"
            New-Item -ItemType Directory -Path $target -Force | Out-Null
            Copy-Item -LiteralPath $source -Destination (Join-Path $target $notice)
        }
    }
    $sqliteNotices = Join-Path $package 'licenses/sqlite'
    New-Item -ItemType Directory -Path $sqliteNotices -Force | Out-Null
    Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'notices/sqlitepclraw-LICENSE.txt') -Destination (Join-Path $sqliteNotices 'SQLitePCLRaw-LICENSE.txt')
    Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'notices/microsoft-data-sqlite-LICENSE.txt') -Destination (Join-Path $sqliteNotices 'Microsoft.Data.Sqlite-LICENSE.txt')
    $commit = $null; $dirty = $null
    if (Get-Command git -ErrorAction SilentlyContinue) {
        $commit = git -C $repoRoot rev-parse HEAD 2>$null
        if ($LASTEXITCODE -eq 0) { $dirty = [bool]@(git -C $repoRoot status --porcelain 2>$null).Count }
        else { $commit = $null }
    }
    $metadata = [ordered]@{ schemaVersion = 1; version = $Version; runtime = 'win-x64'; selfContained = $true;
        builtUtc = [DateTime]::UtcNow.ToString('o'); sourceCommit = $commit; sourceDirty = $dirty;
        releaseApproval = 'Not implied. Complete the documented deployment gates.' }
    Write-NewPortableText (Join-Path $package 'portable-release.json') (($metadata | ConvertTo-Json -Depth 5) + "`n")
    Write-NewPortableText (Join-Path $package 'Start-NetWatch.cmd') "@echo off`r`nsetlocal`r`ncd /d `"%~dp0`"`r`n`"%~dp0NetWatch-Lite.exe`" --urls http://localhost:5000 --contentRoot `"%~dp0.`" %*`r`n"
    Write-NewPortableText (Join-Path $package 'START-HERE.txt') (@(
        "NetWatch Lite $Version - Windows x64 evaluation package. .NET 10 LTS and ASP.NET Core are included.",
        'Extract the COMPLETE ZIP into a new, ordinary local folder. Keep all DLLs and assets together.',
        'Run Start-NetWatch.cmd and open http://localhost:5000. Stop another listener first; never kill an unknown process.',
        'The launcher sets the content root; direct EXE use from another folder requires --contentRoot <package-folder>.',
        'Runtime files are created only when the application runs. The ZIP contains only neutral loopback sample data.',
        'Clean installations use SQLite (netwatch.db). Existing JSON requires an explicit offline migration; read docs/STORAGE.md.',
        'Do not operate inside artifacts/portable/: keep that historical package unchanged.',
        'Back up/export old data and migrate it privately into a NEW deployment folder. Never overwrite an installation.',
        'This app has no authentication. Do not expose it to untrusted networks.',
        'Read docs/PORTABLE.md and docs/DEPLOYMENT.md. Passing package tests is not stable-release approval.'
    ) -join "`r`n")
    Write-PortableManifest $package
    $null = Assert-PortablePackage $package
    $candidateZip = Join-Path $stage 'candidate.zip'
    [IO.Compression.ZipFile]::CreateFromDirectory($package, $candidateZip, [IO.Compression.CompressionLevel]::Optimal, $false)
    & (Join-Path $PSScriptRoot 'test-portable.ps1') -ZipPath $candidateZip
    $sha = (Get-FileHash -LiteralPath $candidateZip -Algorithm SHA256).Hash.ToLowerInvariant()
    $candidateSha = Join-Path $stage 'candidate.zip.sha256'
    Write-NewPortableText $candidateSha "$sha  $name.zip`n"
    foreach ($path in @($portable, $zipPath, "$zipPath.sha256")) { Assert-NewPortableDestination $artifacts $path }
    New-Item -ItemType Directory -Path (Split-Path -Parent $portable), (Split-Path -Parent $zipPath) -Force | Out-Null
    # All checks precede promotion; Move never replaces an existing file/directory.
    [IO.Directory]::Move($package, $portable)
    [IO.File]::Move($candidateZip, $zipPath)
    [IO.File]::Move($candidateSha, "$zipPath.sha256")
    try { Remove-OwnedPortableStaging $artifacts $stage }
    catch { Write-Warning "Package is verified; staging cleanup was refused/failed. Inspect $stage manually." }
    Write-Host "Portable folder: $portable"
    Write-Host "Portable ZIP: $zipPath"
    Write-Host "SHA-256: $zipPath.sha256"
    Write-Host 'Package verified. Historical versions were not overwritten; deployment approval is separate.'
} finally {
    if ($lock) { $lock.Dispose(); [IO.File]::Delete($lockPath) }
}
