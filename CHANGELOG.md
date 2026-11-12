# Changelog

## Multilingual Monitoring And Portable 0.8.0-rc.14 - 2026-11-12

- English-default/Spanish interface, remembered browser choice and draft-safe
  switching. Operator data, IDs and original technical records are not translated.
- Inclusive device/website forms, shared Dashboard/Configuration filters,
  Normal/Bulk filtering and Facility/Device Type grouping.
- Manual/automatic runs capture exactly visible enabled records, including
  search/status; Device Type alone works. Stale/empty scopes never broaden.
  This intentionally supersedes rc.13 global automatic/presentation-only behavior.
- Quick monitoring pause/resume and last-execution receipt/detail.
- Private Diagnostics query/detail/full filtered CSV/JSON export, references and
  bounded browser collection. Actionable HTTP guidance retains strict TLS and limits.
- No schema migration, inventory rewrite or historical artifact replacement.
  GitHub publication is on hold; CURRENT_STATUS and the dated validation guide
  record actual local tests/package/restart and remaining acceptance limits.

## Dashboard Device Type Filter And Portable 0.8.0-rc.13 - 2026-11-11

- Added a catalog-backed Device Type selector before Category, combining with
  Facility, search and status without saving data or running checks on selection.
- Scoped Facility/Category, individual and failed runs enforce the classification
  on the server. Missing matches or a removed type never expand to all devices.
- New results capture device classification; dashboard identities separate equal
  names/addresses of different types. Old history remains unchanged/unknown.
- Automatic global monitoring remains global. Clear filters also resets Device Type;
  zero-match facilities remain selected rather than silently widening the scope.
- The owner authorized a GitHub source update and new rc.13 prerelease portable.
  Final validation/publication evidence is recorded in CURRENT_STATUS.
- Source validation passed 373 .NET and 356 desktop/mobile browser cases across
  SQLite/JSON, plus four monitoring and six storage sampled mutations. Updated
  CI, current portable instructions and matching-backend deployment guidance.
- Generated immutable rc.13 folder/ZIP/SHA from clean commit 8ceaaf8; native
  checks and historical/privacy audits passed. Published the GitHub prerelease
  after all four CI jobs passed; downloaded ZIP/checksum match the local files.
  Publication receipts live
  in the validation guide and CURRENT_STATUS, without rewriting the archive.

## URL Editing Visibility And Portable 0.8.0-rc.12 - 2026-11-11

- Configuration searches each monitored HTTP URL as well as inventory fields.
- Successful device create/edit/copy reveals its saved Facility/category row,
  clearing only incompatible filters. The next Dashboard visit opens its enabled
  pending row without running a check. Disabled records remain disabled.
- HTTP-only forms hide Location and Command while preserving saved values;
  mixed Ping/TCP checks restore the fields without clearing the draft.
- Show native field-validation and API problem details inside the modal; restore
  check-specific disabled controls after busy/failure states and retain safe retry.
- Added URL create/edit/copy/reject/restart/delete persistence coverage for JSON
  and SQLite, plus desktop/mobile visibility and compact-form regressions.
- Corrected a Reports deletion race: pending SQL refreshes are invalidated and
  no read is started by the busy-state render before the deletion finishes.
  A delayed-write regression verifies the empty state and actual saved history.
- No database migration or reimport is required. GitHub publication remains on hold.
- Validated 357 .NET / 332 final browser cases, both-shell packaging guards and
  native rc.12 folder/ZIP/SHA checks. Backed-up source restart preserved all
  document bytes/eight APIs; historical artifacts and original JSON stayed intact.

## Relational SQLite And Portable 0.8.0-rc.11 - 2026-11-10

- Added schema-2 transactional inventory/history projections and private
  before/after change auditing, with byte-preserving backed-up schema-1 upgrade.
- Reports uses bounded SQL filters/sorts/pages and whole-filter totals; exports
  include all matches under a shared revision, preserving legacy JSON mode.
- Added Configuration Data & backups: global count/age retention, pre-prune
  exports, verified manual/automatic snapshots and controlled automatic rotation.
- Added offline verified restore into a new folder and private read-only pilot
  snapshots. Manual/upgrade backups and historical portables are not overwritten.
- Legacy casing, numeric enums, ordering, unknowns and duplicate historical IDs
  remain compatible. This is local candidate work; GitHub stays on hold.
- Validated 355 .NET cases, 296 full browser cases plus final UI deltas, six
  sampled mutants, private-copy/reversal and exact native folder/ZIP/SHA checks.
  Authorized source activation retained document bytes/eight API snapshots and
  original JSON; schema 2 is active on port 5000. Historical artifacts stay intact.

## HTTP Field Help And Compact Shortcuts - 2026-11-10

- Added accessible per-check descriptions below HTTP Timeout and Expected text
  about duration/attempts, configured retries and optional literal response matching.
- Removed the extra Shortcuts note and its aria-describedby reference; retained
  Command help. HTTP fields stack on mobile; multiple checks use unique help IDs.
- Existing retry configuration remains under active-profile Settings, with no
  changes to operator values, retry logic or check semantics. GitHub remains on hold.
- Validated isolated build, 32 focused browser cases across both storage providers,
  both-shell package guards and native rc.10 folder/ZIP/SHA delivery. Historical
  packages and original JSON remained unchanged; the service stays on port 5000.

## Local Shortcut Descriptions And Portable 0.8.0-rc.9 - 2026-11-10

- Added Spanish helper text below Shortcuts and Command, clarifying that these
  are not monitoring checks and that command text is copied, not auto-executed.
- Associated descriptions with their controls via aria-describedby, retaining
  command values and existing copy-only behavior. Added desktop/mobile coverage.
- GitHub publication remains on hold until explicitly authorized by the owner.
- Validated isolated build, 16 focused desktop/mobile browser cases across both
  storage providers and native folder/ZIP/SHA delivery without private data or
  historical replacement. The source service remains on port 5000 without restart.

## Work Order And Portable 0.8.0-rc.8 - 2026-11-10

- Configuration search reveals matching Facility/category rows in Normal/Bulk,
  preserving original action indexes and restoring collapse behavior on clear.
- Added check-driven network/HTTP fields, clearer URL labels, Shortcuts grouping
  and new-record Web application preset. Retain existing checks/identity/drafts;
  confirm configured-check replacement and Workstation inventory removal.
- Block initial Configuration editing until profile/inventory loading completes,
  preventing a delayed response from closing a draft; deterministic regression added.
- Reject stale-profile full/row/import writes and activation/cache gaps with 409;
  preserve failed editor drafts and restore local state so retry does not duplicate
  a device. Legacy clients may omit the new optional profile header.
- Added transactional SQLite document storage, schema guards, per-root process
  lease, profile transactions, offline byte-preserving migration, integrity/backup
  and current-data JSON export for rollback. Existing JSON is not silently migrated;
  clean installs use SQLite and API/JSON contracts remain compatible.
- Added bounded Windows sharing/lock retries and header/body-specific HTTP deadline
  tests without extending real deadlines. Historical Notes-500 root cause remains
  unproven; successful reruns alone do not resolve the original incident.
- Added migration, failure/rollback, concurrency, deterministic fuzz/invariant,
  targeted mutation and dual-provider browser coverage, plus a private-copy pilot.
- Extended portable privacy/native-startup/license checks and CI's browser matrix
  for both providers. Every delivery still requires a new folder, ZIP and SHA-256;
  final generated outputs/evidence are recorded separately in CURRENT_STATUS.

## Peripheral Link Type And Portable 0.8.0-rc.7 - 2026-11-09

- Added per-assignment Link type (Wireless/Cabled, or Not recorded when unknown)
  for printers/scanners, independently from existing USB/Network/Other.
- Preserve values through normal/Advanced edits, copy, bulk/profile and JSON
  workflows; show them in Configuration/Dashboard/Workstations inventory details.
- Kept network-address rules, pending-inventory counts and monitoring unchanged;
  legacy links are never inferred. Model now spans a full editor row to keep
  Connection and Link type together, with mobile stacking.
- Added isolated contract/browser coverage and generated an immutable portable
  folder/ZIP/SHA-256 without private data or historical replacement.
- Validated 311 .NET tests, 126 desktop/mobile browser cases, both-shell packaging
  guards, native ZIP/folder startup and historical/content/checksum audits.
- Consolidated remaining search, dynamic form, reliability and SQLite work in a
  staged roadmap. Queued work is not active; JSON remains the storage backend.

## Device Location And Portable 0.8.0-rc.6 - 2026-11-08

- Added optional single-line Location before Notes for floor/office/desk within
  a Facility, with no migration, note extraction or changes to Facility grouping.
- Added escaped display/search in Configuration/Dashboard and preserved Location
  through current normal/Advanced/copy/bulk/profile/JSON workflows. Location
  stays out of monitoring results/history and report rows.
- Added bounded validation and contract/browser regression for compatibility,
  privacy, preservation, search, clearing and desktop/mobile layout.
- Generated a new versioned Windows x64 portable folder, ZIP and SHA-256 without
  private data or overwriting rc.5/earlier candidates. No remote publication.
- Final isolated regression passed 283 .NET tests and full browser regression
  passed 118 cases. Initial Notes-save/HTTP intermittent failures remain tracked;
  focused repeats and the isolated run did not reproduce them. No production
  persistence/HTTP change or stable-deployment approval is implied.

## Device Notes And Portable 0.8.0-rc.5 - 2026-11-08

- Added optional multiline Notes for physical location, assigned user or other
  manual inventory observations on every device type, without migrating old files.
- Added safe compact disclosures and notes search in Configuration/Dashboard;
  preserve text through editing, copy, unrelated bulk changes and JSON/profile
  workflows. Notes does not enter monitoring results/history or report rows.
- Validate size/control characters before persistence and cover boundaries,
  workflow preservation, privacy, escaping and desktop/mobile layout.
- Generated a new self-contained Windows x64 folder, ZIP and SHA-256, retaining
  rc.4 and earlier artifacts unchanged; local evidence is not release approval.
- Validated all 249 .NET tests, 110 desktop/mobile browser cases, extra visual
  checks, packaging guards on both shells, exact ZIP/folder startup and hashes.

## Portable Candidate 0.8.0-rc.4 - 2026-11-08

- Packaged the Reports redesign together with the existing copy-only Command,
  Dashboard filters/individual checks and neutral Configuration layout.
- Require a versioned folder, compressed ZIP and SHA-256 sidecar for every
  portable delivery, with the ZIP as the primary file to copy/share.
- Retain previous versions unchanged and exclude private operational data;
  local candidate validation is separate from GitHub publication/deployment.
- Validated build, 224 .NET tests, 102 desktop/mobile browser cases, packaging
  guards on both shells, exact ZIP/folder startup, SHA-256 and historical hashes.

## Reports Navigation And Historical Metrics - 2026-11-07

- Added Summary/Runs/Devices tabs, top-level historical group/date filters,
  removable criteria, neutral unrecorded states and distinct device/evaluation counts.
- Replaced misleading historical availability labeling with the known-status
  healthy-evaluation ratio; original run scope and filtered/recorded counts stay distinct.
- Added recorded-check detail, exact history drilldowns, mobile rows/order controls,
  keyboard/back navigation and safe secondary deletion confirmation.
- Added private CSV export with text escaping while retaining JSON; failed/stale
  reads clear old data and ambiguous legacy IDs remain readable without UI deletion.
- No history schema migration, monitoring execution, automatic delivery or historical
  portable overwrite. Trends/comparisons remain future work.

## Portable Candidate 0.8.0-rc.3 - 2026-11-07

- Generated a new Windows x64 self-contained candidate with the latest dashboard
  inventory search, copy-only Commands, exact row checks, filter reset and header
  controls, plus neutral Configuration bands and aligned icon actions.
- Uses immutable folder/ZIP/SHA-256 outputs and neutral generated settings/sample
  data. Existing portables and legacy archives are retained; no private inventory,
  runtime history, local themes or external Excel/JSON inputs are included.
- Fixed a device deletion dialog remaining open after fast confirmation during
  its opening transition, reusing the existing transition-safe modal controller.
  Added deterministic confirmation/cancellation regression coverage.
- Package evidence and pending deployment gates remain distinct from local
  generation. No GitHub release, tag or asset publication is implied.
- Validated the final ZIP/folder with native startup and privacy/integrity checks,
  matching SHA-256, preserved historical bytes and rejection of duplicate builds.

## Configuration Visual Refinement - 2026-11-07

- Replaced the default black Configuration facility band with light gray and
  aligned normal/Bulk Edit category tones. Custom theme palettes are preserved.
- Kept Edit/Copy/Delete side by side as fixed-size icon buttons with titles and
  accessible names; reserved table space prevents wrapping/overlap on narrow views.
- Added desktop/mobile geometry, collapse and palette-preservation checks plus
  contract coverage for built-in refresh without changing custom colors/inventory.

## Device Commands And Dashboard Controls - 2026-11-07

- Added optional single-line Command configuration beside Website URL and a
  copy-only dashboard action with success/failure/fallback feedback. No command
  execution or command data in monitor results/history; legacy data is supported.
- Whole facility/category bands now toggle, excluding Run/interactive controls.
- Added a filter-reset action without deleting results/history, stable facility
  tabs after partial runs and exact row checks for healthy/untested/problem devices.

## Dashboard Inventory Search - 2026-11-07

- Search enabled inventory before execution and after partial runs, with neutral
  Not checked states, stable facility tabs and pending single-device actions.
- Exclude untested rows from Offline/Problems and measured availability; clear
  stale previews on failed inventory reads. Search never starts monitoring.
- Added desktop/mobile tests proving facility/category AND scope, search-only
  display filtering, preserved data/history and failed SPA reload/retry.

## Portable Generator - 2026-11-07

- Added non-overwriting versioned Windows x64 portable folders, ZIPs and SHA-256
  sidecars under artifacts/, retaining legacy releases/ unchanged.
- Added isolated build/ZIP startup validation, manifest/version/content checks,
  generated neutral settings/sample data and an explicit public file allowlist.
- Added path/collision/lock/ZIP guard tests and documented packaging versus
  deployment approval; no automatic inventory import or remote release upload.

## Documentation navigation candidate — 2026-10-03

InnovaLogic visual family, reading paths, collapsible navigation where applicable, code copy and keyboard image enlargement. Local validation and delivery status are recorded in docs/WEB_NAVIGATION.md.

All notable changes to NetWatch-Lite are documented here.

## Unreleased

- Redesigned Support Groups and Themes as full-width searchable management
  lists with distinct active/selected states, per-row actions, responsive rows
  and no unnecessary master-table scrolling. Profile menus open the intended
  configuration with explicit activation when needed.
- Separated theme color drafts/previews from the saved library, made naming
  operations persist immediately and delayed global activation until POST
  succeeds. Failed writes retain confirmed state; dirty colors require discard
  confirmation across selection, reload and navigation/browser back.
- Shared catalog/profile/theme confirmation and transition-safe modal focus,
  improved peripheral mobile layout and prevented editable fake fallback
  libraries/profiles after read failures. Backend schemas and IDs are unchanged.
- Added a profile-scoped Device Types master with custom type management,
  search/filtering, usage counts including disabled devices and dynamic editor
  options. Protected all five legacy IDs/names and workstation-only behavior.
- Added catalog-only atomic updates with fresh inventory, profile/revision
  conflict detection and preservation through row/bulk edits, copies and
  configuration import/export. Missing legacy catalogs use original defaults.
- Recorded a Support Groups UX recommendation; that screen was not redesigned.
- Added HTTP/HTTPS URL checks with independent bounded timeouts, expected
  status/literal text, duration and safe diagnostics in Dashboard/Reports and
  JSON history/exports. Full checks reuse existing retries/concurrency;
  Ping Only skips HTTP. Existing ping/TCP profiles remain compatible.
- Added strict TLS, no automatic redirects/cookies, bounded response reading,
  field validation and isolated transport/API/browser regression coverage.
- Excluded browser/.NET test evidence directories from publish output,
  including Playwright's generated `.last-run.json` metadata.
- Added a read-only Workstations inventory with search, facility/model and
  pending/fully-recorded filters, paginated desktop/mobile presentation and
  persistent filter URLs. Catalog model names now open reverse lookup without
  duplicating workstations that have several units of the same model.
- Added browser regressions for view semantics, profile isolation, missing
  models, loading failures, paging and history navigation; baseline is 85 .NET
  tests and 24 browser workflows.
- Added a profile-scoped printer/scanner model catalog and optional workstation
  assignments, connection details, asset IDs and notes, with independent
  unrecorded/none/assigned states and protection against deleting in-use models.
- Preserved catalog/assignment data through row/bulk saves, device/profile
  copies, reload and configuration export/import; legacy inventories retain
  unspecified device types and unrecorded peripheral data.
- Added catalog UI, configuration/dashboard inventory details and regression
  coverage for malformed references, compatibility and desktop/mobile flows.
- Added repeatable Playwright desktop/mobile workflows for devices, imports,
  profiles, monitoring, reports and documentation, with isolated per-test roots
  and failure traces/screenshots.
- Added deterministic concurrency/recovery tests and restart/backup restore
  scenarios; the baseline is now 45 .NET plus 10 browser tests.
- Fixed history run-ID collisions for equal completion timestamps with a GUID
  suffix on new runs; existing IDs remain supported.
- Added a separate browser-regression CI job and locked test-only npm dependencies.
- Fixed null device/check validation on configuration saves and imports.
- Added atomic JSON persistence and local previous-version backups across all
  six repositories, including profile creation/copy; excluded backups and
  temporary files from Git and publish output.
- Added safe unexpected-error problem responses with trace identifiers while
  preserving SSE behavior and tolerating local error-log failures.
- Expanded regression coverage to 36 passing tests, extended CI JavaScript
  checks to docs, and documented process-scoped .NET 8 runtime selection.
- Added Codex continuity documentation with `AGENTS.md` and `CURRENT_STATUS.md` so future sessions can quickly understand the project phase, completed work, pending validations, and next steps.
- Linked the continuity files from the README and developer guide.
- Added a mandatory pre-deployment quality policy covering acceptance, unit,
  property/invariant, mutation, fuzz, integration, contract, end-to-end,
  regression, security, concurrency/resilience, performance/resource, and
  compatibility/deployment testing.
- Standardized engineering documentation into canonical architecture, API,
  development, testing, deployment, operations, security, troubleshooting, and
  ADR documents while preserving compatibility links.
- Added GitHub CI, security checks, issue forms, and a pull request template.
- Added centralized .NET SDK, package, build, and editor configuration.
- Added initial xUnit unit and integration projects with 14 passing tests and
  Cobertura coverage collection.
- Added an isolated ASP.NET Core HTTP contract suite covering the main page and
  configuration, region, integration, history, and error response shapes,
  bringing the automated baseline to 22 passing tests.
- Standardized browser documentation at `/docs/` with product-to-docs and
  docs-to-product navigation, responsive grouped navigation, local search,
  light/dark themes, section context, and previous/next links.
- Added secure documentation file serving, build/publish inclusion, and HTTP
  contract coverage for the documentation shell and assets, bringing the
  automated baseline to 25 passing tests.

## v0.7.1 - 2026-06-27

- Refined Reports for large history files with collapsible executive panels, paginated Facility Performance, Category Performance, Recent Runs, and a 10-row default for Detailed Monitor History.
- Removed Top Problem Devices from Reports so operators can focus on complete facility, category, execution, and detailed history views.
- Removed per-device delete actions from Detailed Monitor History; execution deletion is handled from Recent Runs.
- Standardized page alerts so success and informational messages auto-dismiss after 10 seconds.
- Added explicit publish exclusion for `Data/integrations.json` so local integration settings cannot be included in portable packages.
- Updated public/private documentation and release checklist for Reports and Integrations behavior.
- Added a Windows x64 portable ZIP for v0.7.1 while keeping previous portable versions in `releases/`.

## v0.7.0 - 2026-06-27

- Added local monitor history stored in `monitor-history.json` for completed runs, selected scope, summaries, and device-level results.
- Added local application error logging stored in `app-errors.json` for troubleshooting unhandled failures and API/runtime issues.
- Added a Reports page with summary cards, filters, sortable indexed history table, filtered JSON export, and targeted execution maintenance actions.
- Added an executive Reports summary with facility performance, top problem devices, and recent run snapshots.
- Added Reports pagination with selectable page size so large history files stay readable.
- Added per-execution delete actions in Reports and `DELETE /api/history/runs/{runId}` for removing one run without clearing all history.
- Updated Reports filter behavior so category options follow the selected facility and statistics are calculated from the same filtered rows shown in the report.
- Added Bulk Edit multi-select actions for changing facility/category, enabling/disabling devices, and switching ping target mode across selected devices in one save.
- Added Bulk Edit controls to collapse or expand all visible facility groups at once.
- Added an Integrations page for local JSON vs future external inventory source settings and future outbound report endpoint settings.
- Added `integrations.json` runtime storage plus `GET /api/integrations` and `POST /api/integrations` for saving integration settings locally.
- Added `GET /api/history`, `POST /api/history/clear`, `GET /api/errors`, and `POST /api/errors/clear`.
- Added the built-in `Corporate Logistics` theme without using protected brand text.
- Added a Windows x64 portable ZIP for v0.7.0 while keeping previous portable versions in `releases/`.
- Fixed scoped facility checks so returning to `All Facilities` restores the full dashboard without requiring a page refresh.
- Expanded public and private documentation for future operator audit fields, Microsoft Entra ID authentication, and inbound/outbound integration planning.
- Added internal QA and release-readiness documentation for validating the MVP before commit or release.

## v0.6.2 - 2026-06-20

- Added a Dashboard execution mode toggle for `Full Check` versus `Ping Only` connectivity checks.
- Added `checkMode=ping` support to monitoring APIs so TCP checks can be skipped temporarily without changing saved JSON.
- Ping-only results preserve configured ports for display and show them as skipped instead of failed.

## v0.6.1 - 2026-06-19

- Fixed scoped dashboard category runs so `Run Group` executes only the selected category instead of carrying over unrelated dashboard categories.
- Improved Bulk Edit for large inventories with facility/category filters, facility/category visual separators, and collapsible facility sections.
- Standardized the Themes layout with the same compact left-side action panel used by Configuration and Support Groups.
- Expanded public, developer, in-app, and private presentation documentation with the current security model and deployment boundary.
- Updated source comments and developer documentation to describe active Support Group JSON profiles instead of the legacy single `config.json` flow.

## v0.6.0 - 2026-06-19

- Added Support Group profiles so teams can use independent JSON configuration files inside a region.
- Added a Support Groups page to create, copy, rename, activate, and delete one profile at a time.
- Dashboard and Configuration now use the active support group JSON while preserving compatibility with the existing `Data/config.json`.
- Added per-device `region` and `supportGroup` normalization so legacy devices inherit the active profile context when fields are missing.
- Added Configuration Bulk Edit mode with per-row `Save`, `Revert`, and `Advanced` actions for fast updates across large device inventories.
- Compact dashboard navigation with the active region title, support group badge, facility tabs, Auto Refresh, and Run action grouped together.

## v0.5.1 - 2026-06-17

- Made dashboard facility sections compact and collapsible, with a per-facility `Run` action visible from the collapsed summary row.
- Replaced the separate full-check button with one primary run button that runs all facilities or the selected facility depending on the active facility filter.
- Made Configuration facility groups collapsible and saved the active theme immediately when `Set Active` is clicked.
- Forced dashboard runs to reload `config.json` first so checks use the latest saved device configuration after edits.
- Added theme controls for Configuration facility/category collapsible headers, made degraded-only category headers orange, and added theme rename support.
- Clarified theme deletion controls: `Delete Theme` removes only the selected theme and `Reset All Themes` restores the built-in default after a stronger confirmation.

## v0.5.0 - 2026-06-17

- Added per-device `facility` support for site/warehouse grouping.
- Added dashboard facility tabs and a `Run Facility` action for running one site at a time.
- Added facility editing, filtering, normalization, and documentation while preserving category grouping inside each facility.
- Improved large-inventory views so Dashboard and Configuration group devices by facility before category, avoiding ambiguity when facilities reuse device names.
- Added a `Copy` action in Configuration that opens a prefilled add-device form for quickly creating similar devices.
- Added a Themes page backed by `themes.json` so operators can create, copy, activate, delete, and reset GUI color templates.
- Moved theme creation/copy naming into a modal and added theme colors for `Auto Refresh: ON`, `Auto Refresh: OFF`, and `Run Full Check`.

## v0.4.1 - 2026-06-06

- Added automatic retry settings for ping and TCP checks with configurable retry count and delay.
- Added `Run Failed` to retry only current degraded or down dashboard devices.
- Added per-device retry feedback so row-level `Run` buttons show a checking state.
- Added ICMP/TCP diagnostic status details to check results.
- Kept runtime `Data/config.json` ignored and committed only the safe `Data/config.sample.json`.
- Fixed the Settings save alert so it no longer displays `[object PointerEvent]`.
- Updated documentation and portable packaging to avoid including real runtime configuration data.

## v0.4.0 - 2026-06-06

- Changed device health calculation so a device with a failed ping but an open TCP port is `Degraded` instead of `Down`.
- Added dashboard links for HTTP and HTTPS port badges so users can open device web interfaces in a new tab.
- Added optional per-device `websiteUrl` links for opening associated web pages from the dashboard.
- Added per-device ping target mode so each device can choose hostname or IP ping independently.
- Moved `Reload JSON` to the configuration page and kept the dashboard empty until a full check or auto refresh starts.
- Added editable configuration settings for timeout and max parallel checks.
- Auto refresh now uses the editable `settings.intervalSeconds` value from Configuration.
- Auto refresh now keeps existing dashboard groups visible while a new full check updates devices progressively.
- Added configuration device filtering by name, address, or hostname and stabilized configuration table column widths.
- Added configuration JSON export and import actions with client and server validation.
- Added first-run starter configuration creation when `config.json` is missing.
- Moved the add/edit device form into a modal so large category lists no longer push the editor out of view.
- Added dashboard group checks so operators can run monitoring for one category instead of the full inventory.
- Hardened configuration and monitoring stream error handling, including controlled SSE `error` events and preserving existing dashboard results when a group run fails.
- Moved the settings save action into the Settings card and renamed it `Save Settings` to distinguish it from device add/edit saves.
- Updated the repository Windows x64 portable ZIP and README download link.
- Dashboard category groups now collapse after a completed full check and show green or red health bars.
- Monitoring progress now hides after a full check completes.
- Device add, update, and delete actions in `/config` now persist immediately to `config.json`.
- Rebranded visible app text to NetWatch Lite.
- Added a custom SVG logo and favicon.
- Added a Windows executable icon for portable builds.
- Added MIT license file and license notes.
- Added built-in User Manual and About pages.
- Added GitHub repository link to About and documentation.
- Added dashboard and configuration screenshots to the README.
- Added `/wallboard` fullscreen NOC mode with iframe panels, layout controls, rotation, keyboard shortcuts, and `wallboard.json`.
- Improved `/wallboard` routing and documented iframe embedding restrictions.
- Added local wallboard sample panels and support for root-relative wallboard URLs.
- Added a Windows WebView2 wallboard project that renders each panel as a native WebView for sites that block iframes.
- Removed the iframe-based web wallboard so wallboard usage is handled by the Windows WebView2 executable only.
- Moved WebView2 wallboard source and sample assets out of the web dashboard repository into the sibling wallboard repository.
- Replaced public sample device references with neutral names.
- Added a downloadable Windows x64 portable ZIP under `releases/`.

## v0.3.0 - 2026-06-06

- Default dashboard execution mode changed to manual.
- Auto refresh now starts only when the operator enables `Auto Refresh: ON`.
- Auto refresh now runs a full check every 60 seconds.
- Removed the `Refresh Now` control and cached refresh endpoint.
- Added progressive dashboard rendering with Server-Sent Events for full checks.
- Added visible monitoring progress percentage, checked/total counter, and programmer documentation.
- Grouped the configuration CRUD device table by category.
- Made configuration category groups collapsible and collapsed by default.
- Device category groups now start collapsed by default.
- Added hamburger sidebar navigation with Dashboard and Configuration routes.
- Added `/config` CRUD UI for devices and checks.
- Added `GET /api/config` and `POST /api/config` with validation, backup, and in-memory reload.
- Renamed the editable runtime inventory file to `config.json`.
- Configuration device form now opens only when adding or editing a device.
- Added optional `hostname` per device and `useHostnameForPing` setting for hostname-based ping checks.
- Fixed hamburger sidebar collapse behavior and reset the configuration form when leaving the configuration page.
- Improved responsive behavior for mobile toolbars, filters, forms, and wide device tables.
- Hardened invalid JSON handling, monitoring API errors, and unexpected TCP failure handling.
- Documentation updated to describe manual-first behavior.

## v0.2.0 - 2026-06-05

- Added collapsible device category groups.
- Preserved collapsed/expanded category state during refreshes.
- Updated UI documentation for large inventories.

## v0.1.0 - 2026-06-05

- Initial NetWatch-Lite release.
- Added JSON-driven device inventory.
- Added async ping and TCP checks.
- Added Healthy, Degraded, and Down status calculation.
- Added latency, summary metrics, categories, search, filters, execution controls, reload JSON, and Windows portable publish documentation.
