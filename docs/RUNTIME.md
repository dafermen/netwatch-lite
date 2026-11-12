# Supported .NET Runtime

## Current Policy

The application and all .NET tests target **net10.0 (.NET 10 LTS)**. SDK selection
requires **10.0.404** or a later .NET 10 feature band (`global.json`, no previews).
`Directory.Build.props` pins runtime **10.0.15**; the portable validator requires
both Microsoft.NETCore.App and Microsoft.AspNetCore.App at that exact patch.
Microsoft.Data.Sqlite/Mvc.Testing are 10.0.15; SQLitePCLRaw is 2.1.13, the minimum
required by the updated provider. No database schema migration accompanies this.

Microsoft lists .NET 10 support through **2028-11-14** and .NET 8 end of support
on **2026-11-10**. Support requires staying current on servicing patches; this
document is a dated baseline, not a promise that 10.0.15 stays current.
Sources checked 2026-11-12: [support policy](https://dotnet.microsoft.com/en-us/platform/support/policy/dotnet-core)
and [official downloads](https://dotnet.microsoft.com/en-us/download/dotnet/10.0).

## Development And Local Service

With a matching SDK/runtime installed, use the normal commands:

```powershell
dotnet --info
dotnet restore netwatch.sln
dotnet test netwatch.sln --configuration Release
dotnet run --configuration Release --no-launch-profile --urls http://localhost:5000
```

The validated local toolchain is private to this checkout at
`artifacts/tools/dotnet-10.0.404/`. Its official Windows x64 ZIP was SHA-512
verified against Microsoft's release metadata. No machine-wide .NET installation
or persistent environment variable was replaced. Select it in a PowerShell
session before the commands above (also required by npm's dotnet subprocess):

```powershell
cd C:\Projects\netwatch-lite
$env:DOTNET_ROOT = Join-Path $PWD 'artifacts\tools\dotnet-10.0.404'
$env:DOTNET_ROOT_X64 = $env:DOTNET_ROOT
$env:PATH = "$env:DOTNET_ROOT;$env:PATH"
dotnet --info
```

This private path is ignored build tooling, not part of a source clone or portable.
On another developer machine install the matching SDK from Microsoft instead.
The self-contained [portable ZIP](PORTABLE.md) needs no installed .NET SDK/runtime.
Do not solve a missing runtime with major roll-forward to an untested version.

## Compatibility And Servicing

- Keep app, tests, CI, central packages, runtime pin, packaging guard and notices
  consistent. Framework-dependent apps require the pinned patch or newer 10.0 patch.
- Preserve `UseStaticFiles` and physical documentation routes. Adopting
  `MapStaticAssets`, validation generators or new JSON defaults is not necessary
  for this migration and must not change the existing API/portable contract.
- Review both [8-to-9](https://learn.microsoft.com/en-us/aspnet/core/migration/80-to-90)
  and [9-to-10](https://learn.microsoft.com/en-us/aspnet/core/migration/90-to-100)
  migration guidance, plus [.NET 9](https://learn.microsoft.com/en-us/dotnet/core/compatibility/9.0)
  and [.NET 10 breaking changes](https://learn.microsoft.com/en-us/dotnet/core/compatibility/10).
- Revalidate JSON enum/casing/null/unknown-field contracts, SQLite byte-preserving
  documents and projections, all CRUD, SSE/cancellation, strict TLS/HTTP deadlines,
  diagnostics and physical static assets. Use synthetic loopback targets only.
- `scripts/test-runtime-upgrade.ps1` snapshots the active database read-only into
  a private isolated folder, compares eight APIs/raw document hashes/SQL counts,
  and reopens the copy with the older binary to prove rollback compatibility.
  It checks both declared frameworks and restricts roll-forward to patch updates.
  It never migrates or restores over the live database. Its default net8.0 path
  intentionally refers to the historical baseline; retain that binary/runtime.
- Back up before the local switch. Retain original JSON, old binary/runtime and
  verified snapshot. Restore offline into a new folder if needed, never over a
  running database. Runtime compatibility does not guarantee future schema rollback.
- Generate a new versioned folder/ZIP/SHA for every patched portable; never
  rewrite historical artifacts. Self-contained deployments need new packages to
  receive runtime security fixes. Check Microsoft's policy and NuGet advisories
  before each delivery; a green dependency audit is not runtime-support evidence.

See [ADR 0008](adr/0008-dotnet10-lts.md), [migration validation](VALIDATION_DOTNET10_2026-11-12.md)
and [deployment gates](DEPLOYMENT.md). GitHub publication remains on hold; a
supported runtime alone does not provide authentication or stable approval.
