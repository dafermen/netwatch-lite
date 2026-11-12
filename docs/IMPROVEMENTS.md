# Improvement Backlog

Last updated: 2026-11-12

User-reported improvements are recorded here with stable IDs. A pending entry
is not approval to implement it. Keep implementation and validation status
explicit; technical/release risks remain in [CURRENT_STATUS.md](../CURRENT_STATUS.md).
The user requested coordination on 2026-11-09. Delivery order and cross-cutting
gates are in [ROADMAP.md](ROADMAP.md); queued work is not implemented work.

## IMP-008 - Multilingual Monitoring And Diagnostics

- Authorized: 2026-11-11; local development, regression and a new portable only.
  GitHub publication is explicitly on hold.
- Implemented: English-default/Spanish UI, inclusive device/website entry,
  Configuration shared facets and Facility/Device Type grouping, Type-only Run,
  exact filtered manual/automatic monitoring, pause/resume, last-execution detail,
  and internal/probe diagnostics with private query/export.
- Validation: Completed locally: 416 .NET, 424 full browser and 80 final targeted
  passes; eight monitoring/six storage mutants, native rc.14 ZIP/folder/SHA and
  private-data/historical preservation verified. Owner/other-PC acceptance remains.
- Compatibility: No schema migration or private-data rewrite; legacy calls with
  no exact selection token retain previous behavior. Old portables are immutable.
- Evidence/limits: [Current validation](VALIDATION_MULTILINGUAL_2026-11-12.md).

## IMP-009 - Supported Runtime Before Stable Deployment

- Status: High-priority follow-up, not authorized/implemented as a major upgrade.
- Found: 2026-11-12. .NET 8 support ended on 2026-11-10, per
  [Microsoft](https://dotnet.microsoft.com/en-us/platform/support/policy/dotnet-core).
- rc.14 keeps the target for compatibility; portables pin the final 8.0.34 patch.
  This does not restore support. No machine-wide SDK/runtime was replaced.
- Next: separately validate a supported LTS target, patching, native portable,
  storage compatibility and rollback before stable deployment.

## IMP-007 - Dashboard Device Type Filter (Historical rc.13)

The rc.13 global automatic/presentation-only semantics below are historical;
IMP-008 supersedes them for the current UI.

- Authorized: 2026-11-11, including GitHub source and new portable publication.
- Status: Completed 2026-11-11; 373 .NET/356 browser passes and native rc.13
  folder/ZIP/SHA validated. Source and prerelease are published, all four remote
  CI jobs passed and the downloaded ZIP/checksum matched. Other-PC acceptance
  remains pending.
- Scope: Catalog-backed selector before Category, read-only view filtering and
  server-enforced scoped executions, exact typed identities and Clear filters.
- Compatibility: No schema migration, no old-history rewrite, no automatic checks
  on selection; automatic global monitoring remains global.
- Evidence: [Dashboard type validation](VALIDATION_DASHBOARD_TYPES_2026-11-11.md).

## IMP-006 - URL Save Visibility And Compact HTTP Form

- Reported/authorized: 2026-11-11; edits/copies report success but disappear.
- Status: Completed 2026-11-11, with 357 .NET / 332 browser passes and verified
  native rc.12 folder, ZIP and SHA-256. Other-PC acceptance remains pending.
- Reproduced: Configuration did not search `checks[].url`; an old search could
  exclude a renamed row, and successful saves collapsed its parent groups despite
  the API retaining the record. This is not evidence of SQLite data loss.
- Acceptance: URL search, visible saved row/copy, pending Dashboard visibility,
  reload/restart persistence, original/copy independence, failure/retry, disabled
  records and all existing CRUD regressions across JSON/SQLite and desktop/mobile.
- HTTP-only forms hide Location/Command while retaining their values; mixed
  checks restore them. No migration or automatic monitoring is introduced.
- The broader CRUD check also reproduced and corrected a Reports deletion/read
  overlap. A controlled delayed-write regression guards the SQL refresh order.
- Evidence: [URL CRUD validation](VALIDATION_URL_CRUD_2026-11-11.md).

## IMP-001 - Reveal Configuration Search Matches

- Status: Completed 2026-11-10 in Normal/Bulk, with full desktop/mobile JSON/
  SQLite regression and portable rc.8 delivery; see work-order validation.
- Reported: 2026-11-09.
- Area: Configuration (`/config`), Devices search and collapsed groups.
- Report: Searching for a workstation finds a match, but its parent panel stays
  collapsed. The device is hidden, making the search look unsuccessful.
- Requested outcome: Automatically expand the Facility and category groups
  containing matches so the found devices are immediately visible.

Acceptance checks:

1. A nonempty search with matches reveals the matching device rows and opens
   their collapsed parent groups.
2. A search without matches shows the existing explicit no-results state.
3. Clearing the search restores the normal Configuration collapse behavior.
4. Manual collapse controls and Edit/Copy/Delete remain usable, without changing
   inventory data or starting monitoring.
5. Verify desktop/mobile and Bulk Edit; clearing Bulk search restores its previous
   collapse state. Editing stays disabled through initial profile/config loading.

Implemented without saving inventory or starting monitoring. See
[form/search](DEVICE_FORM.md) and [validation](VALIDATION_WORK_ORDER_2026-11-10.md).

## IMP-002 - Migrate Local Persistence To SQLite

- Status: SQLite schema 1/adapters/offline migration/backup/export implemented.
  Private-copy pilot passed; user-approved local activation completed on 2026-11-10.
  SQLite is active on port 5000; original JSON remains intact. Final portable/
  release evidence is recorded in CURRENT_STATUS.
- Requested: 2026-11-09.
- Area: Local persistence, data migration and portable compatibility.
- Current design: [ADR 0006](adr/0006-sqlite-document-persistence.md) supersedes the
  storage-engine choice. Clean auto installs use SQLite; existing JSON is preserved
  until explicit offline migration. JSON import/export remains supported.
- Requested outcome: Introduce SQLite as the local persistence layer while
  retaining existing data and JSON import/export compatibility.

Acceptance checks:

1. Document the data model, storage adapter, schema versioning and architectural
   decision before cutover. Do not describe SQLite as active before it is implemented.
2. Back up and safely migrate device inventories, catalogs/assignments, profiles,
   themes, history, errors and integration settings. Preserve IDs, relationships
   and existing fields, with repeatable migration and a tested rollback path;
   never delete/overwrite the original JSON files as an unverified migration step.
3. Keep configuration JSON import/export and existing API/UI workflows compatible.
   Preserve the self-contained portable workflow without bundling private databases,
   sidecar files, backups or operational data.
4. Validate transactional writes, integrity, concurrency, backup/restore and schema
   upgrades. SQLite must not be assumed to resolve the separately tracked write
   failures or HTTP timing intermittencies without evidence.
5. Add migration/integration/contract/regression tests and measure history-query
   performance and resource usage before approving deployment.

The initial 2026-11-09 note did not change storage. The subsequent implementation
adds Microsoft.Data.Sqlite, maintained native bindings and schema 1; private pilot
matched eight API snapshots and verified exact idempotence/rollback. See
[storage](STORAGE.md) and [validation](VALIDATION_WORK_ORDER_2026-11-10.md).

## IMP-003 - Wireless/Cabled Peripheral Links

- Status: Implemented, regression-tested and delivered as local portable rc.7
  (folder/ZIP/SHA-256). This is not stable-deployment approval.
- Requested: 2026-11-09.
- Scope: Per-printer/scanner Link type (Not recorded, Wireless, Cabled), independent
  of USB/Network/Other, with legacy-safe preservation and read-only inventory display.
- Evidence: [Peripheral link validation](VALIDATION_PERIPHERAL_LINKS_2026-11-09.md).

## IMP-004 - Clear Names And Dynamic Device Form

- Status: Implemented 2026-11-10 with check-driven fields, new-record presets,
  preserved existing identities/checks and configured-check replacement confirmation.
- Discussed/coordination requested: 2026-11-09.
- Scope: Distinguish network target, website shortcut and monitored HTTP URL;
  adapt visible fields to device classification and actual checks, preserving data.

Acceptance targets:

1. Clearly distinguish Network target (IP / hostname), Open website link (optional)
   and URL to monitor; group website/command actions under Shortcuts.
2. Show common inventory fields on every type and printer/scanner inventory only
   for Workstation. Drive network/HTTP fields by checks, not type names alone.
3. Offer HTTP-only creation without an unwanted default Ping; respect existing
   checks on edit and retain custom types and protected legacy IDs.
4. Never silently erase hidden fields or identity/history links. Confirm any
   incompatible type change and preserve the draft if the operator cancels.
5. Keep API/JSON/profile/copy/bulk compatibility and verify desktop/mobile,
   keyboard, validation, clearing, failed-save and legacy workflows.

See [form/search](DEVICE_FORM.md), the roadmap and current work-order validation.
Wireless/Cabled remains included from rc.7; these changes are part of rc.8 work.

## IMP-005 - Structured SQLite Queries And Data Maintenance

- Status: Completed locally 2026-11-10: source/pilot validated, native rc.11
  folder/ZIP/SHA delivered and owner-authorized schema-2 activation on port 5000.
  This is not stable-deployment approval; evidence/remaining gates are in CURRENT_STATUS.
- Scope: Relational history/inventory projections, SQL report filters/aggregates/
  pagination, configurable retention with pre-prune exports, private before/after
  change history, managed consistent backups and offline restore to a new folder.
- Preserve original document bytes during upgrade, duplicate legacy IDs, public
  API/JSON contracts, profile isolation and immutable portable history.
- Verify transactional rollback/projection consistency, legacy enum/casing,
  bounded pages with complete totals/exports, retention archive failure, managed
  backup ownership/rotation and restore. No actor, encryption, multi-instance
  support, automatic monitoring or GitHub publication is implied.
- Design: [ADR 0007](adr/0007-sqlite-relational-projections.md).
