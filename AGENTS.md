# Codex Working Instructions

These instructions are mandatory for any Codex session working on NetWatch Lite.

## Project Context

- This repository is `dafermen/netwatch-lite`.
- The app is a .NET 8 ASP.NET Core Minimal API with a static Bootstrap frontend in `wwwroot/`.
- The product is an internal network monitoring dashboard. Keep the scope practical: local monitoring, editable JSON profiles, support groups, themes, reports, local history, local error logging, and local integration settings.
- The companion Windows WebView2 wallboard lives in the separate `netwatch-lite-wallboard` repository. Do not reintroduce wallboard source into this repo unless the user explicitly asks.

## Continuity First

- Read `CURRENT_STATUS.md` before making changes.
- Then read `README.md`, `docs/README.md`, and the relevant canonical files
  under `docs/` as needed for the task.
- Update `CURRENT_STATUS.md` whenever the phase, completed work, pending validations, or next steps change.
- Record user-requested improvement notes in `docs/IMPROVEMENTS.md` with stable
  IDs and explicit status. Logging an item does not authorize implementing it.
- Follow the coordinated queue and safety gates in `docs/ROADMAP.md`. Keep
  queued UI/SQLite work distinct from shipped features; do not switch live
  storage or migrate operator data merely because a roadmap item exists.
- SQLite/JSON behavior is governed by `docs/STORAGE.md` and ADR 0006. Clean
  auto installs use SQLite; existing JSON requires explicit offline migration.
  Preserve document bytes/order/legacy history during migration; never import
  a stale JSON snapshot over an edited database. Backups/exports remain private.
  Use the content-root lease and keep profile multi-document operations atomic.
  A pilot, an operational cutover and stable deployment are distinct decisions.
- Schema 2 extends ADR 0006 via ADR 0007. Documents, relational projections and
  local audit changes commit together; never edit a projection independently.
  Preserve casing/numeric enums/unknowns/legacy duplicates during backfill.
  Keep whole-filter SQL metrics distinct from a displayed page and reject stale
  revision exports. Retention defaults to pre-prune private exports; changing
  policy alone never deletes history. Only managed automatic backups are rotated,
  after a new verified snapshot; manual/upgrade backups and archives stay intact.
  Restore offline to a new folder, never over a live database. Audit values are
  sensitive and do not identify an authenticated actor. Track actual local schema
  activation in CURRENT_STATUS; older binaries cannot open schema 2.
- Modern Configuration full/row/import writes send X-NetWatch-Profile. Preserve
  409 rejection before writes when active/loaded profiles differ. Always capture
  one profile/path for a save, never resolve metadata and destination separately.
  Failed creates/updates retain their draft but restore local pre-save state so
  retry cannot append duplicates. This does not introduce same-profile revision
  control or verified multi-user support.
- If a change affects user-facing behavior, update `README.md`, `CHANGELOG.md`, and relevant files under `docs/`.
- Keep these continuity files current before handing the project back to the user.

## Safety Rules

- The user authorized GitHub repository update and a new portable release for
  the Dashboard Device Type filter on 2026-11-11, superseding the previous hold
  for this delivery. Publish only reviewed public source and neutral ZIP/SHA.
  This is not blanket authorization for later releases or stable deployment.
- Do not commit runtime operational data. These files must stay private and ignored: `Data/config.json`, `Data/config.backup.json`, `Data/regions.json`, `Data/regions/`, `Data/themes.json`, `Data/monitor-history.json`, `Data/app-errors.json`, and `Data/integrations.json`.
- Portable releases must include only safe sample data such as `Data/config.sample.json`.
- Never package database/sidecar/lease files or storage-backups/storage-exports.
  Include SQLite/native dependency notices, and validate a clean SQLite first run.
- Build portables with `scripts/publish-portable.ps1 -Version <new-version>`.
  Keep immutable extracted folders under `artifacts/portable/` and ZIP/checksum
  pairs under `artifacts/packages/`. Never overwrite/delete a historical version.
  Every delivery must include the versioned folder, compressed ZIP and SHA-256
  sidecar; folder-only delivery is incomplete. Present the ZIP as the primary
  file to copy/share. This is a standing user preference for future versions.
  Maintain the explicit public asset list in `scripts/portable-public-files.json`;
  do not replace it with a recursive workspace copy. Generated neutral settings
  and sample data must not be replaced with local runtime inventories.
- Do not claim SSO, Microsoft Entra ID, verified operator identity, external inventory import, or outbound report delivery as active features. They are planned/future capabilities only.
- Do not expose this app directly to untrusted networks. Treat it as an internal tool unless authentication and deployment controls are added.

## Engineering Rules

- Printer/scanner catalogs live in each support-group configuration, alongside
  workstation assignments. Keep them self-contained for copy/import/export;
  preserve both through normalization and row/bulk edits. Do not infer device
  type from categories or describe assigned peripherals as automatically detected.
- Peripheral assignment `linkType` is independent of `connection`: unrecorded,
  wireless or cabled. Missing/null/blank stays unrecorded; never infer it from
  USB/Network/Other or move it into the shared model catalog. Preserve it through
  editing/copy/bulk/profile/JSON workflows and keep it out of monitor history.
- Follow the existing Minimal API style in `Program.cs` and service/repository patterns under `Services/`.
- Device types live in each profile's `deviceTypes` catalog. Preserve all five
  protected legacy keys/names, especially `workstation` and its exclusive
  peripheral behavior. Use catalog-only mutations with profile/revision guards;
  preserve catalogs in full configuration, row saves and profile copies.
- Dashboard Device Type is independent from Category and intersects Facility,
  search and status for presentation. Scoped runs enforce the type on the server,
  not by IP alone; no-match/stale types must never broaden to all devices.
  Global automatic runs remain global. Capture classification in new results and
  optional history scope, leave old history unknown/unchanged, and include type
  in dashboard identities so identical names/addresses do not share results.
- HTTP/HTTPS definitions use `type: http`. Preserve their URL/expectations in
  all configuration workflows. Keep deadlines across body reads, bounded
  decompressed content, strict TLS, no cookies/redirects and sanitized results.
  This internal URL checker is not a public or authenticated browser monitor.
- Device `command` is optional inert clipboard text, never a process/shell or
  launch endpoint. Preserve it through normalization and current editing/copy/
  export workflows; keep it out of DeviceResult/history. Structural validation
  does not imply shell safety. Test clipboard adapters without touching the
  operator's system clipboard or executing stored text.
- Keep frontend changes consistent with the current static Bootstrap structure in `wwwroot/index.html`, `wwwroot/app.js`, and `wwwroot/styles.css`.
- Dynamic editor visibility follows actual checks, not display type names.
  Preserve hidden identities/fields and saved checks; creation presets are not
  edit-time migrations. Confirm configured-check replacement. Keep Configuration
  editing disabled until initial profile/configuration loading completes, so a
  delayed read cannot close an operator's draft. Search reveals matching parents
  without saving or monitoring and restores collapse behavior when cleared.
- Configuration search includes each HTTP check URL. Successful device create/
  edit/copy reveals the saved row, clearing only incompatible filters and opening
  its parents. Reveal it on the next Dashboard visit without executing a check;
  never enable a disabled device implicitly. HTTP-only forms hide Location and
  Command while retaining their stored values and restoring them for mixed checks.
- Report mutation busy-state renders must not schedule SQL reads. Cancel queued
  reads before deletion, then reload only after the write settles; preserve the
  delayed-delete browser regression so a stale revision cannot hide a successful CRUD.
- Device `notes` is optional private multiline inventory text (max 2000 UTF-16
  code units; CR/LF/tab permitted, other control characters rejected). Preserve
  it through editing, copy, bulk changes, profiles and import/export. Render as
  escaped text, never markup, and keep it out of DeviceResult/history. A named
  user in notes is manual inventory, not verified identity or an access control.
- Device `location` is optional private single-line text (max 200 UTF-16 code
  units, no controls or Unicode line/paragraph separators), distinct from
  Facility grouping. Show it before Notes and preserve it across all device/
  profile/config workflows. Never infer/move content from existing Notes or
  copy Location into DeviceResult/history. It is manual, not geolocation.
- Reports is a read-only historical projection except explicit confirmed run
  deletion. Preserve legacy records/IDs, distinguish unique identities from
  evaluations, keep unknown measurements neutral and never call the sample
  health ratio time-based uptime. Retain stale-read guards and CSV text escaping.
- Master-list controllers and shared confirmation/focus behavior live in
  `wwwroot/management.js`, loaded after Bootstrap and before catalog scripts and
  app.js. Keep selection distinct from activation, theme drafts distinct from
  saved palettes, and failed reads non-editable without fabricated defaults.
- Prefer narrow, readable changes over broad refactors.
- Validate server-side before writing runtime JSON files.
- Preserve compatibility with existing local JSON files when adding fields.

## Validation Checklist

Run these before presenting meaningful code changes:

```powershell
dotnet build
git diff --check
```

For UI or workflow changes, also do a manual smoke review of the affected page and note what was checked in `CURRENT_STATUS.md`.

Before any deployment, complete every quality gate in
`docs/DEPLOYMENT.md`. Do not describe a deployment as ready
unless acceptance, unit, property/invariant, mutation, fuzz, integration,
contract, end-to-end, regression, security, concurrency/resilience,
performance/resource, and compatibility/deployment testing have evidence
recorded. Any unavailable gate requires a documented exception approved by the
project owner.

## Local Run Command

Use port 5000 for the shared local development service:

```powershell
dotnet run --urls http://localhost:5000
```

The application is available at `http://localhost:5000/` and the standardized
browser documentation at `http://localhost:5000/docs/`.
