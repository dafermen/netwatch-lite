# HTTP Field Help Validation - 2026-11-10

## Scope

Add Spanish help below HTTP Timeout/Expected text; remove the redundant Shortcuts
note and its reference, keeping Command help. Explain 10000 ms = 10 seconds per
HTTP attempt, not a ping count; retries are separate Settings. Expected text is
optional/literal/case-sensitive, not JavaScript/browser-session content. Empty
means expected-status-only. Per-row IDs associate each description with its own
field; mobile HTTP fields stack. No retry/check semantics or operator data changes.

Retries already exist under Configuration > Settings: 0-5 retries, delay 0-10000
ms, Save Settings, scoped to the active support group and shared by Ping/TCP/HTTP.
The isolated browser test saves/reloads synthetic settings only.

## Validation State

The isolated Release solution build passed without warnings/errors. All 32
focused HTTP/command browser cases passed (16 SQLite/16 JSON, desktop/mobile),
without failures/skips/retries. Captures at 1440x1000/390x844 were reviewed for
wrapping/stacking, field bounds and no overlap. Tests confirmed distinct per-check
description references, removal of the Shortcuts note, preserved Command behavior
and saving synthetic Retries/Retry delay values. Both shells passed 54 packaging
guards; JavaScript syntax and whitespace passed. Evidence is under
`artifacts/verification/http-hints-5bb65994506f4957a47fbca136aef1ee/` with separate
browser-sqlite/browser-json folders. Guard receipts are
`guards-1195b18554cf484e8ee77bcc7dfbf21f/` and
`guards-2110e0be3329454881c0632d49630bce/` under artifacts/verification/.

## Local Portable Delivery

Generated immutable local rc.10 folder, ZIP and matching SHA-256 sidecar:

- Folder: `artifacts/portable/NetWatch-Lite-v0.8.0-rc.10-win-x64/`.
- ZIP: `artifacts/packages/NetWatch-Lite-v0.8.0-rc.10-win-x64.zip` (47413948 bytes).
- SHA-256: `aed1937f0c3afc43157d87393da2aacd72d476990bafa18193297729cbedb138`.

All 416 package files passed policy/manifests; 72 public files matched build-time
source. Exact native ZIP/folder validation passed 19 read-only routes, seven
negative checks and neutral SQLite first run. Receipts under artifacts/verification/:

- `116197b1877e40a3948568e03640efab/result.json`: generation, PowerShell 5.1.
- `30eac717f5d843d19eb7adc38072bd0b/result.json`: final ZIP, PowerShell 7.
- `a5d8915fdc7d4d4890a9b81b0e9b6985/result.json`: final folder copy, PowerShell 5.1.

Final audit in the HTTP evidence directory confirmed matching ZIP checksum, no
private package data, all 3644 historical files and 14 original JSON hashes
unchanged, and no staging/publisher lock left behind. The source SQLite service
remained PID 27804 on port 5000, serving the helpers without restart or data writes.
Archive documentation is frozen at build time; final handoff receipts are recorded
in repository documentation without changing the archive.

The broader rc.8 regression is historical, not a claimed rerun for this change.
Tests must not edit operator data, execute stored commands or touch the real
clipboard. GitHub remains explicitly on hold. Portable privacy, historical
preservation and stable-deployment/other-PC gates remain unchanged.
