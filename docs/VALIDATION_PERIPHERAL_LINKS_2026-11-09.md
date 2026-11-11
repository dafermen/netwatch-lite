# Peripheral Links And Portable Validation - 2026-11-09

## Scope

Per-assignment `linkType` for printers/scanners: unrecorded, wireless or cabled.
The editor offers Not recorded, Wireless, Cabled separately from existing
USB/Network/Other Connection. Missing/null/blank values normalize to unrecorded;
case/outer whitespace normalize like existing tokens. Other values are rejected
before full/row saves or import. No link is inferred from USB or a catalog model.

Each physical unit retains its own link through normal/Advanced/copy/bulk/profile/
JSON workflows. Configuration/Dashboard/Workstations summaries show it as manual
inventory, not monitoring data. Link changes preserve the connection/address;
only changing Connection away from Network clears the address as before. Pending
inventory filters retain their existing group-status meaning. See
[inventory](PERIPHERALS.md) and [API](API.md#configuration).

Portable candidate `0.8.0-rc.7` must deliver a new Windows x64 self-contained
folder, ZIP and SHA-256. Preserve rc.1 through rc.6 and legacy archives. Package
only public allowlisted assets/runtime binaries and generated neutral settings/
sample; never private inventories, locations/notes, history, themes, exports,
backups or external inputs. SQLite and auto-expanding Configuration search remain
backlog items, not active features. No GitHub publication is requested.

## Commands

```powershell
$env:DOTNET_ROOT_X64 = 'C:\Program Files\dotnet'
$env:DOTNET_ROOT = 'C:\Program Files\dotnet'
dotnet build netwatch.sln -c Release --no-restore
dotnet test netwatch.sln -c Release --no-build --no-restore --logger trx --collect "XPlat Code Coverage" --results-directory TestResults
npm run test:e2e
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\test-packaging.ps1
pwsh.exe -NoProfile -File .\scripts\test-packaging.ps1
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\publish-portable.ps1 -Version 0.8.0-rc.7
pwsh.exe -NoProfile -File .\scripts\test-portable.ps1 -ZipPath .\artifacts\packages\NetWatch-Lite-v0.8.0-rc.7-win-x64.zip
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\test-portable.ps1 -PortablePath .\artifacts\portable\NetWatch-Lite-v0.8.0-rc.7-win-x64
git diff --check
```

Run .NET regression separately from browser/hashing/packaging work after the
previous checkpoint's intermittent failures under concurrent validation. This
does not establish resource contention as their cause or certify a fix. Stop
only a verified development listener before rebuilding a locked DLL; native
package tests use disposable copies and ephemeral loopback ports, not port 5000.

## Evidence

Release solution build passed without warnings/errors. All 28 new contract
cases passed for unknown/null/blank/case defaults, independent assignment values,
reload/row/JSON/profile preservation, clearing without field loss, exclusion
from history and invalid-value rejection without replacement. Eight focused
browser cases passed on desktop/mobile, covering both kinds, duplicate models,
normal/Advanced/copy/bulk/JSON/profile preservation, Connection/address rules,
read-only summaries, legacy unknowns and layout geometry.

Full source validation passed before package generation:

- All 311 .NET tests passed (33 unit, 7 integration, 271 contract), with coverage
  and TRX names ending `2026-11-09_23_04_04`, `_23_04_05`, `_23_04_10`.
- All 126 Chromium cases passed (63 desktop, 63 mobile), no failures/skips/retries;
  full evidence remains under test-results/ and playwright-report/.
- Printer/scanner captures at 1440x1000 and 390x844 were reviewed for labels,
  wrapping, select bounds and no overlap; the model spans both desktop columns.
- All 49 guard checks passed on Windows PowerShell 5.1 and PowerShell 7 after
  adding the roadmap: `artifacts/verification/guards-9af7e90854b84967b10d8df89d4f47a0/`
  and `guards-d72f87d58c074926ab60e8ae5fbbe7c6/`.
- JavaScript syntax, 232 local links across 47 Markdown documents and whitespace
  checks passed. The public allowlist has 66 approved files.

The user requested coordinated development; [ROADMAP.md](ROADMAP.md) sequences
the remaining search/form/reliability/SQLite work. Dynamic fields and the proposed
network target/website shortcut/monitored URL names are not implemented in rc.7.

Test evidence stays ignored under TestResults, test-results, playwright-report
and artifacts/verification.
Only isolated synthetic inventory and loopback tests were used; the agent did
not execute monitoring or write operational inventory. User activity during
this task may change runtime JSON; never restore old hashes over operator data.

The updated source service is on port 5000 (PID 21688 at this checkpoint).
The immutable package contains build-time documentation. Post-generation
repository handoff evidence must not modify its folder/ZIP/checksum.

## Portable rc.7 Delivery

- Folder: `artifacts/portable/NetWatch-Lite-v0.8.0-rc.7-win-x64/`.
- ZIP: `artifacts/packages/NetWatch-Lite-v0.8.0-rc.7-win-x64.zip`.
- Checksum: the adjacent `.zip.sha256` file.
- ZIP size: 46181874 bytes.
- SHA-256: `6c8b9d2e41eca0f8ed90c5003d1b21ea378f32ab54b8dc98232f5f3d54b09079`.

Windows PowerShell 5.1 generated and validated the exact ZIP before promotion.
PowerShell 7 revalidated the final ZIP, and PowerShell 5.1 revalidated the final
folder through a disposable copy. Each passed native startup, 17 read-only HTTP
routes, four corruption/private-file rejection cases, neutral first-run files
and unchanged package/source bytes. No monitoring was invoked by these tests.

All 403 package files matched policy/manifests. All 66 public sources matched
packaged bytes before final repository handoff edits. Link selectors, inventory
display and prior feature markers were present. No private inventory, notes,
locations, history, themes, exports/backups or external inputs were included.
The final ZIP hash and checksum sidecar matched.

All 2385 files across rc.1 through rc.6 folders, their ZIP/checksum pairs and
eight legacy archives retained hashes (20 archive/checksum files). Duplicate
rc.7 publishing was rejected without altering its folder, ZIP or checksum.
Evidence under artifacts/verification/:

- `3d96cacaf1b84f78b87cc4cd704f5f7b/result.json`: build-time ZIP.
- `8cdd9953920d4f12aefc7bb0b596d1ce/result.json`: final ZIP, PowerShell 7.
- `3c516bf70aff4608b959d588fb0fb4bc/result.json`: final folder, PowerShell 5.1.
- `rc7-handoff-a3d8909a2f6d41b9abc64423513cd064/result.json`: preservation/content/SHA.

The updated source service remains at http://localhost:5000/ (PID 21688).
Artifacts are Git-ignored, not uploaded, and record sourceDirty: true for this
untagged local candidate. The roadmap now marks only stage 0 complete; queued
search/dynamic-form/SQLite work is not shipped. See
[CURRENT_STATUS.md](../CURRENT_STATUS.md) for handoff and remaining risks.

Final read-only checks passed for 11 app/docs/API routes (HTTP 200), the sole
port-5000 listener and ZIP/checksum integrity. No publisher lock, staging entry
or test app remained. Receipt:
`artifacts/verification/rc7-handoff-a3d8909a2f6d41b9abc64423513cd064/final-state.json`.
Four of 15 original local JSON fingerprints changed during operator activity;
no runtime snapshot was restored and no agent monitoring request was made.
After final handoff edits, 233 local links across 47 Markdown documents passed;
the live app and roadmap returned HTTP 200 with the expected service PID 21688.

## Limits And Other-PC Test

Extract the complete ZIP into a new Windows x64 folder, verify SHA-256 and run
Start-NetWatch.cmd. It binds localhost:5000 without installing a service/firewall
rule. Back up privately before migrating inventory or using older binaries/
clients, which can discard linkType. With synthetic data, verify Wireless/Cabled
for both kinds, saving/reopening/copying and the unchanged network-address rules.

This is a release candidate for testing, not stable-deployment approval, clean-
machine certification or offline support (existing frontend CDNs remain). The
earlier Notes-save/HTTP timing and Windows history-replacement incidents remain
open; this field does not fix persistence or HTTP behavior. Complete all thirteen
[deployment gates](DEPLOYMENT.md) with evidence or approved exceptions.
