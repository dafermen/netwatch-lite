# Peripheral Inventory Validation - 2026-11-06

## Delivered Scope

Profile-scoped printer/scanner manufacturer/model catalog, explicit optional
device type, and workstation assignments with separate unrecorded/none/assigned
states. Assignments record connection, optional identifier, address and notes.
Catalog CRUD/filtering, workstation editing and configuration/dashboard details
use the existing configuration API and file. No new runtime file or dependency
was introduced. See [PERIPHERALS.md](PERIPHERALS.md) and
[the architecture decision](adr/0002-profile-scoped-peripherals.md).

## Automated Evidence

- 85 passing .NET tests: 11 unit, 7 integration and 67 HTTP contract tests.
- 40 new contract cases exercise legacy categories/defaults, complete inventory
  round trips, row update preservation, profile copying, model deletion rules,
  and rejection on both save/import of null, duplicate, invalid-kind/type/state,
  missing model, wrong connection/address and oversized assignment collections.
- 16 passing browser workflows across desktop 1440px and mobile 390px, including
  six new peripheral workflows. They exercise model CRUD/filtering/duplicate
  rejection, multiple USB/network/scanner assignments, copy/bulk edit/export,
  in-use protection, safe rendering of notes and type-change confirmation.
- No operational inventory is used by tests. Each browser scenario has a
  separate content/data root and dynamically assigned loopback port.
- Browser evidence includes catalog, editor and network-assignment screenshots
  under `test-results/`; failure traces/server logs are retained by the runner.
- CI syntax validation includes `wwwroot/peripherals.js`.
- Release build completed with zero warnings/errors; JavaScript syntax,
  documentation links and Git whitespace checks passed.
- A fresh publish included the peripheral script/guide and excluded private
  backups and test tools. The normal service on port 5000 returned HTTP 200 for
  the application, catalog, configuration, script, docs/guide and config API.

Commands are recorded in [TESTING.md](TESTING.md). Evidence directories are
ignored and excluded from publication. Remote CI/publication are not claimed.

## Compatibility And Limits

Existing files and existing ping/TCP behavior remain supported. No device is
reclassified by category. Bulk/row changes, export/import and profile copy keep
catalog references intact. Imported legacy documents remain complete inventory
replacements and reset absent optional data; exports/backups should be retained.

This implementation records expected inventory. It does not detect physical
USB devices, read drivers or assess peripheral health. Network peripheral
addresses are metadata only. Catalogs are independent per support group, not
an enterprise-wide master. Concurrent editing from independent clients follows
the existing full-configuration replacement semantics. Historical monitoring
records do not contain snapshots of the new inventory metadata.

This feature validation does not complete all thirteen deployment quality gates.
