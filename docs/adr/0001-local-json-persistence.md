# ADR 0001: Local JSON Persistence

## Status

Accepted

## Context

NetWatch Lite is an internal, portable monitoring tool whose current scope does
not require a database or multi-instance distributed writes.

## Decision

Store configuration, support groups, themes, monitor history, error records,
and integration settings in local JSON files managed by dedicated repository
services.

Operational JSON files remain private runtime data. Source control and portable
release artifacts include only generic sample data.

## Consequences

- The application remains simple to deploy and inspect.
- Backups can copy local files while writes are stopped.
- Repository validation and compatibility are critical.
- Multiple application instances must not share the same files without a
  future distributed coordination design.
- Large histories may eventually require retention or database migration.

## Alternatives Considered

- Embedded database such as SQLite.
- External relational database.
- Remote configuration and reporting services.

These alternatives add operational complexity that is not justified by the
current internal MVP scope.

