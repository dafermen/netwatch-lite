# Third-Party Notices

## Authenticated Browser Driver

Microsoft.Playwright 1.64.1 (.NET client/driver) is Apache-2.0, distributed by
Microsoft: https://github.com/microsoft/playwright-dotnet. The portable includes
upstream driver LICENSE/NOTICE and bundled Node.js LICENSE under `.playwright/`.
`scripts/portable-browser-files.json` pins all 117 driver files by SHA-256.
Microsoft Edge is an external, separately licensed prerequisite, not redistributed.
Never distribute browser login state.

## SQLite Persistence

- Microsoft.Data.Sqlite / Microsoft.Data.Sqlite.Core 10.0.15: MIT, maintained by
  the .NET Foundation and contributors; https://github.com/dotnet/efcore.
- SQLitePCLRaw bundle/core/provider/native library 2.1.13: Apache-2.0,
  Copyright 2014-2024 SourceGear, LLC; https://github.com/ericsink/SQLitePCL.raw.
- SQLite itself is public domain; https://www.sqlite.org/copyright.html.

Portable candidates include the official license texts under `licenses/sqlite/`.
The provider text matches efcore v10.0.15 LICENSE.txt. SQLitePCLRaw 2.1.13 declares
Apache-2.0; the mirrored Apache text is retained from v2.1.12 LICENSE.TXT.
Exact resolved versions remain in restore/build
metadata; a bundled native library is not an installed database service.

NetWatch Lite loads the following frontend dependencies from public CDNs:

## Bootstrap 5.3.3

- Project: https://getbootstrap.com/
- License: MIT
- Source: https://github.com/twbs/bootstrap

## Font Awesome Free 6.5.2

- Project: https://fontawesome.com/
- Source: https://github.com/FortAwesome/Font-Awesome
- Code license: MIT
- Font license: SIL Open Font License 1.1
- Icon license: CC BY 4.0

NuGet test dependencies and their transitive licenses are governed by their
respective package notices. Review this file whenever a distributed or
runtime-loaded dependency changes.

## Self-Contained Windows Runtime

Current portable candidates bundle .NET 10 LTS and ASP.NET Core runtime binaries. Their
license and third-party notices are included under `licenses/dotnet-runtime/`
and `licenses/aspnetcore-runtime/`. If an ASP.NET Core runtime pack declares MIT
but omits a standalone LICENSE file, the packager uses the official notice
mirrored in `scripts/notices/aspnetcore-LICENSE.txt`, verified against
https://raw.githubusercontent.com/dotnet/aspnetcore/v10.0.15/LICENSE.txt (same text,
blank-line formatting aside).
Third-party notices still come from the exact restored runtime pack.

