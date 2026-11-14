# Configuration Recovery

## Import Safely

In Configuration, choose Import JSON and a file (maximum 5 MiB). The first
dialog reviews the active support group and current/replacement counts. Continue
opens a separate final replacement confirmation. Cancel either dialog to leave
saved data and drafts unchanged. Validation/preview never creates a recovery point.

The backend rechecks the profile, complete configuration/history revision and
reviewed file SHA-256. Concurrent edits, profile switches, a changed file or a
repeated commit return 409 instead of overwriting a newer configuration. The
review is not a lock and does not establish authenticated operator identity.

Before replacing configuration, the app saves a full private recovery point:
settings, devices, types and peripheral catalogs/assignments together. Failure to
save that point blocks replacement. Successful import replaces only the active
profile; monitoring history, other profiles, themes and integration settings stay
unchanged. Unsaved drafts are discarded only after the final successful action.

## Review Or Restore

Configuration history lists points for the active support group, newest first,
with timestamp, reason and item count. Use the eye to preview counts and SHA-256,
the download icon to keep a private JSON copy, or restore to review and confirm
twice. Restoration first saves the current configuration as another recovery
point, so the change can be reversed. A stale view must be reopened/reviewed.

Restoration verifies the saved payload's size, hash and configuration validity.
It restores the exact saved document bytes, including unknown fields and UTF-8
BOM; the loaded UI projection is normalized as usual. A later ordinary save can
normalize that document again. An invalid current JSON can be repaired by import:
its raw recovery copy is downloadable but cannot be restored through the UI.

This is **profile configuration recovery**, not whole-database restore. It never
replaces a live SQLite file, replays audit changes or rolls back monitoring runs.
Copying a support group does not copy the original group's recovery history.
Recreating a deleted group with the same name uses a new available ID when the
old ID has recovery history. Retained private vaults are not silently inherited
or deleted; recovery history is associated with the original profile ID.

## Bounds And Storage

- At most 20 points and 80 MiB serialized history per profile; each document is
  at most 5 MiB. No automatic pruning. At capacity, export/delete a chosen old
  point explicitly before another import/restore. Download alone does not free space.
- Deleting a point requires confirmation and changes neither current inventory
  nor monitoring history. Manual/upgrade database backups and portable archives
  are never touched. Protect downloaded recovery files like the active inventory.
- SQLite schema 2 stores the private vault as a document. Snapshot and profile
  replacement commit in one existing transaction; audit/projection changes remain
  consistent. No schema migration is needed.
  Recovery takes repository reload, profile, then database locks, matching group
  mutations rather than holding a database writer while waiting for a profile.
- JSON writes the vault atomically **before** replacing the configuration. These
  two files cannot form one filesystem transaction: a failed/cancelled second write
  may leave an extra valid pre-change point, but must not remove the recovery copy.
- Logical path: `configuration-versions/<SHA256(profile-id)>.backup.json`, relative
  to the content root (a database document with SQLite; a file with JSON). Offline
  JSON migration, database snapshots and JSON rollback exports preserve this data.
  Exclude it from Git/portables. No credentials, browser sessions or cookies belong
  in configuration; manual fields/URLs/notes can still contain sensitive data.

The legacy `/api/config/import` remains API-compatible and also creates a recovery
point, but does not display dialogs. The modern UI uses preview/commit endpoints.
The confirmations are accident prevention, not an authorization boundary; keep
NetWatch behind trusted internal access controls.

See [API](API.md), [storage](STORAGE.md), [operations](OPERATIONS.md) and
[validation](VALIDATION_RECOVERY_2026-11-13.md).
