# Dashboard Device Type And Execution Scope

## Device Type

Device Type sits immediately before Category in the Dashboard toolbar. All
device types is the default. Options come from the active support group's
catalog, including protected types and custom names; absent legacy classifications
use Not specified. This is independent of Category and never inferred from it.

Changing the selection filters pending and checked inventory and updates counts.
It combines with Facility, search and the Show All/Online/Offline/Problems view.
It does not save configuration, start checks or write history. Disabled inventory
does not enter Dashboard. Clear filters also resets Device Type and Category.

Facility choices remain available even when a selected type has no devices there.
The selection is retained, zero/no-match results are shown, and the scoped Run is
disabled. The application must not silently switch to all facilities in that case.
Category options are scoped by Facility and type; a no-longer-valid Category is
cleared and Run Group stays disabled until another category is selected.

## Execution Rules

| Action | Scope |
| --- | --- |
| Run Facility / Run All Facilities | Selected type and requested Facility, or all Facilities |
| Run Group / Category header Run | Selected type, Category and requested Facility |
| Device row Run | That row's type, Facility, Category, name and address |
| Run Failed | Failed records in the visible Facility/type scope |
| Global automatic monitoring | All enabled inventory; view filters do not change its global scope |

Full Check / Ping Only chooses which checks run, not a different classification
scope. Search and status buttons are presentation filters, not a list of targets
for Run Group. Individual row Run remains the way to check one found device.
The type selector is disabled while a stream is running. Clearing view filters
does not retarget an execution already captured by the server.

The stream accepts optional `deviceType=<catalog-id>`, intersected server-side
with other scope parameters before executing probes. Unknown/removed type IDs
match zero devices; they never fall back to all devices. A selected type removed
by another editor remains explicitly unavailable until cleared or changed.

## Results And Compatibility

New monitor results capture `deviceType`; a type-scoped run also captures the
optional type ID in history scope. Dashboard identity includes type so equal
names/addresses in different classifications do not share measured results.
This does not change the existing historical report identity or invent a type
for old executions. Legacy results without classification join current inventory
only when the old identity has one unambiguous match.

Existing API requests without the parameter retain global/previous scope behavior.
Old history remains byte-preserved; optional null type fields are omitted when
read, and there is no database/schema migration. JSON and SQLite stay supported.
Back up before using an older binary: versions without classification snapshots
can discard that optional metadata when rewriting newer history.

See [device types](DEVICE_TYPES.md), [API](API.md), [testing](TESTING.md) and
[delivery validation](VALIDATION_DASHBOARD_TYPES_2026-11-11.md).
