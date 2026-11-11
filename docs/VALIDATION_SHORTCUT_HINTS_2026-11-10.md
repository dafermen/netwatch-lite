# Local Shortcut Description Validation - 2026-11-10

## Scope

Add helper text below Shortcuts and Command in Add/Edit/Copy Device. The Spanish
copy distinguishes actions from checks and clarifies that Command is copied to
the clipboard, not automatically executed. Use the existing Bootstrap form-text
style and aria-describedby. No value, validation, persistence, network execution
or clipboard implementation change is intended. No operational data is edited.

GitHub publication is explicitly on hold. No push, tag, release or artifact upload
is authorized. The new rc.9 portable must be local, include folder/ZIP/SHA-256,
exclude private data and retain rc.8/all older versions unchanged.

## Validation

Focused command browser regression covers both desktop/mobile, description text,
accessible associations, wrapping, unchanged Add/Edit values and existing mock
clipboard, copy, bulk/import/export and read-only behavior. Tests use isolated
synthetic inventory; the operator clipboard is never read/changed. Build output
is isolated so the running source service need not restart.

The isolated Release solution build passed with zero warnings/errors. All 16
focused browser cases passed: eight SQLite/eight JSON, each with desktop/mobile
projects, no failures/skips/retries. Synthetic captures at 1440x1000 and 390x844
were reviewed: help text wraps within the form and does not overlap controls.
Both shells passed all 54 packaging guards. JavaScript syntax and Git whitespace
passed. Evidence is under
`artifacts/verification/shortcut-hints-648af97482df49cfa208461d9a4d848a/`, with
separate browser-sqlite/browser-json subdirectories. Guard receipts are
`guards-2e9b46c584a14d1c9a31e0e59be234d4/` and
`guards-fab3dadc44594edeae78a3c9453cca85/` under artifacts/verification/.

Generated local candidate 0.8.0-rc.9 with folder/ZIP/SHA-256, 415 files and 71
approved public assets. ZIP bytes: 47410308. SHA-256:
`00542d00f792fe23cf56e1d1f643416dd3b684ee4e595bf72bc54ca12a091cf5`.
The generated ZIP, final ZIP and final folder-copy native validations each passed
19 read-only routes/seven negative checks, neutral SQLite first run and unchanged
source bytes. Receipts under artifacts/verification/:
`1eb2f2f4cee4406f8ea32b6f96e4e3e3/result.json`,
`019aea644d764313992979be01b4fbf7/result.json`,
`e2c8e29fc9ac4429a1d7cc328da24e57/result.json`.

All 3227 historical files and 14 original JSON hashes matched the baseline.
Public sources matched the package before final handoff notes. No database,
sidecar, lease, operational inventory, backup/export or external input was
packaged. ZIP/sidecar matched; no staging/publisher lock remained. The original
source process PID 27804 continues serving SQLite on port 5000 and fresh HTML
contains both descriptions. It was not restarted, monitored or edited via API.
Audit: `artifacts/verification/shortcut-hints-648af97482df49cfa208461d9a4d848a/final-audit.json`.
All 267 local links across 52 Markdown documents and whitespace checks passed.
No GitHub publication occurred. Post-generation repository notes do not rewrite
the immutable artifact's build-time documentation. See CURRENT_STATUS for handoff.
The prior 342 .NET/280 browser regression remains historical; it is not a rerun
for this text-only change. Stable deployment/other-PC acceptance remains separate.
