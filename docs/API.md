# NetWatch Lite API

Authenticated checks add `type: browser` and guarded `POST /api/browser-sessions`.
See [browser-check API/states](BROWSER_CHECKS.md#api-and-compatibility). They do not
authenticate NetWatch or change HTTP probes. Numeric statuses 0/1/2 are preserved;
3=AuthenticationRequired and 4=Unknown. SQLite remains schema 2.

## Conventions

The rc.14 APIs below are additive; SQLite remains schema 2. UI language does not
change stored field names, IDs or technical codes. API responses have an
`X-NetWatch-Trace` correlation reference. See [diagnostics](DIAGNOSTICS.md).

### Exact Monitoring And Diagnostics

| Method | Path | Contract |
| --- | --- | --- |
| GET | `/api/monitor/inventory` | Active `profileId`, `revision`, `configuration`, opaque per-row `keys`; read-only |
| POST | `/api/monitor/plans` | Body `{profileId,revision,keys,deviceType?,facility?,category?}`; validates fresh inventory, returns `{token,count,expiresAt}` |
| GET | `/api/monitor/stream?selection=<token>` | Single-use exact enabled rows; other legacy query filters cannot broaden the plan |
| POST | `/api/config/devices/{index}/monitoring` | Body `{profileId,revision,enabled}`; only Enabled changes; returns fresh snapshot |
| GET | `/api/diagnostics` | `source=application|monitoring`, search/from/to/page/size/revision; bounded sanitized projection |
| POST | `/api/diagnostics/client` | Bounded kind/message/script/line/column; error/rejection/resource kinds, application-wide 30/minute; returns IDs |

Invalid selections return 400; stale profile/revision returns 409 without writes
or checks. Plans expire after two minutes, max 128 pending; keys max 10000 unique
64-character values. A present but invalid/empty stream token is a controlled
SSE error, never unfiltered fallback. A busy stream does not consume a valid plan.
Legacy requests with no selection retain previous behavior. Optional history
`selectionCount` and result `inventoryKey` do not rewrite legacy history or create
persistent inventory IDs. Search text is never stored as run scope.

Diagnostics pages default to 25, max 100. Responses include source/page/size/total/
revision/entries; revisions guard multipage export. Malformed queries return 400;
stale application projection returns 409 (SQLite monitoring uses the existing
report-query stale validation). Monitoring failures are projected from history,
not appended to application errors. Old `/api/errors` remains compatible.

- API responses use JSON except the monitoring stream.
- Configuration validation failures return HTTP 400 JSON with an `error` field,
  including null entries inside the device or check arrays on save/import.
- Missing resources return HTTP 404.
- An overlapping monitor execution returns HTTP 409.
- Configuration full/row/import saves accept optional `X-NetWatch-Profile`.
  A mismatched active profile returns HTTP 409 without writing. The current
  browser sends this precondition; legacy clients can omit it. A loaded-profile
  guard also rejects the activation-before-reload cache gap. This is not revision
  control for concurrent drafts within the same profile.
- Unexpected failures before the response starts return HTTP 500
  `application/problem+json` with a generic title and `traceId`. Internal
  exception details remain in local logs; a failed error-log write does not
  prevent the controlled response.
- `/api/monitor/stream` uses `text/event-stream`.
- Once SSE streaming starts, busy/errors remain stream events; the response is
  not replaced with a problem JSON document.

## Web Entry Points

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/` | Return the NetWatch Lite application shell. |
| GET | `/workstations` | Return the shell for the read-only workstation inventory view. |
| GET | `/device-types` | Return the shell for the device-type catalog. |
| GET | `/docs/` | Return the browser documentation shell. |
| GET | `/docs/{file}` | Return an allowed documentation asset from `docs/`. |

`/docs` redirects to `/docs/`. Documentation files are resolved under the
fixed `docs/` root and unsupported or missing files return HTTP 404.

Workstations uses existing GET `/api/config` and GET `/api/regions`. Its query
parameters (`model`, `inventory`, `facility`, `q`, `size`, `page`) control browser
filters only; no new API/storage schema or monitoring endpoint is introduced.
See [the inventory view guide](PERIPHERALS.md#workstation-inventory-view).

## Configuration

GET `/api/storage` returns `provider` (`json` or `sqlite`), `schemaVersion`
(2 for the current SQLite binary, null for JSON), and `engineVersion` (null for JSON). It is read-only
and does not expose paths or trigger migration by itself. Startup performs the schema-1 upgrade with backup. All existing configuration/profile/
history/theme/integration endpoints keep their JSON contracts through either
storage provider. Restore/migration remain offline; managed backup/policy queries are additive local endpoints;
see [storage](STORAGE.md).

## SQL And Data Maintenance

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/reports/query` | SQL pages with whole-filter metrics, coverage, options and revision. |
| GET | `/api/inventory/query` | Active-profile relational inventory, internal IDs and raw compatible payload. |
| GET | `/api/storage/audit` | Private paginated changes, without inferred operator identity. |
| GET/PUT | `/api/storage/policy` | Global retention/automatic-backup policy. PUT validates all limits. |
| GET | `/api/storage/backups` | Managed filenames/times/sizes only; no download or absolute paths. |
| POST | `/api/storage/backups` | Create a new consistent SQLite snapshot and verify it. |

Query/audit/inventory/managed backup operations require SQLite. JSON keeps legacy
endpoints and policy/retention support. Invalid query/policy input returns 400;
unexpected disk/permission failures use the existing controlled error pipeline.
There is no HTTP restore, arbitrary SQL, source-path or backup-destination input.
These endpoints inherit the internal-tool trust boundary; they add no authentication.

Reports: `view=devices|runs|facility|category`, `page` (1-1000000), `size` (1-100),
`search`, `profile` (JSON `[region,group]`, normalized lower-case), `facility`,
`category`, `status` (Healthy/Degraded/Down/Problems/Unknown), `mode`, `from`/`to`
(ISO offset dates), `runKey`, `deviceKey`, `sort`, `direction`, optional `revision`.
Order fields come from a server allowlist; input is bound as SQL parameters.
`metrics` describes the whole filter, `total` the current view and `records` its
page. Coverage describes stored history. Stale supplied revision returns 400;
refresh/restart multi-page export rather than mixing snapshots. SQL query payloads
are additive internal projection contracts, not replacement config import files.

Inventory: page/size and optional `type`. Scope is captured from the active profile;
it is not an arbitrary document read. Audit: page/size and optional relative
`document` filter. Policy: historyMaxRuns, historyMaxAgeDays, exportBeforePrune,
automaticBackups, backupIntervalHours, backupCopies. Ranges/defaults are in STORAGE.

Each device accepts optional `location`: one line, max 200 UTF-16 code units
before trimming, with no control characters or Unicode line/paragraph separators.
Outer whitespace is trimmed; missing/null/blank means unspecified. Invalid
values return HTTP 400 on full saves, row saves and import before replacement.
It is private manual physical position within a Facility, not the Facility key,
monitoring output or geolocation. Current edits/copy/bulk/profile/export flows
preserve it; older binaries/clients may discard it when saving. Existing Notes
is never parsed or moved to this field. Older files need no migration.

Each device also accepts optional `notes`: plain multiline inventory text with
at most 2000 UTF-16 code units before trimming. CR/LF and tab are allowed; other
control characters are rejected with HTTP 400 on full saves, row saves and
import before replacement. Outer whitespace is trimmed; missing/null/blank
means no notes. Internal text/line breaks are retained by the backend; browser
textarea editing uses LF line breaks. No migration is needed for older files.
Current edits/copy/bulk/profile/export workflows preserve it, but older clients
and binaries that do not know this field can discard it on save. Notes is private
configuration text, not HTML, monitoring output or verified user identity.

Each device accepts optional `command`: one line, at most 4096 characters,
without control characters or Unicode line/paragraph separators. Outer
whitespace is trimmed; blank/null/missing means no command. Invalid values
return HTTP 400 on full saves, row updates and import before replacing data.
Existing files need no migration. Current copy/bulk/profile/export workflows
preserve it; older clients/binaries that omit the field can discard it on save.
This is literal clipboard text, not an executable command endpoint. Monitoring
results/history do not contain the field. See [operations](OPERATIONS.md).

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/devices` | Return active devices. |
| POST | `/api/reload` | Reload active configuration from disk. |
| GET | `/api/config` | Return complete active configuration. |
| POST | `/api/config` | Validate and save complete configuration. |
| POST | `/api/config/devices/{deviceIndex}` | Update one device. |
| GET | `/api/config/export` | Download configuration JSON. |
| POST | `/api/config/import` | Validate and import configuration JSON. |
| GET | `/api/device-types` | Read active profile/type catalog, protected IDs, usage and version. |
| POST | `/api/device-types` | Update only the catalog with profile/version guards. |

Configuration also carries optional `peripheralCatalog` and per-device
`deviceType` / `workstationPeripherals`. These fields describe manual inventory,
not monitoring results. Catalog saves use the complete configuration endpoint;
row updates retain the existing catalog. Invalid references, duplicate models,
wrong kinds/statuses or deletion of in-use models return HTTP 400 before any
file replacement. Export/import and profile copy carry the complete catalog.
See [PERIPHERALS.md](PERIPHERALS.md) for field names, defaults, limits and examples.

Each peripheral assignment accepts optional `linkType`: unrecorded, wireless or
cabled, independently from `connection` (usb/network/other). Tokens are trimmed
and lowercased; missing/null/blank becomes unrecorded. Other values return HTTP
400 before replacement on full/row saves and import. It is recorded inventory,
not monitoring data. Current copy/bulk/profile/JSON workflows retain it.

The root `deviceTypes` array contains `{id, name}` classifications. Omission
uses the five legacy defaults; explicit null/empty catalogs, missing/renamed
protected system types, duplicate IDs/names and undeclared device references
return HTTP 400 before replacement. Only the `workstation` key permits peripheral
inventory. Full config saves/imports remain complete replacements and should
carry the catalog. Row saves retain it.

Catalog-only GET returns `profileId`, `profileName`, `region`, `version`,
`protectedIds`, `deviceTypes` and `usage`. POST accepts `profileId`, `version`
and the complete `deviceTypes` array, returning a fresh snapshot. It reads
current inventory under the repository write lock and changes only the catalog.
Stale profile/catalog revisions return HTTP 409 with `error`; invalid definitions
or removal of referenced types return HTTP 400. Usage includes disabled devices.
These guards do not add global concurrency control to the full-config endpoints.
See [DEVICE_TYPES.md](DEVICE_TYPES.md) for limits and compatibility semantics.

Checks also accept `type: "http"` for HTTP/HTTPS URLs, with `url`, optional
`timeoutMs` (100-60000, default 10000), `expectedStatusCode` (200-599, default
200) and literal `expectedText` (max 4096). URLs are bounded at 2048 characters;
credentials/fragments/control characters and a separate TCP `port` are rejected.
Validation on save/import/row updates returns HTTP 400 before persistence.
The required device address remains unchanged for API/import compatibility.
See [HTTP_CHECKS.md](HTTP_CHECKS.md) for the complete contract and examples.

## Themes, Regions, And Integrations

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/themes` | Return theme configuration. |
| POST | `/api/themes` | Validate and save theme configuration. |
| POST | `/api/themes/reset` | Restore built-in themes. |
| GET | `/api/regions` | Return support-group profiles. |
| POST | `/api/regions` | Create a support-group profile. |
| POST | `/api/regions/{profileId}/activate` | Activate a profile. |
| POST | `/api/regions/{profileId}/duplicate` | Duplicate a profile. |
| POST | `/api/regions/{profileId}` | Rename a profile. |
| DELETE | `/api/regions/{profileId}` | Archive/delete an allowed profile. |
| GET | `/api/integrations` | Return local integration settings. |
| POST | `/api/integrations` | Validate and save local integration settings. |

Integration endpoints store future settings only. They do not execute external
inventory imports or report delivery.

The [administration redesign](ADMINISTRATION.md) keeps the profile/theme paths
and schemas above unchanged. Row selection/preview is browser-only; profile
creation/copy still activates the result. Theme naming operations now POST at
modal submission, and colors POST through Save Colors. Activation/deletion UI
state changes only after server success. No generic revision/ETag guarantee is
added to the existing full-theme/configuration replacement endpoints.

## Monitoring, History, And Errors

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/results` | Compatibility endpoint that runs a full check. |
| POST | `/api/monitor/run` | Start a monitor run and return the final result. |
| GET | `/api/monitor/stream` | Stream progressive monitor events. |
| GET | `/api/history` | Return local monitor history. |
| POST | `/api/history/clear` | Clear local history. |
| DELETE | `/api/history/runs/{runId}` | Delete one execution. |
| GET | `/api/errors` | Return controlled local error records. |
| POST | `/api/errors/clear` | Clear the local error file. |

Monitor endpoints accept `checkMode=Full` or `checkMode=PingOnly`. The stream
also supports `facility`, `category`, `deviceName`, repeated `deviceIp` and optional
`deviceType=<catalog-id>` filters. These intersect before probes execute. Unknown
type IDs match zero devices rather than expanding scope. New results include the
captured `deviceType`; type-filtered history scope records it too. Null legacy
values remain omitted, and no history/database migration is performed. Requests
without the parameter retain their previous/global behavior. See
[Dashboard filter scope](DASHBOARD_FILTERS.md).
Full executes configured HTTP checks as well as ping/TCP. PingOnly skips HTTP.
HTTP entries in `checks` add nullable `url` (without query/fragment),
`statusCode`, `expectedStatusCode`, `timeoutMs`, `durationMs` and `message`.
`status` contains a diagnostic such as Success, UnexpectedStatus, TimedOut,
ExpectedTextMissing, DnsError, ConnectionError or TlsError. Failures are normal
monitoring results, not HTTP 500 responses from the run endpoint. History
retains these optional fields; old stored ping/TCP results remain readable.

Treat history `runId` as an opaque string. New IDs include a GUID suffix so
runs completed at the same timestamp remain independently addressable. Existing
stored IDs keep their original value and remain accepted by deletion endpoints;
no schema migration is required. Clients must not parse a fixed ID length or
derive timestamps from it. Existing duplicate IDs are not automatically rewritten.

Reports uses browser-only snapshot keys to distinguish legacy duplicate IDs and
disables ambiguous deletion in its UI; the backend ID-based paths are unchanged.
CSV/JSON report exports are client-side filtered downloads, not new endpoints
or automatic outbound deliveries. See [reports](REPORTS.md) for definitions,
nullable measurements and the distinction between sample health and uptime.

## Contract Change Policy

Changes to paths, methods, JSON fields, status codes, or Server-Sent Event
shapes require:

1. Updates to this document and relevant models.
2. Contract tests covering old and new behavior.
3. A changelog entry.
4. A migration or compatibility note when existing clients can be affected.

Initial HTTP contract coverage lives in `tests/NetWatch.ContractTests`. It uses
an isolated ASP.NET Core test host and temporary runtime JSON files. Expand
those tests whenever a documented endpoint contract changes.
