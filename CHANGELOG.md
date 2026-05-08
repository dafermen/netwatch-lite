# Changelog

All notable changes to NetWatch-Lite are documented here.

## Unreleased

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

## v0.3.0 - 2026-05-06

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

## v0.2.0 - 2026-05-05

- Added collapsible device category groups.
- Preserved collapsed/expanded category state during refreshes.
- Updated UI documentation for large inventories.

## v0.1.0 - 2026-05-05

- Initial NetWatch-Lite release.
- Added JSON-driven device inventory.
- Added async ping and TCP checks.
- Added Healthy, Degraded, and Down status calculation.
- Added latency, summary metrics, categories, search, filters, execution controls, reload JSON, and Windows portable publish documentation.
