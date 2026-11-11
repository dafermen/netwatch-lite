# Device Location And Portable Validation - 2026-11-08

## Scope

Optional device `location` for floor/office/desk within a Facility, immediately
before Notes in Add/Edit. Max 200 UTF-16 code units before trimming; single-line,
no controls or Unicode line/paragraph separators. Missing/null/blank is unspecified.
No migration or automatic extraction from existing Notes. Facility grouping and
monitoring scope stay unchanged; this is manual inventory, not geolocation.

Configuration/Dashboard show escaped text and search it before/after checks.
Normal/Advanced/copy, unrelated Bulk Edit changes and JSON/profile workflows
preserve it with Notes/Facility. Location stays private configuration/backups/
exports, not monitoring results/history or report rows. Older clients/binaries
may discard this field when saving; back up privately before rollback. See
[operations](OPERATIONS.md#device-location) and [API](API.md#configuration).

Portable candidate `0.8.0-rc.6` must deliver a new self-contained Windows x64
folder, ZIP and SHA-256. Do not overwrite rc.1 through rc.5 or legacy archives.
Package only allowlisted public assets/runtime binaries and generated neutral
sample/settings; no private locations, notes, inventory, history, themes, exports,
backups or external Excel/JSON inputs. No GitHub publication is requested.

## Commands

```powershell
$env:DOTNET_ROOT_X64 = 'C:\Program Files\dotnet'
$env:DOTNET_ROOT = 'C:\Program Files\dotnet'
dotnet build netwatch.sln -c Release --no-restore
dotnet test netwatch.sln -c Release --no-build --no-restore --logger trx --collect "XPlat Code Coverage" --results-directory TestResults
npm run test:e2e
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\test-packaging.ps1
pwsh.exe -NoProfile -File .\scripts\test-packaging.ps1
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\publish-portable.ps1 -Version 0.8.0-rc.6
pwsh.exe -NoProfile -File .\scripts\test-portable.ps1 -ZipPath .\artifacts\packages\NetWatch-Lite-v0.8.0-rc.6-win-x64.zip
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\test-portable.ps1 -PortablePath .\artifacts\portable\NetWatch-Lite-v0.8.0-rc.6-win-x64
git diff --check
```

Identify/stop only the known development process before rebuilding if it locks
the DLL on Windows, then restart port 5000. Never stop an unknown listener or
start archived packages as live data directories. Repeating a published version
must fail without changing outputs; use a new version for subsequent builds.

## Evidence

Release solution build passed with zero warnings/errors. All 34 new contract
cases passed for legacy/null/blank/max values, trimming, reload/row/export/import/
profile preservation, clearing, privacy and invalid input rejection without
replacement. Eight focused browser cases passed on desktop/mobile for ordering,
add/edit/Advanced/copy/bulk/JSON/profile workflows, Facility/Notes preservation,
clearing/reset/validation, search before/after checks, escaped text and bounds.

Final source validation before portable generation:

- All 283 .NET tests passed (33 unit, 7 integration, 243 contract), with TRX and
  coverage. Final TRX names end in `2026-11-08_16_00_39`, `_16_00_40`, `_16_00_48`.
- All 118 Chromium cases passed (59 desktop, 59 mobile), no skips/failures or
  automatic retries. Evidence remains under test-results/ and playwright-report/.
- All 49 packaging guards passed on Windows PowerShell 5.1 and PowerShell 7:
  `artifacts/verification/guards-64e5fcbb837440b8a7a4fb47c31a4139/` and
  `guards-1cadcf1ae4cb496e877fa8dc32d2a7e9/`.
- JavaScript syntax, 211 local links across 44 Markdown files, Git whitespace,
  seven read-only app/docs/config routes and all 14 unchanged local JSON hashes.
- Visual review at 1440x1000 and 390x844 confirmed Location above Notes, wrapped
  long positions, modal bounds and unchanged aligned actions. Captures use
  synthetic data under test-results/.

The initial .NET run overlapped other validations and passed 281/283 cases.
One legacy Notes save returned HTTP 500 without response detail; one 200 ms
slow-body probe timed out without recording the expected 200 status. The full
isolated rerun and three focused repeats (five cases each, 15 passes) did not
reproduce them. This does not prove resource contention caused either failure.
Only test diagnostics were improved to include future save-failure bodies;
production persistence, HTTP behavior and assertions were not relaxed. Keep
investigation open before stable deployment. Original evidence is retained in
TestResults, including the initial contract TRX ending `2026-11-08_15_55_11`.
Focused evidence: `location-existing-rerun-1.trx` through `-3.trx`.

Evidence stays ignored under TestResults, test-results, playwright-report and
artifacts/verification. Tests use synthetic data and loopback; no operational
device checks were performed.

The service was restarted on port 5000 (PID 26844) after the clean build. Runtime
JSON hashes were recorded beforehand. No operational notes/locations were moved,
imported or edited. Packages contain build-time docs; post-generation repository
handoff evidence does not retroactively modify the immutable folder or ZIP.

## Portable rc.6 Delivery

- Folder: `artifacts/portable/NetWatch-Lite-v0.8.0-rc.6-win-x64/`.
- ZIP: `artifacts/packages/NetWatch-Lite-v0.8.0-rc.6-win-x64.zip`.
- Checksum: the adjacent `.zip.sha256` file.
- ZIP size: 46167057 bytes.
- SHA-256: `d2357af8aa3f27fb498b904d02f278c0c525675f0318f19b4860dd7fcc711f7a`.

Windows PowerShell 5.1 generated and validated the exact ZIP before promotion.
PowerShell 7 revalidated the final ZIP and PowerShell 5.1 revalidated the final
folder through a disposable copy. Each passed native startup, 17 read-only HTTP
routes, four corrupted/private-file rejection cases, neutral first-run files
and unchanged package/source bytes. No monitoring was invoked.

All 400 package files matched policy/manifests. All 63 allowlisted public files
matched source bytes before final handoff edits. Location/Notes/Reports/Command
markers were present; no private locations/notes, runtime inventory/history,
themes, exports/backups or external inputs were packaged. ZIP and sidecar matched.

All 1985 files across rc.1 through rc.5 folders, their ZIP/checksum pairs and
eight legacy archives retained hashes (18 archive/checksum files). Repeating
rc.6 publishing was rejected without modifying its folder, ZIP or checksum.
Evidence under artifacts/verification/:

- `bd96c71c01bf4d3d97e2053f7e02c5bf/result.json`: build-time ZIP.
- `18bbd7c1d067478a93392992b4d996c5/result.json`: final ZIP, PowerShell 7.
- `f400163ecc0e4339b66aa4eb3e307481/result.json`: final folder, PowerShell 5.1.
- `rc6-handoff-1c98d4ac6a8949c6a041e8519dead569/result.json`: preservation/content/SHA.

The updated source service remains on http://localhost:5000/ (PID 26844).
Generated artifacts are Git-ignored and were not uploaded. Metadata records
sourceDirty: true for this untagged candidate; later repository evidence does
not modify the immutable package's build-time docs. See
[CURRENT_STATUS.md](../CURRENT_STATUS.md) for the final handoff.

Final handoff verified eight read-only routes (all 200), Location ordering/model,
ZIP/manifest/SHA, 211 local links across 44 documents and all 14 unchanged local
JSON hashes. No publisher lock, staging entry or disposable test app remained.
Evidence: `artifacts/verification/rc6-handoff-1c98d4ac6a8949c6a041e8519dead569/final-state.json`.

## Limits And Other-PC Test

Extract the complete ZIP into a new local directory on Windows x64, verify its
SHA-256 and run Start-NetWatch.cmd. It binds to localhost:5000 without installing
a service or firewall rule. Keep the historical package unchanged and migrate
private data only after backing it up. Test Location before Notes, multiline
Notes preservation, search and copy/import flows with non-sensitive sample data.

Local checks are not clean-machine certification, offline support (existing
frontend CDNs remain) or stable-deployment approval. Complete all thirteen
[deployment gates](DEPLOYMENT.md) with evidence or approved exceptions. The
earlier Windows history-file replacement incident remains open; this field
does not fix persistence or certify complete resilience. No authentication,
identity verification, geolocation or remote deployment was added.
