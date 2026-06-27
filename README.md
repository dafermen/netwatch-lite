# NetWatch-Lite

NetWatch-Lite is a .NET 8 ASP.NET Core + Bootstrap network monitoring dashboard. It reads editable JSON profiles, runs asynchronous ping and TCP checks, computes device health, groups results by region, facility, and category, and can be published as a portable Windows executable with the .NET runtime included.

Full visual documentation is available at [docs/index.html](docs/index.html).

Programmer documentation is available at [docs/developer-guide.md](docs/developer-guide.md).

Release notes and commit-level project history are summarized in [CHANGELOG.md](CHANGELOG.md).

GitHub repository: [https://github.com/dafermen/netwatch-lite](https://github.com/dafermen/netwatch-lite).

## Portable Download

Download the latest Windows x64 portable ZIP:

[Download NetWatch Lite portable ZIP v0.7.1](https://github.com/dafermen/netwatch-lite/raw/refs/heads/main/releases/NetWatch-Lite-win-x64-portable-2026-06-27-v0.7.1-reports-integrations-polish.zip)

Extract the ZIP on Windows and run `NetWatch-Lite.exe`. The ZIP includes a safe `config.sample.json`; NetWatch Lite creates the editable runtime `config.json` and `themes.json` beside the executable on first run if they do not already exist.

Previous portable versions remain available in the [`releases/`](releases/) folder for comparison or rollback.

## Screenshots

### Dashboard

![NetWatch Lite dashboard](docs/assets/netwatch-lite-dashboard.png)

### Configuration

![NetWatch Lite configuration](docs/assets/netwatch-lite-configuration.png)

## Features

- Editable JSON inventories, including independent Support Group profiles for multiple operational teams inside a region.
- Support Groups manager at `/regions` for creating, copying, renaming, activating, and deleting independent JSON profiles.
- Device categories such as `Servers`, `Critical Workstations`, `IP Cameras`, and `Power Devices`.
- Async ping checks with latency in milliseconds.
- Optional per-device hostname-based ping mode for networks where IP addresses can change.
- Optional `websiteUrl` per device for opening an associated web page from the dashboard.
- Async TCP port checks.
- Parallel execution with `Task.WhenAll`.
- Global concurrency limit with `maxParallelChecks`.
- Configurable retry count and retry delay for transient ping and TCP failures.
- Aggregated status:
  - `Healthy`: every configured ping and TCP check succeeds.
  - `Degraded`: at least one check succeeds, but one or more checks fail.
  - `Down`: no configured checks succeed.
- Dashboard summary metrics:
  - Total devices.
  - Online devices.
  - Offline devices.
  - Degraded devices.
  - Availability percentage.
- Search and client-side filters.
- Dashboard results group by facility and then category in the all-facilities view; facility/category groups collapse after a full check and show green, orange, or red health bars.
- Hamburger sidebar navigation.
- Branded NetWatch Lite logo and favicon.
- Embedded Windows executable icon for portable builds.
- Built-in User Manual and About pages.
- Built-in Themes page for reusable GUI color templates stored in `themes.json`.
- Companion Windows WebView2 wallboard is maintained in the sibling `netwatch-lite-wallboard` repository.
- Responsive layout for desktop, tablet, and mobile screens.
- Configuration page at `/config`.
- CRUD UI for devices and checks stored in the active support group JSON.
- Editable auto refresh interval, timeout, max parallel check limit, and per-device ping target mode in `/config`.
- Add, update, and delete device actions save immediately to the active support group JSON.
- Copy device action opens a prefilled add form so similar devices can be created quickly.
- Bulk Edit mode lets operators filter by facility/category and update common device fields in a grouped spreadsheet-style table, with individual row saves, collapse/expand-all facility controls, and validation.
- Theme templates can be created, copied, renamed, activated, deleted one at a time, or fully reset from the Themes page. If `themes.json` is missing, NetWatch Lite creates the default theme automatically.
- Configuration device table grouped by facility and category for easier editing.
- Configuration devices can be filtered by name, address, hostname, facility, or category.
- Configuration facility and category groups are nested and collapsed by default.
- Configuration Bulk Edit supports selecting visible rows and applying common changes to many devices in one save.
- Add/edit device form opens in a modal so large category lists do not push the editor out of view.
- Configuration JSON export and import from `/config`, with server-side validation before imported files replace the active support group config.
- Manual mode by default.
- Optional auto refresh toggle that runs a full check using `settings.intervalSeconds`.
- Execution mode toggle for `Full Check` or `Ping Only` connectivity checks without changing the saved JSON.
- Forced full check.
- Category-scoped dashboard checks for running one group, such as IP Cameras, without checking the full inventory.
- Device-scoped dashboard checks for rerunning one row without checking the full inventory.
- Failed-device retry button that appears only when current dashboard results include `Degraded` or `Down` devices.
- Progressive dashboard rendering through Server-Sent Events while checks are still running.
- Visible monitoring progress with percentage and checked/total count while a run is active.
- JSON reload without restarting.
- Local monitor history stored in `monitor-history.json` for future reporting and analysis.
- Reports page at `/reports` with summary cards, coherent filters, collapsible paginated/sortable Facility Performance, Category Performance, Recent Runs, indexed Detailed Monitor History, per-execution delete actions, and filtered JSON export from local monitor history.
- Local application error log stored in `app-errors.json` for troubleshooting where the app fails.
- Integrations page at `/integrations` for choosing local JSON or a future external inventory endpoint, plus future outbound report endpoint settings.
- Future-ready reporting model: operator identity, audit fields, and external integrations are planned but not enabled yet.

## Project Structure

```text
netwatch-lite/
├── Assets/
│   └── netwatch-lite.ico
├── Data/
│   └── config.sample.json
├── Models/
│   ├── CategoryResult.cs
│   ├── CheckResult.cs
│   ├── DashboardSummary.cs
│   ├── Device.cs
│   ├── DeviceCheck.cs
│   ├── DeviceResult.cs
│   ├── DeviceStatus.cs
│   ├── MonitorConfiguration.cs
│   ├── MonitorResponse.cs
│   ├── MonitorStreamEvent.cs
│   ├── MonitorSettings.cs
│   ├── ThemeConfiguration.cs
│   └── ThemeDefinition.cs
├── Services/
│   ├── JsonDeviceRepository.cs
│   ├── MonitorExecutionService.cs
│   ├── JsonThemeRepository.cs
│   ├── NetworkMonitorOptions.cs
│   └── NetworkMonitorService.cs
├── wwwroot/
│   ├── app.js
│   ├── index.html
│   ├── netwatch-lite-favicon.png
│   ├── netwatch-lite-logo.png
│   ├── netwatch-lite.svg
│   └── styles.css
├── docs/
│   ├── developer-guide.md
│   └── index.html
├── appsettings.json
├── LICENSE
├── NetWatch.csproj
├── netwatch.sln
├── Program.cs
└── README.md
```

## Configuration

The device JSON path is configured in `appsettings.json`.

```json
{
  "NetworkMonitor": {
    "DeviceFilePath": "config.json",
    "ProfileFilePath": "regions.json",
    "ThemeFilePath": "themes.json",
    "HistoryFilePath": "monitor-history.json",
    "ErrorLogFilePath": "app-errors.json",
    "IntegrationFilePath": "integrations.json"
  }
}
```

During local development, `Data/config.json`, `Data/regions.json`, and `Data/regions/*.json` are treated as private local files and are ignored by Git. `Data/config.sample.json` is the safe starter example that can be committed. If runtime profile metadata is missing on first run, NetWatch Lite creates a `Support Team A` profile in `Sample Region` from the existing `config.json` when available, plus a protected `Demo` profile from `config.sample.json`. Dashboard and Configuration always operate on the active support group profile.

`themes.json` stores GUI theme templates and the active theme id. It is runtime data and is ignored by Git, just like `config.json`. If it is missing, NetWatch Lite creates the built-in `NetWatch Default` and `Corporate Logistics` themes automatically. Theme color tokens include page/surface/sidebar colors, status colors, dashboard category health colors, Configuration collapsible header colors, and dashboard action colors for `Auto Refresh: ON`, `Auto Refresh: OFF`, and the primary run button.

`monitor-history.json` stores completed monitoring executions locally, including run timing, selected scope, dashboard summary, and device-level results. `app-errors.json` stores local application errors with request context so failures can be reviewed later. `integrations.json` stores local integration settings for inventory source mode and future outbound report delivery. These files are runtime data, ignored by Git, and excluded from portable publish output.

Future history versions should add audit context without breaking existing local files. Planned fields include `executedBy`, `executedByDisplayName`, `authProvider`, `triggerSource`, `correlationId`, and optional external reference ids. These fields are intentionally not active yet because NetWatch Lite does not currently authenticate users.

## Device JSON Format

```json
{
  "settings": {
    "intervalSeconds": 15,
    "timeoutMs": 1000,
    "maxParallelChecks": 50,
    "retryCount": 0,
    "retryDelayMs": 250
  },
  "devices": [
    {
      "name": "Web Server",
      "ip": "192.0.2.10",
      "hostname": "web-server.local",
      "useHostnameForPing": true,
      "websiteUrl": "https://example.local/status",
      "region": "Sample Region",
      "supportGroup": "Support Team A",
      "facility": "Miami Warehouse",
      "category": "Servers",
      "enabled": true,
      "checks": [
        { "type": "ping" },
        { "type": "tcp", "port": 80 },
        { "type": "tcp", "port": 443 }
      ]
    }
  ]
}
```

Use `facility` for the physical site, warehouse, branch, or datacenter where the device lives. The dashboard shows facilities as quick tabs so operators can focus or run one site at a time; missing values are normalized to `Unassigned`. Use `category` to group device types inside each facility. Use `enabled: false` to keep a device in the file without monitoring it. Use optional `websiteUrl` to show an `Open website` link in the dashboard; it must be an absolute `http://` or `https://` URL. Set `useHostnameForPing` on each device to choose whether that device's ping checks use `hostname` or `ip`. TCP checks continue to use `ip`.

## Companion Wallboard Project

The Windows WebView2 wallboard is maintained as a separate sibling project:

[https://github.com/dafermen/netwatch-lite-wallboard](https://github.com/dafermen/netwatch-lite-wallboard)

That project renders operational monitoring pages in native WebView2 panels for pages that block iframe embedding.

## API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/devices` | Returns normalized devices from the loaded JSON. |
| `POST` | `/api/reload` | Reloads the active support group JSON from disk. |
| `GET` | `/api/config` | Returns the full editable configuration. |
| `POST` | `/api/config` | Saves the full active support group configuration, creates a sibling backup, and reloads memory. |
| `POST` | `/api/config/devices/{deviceIndex}` | Validates and saves one device row from Bulk Edit, then reloads the active support group configuration in memory. |
| `GET` | `/api/config/export` | Downloads the current normalized configuration as JSON. |
| `POST` | `/api/config/import` | Imports a `.json` config file, validates it, creates `config.backup.json`, saves it, and reloads memory. |
| `GET` | `/api/themes` | Returns normalized theme templates from `themes.json`, creating the default theme when missing. |
| `POST` | `/api/themes` | Saves theme templates after validation and normalization. |
| `POST` | `/api/themes/reset` | Resets theme templates to the built-in default. |
| `GET` | `/api/results` | Backwards-compatible endpoint that forces a full check. |
| `POST` | `/api/monitor/run` | Forces a full check and prevents overlapping executions. Supports `checkMode=ping` for connectivity-only runs. |
| `GET` | `/api/monitor/stream` | Streams a full check progressively with `started`, `result`, `completed`, `busy`, and `error` events. Supports optional `facility`, `category`, `deviceName`, `deviceIp`, and `checkMode=ping` query filtering. |
| `GET` | `/api/history` | Returns local monitoring history from `monitor-history.json`. |
| `POST` | `/api/history/clear` | Clears local monitoring history for maintenance or demo reset. |
| `DELETE` | `/api/history/runs/{runId}` | Deletes one stored monitoring execution without clearing the full history file. |
| `GET` | `/api/errors` | Returns local application errors from `app-errors.json`. |
| `POST` | `/api/errors/clear` | Clears local application errors for maintenance or demo reset. |
| `GET` | `/api/integrations` | Returns local integration settings from `integrations.json`. |
| `POST` | `/api/integrations` | Saves integration settings locally without calling external systems. |

## Security Model

NetWatch Lite is designed as an internal operational tool. Its current security posture is based on keeping sensitive inventory data local, validating all configuration changes on the server, and avoiding unnecessary infrastructure exposure.

Built-in safeguards:

- Runtime inventory files are ignored by Git: `Data/config.json`, `Data/regions.json`, `Data/regions/*.json`, and `Data/themes.json`.
- Runtime history, troubleshooting, and integration settings files are ignored by Git: `Data/monitor-history.json`, `Data/app-errors.json`, and `Data/integrations.json`.
- The committed sample file is generic and safe: `Data/config.sample.json`.
- Portable releases are built with only the safe `config.sample.json`, not active operational profiles.
- JSON import rejects empty files, non-`.json` files, files larger than 5 MB, malformed JSON, and invalid monitor configurations.
- Configuration saves are validated server-side before writing to disk.
- Saves create local backup files so accidental changes can be recovered.
- Monitoring endpoints prevent overlapping executions.
- Network check failures are handled as device status results instead of crashing the app.

Current scope and deployment expectation:

- The app does not currently include built-in user authentication or role-based access.
- Deploy it only on a trusted internal workstation/server or behind existing controls such as VPN, firewall rules, reverse proxy authentication, or Windows access controls.
- Treat device inventories, hostnames, IP addresses, facilities, and support group profiles as internal operational data.

Future identity direction:

- Add Microsoft Entra ID authentication before NetWatch Lite becomes a shared multi-user service.
- Record who executed each check once authenticated identity is available.
- Keep audit fields optional during the local-file phase so existing `monitor-history.json` files remain readable.
- Separate human-triggered runs from automatic, scheduled, API-triggered, or integration-triggered runs with a `triggerSource` value.

Future integration direction:

- Inbound integrations may later create check requests, import inventory metadata, or receive external incident context.
- Outbound integrations may later send availability events, report exports, Teams/email notifications, ticket updates, or webhook payloads.
- Current `/integrations` settings are configuration only; they do not import inventory or send reports yet.
- Each integration should use explicit authentication, request logging, correlation ids, and allowlisted destinations before production use.

## Integrations Design

The `/integrations` page is the planning surface for future data exchange. The current implementation only saves local settings in `integrations.json`; it does not call external systems yet.

### Receive Inventory Data

Goal: allow NetWatch Lite to load facilities, devices, categories, and checks from an approved external system instead of relying only on the local JSON profile. Until that connector exists, `Local JSON` remains the active source of truth.

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

### Send Report Data

Goal: allow NetWatch Lite to send report output from local monitor history to an approved external endpoint. The intended source is the same filtered report model shown in `/reports`: execution metadata, summary values, and optional detailed device rows.

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

### Future Security Requirements

- Authentication should use Microsoft Entra ID when NetWatch Lite becomes a shared internal service.
- Endpoint credentials or tokens must not be stored in Git or committed runtime files.
- External destinations should be allowlisted before outbound report delivery is enabled.
- Every inbound or outbound request should include a correlation id and be logged.
- Failed outbound delivery should retry with a bounded policy and then record failure details in local logs.
- Imported inventory must be validated with the same server-side rules used by local JSON import.
- Report delivery should clearly separate human-triggered, auto-refresh, scheduled, API, and integration-triggered runs.

## Version Notes

Changes are documented in [CHANGELOG.md](CHANGELOG.md). Each Git commit should keep a concise message describing the change, and user-facing changes should also be added to the changelog.

## License

NetWatch Lite is released under the [MIT License](LICENSE). You can use, copy, modify, merge, publish, distribute, sublicense, and sell copies of the software under the license terms.

## Source Documentation

The C# source includes XML documentation comments for models and services. The frontend JavaScript includes JSDoc comments for dashboard rendering, filtering, backend calls, and execution controls.

Operational readiness documents:

- [Developer Guide](docs/developer-guide.md)
- [Quality Review](docs/quality-review.md)
- [Internal Release Checklist](docs/internal-release-checklist.md)

The project also enables XML documentation generation in `NetWatch.csproj`:

```xml
<GenerateDocumentationFile>true</GenerateDocumentationFile>
```

## Build and Run

Install the .NET 8 SDK, then run:

```bash
dotnet restore
dotnet build
dotnet run
```

Open the URL printed by `dotnet run`, usually `http://localhost:5000`, `https://localhost:5001`, or another available local port.

## Create Windows Portable Build

Publish a self-contained Windows x64 package:

```bash
dotnet publish NetWatch.csproj -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -p:IncludeNativeLibrariesForSelfExtract=true -o publish/win-x64-v0.7.1
```

Expected output:

```text
publish/win-x64-v0.7.1/
├── NetWatch-Lite.exe
├── config.sample.json
├── appsettings.json
├── wwwroot/
└── runtime dependencies...
```

On first run, NetWatch Lite creates `config.json` beside `NetWatch-Lite.exe` if the file does not already exist.
It also creates `themes.json` beside the executable if no theme file exists.

Create a ZIP on macOS:

```bash
cd publish/win-x64-v0.7.1
zip -r ../../releases/NetWatch-Lite-win-x64-portable-2026-06-27-v0.7.1-reports-integrations-polish.zip .
```

To run on Windows:

```powershell
.\NetWatch-Lite.exe
```

Edit `config.json` in the same folder as `NetWatch-Lite.exe`, or use the `/config` page. Device add, update, and delete actions save immediately; saving through the UI creates `config.backup.json`.

## Operational Notes

- `Run All Facilities` executes all configured checks immediately.
- Facility tabs focus the dashboard on one site. The same primary run button changes to `Run Facility` and executes checks only for the selected facility.
- `Run Group` executes checks only for the selected category.
- `Full Check` runs configured ping and TCP checks; `Ping Only` runs connectivity checks only and shows configured ports as skipped for that execution.
- `Run Failed` appears only when the current dashboard has `Degraded` or `Down` devices and retries only those devices.
- `Run` appears beside the timestamp only for devices in `Degraded` or `Down` state; it executes only that device and replaces its latest dashboard result.
- The dashboard starts empty in manual mode; results appear after `Run All Facilities`, `Run Facility`, or after enabling `Auto Refresh`.
- Full checks stream results progressively, so devices appear as they finish instead of waiting for the whole execution.
- When a full check finishes, facilities show compact collapsible rows with nested category groups. Category groups collapse and show green when every device is healthy, orange when devices are degraded but none are down, and red when at least one device is down.
- The monitoring progress bar is visible only while a full check is running.
- NetWatch Lite starts in manual mode by default.
- `Auto Refresh` runs a full check immediately after the operator turns it on, then repeats every `settings.intervalSeconds`.
- `settings.intervalSeconds` is editable from Configuration and controls the auto full-check timer.
- Auto refresh keeps existing dashboard groups visible while the next full check updates devices progressively.
- Invalid or corrupt `config.json` content is reported through the API/UI instead of crashing silently.
- Missing `config.json` is recreated automatically with a starter `Localhost` ping device.
- If an operating system ping succeeds but NetWatch Lite shows a ping failure, compare the device ping target mode, configured `timeoutMs`, `retryCount`, and `retryDelayMs`. NetWatch Lite uses the per-device `useHostnameForPing` value and the configured timeout, which may be shorter than the operating system ping command's default wait time.
- Configuration read/write problems return controlled API errors so the Configuration page can show the message to the operator.
- Bulk Edit actions can update selected devices by facility, category, enabled state, or ping target mode in one save; the previous JSON file is backed up before replacement.
- JSON import rejects empty files, non-`.json` files, files larger than 5 MB, malformed JSON, and invalid monitor configurations before replacing the current file.
- Runtime support group profiles and themes are local operational data; do not commit them to Git or include them in public releases.
- Monitoring stream failures are logged by the backend and sent to the dashboard as an `error` event when the client is still connected.
- If a group check fails while previous dashboard results are visible, the UI keeps those results on screen and reports the failure in the status line.
- `maxParallelChecks` should be adjusted carefully for large networks.
- `retryCount` adds extra attempts after a failed ping or TCP check. Higher values can improve transient failures but increase total runtime.
- `retryDelayMs` controls the pause between retry attempts.
- TCP checks treat timeouts, refused connections, invalid targets, and unexpected socket failures as unavailable ports; they do not validate application protocol behavior.
- On small screens, wide device tables scroll horizontally while toolbars and forms stack vertically.
