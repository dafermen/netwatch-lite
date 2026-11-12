#requires -Version 5.1
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'portable-package.ps1')
$artifacts = Join-Path (Split-Path -Parent $PSScriptRoot) 'artifacts'
$root = Join-Path $artifacts ('verification\guards-' + [Guid]::NewGuid().ToString('N'))
Assert-NewPortableDestination $artifacts $root
New-Item -ItemType Directory -Path $root -Force | Out-Null
$script:passed = 0
function Assert-Rejected([scriptblock]$Action) {
    $rejected = $false
    try { & $Action } catch { $rejected = $true }
    if (-not $rejected) { throw 'Expected rejection did not occur.' }
    $script:passed++
}
$runtime = @{ runtimeOptions = @{ tfm = 'net10.0'; includedFrameworks = @(
    @{ name = 'Microsoft.NETCore.App'; version = '10.0.15' },
    @{ name = 'Microsoft.AspNetCore.App'; version = '10.0.15' }
) } }
Assert-PortableRuntime $runtime; $script:passed++
foreach ($tfm in @('net8.0', 'net9.0', 'net11.0', '')) {
    $bad = $runtime | ConvertTo-Json -Depth 6 | ConvertFrom-Json
    $bad.runtimeOptions.tfm = $tfm
    Assert-Rejected { Assert-PortableRuntime $bad }
}
foreach ($patch in @('8.0.34', '10.0.14', '11.0.0', '')) {
    $bad = $runtime | ConvertTo-Json -Depth 6 | ConvertFrom-Json
    $bad.runtimeOptions.includedFrameworks[0].version = $patch
    Assert-Rejected { Assert-PortableRuntime $bad }
}
$bad = @{ runtimeOptions = @{ tfm = 'net10.0'; includedFrameworks = @($runtime.runtimeOptions.includedFrameworks[0], $runtime.runtimeOptions.includedFrameworks[0]) } }
Assert-Rejected { Assert-PortableRuntime $bad }
foreach ($key in @('framework', 'frameworks')) {
    $bad = @{ runtimeOptions = @{ tfm = 'net10.0'; includedFrameworks = $runtime.runtimeOptions.includedFrameworks } }
    $bad.runtimeOptions[$key] = @{ name = 'Microsoft.NETCore.App'; version = '10.0.15' }
    Assert-Rejected { Assert-PortableRuntime $bad }
}
foreach ($version in @('0.8.0', '0.8.0-rc.1', '1.2.3-alpha.20261107')) { Assert-PortableVersion $version; $script:passed++ }
foreach ($version in @('', '1.2', '../1.2.3', '01.2.3', '1.2.3;evil', '1.2.3/evil', ('1.2.3-' + ('a' * 65)))) {
    Assert-Rejected { Assert-PortableVersion $version }
}
foreach ($relative in @('../outside.json', '/absolute.json', 'C:/outside.json', 'a/../../outside', 'a//b', 'a/./b', 'a\..\b', 'a:file')) {
    Assert-Rejected { $null = Resolve-PortableChild $root $relative }
}
foreach ($path in @('Data/config.json', 'config.json', 'netwatch.db', 'netwatch.db-wal', '.netwatch-runtime.lock', 'storage-backups/inventory.json', 'storage-exports/inventory.json', 'appsettings.json', 'wwwroot/private.json', 'docs/inventory.xlsx', 'docs/export.csv', 'releases/previous.zip', '.private/notes.md')) {
    Assert-Rejected { Assert-PortablePublicPath $path }
}
foreach ($path in Get-PortablePublicFiles) { Assert-PortablePublicPath $path }; $script:passed++
foreach ($path in @('storage-policy.json','Data/storage-policy.json','storage-restores/recovered/netwatch.db','storage-backups/managed/auto.db', '.playwright/package/private.json', '.playwright/profile/Cookies', 'playwright/.auth/session.json')) {
    Assert-Rejected { Assert-PortablePublicPath $path }
}
$new = Resolve-PortableChild $root 'nested/new.json'
if (-not $new.StartsWith($root)) { throw 'Child path escaped.' }; $script:passed++
Assert-Rejected { Assert-NewPortableDestination $root ([IO.Path]::GetFullPath((Join-Path $root '../outside'))) }
foreach ($suffix in @('portable', 'package.zip', 'package.zip.sha256')) {
    $path = Join-Path $root $suffix
    Write-NewPortableText $path 'retained previous version'
    $before = (Get-FileHash -LiteralPath $path).Hash
    Assert-Rejected { Assert-NewPortableDestination $root $path }
    Assert-Rejected { Write-NewPortableText $path 'must not replace' }
    if ((Get-FileHash -LiteralPath $path).Hash -ne $before) { throw 'Existing version was overwritten.' }
}
$folder = Join-Path $root 'retained-folder'
New-Item -ItemType Directory -Path $folder | Out-Null
Write-NewPortableText (Join-Path $folder 'sentinel.txt') 'retained folder'
Assert-Rejected { Assert-NewPortableDestination $root $folder }
if ([IO.File]::ReadAllText((Join-Path $folder 'sentinel.txt')) -ne 'retained folder') { throw 'Existing portable folder changed.' }
foreach ($path in @($root, $folder, (Split-Path -Parent $root))) {
    Assert-Rejected { Remove-OwnedPortableStaging $root $path }
}
$ownStage = Join-Path $root ('.staging\' + [Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $ownStage -Force | Out-Null
Write-NewPortableText (Join-Path $ownStage 'generated.txt') 'owned temporary build'
Remove-OwnedPortableStaging $root $ownStage
if (Test-Path -LiteralPath $ownStage) { throw 'Owned staging cleanup failed.' }; $script:passed++
$lockPath = Join-Path $root '.publish.lock'
$lock = [IO.File]::Open($lockPath, [IO.FileMode]::CreateNew, [IO.FileAccess]::Write, [IO.FileShare]::None)
try { Assert-Rejected { $second = [IO.File]::Open($lockPath, [IO.FileMode]::CreateNew); $second.Dispose() } }
finally { $lock.Dispose() }
foreach ($entryName in @('../escape.txt', '/absolute.txt', 'C:/absolute.txt')) {
    $zipPath = Join-Path $root ([Guid]::NewGuid().ToString('N') + '.zip')
    $zip = [IO.Compression.ZipFile]::Open($zipPath, [IO.Compression.ZipArchiveMode]::Create)
    try { $null = $zip.CreateEntry($entryName) } finally { $zip.Dispose() }
    Assert-Rejected { Expand-PortableZip $zipPath (Join-Path $root ([Guid]::NewGuid().ToString('N'))) }
}
foreach ($kind in @('duplicate', 'case-duplicate', 'symlink')) {
    $zipPath = Join-Path $root ([Guid]::NewGuid().ToString('N') + '.zip')
    $zip = [IO.Compression.ZipFile]::Open($zipPath, [IO.Compression.ZipArchiveMode]::Create)
    try {
        $entry = $zip.CreateEntry('sample.txt')
        if ($kind -eq 'symlink') { $entry.ExternalAttributes = (0xA1FF -shl 16) }
        else { $null = $zip.CreateEntry($(if ($kind -eq 'duplicate') { 'sample.txt' } else { 'SAMPLE.TXT' })) }
    } finally { $zip.Dispose() }
    Assert-Rejected { Expand-PortableZip $zipPath (Join-Path $root ([Guid]::NewGuid().ToString('N'))) }
}
$sample = Get-PortableSafeSample
if ($sample.devices.Count -ne 1 -or $sample.devices[0].ip -ne '127.0.0.1') { throw 'Unsafe generated sample.' }; $script:passed++
$source = [IO.File]::ReadAllText((Join-Path $PSScriptRoot 'publish-portable.ps1'))
if ($source -notmatch 'FileMode\]::CreateNew' -or $source -notmatch 'test-portable.ps1' -or $source -match 'Remove-Item') { throw 'Publisher lost its fail-closed/history contract.' }; $script:passed++
$report = [ordered]@{ passed = $script:passed; failed = 0; dateUtc = [DateTime]::UtcNow.ToString('o') }
Write-NewPortableText (Join-Path $root 'result.json') ($report | ConvertTo-Json)
Write-Host "PASS: $script:passed packaging guard checks. Evidence: $root"
