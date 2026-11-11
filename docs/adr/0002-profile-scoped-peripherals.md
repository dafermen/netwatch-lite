# Profile-Scoped Peripheral Inventory

## Status

Accepted for the local implementation on 2026-11-06.

## Context

The application already maintains independent support-group inventories and
copies/imports/exports them as complete JSON documents.

## Decision

Printer/scanner catalog entries live in the optional `peripheralCatalog` array
of each support-group configuration. Workstation assignments reference stable
catalog IDs in that same document. Both are validated/persisted atomically by
the existing configuration repository and travel together on export/import and
profile copying.

## Consequences

This keeps references self-contained and preserves the existing independent
profile model without cross-file catalog transactions. Each profile maintains
its own model definitions. A future shared enterprise catalog requires an
explicit migration and cross-profile reference policy.

Device types are explicit, optional and independent of category names. Missing
inventory means unrecorded, not absence. The data describes operator-recorded
assets and does not alter monitoring checks or health calculations.

## Alternatives Considered

A global catalog would require cross-profile reference ownership and a
multi-file import/recovery policy. That scope is deferred until a shared
enterprise inventory is explicitly requested.
