# NetWatch Lite Troubleshooting

## Port 5000 Is Already In Use

Identify the existing listener and either use the running NetWatch Lite
instance or stop the intended process before restarting. Do not terminate an
unknown process without confirming ownership.

## Configuration Does Not Load

First check `/api/storage`. In SQLite mode, use the offline verify/backup/export
commands from [the storage guide](STORAGE.md); do not edit leftover JSON expecting
it to replace database contents. Newer/foreign schemas are rejected, not reset.
Stop the other instance if the data-folder lease is held; never delete its lock
path while it is running.

For JSON compatibility mode:

1. Confirm the active support-group profile and configured JSON path.
2. Validate the JSON syntax and required fields.
3. Check application logs and `/api/errors`.
4. Restore a known-good backup or `Data/config.sample.json`.

## Saved Device Is Not Visible

Confirm the active support group, search, Facility/category and status filters.
Configuration search includes monitored HTTP URLs. Current create/edit/copy opens
the saved row and clears incompatible filters; older candidates can leave it
filtered out or collapsed despite a successful save. Dashboard shows only enabled
devices, and newly saved devices are Not checked until explicitly executed.
Do not reimport stale JSON into SQLite to fix a display/filter problem.

Reload Configuration and inspect `/api/config` or export from the same service
to distinguish a display issue from persistence. If saving fails, retain the
modal error and `/api/storage` provider/schema information for diagnosis. A
success notification alone is not sufficient verification of the visible row.

## Monitor Run Returns Busy

HTTP 409 means another execution is active. Wait for the current execution to
finish. If the state persists after a restart, inspect logs and add the
scenario to concurrency/resilience testing.

## Devices Appear Down

Confirm host/IP values, DNS when hostname ping is enabled, firewall rules, ICMP
availability, TCP ports, timeout, retry count, and whether `PingOnly` or `Full`
mode was selected.

## HTTP Checks Fail

Inspect the HTTP result message, actual code and duration. A 302 is not followed
automatically, a 200 can still fail expected-text validation, and TLS errors
must be fixed in the server certificate chain/backend trust store. Validate
DNS and reachability from the backend host, not only your browser. Expected
text is case-sensitive raw response text, not a JavaScript-rendered element.
Use a small health endpoint for body-limit errors and Full Check instead of
Ping Only. See [HTTP diagnostics](HTTP_CHECKS.md#results-and-diagnostics).

## Reports Are Empty

Run at least one monitor execution and check `/api/history`, filters and date
range. SQLite stores history in its database; only JSON mode requires a runtime
`monitor-history.json` file.

## Themes Or Integrations Do Not Persist

Confirm the process can write to its content/data directory. For SQLite verify
database integrity/permissions; for JSON validate the file. Runtime files should
remain outside source control.

## Frontend Does Not Update

Check the browser console and network panel, then run:

```powershell
node --check wwwroot/app.js
```

Confirm API responses and the Server-Sent Event connection are not blocked by a
proxy.

## Build Or Test Failure

Run restore, build, and tests from the solution root. Confirm the .NET SDK
version in `global.json` is available. Preserve failing test output as release
evidence and do not deploy with an unexplained failure.

## Windows File Replacement Errors

If build reports that NetWatch-Lite.dll is in use, verify and stop only the
owned service, build, then restart it. Do not terminate an unknown listener.

An IOException while atomically replacing monitor-history.json is a persistence
failure, not a failed network check. Preserve logs and the valid destination/
backup; do not delete runtime data or add blind write retries. Check for other
writers or file holders before a controlled retest. A one-off Windows error
occurred in the 2026-11-07 regression and did not reproduce in three isolated
checks; its external holder/root cause was not established. See
[continuity status](../CURRENT_STATUS.md) for final rerun evidence. Successful
retests do not certify every resilience
scenario or authorize a deployment with an unexplained failure.

## Testhost Selects The Wrong Runtime

If build succeeds but testhost says .NET 8 is missing and reports a per-user
installation with only .NET 10, inspect the selected installations:

```powershell
Get-Command dotnet
dotnet --list-sdks
dotnet --list-runtimes
& 'C:\Program Files\dotnet\dotnet.exe' --list-runtimes
```

When the system installation contains the required .NET 8 and ASP.NET Core 8
runtimes, select it for the current PowerShell process only:

```powershell
$env:DOTNET_ROOT_X64 = 'C:\Program Files\dotnet'
$env:DOTNET_ROOT = 'C:\Program Files\dotnet'
& 'C:\Program Files\dotnet\dotnet.exe' test netwatch.sln --configuration Release
& 'C:\Program Files\dotnet\dotnet.exe' run --configuration Release --no-launch-profile --urls http://localhost:5000
```

Use the actual installation path on other machines. If .NET 8 is absent,
install the required SDK/runtime first. No machine-wide environment change is
needed for this process-scoped workaround.

