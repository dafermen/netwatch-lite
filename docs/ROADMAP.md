# Coordinated Development Plan

Last updated: 2026-11-12

Current authorized work: [manual authenticated browser checks / IMP-014](BROWSER_CHECKS.md),
with tests/docs/new rc.16 folder/ZIP/SHA and GitHub publication authorized on
2026-11-12. This supersedes the historical publication holds below, not stable
deployment or real corporate acceptance. See [validation](VALIDATION_BROWSER_2026-11-12.md).

Previous delivery: [supported runtime / IMP-009](RUNTIME.md), tracked in
[runtime validation](VALIDATION_DOTNET10_2026-11-12.md). .NET 10 LTS source/regression
passed (416 .NET/444 browser), with private compatibility/rollback proven. Local
activation/new rc.15 folder/ZIP/SHA are delivered. SQLite schema 2/data preserved;
the owner-confirmed move/removal of one extra rc.11 ZIP is an accepted exception,
now closed without recreating the archive or rewriting the audit baseline.
GitHub remains on hold. See CURRENT_STATUS for receipts and remaining acceptance.

Preceding delivery: [multilingual monitoring / IMP-008](IMPROVEMENTS.md), tracked in
[validation](VALIDATION_MULTILINGUAL_2026-11-12.md). English/Spanish UI, shared
filters/grouping, exact filtered runs, monitoring pauses and private Diagnostics
are implemented. Source rc.14 runs with SQLite schema 2 on port 5000; its neutral
folder/ZIP/SHA and native validation are complete. GitHub publication is on hold.
Next gates: supported-runtime validation and operator/other-PC acceptance.

The user requested coordinated development of the discussed improvements. This
plan sets the delivery order and safety gates. [IMPROVEMENTS.md](IMPROVEMENTS.md)
holds individual scope/acceptance checks; [CURRENT_STATUS.md](../CURRENT_STATUS.md)
records actual implementation and evidence. A planned task is not a shipped feature.

## Existing Baseline

Implemented: profile-scoped device types and printer/scanner catalogs; workstation
inventory/reverse model lookup; HTTP/HTTPS checks; Support Groups/Themes management;
Dashboard inventory search and per-device actions; copy-only Commands; Reports
Summary/Runs/Devices with exports; device Location and Notes; versioned portable
folder/ZIP/SHA-256 generation. SQLite/JSON adapters, dynamic forms and visible
Configuration search are now implemented; delivery evidence is tracked below. The separate wallboard is
not part of this work. See the [README](../README.md) for full capabilities.

## Delivery Order

The owner subsequently approved IMP-005 on 2026-11-10: structured SQLite queries,
retention, inventory projections, auditing and managed backup/restore. Its source
implementation, private pilot, native rc.11 delivery and authorized local
schema-2 activation are complete. ADR 0007 and CURRENT_STATUS distinguish source, pilot, local activation
and stable-deployment approval. The completed stages below remain historical.

| Stage | Work | Current State | Exit Condition |
| --- | --- | --- | --- |
| 0 | IMP-003: Wireless/Cabled per peripheral assignment | Completed as local rc.7 test candidate | 311 .NET / 126 browser passes, exact ZIP/folder checks, preserved history and folder/ZIP/SHA-256 delivered. |
| 1 | IMP-001: Reveal Configuration search matches | Completed as local test candidate | Full desktop/mobile JSON/SQLite regression passed. |
| 2 | IMP-004: Clear field names and dynamic device form | Completed with compatibility/failed-save/profile guards | Full desktop/mobile JSON/SQLite regression passed. |
| 3 | TECH-001/002/003: Existing reliability investigations | Targeted mitigations/diagnosis implemented; historical root-cause limits remain | See reliability findings below; stable-release risk review remains required. |
| 4 | IMP-002A: SQLite architecture and isolated implementation | Implemented; 342 .NET cases passed | ADR 0006/schema 1, compatible adapters, transactional failure/profile-guard tests. |
| 5 | IMP-002B: SQLite migration pilot and portable verification | Completed as local rc.8 test candidate | Eight snapshots, backup/reversal, exact ZIP/folder/native checks and history/privacy audits passed; other-PC acceptance remains external. |
| 6 | Controlled cutover and stable-release decision | Approved local SQLite activation COMPLETE on 2026-11-10 | Eight live API snapshots matched; original JSON retained. Stable-deployment approval remains separate. |

Read-only investigation/design can proceed alongside UI work, but shared
inventory writes, migrations and release promotion must have one controlled
owner. Run .NET regression separately from browser/hashing/packaging work until
the previous concurrent-run intermittencies are understood. Do not infer a fix
from the latest successful run.

## Dynamic Form Design

Use device classification and configured checks together, not device type alone:

- Common fields: Name, Device Type, Facility, Location, Notes, Category, Enabled.
- Workstation: retain the printer/scanner inventory, including per-unit Link type.
- Monitoring fields follow actual checks. Ping/TCP needs a network target;
  HTTP-only needs monitored URLs, timeout/status and optional expected text.
  A server/workstation may also use HTTP, and custom types keep flexible checks.
- Website-only creation should use an HTTP preset without an unintended Ping.
  A Web application preset does not require renaming/removing protected device
  types or inferring special behavior from a custom type's display name.
- Rename Address to Network target (IP / hostname), Website URL to Open website
  link (optional), and HTTP URL to URL to monitor. Keep Open website link and
  Command in an optional Shortcuts section; they are actions, not health checks.
- Preserve current checks on edit. Apply creation presets to new records only;
  never silently replace saved checks or erase hidden fields. Incompatible type
  changes require explicit confirmation, with the draft retained on cancellation.
- Preserve the existing API/JSON fields and device identity/order. Derive the
  internal address for HTTP-only creation only when appropriate; do not rewrite
  an existing identity merely because the form hides a field.

Deliver stage 2 incrementally: labels/grouping first, then conditional fields/
presets, then full keyboard/mobile/legacy/profile/bulk regression. Avoid bundling
this UI change with the storage cutover so regressions can be isolated.

## Reliability Work

- TECH-001: reproduced the Windows sharing-lock failure class. Internal JSON
  readers permit atomic delete-sharing; writes retry only sharing/lock violations,
  bounded and cancellation-aware. Tests cover release/cancellation without loss.
  This does not prove the original history incident had the same cause.
- TECH-002: the historical Notes 500 lacked exception detail and cannot be
  retrospectively diagnosed. Kept response diagnostics and added a real-repository
  sharing-conflict test; SQLite no longer uses File.Replace. Track recurrence and
  correlate traceId/logs instead of claiming the old incident definitively solved.
- TECH-003: the 200 ms budget includes connection/scheduling/headers. A missing
  status before headers is valid; controlled unit transports independently assert
  null before headers and 200 when only the body stalls. The deadline was not
  increased and no success/status was fabricated to satisfy a timing assumption.
- TECH-004: full browser validation found initial Configuration load could close
  a newly opened draft. Editing now stays disabled until profile/configuration
  loading completes, with a deterministic delayed-response regression.
- TECH-005: reproduced stale profile writes/cache activation gaps on both
  providers. Profile preconditions now return 409 without modifying the target;
  modern browser full/row/import sends the guard. Failed form saves restore local
  state but retain the draft, preventing duplicate creates on retry. Same-profile
  concurrent draft revision control is not introduced.

Retain original failure evidence and add deterministic tests before changing
shared persistence/HTTP code. SQLite is not assumed to resolve these issues.

## SQLite Safety Gates

1. Review the existing JSON repositories and publish a new architectural
   decision, schema/versioning and adapter plan. JSON remains active until an
   explicit, validated cutover; do not silently change the accepted
   [JSON decision](adr/0001-local-json-persistence.md).
2. Cover profiles/active selection, settings, devices/checks, protected/custom
   types, peripheral catalogs/assignments, themes, history, errors and integration
   settings. Preserve Location, Notes, Command and linkType. Scope catalog/type
   identifiers to their profile and retain ordering used by row-index APIs.
3. Preserve legacy history, unknown measurements and duplicate historical IDs;
   do not impose a uniqueness rule that drops records. Use an explicit mapping
   strategy and reconcile counts/relationships/values against the source.
4. Build and test with isolated synthetic data first. Keep API contracts and JSON
   import/export, validation and current UI workflows compatible. Test transactional
   failure, concurrency, schema upgrades, history queries and resource use.
5. Before a real-data pilot, create a consistent private backup and dry-run report.
   Make migration repeatable without duplicates, retain original JSON and test
   rollback. Do not delete/move/overwrite operational sources to force migration.
6. Exclude private database/sidecar/backup files from Git and portable artifacts;
   validate any new native runtime dependencies and clean first-run behavior on
   the target Windows x64 PC. A portable must still include its folder, ZIP and SHA-256.
7. Request explicit selection/approval for operational cutover after pilot evidence.
   Do not imply multi-instance/network-share support, authentication or automatic
   recovery unless separately designed and tested.

## Definition Of Done

Every delivery records scope, data compatibility, actual tests, remaining risks,
documentation updates and the running local service. Preserve prior artifacts
and operator changes; never use a test snapshot to overwrite live inventory.
Before stable deployment complete the thirteen [quality gates](DEPLOYMENT.md),
with evidence or project-owner-approved exceptions. Operator/other-PC acceptance
and a fresh immutable portable are separate from a source build or Git push.

Reports trends/comparison and print/PDF remain later possibilities, not approved
work in the immediate queue. No automatic monitoring, outbound delivery or SSO
is introduced by this plan.

Current implementation, quality evidence and residual gates:
[work-order validation](VALIDATION_WORK_ORDER_2026-11-10.md).
