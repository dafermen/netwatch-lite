# URL CRUD Visibility Validation - 2026-11-11

## Scope And Diagnosis

The owner reported URL edits/copies apparently disappearing after a successful
save, requested a smaller URL form and a SQLite CRUD audit. Read-only local API
checks confirmed SQLite schema 2 was active, with no recorded application errors.
No operational inventory writes or monitoring were used for reproduction.

Three synthetic SQLite desktop browser regressions failed before the fix:

- Configuration search ignored `checks[].url` and returned no match for its full URL.
- A rename persisted in `/api/config` but remained excluded by the previous search.
- A copied device persisted in `/api/config` but its row was hidden by parent collapse.

These are reproduced display defects, not demonstrated database data loss. Clean
HTTP edit/copy/reload and failed-save retry already passed before the fix. Other
operator-specific failure causes remain possible; do not claim that success
notifications alone prove persistence or that the previous Windows JSON incidents
have been resolved.

The broader initial SQLite suite then exposed a real Reports CRUD refresh race
(163/164 passed). Starting deletion called a render that queued SQL reads before
DELETE completed. The trace shows a first page with the old history revision,
followed by three HTTP 400 stale-revision responses after successful deletion.
A controlled delayed-write test independently reproduced four SQL reads during
the pending mutation. The fix invalidates queued reads, renders mutation busy
state directly and refreshes only when the write settles. This is a frontend
read/write ordering defect, not database corruption. Both storage providers and
desktop/mobile must pass the delayed-delete regression before final delivery.

## Changes

Configuration searches monitored URLs, reveals a saved device's parents and
clears only filters excluding that record. The next Dashboard visit opens the
enabled pending device without monitoring. Disabled records stay disabled, with
an explicit success message. HTTP-only forms hide Location/Command; stored values
remain unchanged and mixed checks reveal them again. Validation and API problem
details remain inside the modal. Save failure preserves the draft and restores
check-specific disabled controls before retry. No schema change is required.

## CRUD Matrix

All automated writes use synthetic data in isolated roots, never the active DB.

| Area | Coverage |
| --- | --- |
| Devices / HTTP checks | Create, read, edit, copy, reject, retry, reload, restart, delete |
| Bulk / JSON | Row save, advanced edit, bulk actions, import/export, invalid import |
| Types | Custom create/rename/delete, protected Workstation, stale-catalog guard |
| Printers / scanners | Model create/edit/delete, assignment copy, in-use protection |
| Support groups | Create/copy/rename/activate/delete, independent inventory, stale-profile guard |
| Themes | Create/copy/rename/activate/edit/delete/reset, protected built-ins, failed-save drafts |
| Reports / history | Reads, filters, detail/export, delete/cancel/reject, SQL totals/pages |
| Settings / integrations / errors | Validated persistence and API contracts, clear/error handling |
| Storage | Transaction rollback, projection IDs, auditing, policy, backup/restore, retention |

New tests are in `tests/e2e/url-crud.spec.cjs` and
`tests/NetWatch.ContractTests/DeviceCrudPersistenceTests.cs`; existing workflow,
management, catalog, inventory, HTTP, reports and storage suites supply the broader
CRUD matrix. The entire suite, not just a few new tests, must pass before delivery.

## Execution Evidence

Evidence root: `artifacts/verification/crud-20261111/`.

- `before-browser/`: two clean HTTP persistence/retry cases passed before the fix.
- `visibility-before/`: three expected visibility/search failures, with saved API assertions.
- `focused-browser/`: initial expanded check, including a mobile test-navigation
  setup failure (drawer was not opened); fixed in the test without changing app navigation.
- `full-sqlite-browser/`: initial 163/164 result and the original Reports race trace.
- `delete-before/`: controlled read/write-overlap failure before the Reports fix.
- `delete-sqlite-browser/`, `delete-json-browser/`: eight focused deletion cases
  passed after the fix, including desktop/mobile delayed-write and full workflow.
- `net-results/`: 357 .NET cases passed (34 unit, 28 integration, 295 contract),
  with sequential collections and explicit concurrency cases retained. No backend
  source changed after this run; the subsequent Reports fix is JavaScript only.
- `final-sqlite-browser/`, `final-json-browser/` and corresponding JSON/HTML
  reports: all 332 final browser cases passed (166 per provider, desktop/mobile),
  without skips, failures or retries. Screenshots were reviewed and compact-form
  overflow checks passed.
- Both PowerShell 5.1 and 7 passed 58 packaging guards. JavaScript syntax,
  281 relative links across 55 documentation files and Git whitespace passed.
- Native rc.12 generation/final ZIP/folder checks passed. The archive contains
  the earlier build-time checkpoint; final receipts below do not rewrite it.

Source restart verification passed: rc.12 / PID 7504 on port 5000, with a private
verified backup and old runtime retained. All document bytes, eight API snapshots
and original JSON matched before/after. Evidence:
`activation-423ffd03411c4c2081b3fdcb912834d3/` under the evidence root. Schema 2
was retained; no schema migration, JSON reimport or operational checks occurred.

## Native Delivery

- Folder: `artifacts/portable/NetWatch-Lite-v0.8.0-rc.12-win-x64/`.
- ZIP: `artifacts/packages/NetWatch-Lite-v0.8.0-rc.12-win-x64.zip` and adjacent
  `.zip.sha256` sidecar. ZIP length: 47462529 bytes; 421 files / 77 public assets.
- SHA-256: `a4d55e7cd57d767d112669d359189580dda18d407a4b107240795df14b0078d2`.
- Generation under PowerShell 5.1, final ZIP under 7 and folder-copy under 5.1
  each passed 26 HTTP routes/eight negative checks, neutral schema-2 SQLite first
  run and unchanged artifact bytes. Receipts under `artifacts/verification/`:
  `fe9f311bbb9f4b9392f3a48ee3557ad8`, `94d292203190468383c8328d9a12ef45`,
  `6443ff66ec2d4468a08b47e26e24a334`.
- `package-audit.json` verified the manifest/SHA, 77 build-time public source
  matches, all 4476 historical files and 15 original Data JSON unchanged, no
  publisher lock and active SQLite schema 2. Final source check confirmed PID
  7504, rc.12 and the updated UI on port 5000.

Archive documentation remains its build-time snapshot. Final handoff receipts
are recorded in the source documentation without modifying historical ZIPs or
folders. Operator and other-PC acceptance remain pending; the known historical
Windows JSON/file-sharing intermittencies are not declared resolved.

This work does not approve a stable deployment or GitHub publication. Preserve
all historical folders/ZIPs and the private active data. The new evaluation
portable has its own rc.12 folder, ZIP and SHA-256 and excludes private DBs,
JSON, snapshots and diagnostics. Verify service ownership before restarting port 5000.
