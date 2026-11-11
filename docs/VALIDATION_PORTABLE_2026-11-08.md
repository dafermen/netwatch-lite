# Portable Candidate Validation - 2026-11-08

## Scope

Windows x64 self-contained candidate `0.8.0-rc.4`, first portable containing the
Reports redesign alongside the existing copy-only Command, Dashboard controls
and Configuration improvements. No application behavior/schema change is made
by this packaging task. Every delivery requires a versioned folder, compressed
ZIP and SHA-256 sidecar. ZIP is the primary file to copy/share.

Only allowlisted public sources, application/runtime binaries and generated
neutral loopback configuration may be included. Runtime inventory, history,
themes, exports, backups and external Excel/JSON inputs remain excluded.
Previous folders/ZIPs/checksums and legacy archives must remain unchanged.

## Validation Commands

Run from the repository. Publishing an existing version must fail; never use
this command to overwrite an artifact. Use a new version for subsequent builds.

```powershell
$env:DOTNET_ROOT_X64 = 'C:\Program Files\dotnet'
$env:DOTNET_ROOT = 'C:\Program Files\dotnet'
dotnet build netwatch.sln -c Release --no-restore
dotnet test netwatch.sln -c Release --no-build --no-restore --logger trx --collect "XPlat Code Coverage" --results-directory TestResults
npm run test:e2e
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\test-packaging.ps1
pwsh.exe -NoProfile -File .\scripts\test-packaging.ps1
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\publish-portable.ps1 -Version 0.8.0-rc.4
pwsh.exe -NoProfile -File .\scripts\test-portable.ps1 -ZipPath .\artifacts\packages\NetWatch-Lite-v0.8.0-rc.4-win-x64.zip
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\test-portable.ps1 -PortablePath .\artifacts\portable\NetWatch-Lite-v0.8.0-rc.4-win-x64
Get-FileHash .\artifacts\packages\NetWatch-Lite-v0.8.0-rc.4-win-x64.zip -Algorithm SHA256
git diff --check
```

## Evidence And Handoff

Fresh source validation passed before generation:

- Release solution build: zero warnings/errors.
- All 224 .NET tests passed (33 unit, 7 integration, 184 contract), with no skips
  and fresh TRX/coverage under TestResults. The three TRX filenames end in
  `2026-11-08_08_34_50`, `_08_34_51` and `_08_34_52`.
- All 102 Chromium cases passed (51 desktop, 51 mobile), with no failures,
  skips or retries. Full HTML evidence is under playwright-report/.
- All 49 packaging guards passed on Windows PowerShell 5.1 and PowerShell 7.
  Evidence: `artifacts/verification/guards-7905efcd9d624504b4444a662a3af55e/`
  and `guards-4783829abab6447ca5a1e04a5651c5d8/`.
- JavaScript/PowerShell syntax, 197 local Markdown links across 42 documents,
  Git whitespace and eight read-only service smoke routes passed.

Evidence stays ignored under TestResults, test-results, playwright-report and
artifacts/verification. Native startup used disposable copies and ephemeral
loopback ports, not the immutable version folder or the shared service port.
No real-device monitoring or operational data migration was requested/performed.

## Delivered Candidate And Artifact Results

- Folder: `artifacts/portable/NetWatch-Lite-v0.8.0-rc.4-win-x64/`.
- ZIP: `artifacts/packages/NetWatch-Lite-v0.8.0-rc.4-win-x64.zip`.
- Checksum: the adjacent `.zip.sha256` file.
- ZIP size: 46152417 bytes.
- SHA-256: `88238b3d2d89e72cfc302ffb398df10d37e6a0097b0832e6e973560f964ae84c`.

Generation passed on Windows PowerShell 5.1, including exact-ZIP startup before
promotion. The final ZIP was revalidated on PowerShell 7 and the final folder
was revalidated through a disposable copy on Windows PowerShell 5.1. Each test
passed 17 read-only HTTP paths, four deliberately damaged/private-file cases,
neutral first-run files and unchanged packaged/source bytes.

All 398 package files matched policy/manifests. All 61 public source files
matched their packaged bytes before the final repository documentation updates.
Reports tabs/exports, the public guide and copy-only Command markers were
present; fresh source regression above covers their workflows. No operational
inventory, history, local themes, private exports/backups or external inputs
were included. The checksum sidecar matched the final ZIP hash and filename.

Before/after hashes were identical for 1188 files across rc.1/rc.2/rc.3 folders,
their ZIP/checksum pairs and eight legacy releases (14 archive/checksum files).
Attempting the same version again was rejected before publishing, without any
change to rc.4's folder, ZIP or checksum. Evidence under artifacts/verification/:

- `d0caa10a96124b7187434de02dfe71d8/result.json`: build-time ZIP.
- `e6eb4a7cf8434bdabcfb31c0dbdd13b2/result.json`: final ZIP, PowerShell 7.
- `6ca762beedc8466ca45519beaf6e06bf/result.json`: final folder, PowerShell 5.1.
- `rc4-handoff-a2990d29121343e4a651ddd95195c221/result.json`: preservation/content/SHA audit.

The normal development service remains at http://localhost:5000/ (PID 29316 at
this checkpoint). Artifacts are ignored by Git; no remote publication occurred.
Final handoff rechecked package integrity/SHA, 196 local links across 42 Markdown
documents and nine read-only service routes (HTTP 200). No publisher lock,
staging entry or disposable test application remained.

The artifact's manifest records its build-time documentation. Final checksum
and handoff evidence added to repository documents after generation do not
retroactively change that immutable folder or ZIP.

## Limits

Local regression/package validation is not stable-deployment approval or clean
Windows-machine certification. All thirteen [deployment gates](DEPLOYMENT.md)
still need evidence or approved exceptions. The earlier Windows history-file
replacement incident remains open; this packaging task does not fix persistence
or claim full resilience. Bundled runtimes require rebuilds for updates and
existing frontend CDN dependencies do not certify offline operation.

Source metadata records sourceDirty: true for this untagged worktree. No GitHub
push, tag, release upload or operational deployment is implied. Keep the normal
development service available at http://localhost:5000/.
