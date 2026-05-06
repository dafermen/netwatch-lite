# Changelog

All notable changes to NetWatch-Lite are documented here.

## Unreleased

- Default dashboard execution mode changed to manual.
- Auto refresh now starts only when the operator enables `Auto Refresh: ON`.
- Device category groups now start collapsed by default.
- Added hamburger sidebar navigation with Dashboard and Configuration routes.
- Added `/config` CRUD UI for devices and checks.
- Added `GET /api/config` and `POST /api/config` with validation, backup, and in-memory reload.
- Renamed the editable runtime inventory file to `config.json`.
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
