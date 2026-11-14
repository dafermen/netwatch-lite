# Improvement Backlog

Last updated: 2026-11-13

User-reported improvements are recorded here with stable IDs. A pending entry
is not approval to implement it. Keep implementation and validation status
explicit; technical/release risks remain in [CURRENT_STATUS.md](../CURRENT_STATUS.md).
The user requested coordination on 2026-11-09. Delivery order and cross-cutting
gates are in [ROADMAP.md](ROADMAP.md); queued work is not implemented work.

## Owner Notes - 2026-11-13 (Implementation In Validation)

Subsequent approval on 2026-11-13: implement IMP-013/016/017/018/019 locally,
with safety checkpoints, tests/docs/new portable and port-5000 activation.
Statuses below describe the original intake until each stage is validated;
CURRENT_STATUS tracks execution. No additional GitHub publication is authorized.

The initial note-taking request did not authorize changes. The subsequent work
order above authorizes the local candidate; rc.16 remains the published baseline.
No database schema migration, live database restore or publication is included.

## IMP-016 - Independent Filter Lists And Clear Filters

- Reported: 2026-11-13, Dashboard/main. The owner initially mentioned OR, then
  explicitly clarified: independent Device Type/Category lists, **retain AND**.
- Requested: choosing a type must not restrict the Category choices, and choosing
  a category must not restrict the type choices. This is not a union of matches.
  Keep Facility/search/status/monitoring constraints and exact execution guards.
- Review the discoverability of the existing Clear filters icon beside search;
  do not add a duplicate reset or conflate clearing filters with deleting results.
  Current reset clears search/Facility/type/category/status and returns monitoring
  participation to its enabled-only default; it does not enable paused items.
- Acceptance: either list remains available after selecting the other; an
  incompatible pair legitimately produces zero matches and disables Run. Manual
  and automatic checks use only the visible enabled intersection. Clearing never
  writes inventory, deletes history or starts checks. Preserve unavailable-value,
  in-flight scope and Configuration draft protections when standardizing views.
- Status: implemented and browser-validated locally; portable validation pending. The clarification supersedes the initial
  OR wording, not the shipped AND predicate documented in DASHBOARD_FILTERS.

## IMP-017 - Confirmed Imports And Configuration Version History

- Reported: 2026-11-13. Current file selection posts the import without an explicit
  replacement confirmation. Priority: prevent accidental loss of configuration.
- Requested: two explicit confirmations before replacing the active profile.
  Prefer a first review of destination/file/counts followed by a clear final
  replacement confirmation, rather than two identical blind prompts. Cancel at
  either stage must leave data unchanged and must not send the import mutation.
- Proposed complement: a private per-support-group list of full configuration
  versions, including a verified pre-import snapshot, timestamp, bounded source
  metadata and counts. Keep settings, devices and all catalogs together. This is
  distinct from execution history, audit field diffs and whole-database backups.
- A restore should preview the selected version, confirm its destination, first
  preserve the current configuration and apply a guarded profile-only write.
  Never replace a live SQLite file or roll back unrelated profiles/history/global
  settings. Capture profile/revision together; reject stale or switched scope.
- Reuse current storage/transaction/audit mechanisms where appropriate. Validate
  before mutation and abort if required snapshot creation fails. Existing JSON
  compatibility and private-data exclusions remain mandatory; do not invent
  verified operator identity from local audit entries.
- Acceptance: both cancellations, malformed input, backup/write failure, reload,
  stale profile/revision, repeated import, version listing/preview and recovery
  preserve the expected data. Specify bounded retention before adding automatic
  rotation; never delete manual/upgrade backups or historical release archives.
- Status: implemented locally with guarded preview/commit, per-profile history,
  exact-byte download/restore, 20-point/80-MiB no-auto-prune bounds and two UI
  confirmations. Fault, stale, integrity and concurrent-write tests passed;
  full JSON/SQLite browser regression passed; portable evidence is pending. See CONFIGURATION_RECOVERY.md.

## IMP-018 - Opt-In HTTP Redirect Following

- Reported: 2026-11-13; owner marked important. Add a per-HTTP-check checkbox for
  redirect support (notably HTTP 302), **disabled by default**. Missing fields in
  current configurations must preserve today's no-follow behavior.
- Distinguish following a redirect from simply accepting status 302. When enabled,
  validate the approved final response/status/text, with bounded hops/loop detection
  and one end-to-end attempt deadline covering the chain and required body read.
- Preserve strict TLS, no HTTPS downgrade, supported URL schemes, sanitized
  diagnostics and anonymous/no-cookie behavior. Define cross-origin policy before
  implementation; never silently reuse personal or dedicated browser sessions.
  A Microsoft login page returning 200 must not be presented as authenticated
  application availability. Protected-site validation still uses browser checks.
- Acceptance: default off/legacy imports, allowed redirect to final 200, loop,
  missing/invalid destination, excessive hops, timeout, unsafe scheme/downgrade,
  TLS failure, login redirect and preservation through edit/copy/import/export in
  both storage providers. No global redirect switch affecting existing probes.
- Status: implemented locally, default off, anonymous GET across allowed schemes/
  origins, five hops, one deadline, strict TLS/no downgrade and neutral known
  login detection. Unit/real-loopback/full browser regression passed; portable
  validation pending. See HTTP_CHECKS.md for limits/custom-login caveats.

## IMP-019 - Explain Monitoring Participation

- Reported: 2026-11-13. Clarify the main selector Monitoring on / Monitoring paused /
  All items; consider clearer bilingual labels without mixing owned UI languages.
- Verified current behavior: it only filters the existing `enabled` flag. On shows
  enabled items, Paused shows disabled items, All shows both. It is not Online/
  Offline status and does not toggle automatic refresh or modify configuration.
- Runs always exclude paused items, including with All selected. An enabled item
  can be offline or not yet checked. Automatic refresh is a separate control.
- Status: selectors renamed bilingually to Enabled for checks / Checks paused /
  All items, without changing enabled/status/Auto Refresh semantics. Browser-validated.

## IMP-008 - Multilingual Monitoring And Diagnostics

Historical delivery authorization/hold below was superseded for GitHub by the
owner's authenticated-browser work order on 2026-11-12. See IMP-014/current status.

- Authorized: 2026-11-11; local development, regression and a new portable only.
  GitHub publication is explicitly on hold.
- Implemented: English-default/Spanish UI, inclusive device/website entry,
  Configuration shared facets and Facility/Device Type grouping, Type-only Run,
  exact filtered manual/automatic monitoring, pause/resume, last-execution detail,
  and internal/probe diagnostics with private query/export.
- Validation: Completed locally: 416 .NET, 424 full browser and 80 final targeted
  passes; eight monitoring/six storage mutants, native rc.14 ZIP/folder/SHA and
  private-data/historical preservation verified. Owner/other-PC acceptance remains.
- Compatibility: No schema migration or private-data rewrite; legacy calls with
  no exact selection token retain previous behavior. Old portables are immutable.
- Evidence/limits: [Current validation](VALIDATION_MULTILINGUAL_2026-11-12.md).

## IMP-009 - Supported Runtime Before Stable Deployment

- Authorized: 2026-11-12. .NET 10 LTS implementation, regression, backed-up local
  activation and immutable rc.15 native folder/ZIP/SHA delivery complete.
- Found: 2026-11-12. .NET 8 support ended on 2026-11-10, per
  [Microsoft](https://dotnet.microsoft.com/en-us/platform/support/policy/dotnet-core).
- Historical rc.14 keeps net8.0; its portables pin the final 8.0.34 patch.
  This does not restore support. No machine-wide SDK/runtime was replaced.
- Current: SDK 10.0.404/runtime 10.0.15, matching provider/testing packages,
  package guards and private-copy compatibility/rollback. No schema change.
  See [runtime policy](RUNTIME.md) and [validation](VALIDATION_DOTNET10_2026-11-12.md).
  Local activation/portable delivery and stable deployment are separate gates.
  Final regression: 416 .NET, 444 browser passes; native/data-preservation receipts
  are recorded in validation. The owner confirmed moving/deleting the extra
  historical rc.11 ZIP and instructed leaving it as-is; that observation is closed.
  Raw exact-path audit evidence is preserved, not relabeled as 5781 matches.
  No GitHub publication is authorized.

## IMP-014 - Manual Authenticated Browser Checks

- Authorized: 2026-11-12, including tests/docs/new portable and GitHub publication.
- Implemented: dedicated non-persistent Edge contexts, saved-row local sign-in/
  confirmation/close, strict final URL/query/content checks, distinct auth/unknown
  states, bounded lifetime/concurrency and redirect-hop origin guards.
- Safety: no personal profile, credentials, MFA automation or state export. No
  real corporate login during testing. SQLite stays schema 2; HTTP is unchanged.
- Delivery/validation: [current evidence](VALIDATION_BROWSER_2026-11-12.md) and
  [usage/limits](BROWSER_CHECKS.md). Real application/other-PC acceptance is separate.
- Completed: rc.16 folder/ZIP/SHA, backed-up loopback activation and GitHub
  prerelease published; all four source CI jobs passed. No stable rollout.

## Proposed Follow-Ups (Not Authorized)

- IMP-015 - GitHub Actions runtime maintenance: source CI for rc.16 warns that
  checkout/setup-dotnet/upload-artifact v4 target deprecated Node 20 and are
  currently forced onto Node 24. Review supported action releases/pins separately;
  do not silently upgrade workflow majors as part of browser-check delivery.

- IMP-010 - Offline frontend assets: bundle versioned Bootstrap/FontAwesome and
  licenses locally, then test the complete interface without internet/CDN access.
  Current browser fixtures provide local assets; this does not prove real offline use.
- IMP-011 - Shared-service access controls: authentication, read/operator/admin
  roles and authenticated audit attribution before broader network exposure.
  Current audit entries are local changes, not verified user identity.
- IMP-012 - Operational acceptance: another-PC/proxy/SSO checks, representative
  sustained-load measurements and periodic restore drills into a new folder.
  Existing backup/restore, diagnostics and bounded local tests are not a substitute
  for the target environment's acceptance or continuous availability alerts.
- IMP-013 - Visible running version: show the actual application version, runtime
  patch and storage provider/schema in About or a read-only status view. This
  would distinguish an old portable from the source service without exposing
  database paths, inventory or credentials. Current About identifies .NET 10 LTS
  but does not expose a live build/version endpoint.
  Owner reiterated this on 2026-11-13: show a compact **actual running build** on
  main and the full version/build in About. Read running assembly metadata rather
  than hardcoding a release number or inferring it from static files. Keep runtime/
  provider/schema details read-only in About and never expose private file paths,
  inventory or credentials. Verify source versus portable and both UI languages.
  Status: implemented locally from actual running assembly/runtime/storage metadata;
  bilingual main/About validated; native-package validation pending. No duplicate ID.

These are recommendations only. Prioritize offline assets for portable usability;
prioritize access controls first if the service will be shared beyond a trusted PC.

## IMP-007 - Dashboard Device Type Filter (Historical rc.13)

The rc.13 global automatic/presentation-only semantics below are historical;
IMP-008 supersedes them for the current UI.

- Authorized: 2026-11-11, including GitHub source and new portable publication.
- Status: Completed 2026-11-11; 373 .NET/356 browser passes and native rc.13
  folder/ZIP/SHA validated. Source and prerelease are published, all four remote
  CI jobs passed and the downloaded ZIP/checksum matched. Other-PC acceptance
  remains pending.
- Scope: Catalog-backed selector before Category, read-only view filtering and
  server-enforced scoped executions, exact typed identities and Clear filters.
- Compatibility: No schema migration, no old-history rewrite, no automatic checks
  on selection; automatic global monitoring remains global.
- Evidence: [Dashboard type validation](VALIDATION_DASHBOARD_TYPES_2026-11-11.md).

## IMP-006 - URL Save Visibility And Compact HTTP Form

- Reported/authorized: 2026-11-11; edits/copies report success but disappear.
- Status: Completed 2026-11-11, with 357 .NET / 332 browser passes and verified
  native rc.12 folder, ZIP and SHA-256. Other-PC acceptance remains pending.
- Reproduced: Configuration did not search `checks[].url`; an old search could
  exclude a renamed row, and successful saves collapsed its parent groups despite
  the API retaining the record. This is not evidence of SQLite data loss.
- Acceptance: URL search, visible saved row/copy, pending Dashboard visibility,
  reload/restart persistence, original/copy independence, failure/retry, disabled
  records and all existing CRUD regressions across JSON/SQLite and desktop/mobile.
- HTTP-only forms hide Location/Command while retaining their values; mixed
  checks restore them. No migration or automatic monitoring is introduced.
- The broader CRUD check also reproduced and corrected a Reports deletion/read
  overlap. A controlled delayed-write regression guards the SQL refresh order.
- Evidence: [URL CRUD validation](VALIDATION_URL_CRUD_2026-11-11.md).

## IMP-001 - Reveal Configuration Search Matches

- Status: Completed 2026-11-10 in Normal/Bulk, with full desktop/mobile JSON/
  SQLite regression and portable rc.8 delivery; see work-order validation.
- Reported: 2026-11-09.
- Area: Configuration (`/config`), Devices search and collapsed groups.
- Report: Searching for a workstation finds a match, but its parent panel stays
  collapsed. The device is hidden, making the search look unsuccessful.
- Requested outcome: Automatically expand the Facility and category groups
  containing matches so the found devices are immediately visible.

Acceptance checks:

1. A nonempty search with matches reveals the matching device rows and opens
   their collapsed parent groups.
2. A search without matches shows the existing explicit no-results state.
3. Clearing the search restores the normal Configuration collapse behavior.
4. Manual collapse controls and Edit/Copy/Delete remain usable, without changing
   inventory data or starting monitoring.
5. Verify desktop/mobile and Bulk Edit; clearing Bulk search restores its previous
   collapse state. Editing stays disabled through initial profile/config loading.

Implemented without saving inventory or starting monitoring. See
[form/search](DEVICE_FORM.md) and [validation](VALIDATION_WORK_ORDER_2026-11-10.md).

## IMP-002 - Migrate Local Persistence To SQLite

- Status: SQLite schema 1/adapters/offline migration/backup/export implemented.
  Private-copy pilot passed; user-approved local activation completed on 2026-11-10.
  SQLite is active on port 5000; original JSON remains intact. Final portable/
  release evidence is recorded in CURRENT_STATUS.
- Requested: 2026-11-09.
- Area: Local persistence, data migration and portable compatibility.
- Current design: [ADR 0006](adr/0006-sqlite-document-persistence.md) supersedes the
  storage-engine choice. Clean auto installs use SQLite; existing JSON is preserved
  until explicit offline migration. JSON import/export remains supported.
- Requested outcome: Introduce SQLite as the local persistence layer while
  retaining existing data and JSON import/export compatibility.

Acceptance checks:

1. Document the data model, storage adapter, schema versioning and architectural
   decision before cutover. Do not describe SQLite as active before it is implemented.
2. Back up and safely migrate device inventories, catalogs/assignments, profiles,
   themes, history, errors and integration settings. Preserve IDs, relationships
   and existing fields, with repeatable migration and a tested rollback path;
   never delete/overwrite the original JSON files as an unverified migration step.
3. Keep configuration JSON import/export and existing API/UI workflows compatible.
   Preserve the self-contained portable workflow without bundling private databases,
   sidecar files, backups or operational data.
4. Validate transactional writes, integrity, concurrency, backup/restore and schema
   upgrades. SQLite must not be assumed to resolve the separately tracked write
   failures or HTTP timing intermittencies without evidence.
5. Add migration/integration/contract/regression tests and measure history-query
   performance and resource usage before approving deployment.

The initial 2026-11-09 note did not change storage. The subsequent implementation
adds Microsoft.Data.Sqlite, maintained native bindings and schema 1; private pilot
matched eight API snapshots and verified exact idempotence/rollback. See
[storage](STORAGE.md) and [validation](VALIDATION_WORK_ORDER_2026-11-10.md).

## IMP-003 - Wireless/Cabled Peripheral Links

- Status: Implemented, regression-tested and delivered as local portable rc.7
  (folder/ZIP/SHA-256). This is not stable-deployment approval.
- Requested: 2026-11-09.
- Scope: Per-printer/scanner Link type (Not recorded, Wireless, Cabled), independent
  of USB/Network/Other, with legacy-safe preservation and read-only inventory display.
- Evidence: [Peripheral link validation](VALIDATION_PERIPHERAL_LINKS_2026-11-09.md).

## IMP-004 - Clear Names And Dynamic Device Form

- Status: Implemented 2026-11-10 with check-driven fields, new-record presets,
  preserved existing identities/checks and configured-check replacement confirmation.
- Discussed/coordination requested: 2026-11-09.
- Scope: Distinguish network target, website shortcut and monitored HTTP URL;
  adapt visible fields to device classification and actual checks, preserving data.

Acceptance targets:

1. Clearly distinguish Network target (IP / hostname), Open website link (optional)
   and URL to monitor; group website/command actions under Shortcuts.
2. Show common inventory fields on every type and printer/scanner inventory only
   for Workstation. Drive network/HTTP fields by checks, not type names alone.
3. Offer HTTP-only creation without an unwanted default Ping; respect existing
   checks on edit and retain custom types and protected legacy IDs.
4. Never silently erase hidden fields or identity/history links. Confirm any
   incompatible type change and preserve the draft if the operator cancels.
5. Keep API/JSON/profile/copy/bulk compatibility and verify desktop/mobile,
   keyboard, validation, clearing, failed-save and legacy workflows.

See [form/search](DEVICE_FORM.md), the roadmap and current work-order validation.
Wireless/Cabled remains included from rc.7; these changes are part of rc.8 work.

## IMP-005 - Structured SQLite Queries And Data Maintenance

- Status: Completed locally 2026-11-10: source/pilot validated, native rc.11
  folder/ZIP/SHA delivered and owner-authorized schema-2 activation on port 5000.
  This is not stable-deployment approval; evidence/remaining gates are in CURRENT_STATUS.
- Scope: Relational history/inventory projections, SQL report filters/aggregates/
  pagination, configurable retention with pre-prune exports, private before/after
  change history, managed consistent backups and offline restore to a new folder.
- Preserve original document bytes during upgrade, duplicate legacy IDs, public
  API/JSON contracts, profile isolation and immutable portable history.
- Verify transactional rollback/projection consistency, legacy enum/casing,
  bounded pages with complete totals/exports, retention archive failure, managed
  backup ownership/rotation and restore. No actor, encryption, multi-instance
  support, automatic monitoring or GitHub publication is implied.
- Design: [ADR 0007](adr/0007-sqlite-relational-projections.md).
