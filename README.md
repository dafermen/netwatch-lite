# NetWatch-Lite

NetWatch-Lite is a .NET 8 ASP.NET Core + Bootstrap network monitoring dashboard. It reads an editable JSON file, runs asynchronous ping and TCP checks, computes device health, groups results by category, and can be published as a portable Windows executable with the .NET runtime included.

Full visual documentation is available at [docs/index.html](docs/index.html).

Programmer documentation is available at [docs/developer-guide.md](docs/developer-guide.md).

Release notes and commit-level project history are summarized in [CHANGELOG.md](CHANGELOG.md).

GitHub repository: [https://github.com/dafermen/netwatch-lite](https://github.com/dafermen/netwatch-lite).

## Portable Download

Download the latest Windows x64 portable ZIP:

[Download NetWatch Lite portable ZIP](https://github.com/dafermen/netwatch-lite/raw/refs/heads/main/releases/NetWatch-Lite-win-x64-portable-2026-06-06-config-import-export.zip)

Extract the ZIP on Windows and run `NetWatch-Lite.exe`. The editable `config.json` file is included beside the executable.

## Screenshots

### Dashboard

![NetWatch Lite dashboard](docs/assets/netwatch-lite-dashboard.png)

### Configuration

![NetWatch Lite configuration](docs/assets/netwatch-lite-configuration.png)

## Features

- Editable `config.json` inventory.
- Device categories such as `Servers`, `Critical Workstations`, `IP Cameras`, and `Power Devices`.
- Async ping checks with latency in milliseconds.
- Optional per-device hostname-based ping mode for networks where IP addresses can change.
- Optional `websiteUrl` per device for opening an associated web page from the dashboard.
- Async TCP port checks.
- Parallel execution with `Task.WhenAll`.
- Global concurrency limit with `maxParallelChecks`.
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
- Category groups collapse after a full check and show green or red health bars by category.
- Hamburger sidebar navigation.
- Branded NetWatch Lite logo and favicon.
- Embedded Windows executable icon for portable builds.
- Built-in User Manual and About pages.
- Companion Windows WebView2 wallboard is maintained in the sibling `netwatch-lite-wallboard` repository.
- Responsive layout for desktop, tablet, and mobile screens.
- Configuration page at `/config`.
- CRUD UI for devices and checks stored in `config.json`.
- Editable auto refresh interval, timeout, max parallel check limit, and per-device ping target mode in `/config`.
- Add, update, and delete device actions save immediately to `config.json`.
- Configuration device table grouped by category for easier editing.
- Configuration devices can be filtered by name, address, or hostname.
- Configuration category groups collapsed by default.
- Add/edit device form opens in a modal so large category lists do not push the editor out of view.
- Configuration JSON export and import from `/config`, with server-side validation before imported files replace the current config.
- Manual mode by default.
- Optional auto refresh toggle that runs a full check using `settings.intervalSeconds`.
- Forced full check.
- Category-scoped dashboard checks for running one group, such as IP Cameras, without checking the full inventory.
- Progressive dashboard rendering through Server-Sent Events while checks are still running.
- Visible monitoring progress with percentage and checked/total count while a run is active.
- JSON reload without restarting.

## Project Structure

```text
netwatch-lite/
├── Assets/
│   └── netwatch-lite.ico
├── Data/
│   └── config.json
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
│   └── MonitorSettings.cs
├── Services/
│   ├── JsonDeviceRepository.cs
│   ├── MonitorExecutionService.cs
│   ├── NetworkMonitorOptions.cs
│   └── NetworkMonitorService.cs
├── wwwroot/
│   ├── app.js
│   ├── index.html
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
    "DeviceFilePath": "config.json"
  }
}
```

During local development, `Data/config.json` is copied to the build output as `config.json`. During portable publish, it is copied next to `NetWatch-Lite.exe`. If `config.json` is missing on first run or was deleted, NetWatch Lite creates a starter configuration with one `Localhost` ping device.

## Device JSON Format

```json
{
  "settings": {
    "intervalSeconds": 15,
    "timeoutMs": 1000,
    "maxParallelChecks": 50
  },
  "devices": [
    {
      "name": "Web Server",
      "ip": "192.168.4.10",
      "hostname": "web-server.local",
      "useHostnameForPing": true,
      "websiteUrl": "https://example.local/status",
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

Use `category` to group devices in the UI. Use `enabled: false` to keep a device in the file without monitoring it. Use optional `websiteUrl` to show an `Open website` link in the dashboard; it must be an absolute `http://` or `https://` URL. Set `useHostnameForPing` on each device to choose whether that device's ping checks use `hostname` or `ip`. TCP checks continue to use `ip`.

## Companion Wallboard Project

The Windows WebView2 wallboard is maintained as a separate sibling project:

[https://github.com/dafermen/netwatch-lite-wallboard](https://github.com/dafermen/netwatch-lite-wallboard)

That project renders operational monitoring pages in native WebView2 panels for pages that block iframe embedding.

## API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/devices` | Returns normalized devices from the loaded JSON. |
| `POST` | `/api/reload` | Reloads `config.json` from disk. |
| `GET` | `/api/config` | Returns the full editable configuration. |
| `POST` | `/api/config` | Saves the full configuration, creates `config.backup.json`, and reloads memory. |
| `GET` | `/api/config/export` | Downloads the current normalized configuration as JSON. |
| `POST` | `/api/config/import` | Imports a `.json` config file, validates it, creates `config.backup.json`, saves it, and reloads memory. |
| `GET` | `/api/results` | Backwards-compatible endpoint that forces a full check. |
| `POST` | `/api/monitor/run` | Forces a full check and prevents overlapping executions. |
| `GET` | `/api/monitor/stream` | Streams a full check progressively with `started`, `result`, `completed`, `busy`, and `error` events. Supports optional `category` query filtering. |

## Version Notes

Changes are documented in [CHANGELOG.md](CHANGELOG.md). Each Git commit should keep a concise message describing the change, and user-facing changes should also be added to the changelog.

## License

NetWatch Lite is released under the [MIT License](LICENSE). You can use, copy, modify, merge, publish, distribute, sublicense, and sell copies of the software under the license terms.

## Source Documentation

The C# source includes XML documentation comments for models and services. The frontend JavaScript includes JSDoc comments for dashboard rendering, filtering, backend calls, and execution controls.

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
dotnet publish NetWatch.csproj -c Release -r win-x64 --self-contained true -p:PublishSingleFile=false -o publish/win-x64-portable
```

Expected output:

```text
publish/win-x64-portable/
├── NetWatch-Lite.exe
├── config.json
├── appsettings.json
├── wwwroot/
└── runtime dependencies...
```

Create a ZIP on macOS:

```bash
ditto -c -k --sequesterRsrc --keepParent publish/win-x64-portable publish/NetWatch-Lite-win-x64-portable.zip
```

To run on Windows:

```powershell
.\NetWatch-Lite.exe
```

Edit `config.json` in the same folder as `NetWatch-Lite.exe`, or use the `/config` page. Device add, update, and delete actions save immediately; saving through the UI creates `config.backup.json`.

## Operational Notes

- `Run Full Check` executes all configured checks immediately.
- `Run Group` executes checks only for the selected category.
- The dashboard starts empty in manual mode; results appear after `Run Full Check` or after enabling `Auto Refresh`.
- Full checks stream results progressively, so devices appear as they finish instead of waiting for the whole execution.
- When a full check finishes, category groups collapse and show a green bar when every device is healthy or a red bar when attention is needed.
- The monitoring progress bar is visible only while a full check is running.
- NetWatch Lite starts in manual mode by default.
- `Auto Refresh` runs a full check immediately after the operator turns it on, then repeats every `settings.intervalSeconds`.
- `settings.intervalSeconds` is editable from Configuration and controls the auto full-check timer.
- Auto refresh keeps existing dashboard groups visible while the next full check updates devices progressively.
- Invalid or corrupt `config.json` content is reported through the API/UI instead of crashing silently.
- Missing `config.json` is recreated automatically with a starter `Localhost` ping device.
- Configuration read/write problems return controlled API errors so the Configuration page can show the message to the operator.
- JSON import rejects empty files, non-`.json` files, files larger than 5 MB, malformed JSON, and invalid monitor configurations before replacing the current file.
- Monitoring stream failures are logged by the backend and sent to the dashboard as an `error` event when the client is still connected.
- If a group check fails while previous dashboard results are visible, the UI keeps those results on screen and reports the failure in the status line.
- `maxParallelChecks` should be adjusted carefully for large networks.
- TCP checks treat timeouts, refused connections, invalid targets, and unexpected socket failures as unavailable ports; they do not validate application protocol behavior.
- On small screens, wide device tables scroll horizontally while toolbars and forms stack vertically.
