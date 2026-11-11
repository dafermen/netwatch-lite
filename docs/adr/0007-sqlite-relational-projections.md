# ADR 0007: Transactional SQLite Projections And Managed Retention

- Status: Accepted; source/pilot/native rc.11 validated and owner-authorized local
  schema-2 activation completed on 2026-11-10. See CURRENT_STATUS; stable deployment remains separate.
- Date: 2026-11-10.
- Extends [ADR 0006](0006-sqlite-document-persistence.md); JSON/API compatibility remains mandatory.

## Decision

Context: storing compatible documents in SQLite already provides transactions,
but full browser history reads and fixed retention limit report growth. The owner
approved structured query/inventory, retention, audit and backup improvements.

SQLite schema 2 adds relational inventory profiles/devices/checks/types/models/
assignments, monitoring runs/results/checks and local audit changes. Original
documents remain the import/export authority; relational projections and audit
events update in the same transaction as their document. This is not a second
independently editable store. Foreign keys protect ownership; legacy duplicate
catalog/run keys and unknown values are retained, not deduplicated to fit a key.

The schema upgrade creates a verified schema-1 backup before changing tables.
Projection backfill accepts existing JSON casing, numeric enums, BOMs, ordering,
unknown fields and duplicate historical IDs without rewriting document payloads.
Upgrades roll back on failure. Newer schema versions remain unsupported by older
binaries: restore the pre-upgrade snapshot into a separate folder for rollback.

SQL report endpoints return bounded pages, whole-filter counts/aggregates and a
revision token for consistent multi-page exports. Date/profile/scope/device
indexes are available; runtime measurements, not the presence of indexes, decide
whether a query is faster. The JSON provider retains the legacy Reports adapter.

Inventory surrogate IDs belong to a profile. Synchronization matches unchanged
records, then name/address, then address, and same-position edits in equal-sized
lists. Exact duplicates retain separate IDs. These IDs are not verified asset
identities; an ambiguous legacy bulk replacement that changes identity and order
simultaneously cannot be reliably reconciled without an explicit external ID.
Historical device identities remain snapshots and are never guessed from today's
inventory. Existing row-index APIs and JSON shape are unchanged.

Global data policy controls maximum runs, optional age limit, pre-prune exports,
automatic-backup interval and managed copies. Saving a policy does not delete
history; retention applies on the next completed execution. Defaults preserve
the 500-run count limit, with no age pruning and export-before-prune enabled.
An archive failure aborts the history update. Archives are private and are not
automatically deleted. Operators must manage their disk usage.

Managed automatic snapshots use SQLite's backup API and integrity/foreign-key
checks. A successful new snapshot precedes cleanup of owned automatic files;
manual and schema-upgrade backups are never pruned by that routine. A five-minute
worker checks whether a backup is due (24-hour interval/seven copies by default).
It runs only while this app is running and never starts monitoring. Restore is
offline into a new directory, not an HTTP operation or an overwrite of live data.

Audit records contain changed fields and before/after values for inventory and
configuration writes. They are private, may contain Notes/Commands, and are not
monitoring results. No authenticated actor or tamper-proof audit guarantee is
claimed. Existing Windows-folder access and internal-network restrictions apply.

## Limits

These are consequences of the compatibility-first decision, not unimplemented
authentication or an invitation to edit relational projections directly.

Document-compatible writes may still serialize/reproject a whole aggregate.
Schema 2 does not promise cheap unlimited history appends, automatic archiving
recovery, multi-instance editing, encryption, identity/SSO or network-share use.
Backups/exports/portables are distinct; private databases never enter a portable.
Stable deployment and other-PC acceptance require their separate quality gates.

## Alternatives

A full canonical relational rewrite would change more identity/import contracts
at once. Keeping browser-only filtering would not implement the approved bounded
SQL reporting. Transactional projections allow incremental improvement with exact
legacy-document reconciliation and a verified restoration path.

References: [SQLite query planning](https://www.sqlite.org/queryplanner.html),
[backup API](https://www.sqlite.org/backup.html).
