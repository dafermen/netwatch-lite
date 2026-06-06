# NetWatch Lite Developer Guide

This guide explains how the source code is organized, how the main classes relate to each other, and how a monitoring execution flows from the browser to the network checks and back.

GitHub repository: [https://github.com/dafermen/netwatch-lite](https://github.com/dafermen/netwatch-lite).

## Runtime Overview

NetWatch Lite is an ASP.NET Core Minimal API application with a static Bootstrap frontend.

The backend owns configuration, validation, file persistence, network checks, execution locking, and API responses. The frontend owns navigation, dashboard rendering, configuration CRUD, filters, and progressive rendering through Server-Sent Events.

The Windows-only project `src/NetWatchLite.Wallboard.WebView2` reads `wallboard.json` and renders each panel with a native WebView2 control. Use that executable when required monitoring pages block iframe embedding.

```text
Browser
  |
  | GET /api/monitor/stream
  v
Program.cs
  |
  v
MonitorExecutionService
  |
  v
NetworkMonitorService
  |
  v
Ping / TCP checks
```

Configuration is stored in `config.json`. During development the editable source file is `Data/config.json`; during portable publish the runtime file is copied beside the executable. When `config.json` is missing, the repository creates a starter configuration with one enabled `Localhost` ping device.

## Backend Entry Point

### Program.cs

`Program.cs` configures the web app, registers services, loads configuration at startup, serves static files, and maps API endpoints.

Important responsibilities:

- Registers JSON enum serialization so `DeviceStatus` is sent as `Healthy`, `Degraded`, or `Down`.
- Registers singleton services:
  - `JsonDeviceRepository`
  - `NetworkMonitorService`
  - `MonitorExecutionService`
- Attempts to load `config.json` at startup.
- Keeps the app alive if `config.json` is invalid so `/config` can be used to repair it.
- Maps configuration endpoints.
- Maps monitoring endpoints.
- Returns controlled error payloads for configuration read/write failures.
- Sends a stream `error` event when a monitoring stream fails after the SSE response has opened.
- Maps fallback routing to `wwwroot/index.html`.

Important endpoints:

| Endpoint | Purpose |
|---|---|
| `GET /api/devices` | Returns normalized devices from the current configuration. |
| `POST /api/reload` | Reloads `config.json` from disk and returns summary counts. |
| `GET /api/config` | Returns the full editable configuration. |
| `POST /api/config` | Validates, backs up, saves, and reloads the configuration. |
| `GET /api/config/export` | Downloads the current normalized configuration as JSON. |
| `POST /api/config/import` | Imports an uploaded `.json` file, validates it, backs up the current config, saves it, and reloads memory. |
| `GET /api/results` | Backwards-compatible full-check endpoint. |
| `POST /api/monitor/run` | Runs a full check and returns one final payload. |
| `GET /api/monitor/stream` | Runs a full check, or one category when `category` is supplied, and streams progressive events. |

## Windows WebView2 Wallboard

`src/NetWatchLite.Wallboard.WebView2` is a WinForms executable targeting `net8.0-windows`.

Important files:

- `WallboardConfigReader.cs`: reads and normalizes `wallboard.json`.
- `WallboardForm.cs`: owns layout buttons, page rotation, fullscreen mode, keyboard shortcuts, and the panel grid.
- `WebViewPanelControl.cs`: wraps one WebView2 control, panel title bar, independent refresh timer, and navigation error handling.
- `NetWatchLite.Wallboard.WebView2.csproj`: references `Microsoft.Web.WebView2` and copies `wallboard.json` beside the executable.

It supports:

- 2-panel and 4-panel layouts.
- Automatic rotation.
- Per-panel refresh.
- `F` fullscreen, `R` refresh visible panels, and `ESC` exit fullscreen.
- Absolute HTTP/HTTPS URLs and root-relative local sample URLs.

## Models

### MonitorConfiguration

Root JSON object. Contains:

- `Settings`: global execution settings.
- `Devices`: device inventory.

### MonitorSettings

Global execution settings:

- `IntervalSeconds`: auto refresh interval in seconds.
- `TimeoutMs`: ping and TCP timeout.
- `MaxParallelChecks`: global concurrent check limit.
- `UseHostnameForPing`: legacy value read from older config files only; current saved configs omit it.

### Device

One configured device:

- `Name`: display name.
- `Ip`: primary address used by TCP and fallback ping.
- `Hostname`: optional DNS name for ping.
- `UseHostnameForPing`: per-device ping mode. When true, ping uses `hostname` when present; when false, ping uses `ip`.
- `WebsiteUrl`: optional HTTP/HTTPS page opened from the dashboard.
- `Category`: dashboard group.
- `Enabled`: controls whether the device is checked.
- `Checks`: ping/TCP check definitions.

### DeviceCheck

One check definition:

- `Type`: `ping` or `tcp`.
- `Port`: TCP port when type is `tcp`.

### CheckResult

Raw result for a single check:

- `Type`
- `Port`
- `LatencyMs`
- `IsAvailable`
- `Label`

### DeviceResult

Aggregated result for one device:

- Name/address/category values copied from `Device`.
- `IsOnline` from at least one successful check.
- `WebsiteUrl` copied from `Device` for dashboard links.
- `Status` computed as `Healthy`, `Degraded`, or `Down`.
- `LatencyMs`.
- Requested/open ports.
- Raw check results.
- `LastCheck`.

### DeviceStatus

Final health enum:

- `Healthy`: every configured ping and TCP check succeeded.
- `Degraded`: at least one configured check succeeded, but one or more checks failed.
- `Down`: no configured checks succeeded.

### DashboardSummary

Top dashboard metrics:

- Total devices.
- Healthy devices.
- Online devices.
- Offline devices.
- Degraded devices.
- Availability percentage.

### CategoryResult

Groups `DeviceResult` records by category for dashboard rendering.

### MonitorResponse

Final response for non-streaming full checks.

### MonitorStreamEvent

Incremental Server-Sent Events payload used by `/api/monitor/stream`.

Event types:

- `started`: initializes progress.
- `result`: carries one completed `DeviceResult`.
- `completed`: carries final summary, categories, and flat results.
- `busy`: tells the UI another run is already in progress.
- `error`: reports a controlled backend stream failure while keeping the client response in SSE format.


## Services

### JsonDeviceRepository

Owns configuration file access.

Key methods:

- `ReloadAsync`: reads `config.json`, validates it, normalizes values, creates a starter config when the file is missing, and updates memory.
- `SaveAsync`: validates submitted configuration, creates `config.backup.json`, writes `config.json`, and updates memory.
- `ExportAsync`: serializes the current normalized configuration for download.
- `ImportAsync`: parses uploaded JSON, validates through the normal save path, backs up the previous config, writes `config.json`, and updates memory.
- `GetDevicesAsync`: returns normalized devices.
- `GetConfigurationAsync`: returns the current configuration.

Important internal helpers:

- `ResolveDeviceFilePath`: finds `config.json` in the executable folder or `Data/config.json` during development.
- `CreateStarterConfiguration`: builds the first-run `Localhost` ping configuration when no JSON file exists.
- `Validate`: enforces required settings, devices, and supported checks.
- `Normalize`: trims categories/hostnames and removes unsupported checks.
- `IsValidCheck`: accepts `ping` and valid TCP ports from 1 to 65535.
- `IsValidWebsiteUrl`: accepts empty values or absolute `http://` and `https://` URLs.

Failure behavior:

- Invalid JSON becomes `InvalidDataException`.
- Missing required fields become clear validation errors.
- Startup does not crash permanently; the app logs the issue and keeps `/config` available.
- Save failures caused by file permissions, IO errors, or cancellation are returned as controlled API problems.

### NetworkMonitorService

Executes network checks.

Key methods:

- `CheckAllDevicesAsync`: runs all enabled devices and returns a final list.
- `CheckDevicesAsCompletedAsync`: yields each `DeviceResult` as soon as it finishes.
- `CheckDeviceAsync`: runs checks for one device and computes status.
- `RunLimitedCheckAsync`: wraps ping/TCP checks with the global concurrency semaphore.
- `PingAsync`: executes ICMP ping and returns success plus latency.
- `CheckPortAsync`: attempts TCP connection within timeout.
- `ComputeStatus`: maps ping/port results to `Healthy`, `Degraded`, or `Down`.
- `ResolvePingTarget`: chooses hostname or IP depending on the device `UseHostnameForPing` value.

Concurrency:

- `Task.WhenAll` is used for full batch execution.
- `Task.WhenAny` is used for progressive streaming.
- `SemaphoreSlim` limits total concurrent checks using `MaxParallelChecks`.

Failure behavior:

- Ping exceptions become offline results.
- TCP socket failures, timeouts, invalid targets, IO issues, and refused connections become closed/unavailable ports.
- Per-device network failures stay local to the affected check so one bad endpoint does not stop the full execution.

### MonitorExecutionService

Coordinates full runs and prevents overlap.

Key methods:

- `RunFullCheckAsync`: waits for any existing execution and returns a final `MonitorResponse`.
- `TryRunFullCheckAsync`: starts only if no run is active; otherwise returns null.
- `TryStreamFullCheckAsync`: starts only if no run is active and writes `MonitorStreamEvent` objects as devices complete.

Failure behavior:

- Overlapping executions return `busy` or HTTP 409 depending on the endpoint.
- Unexpected stream failures are caught in `Program.cs`, logged, and sent as an SSE `error` event when possible.
- Client disconnects are treated as cancellations and logged at debug level instead of surfacing as user-facing failures.


Internal helpers:

- `ExecuteFullCheckAsync`: runs the non-streaming full check flow.
- `CreateResponse`: builds the final dashboard payload.
- `CreateCategoryResults`: groups results by category.
- `CreateDashboardSummary`: calculates top metrics.

## Frontend

### wwwroot/index.html

Defines:

- Shared app shell.
- Hamburger sidebar.
- Topbar controls.
- Dashboard page.
- Configuration page.
- Add/edit device modal.
- Delete confirmation modal.
- Monitoring progress panel.

Routes:

- `/`: dashboard.
- `/config`: configuration CRUD page.
- `/manual`: built-in user manual.
- `/about`: project information and open-project notes.

### wwwroot/app.js

Major areas:

- Layout and routing.
- Monitoring stream client.
- Dashboard rendering.
- Search and filters.
- Configuration CRUD.
- Configuration settings editing for auto refresh interval, timeout, max parallel checks, and per-device ping target mode.
- Form state.
- Utility formatting and escaping.

Important dashboard functions:

- `loadResults`: starts a progressive full check.
- `streamFullCheck`: opens `EventSource` to `/api/monitor/stream`, optionally scoped by category.
- `loadDashboardGroups`: loads configured categories for group-level dashboard runs.
- `resetStreamingDashboard`: clears previous results and initializes progress.
- `renderStreamingResult`: adds one finished device and updates metrics.
- `updateProgressPanel`: updates percentage, progress bar, and checked/total text.
- `renderMonitorPayload`: renders final payload after completion.
- `renderCategories`: renders grouped device tables and category health bars.
- `renderRow`: renders one device row.

Important configuration functions:

- `loadConfig`: reads `/api/config`.
- `saveConfig`: posts full config to `/api/config`.
- `exportConfig`: downloads `/api/config/export` and triggers a browser JSON file download.
- `importConfigFile`: validates selected file name/size, uploads it to `/api/config/import`, and refreshes UI state.
- `applyConfigPayload`: syncs loaded settings and devices into the configuration UI.
- `renderConfigDevices`: paints the grouped device table.
- `filterConfigDevices`: filters configuration devices by name, address, or hostname while preserving original indexes.
- `groupConfigDevicesByCategory`: groups devices by category while preserving their original JSON index.
- `renderConfigDeviceRow`: renders one editable device row inside a category group.
- `toggleConfigCategory`: expands or collapses all rows for one configuration category.
- `startAddDevice`: opens the add device modal.
- `editDevice`: opens the edit device modal.
- `submitDevice`: updates device state and immediately persists the full configuration.
- `readDeviceForm`: builds a device object from form fields.
- `renderWebsiteLink`: renders optional dashboard links from `websiteUrl`.
- `readCheckRows`: validates check rows.
- `requestDeleteDevice`: opens confirmation modal.
- `confirmDeleteDevice`: deletes device state and immediately persists the full configuration.

Safety:

- HTML values are passed through `escapeHtml`.
- JSON responses are parsed through `readJsonResponse`.
- Form state is disabled while saving.
- Import rejects missing files, empty files, non-`.json` names, files larger than 5 MB, malformed JSON, and invalid configuration payloads.
- Device modal closes when navigating away from `/config`.
- Monitoring stream errors preserve existing dashboard results during group checks and show the failure in the status text.
- Full-check stream errors are rendered as a dashboard error panel when no stable results are available.

### wwwroot/styles.css

Defines:

- Sidebar and responsive layout.
- Topbar and actions.
- Dashboard cards.
- Category sections.
- Progress panel.
- Configuration cards and form rows.
- Mobile stacking and horizontal table scrolling.

## Monitoring Flow

### Progressive Dashboard Flow

```text
User clicks Run Full Check, Run Group, or enables Auto Refresh
  |
  v
app.js calls GET /api/monitor/stream
  |
  v
Program.cs opens text/event-stream response
  |
  v
MonitorExecutionService.TryStreamFullCheckAsync
  |
  v
NetworkMonitorService.CheckDevicesAsCompletedAsync
  |
  v
Browser receives:
  started -> result -> result -> completed

If the backend fails after opening the stream, the browser receives:

  error
```

The dashboard updates:

- Progress percentage.
- Checked/total count.
- Summary cards.
- Category tables.
- Last execution text.

After the `completed` event, the UI clears expanded category state so all dashboard groups collapse. Each category header shows the final category health as a compact bar: green when every device is `Healthy`, red when at least one device is `Down` or `Degraded`. The progress panel is hidden once the full run is complete.

During a category-scoped run, previous dashboard results stay visible. If that scoped run fails, the category run state is cleared, the old results remain on screen, and the top status line reports the failure.

### Configuration Save Flow

```text
User edits settings or saves a device change from /config
  |
  v
app.js POST /api/config
  |
  v
JsonDeviceRepository.Validate
  |
  v
config.backup.json is created
  |
  v
config.json is written
  |
  v
memory configuration is replaced
```

Device add, update, and delete actions call the same save path immediately after the local state changes, so the user does not need a second Save click for device CRUD. The `Save Settings` button lives inside the Settings card and persists global settings such as auto refresh interval, timeout, and max parallel checks.

## Operational Notes For Developers

- Do not commit user-generated `Data/config.backup.json` unless intentionally adding sample backup data.
- Treat `Data/config.json` carefully because the user may have local edits from the UI.
- Keep user-facing feature changes in `CHANGELOG.md`.
- Keep `README.md` and `docs/index.html` aligned with endpoints and UI behavior.
- Use `dotnet build` and `node --check wwwroot/app.js` after frontend/backend changes.
- Keep network exceptions non-fatal; monitoring should report unavailable devices instead of crashing the execution.
