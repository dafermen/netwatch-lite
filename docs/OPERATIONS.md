# NetWatch Lite Operations

## Start And Health Check

See [administration](ADMINISTRATION.md) for the searchable Support Groups/Themes
lists and confirmation rules. Selecting a record does not activate it. Theme
color edits are drafts until Save Colors; naming operations save immediately.
Failed library reads require retry and do not offer editable default records.

Run the shared local service on port 5000:

```powershell
dotnet run --urls http://localhost:5000
```

If tests or startup select an incompatible per-user runtime, use the
process-scoped instructions in [TROUBLESHOOTING.md](TROUBLESHOOTING.md).

Confirm:

1. `http://localhost:5000` returns HTTP 200.
2. `http://localhost:5000/docs/` returns HTTP 200 and its CSS/JavaScript assets load.
3. Dashboard assets load without browser errors.
4. `GET /api/config` returns a controlled response.
5. A test monitor execution completes or returns the expected controlled
   device failures.

## Dashboard Scope And Filters

Dashboard search works before checks and after partial runs. Not checked is
not an outage; Offline/Problems require actual results. Group runs respect the
selected facility, while All Facilities applies the category across the active
support group. The search textbox changes display only, not execution scope.

The filter-reset icon beside search restores All Facilities, Show All, empty
search and no group selection. It retains measured results and history and
does not start monitoring. Run in a device row checks only that row, even if
it is already healthy. Global/facility/group buttons keep their own scope.
Facility/category header bands toggle their sections; Run, links and other
interactive controls do not toggle them. The arrow buttons work with keyboard.

## Reports

Configuration > Data & backups controls global run/age retention, pre-prune export,
automatic SQLite snapshots and local change history. Back up now verifies a new
manual snapshot; automatic rotation never removes it. Policy changes apply at
the next completed run, not on Save. Keep private archives/backups off public
shares and monitor disk usage. Restore offline into a new folder, with API/sample
validation before reuse. See [SQLite operations](STORAGE.md) for exact commands,
upgrade backup and rollback restrictions.

Use Summary, Runs and Devices for stored observations, with shared period,
historical support-group/Facility/category and result/mode filters. These views
do not start monitoring. Healthy evaluations is a recorded sample ratio, not
continuous uptime; unknowns and missing ping latency remain neutral.

Open evaluation details for check messages and device/execution history. Export
matching CSV/JSON from the menu and protect those files as private operational
data. Delete execution is a confirmed secondary action; ambiguous legacy IDs
are read-only in the UI. See [reports](REPORTS.md) for exact scope, time and
compatibility rules. Failed reads clear stale data and require Refresh.

## Device Location

Location appears immediately before Notes in Add/Edit Device. Enter the physical
position within the selected Facility, for example `Floor 2 - Office 204 - Desk 3`.
Facility remains the site/group used for monitoring; Location does not replace
it or change Facility/category grouping or execution scope.

The field is optional, single-line and limited to 200 characters. Configuration
and Dashboard show it before Notes and include it in text search before/after
checks. Current Add/Edit/Advanced/copy, unrelated Bulk Edit changes and private
JSON/profile workflows retain it. Clearing it does not affect Notes or Facility.
Missing/blank legacy values stay unspecified; existing Notes is not rewritten
or automatically extracted. No location master, discovery or geolocation is used.

Location remains private configuration/backups/exports, not monitoring results,
history or report rows. Portable rc.6 first includes it; rc.5 and older archives
remain unchanged. Back up privately before using older binaries/clients, which
may drop this field when saving.

## Device Notes

Use Notes in the Add/Edit Device form for the person/team using the device or
other manual observations. Use Location above it for floor/office/desk. For example:

```text
Used by: Front desk
```

The field is optional, multiline and limited to 2000 characters. Configuration
and Dashboard offer a compact Notes disclosure with keyboard support; both
text searches include its content before/after monitoring. Search filters
display only and do not change group-run scope. Notes does not change device
health, probe targets or settings.

Normal/Advanced editing, device/profile copying, unrelated Bulk Edit changes
and configuration import/export retain the field. Clear it in the editor to
remove it; blank/missing legacy values mean no notes. All device types may use
it; no separate catalog or automatic user/location detection is introduced.
It is not a verified identity or a responsibility assignment workflow.

Treat names and locations as private inventory; do not store passwords/tokens.
Notes stays in configuration/backups/exports, not monitoring results/history or
report rows. Back up privately before using an older binary/client, which may
drop this field on save. Portable rc.5 first includes it; rc.4 is unchanged.

## Device Command Clipboard

Configure the optional Command field beside Website URL in the device editor.
For example, a Windows Run/CMD command with an executable path containing spaces:

```text
"C:\Program Files\Remote Client\guest.exe" "host.example.test"
```

Dashboard Command copies exactly the stored text, with Copied/Copy failed
feedback. It never runs it, checks executable existence, substitutes hostnames,
installs software or opens a local protocol handler. Paste/review/run it in
the operator's own Windows session. Device copying preserves the literal
command, so review its target host when copying a device. Use the normal or
advanced device form to edit it; unrelated Bulk Edit changes preserve it.

The preferred [Clipboard API](https://developer.mozilla.org/en-US/docs/Web/API/Clipboard/writeText)
requires a browser-permitted secure context (HTTPS or trusted localhost).
A text-selection/copy fallback is attempted if unavailable/denied; it can also
be blocked. Failure is reported, not presented as a successful copy. Clipboard
permissions and OS/cloud clipboard history remain outside this application.
Do not include credentials or paste commands you do not trust.

Commands are private configuration and export/backup data, not monitoring
results/history. Legacy devices without a command remain unchanged. Updated
clients are required to preserve this new optional field on future edits.

## Runtime Data

The [device-type catalog](DEVICE_TYPES.md) is stored in the same support-group
configuration as devices/peripherals. Copy/export/back up that configuration
as a unit. No separate type master file needs deployment. Old files receive
the original protected defaults on read; custom-type profiles require the new
binary and should not be saved through older clients. Catalog-edit conflicts
require an explicit reload, not repeated submission of a stale revision.

For web applications, configure HTTP/HTTPS checks as described in
[HTTP_CHECKS.md](HTTP_CHECKS.md). Tests originate on the backend machine, so its
DNS, routing, proxy and certificate trust apply. Full/Auto Refresh includes
these probes; Ping Only does not. No independent background scheduler or
external notification delivery has been added. HTTP check definitions are
saved with their profile and included in private configuration backups.

Operational data is local and must not be committed:

- `Data/config.json`
- `Data/config.backup.json`
- `Data/regions.json`
- `Data/regions/`
- `Data/themes.json`
- `Data/monitor-history.json`
- `Data/app-errors.json`
- `Data/integrations.json`

Equivalent root-level runtime files are also private.
Printer/scanner catalogs and assignments are inside those same support-group
files, so back them up/export them with the configuration. They are private
inventory data; there is no separate catalog file to deploy or migrate.
Sibling `*.backup.json` and `.netwatch-*.tmp` files are private as well; they
are ignored by Git and excluded from publish output.

## Backup And Restore

For SQLite, follow [storage maintenance](STORAGE.md): stop the service, use the
backup command/SQLite backup API, verify integrity and restore into a new folder.
JSON rollback must export current database documents rather than simply reusing
stale pre-migration files. `GET /api/storage` identifies the active provider.
The database, sidecars, lease, storage-backups and storage-exports are private.

In JSON compatibility mode:

JSON repositories write a complete temporary sibling, flush it, then replace
the destination atomically. An existing destination is retained as
`<name>.backup.json` (for example, `monitor-history.backup.json`). The backup is
the previous successful version, not a complete version history. Serialization
failure or cancellation before replacement leaves the destination unchanged.
Short Windows sharing/lock violations receive bounded cancellation-aware retries;
other filesystem failures still surface without silently changing durability.
Profile files and the profile registry are separate files, not one transaction.
Run only one writer instance per data directory.

1. Stop writes by stopping the application.
2. Copy runtime JSON files to an access-controlled backup location.
3. Validate that backups do not contain unexpected credentials or tokens.
4. Restore into the configured content/data directory.
5. Start the application and complete configuration, history, and dashboard
   smoke checks.

After a process crash, inspect any leftover `.netwatch-*.tmp` files privately.
They are never the authoritative configuration; remove them only with the app
stopped after confirming the destination and backup are intact.

## Logging

ASP.NET Core logs are written through the configured logging providers.
Controlled application errors are also stored in `app-errors.json`.
Unexpected HTTP 500 problem responses include a `traceId` also written to the
ASP.NET Core error message for correlation; exception details are not returned
by the unexpected-error handler.
Do not use error logs as a substitute for centralized production monitoring.

## Recovery

For malformed JSON:

1. Preserve the failing file for investigation.
2. Restore the last known-good backup or safe sample.
3. Restart the application.
4. Validate the affected screen and repository.
5. Record the cause and add a regression test.

## Deployment

Build immutable versioned ZIPs as described in [PORTABLE.md](PORTABLE.md).
Run deployments from a separate extraction, never the historical artifacts
folder. No current operational data is copied into a new package automatically.

Follow [DEPLOYMENT.md](DEPLOYMENT.md). Every mandatory quality gate requires
evidence or an approved exception before deployment.
