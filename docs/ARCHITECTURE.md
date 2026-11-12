# NetWatch Lite Architecture

## Runtime Baseline

App/tests target .NET 10 LTS, runtime 10.0.15. See [runtime policy](RUNTIME.md)
and [ADR 0008](adr/0008-dotnet10-lts.md). SQLite schema 2 and JSON/API contracts
are unchanged by this upgrade; self-contained portables include both runtimes.

## rc.14 Additions

`MonitorPlans` captures an exact, bounded, short-lived, single-use selection from
fresh profile/revision snapshots. The execution lock precedes consumption; no
invalid explicit scope can become a global run. `inventory-filters.js` supplies
one pure view predicate to Dashboard/Configuration; grouping remains presentation.
Narrow participation writes change only Enabled, without schema changes.

`DiagnosticPages` projects internal errors and failed history separately, using
SQL report pages on SQLite and compatible JSON reads. Redaction/bounds/references
are defense in depth, not authentication. `i18n.js` translates owned literal UI
before data interpolation; locale is a browser choice, not persisted inventory.
See [filters](DASHBOARD_FILTERS.md), [diagnostics](DIAGNOSTICS.md) and
[languages](UI_LANGUAGES.md). Existing storage decisions remain unchanged.

## Purpose

NetWatch Lite is an internal network-monitoring dashboard. It loads local
configuration from SQLite or compatible JSON storage, performs ICMP, TCP and HTTP/HTTPS checks, streams progress to a static web
interface, and stores local history and operational settings.

The application is not designed for direct exposure to untrusted networks.

## Runtime Components

1. `Program.cs` configures the ASP.NET Core Minimal API, static files,
   dependency injection, and HTTP endpoints.
2. `Models/` defines configuration, monitoring, history, theme, region,
   integration, and error-log contracts.
3. `Services/` owns transactional SQLite/compatible JSON persistence, network checks, execution coordination,
   history, and error logging.
4. `wwwroot/` contains the Bootstrap user interface and browser-side workflow.
5. `docs/` contains canonical Markdown plus the browser documentation shell
   served at `/docs/`; its files are copied to build and publish output.
6. `Data/config.sample.json` is safe example data. Operational databases/JSON files are
   runtime-only and excluded from source control and portable releases.

## Primary Data Flow

1. The browser requests configuration or starts a monitor run.
2. Minimal API endpoints delegate to a repository or execution service.
3. `MonitorExecutionService` reloads the active configuration and coordinates
   one execution at a time.
4. `NetworkMonitorService` executes enabled device checks with bounded
   concurrency.
5. Results are returned as JSON or progressive Server-Sent Events.
6. Monitor history and controlled error details are persisted locally.

## Persistence Boundary

Repositories resolve paths relative to the application content root and
serialize JSON with validation and normalization. Runtime files include device
configuration, region profiles, themes, history, error logs, and integration
settings. `LocalDataStore` persists complete logical documents using SQLite
schema 2 or the existing atomic JSON writer. Clean installs select SQLite;
existing JSON requires explicit offline migration. Profile operations use a
shared SQLite transaction and invalidate the cache after failure. See
[storage and recovery](STORAGE.md) and [ADR 0006](adr/0006-sqlite-document-persistence.md).
No external inventory/report service is active.

Schema 2 adds transactionally synchronized relational inventory/history tables
and private before/after audit records. `SqliteQueries` provides bounded server
pages and whole-filter report aggregates. `reports-sql.js` reuses the established
Reports renderers without loading all history; JSON mode retains its old adapter.
`StorageOperations` owns validated global retention and verified managed snapshots;
`StorageBackupWorker` checks due backups, not monitor runs. Restoration remains an
offline new-directory operation. Documents are still the compatibility authority,
not independently editable copies of the relational tables. See
[ADR 0007](adr/0007-sqlite-relational-projections.md) for identity and resource limits.

Printer/scanner models and workstation assignments are optional fields in the
same support-group JSON document. `PeripheralInventoryRules` validates model
references, kinds and recorded states before the configuration repository's
atomic save. This keeps catalog and assignments consistent through imports and
profile copies. See [the decision](adr/0002-profile-scoped-peripherals.md).

The read-only Workstations projection consumes the current configuration in
`wwwroot/workstations.js`. It keeps its own snapshot/filter state, so querying
inventory does not overwrite the configuration editor or mutate profile files.
Model lookup returns one row per configured workstation and a separate matching
assignment count. This is recorded inventory, not live peripheral detection.

`deviceTypes` is another profile-scoped catalog; existing device keys stay
unchanged and omitted legacy catalogs receive independent protected defaults.
`DeviceTypeRules` validates definitions/references before persistence. The
catalog-only endpoint captures profile identity/path and checks a catalog
revision while reading fresh inventory under the existing repository lock.
It changes only types rather than posting a stale inventory snapshot. There
is no global type file; either storage provider retains it with its profile. See
[ADR 0004](adr/0004-profile-device-types.md).

## Concurrency Boundary

`HttpCheckService` uses a separate named pooled HttpClient with strict TLS and
no cookies/redirects. Linked cancellation spans headers and bounded content
reads. It returns safe diagnostic fields to the existing execution/history
pipeline; configured URLs/expected text stay in the profile. See
[HTTP check design](adr/0003-bounded-http-checks.md).

Network checks use bounded parallelism. Monitor execution is coordinated so
overlapping full executions return a busy response instead of writing
conflicting history. Repository writes use local synchronization but do not
provide distributed locking across multiple application instances. A content-root
lease prevents a second local app/maintenance process from using cached state;
network-share/multi-instance operation is not supported.

## Frontend Boundary

`wwwroot/management.js` owns the shared master-list pattern for Support Groups
and Themes: distinct selection/activation, row menus, read/error state and a
separate saved-theme/color-draft model. It supplies catalog confirmation and
modal-focus helpers to Device Types/Peripherals as well. Routing consults dirty
theme state before navigation. No server schema or endpoint changes are needed;
see [ADR 0005](adr/0005-consistent-management-lists.md).

The frontend is static HTML, CSS, and JavaScript. It calls same-origin API
endpoints and renders monitoring progress, configuration, reports, themes,
support groups, integrations, manual content, and about information. The
separate `/docs/` shell uses dependency-free JavaScript for navigation, local
search, theme persistence, section tracking, and mobile behavior.

## External Boundaries

- ICMP and TCP checks target configured internal devices.
- HTTP/HTTPS GET checks target approved configured URLs from the backend host,
  not from the operator's browser. Restrict inbound access and outbound targets.
- Bootstrap and Font Awesome are loaded from public CDNs.
- Integration settings are preparatory only; no inbound inventory or outbound
  report HTTP calls are implemented.
- The WebView2 wallboard is maintained in a separate repository.

## Decisions

Material architectural choices are recorded under [adr/](adr/README.md).
