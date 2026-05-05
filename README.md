# NetWatch-Lite

NetWatch-Lite is a .NET 8 ASP.NET Core + Bootstrap network monitoring dashboard. It reads an editable JSON file, runs asynchronous ping and TCP checks, computes device health, groups results by category, and can be published as a portable Windows executable with the .NET runtime included.

Full visual documentation is available at [docs/index.html](docs/index.html).

## Features

- Editable `devices.json` inventory.
- Device categories such as `Servers`, `Critical Workstations`, `IP Cameras`, and `UPS Units`.
- Async ping checks with latency in milliseconds.
- Async TCP port checks.
- Parallel execution with `Task.WhenAll`.
- Global concurrency limit with `maxParallelChecks`.
- Aggregated status:
  - `Healthy`: ping success and all ports open.
  - `Degraded`: ping success but at least one port closed.
  - `Down`: ping failed.
- Dashboard summary metrics:
  - Total devices.
  - Online devices.
  - Offline devices.
  - Degraded devices.
  - Availability percentage.
- Search and client-side filters.
- Collapsible category groups.
- Auto refresh toggle.
- Manual refresh.
- Forced full check.
- JSON reload without restarting.

## Project Structure

```text
netwatch-lite/
├── Data/
│   └── devices.json
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
│   └── MonitorSettings.cs
├── Services/
│   ├── JsonDeviceRepository.cs
│   ├── MonitorExecutionService.cs
│   ├── NetworkMonitorOptions.cs
│   └── NetworkMonitorService.cs
├── wwwroot/
│   ├── app.js
│   ├── index.html
│   └── styles.css
├── docs/
│   └── index.html
├── appsettings.json
├── NetWatch.csproj
├── Program.cs
└── README.md
```

## Configuration

The device JSON path is configured in `appsettings.json`.

```json
{
  "NetworkMonitor": {
    "DeviceFilePath": "devices.json"
  }
}
```

During local development, `Data/devices.json` is copied to the build output as `devices.json`. During portable publish, it is copied next to `NetWatch-Lite.exe`.

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

Use `category` to group devices in the UI. Use `enabled: false` to keep a device in the file without monitoring it.

## API Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/devices` | Returns normalized devices from the loaded JSON. |
| `POST` | `/api/reload` | Reloads `devices.json` from disk. |
| `GET` | `/api/results` | Backwards-compatible endpoint that forces a full check. |
| `GET` | `/api/monitor/refresh` | Returns current cached results, running the first check if needed. |
| `POST` | `/api/monitor/run` | Forces a full check and prevents overlapping executions. |

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
├── devices.json
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

Edit `devices.json` in the same folder as `NetWatch-Lite.exe`, then use the dashboard `Reload JSON` button.

## Operational Notes

- `Run Full Check` executes all configured checks immediately.
- `Refresh Now` reads the current cached backend result.
- `Auto Refresh` uses `settings.intervalSeconds`.
- `maxParallelChecks` should be adjusted carefully for large networks.
- TCP checks verify that a connection can be opened; they do not validate application protocol behavior.
