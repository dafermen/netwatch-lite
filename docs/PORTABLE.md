# Versioned Windows Portables

rc.16 includes a pinned Microsoft.Playwright driver (117 exact SHA-256-checked
files), not Edge, cookies, sessions or personal profiles. Microsoft Edge and an
interactive desktop are prerequisites only for [authenticated browser checks](BROWSER_CHECKS.md).
The explicit driver allowlist is separate from the public documentation/UI list;
arbitrary files under `.playwright/` are never accepted as release assets.

## Generate A Candidate

The generator pins **.NET 10 LTS / ASP.NET Core 10.0.15** in Directory.Build.props;
the package validator checks both included versions. rc.14 and older immutable
packages retain their historical runtime. See [runtime servicing](RUNTIME.md).
This remains an evaluation candidate, not stable-deployment approval.

Run from the repository with SDK 10.0.404 (or newer .NET 10 SDK) and Windows PowerShell 5.1 or newer:

```powershell
cd C:\Projects\netwatch-lite
.\scripts\test-packaging.ps1
.\scripts\publish-portable.ps1 -Version 0.8.0-rc.15
```

`-Version` is required. Use a new full version on every build, including a new
prerelease suffix when rebuilding a candidate. The version is passed to .NET
publish and checked against the resulting assembly metadata. It is not inferred
from the last directory name. The initial supported target is Windows x64.

The current local candidate is `0.8.0-rc.15`, upgrading to supported .NET 10 LTS
and retaining the rc.14 English/Spanish UI, inclusive
device/website forms, shared filters/grouping, exact filtered manual/automatic
checks, pause/resume and private diagnostics. GitHub publication is ON HOLD for
this candidate. rc.13 is the preceding public prerelease. See
[current runtime validation](VALIDATION_DOTNET10_2026-11-12.md).

The preceding rc.13 includes the dashboard inventory
preview/search, copy-only Command, individual checks and filter/header controls,
plus the updated neutral Configuration headers and aligned device action icons.
It also includes the redesigned Reports Summary/Runs/Devices views, historical
filters, recorded detail and CSV/JSON exports, first packaged in rc.4. Candidate
rc.5 first adds device Notes, its safe disclosures/search and editing/preservation.
Candidate rc.6 adds separate Location before Notes, with safe display/search and
preservation across current editing/copy/bulk/profile/JSON workflows. Facility
grouping and existing Notes stay unchanged. Candidates rc.1 through rc.5 remain
immutable historical builds; rc.3 predates Reports, rc.4 predates Notes and
rc.5 predates Location. Candidate rc.7 adds per-assignment Wireless/Cabled Link
type alongside USB/Network/Other, retaining unknown legacy values as Not recorded.
Candidate rc.6 and earlier remain unchanged; rc.6 predates the link selector.
Candidate rc.8 adds search expansion, dynamic check-driven forms and SQLite schema
1 with explicit offline migration, backup and JSON reversal. The bundled native
SQLite engine and provider license texts are included. See [storage](STORAGE.md).
Clean installs use SQLite; copying old JSON into an already initialized database
does not import it. Follow migration instructions in a new deployment folder.
All rc.7 and earlier artifacts remain immutable.
Candidate rc.9 adds accessible Shortcuts/Command descriptions only. rc.8 is also
immutable. GitHub publication always requires explicit owner authorization;
the owner authorized the rc.13 source/portable delivery on 2026-11-11, not future
releases or stable deployment. See [current status](../CURRENT_STATUS.md).
Candidate rc.10 removes the Shortcuts note and adds per-check Timeout/Expected
text descriptions, keeping Command help. rc.9 and all earlier outputs remain immutable.
Candidate rc.11 adds SQLite schema-2 relational projections/SQL Reports,
configurable retention, private change history and managed verified backup/restore.
It upgrades schema 1 only with a verified private pre-upgrade snapshot. All rc.10
and earlier outputs remain immutable; older binaries need the older database for
rollback. Data & backups is under Configuration. Native first-run validation
expects schema 2; `test-portable.ps1 -ExpectedStorageSchema 1` changes only that
startup expectation. Older candidates also require their release-compatible
public-asset policy/validator; never modify an archive to satisfy a newer policy.
Candidate rc.12 fixes URL edit/copy visibility and the SQL Reports delete/read
overlap; HTTP-only forms hide Location/Command without losing stored values.
Candidate rc.13 adds the catalog-backed Dashboard Device Type filter before
Category, including server-enforced scoped checks and typed result identities.
No schema migration or old-history rewrite is needed. Deploy its backend and
static assets together; publishing to GitHub does not deploy a hosted backend.
All rc.12 and earlier outputs remain immutable. Final candidate evidence and
limitations are recorded in [dashboard validation](VALIDATION_DASHBOARD_TYPES_2026-11-11.md);
generation is not deployment approval.

```text
artifacts/
|-- portable/NetWatch-Lite-v{version}-win-x64/
|-- packages/NetWatch-Lite-v{version}-win-x64.zip
|-- packages/NetWatch-Lite-v{version}-win-x64.zip.sha256
|-- verification/{run-id}/
`-- .staging/{build-id}/
```

These are local, ignored outputs, not GitHub Releases. Existing archives under
`releases/` are historical and are never moved, replaced or deleted by this tool.
The new portable folder, ZIP and SHA-256 sidecar must all exist before delivery
is considered successful. Always deliver all three, not just the folder. The ZIP
is the primary file to copy/share and must accompany every new version, as a
standing user requirement. Do not commit generated artifacts.

## History And Failure Rules

- Existing version folders, ZIPs or checksum files cause a failure before
  publishing. There is no overwrite/force mode.
- A CreateNew lock serializes publishers. A concurrent run fails rather than
  sharing build state. After a crash, inspect the process and staging evidence
  before manually removing a stale `.publish.lock`; never remove a live lock.
- Output paths must stay under this repository's `artifacts/`. Redirected
  directories and symlink/junction package entries are rejected.
- Build/restore output is isolated under a fresh staging directory. It does not
  replace the development service's binary or another portable version.
- After success, only that run's verified GUID staging directory is removed.
  Historical outputs and verification evidence are never cleanup targets.
- Build, content, ZIP or startup failure prevents promotion. Staging and test
  evidence remain for diagnosis. A filesystem failure during the final three
  non-overwriting moves can leave partial outputs: preserve them and use a new
  version after review. Never repair by overwriting an existing artifact.

## Privacy Boundary

The portable publish target emits only application/runtime binaries and the
required dependency/runtime metadata. The packager then uses an explicit public
file allowlist in `scripts/portable-public-files.json`, not a recursive copy of
the working directory. Update that allowlist deliberately when public assets or
guides are added. Unknown package files are rejected even when hashed.

`appsettings.json` and `config.sample.json` are generated from neutral templates,
not copied from developer files. The sample contains only localhost/127.0.0.1;
monitoring paths are relative, and AllowedHosts is loopback-only. No current
devices, support groups, themes, history, error logs, integrations, exports,
backups, private environment configuration, Excel files, tests, test dependencies or
previous artifacts are included. Root application/runtime DLLs are selected from
the generated dependency metadata; .NET/ASP.NET Core/SQLite license notices are included.
Databases, journals/sidecars, leases, storage-backups and storage-exports are never
packaged. A clean first run creates netwatch.db only in the disposable/deployed copy.

This is a file-selection boundary, not automatic secret classification of source
code or approved public documentation. Review allowed sources and complete the
security gate before distribution. Bundled runtimes need rebuilding to receive
security updates; a machine's shared runtime update does not patch the ZIP.
See [Microsoft publishing modes](https://learn.microsoft.com/en-us/dotnet/core/deploying/).

## ZIP And Startup Checks

Every generation validates the staged folder, creates a ZIP, extracts that exact
ZIP into a new verification directory and checks:

- Explicit file policy, required files, manifest hashes and matching versions.
- Included .NET 10/ASP.NET Core runtimes, generated settings and loopback sample.
- Rejection of corrupted sample/binary/metadata and injected config/database/sidecar/lease files.
- ZIP traversal, duplicate/redirected entries and expanded-size limits.
- Native EXE startup from a different working directory with an explicit
  content root on an ephemeral loopback port, never port 5000.
- Application/master/docs pages and read-only config/regions/themes/history/
  integration/storage APIs; SQLite first run without physical runtime JSON and
  unchanged packaged bytes.
- The original ZIP/folder remains unchanged. The test process is stopped in
  cleanup. Inherited app/runtime settings are not passed to the test child.

No monitoring execution, DNS lookup, real inventory import or outbound HTTP
check is requested. Startup tests use a disposable extracted copy only; they
never start the historical portable folder. Evidence is `result.json` plus
stdout/stderr under `artifacts/verification/`.

Retest an existing artifact without modifying it:

Use the packaging scripts/public policy from that artifact's source version;
future asset/runtime policy changes can intentionally reject older layouts.

```powershell
.\scripts\test-portable.ps1 -ZipPath .\artifacts\packages\NetWatch-Lite-v0.8.0-rc.7-win-x64.zip
.\scripts\test-portable.ps1 -PortablePath .\artifacts\portable\NetWatch-Lite-v0.8.0-rc.7-win-x64
Get-FileHash .\artifacts\packages\NetWatch-Lite-v0.8.0-rc.7-win-x64.zip -Algorithm SHA256
```

Compare that hash with the sidecar before transferring/extracting the ZIP.
Hashes detect accidental corruption; they are not signatures or proof of origin.
The manifest is checked by packaging/test scripts, not a tamper-blocking launcher.
Passing these tests is not proof of operation on every Windows machine or
completion of all thirteen [deployment gates](DEPLOYMENT.md).

## Run And Upgrade

1. Keep `artifacts/portable/` unchanged as an archival snapshot.
2. Extract the complete ZIP into a new local deployment directory, not over an
   existing installation. Keep runtime DLLs, wwwroot and docs together.
3. Run `Start-NetWatch.cmd`; it sets the working/content root and binds to
   `http://localhost:5000`. It does not install a service or open a firewall.
4. If port 5000 is occupied, identify the listener first. Use an intentional
   alternative `--urls` argument or stop the known old instance; never terminate
   an unknown process. Do not run two writers on the same data directory.
5. Configure through `/config` or migrate/export/back up runtime profiles
   privately. No operational files are automatically copied during packaging.
6. Complete real operator acceptance before replacing a deployment. Keep the
   old application and compatible configuration for rollback.

This unauthenticated backend remains an internal tool. Loopback defaults are
not authentication. Network binding, trusted access and destination controls
require a separate deployment decision. Source pushes do not upload ZIPs;
GitHub Release publication requires explicit authorization and release evidence.
The browser still loads Bootstrap/Font Awesome from their existing CDNs; this
generator does not add offline frontend dependencies or certify offline use.

See [validation](VALIDATION_PERIPHERAL_LINKS_2026-11-09.md), [operations](OPERATIONS.md),
[testing](TESTING.md) and [deployment](DEPLOYMENT.md).
