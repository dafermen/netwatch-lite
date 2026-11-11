# Portable Generator Validation - 2026-11-07

## Scope

Versioned Windows x64 self-contained folders, ZIPs and SHA-256 sidecars;
non-overwriting promotion, explicit public file selection and isolated startup.
No runtime inventory migration, application API change or remote publication.
External Excel/JSON preparation in C:\Tmp is separate and is not packaged.

## Commands

The rc.3 publishing command was run once. Replaying it must reject the existing
version; use a new version for another build, never overwrite these outputs.

```powershell
$env:DOTNET_ROOT_X64 = 'C:\Program Files\dotnet'
$env:DOTNET_ROOT = 'C:\Program Files\dotnet'
dotnet build netwatch.sln -c Release --no-restore
dotnet test netwatch.sln -c Release --no-build --collect "XPlat Code Coverage" --results-directory TestResults
npm run test:e2e
.\scripts\test-packaging.ps1
.\scripts\publish-portable.ps1 -Version 0.8.0-rc.3
.\scripts\test-portable.ps1 -ZipPath .\artifacts\packages\NetWatch-Lite-v0.8.0-rc.3-win-x64.zip
.\scripts\test-portable.ps1 -PortablePath .\artifacts\portable\NetWatch-Lite-v0.8.0-rc.3-win-x64
git diff --check
```

Evidence is ignored under TestResults, test-results, playwright-report and
artifacts/verification. Do not publish working inventories or private exports.

## Checks

Guard cases cover full/prerelease versions, invalid/path-like/oversized version
strings, relative/absolute path escape, existing folder/ZIP/checksum protection,
CreateNew write/lock exclusion, ZIP traversal and neutral loopback defaults.

Artifact tests verify all declared public/runtime files, correct binary/version/
framework metadata, neutral generated JSON and each manifest hash. They reject
damaged copies of sample/binary/release metadata and injected runtime config,
then restore bytes before starting the native EXE from a different directory.
Seventeen application/docs/API paths must return HTTP 200. Generated local
profiles/settings remain inside the disposable copy; source artifact and
immutable hashes must stay unchanged. No monitor run is invoked.

Final outcomes, delivered version, evidence and shared-service PID are recorded
in [CURRENT_STATUS.md](../CURRENT_STATUS.md) after the complete validation run.
The manifest inside an immutable artifact reflects its build-time sources;
later handoff documentation/evidence does not retroactively modify that package.

## Candidate 0.8.0-rc.3

This candidate packages the latest dashboard inventory/search and device actions,
copy-only Command and neutral Configuration layout. Fresh regression identified
and deterministically reproduced a stuck device deletion dialog during its
opening transition. The shared transition-safe controller now handles its close
and focus; confirmation/cancellation are covered on desktop/mobile. The generator
is unchanged. All historical outputs are preserved;
only public allowlisted assets and generated neutral data may enter the package.

The Release solution build passed without warnings/errors; Windows PowerShell
5.1 and PowerShell 7 each passed all 49 packaging guards. Fresh .NET regression
passed all 224 cases with TRX and coverage evidence. An initial browser run had
79/80 passes; its failure and the deterministic pre-fix reproduction are retained
under artifacts/verification/rc3-e2e-initial-2b26c9a819ad4048addfe870d03038ff.
The targeted post-fix regression passed on both viewports, followed by the full
82-case browser regression (41 desktop, 41 mobile), without failures/skips or
automatic retries. Exact-artifact validation, checksum and historical-file
preservation checks also passed. Delivered artifacts:

- `artifacts/portable/NetWatch-Lite-v0.8.0-rc.3-win-x64/`
- `artifacts/packages/NetWatch-Lite-v0.8.0-rc.3-win-x64.zip`
- `artifacts/packages/NetWatch-Lite-v0.8.0-rc.3-win-x64.zip.sha256`
- ZIP size: 46133487 bytes.
- SHA-256: `3d73a118bb4c88fd78aee7d74b62aa9f3535e331216bae6cbd84f567f002c7cb`.

Windows PowerShell 5.1 generated and validated the exact ZIP; PowerShell 7
revalidated that final ZIP, and Windows PowerShell 5.1 revalidated the final
folder through a copy. Each native startup passed 17 HTTP routes, four negative
checks, neutral first-run files and immutable-byte checks without monitoring
execution. All 396 files matched policy/manifests, and all 59 public files
matched source bytes at build time. No operational runtime data was included.

The handoff audit compared before/after hashes for 792 rc.1/rc.2 folder files,
their ZIP/checksum pairs and eight legacy archives: all unchanged. Attempting
to generate rc.3 again was rejected before publishing; its outputs stayed intact.
Evidence under `artifacts/verification/`:

- `3a082a1e935b4c83a75d4fe35b90e87d/result.json`: build-time ZIP.
- `6c4bb506955d4e18b0d57b784c879f00/result.json`: final ZIP, PowerShell 7.
- `eb6b6c506f3244899c033fa1e88e3150/result.json`: final folder, PowerShell 5.1.
- `rc3-handoff-217cfb31ed5b4999ad8fcdaee70b7f16/result.json`: history/content/SHA.

The normal source service remains at http://localhost:5000/ (PID 29316 at this
checkpoint). No historical portable folder was run directly or used as a live
data directory. Generated outputs are Git-ignored and were not uploaded.

The earlier Windows File.Replace history error is retained in continuity notes;
its root cause is unconfirmed. Do not treat local packaging as release approval.
Source artifacts retain build-time documentation. Later evidence and handoff
updates never alter an already generated ZIP or its immutable folder.

## Historical Generator Checkpoint

- Release build: zero warnings/errors. All 194 .NET tests passed (33 unit,
  7 integration, 154 contract), with no failures/skips and XPlat coverage.
- All 58 Chromium workflows passed (29 desktop, 29 mobile), with no failures,
  skips or retries. No application behavior or inventory schema changed here.
- All 49 packaging guards passed on both Windows PowerShell 5.1 and PowerShell
  7. Coverage also rejects JSON/Excel/CSV files in the public asset policy,
  duplicate/case-duplicate/symlink ZIP entries and unsafe staging cleanup.
- Candidate 0.8.0-rc.1 passed exact-ZIP validation on both shells: 17 HTTP routes,
  four deliberately damaged/private-file cases, clean first-run files and
  unchanged source artifacts. Its generation also validated the staged folder.
- Repeating that version was rejected before publishing. Its folder manifest,
  ZIP and checksum plus all eight legacy releases/ ZIP hashes stayed unchanged.
- Final candidate 0.8.0-rc.2 was then generated end to end on Windows PowerShell
  5.1. It passed the same exact-ZIP/startup/negative tests. Both historical
  versions' folders and ZIP checksums were independently rechecked. The final
  run removed only its owned staging GUID directory after success.
- Public documentation screenshots were reviewed and contain example data.
  No real inventories, exports or the external C:\Tmp inputs were packaged.
- The normal development service was started on port 5000 (PID 10744 at this
  checkpoint); all nine read-only application/docs/config smoke routes passed.
- PowerShell/JavaScript syntax, 177 local Markdown links across 40 documents,
  Git whitespace and artifact-ignore checks passed. Remote CI/publication is
  not included in this local evidence.

Initial packaging stopped safely because the ASP.NET Core 8 runtime NuGet
package declares MIT without a standalone license file. The generator now
checks that license expression and includes the official mirrored notice while
retaining the exact runtime-pack third-party notices. The first PowerShell 5.1
guard run also exposed the need to load System.IO.Compression explicitly; both
shells passed after that fix. No final artifact was promoted from failed runs.

## Limits

Local Windows/Chromium emulation is not clean-machine certification or release
approval. Mutation, fuzz, security review, performance/resource, extended
resilience, operator acceptance and complete compatibility evidence still need
the applicable deployment gates or approved exceptions. Negative path/ZIP tests
are focused regression checks, not a general fuzz campaign.

The current source worktree contains earlier uncommitted feature changes;
portable-release.json records sourceCommit and sourceDirty rather than implying
a clean tagged release. No GitHub asset, tag or deployment is created.
