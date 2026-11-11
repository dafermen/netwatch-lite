# Device Notes And Portable Validation - 2026-11-08

## Scope

Optional device `notes`, exposed as Notes in the English UI, for physical
location, assigned user/team or other manual inventory observations. Applies
to every device type without migration. Max 2000 UTF-16 code units before
trimming, multiline with CR/LF/tab permitted; other controls are rejected.
The backend retains internal text; browser textarea editing uses LF line breaks.

Add/Edit/Advanced, copy, unrelated Bulk Edit changes, configuration export/import
and profile copies retain notes. Empty/null/missing means no notes. Escaped
disclosures and search in Configuration/Dashboard do not execute anything or
change check scope/health. Notes stays private configuration, not monitoring
results/history or report rows. A named user is not verified identity.
See [operations](OPERATIONS.md#device-notes) and [API](API.md#configuration).

The requested portable is a new self-contained Windows x64 `0.8.0-rc.5` folder
with ZIP and SHA-256 sidecar. No overwrite of rc.1/rc.2/rc.3/rc.4 or legacy
archives; no private inventory, notes, history, exports, backups, local themes
or external Excel/JSON input. The packager uses explicit public sources and
generated neutral sample/settings. GitHub publication is not requested.

## Commands

```powershell
$env:DOTNET_ROOT_X64 = 'C:\Program Files\dotnet'
$env:DOTNET_ROOT = 'C:\Program Files\dotnet'
dotnet build netwatch.sln -c Release --no-restore
dotnet test netwatch.sln -c Release --no-build --no-restore --logger trx --collect "XPlat Code Coverage" --results-directory TestResults
npm run test:e2e
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\test-packaging.ps1
pwsh.exe -NoProfile -File .\scripts\test-packaging.ps1
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\publish-portable.ps1 -Version 0.8.0-rc.5
pwsh.exe -NoProfile -File .\scripts\test-portable.ps1 -ZipPath .\artifacts\packages\NetWatch-Lite-v0.8.0-rc.5-win-x64.zip
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\scripts\test-portable.ps1 -PortablePath .\artifacts\portable\NetWatch-Lite-v0.8.0-rc.5-win-x64
git diff --check
```

If the running development instance locks the DLL on Windows, identify and
stop only that known instance before rebuilding, then restart port 5000. Never
stop an unknown listener or run archived packages as working data directories.
Repeating a published version must fail; use a new version for later builds.

## Evidence

Release solution build passed with zero warnings/errors. All 25 new contract
cases passed for legacy/null/blank/multiline/max values, trimming, reload/row
save/export/import/profile preservation, clearing, privacy and invalid input
rejection without replacement. Eight focused browser cases passed on desktop
and mobile for creation/edit/copy, bulk preservation, JSON/profile round trips,
search before/after checks, literal HTML/keyboard disclosure, reset/clearing,
client validation and long-text/editor geometry.

An initial browser run had four passing and four failing cases due to two test
assumptions, not application defects: the existing exporter omits optional null
fields and single-device completion messages include the device name. Tests
now account for those contracts without changing production behavior. Initial
evidence: `artifacts/verification/notes-focused-initial-72034ca163394d9f9d33e845927396bb/`.
The build initially encountered the known development service's DLL lock; only
that verified process was stopped before the successful rebuild/restart.

Full source regression passed before portable generation:

- All 249 .NET tests (33 unit, 7 integration, 209 contract), no failures/skips,
  with TRX/coverage under TestResults. TRX names end in
  `2026-11-08_15_21_30`, `_15_21_31` and `_15_21_36`.
- All 110 Chromium cases (55 desktop, 55 mobile), no failures/skips/retries;
  full evidence remains under test-results/ and playwright-report/.
- All 49 packaging guards on Windows PowerShell 5.1 and PowerShell 7. Evidence:
  `artifacts/verification/guards-12de097fb5ec4ea485d2b3cb65bf84b1/` and
  `guards-94c10289a68f465fb889d45af2b828f3/`.
- JavaScript syntax, 204 local links across 43 Markdown files, Git whitespace
  and seven read-only app/docs/config routes passed.
- All 14 operational JSON files retained their pre-restart hashes.

Configuration/Dashboard disclosures and the editor were visually reviewed at
1440x1000 and 390x844. Two extra geometry cases passed with correctly framed
captures in `artifacts/verification/notes-visual-19dce8a4922e422ba034a321747efca4/`,
without replacing the full HTML report. An intermediate desktop check captured
the modal during opening; the test now waits for the public shown.bs.modal
event before asserting bounds/capturing. No product change was needed. The
intermediate evidence remains under
`artifacts/verification/notes-visual-4d5e9e5eb79848cf92b349a6cc4c0801/`.

Evidence remains ignored under TestResults, test-results, playwright-report and
artifacts/verification. The normal service uses port 5000; isolated tests use
temporary data and ephemeral loopback ports, never operational inventory.

## Portable rc.5 Delivery

- Folder: `artifacts/portable/NetWatch-Lite-v0.8.0-rc.5-win-x64/`.
- ZIP: `artifacts/packages/NetWatch-Lite-v0.8.0-rc.5-win-x64.zip`.
- Checksum: the adjacent `.zip.sha256` file.
- ZIP size: 46160154 bytes.
- SHA-256: `8c202e8774cb687dd533150af5e4c5c210ed2bd1ae41fa735c64304991c0b7fc`.

Windows PowerShell 5.1 generated and validated the exact ZIP before promotion.
PowerShell 7 revalidated the final ZIP; Windows PowerShell 5.1 revalidated the
final folder through a disposable copy. Each test passed native startup, 17
read-only HTTP routes, four damaged/private-file rejection cases, neutral
first-run files and unchanged source/package bytes. No monitoring was invoked.

All 399 package files matched policy/manifests and all 62 public files matched
their build-time source hashes. Notes/Reports/Command markers were present.
Only generated neutral sample/settings and public assets/runtime binaries were
included; no private notes, inventories, themes, history, exports/backups or
external Excel/JSON inputs. The final ZIP hash and sidecar filename/hash matched.

All 1586 files across rc.1/rc.2/rc.3/rc.4 folders, their ZIP/checksum pairs and
eight legacy archives retained before/after hashes (16 archive/checksum files).
Attempting rc.5 again was rejected without changing its folder, ZIP or checksum.
Evidence under artifacts/verification/:

- `38377533967d4ffc9bf54a05e395c7d2/result.json`: build-time ZIP.
- `c43c80f42a964d3080ce5be1830f7172/result.json`: final ZIP, PowerShell 7.
- `f42f582c1e9a41ba9111d7716be50bb5/result.json`: final folder, PowerShell 5.1.
- `rc5-handoff-4eec6aa218994e6199b431df2b8ff647/result.json`: preservation/content/SHA.

The updated source service remains on http://localhost:5000/ (PID 22204).
Generated outputs are Git-ignored and were not uploaded. Metadata records
sourceDirty: true for this untagged local candidate. See
[CURRENT_STATUS.md](../CURRENT_STATUS.md) for the final handoff.

Final handoff rechecked eight read-only HTTP routes (all 200), ZIP/manifest/SHA,
204 local links across 43 documents and all 14 unchanged operational JSON files.
No publisher lock, staging entry or disposable test application remained.
Evidence: `artifacts/verification/rc5-handoff-4eec6aa218994e6199b431df2b8ff647/final-state.json`.

An immutable package contains build-time documentation. Later repository
handoff/checksum evidence does not retroactively modify its folder or ZIP.

## Limits And Other-PC Test

Extract the complete ZIP into a new local folder on the target Windows x64 PC,
verify its SHA-256 and run Start-NetWatch.cmd. It binds to localhost:5000; no
service installation/firewall rule is created. Migrate a private inventory only
after backing it up; older clients/binaries can discard Notes on subsequent saves.
First check Add/Edit Notes, multiline persistence, search and disclosures with
non-sensitive test data. The packaged sample has only neutral localhost data.

Local automated checks are not clean-machine certification, offline support
(existing frontend CDNs remain) or stable-deployment approval. Complete all
thirteen [deployment gates](DEPLOYMENT.md) with evidence or approved exceptions.
The earlier Windows history-file replacement incident remains open; adding
Notes does not fix that persistence issue or certify complete resilience.
No authentication, verified operator identity or remote deployment is added.
