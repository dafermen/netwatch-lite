# Local Storage And SQLite

NetWatch supports SQLite schema 2 and a compatible JSON mode. See
[ADR 0007](adr/0007-sqlite-relational-projections.md), extending
[ADR 0006](adr/0006-sqlite-document-persistence.md), for the model and tradeoffs.
Storage is local and private, not an external inventory integration.

## Selection

`Storage:Provider` accepts `auto` (default), `sqlite`, or `json`.
`Storage:DatabasePath` defaults to `netwatch.db` inside the content root.

- A clean `auto` installation initializes SQLite.
- An existing database is used by `auto`.
- Existing JSON without a database remains JSON until an explicit offline migration.
- Explicit `sqlite` refuses to ignore existing JSON without migration.
- Explicit `json` is available for compatibility/rollback; it does not export newer
  database changes or restore files automatically.

`GET /api/storage` returns the active provider and schema version without exposing
private file paths. JSON import/export in Configuration remains available in both
modes; it transfers the active support-group configuration, not all global stores.
The Integrations form retains the legacy `localJson` source-mode key/path as
reserved integration settings; it does not select or migrate the storage engine.
Use Storage configuration and offline maintenance for that purpose.

## Schema 2 Upgrade And Queries

SQLite schema 2 is separate from compatible JSON document schemaVersion values,
which remain unchanged (for example monitor history schemaVersion 1).

Opening a schema-1 database with the new application creates a verified private
snapshot under `storage-backups/schema-upgrades/`, then transactionally backfills
inventory and monitoring tables without changing original document bytes.
Original casing, BOMs, numeric enums, unknown fields, order and duplicate history
IDs remain preserved. On failure the schema upgrade rolls back. Older binaries
cannot open schema 2: restore the pre-upgrade snapshot into a separate folder.
Take a private-copy pilot and authorize the local upgrade separately from source
tests; do not replace an operator database with a test fixture.

Documents remain the compatible import/export authority. Writes update their
relational projections and audit changes in the same transaction. Inventory IDs
are profile-local surrogate identities; ambiguous legacy identity/order changes
cannot be interpreted as verified asset identity. Current API row indexes stay
compatible. Historical identities remain recorded snapshots, not current inventory.

Reports uses `/api/reports/query` with SQL filters, whole-filter metrics, sorting
and pages of at most 100 records. The browser does not load the full history for
every filter. Exports fetch all matching pages with a shared revision token and
abort if history changes. Exports above 100000 evaluations require a smaller
period. JSON mode retains the compatible client-side report implementation.

## Data Policy, Backups And Change History

Open Configuration > Data & backups. Policy is global, not per support group:

- Retained runs: 1-100000, default 500.
- Retained days: 0-3650; zero disables age pruning (default).
- Export before pruning: enabled by default; failure aborts the history update.
- Automatic backups: enabled for SQLite, default 24 hours/seven automatic copies.
- Backup interval: 1-168 hours; copies: 1-100.

Saving policy does not immediately prune. Limits apply on the next completed run;
removed executions are exported first into private
`storage-exports/history-retention/` when enabled. Explicit clear/delete actions
retain their separate confirmation semantics. Archives are not automatically
deleted: monitor disk usage. Policy persists as `storage-policy.json` in the active
store; it is not a public portable asset.

Back up now creates a new verified snapshot under `storage-backups/managed/`.
The background worker checks every five minutes while the app is running; it does
not run when the app is closed and does not execute monitoring. Rotation removes
only owned automatic snapshots after successfully verifying a new one. Manual,
schema-upgrade and unmanaged backup files are not rotated. Copy backups off the
same disk under your organization's controls; local snapshots are not disaster
recovery against disk loss.

Change history records configuration/inventory fields and before/after values
from successful writes. It has no authenticated actor, is not tamper-proof, and
may contain private Notes/Commands. Migration does not invent historical changes.
JSON mode supports retention policy but not the relational audit/query UI or
managed SQLite snapshots. Keep legacy JSON backup procedures for that provider.

## Offline Migration

Stop the instance using this content root. Application startup and storage commands
acquire `.netwatch-runtime.lock`; a second process fails rather than sharing cached
state. Do not use a network share. Back up before maintenance, test a separate copy
and reconcile the result before choosing operational cutover.

From the project directory after a Release build:

```powershell
dotnet .\bin\Release\net8.0\NetWatch-Lite.dll --contentRoot C:\Projects\netwatch-lite --StorageAction migrate-json
dotnet .\bin\Release\net8.0\NetWatch-Lite.dll --contentRoot C:\Projects\netwatch-lite --StorageAction verify
```

For an extracted portable, use its executable instead of `dotnet ...dll`:

```powershell
.\NetWatch-Lite.exe --contentRoot . --StorageAction migrate-json
.\NetWatch-Lite.exe --contentRoot . --StorageAction verify
.\Start-NetWatch.cmd
```

Migration reads known configured runtime documents and every referenced profile,
including existing previous-version backups. Missing referenced profiles, invalid
JSON, out-of-root/redirected paths or changed source files abort activation. Preserve
the original folder until recovery and operator acceptance are complete. JSON files
outside the content root require a deliberate staging/configuration change first.

Original JSON bytes are copied under a new private `storage-backups/json-<id>/`
directory. A staged database imports all documents in one transaction, verifies
integrity, counts and exact bytes, rechecks source hashes, then promotes without
overwriting a database. Source JSON is never deleted or rewritten by migration.
Repeated identical migration is a no-op, including after database edits; changed
sources or an unrelated existing database are rejected rather than merged.

Migration retains ordered devices/checks, profile-scoped catalogs, Location, Notes,
Command and linkType, as well as themes, history, errors and integrations. Duplicate
legacy run IDs and unknown values are not deduplicated or flattened. Normal API
validation/normalization still applies when an operator subsequently edits data.

## Backup And Reversal

While the service is stopped, create a consistent SQLite backup:

```powershell
.\NetWatch-Lite.exe --contentRoot . --StorageAction backup
```

This uses SQLite's backup API and a new file under `storage-backups/`; it does not
overwrite an earlier backup. `--StorageDestination <new-path>` can select a target.
Never copy a live database without its transactional state.

Restore a verified backup offline into a new directory (never over a live DB):

```powershell
.\NetWatch-Lite.exe --contentRoot . --StorageAction restore-backup --StorageSource C:\PrivateBackups\snapshot.db --StorageDestination C:\PrivateRecovery\netwatch-recovered
```

Restore verifies integrity/foreign keys, creates the stored relative directory
layout and promotes a new database only after validation. Place compatible
application binaries/public assets beside that recovered database before use;
keep the original deployment intact. Validate APIs/counts and an operator sample.
For a schema-1 rollback, use the original schema-1 binary with its pre-upgrade DB.

An advanced private-copy pilot may use `--StorageAction snapshot-readonly` with
explicit StorageSource/StorageDestination: it uses a read-only source connection
and SQLite backup API, not a file copy or an application store on the live root.

To obtain current data for JSON-mode recovery:

```powershell
.\NetWatch-Lite.exe --contentRoot . --StorageAction export-json
```

The export goes into a new private `storage-exports/<id>/` directory with original
relative document paths. Use a new deployment folder, place the exported runtime
documents there in the matching locations and select `Storage:Provider=json` (or
`Storage__Provider=json`). Reconcile Configuration/profiles/themes/history before
operating it. Merely selecting old untouched JSON after cutover loses newer edits.
To restore SQLite, use the verified backup in another deployment folder, with the
service stopped. Preserve the old database and original JSON for investigation.

## Durability And Limits

Document writes and their previous-version backup commit together. Profile create,
copy, rename and delete share a multi-document transaction; failures invalidate
the profile cache. Reads use snapshots. SQLite has a bounded busy timeout; the
application does not promise multi-instance operation, automatic recovery or
network-share support. Schema versions newer than the binary are rejected.

Schema 2 uses relational projections for SQL reads, while compatible writes may
still serialize/reproject a whole aggregate, and projections add storage overhead.
Do not assume unbounded history or
cheap append performance; measure the selected policy/data volume. Files are not encrypted; restrict the folder
with Windows permissions and treat backups/exports as sensitive.

Database/journal/sidecar files, leases, backups, exports and migration evidence
are Git-ignored and excluded from portable publishing. A portable contains only
neutral sample data, runtime/native SQLite libraries and public documentation.
Other-PC acceptance and all [deployment gates](DEPLOYMENT.md) remain separate
from successful synthetic tests or a local migration pilot.
