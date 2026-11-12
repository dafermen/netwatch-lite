# NetWatch Lite Testing Guide

Current runtime scope/receipts: [.NET 10 validation](VALIDATION_DOTNET10_2026-11-12.md).
Use the [matching SDK/runtime](RUNTIME.md) before running commands below.
The per-test isolated application fixture has a separate 30-second preparation/
cleanup budget, with copy/startup/setup metrics attached. Workflow timeout stays
30 seconds, UI assertions 8 seconds and server readiness 15 seconds. This avoids
charging cold runtime/file-copy preparation against UI behavior; it does not
establish a production performance SLO. See [Playwright fixture timeouts](https://playwright.dev/docs/test-fixtures#fixture-timeout).
Windows fixtures use bounded, copy-only Robocopy for public wwwroot/docs assets
(no mirroring, purging or junction copying); other platforms retain Node's copy.
Runtime databases/configuration remain fresh private copies, never shared links.
Feature baseline: [multilingual monitoring validation](VALIDATION_MULTILINGUAL_2026-11-12.md).
New browser suites cover exact/shared filters, pause/resume, both languages,
draft-safe switching and Diagnostics consultation/export. Pure seeded predicates:

```powershell
node --test tests/javascript/monitoring.test.cjs
```

Eight sampled monitoring mutants cover exact keys, revision, expiry and paused
state in addition to legacy scope/classification; this is not whole-app coverage.

Use this document before an internal release or before asking another developer to continue the project.

## Current Review Scope

Review the current MVP without assuming future Nexus Intelligence capabilities are already implemented. NetWatch Lite currently covers local monitoring, configuration, support groups, themes, reports, local history, local error logging, and local integration settings.

## Pre-Deployment Test Policy

The functional review in this document is the acceptance and smoke-test portion
of the release process. Before deployment, also complete the mandatory test
matrix in `docs/DEPLOYMENT.md`:

1. Acceptance testing.
2. Unit testing.
3. Property and invariant testing.
4. Mutation testing.
5. Fuzz testing.
6. Integration testing.
7. Contract testing.
8. End-to-end testing.
9. Regression testing.
10. Security testing.
11. Concurrency and resilience testing.
12. Performance and resource testing.
13. Compatibility and deployment testing.

Each category requires recorded evidence or an explicit exception documenting
the reason, risk, compensating control, and project-owner approval.

## Automated Suites

`DashboardDeviceTypeTests.cs` verifies server-enforced classification intersections,
identical names/addresses across types, unspecified legacy records, unknown IDs
and unchanged global scope on both providers. Browser cases in
`dashboard-device-type.spec.cjs` cover read-only selection, categories, search/
status/Facility, exact scoped runs, individual/failed checks, removed types,
automatic global monitoring and responsive layout. See [filter behavior](DASHBOARD_FILTERS.md).
`scripts/test-monitoring-mutations.ps1` validates four sampled scope/classification
mutants against a passing isolated baseline. Build/tool failures do not count as
killed mutants; this is targeted coverage, not whole-application mutation testing.

URL CRUD regressions additionally verify monitored-URL search, visibility after
successful edits/copies, compact HTTP-only fields with hidden-value preservation,
failure/retry, disabled devices and Dashboard pending rows without monitoring.
`tests/NetWatch.ContractTests/DeviceCrudPersistenceTests.cs` verifies HTTP create,
row update, full-copy save, rejected-write atomicity, service restart and deletion,
including independent SQLite projection IDs. Run the complete browser suite for
both `NETWATCH_TEST_STORAGE=sqlite` and `json`; both viewports are required.
See [URL CRUD evidence](VALIDATION_URL_CRUD_2026-11-11.md).
The delayed-delete case in `tests/e2e/storage-sql.spec.cjs` holds the history
mutation beyond the SQL render debounce and asserts that no query starts during
the pending write. It verifies the empty view and persisted history afterward.

Packaging has separate PowerShell guard and exact-ZIP startup suites:
`scripts/test-packaging.ps1` and `scripts/test-portable.ps1`. Generation runs the
ZIP suite automatically in an isolated extraction on an ephemeral loopback port.
See [portable validation](VALIDATION_PORTABLE_2026-11-07.md) for commands and limits.

The solution currently contains:

- `tests/NetWatch.UnitTests`: pure rules and model defaults.
- `tests/NetWatch.IntegrationTests`: SQLite/JSON persistence, migration, transaction rollback,
  normalization, and validation using isolated temporary directories.
- `tests/NetWatch.ContractTests`: isolated ASP.NET Core HTTP tests for the
  application and documentation entry points, documentation assets, and
  configuration, region, integration, history, and error response contracts.

Run all current automated tests:

```powershell
dotnet test netwatch.sln
```

Collect cross-platform coverage:

```powershell
dotnet test netwatch.sln --collect "XPlat Code Coverage" --results-directory TestResults
```

Storage now has deterministic invariant/256-case fuzz checks, migration/rollback/
backup/restart/concurrency tests, and six hand-selected mutation probes via
`scripts/test-storage-mutations.ps1`. These are targeted baselines, not full
application fuzz/mutation/security/performance certification. Operator acceptance,
resource/SLO analysis and other-PC compatibility remain deployment gates.

Schema-2 tests additionally cover byte-preserving upgrade with verified backup,
failure rollback of document/projection/audit together, casing/numeric enums,
duplicate legacy IDs, page/whole-filter invariants, stale export revisions,
pre-prune archive failure, managed backup ownership/rotation and new-folder restore.
The 5000-evaluation query sample records response bytes/time without claiming an
SLO or general speedup. `storage-sql.spec.cjs` uses real isolated monitoring and
checks complete 132-evaluation exports through bounded SQL pages on desktop/mobile.
Legacy Reports presentation mocks explicitly select the JSON adapter.
`scripts/test-relational-pilot.ps1` takes a consistent private read-only snapshot,
compares eight schema-1/2 APIs, checks exact document bytes and restores the old
snapshot with the older binary. Never run mutations on operator data.
It requires a retained schema-1 database/binary (pass `-SourceRoot` and
`-LegacyDll` explicitly), not the current schema-2 service. `-LegacyDotnet` and
`-CandidateDotnet` select separate hosts across framework generations. Use
`scripts/test-runtime-upgrade.ps1` for the current .NET 8-to-10/schema-2 pilot.
The schema-1 copy is warmed with its legacy binary before freezing the baseline:
first-run theme/integration default backups are not mistaken for migration edits.
All baseline document bytes/counts must still match exactly after upgrading.

For Windows file-I/O diagnosis, run projects and xUnit collections sequentially:

```powershell
dotnet test netwatch.sln -m:1 -- RunConfiguration.MaxCpuCount=1 xUnit.ParallelizeTestCollections=false
```

Explicit concurrency tests retain their own concurrent operations. Record both
parallel failures and sequential results; a green repeat is not a root-cause
resolution of sharing/File.Replace incidents. Runner controls follow
[xUnit RunSettings](https://xunit.net/docs/config-runsettings).

Browser regressions can use either isolated provider:

```powershell
$env:NETWATCH_TEST_STORAGE = 'sqlite' # or json
npm run test:e2e
```

The normal .NET fixture remains explicitly JSON to retain corruption/recovery
coverage; SqliteWorkflowTests runs both providers and tests profile transaction
rollback. Run .NET suites separately from browser/packaging workloads. A short
end-to-end HTTP deadline may expire before headers; deterministic unit transport
tests independently verify null-before-headers and 200-after-headers body timeout.
No HTTP deadline was extended to satisfy the test.

## Browser And Resilience Baseline

Peripheral Link type coverage checks legacy/null/blank/case normalization,
independent per-unit values, preservation through editing/copy/bulk/profile/JSON,
clearing without other field loss, invalid value rejection on full/row/import,
and exclusion from results/history. Desktop/mobile tests cover both peripheral
kinds, duplicate models, Connection/address independence, summaries and layout.
See [link validation](VALIDATION_PERIPHERAL_LINKS_2026-11-09.md).

Device Location has isolated contract cases for missing/null/blank/max values,
single-line/control/size rejection without replacement, trimming, persistence
and absence from results/history. Browser cases verify Location before Notes,
no Facility/Notes rewrites, normal/Advanced/copy/bulk/profile/JSON preservation,
clearing/reset, search before/after checks, escaping and desktop/mobile bounds.
See [Location validation](VALIDATION_DEVICE_LOCATION_2026-11-08.md).

Device Notes adds contract coverage for missing/null/blank, multiline, size and
control-character boundaries, normalization, reload/row saves, export/import,
profile copy and exclusion from results/history. Invalid values must not replace
the prior configuration. Browser cases cover add/edit/copy, unrelated bulk saves,
JSON/profile round trips, clearing/reset, literal HTML, keyboard disclosure,
search before/after checks and long-text bounds on desktop/mobile. Use isolated
synthetic names/locations only. See [Notes validation](VALIDATION_DEVICE_NOTES_2026-11-08.md).

Dashboard search adds four workflows on both desktop/mobile: pre-execution
search over enabled inventory without monitor calls/config writes/history;
facility/category intersection versus all-facility group scope; single pending
device execution with other sites still searchable; and failed SPA reload
clearing stale inventory followed by successful retry. Cases assert neutral
ping/TCP/HTTP states, status filters, escaped text, viewport bounds and exact
backend history scope/results. Screenshots use isolated synthetic inventories.

Device actions add clipboard success/fallback/denial, focus preservation,
literal quotes/HTML escaping, current form/copy/bulk/export/import persistence,
post-execution Command availability, whole-band/arrow/keyboard collapse, filter
reset retaining history and exact row scope across duplicate name/address in
different categories. Browser clipboard adapters are stubbed: tests do not read
or replace the operator's system clipboard and do not execute stored commands.
Contract tests cover legacy/blank/max-size commands, persistence across row and
profile workflows, absence from results/history and rejected controls/oversize
on full saves, row saves and import without replacement.

The 2026-11-07 dashboard/device-action checkpoint passed 222 .NET tests
(33 unit, 7 integration, 182 contract) and 76 Chromium cases (38 desktop,
38 mobile), without failures, skips or browser retries. Release build had no
warnings/errors. Coverage was collected; these results do not replace the
remaining deployment gates or certify the operator's real OS clipboard.

Configuration presentation adds four desktop/mobile cases for neutral bands
in normal/Bulk Edit, unchanged custom colors/active theme, collapse behavior,
accessible icon actions and button geometry/hit testing without overlap or
page overflow. Two contract tests cover default colors and legacy built-in
refresh while retaining custom palettes and inventory.

The final combined checkpoint passed 224 .NET tests (33 unit, 7 integration,
184 contract) and 80 Chromium cases (40 desktop, 40 mobile). A previous .NET
run's Windows history-file replacement error remains recorded with three
isolated passes and the successful full rerun in
[continuity status](../CURRENT_STATUS.md). Its root cause remains unconfirmed;
these local passes are not production resilience approval.

Portable rc.3 adds a deterministic desktop/mobile regression for device deletion
confirmation and cancellation during the opening transition. It reproduces the
stuck dialog before the fix without arbitrary sleeps, then verifies closure,
removed backdrops, exact deletion and unchanged inventory after cancellation.
The final rc.3 source checkpoint passed all 224 .NET tests and 82 Chromium cases
(41 desktop, 41 mobile), without skips or automatic browser retries.

The administration redesign adds ten workflows on desktop/mobile for Support
Groups, Themes, shared confirmation/focus and navigation. Coverage includes
unchanged inventories/unrelated palettes, active versus selected state,
immediate naming persistence, dirty-color discard/cancel, failed reads/writes,
browser back, keyboard menus and protected deletion. Existing catalog tests use
the shared confirmation. That checkpoint had 194 passing .NET tests and 58
passing Chromium cases (29 desktop, 29 mobile), with no failures/skips. See
[management validation](VALIDATION_MANAGEMENT_2026-11-07.md) for evidence and
remaining deployment gates.

Device-type validation adds three unit cases and 52 contract cases: defaults,
independent catalogs, protected keys/names, malformed definitions on save/import,
reference protection including disabled devices, preservation through copies/
row updates/import/export, fresh-inventory mutation, concurrent revisions and
profile-change conflicts. That checkpoint had 194 .NET tests (33 unit,
7 integration, 154 contract), alongside 38 passing browser cases. Four new
browser workflows run on both desktop and mobile, covering catalog CRUD/filtering,
editor choices, copy/bulk/profile
preservation, safe labels, stale-edit/reload behavior and load failure/retry.
See [device-type validation](VALIDATION_DEVICE_TYPES_2026-11-07.md).

The HTTP/HTTPS baseline is 139 .NET tests (30 unit, 7 integration, 102 contract)
and 30 Chromium desktop/mobile workflows. New coverage checks exact status and
literal text, default options, timeout while waiting for headers/body, bounded
known/unknown-length content, decoding, safe transport errors, caller cancellation,
strict TLS with a local untrusted certificate, no redirect following, retries,
SSE/history diagnostics, Ping Only skipping, save/import validation and unchanged
data after rejection. Browser cases verify editor defaults, derived host,
reload/copy/bulk/export preservation, safe text and visible dashboard/report
failures using local synthetic web targets. See
[HTTP validation](VALIDATION_HTTP_2026-11-06.md).

The Workstations view baseline is 85 .NET tests and 24 Chromium workflows.
Eight new desktop/mobile cases verify pending versus None, absent metadata,
explicit types, disabled monitoring records, combined filters/search, unique
workstation rows versus assignment counts, stable reverse-lookup URLs, missing
models, pagination/reload/back, active-profile isolation and safe load failure.
The view is also checked for unchanged exported data, escaped notes and mobile
page overflow. See [the validation record](VALIDATION_WORKSTATIONS_2026-11-06.md).

The preceding baseline after peripheral inventory had 85 .NET tests (11 unit,
7 integration, 67 contract) and 16 Playwright Chromium workflows. Catalog
coverage checks legacy defaults, self-contained profile copies, reload/row-save/
export/import preservation, deletion of referenced models and malformed/null/
duplicate/wrong-kind assignments. Browser tests create/edit/filter/delete models,
assign multiple printer/scanner units, preserve metadata through copy/bulk edits,
and verify safe rendered notes and confirmation before clearing recorded data.
See [peripheral validation](VALIDATION_PERIPHERALS_2026-11-06.md).

The preceding 2026-11-06 baseline had 45 .NET tests and 10 Chromium workflows,
covering desktop (1440px) and emulated mobile (390px). The HTTP suite now checks
overlapping executions, cancelled waiters, interrupted stream callbacks,
concurrent row updates and history appends, legacy run IDs, restart persistence
and manual backup restore after damaged configuration/history.

Browser tests exercise device create/edit/copy/delete, settings persistence,
JSON import/export and rejection, profile isolation/switching, dashboard
monitoring, report filters/export/targeted deletion, docs search/theme,
mobile menu, and return navigation. The report deletion test uses real UI
interaction against the backend, not an API stub.

Install/run from the repository root with .NET 10 and Node.js available:

```powershell
dotnet restore netwatch.sln
npm ci --ignore-scripts
npx playwright install chromium
npm run test:e2e
```

`npm run test:e2e` first publishes a Release candidate to ignored `tests/.app/`.
Stop the shared local service before rebuilding if it holds the Release DLL
open on Windows. After publishing, `npx playwright test` repeats only browser
tests against that candidate. Restore port 5000 after the build/test session.
See [runtime selection troubleshooting](TROUBLESHOOTING.md) if testhost chooses
an incompatible per-user .NET installation.

Each browser test starts its own server with a unique temporary content root,
separate runtime files/profile directory, and an OS-assigned loopback port.
The fixture removes only its owned temporary directory after stopping the
server. It never attaches to the shared service or accepts an operational URL.
Bootstrap and Font Awesome requests are fulfilled from test-only npm packages
at the exact production versions; backend requests are real. Thus CDN reachability
is outside this suite. Mobile Chromium emulation is not a real-device or Safari
compatibility certification.

Evidence is written to `playwright-report/` and `test-results/`. Failed browser
tests retain a trace, screenshot and isolated server log; documentation tests
also save desktop/mobile screenshots on success. Open the HTML report with
`npm run test:e2e:report`. Configuration follows the
[Playwright configuration guide](https://playwright.dev/docs/test-configuration)
and [trace guidance](https://playwright.dev/docs/trace-viewer).

CI runs .NET tests with coverage plus a separate browser job with npm audit,
Chromium install and evidence upload. Remote CI has not been executed locally.
See [the validation record](VALIDATION_2026-11-06.md) for exact evidence and
remaining limitations.

The historical 2026-11-05 regression baseline contained 36 passing tests (11 unit,
7 integration, 18 contract). Atomic writer tests verify preserved destination
and backup on serialization failure, cancellation cleanup, repeated backup
rotation and copy collisions. HTTP tests verify rejected null device/check
entries on save/import, unchanged configuration after rejection, safe problem
responses even when local logging fails, and SSE completion/history with an
empty inventory. See [validation evidence](VALIDATION_2026-11-05.md).

## Documentation Navigation Flow

- Open `/docs/` from the application sidebar and return with `Volver a la aplicacion`.
- Confirm desktop navigation, current-section highlighting, `En esta pagina`,
  and previous/next links update while moving through the manual.
- Search for a known term and confirm local results link to matching sections.
- Switch between light and dark themes and confirm the choice persists.
- At a 390-pixel mobile viewport, open and close the drawer, follow a section
  link, and confirm there is no horizontal overflow.
- Confirm keyboard focus is visible, Escape closes transient UI, and reduced
  motion does not block navigation.

## Dashboard Flow

- Start the app locally and open the Dashboard.
- Confirm the dashboard starts in manual mode.
- Before running, search by name/IP/hostname/category/HTTP URL, with one facility
  and All Facilities. Pending rows must not become Offline/Problems or show
  measured ping/HTTP/TCP failures. No stream request/history run should occur.
- Run `Run All Facilities` and confirm facility tabs, summary cards, progress, and device rows update.
- Select one facility and confirm the primary button changes to `Run Facility`.
- Run the selected facility and then click `All Facilities`; all facilities should return without refreshing the page.
- Run one category through `Run Group` with a selected site; history must contain
  only that facility/category intersection even with a narrowing text search.
  Repeat with All Facilities; other categories/disabled devices must be absent.
- After a partial run, untested sites/rows must remain searchable with Not checked.
- Run one failed device through the row action when a degraded/down result exists.
- Confirm `Full Check` and `Ping Only` both work and display the expected port behavior.

## Configuration Flow

- Load Configuration and confirm the active support group data appears.
- Add a test device, edit it, copy it, and delete it.
- Save settings and confirm validation errors are clear when values are invalid.
- Use Bulk Edit filters by facility and category.
- Use Bulk Edit `Collapse All` and `Expand All` after filtering a large facility list.
- Use Bulk Edit `Select Visible`, apply a safe bulk action, and confirm the selection clears after save.
- Export configuration JSON.
- Import a valid JSON file.
- Try invalid import cases: empty file, non-JSON file, malformed JSON, and oversized file.

## Support Groups Flow

- Create a support group profile.
- Copy an existing profile.
- Rename a profile.
- Activate another profile and confirm Dashboard/Configuration use the active profile.
- Delete a non-protected profile and confirm it is archived locally.

## Themes Flow

- Load Themes and confirm `NetWatch Default` and `Corporate Logistics` exist.
- Create a custom theme.
- Copy and rename a custom theme.
- Activate a custom theme.
- Confirm built-in themes cannot be deleted.
- Reset themes only when it is acceptable to remove custom local themes.

## Reports Flow

- Run at least one full check so `monitor-history.json` has data.
- Open Reports on Summary, then navigate Runs/Devices with pointer and keyboard.
- Verify unique recorded identities, evaluation counts, unknowns and sample-health
  ratio without interpreting them as continuous availability.
- Filter historical support group, search, status, mode, Facility/Category and
  inclusive local calendar presets/custom range; remove chips and clear all.
- Drill down by summary group, execution and exact device identity; compare
  matching/recorded counts with the original scope. Do not execute real checks.
- Verify mobile Order selectors, readable rows, detail Escape/Close and browser back.
- Change page size and verify Previous/Next pagination in each report table.
- Export filtered CSV/JSON including off-page matches, quotes, newlines and inert
  formula-like text; never execute spreadsheet formulas during testing.
- Simulate empty/malformed/failed/stale reads and verify neutral, non-editable states.
- Confirm cancellation, failed deletion, success and navigation with synthetic
  runs only. Legacy duplicate IDs must stay readable with deletion disabled.

Ten workflows in `tests/e2e/reports.spec.cjs` run on desktop/mobile, including
read-only history assertions and screenshots. Existing monitoring/export/HTTP
tests now use the new views and shared confirmation. See [reports](REPORTS.md).
The final Reports checkpoint passed 224 .NET tests and all 102 Chromium cases
(51 desktop, 51 mobile), without skips/flaky cases/browser retries. Two extra
detail reruns verified fully opened panel bounds and visual framing while
retaining the complete regression report. Remaining deployment gates are unchanged.

## Integrations Flow

- Open Integrations and confirm the default inventory source is `Local JSON`.
- Switch inventory source to `External endpoint` and confirm endpoint URL/method fields are enabled.
- Try saving without an external endpoint URL and confirm validation appears.
- Return inventory source to `Local JSON` before release unless a real integration has been approved.
- Enable outbound report endpoint, confirm URL/method/include options are enabled, then save only test placeholder values.
- Confirm `integrations.json` is created only as runtime data and is not committed.
- Review the documented inbound inventory and outbound report payload examples before implementing external calls.
- Confirm future security notes mention authentication, tokens outside Git, allowlisted destinations, logging, retries, and Microsoft Entra ID.

## Error Logging Flow

- Confirm `app-errors.json` is created only as runtime data.
- Confirm `GET /api/errors` returns a controlled payload.
- Confirm `POST /api/errors/clear` clears the local file.
- Do not commit runtime error data.

## Security And Data Boundaries

- Confirm runtime files are ignored by Git: local config, support group profiles, themes, history, error logs, and integration settings.
- Confirm sample data is generic and safe.
- Confirm the app is not exposed directly to untrusted networks.
- Do not claim Microsoft Entra ID, SSO, user identity, external inventory import, or outbound report delivery as current capabilities.

## Acceptance Criteria

The MVP is ready for an internal checkpoint when:

- `dotnet build` succeeds with no errors.
- `git diff --check` reports no whitespace errors.
- Dashboard, Configuration, Support Groups, Themes, Reports, Integrations, and docs have been reviewed.
- Runtime data is excluded from Git and portable release output.
- `CHANGELOG.md` describes the user-facing changes.
