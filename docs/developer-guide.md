# NetWatch Lite Developer Guide

This guide explains how the source code is organized, how the main classes relate to each other, and how a monitoring execution flows from the browser to the network checks and back.

GitHub repository: [https://github.com/dafermen/netwatch-lite](https://github.com/dafermen/netwatch-lite).

## Runtime Overview

NetWatch Lite is an ASP.NET Core Minimal API application with a static Bootstrap frontend.

The backend owns configuration, validation, file persistence, network checks, execution locking, and API responses. The frontend owns navigation, dashboard rendering, configuration CRUD, filters, and progressive rendering through Server-Sent Events.

The wallboard mode at `/wallboard` is a standalone static page for NOC screens. It reads `wallboard.json`, renders external monitoring pages in iframes, supports 2-panel and 4-panel layouts, rotates pages, and provides fullscreen keyboard shortcuts.

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

Configuration is stored in `config.json`. During development the editable source file is `Data/config.json`; during portable publish the runtime file is copied beside the executable.

## Backend Entry Point

### Program.cs

`Program.cs` configures the web app, registers services, loads configuration at startup, serves static files, and maps API endpoints.

Important responsibilities:

- Registers JSON enum serialization so `DeviceStatus` is sent as `Healthy`, `Degraded`, or `Down`.
- Registers singleton services:
  - `JsonDeviceRepository`
  - `NetworkMonitorService`
  - `MonitorExecutionService`
  - `WallboardConfigService`
- Attempts to load `config.json` at startup.
- Attempts to load `wallboard.json` at startup and falls back to defaults if it is invalid.
- Keeps the app alive if `config.json` is invalid so `/config` can be used to repair it.
- Maps configuration endpoints.
- Maps monitoring endpoints.
- Maps fallback routing to `wwwroot/index.html`.

Important endpoints:

| Endpoint | Purpose |
|---|---|
| `GET /api/devices` | Returns normalized devices from the current configuration. |
| `POST /api/reload` | Reloads `config.json` from disk and returns summary counts. |
| `GET /api/config` | Returns the full editable configuration. |
| `POST /api/config` | Validates, backs up, saves, and reloads the configuration. |
| `GET /api/results` | Backwards-compatible full-check endpoint. |
| `POST /api/monitor/run` | Runs a full check and returns one final payload. |
| `GET /api/monitor/stream` | Runs a full check and streams progressive events. |
| `GET /api/wallboard/config` | Returns the normalized wallboard configuration. |
| `POST /api/wallboard/reload` | Reloads `wallboard.json` from disk. |

## Models

### MonitorConfiguration

Root JSON object. Contains:

- `Settings`: global execution settings.
- `Devices`: device inventory.

### MonitorSettings

Global execution settings:

- `IntervalSeconds`: legacy setting retained for compatibility.
- `TimeoutMs`: ping and TCP timeout.
- `MaxParallelChecks`: global concurrent check limit.
- `UseHostnameForPing`: when true, ping uses `hostname` when present.

### Device

One configured device:

- `Name`: display name.
- `Ip`: primary address used by TCP and fallback ping.
- `Hostname`: optional DNS name for ping.
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
- `IsOnline` from ping success.
- `Status` computed as `Healthy`, `Degraded`, or `Down`.
- `LatencyMs`.
- Requested/open ports.
- Raw check results.
- `LastCheck`.

### DeviceStatus

Final health enum:

- `Healthy`: ping succeeded and all requested TCP ports are open.
- `Degraded`: ping succeeded but at least one TCP port is closed.
- `Down`: ping failed.

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

### WallboardConfiguration

Root JSON object for `/wallboard`:

- `AppTitle`: centered title in the wallboard top bar.
- `RotationEnabled`: default auto-rotation state.
- `RotationSeconds`: seconds between page rotations.
- `DefaultLayout`: either 2 or 4 visible panels.
- `Panels`: iframe panel declarations.

### WallboardPanel

One iframe panel:

- `Name`: title shown above the iframe.
- `Url`: absolute HTTP or HTTPS URL loaded by the iframe.
- `RefreshSeconds`: independent refresh interval for that iframe.

## Services

### JsonDeviceRepository

Owns configuration file access.

Key methods:

- `ReloadAsync`: reads `config.json`, validates it, normalizes values, and updates memory.
- `SaveAsync`: validates submitted configuration, creates `config.backup.json`, writes `config.json`, and updates memory.
- `GetDevicesAsync`: returns normalized devices.
- `GetConfigurationAsync`: returns the current configuration.

Important internal helpers:

- `ResolveDeviceFilePath`: finds `config.json` in the executable folder or `Data/config.json` during development.
- `Validate`: enforces required settings, devices, and supported checks.
- `Normalize`: trims categories/hostnames and removes unsupported checks.
- `IsValidCheck`: accepts `ping` and valid TCP ports from 1 to 65535.

Failure behavior:

- Invalid JSON becomes `InvalidDataException`.
- Missing required fields become clear validation errors.
- Startup does not crash permanently; the app logs the issue and keeps `/config` available.

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
- `ResolvePingTarget`: chooses hostname or IP depending on `UseHostnameForPing`.

Concurrency:

- `Task.WhenAll` is used for full batch execution.
- `Task.WhenAny` is used for progressive streaming.
- `SemaphoreSlim` limits total concurrent checks using `MaxParallelChecks`.

Failure behavior:

- Ping exceptions become offline results.
- TCP socket failures, timeouts, invalid targets, IO issues, and refused connections become closed/unavailable ports.

### MonitorExecutionService

Coordinates full runs and prevents overlap.

Key methods:

- `RunFullCheckAsync`: waits for any existing execution and returns a final `MonitorResponse`.
- `TryRunFullCheckAsync`: starts only if no run is active; otherwise returns null.
- `TryStreamFullCheckAsync`: starts only if no run is active and writes `MonitorStreamEvent` objects as devices complete.

### WallboardConfigService

Owns wallboard file access.

Key methods:

- `ReloadAsync`: reads `wallboard.json`, validates it, normalizes values, and updates memory. Invalid or missing files fall back to default values.
- `GetConfigurationAsync`: returns the current normalized wallboard configuration.

Important internal helpers:

- `ResolveWallboardFilePath`: finds `wallboard.json` in the executable folder or `Data/wallboard.json` during development.
- `Normalize`: trims title/panel names, normalizes layout and rotation, and removes invalid panels.
- `IsValidPanel`: accepts only absolute HTTP or HTTPS iframe URLs.

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
- Form state.
- Utility formatting and escaping.

Important dashboard functions:

- `loadResults`: starts a progressive full check.
- `streamFullCheck`: opens `EventSource` to `/api/monitor/stream`.
- `resetStreamingDashboard`: clears previous results and initializes progress.
- `renderStreamingResult`: adds one finished device and updates metrics.
- `updateProgressPanel`: updates percentage, progress bar, and checked/total text.
- `renderMonitorPayload`: renders final payload after completion.
- `renderCategories`: renders grouped device tables.
- `renderRow`: renders one device row.

Important configuration functions:

- `loadConfig`: reads `/api/config`.
- `saveConfig`: posts full config to `/api/config`.
- `renderConfigDevices`: paints the grouped device table.
- `groupConfigDevicesByCategory`: groups devices by category while preserving their original JSON index.
- `renderConfigDeviceRow`: renders one editable device row inside a category group.
- `toggleConfigCategory`: expands or collapses all rows for one configuration category.
- `startAddDevice`: opens the add form.
- `editDevice`: opens the edit form.
- `submitDevice`: updates local state.
- `readDeviceForm`: builds a device object from form fields.
- `readCheckRows`: validates check rows.
- `requestDeleteDevice`: opens confirmation modal.
- `confirmDeleteDevice`: deletes local device state.

Safety:

- HTML values are passed through `escapeHtml`.
- JSON responses are parsed through `readJsonResponse`.
- Form state is disabled while saving.
- Device form closes when navigating away from `/config`.

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
User opens dashboard
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
```

The dashboard updates:

- Progress percentage.
- Checked/total count.
- Summary cards.
- Category tables.
- Last execution text.

### Configuration Save Flow

```text
User edits /config
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

## Operational Notes For Developers

- Do not commit user-generated `Data/config.backup.json` unless intentionally adding sample backup data.
- Treat `Data/config.json` carefully because the user may have local edits from the UI.
- Keep user-facing feature changes in `CHANGELOG.md`.
- Keep `README.md` and `docs/index.html` aligned with endpoints and UI behavior.
- Use `dotnet build` and `node --check wwwroot/app.js` after frontend/backend changes.
- Keep network exceptions non-fatal; monitoring should report unavailable devices instead of crashing the execution.
