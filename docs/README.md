# NetWatch Lite Documentation

This directory contains the canonical engineering and operational
documentation for NetWatch Lite.

The browser documentation shell is served by the application at `/docs/`. It
provides grouped navigation, local search, light/dark themes, section context,
and previous/next links. Its source is [index.html](index.html); the canonical
engineering documents below remain Markdown so they are readable in GitHub and
other development tools.

## Core Documents

- [Supported .NET runtime](RUNTIME.md): .NET 10 LTS, servicing, local SDK and rollback.

- [Interface languages](UI_LANGUAGES.md): English default, Spanish preference and data boundaries.
- [Diagnostics](DIAGNOSTICS.md): references, internal errors versus probe failures and private exports.

- [Dashboard filters](DASHBOARD_FILTERS.md): Device Type, scope, resets and safe execution.

- [Local storage and SQLite](STORAGE.md): provider selection, migration, backup and reversal.
- [Device form and search](DEVICE_FORM.md): visible matches, presets, dynamic fields and compatibility.
- [Coordinated development plan](ROADMAP.md): delivery order, dynamic forms, SQLite stages and safety gates.
- [Administration lists](ADMINISTRATION.md): Support Groups, Themes and shared master workflows.
- [Reports](REPORTS.md): historical views, metrics, filters, detail and private exports.
- [Device types](DEVICE_TYPES.md): protected defaults, custom catalog and compatibility.
- [HTTP and HTTPS checks](HTTP_CHECKS.md): URL setup, expectations, diagnostics and limits.
- [Printer and scanner inventory](PERIPHERALS.md): catalog, workstation assignments and compatibility.
- [Architecture](ARCHITECTURE.md): system boundaries, components, and data flow.
- [API](API.md): current HTTP endpoints and compatibility expectations.
- [Development](DEVELOPMENT.md): local setup, code layout, and engineering flow.
- [Testing](TESTING.md): quality strategy, manual review, and automated suites.
- [Deployment](DEPLOYMENT.md): mandatory quality gates and release checklist.
- [Versioned portables](PORTABLE.md): safe generator, immutable ZIP history and package checks.
- [Operations](OPERATIONS.md): runtime data, startup, health, backup, and recovery.
- [Security](SECURITY.md): trust boundaries, sensitive data, and vulnerability handling.
- [Troubleshooting](TROUBLESHOOTING.md): common development and runtime failures.
- [Architecture Decisions](adr/README.md): decisions that materially affect the system.

## Other Documentation

- [.NET 10 migration and local rc.15 - 2026-11-12](VALIDATION_DOTNET10_2026-11-12.md)

- [Multilingual monitoring and local rc.14 - 2026-11-12](VALIDATION_MULTILINGUAL_2026-11-12.md)

- [Dashboard Device Type and rc.13 - 2026-11-11](VALIDATION_DASHBOARD_TYPES_2026-11-11.md)

- [URL CRUD visibility and portable rc.12 - 2026-11-11](VALIDATION_URL_CRUD_2026-11-11.md)

- [Relational SQLite and portable rc.11 - 2026-11-10](VALIDATION_SQLITE_RELATIONAL_2026-11-10.md)

- [HTTP field help and portable rc.10 - 2026-11-10](VALIDATION_HTTP_HINTS_2026-11-10.md)
- [Local shortcut descriptions and portable rc.9 - 2026-11-10](VALIDATION_SHORTCUT_HINTS_2026-11-10.md)
- [Work order, SQLite and portable rc.8 validation - 2026-11-10](VALIDATION_WORK_ORDER_2026-11-10.md)
- [Peripheral links and portable rc.7 validation - 2026-11-09](VALIDATION_PERIPHERAL_LINKS_2026-11-09.md)
- [Improvement backlog](IMPROVEMENTS.md): user-reported requests and pending acceptance checks.
- [Device Location and portable rc.6 validation - 2026-11-08](VALIDATION_DEVICE_LOCATION_2026-11-08.md)
- [Device Notes and portable rc.5 validation - 2026-11-08](VALIDATION_DEVICE_NOTES_2026-11-08.md)
- [Portable rc.4 validation - 2026-11-08](VALIDATION_PORTABLE_2026-11-08.md)
- [Portable generator validation - 2026-11-07](VALIDATION_PORTABLE_2026-11-07.md)
- [Management validation - 2026-11-07](VALIDATION_MANAGEMENT_2026-11-07.md)
- [Device type validation - 2026-11-07](VALIDATION_DEVICE_TYPES_2026-11-07.md)
- [Support Groups UX proposal](SUPPORT_GROUPS_UX_PROPOSAL.md) (delivered; historical rationale)
- [HTTP/HTTPS validation - 2026-11-06](VALIDATION_HTTP_2026-11-06.md)
- [Workstation view validation - 2026-11-06](VALIDATION_WORKSTATIONS_2026-11-06.md)
- [Peripheral inventory validation - 2026-11-06](VALIDATION_PERIPHERALS_2026-11-06.md)
- [Browser regression and resilience - 2026-11-06](VALIDATION_2026-11-06.md)
- [Functional validation - 2026-11-05](VALIDATION_2026-11-05.md)
- [Visual manual](index.html)
- [Dashboard screenshot](assets/netwatch-lite-dashboard.png)
- [Configuration screenshot](assets/netwatch-lite-configuration.png)

The root [README](../README.md) remains the product entry point.
`AGENTS.md` and `CURRENT_STATUS.md` remain the continuity entry points for
Codex sessions.

## DOC-STD-20261002 — Canonical sources

Documentation standard v1.0 · reviewed 2026-10-02. Primary language: English.

Internal .NET network monitoring application.

The wallboard is a separate repository. Operational JSON and logs are private. Do not infer active monitoring from a public landing page. SSO, verified operator identity and external inventory integrations remain future capabilities unless separately verified. Do not expose the internal monitor directly to untrusted networks.

| Need | Authoritative source |
| --- | --- |
| Presentation | [README.md](../README.md) |
| Current state | [CURRENT_STATUS.md](../CURRENT_STATUS.md) |
| Development | [docs/DEVELOPMENT.md](DEVELOPMENT.md) |
| Architecture | [docs/ARCHITECTURE.md](ARCHITECTURE.md) |
| API / contracts | [docs/API.md](API.md) |
| Testing | [docs/TESTING.md](TESTING.md) |
| Security | [docs/SECURITY.md](SECURITY.md) |
| Deployment | [docs/DEPLOYMENT.md](DEPLOYMENT.md) |
| Operations | [docs/OPERATIONS.md](OPERATIONS.md) |
| Troubleshooting | [docs/TROUBLESHOOTING.md](TROUBLESHOOTING.md) |
| History | [CHANGELOG.md](../CHANGELOG.md) |
| Decisions | [docs/adr/README.md](adr/README.md) |

Start with the presentation and current state, then read the user guide to try the product, development/architecture to contribute, or deployment/operations to maintain it. The existing detailed index remains valid.

### Evidence and updates

Keep current state, change history and decisions separate. Existing dated test results remain historical evidence. Adding this map does not rerun every documented command or complete pending product acceptance. Record actual checks, their environment and unresolved limits before publication.

Update the source guide whenever commands, configuration, behavior, permissions or deployment change. Keep existing links and portal routes stable. Use real screenshots with synthetic data; never publish env values, access keys, user data or operational logs. A local commit, a remote commit and a deployed artifact are separate states.
