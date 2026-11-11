# 0004 - Profile-Scoped Device Types

## Status

Accepted - 2026-11-07.

## Context

The original fixed five device types do not cover classifications such as web
applications. Workstation has special peripheral behavior; old keys and existing
records must remain meaningful. Support-group JSON is the existing portable
configuration ownership boundary.

## Decision

Store a `deviceTypes` ID/name catalog in each profile. Missing legacy fields
receive independent five-type defaults. Protect all original IDs and names;
only the workstation key enables peripheral behavior. Allow custom display-name
edits and prevent deletion of referenced types, including disabled devices.
Carry catalogs through row edits, profile copies and config import/export.

Use a dedicated catalog-only endpoint with captured profile identity, a
normalized-catalog revision and fresh inventory reads under the existing
repository write lock. Write only to the captured profile path via atomic
replacement. Return conflicts for stale catalog/profile editors instead of
accepting a stale full-inventory snapshot.

## Consequences

No new database/file or dependency is needed. Types are not shared globally;
copy a profile to carry its custom catalog. System labels cannot be localized
or renamed through this feature. Custom types do not select monitoring checks
or inherit workstation capabilities. Whole-config replacement and independent
profile switching retain their existing concurrency boundaries. Multiple
writer processes remain unsupported. Downgrades require compatible backups.

## Alternatives Considered

- A global type file would introduce cross-file migration/reference ownership
  and make profile export/import incomplete.
- Editable legacy keys could disable workstation inventory or orphan data.
- Inferring type behavior from labels/categories would be ambiguous.
- Posting the catalog's original full configuration could overwrite inventory
  changes made by another editor; catalog-only mutation avoids that new risk.
