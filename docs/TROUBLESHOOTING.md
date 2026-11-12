# NetWatch Lite Troubleshooting

## Authenticated Browser Checks

- Sign-in required: open the saved row's dedicated browser on the NetWatch host,
  sign in manually and choose Finish sign-in. Personal-browser login is separate.
- Browser unavailable: install approved Microsoft Edge and use an interactive
  Windows desktop; check corporate policies without bypassing them.
- Blocked redirect: close the dedicated session, review the approved exact
  authentication origins and reopen. Popup login is unsupported; use same-tab SSO.
- Wrong destination: retain required query values in the application's login
  return. A different facility/login landing page must not count as healthy.
- HTTP 200 but validation fails: review optional visible Expected text. Basic
  validation cannot recognize all custom error screens; prefer a stable positive
  authenticated-page marker when available.
- Timeout/cancellation: the context is closed to stop navigation; sign in again.
  Read [browser setup/security](BROWSER_CHECKS.md), not HTTP redirect workarounds.

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

If build/testhost cannot find the SDK or pinned .NET 10 runtime, inspect the
selected installations (a machine-wide 10.0.403 SDK/10.0.14 runtime is too old
for the current pinned baseline):

```powershell
Get-Command dotnet
dotnet --list-sdks
dotnet --list-runtimes
& 'C:\Program Files\dotnet\dotnet.exe' --list-runtimes
```

Select an installation containing SDK 10.0.404 and .NET/ASP.NET Core 10.0.15
or newer matching patches for the current PowerShell process only. Locally:

```powershell
$env:DOTNET_ROOT = 'C:\Projects\netwatch-lite\artifacts\tools\dotnet-10.0.404'
$env:DOTNET_ROOT_X64 = $env:DOTNET_ROOT
$env:PATH = "$env:DOTNET_ROOT;$env:PATH"
dotnet test netwatch.sln --configuration Release
dotnet run --configuration Release --no-launch-profile --urls http://localhost:5000
```

Use the actual installation path on other machines. Install the required
SDK/runtime first or use the self-contained portable. No persistent environment
change is needed. See [runtime setup](RUNTIME.md).

