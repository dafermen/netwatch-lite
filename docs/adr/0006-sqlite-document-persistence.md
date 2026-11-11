# ADR 0006: Transactional SQLite Document Persistence

- Status: Accepted; implemented, pilot-validated and activated locally with explicit
  owner approval on 2026-11-10. Stable-deployment approval remains separate.
- Date: 2026-11-10.
- Supersedes the storage-engine choice in [ADR 0001](0001-local-json-persistence.md),
  not the public JSON/API contracts.

## Decision

Use Microsoft.Data.Sqlite with schema version 1. Store existing logical JSON
documents in `documents(path PRIMARY KEY COLLATE NOCASE, payload BLOB,
updated_utc)`, with `migration_sources(path PRIMARY KEY, sha256)` recording the
immutable import baseline. Each profile remains a self-contained aggregate:
settings, ordered devices/checks, protected/custom types and peripheral catalog/
assignments. Other aggregates are registry/selection, themes, history, errors and
integration settings. Existing repository names remain for API/source compatibility;
their persistence goes through LocalDataStore.

This compatibility-first schema deliberately avoids inventing new device/run IDs,
flattening history, dropping unknown fields during migration or imposing unique
run IDs. It does not promise relational report-query acceleration: history is
still projected from a bounded document. Future indexed projections need their
own schema migration and reconciliation tests.

Document replacement and previous-version backup commit in one transaction.
Migration imports all source documents in one transaction, validates integrity,
counts and exact bytes, checks unchanged sources and promotes a new database
without replacement. Schema versions newer than the application are rejected.
SQLite uses its default durable rollback journal and bounded busy timeout, not
shared-cache dirty reads. One application/maintenance process owns a content root.

## Compatibility And Cutover

Provider `auto` uses an existing database, retains existing JSON when no database
exists, and initializes SQLite only on a clean installation. `json` is an explicit
compatibility/rollback mode; `sqlite` refuses to ignore existing JSON without an
explicit offline migration. JSON import/export and HTTP endpoints remain stable.

Offline migration backs up known documents privately, retains all original JSON
and records source hashes. Repeating an identical migration does not reimport or
overwrite subsequent database writes; a changed source or unrelated database is
rejected. JSON rollback export writes a new directory with current database
documents; switching to untouched old JSON alone would lose post-cutover edits.
Backups use SqliteConnection.BackupDatabase, not a live database file copy.

## Consequences

SQLite, journal/sidecar files, leases, private backups/exports and migration
evidence must be ignored and excluded from publishing. Windows x64 portable
validation must exercise the native SQLite library and a neutral first run.
Network-shared folders, multiple app instances, encryption, identity/SSO and
automatic failover are not supported by this decision. A real-data pilot and
operator/other-PC acceptance remain distinct from synthetic regression.

References: [Microsoft transactions](https://learn.microsoft.com/en-us/dotnet/standard/data/sqlite/transactions),
[Microsoft backup](https://learn.microsoft.com/en-us/dotnet/standard/data/sqlite/backup),
[provider package](https://www.nuget.org/packages/Microsoft.Data.Sqlite/8.0.28).

## Context And Alternatives

The JSON adapters preserved compatibility but required Windows atomic-file
replacement and exposed multi-document operational complexity. A relational
rewrite would require inventing identities and flattening legacy runs without
current evidence that it improves the main inventory workflow. Retaining JSON
as the default forever would not fulfill the requested SQLite persistence.
The chosen document model provides transactional durability and a reversible,
byte-preserving migration while retaining JSON as an explicit compatibility mode.
