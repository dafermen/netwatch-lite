# NetWatch Lite Development Guide

This guide explains how the source code is organized, how the main classes relate to each other, and how a monitoring execution flows from the browser to the network checks and back.

GitHub repository: [https://github.com/dafermen/netwatch-lite](https://github.com/dafermen/netwatch-lite).

Operational readiness references:

- [Codex continuity instructions](../AGENTS.md)
- [Current project status](../CURRENT_STATUS.md)
- [Documentation Index](README.md)
- [Architecture](ARCHITECTURE.md)
- [API Reference](API.md)
- [Testing](TESTING.md)
- [Deployment](DEPLOYMENT.md)
- [Operations](OPERATIONS.md)
- [Security](SECURITY.md)
- [Troubleshooting](TROUBLESHOOTING.md)

## Runtime Overview

App/tests target .NET 10 LTS, SDK 10.0.404 and runtime 10.0.15. See
[runtime setup and servicing](RUNTIME.md), including the process-scoped private
SDK used locally; the machine-wide SDK/runtime installations are unchanged.

The peripheral inventory model is in `Models/PeripheralInventory.cs`; validation
and canonicalization live in `Services/PeripheralInventoryRules.cs`. Configuration
normalization and row updates preserve these optional fields. `wwwroot/peripherals.js`
loads before the main app script and owns the catalog/editor controls; it uses
the existing configuration API and the active support-group scope. See
[PERIPHERALS.md](PERIPHERALS.md) for the contract.

`wwwroot/workstations.js` implements the read-only `/workstations` route. It
loads a private configuration snapshot, derives pending status without treating
None as unknown, and combines filters/pagination in the URL. Model names in
the catalog link to `/workstations?model=<id>`. The main router preserves this
route's query on initial load and history navigation. No new backend dependency
or persistence path is required.

NetWatch Lite is an ASP.NET Core Minimal API application with a static Bootstrap frontend.

The backend owns configuration, validation, file persistence, network checks, execution locking, and API responses. The frontend owns navigation, dashboard rendering, configuration CRUD, filters, and progressive rendering through Server-Sent Events.

The Windows WebView2 wallboard is maintained in the sibling `netwatch-lite-wallboard` repository. Use that executable when required monitoring pages block iframe embedding.

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
Ping / TCP / HTTP(S) checks
```

Configuration uses `LocalDataStore`: SQLite schema 2 for clean installs and
compatible JSON for existing installations until explicit offline migration.
See [storage commands and rollback](STORAGE.md). The logical profile documents
and API/JSON import/export contracts remain unchanged. `Data/config.sample.json`
is the safe committed example. Database/sidecars, JSON, leases and private
backups/exports are excluded from Git/publishing. Missing profile metadata creates
Support Team A and a protected Demo profile in the active storage provider.

GUI themes and integration settings are logical documents in the same provider.
References below to runtime JSON filenames describe logical keys; physical files
exist only in JSON mode. Themes receive NetWatch Default when missing.

Integration settings are stored in runtime `integrations.json`. The current implementation saves the selected inventory source mode and future report destination settings only; it does not call external systems yet.

## Security Model

NetWatch Lite is an internal operational monitoring tool. It does not currently implement application-level authentication, authorization, or multi-user roles. Security depends on a narrow deployment boundary plus server-side validation and careful handling of runtime data.

Application-level safeguards:

- Runtime JSON files are ignored by Git: `Data/config.json`, `Data/regions.json`, `Data/regions/*.json`, and `Data/themes.json`.
- The committed sample inventory is limited to generic `Localhost` data.
- `NetWatch.csproj` excludes runtime JSON profiles from publish output so portable packages do not accidentally include operational inventory.
- `scripts/publish-portable.ps1 -Version <new-version>` creates the versioned
  Windows x64 folder/ZIP/checksum. `artifacts/` is excluded from compilation,
  publish and Git. Portable-specific MSBuild filtering and an explicit public
  asset list prevent recursive workspace packaging. See [PORTABLE.md](PORTABLE.md).
- Import endpoints enforce file extension, size, JSON parsing, and configuration validation before replacing active data.
- Save endpoints validate configuration server-side before writing.
- SQLite uses parameterized SQL, per-write backup transactions and multi-document
  profile transactions; migration is offline, byte-preserving and non-destructive.
- One content-root lease guards startup/maintenance. No network-share or
  multi-instance operation is supported; newer database schemas fail closed.
- JSON persistence uses `Services/AtomicFileWriter.cs`: write a temporary sibling,
  flush/close it, then replace the destination and preserve a sibling backup.
  Existing per-repository locks remain responsible for in-process coordination.
- Monitoring execution uses an execution lock to avoid overlapping full checks.
- Network exceptions are converted into device results or controlled API/SSE errors instead of process crashes.

Deployment expectations:

- Run the app on a trusted internal workstation/server or place it behind existing enterprise controls such as VPN, firewall rules, reverse proxy authentication, or Windows access controls.
- Do not expose the app directly to untrusted networks.
- Treat IP addresses, hostnames, facilities, support groups, and theme/profile files as operational data.
- Add authentication and role-based authorization before using it as a shared multi-user service outside a controlled internal context.

## Future Identity, Audit, And Integrations

Do not implement corporate SSO until the deployment model and enterprise requirements are approved. The planned direction is Microsoft Entra ID authentication, because it can provide a verified operator identity for shared internal use.

When authentication is added, monitoring history should capture who or what started each run:

- `executedBy`: stable user or service identifier.
- `executedByDisplayName`: readable display name for reports.
- `authProvider`: expected future value such as `microsoft-entra-id`.
- `triggerSource`: `manual`, `auto-refresh`, `api`, `scheduler`, or `integration`.
- `correlationId`: trace id shared across logs, history, and future integrations.

Keep these fields optional so existing local `monitor-history.json` files continue to load. Until SSO exists, the UI and API should not claim verified user attribution.

Future integrations should be built behind explicit boundaries:

- Inbound: external systems can request checks, provide inventory metadata, or attach incident context.
- Outbound: NetWatch Lite can publish events, report exports, ticket updates, or notification payloads.
- Security: every integration needs authentication, authorization, input validation, request logging, correlation ids, and a clear data-retention decision.
- Operations: failed outbound calls should be logged to `app-errors.json` or a future integration log without blocking the main monitoring run.
- Current `/integrations` settings are preparatory configuration. Implementing real import/export should be done behind explicit services with tests and controlled retry/error behavior.

## Integrations Design

The Integrations page has two planned data flows. The current code persists settings only through `JsonIntegrationRepository` and `integrations.json`; it intentionally does not import inventory or send reports yet.

### Receive Inventory Data

Purpose: replace or refresh the active local inventory from a trusted external source. The future importer should transform the external payload into `MonitorConfiguration`, reuse existing server-side validation, create a local backup, and only then replace the active support group JSON.

Expected external inventory payload:

```json
{
  "schemaVersion": 1,
  "sourceSystem": "inventory-platform",
  "generatedAt": "2026-06-27T16:00:00Z",
  "region": "Sample Region",
  "supportGroup": "Support Team A",
  "facilities": [
    {
      "name": "Facility A",
      "devices": [
        {
          "name": "Device-001",
          "ip": "192.0.2.20",
          "hostname": "device-001.example.local",
          "facility": "Facility A",
          "category": "Servers",
          "enabled": true,
          "useHostnameForPing": false,
          "websiteUrl": "https://device-001.example.local",
          "checks": [
            { "type": "ping" },
            { "type": "tcp", "port": 443 }
          ]
        }
      ]
    }
  ]
}
```

Implementation notes:

- Treat `Local JSON` as the default and safest source.
- Add a dedicated importer service instead of placing external HTTP logic in `Program.cs`.
- Validate endpoint URL, response size, JSON schema, device fields, TCP ports, and duplicate device identity.
- Keep imports transactional: backup current JSON, validate new configuration, write once, reload memory.
- Log source system, generated timestamp, correlation id, counts, and validation failures.

### Send Report Data

Purpose: send monitoring results from local history to an approved external endpoint. The outbound payload should be based on the same filtered model used by `/reports` so operators understand exactly what is being sent.

Expected outbound report payload:

```json
{
  "schemaVersion": 1,
  "sourceSystem": "netwatch-lite",
  "exportedAt": "2026-06-27T16:05:00Z",
  "runId": "20260627-160500-123-full",
  "scope": {
    "region": "Sample Region",
    "supportGroup": "Support Team A",
    "facility": null,
    "category": null
  },
  "summary": {
    "totalDevices": 25,
    "healthyDevices": 22,
    "degradedDevices": 2,
    "offlineDevices": 1,
    "availabilityPercentage": 88.0
  },
  "rows": [
    {
      "deviceName": "Device-001",
      "ip": "192.0.2.20",
      "hostname": "device-001.example.local",
      "facility": "Facility A",
      "category": "Servers",
      "status": "Healthy",
      "latencyMs": 4,
      "checkMode": "Full",
      "completedAt": "2026-06-27T16:05:00Z"
    }
  ]
}
```

Implementation notes:

- Add an outbound report delivery service with timeout, retry limit, and structured failure logging.
- Never block the monitoring run because a report endpoint is unavailable.
- Support sending summary-only payloads or summary plus detailed rows, matching the Integrations page options.
- Include `runId`, `correlationId`, `triggerSource`, and future authenticated user fields when identity exists.

### Future Security Requirements

- Use Microsoft Entra ID for authenticated shared deployments.
- Do not commit endpoint secrets, bearer tokens, client secrets, or runtime integration files.
- Keep endpoint destinations allowlisted before outbound delivery is enabled.
- Prefer short-lived tokens or managed identity over static secrets when the deployment environment supports it.
- Record request/response metadata without storing sensitive headers or full secrets.
- Use bounded retries with backoff and record final failures in `app-errors.json` or a future integration log.
- Keep all integration fields optional and versioned so existing local JSON remains readable.

## Backend Entry Point

### Program.cs

`Program.cs` configures the web app, registers services, loads configuration at startup, serves static files, and maps API endpoints.

Important responsibilities:

- Registers JSON enum serialization so `DeviceStatus` is sent as `Healthy`, `Degraded`, or `Down`.
- Registers singleton services:
  - `JsonDeviceRepository`
  - `JsonRegionProfileRepository`
  - `JsonThemeRepository`
  - `JsonIntegrationRepository`
  - `NetworkMonitorService`
  - `MonitorExecutionService`
- Attempts to load the active support group JSON at startup.
- Keeps the app alive if the active JSON is invalid so `/config` can be used to repair it.
- Maps configuration endpoints.
- Maps monitoring endpoints.
- Returns controlled error payloads for configuration read/write failures.
- Sends a stream `error` event when a monitoring stream fails after the SSE response has opened.
- Maps fallback routing to `wwwroot/index.html`.

Important endpoints:

| Endpoint | Purpose |
|---|---|
| `GET /api/devices` | Returns normalized devices from the current configuration. |
| `POST /api/reload` | Reloads the active support group JSON from disk and returns summary counts. |
| `GET /api/config` | Returns the full editable active support group configuration. |
| `POST /api/config` | Validates, backs up, saves, and reloads the active support group configuration. |
| `POST /api/config/devices/{deviceIndex}` | Validates, backs up, saves, and reloads one device row from Configuration Bulk Edit. |
| `GET /api/config/export` | Downloads the active normalized configuration as JSON. |
| `POST /api/config/import` | Imports an uploaded `.json` file, validates it, backs up the active config, saves it, and reloads memory. |
| `GET /api/regions` | Returns support group profiles and the active profile id. |
| `POST /api/regions` | Creates and activates a new independent support group profile. |
| `POST /api/regions/{id}/activate` | Activates an existing profile and reloads its JSON. |
| `POST /api/regions/{id}/duplicate` | Copies an existing profile and activates the copy. |
| `POST /api/regions/{id}` | Renames a profile and updates its region label. |
| `DELETE /api/regions/{id}` | Deletes one profile and archives its JSON locally. |
| `GET /api/themes` | Returns normalized theme templates from `themes.json`, creating the default file when missing. |
| `POST /api/themes` | Validates, normalizes, and saves theme templates. |
| `POST /api/themes/reset` | Replaces `themes.json` with the built-in default theme. |
| `GET /api/integrations` | Returns normalized integration settings from `integrations.json`, creating the default file when missing. |
| `POST /api/integrations` | Validates, normalizes, and saves integration settings without calling external systems. |
| `GET /api/history` | Returns local monitoring history from `monitor-history.json`. |
| `DELETE /api/history/runs/{runId}` | Deletes one stored monitoring execution by id. |
| `GET /api/results` | Backwards-compatible full-check endpoint. |
| `POST /api/monitor/run` | Runs a full check and returns one final payload. Supports `checkMode=ping` for connectivity-only runs. |
| `GET /api/monitor/stream` | Runs a full check, one category when `category` is supplied, one device when `deviceName` and `deviceIp` are supplied, or selected devices when `deviceIp` is supplied multiple times, and streams progressive events. Supports `checkMode=ping` to skip TCP and HTTP checks temporarily. |

## Windows WebView2 Wallboard

The wallboard source is no longer part of this repository. It lives in the sibling `netwatch-lite-wallboard` repository so this project can stay focused on the web dashboard and API.

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
- `RetryCount`: additional attempts after a failed ping, TCP or HTTP check.
- `RetryDelayMs`: pause between retry attempts in milliseconds.
- `UseHostnameForPing`: legacy value read from older config files only; current saved configs omit it.

### Device

One configured device:

- `Name`: display name.
- `Ip`: primary address used by TCP and fallback ping.
- `Hostname`: optional DNS name for ping.
- `UseHostnameForPing`: per-device ping mode. When true, ping uses `hostname` when present; when false, ping uses `ip`.
- `WebsiteUrl`: optional HTTP/HTTPS page opened from the dashboard.
- `Facility`: physical site, warehouse, branch, or datacenter used for facility-first grouping and scoped runs.
- `Category`: dashboard group.
- `DeviceType`: stable key from the profile's `DeviceTypes` catalog; the five
  original keys/names are protected. Only `workstation` enables peripherals.
- `Enabled`: controls whether the device is checked.
- `Checks`: ping/TCP/HTTP check definitions.

`MonitorConfiguration.DeviceTypes` carries the ID/name catalog with devices.
`DeviceTypeRules` validates normalized keys, unique labels, protected types and
references. `GetDeviceTypeCatalogAsync` / `UpdateDeviceTypeCatalogAsync` use
fresh disk data and profile/revision guards for catalog-only changes; row saves
and filtered configuration snapshots retain the catalog. Browser management
lives in `wwwroot/device-types.js`, loaded before `app.js`, and the device editor
builds its options from the loaded configuration. See
[the type guide](DEVICE_TYPES.md) and [API](API.md).

### DeviceCheck

One check definition:

- `Type`: `ping`, `tcp` or `http` (HTTP/HTTPS).
- `Port`: TCP port when type is `tcp`.
- `Url`, `TimeoutMs`, `ExpectedStatusCode`, `ExpectedText`: HTTP-only options.
  See [HTTP checks](HTTP_CHECKS.md) for defaults, limits and a complete example.

### CheckResult

Raw result for a single check:

- `Type`
- `Port`
- `LatencyMs`
- `IsAvailable`
- `Label`
- `Status`: connectivity or HTTP diagnostic code.
- HTTP-only optional `Url` (query removed), `StatusCode`, `ExpectedStatusCode`,
  `TimeoutMs`, `DurationMs` and `Message`; old history remains compatible.

### DeviceResult

Aggregated result for one device:

- Name/address/facility/category values copied from `Device`.
- `IsOnline` from at least one successful check.
- `WebsiteUrl` copied from `Device` for dashboard links.
- `Status` computed as `Healthy`, `Degraded`, or `Down`.
- `LatencyMs`.
- Requested/open ports.
- Raw check results.
- `LastCheck`.

### DeviceStatus

Final health enum:

- `Healthy`: every configured ping, TCP and HTTP check succeeded.
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

### ThemeConfiguration

Root object of `themes.json`:

- `ActiveThemeId`: id of the theme currently applied by the UI.
- `Themes`: list of available `ThemeDefinition` templates.

### ThemeDefinition

One GUI theme template:

- `Id`: stable unique theme id.
- `Name`: display name.
- `BuiltIn`: true for templates the UI cannot delete.
- `Colors`: dictionary of supported color tokens, including layout colors, status colors, dashboard category health colors, Configuration collapsible header colors, `autoRefreshOn`, `autoRefreshOff`, and `runFullCheck`.

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
- `IsValidCheck`: accepts `ping`, TCP ports 1-65535 and HTTP definitions validated by `HttpCheckService`.
- `IsValidWebsiteUrl`: accepts empty values or absolute `http://` and `https://` URLs.

Failure behavior:

- Invalid JSON becomes `InvalidDataException`.
- Missing required fields become clear validation errors.
- Startup does not crash permanently; the app logs the issue and keeps `/config` available.
- Save failures caused by file permissions, IO errors, or cancellation are returned as controlled API problems.

### JsonThemeRepository

Owns `themes.json` access.

Key methods:

- `GetConfigurationAsync`: reads and normalizes `themes.json`, creating the built-in default when missing.
- `SaveAsync`: validates submitted theme templates, normalizes color tokens, and writes `themes.json`.
- `ResetAsync`: replaces `themes.json` with the built-in default template.

Important internal helpers:

- `ResolveThemeFilePath`: finds `themes.json` beside the executable or in `Data/themes.json` during development.
- `Normalize`: ensures the built-in default theme exists, removes invalid/duplicate templates, and fills missing color tokens.
- `Validate`: requires unique theme ids, non-empty names, valid `activeThemeId`, and `#RRGGBB` colors for every supported token.

Failure behavior:

- Invalid JSON becomes `InvalidDataException`.
- Missing or invalid color tokens are normalized on read and rejected on save.
- File read/write problems are returned as controlled API errors from `Program.cs`.

### NetworkMonitorService

Executes network checks.

Key methods:

- `CheckAllDevicesAsync`: runs all enabled devices and returns a final list.
- `CheckDevicesAsCompletedAsync`: yields each `DeviceResult` as soon as it finishes.
- `CheckDeviceAsync`: runs checks for one device and computes status.
- `GetChecksForExecution`: keeps full runs unchanged and filters a temporary execution list to ping checks for `PingOnly` mode.
- `RunLimitedCheckAsync`: wraps ping/TCP/HTTP checks with the global concurrency semaphore.
- `RunWithRetryAsync`: repeats failed checks using `RetryCount` and `RetryDelayMs`.
- `PingAsync`: executes ICMP ping and returns success plus latency.
- `CheckPortAsync`: attempts TCP connection within timeout.
- `HttpCheckService.CheckAsync`: uses an anonymous named client with strict TLS,
  no cookies/redirects, a bounded body and a linked per-attempt deadline. Returns
  safe messages/status/duration without retaining bodies or URL query strings.
- `ComputeStatus`: maps all executed check results to `Healthy`, `Degraded`, or `Down`.
- `ResolvePingTarget`: chooses hostname or IP depending on the device `UseHostnameForPing` value.

Concurrency:

- `Task.WhenAll` is used for full batch execution.
- `Task.WhenAny` is used for progressive streaming.
- `SemaphoreSlim` limits total concurrent checks using `MaxParallelChecks`.

Failure behavior:

- Ping exceptions become offline results.
- Ping results include the ICMP status string so the dashboard can distinguish timeouts, unreachable targets, and exceptions.
- TCP socket failures, timeouts, invalid targets, IO issues, and refused connections become closed/unavailable ports.
- Per-device network failures stay local to the affected check so one bad endpoint does not stop the full execution.

### MonitorExecutionService

Coordinates full runs and prevents overlap.

Key methods:

- `RunFullCheckAsync`: waits for any existing execution and returns a final `MonitorResponse`.
- `TryRunFullCheckAsync`: starts only if no run is active; otherwise returns null.
- `TryStreamFullCheckAsync`: starts only if no run is active and writes `MonitorStreamEvent` objects as devices complete. Optional filters limit a run to one facility, one category, one device identified by name and IP, or multiple selected IPs.

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
- Themes page.
- Add/edit device modal.
- Add/copy theme modal.
- Delete confirmation modal.
- Monitoring progress panel.

Routes:

- `/`: dashboard.
- `/config`: configuration CRUD page.
- `/themes`: GUI theme template editor.
- `/manual`: built-in user manual.
- `/about`: project information and open-project notes.

### wwwroot/app.js

Major areas:

- Layout and routing.
- Monitoring stream client.
- Dashboard rendering.
- Search and filters.
- Configuration CRUD.
- Integration with shared master-list controllers in `management.js`.
- Configuration settings editing for auto refresh interval, timeout, max parallel checks, retry behavior, and per-device ping target mode.
- Form state.
- Utility formatting and escaping.

Important dashboard functions:

- `loadResults`: starts a progressive full check.
- `streamFullCheck`: opens `EventSource` to `/api/monitor/stream`, optionally scoped by facility, category, or one device.
- `loadDashboardGroups`: loads configured facilities and categories for dashboard-scoped runs.
- `getDashboardDevices`: overlays actual results on enabled configured records;
  missing results become presentation-only Pending rows. They are never added
  to latestResults, persisted configuration or history. Failed inventory reads
  clear/disable the dashboard instead of exposing stale preview data.
- `resetStreamingDashboard`: clears previous results and initializes progress.
- `renderStreamingResult`: adds one finished device and updates metrics.
- `updateProgressPanel`: updates percentage, progress bar, and checked/total text.
- `renderMonitorPayload`: renders final payload after completion.
- `renderFacilities` and `renderCategories`: render facility-first grouped device tables and category health bars.
- `renderRow`: renders one device row.
- `runDeviceCheck`: checks one enabled configured device and merges its actual result.
- Row actions are available for healthy devices too; individual runs pass name,
  address, facility and category to avoid matching another category's record.
- `clearDashboardFilters` resets view filters only, never execution state/results.
- `copyDeviceCommand` writes inert command text through Clipboard API or a
  text-selection fallback. Keep it out of DeviceResult and monitor history.
- Header-band clicks delegate to their existing Bootstrap collapse button,
  excluding interactive descendants; keyboard/aria state stays on that button.
- `runGroupCheck`: passes facility and category together; backend filters compose
  with AND. Empty facility means all sites in the active support group. Search
  never changes these execution parameters. Availability excludes Pending rows.
- `runFailedChecks`: reruns only the current `Degraded` and `Down` dashboard devices and merges the refreshed results back into the dashboard.

Important configuration functions:

- `renderConfigDeviceRow`: renders fixed-size accessible icon actions inside
  `.config-device-actions`; keep its reserved column width and no-wrap layout.
  Default header tokens match the server theme and CSS/JS fallbacks; custom
  palettes remain authoritative. Both normal and Bulk Edit share those tokens.
- The device delete dialog registers `configureManagementModalFocus` with Cancel
  as the preferred target and closes through `hideManagementModal`, including
  confirmation/dismissal while Bootstrap is still opening it.
- `loadConfig`: reads `/api/config`.
- `saveConfig`: posts full config to `/api/config`.
- `exportConfig`: downloads `/api/config/export` and triggers a browser JSON file download.
- `importConfigFile`: validates selected file name/size, uploads it to `/api/config/import`, and refreshes UI state.
- `applyConfigPayload`: syncs loaded settings and devices into the configuration UI.
- `renderConfigDevices`: paints the facility/category grouped device table.
- `renderBulkEditDevices`: paints the grouped spreadsheet-style Bulk Edit table for common device fields.
- `renderBulkEditFilterOptions`: builds the Bulk Edit facility/category filters from the current searchable device set.
- `filterBulkEditDevices`: applies Bulk Edit facility/category scope before rows are rendered.
- `collapseAllBulkFacilities` and `expandAllBulkFacilities`: collapse or expand every visible Bulk Edit facility group after current filters are applied.
- `filterConfigDevices`: filters configuration devices by name, address, hostname, facility, or category while preserving original indexes.
- `groupConfigDevicesByFacility`: groups devices by facility and category while preserving their original JSON index.
- `renderConfigDeviceRow`: renders one editable device row inside a category group.
- `saveBulkRow`: validates and saves a single Bulk Edit row through `/api/config/devices/{deviceIndex}`.
- `toggleConfigCategory`: expands or collapses all rows for one configuration category.
- `toggleConfigFacility`: expands or collapses all category headers and device rows for one configuration facility.
- `startAddDevice`: opens the add device modal.
- `editDevice`: opens the edit device modal.
- `submitDevice`: updates device state and immediately persists the full configuration.
- `readDeviceForm`: builds a device object from form fields.

Important integration functions:

- `loadIntegrations`: reads `/api/integrations`.
- `saveIntegrations`: posts local integration settings to `/api/integrations`.
- `renderIntegrations`: syncs inventory source and report destination settings into the Integrations page.
- `updateIntegrationFormState`: enables or disables endpoint fields based on local JSON vs external endpoint choices.

Important report functions:

- `renderReports`: projects shared filters into Summary/Runs/Devices with coherent
  metrics, ordering and pagination. Browser-local date presets do not imply uptime.
- `populateReportFilterOptions`: scopes Facility/Category by historical support
  group and retains unavailable selections rather than silently broadening them.
- `reportDeviceKey` / `reportRunKey`: distinguish recorded identities and snapshot
  executions without persisted schema/ID changes. Legacy duplicate IDs are readable
  but UI deletion is disabled when ambiguous.
- `loadReports`: clears stale data and guards reads with a generation token.
- `openReportDetail`: renders escaped recorded checks in a transition-safe modal;
  drilldowns and browser back do not execute checks or mutate inventory.
- `updateSummaryPagination`: updates row ranges and buttons for every report view.
- `exportFilteredReports`: downloads all filtered evaluations as JSON/CSV, not just
  a page. CSV text escaping is an import-time mitigation, not universal certification.
- `deleteReportRun`: confirms the exact ID and applies server response only on
  success, guarding navigation and stale confirmation. See [reports](REPORTS.md).
- `renderWebsiteLink`: renders optional dashboard links from `websiteUrl`.
- `readCheckRows`: validates check rows.
- `requestDeleteDevice`: opens confirmation modal.
- `confirmDeleteDevice`: deletes device state and immediately persists the full configuration.

### wwwroot/management.js

Loaded after Bootstrap, before the catalog scripts and `app.js`. Owns Support
Groups/Themes controllers and shared `renderManagementActions`,
`confirmManagementAction` and `configureManagementModalFocus` helpers. Existing
app globals provide default settings, formatting, API parsing and CSS token maps.

- `loadRegions` / `loadThemes`: deduplicate reads, disable mutation until a
  verified read and never create editable fallback data after errors.
- `renderRegionsTable` / `renderThemesTable`: responsive search/filter lists,
  region headings, palettes and independent active/selected state.
- `mutateRegion`: keeps existing profile endpoints/IDs, refreshes active config
  and reports saved-profile versus reload failures separately.
- `openThemeNameForm` / `submitThemeForm`: persist new/copy/rename only after
  validation/success, retaining drafts on errors.
- `themeDraft` / `isThemeDirty`: keep selected color edits separate from the
  confirmed library; `saveThemes` updates only that template's colors.
- `persistThemeState`: posts candidate state and commits/applies it only after
  server success. Full-document API concurrency semantics remain unchanged.
- `discardThemeChanges`: used by selection, editor/reload controls and routing,
  including browser back; confirmation cancellation preserves the draft.
- Dropdown instances are disposed before re-rendering. Modal focus restores
  the interacted control after Bootstrap opening completes.

Catalog scripts reuse confirmation/focus without replacing their own validation
or concurrency rules. See [administration](ADMINISTRATION.md).

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
- Facility tabs and facility/category grouped tables.
- Theme color editor and preview.
- Mobile stacking and horizontal table scrolling.

## Monitoring Flow

### Progressive Dashboard Flow

```text
User chooses Full Check or Ping Only, then clicks Run All Facilities, Run Facility, Run Group, or enables Auto Refresh
  |
  v
app.js calls GET /api/monitor/stream, optionally with checkMode=ping
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

`PingOnly` is an execution mode, not a JSON configuration change. The backend preserves configured TCP ports in `requestedPorts` for display, skips TCP and HTTP attempts for that run, and returns `checkMode: "PingOnly"` so the frontend can show these checks as skipped instead of failed. With no configured ping, the legacy synthetic address/hostname ping remains; it does not validate application functionality.

The dashboard updates:

- Progress percentage.
- Checked/total count.
- Summary cards.
- Facility and category tables.
- Last execution text.

After the `completed` event, the UI clears expanded category state so all dashboard groups collapse. In the all-facilities view, results are grouped by facility first and category second, so duplicate device names in different sites remain visually distinct. Each category header shows the final category health as a compact bar: green when every device is `Healthy`, orange when at least one device is `Degraded` and none are `Down`, and red when at least one device is `Down`. The progress panel is hidden once the full run is complete.

During a facility-scoped or category-scoped run, previous dashboard results stay visible. If that scoped run fails, the scoped run state is cleared, the old results remain on screen, and the top status line reports the failure.

### Theme Save Flow

```text
User creates, copies, edits, activates, or resets a theme from /themes
  |
  v
management.js GET/POST /api/themes or POST /api/themes/reset
  |
  v
JsonThemeRepository validates and normalizes color tokens
  |
  v
themes.json is written
  |
  v
Confirmed active theme updates global CSS; inactive colors stay in preview
```

Create/copy/rename persist immediately. Color inputs edit a separate draft until
Save Colors. Selecting a row does not activate it. Failed mutations do not commit
the candidate or apply its palette; dirty-draft discard requires confirmation.

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
active support group JSON is written
  |
  v
memory configuration is replaced
```

Device add, update, and delete actions call the same save path immediately after the local state changes, so the user does not need a second Save click for device CRUD. Bulk Edit saves one row through `/api/config/devices/{deviceIndex}` so large inventories can be updated without rewriting unrelated rows from the browser. The `Save Settings` button lives inside the Settings card and persists global settings such as auto refresh interval, timeout, retries, retry delay, and max parallel checks.

## Operational Notes For Developers

- Do not commit user-generated `Data/config.json`, `Data/config.backup.json`, `Data/regions.json`, `Data/regions/*.json`, or `Data/themes.json`.
- Treat runtime JSON files carefully because the user may have local edits from the UI.
- Before publishing a portable package, inspect the ZIP and confirm it contains only `config.sample.json`, not active runtime profiles.
- Keep user-facing feature changes in `CHANGELOG.md`.
- Keep `README.md` and `docs/index.html` aligned with endpoints and UI behavior.
- Use `dotnet build netwatch.sln`, `dotnet test netwatch.sln`, and
  `node --check wwwroot/app.js` after frontend/backend changes.
- Keep package versions centralized in `Directory.Packages.props`.
- Add new automated tests under `tests/` and document their quality-gate
  coverage in `TESTING.md`.
- Keep network exceptions non-fatal; monitoring should report unavailable devices instead of crashing the execution.
