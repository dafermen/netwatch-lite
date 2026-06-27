# Changelog

All notable changes to NetWatch-Lite are documented here.

## v0.7.0 - 2026-06-27

- Added local monitor history stored in `monitor-history.json` for completed runs, selected scope, summaries, and device-level results.
- Added local application error logging stored in `app-errors.json` for troubleshooting unhandled failures and API/runtime issues.
- Added a Reports page with summary cards, filters, sortable indexed history table, filtered JSON export, and clear-history maintenance action.
- Added an executive Reports summary with facility performance, top problem devices, and recent run snapshots.
- Added Bulk Edit multi-select actions for changing facility/category, enabling/disabling devices, and switching ping target mode across selected devices in one save.
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
