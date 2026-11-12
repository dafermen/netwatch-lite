# Inventory Filters And Exact Execution

## Shared Filters

Dashboard and Configuration combine search, Facility, Device Type, Category,
status and monitoring participation with AND. Catalog IDs and operator-entered
names are never translated or inferred. Search includes names, IP, hostname,
Facility/category, Location, Notes, website shortcut and each HTTP check URL.
It works before monitoring; Pending is not an outage. Paused items are neutral
and excluded from checks and availability. Dashboard defaults to enabled;
Configuration defaults to all participation states so paused records stay manageable.

Filter changes do not write data or start checks. Clear resets all facets.
Unknown/removed selections remain unavailable rather than becoming All. Zero
matches disable Run selection. Configuration filters reveal their parent groups.

## Execution (rc.14 And Later)

Every modern UI run captures exactly the **visible enabled inventory records**:

| Action | Additional intersection |
| --- | --- |
| Main/toolbar Run selection | None; Device Type alone is sufficient |
| Facility Run | That facility |
| Category Run | That facility/category |
| Row Run | That exact inventory row |
| Run Failed | Failed records in the current selection |
| Automatic monitoring | The same filters at each interval |

This supersedes rc.13 presentation-only search/status and global automatic runs.
Clear filters for a complete enabled-inventory run. Full Check/Ping Only changes
the checks, not the targets. Ping Only does not validate HTTP application health.

The browser obtains a fresh `/api/monitor/inventory` snapshot and posts opaque
keys to `/api/monitor/plans`. The backend validates profile/revision, Enabled and
type/facility/category. Plans are single-use, expire after two minutes and are
bounded to 128 pending plans. The execution lock is acquired before consumption.
Expired/reused/stale/unknown/paused scopes never fall back to global. Empty plans
mean zero targets; the UI does not start them. Changed inventory requires review
of the refreshed view and a new click before probing.

Filters are frozen during execution and cannot retarget it. Partial runs keep
unselected measurements. Last execution shows actual checked records/mode/targets/
outcomes and opens completed groups. The receipt is local session state; Reports
and Diagnostics consult persisted history.

## Configuration And Pausing

Normal and Bulk Edit share the same filters. Group by Facility or Device Type
changes only presentation, remembered per browser. Original row indexes and
stored grouping/classification remain unchanged. Draft-discard guards apply when
changing filters/grouping/language would replace unsaved edits.

Monitoring switches use a narrow profile/revision-checked update of the existing
`enabled` property only. They never delete the item, change checks, clear private
inventory or automatically probe. Bulk retains its explicit per-row Enabled/save
workflow. Resume restores participation.

## Compatibility

No SQLite migration or old-history rewrite. Optional result `inventoryKey` is a
per-snapshot identity, not a persistent ID; scope `selectionCount` records count,
not search text/private Notes/Command. Ordinals separate identical records. Legacy
results join only unambiguous inventory identities. Changed definitions invalidate
their measured browser projection instead of showing stale health.

Legacy API requests without `selection` retain prior server scope semantics.
A present invalid/empty token is rejected. Deploy matching frontend and backend,
not new static assets over an old binary. See [API](API.md),
[diagnostics](DIAGNOSTICS.md), [languages](UI_LANGUAGES.md) and
[validation](VALIDATION_MULTILINGUAL_2026-11-12.md).
