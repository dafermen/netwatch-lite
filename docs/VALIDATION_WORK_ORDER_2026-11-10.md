# Work Order Validation - 2026-11-10

## Scope And State

Implement the approved [roadmap](ROADMAP.md): visible Configuration search,
check-driven form/clear URL names, reliability work and SQLite with reversible
migration, followed by regression, docs and a new folder/ZIP/SHA-256 candidate.
The separate wallboard, speculative Reports trends/PDF, SSO and outbound
integrations are not part of this work. No Git push/publication is requested.

Search reveals Normal/Bulk parents without writes/checks; clear restores collapse
behavior. Form visibility follows configured checks, not type names. New Web
application uses HTTP only; existing checks, hidden network identity, shortcuts,
Location/Notes and protected/custom types are preserved. Replacing configured
checks or removing recorded Workstation inventory requires confirmation.
See [device form](DEVICE_FORM.md).

SQLite schema 1 stores full logical documents using parameterized commands,
per-write backup transactions and multi-document profile transactions. A lease
protects one process per content root. JSON remains compatible; clean installs
select SQLite, while existing JSON requires explicit offline migration.
[Storage](STORAGE.md) documents schema/native dependencies, backup and reversal.

## Validation Evidence

- Release build: no warnings/errors. Full .NET regression: 334 passed, comprising
  34 unit, 25 integration and 275 contract cases, no failures/skips. TRX prefix
  `work-order-final`, timestamps `20261110071117`, `20261110071120`, `20261110071139`;
  coverage under TestResults GUID directories.
- After adding profile preconditions/cache guards, full .NET regression passed
  342 cases (34 unit, 25 integration, 283 contract), no failures/skips; TRX prefix
  `work-order-guards-final`, timestamps `20261110072542`, `20261110072545`,
  `20261110072602`, with coverage.
- Targeted mutation baseline passed and all four valid mutants were killed:
  omitted previous backup, omitted write commit, ignored newer schema and ignored
  changed migration source. Receipt: `artifacts/verification/storage-mutations-753eab59d4da42e3afa63b2930698500/result.json`.
  This is sampled storage mutation testing, not whole-application mutation coverage.
- Integration invariants include transaction failure preserving current/backup,
  64 concurrent writes, restart/rename/export/backup, schema rejection, cancelled
  writes, confined paths, exact migration/backup bytes and changed-source rejection.
  A deterministic 256-value fuzz loop covers escaping, Unicode and SQL metacharacters.
- Private-copy pilot passed: 15 source files unchanged, 13 migrated logical
  documents, eight API snapshots identical between JSON/SQLite and after JSON
  reversal, exact migration repeat without database changes, integrity and backup.
  Native SQLite version: 3.53.3. Migration measured 615 ms; eight SQLite reads
  measured 130 ms; observed peak working set 67334144 bytes. These local samples
  are not production SLO/resource certification. Private receipt:
  `artifacts/verification/storage-pilot-35cca89d5dc043c3902540986d683ade/result.json`.
- User explicitly approved SQLite activation in this project after the pilot.
  Actual cutover and final portable evidence are recorded below.
- Full SQLite browser regression passed 136 cases (68 desktop, 68 mobile), no
  failures/skips/retries. Evidence is preserved under
  `artifacts/verification/work-order-b497b91c6da94802b1f71f8d45c5243a/browser-sqlite-final/`.
  This was the checkpoint before the additional profile-guard/retry tests; the
  final 140-case per-provider result is recorded below.

Only synthetic inventory/loopback targets were used in automated tests. The pilot
read copies of operator documents without executing monitoring. No original JSON
was restored to an earlier snapshot, deleted or imported into a portable.

## Initial Failures And Fixes

Initial SQLite browser regression had 130/134 passes. Four failures exposed the
same Configuration initial-load race: editing was possible before the active
profile load completed, then the late configuration response closed the form.
Editing is now disabled through the complete profile/config load; a delayed-
response regression verifies it. Initial traces/HTML remain privately under
`artifacts/verification/work-order-b497b91c6da94802b1f71f8d45c5243a/browser-sqlite-initial/`.

An initial full .NET run had 333/334 passes: the new profile rollback test compared
against a mutable pre-operation List after it had been changed. The test now
captures the scalar count beforehand. Its document-rollback assertion had already
passed; no rollback implementation was weakened. The complete rerun passed.
An initial mutation wrapper stopped on the deliberately failing native stderr;
the wrapper now reads exit/TRX outcomes and rejects compile/tool errors as kills.

Final review also reproduced stale-profile writes in eight isolated cases across
both providers (full/row/import preconditions and activation-before-cache-reload).
They returned 200 before the fix and 409 afterward, without changing the target
inventory. The modern browser sends X-NetWatch-Profile; legacy clients can omit
it. This is a profile guard, not same-profile revision control. Failed form saves
restore the local pre-save inventory while retaining the editor draft, so a retry
does not duplicate a new row. Final browser matrix includes both regressions.

## Reliability Findings

Windows sharing/lock failures are reproduced and covered with bounded,
cancellation-aware atomic-write retries and internal delete-sharing readers.
SQLite profile/document transactions have injected failure tests. These changes
mitigate a proven failure class, but do not establish the historical Notes 500 or
history-replacement incident's missing root cause. Retain traceId/log diagnostics
and investigate recurrence before approving stable deployment.

The 200 ms HTTP deadline includes connection/scheduling/headers. Network timing
cannot guarantee a status before expiration. Unit transports separately verify
no status before headers and 200 retained when the body alone stalls. The real
deadline was not increased, failures were not converted to success, and no status
was fabricated. TLS/body limits/redirect/cookie protections remain unchanged.

## Final Delivery Checks

The final full browser matrix passed 280 cases: 140 SQLite and 140 JSON, with
70 desktop/70 mobile per provider, no failures/skips/retries. Final evidence is
under the work-order directory's `browser-sqlite-guards-final/` and
`browser-json-guards-final/`, plus the usual HTML report/test-results output.
Visual review of the synthetic Web application form at desktop/mobile confirmed
wrapping, modal bounds, distinct shortcut/check labels and no control overlap.

Final private-copy pilot passed after the complete binary was built:
`artifacts/verification/storage-pilot-0009c66285c546a7b2787c56b43768dc/result.json`.
It retained 15 sources, migrated 13 documents in the normalized test copy,
matched eight snapshots after SQLite/JSON reversal, and verified idempotence and
backup. Local samples: migration 733 ms, eight SQLite reads 135 ms, peak working
set 67219456 bytes. These are observations, not performance guarantees.

User-approved operational activation then passed: 12 actual source documents
migrated, new private JSON/SQLite backups, all 14 original JSON hashes unchanged,
and eight live API snapshots matching the pilot. Service PID 27804 runs SQLite
schema 1 / engine 3.53.3 on localhost:5000. No agent monitoring was requested.
Receipt: `artifacts/verification/work-order-b497b91c6da94802b1f71f8d45c5243a/source-cutover.json`.

Both-shell package guard suites passed all 54 checks after adding database/
sidecar/lease/backup/export exclusions. Evidence:
`artifacts/verification/guards-40bcf38e8b5f49c48c600527459d31cd/` and
`guards-c6e36d57fcff4a0f8cbf3d1c55ef67ad/`.
NuGet audit reported zero vulnerable packages across four projects, and npm
reported zero vulnerabilities at every severity; local JSON evidence is under
the work-order verification directory. This is an advisory dependency scan,
not a penetration test or proof that no vulnerabilities exist.

Documentation recheck passed 264 local links across 51 Markdown files before
final handoff notes. Candidate rc.8 was generated and validated:

- Folder: `artifacts/portable/NetWatch-Lite-v0.8.0-rc.8-win-x64/`.
- ZIP: `artifacts/packages/NetWatch-Lite-v0.8.0-rc.8-win-x64.zip`.
- SHA sidecar: adjacent `.zip.sha256`.
- ZIP bytes: 47406912.
- SHA-256: `55cec60f9e62ad515ca42a8dae2c293d71c248bf3c633bd951f22f2049d18c90`.

PowerShell 5.1 generated/verified the exact ZIP; PowerShell 7 retested the final
ZIP, and PowerShell 5.1 retested the final folder through a copy. Each passed 19
read-only routes, seven corruption/private-file rejection checks, neutral SQLite
first run without runtime JSON, and unchanged package/source bytes. Evidence:
`22c75153ab344fcda817493767919ac9/result.json`,
`efd2a15dddfa4a0391d1acfbc624c18f/result.json`, and
`abe431688cfe4e94b178626f1a756d38/result.json` under artifacts/verification/.

All 414 package files matched policy/manifests; all 70 public assets matched
build-time source. No database/sidecar/lease, operational inventory, notes,
history, theme, integrations, backups/exports or external inputs were packaged.
All 2803 previous portable/package files plus eight legacy archives retained
hashes. Duplicate rc.8 generation failed without changing outputs. No publisher
lock/staging entry remained. Final receipt is
`artifacts/verification/work-order-b497b91c6da94802b1f71f8d45c5243a/portable-final-audit.json`.
Outputs remain ignored, untagged (sourceDirty: true) and were not uploaded.
Post-generation repository handoff notes do not rewrite the immutable archive's
build-time documentation. The source service remains on port 5000 with SQLite.

Final handoff verified 15 live read-only routes (all HTTP 200), SQLite provider/
engine and final frontend guards, unchanged ZIP SHA and all 14 original JSON
hashes. No isolated test app, publisher lock or staging entry remained. Final
navigation/whitespace checks passed 265 local links across 51 Markdown documents.
Receipt: `artifacts/verification/work-order-b497b91c6da94802b1f71f8d45c5243a/final-state.json`.

## Deployment Gate Limits

The thirteen [deployment gates](DEPLOYMENT.md) still require recorded evidence
or owner-approved exceptions before stable deployment. This delivery provides
automated acceptance/unit/integration/contract/E2E/regression baselines, targeted
property/mutation/fuzz/concurrency/security checks and local resource measurements.
It is not a comprehensive security audit, universal fuzz/mutation result, sustained
load/SLO test, clean-machine certification or operator acceptance on another PC.
Frontend CDNs and trusted-internal-network deployment limits remain unchanged.
