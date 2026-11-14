# Current Status

Last updated: 2026-11-13

## rc.17 Delivered Locally - Not Published

Owner authorized implementation of IMP-013/016/017/018/019 on 2026-11-13.
Keep AND semantics; independent option lists do not mean OR. No new GitHub
publication is authorized. Local portable must have a new folder/ZIP/SHA.

Interruption safety: keep rc.16 binaries/assets and a verified DB backup in a
private checkpoint before changing runtime/UI. Serve the old webroot until the
new matching backend/UI pass isolated tests. Never overwrite an archive, reset
user changes, restore a live DB file or activate incomplete code. Local files
persist if the assistant is interrupted; checkpoints/status are the resume path,
not a promise that an OpenAI usage limit can be predicted or avoided.

Stages:
1. Complete: stable checkpoint artifacts/checkpoints/rc16-20261113-cdba71b6,
   verified before.db, eight matching APIs. PID 20620 served frozen rc.16 webroot
   on port 5000 during development with the original content root/SQLite. This
   frozen process was stopped only after final package validation; see stage 5.
2. Implemented, initial contracts passed: transactional pre-change versions and
   guarded import/restore APIs (SQLite schema unchanged). JSON snapshots are
   durably written before replacement; a failed write can leave a safe extra point.
3. Implemented: two confirmations/history UI, actual assembly version in main/
   About (including ordinary dotnet run), independent choices with AND matching,
   clearer participation labels and default-off anonymous redirects. Final backend:
   517 passed (91 unit/30 integration/396 contract), plus 26 focused recovery cases.
   Raw bytes/BOM/unknowns, concurrent/stale/renamed scope, capacity, repair, tamper,
   snapshot/replacement failure and deleted-profile ID isolation passed. Nine
   selected mutants killed (uxmut-82f56479), including the lock-order inversion.
   Windows 1175 was reproduced in an initial JSON stress baseline and now receives
   bounded path-preserving retry, not a delete/copy fallback or live DB rollback.
   Historical/original baseline: 6790 files/15 Data JSON, earlier 6224 also matched.
   Profile metadata participates in revisions; profile locking precedes SQLite.
   Refreshed pilot f58b30b2907f4afa83457803049b6ce8 matched eight APIs, raw documents,
   SQL counts, rc.16 reversal and original JSON. Schema remains 2.
   Full browser suites passed: final JSON 240 / SQLite 240, plus 42 final SQLite
   retests after the concurrency refinement. No failures/skips/retries. Static
   script/language/link checks and 2000 JS filter cases passed; dependency audits
   reported zero advisories; 75 packaging guards passed on each PS5.1/7.
4. Package complete: rc.17 folder/ZIP/SHA generated from clean local commit
   132396c37ab2270bac8a4ecbafc915ba949b5538. ZIP is 92514810 bytes; SHA-256
   caf599060965df9b1ba9642a21b0c61413ab67bea73ed04cfc22fddbbc1fb020.
   568 physical files (567 manifest entries), 98 public assets, 117 pinned driver
   files. Generation, PS5.1 ZIP and PS7 folder-copy checks passed 47 routes/12
   negatives plus native guarded import/stale rejection/restore. Driver/Edge
   loopback smoke passed. All 6790 historical/original files/15 Data JSON matched.
   Native receipts: 4e05da2bffcf43558a2252fa35897a05,
   d3a0c93fd0794d35a74b0967f27c3e2c, fc37c305f2fb4174ad10ad2f44ad0915.
   An initial negative-sentinel parent-folder setup failure promoted nothing;
   validator fix 132396c passed the fresh retry. No existing archive overwritten.
5. Complete: source rc.17 active at http://localhost:5000, PID 26428, build
   132396c37ab2270bac8a4ecbafc915ba949b5538, CLR 10.0.15 from the private SDK,
   SQLite schema 2/engine 3.53.3. Activation a2fbff8a13734e9eab22e41e763ebcad keeps
   before.db, before/after exports and matching eight APIs. Exact documents and
   original JSON matched; no migration, fallback or database rollback occurred.
   Read-only live Dashboard/About UI checks passed without writes/check attempts
   or screenshots of private inventory. Reload an existing tab to load rc.17 UI.
   Real corporate/other-PC acceptance remains operator-owned. No GitHub push.

Resume: read this section first, then docs/IMPROVEMENTS.md and docs/ROADMAP.md.
Evidence: artifacts/verification/ux17-20261113 plus the named native/mutation
receipts. The ZIP is the primary file to copy, with its adjacent SHA-256.
Post-generation documentation does not modify the immutable build-time package.
Next: owner tests real sites/SSO and the ZIP on the destination PC; GitHub remains
on hold for this delivery. Do not infer rc.17 evidence from older rc.16 receipts.

## Historical Intake - 2026-11-13

Documentation-only intake; rc.16 code/data/runtime and published archives are
unchanged. No GitHub push, new portable, import, restore or service restart is
authorized/performed by recording these notes.

- IMP-016: independent Device Type/Category lists and review Clear filters. Owner
  clarified to retain AND, not a real OR union. Preserve exact enabled scopes.
- IMP-013 extended: actual build on main and in About; reuse existing backlog ID.
- IMP-017: two confirmations before import; design private per-profile full
  configuration version listing/preview/guarded recovery, not a live DB restore.
- IMP-018: per-HTTP-check redirect option, default off, with bounded safe following
  and no false healthy result at a login page. Existing HTTP behavior stays intact.
- IMP-019: explain/review monitoring participation labels. Enabled/paused/all is
  not online/offline or automatic refresh; paused items are never run.

See [backlog and acceptance](docs/IMPROVEMENTS.md) and [coordination](docs/ROADMAP.md).
The later implementation approval is tracked at the top of this file. Do not
reuse rc.16's receipts as evidence for the rc.17 candidate.

## Authenticated Browser Checks - rc.16 Delivered And Published

Owner authorized a manually signed-in browser check, regression, documentation,
new immutable rc.16 folder/ZIP/SHA and GitHub publication. This supersedes the
rc.14/15 publication hold, not stable-deployment gates. Preserve SQLite schema 2,
private data, existing HTTP semantics and historical archives. Manual dedicated
Edge sessions remain non-persistent; never export cookies or include credentials
in configuration/history/portables. THOR acceptance needs the owner's real login;
test synthetic loopback flows only. Expected text is optional; basic access checks
require the intended final URL/status/rendered content, not merely any 200 page.

Implemented: separate browser definitions/editor, local guarded session actions,
dedicated volatile Edge contexts, readiness confirmation, auth/unknown states,
final URL/query/content validation, CDP redirect-hop guards, TTL/limits and
117-file pinned driver packaging. Focused synthetic contract and bilingual
desktop/mobile UI tests pass. A blocked-redirect regression found the ordinary
routing limitation and now passes with CDP interception at every document hop.

Final local regression: 465 .NET passed (73 unit/28 integration/364 contract),
456 full browser passed (228/provider) plus six final SQLite retests; no skips,
failures or retries in final receipts. Four browser/eight monitoring/six storage
sampled mutants killed; 1000 destination/2000 filter generated cases passed.
73 packaging guards passed on each PS5.1/7; advisory queries reported zero
vulnerable dependencies. Private pilot matched eight APIs/raw documents/SQL counts
and rc.15 rollback; original JSON unchanged. Browser test instances now explicitly
dispose their runtimes; mutation preparation avoids Windows long-path failures.

Portable source: clean c74ad2d0a49f1b723e09243ee37cdd4c3c5bbe7e, tag
v0.8.0-rc.16. Folder artifacts/portable/NetWatch-Lite-v0.8.0-rc.16-win-x64/;
ZIP artifacts/packages/NetWatch-Lite-v0.8.0-rc.16-win-x64.zip and adjacent SHA.
92470993 bytes; 564 files/94 matched public assets/117 pinned driver files.
SHA-256: ef6e0c73aed74fe8f43c0392cef84dc105dc41b9058cac9f69ce591ee11b98fa.
Generation/PS5.1 ZIP/PS7 folder-copy checks each passed 41 routes/11 negatives.
Native receipts: d9f329bf1d5c4445a5bf4d7340fd7103,
e3b178309b9b414f85643ffb1e2fc5e0, 237eba750a3d43779104bfcc06bf8b64.
Packaged Node/Playwright exercised installed Edge with synthetic loopback content;
the packaged .NET EXE also passed browser CRUD, guarded status, exact selection,
AuthenticationRequired and neutral SQLite metrics without opening a real site.

Source is active at http://localhost:5000, PID 872, version rc.16+c74ad2d,
CLR 10.0.15 from private SDK, loopback listeners only, SQLite schema 2/engine
3.53.3. activation-10e0d117dde14ad0ae77cb91bfd54518 contains before.db,
old runtime and matching eight APIs/raw exports. All 6224 historical/original
baseline files, including 15 Data JSON, matched. The extra rc.11 absence remains
the owner's accepted action; no historical archive was replaced.

GitHub source/tag and ZIP/SHA prerelease are published:
https://github.com/dafermen/netwatch-lite/releases/tag/v0.8.0-rc.16.
All four source CI jobs passed (43260541061). Downloaded release ZIP/SHA match
local bytes/hash; stable latest remains v0.6.2. No remote backend or Pages
deployment. These receipts are a documentation-only follow-up to the tested
binary/source commit c74ad2d. The immutable ZIP retains build-time docs; these
post-generation receipts do not modify its bytes. Evidence is private under
artifacts/verification/browser-checks-20261112 and the named native receipts.
Real corporate/other-PC acceptance remains external; never claim synthetic
fixtures validated the corporate application.
Next: owner tests real manual login/expiry on the destination PC. IMP-015 records
the non-blocking GitHub Actions Node-20 deprecation warning; no workflow-major
upgrade is authorized by this delivery.
Historical publication holds below describe their original deliveries only;
the current owner's authorization supersedes them for this delivery.

## Local Runtime Delivery - 0.8.0-rc.15

Owner authorized IMP-009 on 2026-11-12. App/tests/CI now target .NET 10 LTS,
runtime 10.0.15, SDK 10.0.404 (official SHA-512 verified private installation at
artifacts/tools/dotnet-10.0.404). No machine-wide runtime/environment replacement.
SQLite stays schema 2. Source activation and neutral folder/ZIP/SHA are delivered.
GitHub publication is ON HOLD; nothing from this migration was pushed/released.

- Final .NET: 416 passed (34 unit/28 integration/354 contract); zero skips.
  Final solution build: zero warnings/errors; 35 HTTP/TLS retests passed.
- Final browser: 444 passed (222 JSON/222 SQLite), desktop/mobile and both
  languages; zero failures/skips/retries. A controlled-delay regression exposed
  and fixed premature Configuration editing after search rerenders in Normal/Bulk.
- Eight monitoring/six storage sampled mutants killed; 2000 seeded JS cases;
  70 package guards each on PS5.1/7; syntax/links/translations and audits passed.
- Private runtime pilot 9054ef0bf79243d49da7804796638ab7 matched eight APIs,
  raw document bytes/SQL counts, net8 rollback and original JSON. Historical
  schema-1 synthetic cross-runtime upgrade/restore also passed.
- Browser preparation is separately bounded/measured; Windows copy-only Robocopy
  replaces slow Node asset copies. Final max setup: JSON 8409 ms/SQLite 6491 ms.
  Failed/aborted earlier attempts and traces remain as evidence, not final passes.

Source: PID 22568, http://localhost:5000, version
0.8.0-rc.15+4c5dafdf026944b360a02cb3da932e212fc62b93. Loaded CLR 10.0.15 verified;
only 127.0.0.1/::1 listeners. Private activation-1348ced460e64cfeaad845d701d7c991
contains before.db/old runtime and before/after exports. Document bytes/eight APIs/
15 Data JSON matched; 13 live assets matched. Engine 3.53.3/schema 2, no migration.

Portable source: clean commit 4c5dafdf026944b360a02cb3da932e212fc62b93.
Folder: artifacts/portable/NetWatch-Lite-v0.8.0-rc.15-win-x64/.
ZIP: artifacts/packages/NetWatch-Lite-v0.8.0-rc.15-win-x64.zip, adjacent .zip.sha256.
52543152 bytes; 442 files/91 public assets; both runtimes 10.0.15 included.
SHA-256: 54169c3a0b6ac63e8d1fee3995f35ff8c23ea63b091c1736d26e0b35c473a308.
Native generation/PS5.1 ZIP/PS7 folder checks each passed 38 routes/eight negative
checks. Extra exact-selection, single-use, pause/resume and diagnostic checks passed.

Historical observation CLOSED by owner confirmation: 5780/5781 baseline paths
matched, including all 15 Data
JSON. One extra archive is missing: artifacts/portable/NetWatch-Lite-v0.8.0-rc.11-win-x64.zip
(initial SHA 9d2b69e06f745bcc270f2cf318641eec0d82396aea5ad3ab6ea8b8035059d4a3).
Canonical rc.11 folder and artifacts/packages ZIP remain unchanged; that ZIP has
a different hash, so it cannot replace the extra copy. The owner confirmed moving
or deleting that additional ZIP and instructed leaving it as-is. Its absence is
intentional and accepted; do not recreate it or apply this exception to other
archives. Raw audit receipts/baseline remain unchanged (5780 matched, one absent),
with an owner-confirmation addendum. No existing file hash mismatched. This closes
the observation, not the separate stable-deployment/other-PC acceptance gates.

Evidence: artifacts/verification/dotnet10-20261112; see
[runtime validation](docs/VALIDATION_DOTNET10_2026-11-12.md).
Native receipts: 141bb50d9d0043a6a068dbde6d8b4253,
ecacb78f33894515a6cd5bd93cb056eb, af7cd833cdc145eca12c88904eb87579.
Extra: native-workorder-5e8faaf946e642d98bdd0cc017c4c45e. The ZIP is frozen;
these post-build source receipts do not rewrite its documentation or bytes.
Other-PC/proxy/SSO/sustained-load acceptance and stable approval remain separate.

## Historical Local Delivery - 0.8.0-rc.14

COMPLETE: the eight feature changes, regression, documentation and immutable
portable folder/ZIP/SHA are delivered locally. GitHub publication is ON HOLD;
nothing from this work order was pushed, released or deployed remotely.

- English-default/Spanish UI; inclusive device/website forms; shared filters,
  Facility/Device Type grouping, exact filtered manual/automatic checks,
  pause/resume, last-execution detail and private Diagnostics/export.
- Tests: 416 .NET passes; 424 full browser passes (212/provider) and 80 final
  targeted passes (40/provider), no failures/skips/retries in those receipts.
  Eight monitoring/six storage sampled mutants; 2000 seeded JS filter cases;
  58 package guards on each of PS 5.1/7; syntax/links and dependency audits passed.
- Package source: clean local commit `6812892d8ab8b40a461051d4c9c4d2739d6e26da`.
  Folder: `artifacts/portable/NetWatch-Lite-v0.8.0-rc.14-win-x64/`.
  ZIP: `artifacts/packages/NetWatch-Lite-v0.8.0-rc.14-win-x64.zip`, adjacent `.sha256`.
  Size: 49239005 bytes; 432 package files / 88 public source assets.
  SHA-256: `3ea0a12229b556de816f4a3a01c3ba680389c4c32fc1aa648642bdd8eccdcebf`.
- Native generation/ZIP/folder-copy checks each passed 35 routes/eight negative
  checks; extra native exact-selection/pause/diagnostic cases passed. All 5347
  protected historical/original files, including 15 Data JSON, matched.
- Source: rc.14, PID 29836, port 5000, SQLite schema 2. Private pre-restart backup
  and before/after document bytes/eight APIs matched; no migration. Backend
  assembly records commit 3a39dac; later read-only UI fixes are served from the
  current content root and covered by the targeted regressions.

Evidence: `artifacts/verification/workorder-20261111/`; native receipts
`7e9e8f3bab2c47629541bc0d676ce668`, `67d10e33e8aa44e78df701f3f99cdbfe`,
`9e50621ed46f465d966812d418f95ba2` under artifacts/verification.
Extra native: `native-workorder-9af2a4c7cafc4282892dd87e166b55c2/`.
`package-audit.json` records build-time public source matches. The ZIP is a frozen
checkpoint; these later source receipts do not rewrite its docs or bytes.

Next: owner/other-PC acceptance and IMP-009 runtime migration before stable
deployment. .NET 8 is out of support; the portable contains its final 8.0.34 patch,
while source uses installed shared 8.0.28. No machine-wide runtime was replaced.
CDN reachability, corporate proxy/SSO and sustained load remain environment checks.
No authentication or stable-deployment approval is implied.

## Multilingual Work Order Checkpoints - Historical

These implementation checkpoints precede the final delivery above.
The owner authorized eight connected changes: English/Spanish UI
(English default, no mixed product copy), inclusive device/website entry names,
Configuration grouping by Facility or Device Type, Run using all selected filters,
quick per-entry monitoring enable/pause, shared Dashboard/Configuration filters,
and visible/exportable diagnostics with actionable HTTP explanations.
GitHub publication is ON HOLD for this delivery, superseding the rc.13 authorization.
Produce a new immutable local portable folder, ZIP and SHA; preserve all older
versions, private data and SQLite schema 2. No real URL probes are authorized by
the screenshot alone; reproduce transport/status/timeout cases on synthetic servers.

Implementation order: shared view/execution scope and quick Enabled controls;
language catalogs and inclusive forms; diagnostics and redacted export; regression,
backed-up local restart on port 5000 and a new neutral portable. Persisted names,
catalog IDs, URLs and operator inventory are never translated or rewritten.
Existing internal errors are already stored; add consultation/export rather than
confusing expected HTTP failures with unhandled application exceptions.

First implementation checkpoint: revision-checked inventory snapshots and bounded,
single-use monitoring plans are implemented. Empty/stale/paused selections never
become global runs. New opaque per-snapshot keys separate even identical inventory
records; legacy clients remain compatible. Narrow monitoring participation writes
change only Enabled. Dashboard view/run now shares the same Facility/type/category/
search/status/participation predicate, including automatic runs. Configuration has
the same facets in Normal/Bulk and grouping by Facility/Device Type, retaining
original row indexes. A last-run receipt/details view keeps results inspectable.
Twenty new API cases passed on JSON/SQLite; 12 new desktop/mobile browser cases
passed on SQLite. Evidence: `artifacts/verification/workorder-20261111/`.
Language catalogs (957 entries), draft-safe switching and private Diagnostics
consultation/export are implemented. Full .NET passed 416 (34/28/354); seeded JS
properties passed 2000 generated cases. Eight monitoring and six storage sampled
mutants were killed against green baselines; packaging guards passed 58 each on
PowerShell 5.1/7. npm/NuGet audits found no known vulnerabilities (NuGet required
an unsandboxed retry after a denied cache/profile read). Static checks passed 16
scripts, translation placeholders and 321 links. Historical baseline: 5347 files.
Browser regression is ongoing. It found template slot issues affecting table,
code and textarea values plus fast-close/export menu behavior. These are fixed
and have targeted regressions. An initial-read race is also guarded: run/type
controls stay disabled until a revision snapshot exists. Require the final full
pass before packaging.
The final focused acceptance passed 26 desktop/mobile cases, including delayed
snapshot loading, repeated Type-only Run, changed/removed scopes, pause/resume,
shared Configuration editing, language preference/draft guards and template safety.
The complete browser matrix passed 424 (212 SQLite / 212 JSON), zero failures,
skips or retries; both viewports are included. Final targeted Reports/language/
export regressions passed 80 cases (40 per provider) after the small read-only
cancellation/legacy-label fixes. Application changes are frozen for packaging.
Source rc.14 is now PID 29836 on port 5000, backend commit 3a39dac. Activation
`activation-60ec61f0bde14e639528b51292344dcf/` verified a private pre-restart backup,
unchanged document bytes/eight APIs/15 Data JSON and unchanged schema 2.
`live-service.json` matched 11 served assets. New portable generation is pending;
then record native ZIP/folder checks and all 5347 protected historical hashes.
No GitHub. Other-PC acceptance, representative corporate proxy/SSO/long-running
load, and stable deployment approval remain separate. Existing Bootstrap/FontAwesome
CDN reachability must be checked on the target PC (the package includes .NET,
not an assurance of offline frontend operation).
Important support gate: .NET 8 ended support on 2026-11-10 (Microsoft policy).
The portable generator now pins its final 8.0.34 patch instead of inheriting the
SDK's older 8.0.28 pack. The active source still uses installed shared 8.0.28;
no machine-wide runtime was replaced. IMP-009 tracks a separately validated
supported-runtime upgrade before stable deployment. Audits are not support approval.

## Dashboard Device Type And GitHub Delivery - 2026-11-11

COMPLETE: Dashboard Device Type, complete local/remote regression, documentation
and immutable rc.13 folder/ZIP/SHA delivery. Source is published to main and the
prerelease is public with a verified download. The owner explicitly authorized
publication for this delivery, superseding the older hold below. Never upload
private DB/JSON, backups, pilot evidence or copied operational inventories.

Local previously validated rc.12 work was preserved as commit dfa7fd9, then upstream
documentation commits through 9b632e1 were integrated in merge 8af125b. Documentation
conflicts retained both navigation updates and later product guides; no remote
history was overwritten. The original published releases/ ZIPs remain unchanged.
The new public changes passed path/credential checks before remote publication.

Backend type-scoped checks and typed results/history scope are implemented.
An initial 12 focused .NET cases passed for SQLite/JSON, including same-name/address types,
legacy unspecified devices, unknown types and global runs. A backed-up source
restart now serves rc.13 / PID 34240 on port 5000. All document bytes, eight APIs
and original Data JSON matched; no schema migration or stale JSON import occurred.
Private evidence: `artifacts/verification/device-type-filter-20261111/`;
activation: `activation-6ed18eb1528745fa967aaa5706496545/`.

The user confirmed the preceding URL edit/copy visibility fix locally. Other-PC
acceptance and stable-deployment gates remain separate from this delivery.
Final .NET regression passed 373 cases (34 unit, 28 integration, 311 contract).
Both providers passed all 48 focused desktop/mobile dashboard cases. A mutation
coverage gap was closed with independent type/Facility and type/Category cases;
four monitoring mutants and six storage mutants were killed against green baselines.
Receipts: `monitoring-mutations-5444d8c160cc4ca193db56e579fdb4e9/` and
`storage-mutations-6af5e4edc0874cc283412e1eab700661/` under artifacts/verification/.
NuGet application/npm tooling audits found no known vulnerabilities. Both shells
passed 58 package guards; documentation links and syntax/whitespace passed.
Full browser regression passed all 356 cases (178 SQLite, 178 JSON), without
failures, skips or retries. Desktop/mobile screenshots were reviewed, including
100-character custom names and zero-match scopes. Ten JavaScript files and 296
relative links across 60 Markdown files passed the final static checks.
The historical/original-data hash baseline contains 4922 entries. Live verification
matched eight operational APIs and five served assets; source remains PID 34240,
rc.13, SQLite schema 2 on port 5000. Next: operator/other-PC acceptance and the
remaining stable-deployment gates. Older status and holds are historical;
this is not stable-deployment approval.

Immutable rc.13 delivery (source commit `8ceaaf8680ceb73edfa4e8d040654d7108a7fa50`,
clean tree, already pushed normally to main):

- Folder: `artifacts/portable/NetWatch-Lite-v0.8.0-rc.13-win-x64/`.
- ZIP: `artifacts/packages/NetWatch-Lite-v0.8.0-rc.13-win-x64.zip` and adjacent SHA sidecar.
- ZIP bytes: 47472644; 423 package files and 79 public assets.
- SHA-256: `8f80303123128e2ab0195eb444ed619efc5379ed17932a20b3abf8c02ea09ad5`.

Generation/final ZIP/folder-copy each passed 26 routes/eight negative checks,
neutral SQLite startup and unchanged artifact bytes on PowerShell 5.1/7.
Receipts: `49f3783888f64ac3ac96faa9b216595d`,
`c83a1a35eb6d47aa832fd0b79b5ea1df`, `67509f8564ee4a518f1459c7fdc71adc`.
Four additional native EXE scope cases passed (Workstation/Server, unknown type,
global), with unchanged synthetic inventory and ZIP. Receipt under this task's
evidence root: `native-scope-b8b39a01af9d4351800dce8512486950/`.
`package-audit.json` confirmed all 4922 protected historical/original files,
15 original Data JSON, 79 build-time source matches, manifest/checksum and no lock.
The archive is a frozen build-time checkpoint; these final receipts do not rewrite it.
GitHub assets report the same SHA/size and exact source commit. Remote CI:
[run 43067504093](https://github.com/dafermen/netwatch-lite/actions/runs/43067504093)
passed all four jobs: validate, portable-validation and both browser providers.
Public release: [v0.8.0-rc.13](https://github.com/dafermen/netwatch-lite/releases/tag/v0.8.0-rc.13).
The downloaded ZIP and SHA sidecar matched the local files exactly; receipts:
`github-ci.json`, `github-release.json`, `github-download.json` under this task's
evidence root. The existing latest stable v0.6.2 was not replaced. No GitHub Pages
or separately hosted backend deployment was performed.
The final receipt commit is documentation-only, intentionally skips redundant CI
and does not change runtime code/workflows or retag/repack the tested commit.
GitHub reports that checkout/setup-dotnet/setup-node/upload-artifact v4 target
deprecated Node 20 and are forced onto Node 24. Refresh these action references in
a separately validated maintenance change; this warning is not a test failure.

## URL CRUD Visibility - 2026-11-11

COMPLETE: source fixes, complete regression, backed-up source restart and native
portable rc.12 delivery/verification. Operator/other-PC acceptance and the remaining
stable-deployment gates are still pending; GitHub publication remains on hold.
The user clarified that save reports success but the record disappears. Three
isolated SQLite browser failures reproduced missing HTTP URL search, renamed rows
excluded by the old search, and saved copies hidden by collapsed parents. API
reads confirmed the rows were persisted. Do not characterize this as proven
SQLite data loss or claim every operator scenario has the same cause.

Saved device create/edit/copy now reveals its Configuration row and opens its
enabled pending Dashboard row on the next visit, without checks or implicit
enabling. HTTP-only forms hide Location/Command without deleting existing values;
mixed checks restore them. Validation/API details stay in the modal and retry
restores check-specific disabled controls. No schema/data migration is needed.
Initial .NET regression passed all 357 cases (34 unit, 28 integration, 295 contract).
The initial full SQLite browser run passed 163/164 and exposed a Reports deletion
race. A busy-state render scheduled SQL reads before DELETE settled, invalidating
its response/revision; a delayed-write test reproduced it deterministically.
Pending reads are now invalidated and busy mutation renders do not schedule SQL
queries. Final dual-provider regression passed all 332 browser cases (166 SQLite,
166 JSON, desktop/mobile), without skips, failures or browser retries. Eight
focused deletion cases also passed. Initial failures and traces remain preserved
under the evidence root. Both shells passed 58 packaging guards; 281 links in
55 documentation files, JavaScript syntax and Git whitespace checks passed.
Desktop/mobile screenshots were reviewed; compact-form overflow checks passed.
Source rc.12 is now running on port 5000, PID 7504 (old PID 30132 stopped).
Verified private backup and recovery runtime:
`artifacts/verification/crud-20261111/activation-423ffd03411c4c2081b3fdcb912834d3/`.
All document bytes, eight API snapshots and original JSON matched after restart;
SQLite remains schema 2 without migration or old JSON reimport.

Immutable local delivery:

- Folder: `artifacts/portable/NetWatch-Lite-v0.8.0-rc.12-win-x64/`.
- ZIP: `artifacts/packages/NetWatch-Lite-v0.8.0-rc.12-win-x64.zip`, with adjacent SHA sidecar.
- 47462529 ZIP bytes, 421 package files, 77 public assets.
- SHA-256: `a4d55e7cd57d767d112669d359189580dda18d407a4b107240795df14b0078d2`.

Generation (PowerShell 5.1), final ZIP (7) and folder-copy (5.1) each passed
26 routes/eight negative checks, neutral SQLite first run and immutable-byte
checks. Receipts: `fe9f311bbb9f4b9392f3a48ee3557ad8`,
`94d292203190468383c8328d9a12ef45`, `6443ff66ec2d4468a08b47e26e24a334`.
`artifacts/verification/crud-20261111/package-audit.json` confirmed manifest/SHA,
77 build-time source matches, all 4476 historical files and 15 original Data JSON
unchanged, and no publisher lock. Final live check confirmed source PID 7504,
version rc.12, updated UI and SQLite schema 2 / engine 3.53.3 on port 5000.
Archive documentation is a frozen build-time checkpoint; these final receipts
do not rewrite the ZIP/folder. Previously recorded Windows JSON/file-sharing
intermittencies remain historical risks, not claimed resolved by these passes.
New evidence: [URL CRUD validation](docs/VALIDATION_URL_CRUD_2026-11-11.md).
GitHub remains on hold. Earlier status/PIDs/packages below are historical.

## Relational SQLite Work Order - 2026-11-10

The owner approved all five recommendations: structured history/SQL Reports,
configurable retention, relational inventory, local change auditing and managed
backups/verified restore. Schema 2 source, additive query/maintenance endpoints,
bounded Reports UI and Configuration Data & backups are implemented. Document
compatibility is retained transactionally; see ADR 0007. The explicitly authorized
active-root upgrade is COMPLETE: SQLite schema 2 / engine 3.53.3, version rc.11,
source service PID 30132 on http://localhost:5000/ (previous PID 27804 stopped).
Verified pre-upgrade snapshot and old runtime were retained privately before
upgrade. Offline exports matched every document byte before starting the new
service; all eight live API snapshots and original JSON also matched afterward.
Activation evidence and private recovery material:
`artifacts/verification/sqlite-v2-handoff/activation-60949302224f41928e55bc267b1af999/`.
Schema-upgrade backups also exist under storage-backups/schema-upgrades/.
Older binaries require a schema-1 backup restored into a separate deployment,
not an in-place binary downgrade or selection of stale original JSON.

Initial .NET regression passed 346 cases (34 unit, 25 integration, 287 contract).
Browser validation exposed PascalCase/numeric-enum historical serialization;
compatibility was corrected, and the new real SQL 132-evaluation paged/export
case passed on desktop/mobile. Expanded .NET regression passed 354 cases
(34 unit, 28 integration, 292 contract); six sampled storage mutants were killed.
The final-code pilot at `relational-pilot-a902e91ef1274abe8f6bb7e3c7c6ccaa/`
also matched eight APIs, document hashes and schema-1 rollback. A 5000-evaluation
sample returned 7394 bytes for ten rows versus a 784800-byte full document
(188.4 ms for that test request, not an SLO or general speedup claim).
Final source regression passed 355 cases (34 unit, 28 integration, 293 contract)
with sequential xUnit collections, retaining explicit concurrency tests. Four
final SQL desktop/mobile browser cases passed, including invalid-date recovery,
retention confirmation and complete 132-evaluation export. Later parallel JSON
File.Replace and temporary-cleanup failures remain recorded, not claimed solved
by green sequential tests. Full browser matrices passed 296 cases (148 SQLite,
148 JSON; desktop/mobile), without failures/skips/retries. Four additional final
UI cases passed after search-whitespace and mobile table-width adjustments, with
reviewed screenshots and explicit overflow assertions. Final pilot
`relational-pilot-0030903427974f17be26454a4422922c/` also reconciled SQL query
counts with the compatible APIs. Both shells passed 58 package guards; syntax,
277 links across 55 Markdown documents and Git whitespace passed. NuGet/npm
audits found no known vulnerabilities. All source/test evidence is under
`artifacts/verification/sqlite-v2-*`; the handoff baseline covers 4062 historical
files and 14 original JSON files. Native rc.11 delivery is COMPLETE:

- Folder: `artifacts/portable/NetWatch-Lite-v0.8.0-rc.11-win-x64/`.
- ZIP: `artifacts/packages/NetWatch-Lite-v0.8.0-rc.11-win-x64.zip` and adjacent SHA sidecar.
- ZIP bytes: 47454045; 420 package files and 76 public assets.
- SHA-256: `4d9992d921442cabb7342df7fa82086d6ec6348c8904daa6e2c736496006e3cb`.

Generation/final ZIP/folder-copy checks passed 26 routes/eight negative probes,
neutral schema-2 SQLite startup and unchanged artifact bytes on PowerShell 5.1/7.
Receipts under artifacts/verification/: b485cd59331143758f757585eb1dcda0,
dd86245730b944218b8c6838749fed20 and b26b2b9af46e4358ad75956e026ba052.
Final audit `sqlite-v2-handoff/final-audit.json` confirmed package/SHA policy,
76 build-time source matches, all 4062 historical files and 14 original JSON
unchanged, no staging/publisher lock and the correct live service. NuGet audit
covers application dependencies; npm covers the local tooling lockfile.
Archive documentation is frozen at build time; these final handoff receipts do
not rewrite the historical ZIP/folder. Next: operator/other-PC acceptance and
remaining stable-deployment gates. No stable-release approval or resolution of
the known intermittent Windows JSON/File.Replace incidents is implied.
Do not publish to GitHub until the owner explicitly authorizes it.
Older evidence below is historical.

## HTTP Field Help And Compact Shortcuts - 2026-11-10

Added concise Spanish help below HTTP Timeout/Expected text, with unique per-row
IDs and aria-describedby. Removed the extra Shortcuts note/reference, retaining
Command help. HTTP fields stack on small screens. Existing retry controls remain
in Configuration > Settings (Retries 0-5, Retry delay 0-10000 ms), saved per active
profile and applied to failed Ping/TCP/HTTP attempts. No operator settings changed.
Isolated Release solution build passed without warnings/errors, with 32 focused
HTTP/command browser passes (16 SQLite/16 JSON on desktop/mobile), no skips/retries.
Visual review confirmed wrapping/stacking and no overlaps; unique description
references and synthetic retry-setting saves passed. Both shells passed 54 package
guards; syntax/whitespace passed. Generated and validated local portable rc.10
(416 files, 72 public assets):
`artifacts/portable/NetWatch-Lite-v0.8.0-rc.10-win-x64/`, ZIP under
`artifacts/packages/NetWatch-Lite-v0.8.0-rc.10-win-x64.zip` and adjacent SHA sidecar.
ZIP bytes: 47413948. SHA-256:
`aed1937f0c3afc43157d87393da2aacd72d476990bafa18193297729cbedb138`.
Exact ZIP/folder validation passed 19 routes/seven negative checks and clean
SQLite startup on PowerShell 5.1/7. All 3644 historical files and 14 original JSON
hashes stayed unchanged; no private data was packaged. The same source service
PID 27804 serves the new helpers on port 5000 with SQLite, without restarting.
Final audit:
`artifacts/verification/http-hints-5bb65994506f4957a47fbca136aef1ee/final-audit.json`.
Archive documentation reflects build-time state; final delivery receipts are
recorded here without modifying the immutable archive.
No GitHub push/tag/publication is authorized. rc.9/earlier outputs stay immutable.
See [HTTP helper validation](docs/VALIDATION_HTTP_HINTS_2026-11-10.md).

## Local Shortcut Descriptions - 2026-11-10

Added short Spanish descriptions below Shortcuts and Command, with associated
aria-describedby references. They distinguish shortcuts from monitoring checks
and clarify clipboard-only command text, without automatic execution or changes
to values, validation, persistence or copy behavior. Isolated Release solution
build passed without warnings/errors; all 16 focused browser cases passed
(eight SQLite/eight JSON on desktop/mobile). Visual review confirmed wrapping
and no overlap. Both shells passed 54 package guards; syntax/whitespace passed.
Generated and validated local portable rc.9 (415 files, 71 public assets):
`artifacts/portable/NetWatch-Lite-v0.8.0-rc.9-win-x64/`, ZIP under
`artifacts/packages/NetWatch-Lite-v0.8.0-rc.9-win-x64.zip` and adjacent SHA sidecar.
ZIP bytes: 47410308. SHA-256:
`00542d00f792fe23cf56e1d1f643416dd3b684ee4e595bf72bc54ca12a091cf5`.
Exact ZIP/folder tests passed 19 routes/seven negative checks and clean SQLite
startup on PowerShell 5.1/7. All 3227 historical files and 14 original JSON hashes
were unchanged; no private data was packaged. The same source service PID 27804
serves the new HTML on port 5000 with SQLite, without restarting. Final audit:
`artifacts/verification/shortcut-hints-648af97482df49cfa208461d9a4d848a/final-audit.json`.
The current
SQLite service remains on port 5000; no restart/data change is needed for HTML.

The user explicitly put GitHub publication on hold. Do not push/tag/publish or
upload until explicitly authorized; this instruction is also recorded in AGENTS.
The rc.8/earlier archives remain immutable. Local-only validation/delivery details:
[shortcut hints validation](docs/VALIDATION_SHORTCUT_HINTS_2026-11-10.md).

## Work Order And Portable rc.8 - 2026-11-10

Completed the approved local work order: Configuration search reveals matching
Normal/Bulk groups; the editor follows actual checks and Workstation inventory,
with clear target/shortcut/monitor URL labels and a new-record Web application
preset. Hidden identity/metadata and existing checks remain compatible. Initial
loading cannot close a new draft; stale-profile saves/imports return 409 and
failed saves retain the draft without duplicate creates on retry.

SQLite is ACTIVE in this project, explicitly approved by the user after the
private-copy pilot. The source service runs at http://localhost:5000/ (PID 27804),
schema 1 / engine 3.53.3, database netwatch.db. Offline migration imported 12
source logical documents, created a private JSON backup and verified SQLite
snapshot under storage-backups/, and retained all 14 original JSON hashes.
Eight actual service API snapshots matched the final pilot. No agent monitoring
request was made. Original JSON is not live storage now; use current-data export
for reversal, not stale pre-cutover files. Maintenance requires stopping this
content-root instance. See docs/STORAGE.md and ADR 0006.

Final source verification: Release build without warnings/errors, 342 .NET cases
(34 unit, 25 integration, 283 contract) with coverage; 280 browser cases (140
SQLite, 140 JSON; 70 desktop/70 mobile per provider), no failures/skips/retries.
Reviewed synthetic desktop/mobile form captures for bounds, labels and overlap.
Both shells passed 54 package guards each. Four sampled storage mutants were
killed; deterministic storage fuzzing covers 256 values. Dependency audits
reported zero known NuGet/npm vulnerabilities, not comprehensive security proof.
Final pilot retained 15 sources, validated migration/repeat/backup/JSON reversal
and matched eight API snapshots. Evidence and earlier failures:
[work-order validation](docs/VALIDATION_WORK_ORDER_2026-11-10.md).

Generated and validated immutable Windows x64 self-contained candidate
0.8.0-rc.8, including the SQLite native runtime and license notices:

- Folder: artifacts/portable/NetWatch-Lite-v0.8.0-rc.8-win-x64/.
- ZIP: artifacts/packages/NetWatch-Lite-v0.8.0-rc.8-win-x64.zip.
- Checksum: the adjacent .zip.sha256 sidecar.
- ZIP bytes: 47406912.
- SHA-256: 55cec60f9e62ad515ca42a8dae2c293d71c248bf3c633bd951f22f2049d18c90.

Windows PowerShell 5.1 generated/validated the exact ZIP; PowerShell 7 retested
the final ZIP and PowerShell 5.1 retested the final folder through a copy. Each
passed 19 read-only HTTP routes, seven negative checks, clean SQLite first run
and unchanged source bytes. All 414 package files matched policy/manifests;
all 70 public files matched build-time source. No database, journal/sidecar,
lease, operational inventory, notes, history, theme, integration, backup/export
or external input was packaged. All 2803 previous portable/package files and
eight legacy archives retained hashes. Duplicate rc.8 publishing was rejected
without changing outputs. No publisher lock or staging entry remained.

Evidence under artifacts/verification/:

- 22c75153ab344fcda817493767919ac9/result.json: generated ZIP, PowerShell 5.1.
- efd2a15dddfa4a0391d1acfbc624c18f/result.json: final ZIP, PowerShell 7.
- abe431688cfe4e94b178626f1a756d38/result.json: final folder, PowerShell 5.1.
- work-order-b497b91c6da94802b1f71f8d45c5243a/portable-final-audit.json:
  policy/manifests/public bytes/SHA/privacy/history/duplicate rejection.
- The same work-order directory holds source-cutover.json, dependency audits
  and separate final SQLite/JSON browser evidence.
- storage-pilot-0009c66285c546a7b2787c56b43768dc/result.json: final private pilot.

Artifacts remain Git-ignored and were not uploaded. Metadata records
sourceDirty: true for this untagged candidate. Post-generation repository
handoff notes do not modify the archive's immutable build-time documentation.

Final handoff passed 15 read-only live routes (HTTP 200), final frontend/profile
guards and SQLite provider, unchanged ZIP/SHA and all 14 original JSON hashes.
No test app, publisher lock or staging entry remained. All 265 local links across
51 Markdown documents and Git whitespace passed. Final receipt:
artifacts/verification/work-order-b497b91c6da94802b1f71f8d45c5243a/final-state.json.

Next: operator acceptance on the other Windows x64 PC, then the remaining
stable-deployment quality gates or approved exceptions. The original Notes-500/
history incident root causes remain unproven; tested sharing-lock mitigations,
profile guards and trace diagnostics do not retroactively establish them.
HTTP deadline/status semantics now have separate header/body tests without
extending real deadlines. This is not stable-deployment approval, clean-machine
certification, network-share/multi-instance support, SSO or outbound integration.
The chronological checkpoints below describe older states, not pending
implementation of the now-completed search/form/SQLite work.

## Coordinated Development - 2026-11-09

The user requested consolidating all discussed/pending work and coordinating its
development. The authoritative sequence is [ROADMAP.md](docs/ROADMAP.md), with
individual scope/status in [IMPROVEMENTS.md](docs/IMPROVEMENTS.md): close IMP-003
Wireless/Cabled delivery, then IMP-001 search visibility and IMP-004 field-name/
dynamic-form UX, investigate existing reliability issues, then isolated SQLite
architecture/migration/pilot and explicit cutover gates. No live database change
is authorized by merely recording the plan; JSON remains active.

The proposed form combines device classification and actual check definitions,
not type names alone. Network target/Open website link/URL to monitor naming and
Shortcuts grouping remain queued, not shipped in rc.7. Existing data/checks must
not be silently erased; Workstation protection, custom types and current API/JSON
compatibility remain required. Reliability failures are not assumed fixed by
successful reruns or by choosing SQLite. See roadmap stages for acceptance gates.

## Peripheral Link Type And Portable rc.7 - 2026-11-09

Implemented optional per-printer/scanner `linkType`: unrecorded, wireless or
cabled. The new Link type select is independent from USB/Network/Other; legacy,
null and blank values remain unknown. Network address behavior is unchanged.
Each physical assignment retains its own value through normal/Advanced/copy/
bulk/profile/JSON flows. Configuration/Dashboard/Workstations details show the
recorded link; inventory-pending filters and monitoring/history are unchanged.
The model selector spans a full row, with Connection and Link type adjacent on
desktop and stacked on mobile. No migration or operational inventory edit.

Release solution build passed with zero warnings/errors. All 28 new contract
tests and eight focused browser cases passed. Only the verified source service
was restarted for rebuilding (old PID 7488, current PID 21688 on port 5000).
Original local JSON hashes were recorded; user monitoring/configuration activity
continued during this task, so do not revert operator changes to match a snapshot.

Answered the user's HTTP setup questions: checks are under Add/Edit Device >
Checks > HTTP / HTTPS; Website URL is a shortcut only. Their screenshot showed
HTTP 200 with expected-text mismatch and Ping using a full URL. Recommended
HTTP-only with expected status 200, optional text blank and Full Check; no real
monitoring or device/configuration changes were performed by the agent.

Full isolated .NET regression passed all 311 cases (33 unit, 7 integration,
271 contract) with TRX/coverage. Full browser regression passed all 126 cases
(63 desktop, 63 mobile), without failures/skips/retries. Desktop/mobile captures
of printer/scanner link controls were reviewed: full-width model, adjacent
Connection/Link type on desktop, mobile stacking and no text/control overlap.
All 49 packaging guards passed on both shells after adding the roadmap. JavaScript
syntax, 232 local links across 47 Markdown documents and Git whitespace passed.
Recorded historical baseline: six folders (2385 files), 20 archive/checksum files.

Generated and validated Windows x64 self-contained candidate `0.8.0-rc.7`, with
Wireless/Cabled and the coordinated plan. Delivered immutable outputs:

- Folder: `artifacts/portable/NetWatch-Lite-v0.8.0-rc.7-win-x64/`.
- ZIP: `artifacts/packages/NetWatch-Lite-v0.8.0-rc.7-win-x64.zip`.
- SHA-256: the adjacent `.zip.sha256` sidecar.
- ZIP bytes: 46181874.
- SHA-256: `6c8b9d2e41eca0f8ed90c5003d1b21ea378f32ab54b8dc98232f5f3d54b09079`.

Windows PowerShell 5.1 generated/validated the exact ZIP; PowerShell 7 retested
the final ZIP, and PowerShell 5.1 retested the final folder through a copy.
Each passed native startup, 17 read-only routes, four negative cases, neutral
first-run data and unchanged package bytes. All 403 package files matched policy/
manifests; all 66 public files matched build-time source bytes. No operational
inventory or private data was packaged. All 2385 files across six older portable
folders and all 20 historical ZIP/checksum files retained hashes. Repeating rc.7
was rejected without altering its outputs. Evidence under artifacts/verification/:

- Build-time ZIP: `3d96cacaf1b84f78b87cc4cd704f5f7b/result.json`.
- Final ZIP / PowerShell 7: `8cdd9953920d4f12aefc7bb0b596d1ce/result.json`.
- Final folder / PowerShell 5.1: `3c516bf70aff4608b959d588fb0fb4bc/result.json`.
- Preservation/content/SHA: `rc7-handoff-a3d8909a2f6d41b9abc64423513cd064/result.json`.

The local updated source service remains on port 5000 (PID 21688). Artifacts
remain ignored and were not uploaded; metadata records sourceDirty: true for
this untagged candidate. Repository handoff docs do not change the archive's
build-time snapshot. IMP-003/stage 0 is complete as a local test candidate;
IMP-001/IMP-002/IMP-004 remain queued and storage remains JSON. Evidence/limits:
[peripheral link validation](docs/VALIDATION_PERIPHERAL_LINKS_2026-11-09.md).

Final read-only handoff checks passed for 11 app/docs/API routes (HTTP 200),
the ZIP/checksum and sole port-5000 listener. No publisher lock, staging entry
or test app remained. Receipt: `artifacts/verification/rc7-handoff-a3d8909a2f6d41b9abc64423513cd064/final-state.json`.
Of 15 original local JSON fingerprints, four changed while the operator was
using the service; none was restored. No agent monitoring request was made.
The final documentation recheck passed 233 local links across 47 Markdown
documents; the live app and roadmap both returned HTTP 200 after handoff edits.

Next: Configuration search visibility, then incremental form/field-name UX as
specified in the roadmap; investigate existing reliability issues before stable
release/cutover. SQLite requires isolated design/migration/pilot evidence and
explicit operational cutover selection. No silent live-data migration.

## Local Service Restart - 2026-11-09

Restarted the shared source service at the user's request. Verified the old
port-5000 listener was this checkout (PID 26844), stopped only that process,
rebuilt NetWatch.csproj in Release with zero warnings/errors and started a new
hidden dotnet process (PID 7488) with content root C:\Projects\netwatch-lite.
The old process is no longer running. Six read-only app/docs/API routes returned
HTTP 200; current markup/scripts and API include Location before Notes. All 14
local JSON hashes matched the pre-restart snapshot. No monitoring was requested,
code changed, data migrated or portable regenerated. Application regression
tests were not rerun for this operational restart.

The previous instance already served Location/Notes. A full browser refresh may
be required for an existing tab. IMP-001 (search expansion) and IMP-002 (SQLite)
remain pending; restarting does not implement backlog items. Logs are ignored at
`artifacts/verification/service-restart-20261109-e952775d16bc42cca527a0ec736e902d/`.

## Improvement Backlog - 2026-11-09

Recorded user report IMP-001: Configuration search can find a workstation while
its parent groups stay collapsed, hiding the result. Requested improvement:
expand matching Facility/category groups to reveal found devices immediately.
See the [improvement backlog](docs/IMPROVEMENTS.md) for scope and proposed
acceptance checks. Status is pending, not implemented or independently reproduced.

Recorded IMP-002 at the user's request: introduce SQLite for local persistence
with safe JSON-data migration, backup/rollback, portable compatibility and retained
JSON import/export. This is a backlog entry only; no schema, dependency or database
has been created. JSON remains active under ADR 0001 until a documented cutover
is implemented. See the same backlog for proposed acceptance checks.

This is a documentation-only handoff, as requested. No application behavior,
operational data, service process or portable artifact was changed. The public
documentation allowlist includes the backlog for future builds so its index link
will remain valid. No application regression suite was rerun for this note.


## Device Location And Portable rc.6 - 2026-11-08

Implemented optional `location` immediately before Notes in the device editor
for floor/office/desk. Single-line, max 200 UTF-16 code units before trimming,
no control characters or Unicode line/paragraph separators. Facility remains
the monitoring site/group. Existing Notes is never parsed/moved; legacy files
need no migration. Normal/Advanced/copy, unrelated Bulk Edit and JSON/profile
workflows retain Location, Notes and Facility. Configuration/Dashboard display
escaped location text and search it before/after checks. Location does not enter
monitoring results/history or report rows and is not geolocation.

Release solution build passed with zero warnings/errors; all 34 new contract
cases and eight focused browser cases passed, without failures or skips. Only
the verified old development process was stopped for rebuilding its locked DLL;
the updated service is back on port 5000 (PID 26844). No operational inventory
was edited or checked. Runtime JSON hashes were recorded before restarting.

Final isolated regression passed all 283 .NET tests (33 unit, 7 integration,
243 contract) with TRX/coverage, and the full browser run passed all 118 cases
(59 desktop, 59 mobile), with no skips or automatic browser retries. The initial
concurrent .NET run had 281/283 passes: a Notes save returned HTTP 500 without
captured response detail, and a 200 ms slow-body check timed out before recording
the expected status code. The complete isolated rerun and three focused repeats
(five cases each, 15 passes) did not reproduce them. Added response-body failure
diagnostics to the Notes test only; no production persistence/HTTP behavior was
changed. Original TRX/coverage remains under TestResults. These intermittent failures
are not resolved by adding Location; investigate before stable deployment.

All 49 packaging guards passed on both shells. JavaScript syntax, 211 local links
across 44 Markdown files, Git whitespace and seven read-only service routes
passed. All 14 local JSON hashes matched the pre-restart snapshot. Visual review
at 1440x1000 and 390x844 confirmed ordering, wrapping, modal bounds and unchanged
aligned actions using synthetic data; captures are under test-results/.
Historical hashes cover five prior folders (1985 files) and 18 ZIP/checksum files.

Generated and validated Windows x64 self-contained candidate `0.8.0-rc.6` with
Location before Notes, plus all prior Reports/Command features. Delivered:

- Folder: `artifacts/portable/NetWatch-Lite-v0.8.0-rc.6-win-x64/`.
- ZIP: `artifacts/packages/NetWatch-Lite-v0.8.0-rc.6-win-x64.zip`.
- SHA-256: the adjacent `.zip.sha256` sidecar.
- ZIP bytes: 46167057.
- SHA-256: `d2357af8aa3f27fb498b904d02f278c0c525675f0318f19b4860dd7fcc711f7a`.

Windows PowerShell 5.1 generated/validated the exact ZIP; PowerShell 7 retested
the final ZIP and PowerShell 5.1 retested the final folder through a disposable
copy. Each passed native startup, 17 read-only HTTP routes, four negative cases,
neutral first-run data and unchanged bytes. All 400 package files matched policy/
manifests; all 63 public files matched build-time source bytes, with Location,
Notes, Reports and Command markers present. No private data was packaged.
Before/after hashes matched for all 1985 files in five previous portable folders
and all 18 old ZIP/checksum files, including eight legacy archives. Repeating
rc.6 was rejected without altering its folder/ZIP/checksum. Evidence under
`artifacts/verification/`:

- Build-time ZIP: `bd96c71c01bf4d3d97e2053f7e02c5bf/result.json`.
- Final ZIP / PowerShell 7: `18bbd7c1d067478a93392992b4d996c5/result.json`.
- Final folder / PowerShell 5.1: `f400163ecc0e4339b66aa4eb3e307481/result.json`.
- Preservation/content/SHA: `rc6-handoff-1c98d4ac6a8949c6a041e8519dead569/result.json`.

Artifacts are Git-ignored, not uploaded; metadata records sourceDirty: true for
this untagged local candidate. Final repository evidence does not modify the
immutable artifact's build-time documentation. Normal source service remains
on port 5000 (PID 26844). Use a new deployment folder, not an archived folder.
Final handoff verified eight read-only routes (all 200), Location ordering/model,
unchanged ZIP/manifest/SHA, 211 local links across 44 documents and unchanged
hashes for all 14 local JSON files. No publisher lock, staging entry or disposable
test application remained. Final state:
`artifacts/verification/rc6-handoff-1c98d4ac6a8949c6a041e8519dead569/final-state.json`.
Evidence and remaining deployment gates:
[Location validation](docs/VALIDATION_DEVICE_LOCATION_2026-11-08.md).

Next: operator/other-PC acceptance, investigate the initial Notes-save/HTTP
intermittencies and earlier Windows history-replacement incident, then complete
all thirteen deployment gates with evidence or approved exceptions. RC package
validation is not stable-deployment approval; all historical outputs stay immutable.

## Device Notes And Portable rc.5 - 2026-11-08

Implemented optional `notes` on every device type for physical location, assigned
user/team or other observations. Notes is multiline, max 2000 UTF-16 code units,
trimmed outside, with CR/LF/tab allowed and other controls rejected before writes.
Old files need no migration. Add/Edit/Advanced/copy/import/export/profile flows
and unrelated bulk changes preserve it. Configuration/Dashboard offer escaped,
keyboard-operable disclosures and text search; monitoring results/history do not
contain it. No user identity verification or automatic location discovery exists.

Release build passed with zero warnings/errors. All 25 new contract tests and
eight focused browser cases passed. Initial browser assertions incorrectly
assumed null fields in JSON exports and the generic full-run completion label;
they now support optional omission and named single-device messages. Initial
evidence is retained under
`artifacts/verification/notes-focused-initial-72034ca163394d9f9d33e845927396bb/`.
An initial build was blocked by the known running service's DLL; only that
verified process was stopped, the solution rebuilt and the service restarted
on port 5000 (PID 22204). No operational inventory was edited or checked.

Full regression passed: all 249 .NET tests (33 unit, 7 integration, 209 contract)
with TRX/coverage, and all 110 browser cases (55 desktop, 55 mobile), without
failures/skips/retries. All 49 packaging guards passed on both Windows PowerShell
5.1 and PowerShell 7. JavaScript syntax, 204 local links across 43 Markdown files,
Git whitespace and seven read-only service routes passed. All 14 operational
JSON hashes matched the pre-restart snapshot; no inventory migration occurred.

Visual review covered Configuration/Dashboard disclosures and the Notes editor
at 1440x1000 and 390x844. Two extra geometry cases passed with separate evidence
under `artifacts/verification/notes-visual-19dce8a4922e422ba034a321747efca4/`,
preserving the full HTML regression report. An intermediate desktop capture
was taken before the modal's opening animation finished; waiting for the public
shown.bs.modal event corrected the test timing, without product changes.
Its evidence remains in `artifacts/verification/notes-visual-4d5e9e5eb79848cf92b349a6cc4c0801/`.

Generated and validated Windows x64 self-contained candidate `0.8.0-rc.5` with
Notes, Reports, Command and all previous changes. Delivered immutable outputs:

- Folder: `artifacts/portable/NetWatch-Lite-v0.8.0-rc.5-win-x64/`.
- ZIP: `artifacts/packages/NetWatch-Lite-v0.8.0-rc.5-win-x64.zip`.
- SHA-256: the adjacent `.zip.sha256` sidecar.
- ZIP bytes: 46160154.
- SHA-256: `8c202e8774cb687dd533150af5e4c5c210ed2bd1ae41fa735c64304991c0b7fc`.

Windows PowerShell 5.1 generated/validated the exact ZIP; PowerShell 7 retested
the final ZIP and PowerShell 5.1 retested the final folder through a copy. Each
passed native startup, 17 read-only HTTP routes, four negative cases, neutral
first-run configuration and immutable-byte checks. All 399 files matched package
policy/manifests and all 62 public source files matched build-time bytes. Notes,
Reports and Command markers were present. No private inventory or notes were
packaged. All 1586 files across four previous portable folders and all 16 old
ZIP/checksum files retained their hashes. Repeating rc.5 was rejected without
altering its folder/ZIP/sidecar. Evidence under `artifacts/verification/`:

- Build-time ZIP: `38377533967d4ffc9bf54a05e395c7d2/result.json`.
- Final ZIP / PowerShell 7: `c43c80f42a964d3080ce5be1830f7172/result.json`.
- Final folder / PowerShell 5.1: `f42f582c1e9a41ba9111d7716be50bb5/result.json`.
- Preservation/content/SHA: `rc5-handoff-4eec6aa218994e6199b431df2b8ff647/result.json`.

Artifacts are Git-ignored and were not uploaded. Metadata records sourceDirty:
true for this untagged local candidate. Final repository evidence does not alter
the immutable artifact's build-time documentation. The normal updated source
service remains on port 5000 (PID 22204). Never run an archived version directly.
Final handoff rechecked eight read-only HTTP routes (all 200), ZIP/manifest/SHA,
204 local links across 43 documents and unchanged hashes for all 14 operational
JSON files. No publisher lock, staging entry or disposable test app remained.
Final state: `artifacts/verification/rc5-handoff-4eec6aa218994e6199b431df2b8ff647/final-state.json`.
Evidence and pending deployment gates:
[Notes validation](docs/VALIDATION_DEVICE_NOTES_2026-11-08.md).

Next: real operator/other-PC acceptance, investigate the earlier Windows history
replacement incident and complete all thirteen deployment gates with evidence
or approved exceptions. Local RC validation is not stable-deployment approval.

## Portable Candidate 0.8.0-rc.4 - 2026-11-08

Generated and validated the new Windows x64 self-contained candidate with the
Reports redesign and all rc.3 features, including copy-only Command. Delivered:

- Folder: `artifacts/portable/NetWatch-Lite-v0.8.0-rc.4-win-x64/`.
- ZIP: `artifacts/packages/NetWatch-Lite-v0.8.0-rc.4-win-x64.zip`.
- SHA-256: the adjacent `.zip.sha256` sidecar.
- ZIP bytes: 46152417.
- SHA-256: `88238b3d2d89e72cfc302ffb398df10d37e6a0097b0832e6e973560f964ae84c`.

Every future portable delivery must include its versioned folder, compressed
ZIP and SHA-256 sidecar; ZIP is the primary file to copy/share. AGENTS and the
portable guide record this standing preference. The existing generator already
enforces all three outputs and required no behavior change.

Fresh source regression passed: Release solution build with zero warnings/errors,
all 224 .NET tests (33 unit, 7 integration, 184 contract) with TRX/coverage and all
102 browser cases (51 desktop, 51 mobile), without failures, skips or retries.
All 49 packaging guards passed on both Windows PowerShell 5.1 and PowerShell 7.
JavaScript/PowerShell syntax, 197 local Markdown links across 42 documents and
Git whitespace checks passed. Eight read-only app/docs/config routes returned
HTTP 200 on the existing service (PID 29316).

Windows PowerShell 5.1 generated and validated the exact ZIP; PowerShell 7
revalidated the final ZIP and PowerShell 5.1 tested the final folder through a
disposable copy. Each passed native startup, 17 read-only HTTP routes, four
negative cases, neutral first-run files and immutable-byte checks. All 398
package files matched policy/manifests; all 61 public files matched build-time
source hashes, including Reports and Command. No private operational data or
external Excel/JSON inputs were included/imported.

Before/after hashes matched for all 1188 files in rc.1/rc.2/rc.3 folders and all
14 historical ZIP/checksum files (including eight legacy archives). Repeating
rc.4 publishing was rejected without changing its folder, ZIP or checksum.
Evidence under `artifacts/verification/`:

- Build-time ZIP: `d0caa10a96124b7187434de02dfe71d8/result.json`.
- Final ZIP / PowerShell 7: `e6eb4a7cf8434bdabcfb31c0dbdd13b2/result.json`.
- Final folder / PowerShell 5.1: `6ca762beedc8466ca45519beaf6e06bf/result.json`.
- Preservation/content/SHA audit: `rc4-handoff-a2990d29121343e4a651ddd95195c221/result.json`.

The normal source service remains on http://localhost:5000/ (PID 29316 at this
checkpoint); no historical portable was run directly. Generated artifacts are
Git-ignored and were not uploaded. Metadata records sourceDirty: true for this
untagged local candidate. Post-generation repository documentation/evidence
does not modify the immutable build-time folder/ZIP. See
[portable validation](docs/VALIDATION_PORTABLE_2026-11-08.md).

Final handoff rechecked the unchanged ZIP/checksum and package manifest, 196
local links across 42 Markdown documents and nine read-only service routes
(HTTP 200). No publisher lock, staging entry or disposable test app remains.

Next: operator acceptance, investigate the earlier Windows history-file
replacement incident and complete all thirteen deployment gates with evidence
or approved exceptions. Candidate validation is not stable-deployment approval.
Any subsequent build requires a new version, never overwriting this one.

## Reports Redesign - 2026-11-07

Implemented Summary/Runs/Devices, shared historical group/Facility/category/date
filters and chips, unique-identity versus evaluation metrics and a measured
Healthy ratio (not uptime). Detail/drilldown uses recorded checks only, with
mobile flat rows/order controls, keyboard and back handling. CSV/JSON exports
contain all matches; deletion is confirmed, non-optimistic and disabled for
ambiguous legacy IDs. Older records remain readable without a schema migration.
No operational inventory/history was edited and no real-inventory checks were
performed; monitoring tests used isolated fixtures.

Release build passed without warnings/errors and all 224 .NET tests (33 unit,
7 integration, 184 contract) passed with TRX/coverage. Final browser regression
passed all 102 cases (51 desktop, 51 mobile), with zero failures, flaky cases,
skips or automatic retries. Twenty Reports cases cover metrics/identity,
profiles, periods, drilldown, escaping, legacy/duplicate IDs, malformed/failed/
stale reads, CSV/JSON, sorting/pagination and deletion/navigation.

Intermediate checks found early detail Escape and hidden mobile sorting issues;
both were corrected. One mobile stale-read test needed its navigation drawer
opened before clicking. An 18-case focused run then passed before the additional
legacy coverage and final full regression. Visual captures were reviewed at
1440x1000 and 390x844 with no page overflow. Two detail cases were additionally
rerun after waiting for opening completion, asserting panel bounds and preserving
the full HTML regression report. Evidence: test-results/, playwright-report/,
TestResults/ and artifacts/verification/reports-visual-e8f9f86ccbf5465b99ba368cfda8980d/.

All 49 packaging guards passed after allowlisting the public report guide.
JavaScript syntax, 192 local Markdown links across 41 documents and whitespace
checks passed. Seven read-only app/docs/config routes returned HTTP 200; the
shared service remains on port 5000 (PID 29316 at this checkpoint), serving the
current Reports markup, scripts/styles and guide. No restart was necessary.

Canonical guide: [Reports](docs/REPORTS.md), linked in the documentation map and
future portable allowlist. Existing rc.3 and older artifacts must remain unchanged;
at this historical checkpoint the redesign was not yet in a new portable; see
the rc.4 checkpoint above for subsequent delivery. No GitHub publication is requested.
Trends/comparison, print/PDF and all remaining deployment gates stay separate.
The earlier Windows history-file replacement incident remains open; this UI
work does not change backend persistence or certify full resilience.

## Portable Candidate 0.8.0-rc.3 - 2026-11-07

Generated and validated Windows x64 self-contained candidate 0.8.0-rc.3 with
the latest Dashboard/Command/Configuration changes and a device deletion
dialog race fix. Delivered immutable outputs:

- Folder: `artifacts/portable/NetWatch-Lite-v0.8.0-rc.3-win-x64/`
- ZIP: `artifacts/packages/NetWatch-Lite-v0.8.0-rc.3-win-x64.zip`
- SHA-256: the adjacent `.zip.sha256` sidecar.
- ZIP bytes: 46133487.
- SHA-256: `3d73a118bb4c88fd78aee7d74b62aa9f3535e331216bae6cbd84f567f002c7cb`.

Release solution build passed with zero warnings/errors. All 224 .NET tests
(33 unit, 7 integration, 184 contract) passed with TRX/coverage evidence; final
browser regression passed all 82 cases (41 desktop, 41 mobile), without skips
or automatic retries. An initial browser run had 79/80 passes because Delete
could close during Bootstrap's opening transition and leave an empty dialog.
A deterministic regression failed before the fix; the existing close/focus
helper now handles confirmation and cancellation, and both viewports passed.
Initial failure/trace evidence is retained under
`artifacts/verification/rc3-e2e-initial-2b26c9a819ad4048addfe870d03038ff/`.

All 49 packaging guards passed on Windows PowerShell 5.1 and PowerShell 7.
The exact ZIP passed native startup on both shells; the final folder also
passed via a disposable copy. Each run passed 17 HTTP routes, four negative
checks, neutral first-run configuration and unchanged package-byte checks.
All 396 package files passed policy/manifests, with all 59 public source files
matching build-time bytes. No runtime inventory, private exports, local themes,
history, backups or C:\Tmp inputs were included or imported.

The audit verified unchanged bytes for 792 files across rc.1/rc.2 folders, their
ZIPs/checksums and all eight legacy archives. Re-generating rc.3 was rejected
without changing its outputs. Evidence under `artifacts/verification/`:

- Build-time ZIP: `3a082a1e935b4c83a75d4fe35b90e87d/result.json`.
- Final ZIP / PowerShell 7: `6c4bb506955d4e18b0d57b784c879f00/result.json`.
- Final folder / PowerShell 5.1: `eb6b6c506f3244899c033fa1e88e3150/result.json`.
- Preservation/content/SHA audit: `rc3-handoff-217cfb31ed5b4999ad8fcdaee70b7f16/result.json`.

The normal development service remains on http://localhost:5000/ (PID 29316 at
this checkpoint), serving the dialog fix without a restart. Packaged executables
were tested only in disposable copies on ephemeral ports. No operational
inventory was edited or checked by this task. Repository handoff/evidence
updates after generation do not alter the archive's build-time documentation.
No new GitHub publication/tag was made; artifacts remain ignored.
Eight final app/docs/config smoke routes returned HTTP 200. JavaScript/PowerShell
syntax, 182 local Markdown links across 40 documents and Git whitespace checks
passed. No isolated test app, publisher lock or staging directory remains.
The release metadata records sourceDirty: true for this untagged local candidate.

Next: real operator acceptance/clipboard permissions, investigate the earlier
Windows history-file replacement incident and complete all thirteen deployment
gates with evidence or approved exceptions. Passing candidate validation does
not resolve that incident or grant stable-deployment approval.

## Configuration Presentation - 2026-11-07

Default facility/category bands now use neutral grays in normal Configuration
and Bulk Edit. Existing built-in theme normalization refreshes those defaults;
custom palettes and their active selection remain unchanged. Device actions
are three fixed-size icon buttons with hover titles/accessible names, kept on
one row in a reserved column. Narrow screens scroll the table, not the page.
Existing device edit/copy/delete handlers and collapse behavior are unchanged.

Final Release solution build passed with zero warnings/errors. The final full
regression passed 224 .NET tests (33 unit, 7 integration, 184 contract), with
coverage collected, and 80 Chromium cases (40 desktop, 40 mobile), without skips
or browser retries. The two new theme contracts and four layout cases cover
geometry/hit tests, collapse, custom palettes/active theme and unchanged inventory.
Synthetic desktop/mobile captures were visually reviewed: gray bands, complete
headers and separated actions, with no page overflow. JavaScript syntax,
180 local Markdown links across 40 documents and whitespace checks passed.

Two incidents are retained, not hidden by retests. The first compile was blocked
by the owned running DLL; stopping that service resolved it before a clean build.
One full .NET run failed in CancelledWaiter_DoesNotReleaseAnotherExecutionsLock
with a Windows File.Replace IOException while saving history. Three unchanged
isolated runs and the next full suite passed. No external file holder/root cause
was established and no broad persistence change was made for this visual task.
Track recurrence and investigate it before deployment; passing retests do not
close the complete concurrency/resilience gate.

The updated normal service is running on http://localhost:5000/ (PID 29316 at
this checkpoint). Eight app/docs/config smoke routes returned HTTP 200; served
HTML/JS/CSS contain the current layout/actions. GET /api/themes confirmed the
active default's neutral headers through existing theme normalization. No
operational inventory edits or monitoring executions were made by this task.
Historical ZIPs are unchanged; no new portable or GitHub publication was made.
Next: real operator acceptance, clipboard permissions in the target environment,
file-lock follow-up and all thirteen deployment gates with evidence/approved
exceptions before deployment. Remote publication remains separate work.

## Dashboard Search And Device Actions - 2026-11-07

Implemented searchable enabled inventory before execution and after partial
runs. Pending rows remain separate from latestResults/history and show neutral
Not checked states, including ping/TCP/HTTP. Facility tabs stay available for
untested sites. Search expands matching groups; every device can run singly,
including healthy rows. Clear filters resets facility/group/search/status
without removing measured results/history. Row runs bind category as well as
name/address/facility. Entire facility/category bands toggle through the existing
Bootstrap arrow, excluding interactive controls and retaining keyboard support.
Offline/Problems exclude untested rows; availability uses measured devices only.
Summary counts retain facility scope independently of text/status filters.

Confirmed existing execution contract: Run Group combines category AND selected
facility; All Facilities runs that category across the active support group.
Text search never changes execution scope. Optional device `command` is now
validated, normalized and preserved by current configuration workflows. It is
inert clipboard text, not executable code; no shell/launch endpoint was added
and DeviceResult/history omit it. The editor places it beside Website URL;
dashboard copy feedback handles normal/fallback/failure paths. No operational
inventory change; external C:\Tmp preparation remains separate. Failed dashboard
reads clear/disable stale previews and SPA retry restores them.

Final validation passed 222 .NET tests (33 unit, 7 integration, 182 contract) and
76 Chromium cases (38 desktop, 38 mobile), without failures/skips/retries.
Release build had zero warnings/errors and coverage was collected. Clipboard
adapters were stubbed; no stored command was executed or real OS clipboard read.
178 local Markdown links across 40 documents and JavaScript/whitespace checks
passed. Eight read-only app/docs/config routes returned HTTP 200 on the normal
service (PID 17236 at that checkpoint); served HTML/JS contained current actions.
Historical rc.1/rc.2 ZIPs are unchanged and predate these
changes; use a new version if packaging them. Full deployment gates and
remote publication remain separate work.

## Versioned Portable Generator - 2026-11-07

Implemented scripts for Windows x64 self-contained folder/ZIP/SHA-256 history
under artifacts/portable and artifacts/packages. Existing destinations and
redirected directories are rejected; an exclusive publisher lock protects
concurrent runs. Builds are isolated, packaged content uses an explicit public
allowlist and generated neutral settings/sample data, never operational files.
Exact-ZIP verification runs the native executable in a disposable extraction on
an ephemeral port with sanitized environment, without monitoring executions.

Release build passed with zero warnings/errors. All 194 .NET tests (33 unit,
7 integration, 154 contract) and 58 browser cases (29 desktop, 29 mobile) passed
without failures/skips. All 49 packaging guards passed on PowerShell 5.1 and 7.
Candidate 0.8.0-rc.1 passed exact-ZIP startup/content checks on both shells:
17 HTTP routes, four corruption/private-file cases, safe first-run files,
unchanged immutable bytes and no monitoring execution. Re-generating its version
was rejected, preserving its three outputs and all eight legacy ZIP hashes.

The normal service is active at http://localhost:5000/ (PID 10744 at this
checkpoint); nine read-only app/docs/config smoke routes returned HTTP 200.
Final candidate 0.8.0-rc.2 was generated end to end with Windows PowerShell 5.1,
including the compatibility fixes and updated documentation. Its exact ZIP
passed the same 17 routes/four negative cases and first-run/hash checks. Both
version folders, ZIPs and SHA-256 sidecars remain valid; rc.2 is the handoff
candidate. Its owned staging GUID directory was safely removed after success.
The two earlier build-stage directories were reviewed and cleaned separately;
historical versions and all verification evidence are retained.

PowerShell/JavaScript syntax, 177 local Markdown links across 40 documents and
git whitespace checks passed. Generated artifacts are Git-ignored. CI now runs
packaging guards and builds/verifies an isolated candidate; remote CI has not
been executed or published in this local task. No GitHub release/tag was made.
See [portable guide](docs/PORTABLE.md) and
[validation](docs/VALIDATION_PORTABLE_2026-11-07.md).
No C:\Tmp Excel/JSON preparation is imported or packaged. Earlier releases/
archives are retained. Remote publication and the thirteen deployment gates
remain separate; a portable build is not stable-deployment approval.

## Unified Administration - 2026-11-07

Implemented full-width Support Groups/Themes lists with search/status filters,
region grouping, palette swatches, per-row actions and separate active/selected
states. Support Group menus open the intended configuration with explicit
activation. IDs, profile files, inventory schemas and API paths are unchanged.

`wwwroot/management.js` now owns those controllers plus shared confirmation and
transition-safe modal focus. Device Types/Peripherals retain their direct
actions and validation, sharing confirmations, responsive headings/rows and
focus behavior. Configuration/Bulk Edit, Dashboard and Reports keep their
specialized workflows. Failed reads clear stale lists and disable mutation,
without fabricating editable defaults.

Theme color drafts/previews are separate from the confirmed library. Naming
operations save immediately; Save Colors persists color edits. Activation and
deletion apply only after server success. Failed saves retain confirmed state
and drafts. Selection, reload, close and navigation/browser back confirm dirty
draft discard. Dropdown instances are disposed before list re-rendering.

Final validation passed all 194 .NET tests (33 unit, 7 integration, 154 contract)
and 58 Chromium browser cases (29 desktop, 29 mobile), with no failures/skips.
Release build has zero warnings/errors. Coverage includes preservation, errors,
protected deletion, keyboard menus, dirty navigation and modal opening/closing
races. Synthetic desktop/mobile screenshots were visually reviewed with no
page overflow in the master lists. JavaScript syntax and local documentation
links/whitespace checks passed. A fresh publish includes the new controller,
guides and ADR, excluding private runtime files, dependencies and test evidence.

The normal service is active at http://localhost:5000/ (PID 34484 at this
checkpoint). Dashboard, Support Groups, Themes, Device Types, Peripherals,
Configuration, docs, new scripts/guides and config/regions/themes APIs returned
HTTP 200. No operational inventory was edited; isolated browser app processes
remaining: zero. Theme naming operations now persist immediately; color edits
still require Save Colors. See [administration](docs/ADMINISTRATION.md),
[ADR 0005](docs/adr/0005-consistent-management-lists.md) and
[validation](docs/VALIDATION_MANAGEMENT_2026-11-07.md). The earlier Support Groups
proposal is now delivered. Remaining work: real operator acceptance, all thirteen
deployment gates with evidence or approved exceptions, and remote publication
when requested. Full-document theme/configuration writes still need coordinated
editing. The following sections are earlier checkpoints, not current service PIDs.

## Device Type Catalog - 2026-11-07

Implemented `/device-types` with profile-scoped custom classification CRUD,
search/status filters, device counts including disabled records, and dynamic
Device Type options in the device editor. All five legacy keys/names are
protected; only `workstation` enables recorded peripheral inventory. Referenced
types cannot be deleted. Absent legacy catalogs receive defaults without a
migration write; catalogs/keys survive row/bulk saves, device/profile copies
and configuration import/export.

New GET/POST `/api/device-types` uses captured profile identity/path, an opaque
catalog revision and fresh inventory under the existing repository write lock.
It mutates only the catalog, preventing stale editor copies from replacing
device/settings/peripheral changes. Stale profile/catalog edits return 409,
while invalid/reference-breaking catalogs return 400. Full config endpoints
retain their existing complete-replacement semantics.

Final validation passed 194 .NET tests (33 unit, 7 integration, 154 contract)
and 38 Chromium browser cases (19 desktop, 19 mobile), without failures/skips.
Release build has zero warnings/errors. New/affected JavaScript syntax checks,
142 local Markdown file links across 35 documents and git diff whitespace checks
passed. Desktop/mobile catalog screenshots were visually reviewed; page-width
checks found no horizontal overflow. A fresh publish includes the new script,
guides/ADR/proposal and excludes private runtime/backups, dependencies and test
evidence. Its owned temporary publish directory was removed.

The normal service is active on port 5000 (PID 34140 at this checkpoint).
Dashboard, Device Types, Configuration, Support Groups, docs shell, type guide/
validation/proposal, type script and config/catalog APIs returned HTTP 200.
The catalog API confirms Workstation protection. No operational inventory
was edited; isolated browser app processes remaining: zero.
See [type guide](docs/DEVICE_TYPES.md),
[ADR 0004](docs/adr/0004-profile-device-types.md) and
[validation](docs/VALIDATION_DEVICE_TYPES_2026-11-07.md).

Support Groups was reviewed from the provided screenshot/code. Its proposed
full-width region-grouped list, row actions, explicit active state and responsive
layout are documented [here](docs/SUPPORT_GROUPS_UX_PROPOSAL.md); this redesign
is a recommendation, not implemented. Complete deployment gates, real operator
acceptance and remote publication remain separate work. The modal regression
is synchronized with Bootstrap's completed opening transition before filling
fields; no arbitrary delay/retry was added.

The following sections preserve earlier checkpoints.

## HTTP And HTTPS Application Checks - 2026-11-06

Implemented optional `type: http` checks for HTTP/HTTPS URLs with per-attempt
100-60000 ms timeout (default 10000), exact expected status (default 200),
optional literal case-sensitive text, actual code, duration and failure messages.
Full/SSE/Auto Refresh reuse the existing retry/concurrency/health/history flows;
Ping Only skips HTTP. Configuration supports these fields through normal edits,
copy, bulk save, profile copies and import/export. Old ping/TCP data is compatible.

The named pooled HttpClient uses strict TLS, no automatic redirects/cookies,
a linked deadline through required body reads and a 1 MiB decompressed body
limit. URL credentials/fragments/unsupported schemes are rejected before save.
Result/history URLs omit queries and no response bodies/raw exceptions are
stored. Keep this unauthenticated outbound checker behind trusted access and
network destination controls. No browser login/JavaScript journey or external
alert delivery is implied. See [HTTP guide](docs/HTTP_CHECKS.md) and
[ADR 0003](docs/adr/0003-bounded-http-checks.md).

Final validation passed 139 .NET tests (30 unit, 7 integration, 102 contract)
and 30 desktop/mobile Chromium workflows without failures/skips. Release build
has zero warnings/errors. JavaScript checks, 120 local Markdown file links and
git diff whitespace checks passed. A fresh publish includes HTTP docs/assets
and excludes private runtime files, backups, dependencies and test evidence;
the check caught and fixed inclusion of Playwright's `.last-run.json`.
See [HTTP validation](docs/VALIDATION_HTTP_2026-11-06.md).

The normal project service is running at http://localhost:5000/ (PID 36056 at
this checkpoint). Dashboard, Configuration, Reports, documentation shell,
HTTP guide/validation record, app script and configuration API returned HTTP
200. Operational inventory was not modified. Temporary test/publish servers
and owned publish directories were cleaned; only the shared service remains.
Real application operator acceptance, complete deployment gates and remote
publication remain separate work. The following sections are earlier checkpoints.

## Workstation Inventory Queries - 2026-11-06

Implemented `/workstations` as a read-only view of explicit workstation records
in the active support group. It combines search/facility/model/pending filters,
distinguishes None from Not recorded, includes disabled monitoring records,
shows assignment details and paginates the result. Catalog model names open
reverse lookup with one row per configured workstation and separate unit counts.
Filter/paging URLs survive reload/back; missing models and failed loads never
show an unfiltered or stale inventory fallback. No storage/API schema changed.

Validation baseline: 85 .NET tests and 24 Chromium desktop/mobile workflows.
See [the inventory guide](docs/PERIPHERALS.md#workstation-inventory-view) and
[validation record](docs/VALIDATION_WORKSTATIONS_2026-11-06.md). This supplements
the existing release gates; remote publication is not part of this checkpoint.

Release build passed with zero warnings/errors. All 85 .NET and 24 browser
tests passed without skips. A fresh publish contains the new script/docs and
no private backups or test dependencies. The normal project service is active
on port 5000 (PID 34184 at this checkpoint); application, Workstations, catalog,
script, documentation and configuration API routes returned HTTP 200.

The following sections preserve earlier checkpoints.

## Printer And Scanner Inventory - 2026-11-06

Implemented a profile-scoped printer/scanner catalog with manufacturer/model
records at `/peripherals` and optional assignments to explicit workstation
device types. Printer/scanner groups independently record unrecorded, none or
assigned states; assignments carry USB/network/other connection, optional asset
ID/address and notes. Configuration and Dashboard show recorded inventory.

Catalog and assignments share the existing support-group JSON file, atomic
validation/save and import/export/copy behavior. Legacy files need no migration
and categories are not used to infer device type or peripheral absence. In-use
model deletion and malformed references are rejected before persistence.
This is manual inventory, not automatic peripheral discovery/monitoring.

Validation baseline: 85 .NET tests (11 unit, 7 integration, 67 contract) and
16 Chromium desktop/mobile workflows. See [the feature guide](docs/PERIPHERALS.md)
and [validation record](docs/VALIDATION_PERIPHERALS_2026-11-06.md). Deployment
gates and GitHub publication remain separate pending work.

The shared service is running on port 5000 (PID 25208 at this checkpoint).
Application, catalog, configuration, peripheral JavaScript, documentation and
configuration API routes returned HTTP 200. A fresh Release publish includes
the new script/guide and excludes private backups and test dependencies.

The following sections are prior checkpoints.

## Browser Regression And Resilience - 2026-11-06

Added Playwright desktop/mobile workflows and deterministic tests for busy
execution handling, cancellation, simulated stream disconnects, concurrent row
updates, concurrent history appends, fresh-host restart and backup restore.
The new history test reproduced duplicate IDs for equal completion timestamps;
new run IDs now include a GUID suffix. Stored legacy IDs remain supported.

Current baseline: 45 .NET tests (11 unit, 7 integration, 27 contract) and
10 Chromium browser workflows across 1440px desktop and 390px mobile. See
[validation evidence](docs/VALIDATION_2026-11-06.md) and
[test instructions](docs/TESTING.md). The new browser CI job is configured;
remote execution/publication remains pending.

Browser instances have separate temporary content/data roots and dynamically
assigned loopback ports. No operational inventory is used. The .NET and npm
test results supplement, rather than complete, the thirteen deployment gates.

The normal project service was restored on port 5000 (PID 29464 at this
checkpoint). `/`, `/docs/` and `/api/config` returned HTTP 200. A fresh publish
contained no test dependencies, test directories, npm manifests or backup JSON.

The following sections preserve earlier checkpoints and their dated evidence.

## Functional Validation - 2026-11-05

Release build passed with zero warnings/errors; all 25 tests passed after
selecting the installed .NET 8 runtime. Synthetic loopback monitoring, SSE,
history and desktop/mobile page smoke checks passed. See the
[validation report](docs/VALIDATION_2026-11-05.md) for evidence and limits.

The four review findings have been addressed: null device/check entries are
rejected with HTTP 400 on save/import; all six JSON repositories now use
temporary sibling files and atomic replacement with local backups; unexpected
errors return safe problem responses with a trace identifier; and the local
.NET runtime conflict is documented in the troubleshooting guide.

Post-fix validation: Release build has zero warnings/errors; 36 tests passed
(11 unit, 7 integration, 18 contract), with coverage evidence under TestResults.
Isolated HTTP smoke checks passed for Full/PingOnly monitoring, SSE, history,
configuration rejection, themes, integrations and profile creation/copy.
Temporary publish output includes documentation and excludes backup JSON files.
CI now checks all documentation JavaScript. See the validation report for the
initial findings and their resolution. The shared local service is running on
port 5000 (PID 14776 at this checkpoint); `/`, `/docs/` and `/api/config` were
verified HTTP 200 with the normal project configuration. The isolated test
instance on port 5001 has been stopped.
Mandatory deployment gates and remote publication remain separate pending work.

## Documentation web navigation v1 — local candidate, 2026-10-03

InnovaLogic documentation theme, reading paths and reading controls are implemented. dotnet build --no-restore PASS; browser at 1440 and 390 px PASS. Existing unrelated working-tree changes preserved. See [navigation maintenance and evidence](docs/WEB_NAVIGATION.md). GitHub and server delivery of this revision are pending; earlier deployment status below remains historical evidence.

The baseline below records the 2026-08-01 checkpoint; its dated validation
evidence is historical. The latest review is recorded above.

## Phase

Internal MVP checkpoint / engineering standardization and automated test
foundation.

The repository is on `main` and the current codebase builds successfully. The active product scope is NetWatch Lite as a local/internal network monitoring dashboard with editable JSON profiles, support groups, themes, reports, local history, local error logging, and local integration settings.

## Completed Functionality

- ASP.NET Core .NET 8 web app with static Bootstrap frontend.
- JSON-driven device inventory with ping, TCP and HTTP/HTTPS checks.
- Dashboard summary metrics, facility/category grouping, manual runs, auto refresh toggle, Full Check/Ping Only modes, progressive Server-Sent Events rendering, category-scoped runs, facility-scoped runs, failed-device retry, and device row reruns.
- Configuration page with device CRUD, settings editing, filters, grouped/collapsible tables, import/export, and Bulk Edit workflows.
- Support Groups page for independent region/support-group JSON profiles.
- Themes page with built-in and custom GUI theme templates.
- Reports page backed by local `monitor-history.json`, including filters, sortable/paginated tables, export, and per-execution deletion.
- Error log API backed by local `app-errors.json`.
- Integrations page and local `integrations.json` settings for future inbound inventory and outbound report workflows.
- Public README, developer guide, quality review checklist, internal release checklist, changelog, screenshots, and portable release artifacts.
- Continuity files added: `AGENTS.md` and `CURRENT_STATUS.md`.
- Mandatory pre-deployment quality policy documented across thirteen test
  categories, with evidence or an approved exception required for every gate.
- Canonical documentation structure added for architecture, API, development,
  testing, deployment, operations, security, troubleshooting, and ADRs.
- GitHub contribution templates plus CI and security workflows added.
- Central .NET SDK, package, build, and editor conventions added.
- Initial xUnit test projects added for unit and JSON repository integration
  testing.
- Isolated ASP.NET Core contract tests added for the main page and core local
  API response shapes.
- Standardized browser documentation served at `/docs/`, with visible
  application/documentation return paths, grouped desktop/mobile navigation,
  local search, persistent light/dark theme, section context, and pagination.
- Documentation assets are included in build/publish output and served only
  from the fixed `docs/` root with controlled file types and 404 responses.

## Validation Completed

- Release build completed successfully on 2026-08-01 with 0 warnings and 0
  errors across the application and three test projects.
- `dotnet test` completed successfully on 2026-08-01 with 25 passing tests:
  11 unit, 3 integration, and 11 contract tests, with no failures or skips.
- Cross-platform Cobertura coverage evidence was generated. Coverage is an
  initial baseline and no deployment threshold has been approved yet.
- `node --check wwwroot/app.js` and `node --check docs/app.js` completed
  successfully on 2026-08-01.
- `/`, `/docs/`, documentation CSS, and documentation JavaScript returned the
  expected HTTP responses on port 5000.
- A temporary Release publish check confirmed `docs/index.html`,
  `docs/styles.css`, and `docs/app.js` are present in deployment output.
- Documentation was visually reviewed in Chrome at desktop, dark-theme, and
  emulated 390-pixel mobile widths. Mobile metrics confirmed no horizontal
  overflow; menu, theme, local search, in-page context, and return link behavior
  were exercised in the browser.
- NuGet vulnerability review reported no known vulnerable packages on
  2026-07-29 across the application and all three test projects.
- All local Markdown links resolved and `git diff --check` reported no
  whitespace errors on 2026-08-01.

## Validations Pending

- Manual operational workflow smoke test on `http://localhost:5000`; the
  documentation workflow has been reviewed, but monitoring/configuration flows
  still require release-candidate data and operator review.
- Walk through the release checklist in `docs/DEPLOYMENT.md` before publishing a new release.
- For any UI changes, verify Dashboard, Configuration, Support Groups, Themes, Reports, Integrations, Manual, and About pages at desktop and mobile widths.
- Publish the branch and confirm the first remote GitHub Actions runs for
  `.github/workflows/ci.yml` and `.github/workflows/security.yml`.
- Expand unit, integration, and contract coverage, then implement and execute
  the required property/invariant, mutation, fuzz, end-to-end, regression,
  security, concurrency/resilience, performance/resource, and
  compatibility/deployment suites before deployment.

## Known Future Work

- Authenticated/multistep browser journeys, independent background scheduling
  and external alert delivery are not implemented. HTTP checks validate raw
  anonymous responses, not JavaScript-rendered application workflows.
- Microsoft Entra ID / SSO and role-based access are not implemented.
- Verified operator identity and audit fields in monitor history are planned but inactive.
- External inventory import is not implemented; the Integrations page only stores future settings.
- Outbound report delivery is not implemented; the Integrations page only stores future settings.
- Integration authentication, allowlisting, retry behavior, correlation ids, and failure logging still need design and tests before real external calls are added.
- Initial automated unit and integration coverage is present, but it covers only
  a small portion of the application and has no approved coverage threshold.
- The remaining pre-deployment categories still require projects, tools,
  environments, measurable thresholds, and durable evidence storage.

## Recommended Next Steps

1. Add unit coverage for repository validation and monitoring result
   aggregation.
2. Expand API contracts to configuration writes, imports, themes, and
   Server-Sent Events.
3. Define approved coverage and quality thresholds, then add mutation and fuzz
   tooling.
4. Expand the initial browser/resilience suites and add performance and
   portable deployment suites.
5. Move the production project under `src/NetWatch/` only as a separate,
   dedicated refactor.

## DOC-STD-20261002 — Documentation organization

The [documentation map](docs/README.md) now identifies canonical sources and maintenance rules. Existing implementation milestones and pending acceptance are unchanged. Validation and publication are tracked separately for this documentation-only change.


## Documentation navigation candidate — 2026-10-03

The documentation page includes the InnovaLogic theme, grouped responsive navigation, search, section context, copy controls and image zoom. Only documentation assets are included; unpublished application development stays local. Candidate validation and deployment are tracked separately.
