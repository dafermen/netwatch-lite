# Dashboard Device Type Validation - 2026-11-11

## Scope

The owner authorized a Device Type selector before Category, complete testing,
documentation update and GitHub source/portable publication. This supersedes the
previous publication hold for this delivery only; it does not approve stable
deployment. Candidate version: `0.8.0-rc.13`.

Implementation and operator rules are in [Dashboard filters](DASHBOARD_FILTERS.md).
Type scope is enforced before execution, not as a client-side IP approximation.
Typed results distinguish equal device identities; legacy history is not rewritten.

## Evidence

Private/synthetic evidence root: `artifacts/verification/device-type-filter-20261111/`.

- `focused-net/`: 12 API cases passed across JSON/SQLite, covering type/Facility/
  Category/name/address intersections, unknown/legacy types and global runs.
- `focused-browser/`: initial UI integration evidence. Per-row actions needed
  their classification carried through button data; corrected before final runs.
  Some new selectors also ran against a test publish predating their DOM attributes.
- The first sampled mutation run exposed a coverage gap: other filters masked
  removal of Facility filtering. Isolated type/Facility and type/Category cases
  were added; no production filter was weakened and the surviving mutant was
  retained for the final check. Early strict-selector test failures were corrected
  by identifying the exact named row instead of assuming debounce completion.
- Source rc.13 restart passed with backup/recovery runtime, exact document-byte/
  eight-API comparison and original Data JSON unchanged. Schema 2 is unchanged.
  Receipt: `activation-6ed18eb1528745fa967aaa5706496545/`, source PID 34240 on port 5000.

Final .NET regression passed 373 cases (34 unit, 28 integration, 311 contract).
All 48 focused dashboard browser cases passed on JSON/SQLite and desktop/mobile.
Four monitoring scope/result mutants and six storage mutants were killed against
passing baselines. Mutation receipts: `monitoring-mutations-5444d8c160cc4ca193db56e579fdb4e9/`
and `storage-mutations-6af5e4edc0874cc283412e1eab700661/` under artifacts/verification/.
NuGet application and npm tooling audits found zero known vulnerabilities; both
shells passed 58 package guards. Complete browser regression passed 356 cases
(178 SQLite, 178 JSON), without failures, skips or retries. Machine-readable
reports are `full-sqlite.json` and `full-json.json`; screenshots cover desktop/
mobile, long catalog names and wrapping during scoped execution. Ten JavaScript
files and 296 relative links across 60 Markdown files passed syntax/link checks.
CI uses sequential xUnit collections while retaining explicit concurrency cases;
its browser job has a 20-minute limit for the expanded suite and setup.

The immutable-artifact/original-JSON baseline contains 4922 entries. Live service
verification matched eight operational APIs and five source assets, with rc.13 /
PID 34240 / SQLite schema 2. Native package/SHA/privacy checks and GitHub
publication are pending at this build-time checkpoint. Final receipts must be
recorded without overwriting historical folders or ZIPs. No checks or test writes
target operational inventory.

## Native Portable Receipts

Source commit: `8ceaaf8680ceb73edfa4e8d040654d7108a7fa50`, clean tree. Native
rc.13 includes 423 files/79 public assets; ZIP size is 47472644 bytes and SHA-256
is `8f80303123128e2ab0195eb444ed619efc5379ed17932a20b3abf8c02ea09ad5`.
Generation (PowerShell 5.1), final ZIP (7) and folder-copy (5.1) passed 26 HTTP
routes/eight negative checks, neutral schema-2 startup and unchanged artifact
bytes. Receipts under artifacts/verification/: `49f3783888f64ac3ac96faa9b216595d`,
`c83a1a35eb6d47aa832fd0b79b5ea1df`, `67509f8564ee4a518f1459c7fdc71adc`.

The native EXE also passed four isolated scope cases: two same-name/address
devices remain separated by type/Facility, unknown type matches zero, global
matches all three synthetic devices. Inventory and ZIP stayed unchanged;
receipt: `native-scope-b8b39a01af9d4351800dce8512486950/` under this task's root.
`package-audit.json` confirms 4922 protected files (15 original Data JSON), all
79 build-time source matches, neutral package policy, checksum and no publisher
lock. Archive documentation remains frozen; later delivery receipts do not
rewrite its folder, ZIP or manifest. Source was pushed normally to main and
the new GitHub prerelease draft has matching asset hashes, sizes and source SHA.
These native receipts supersede the pending package checks in the frozen
build-time checkpoint above.

## GitHub Delivery

Published [v0.8.0-rc.13](https://github.com/dafermen/netwatch-lite/releases/tag/v0.8.0-rc.13)
as a prerelease targeting the exact clean source commit above. All four jobs in
[CI run 43067504093](https://github.com/dafermen/netwatch-lite/actions/runs/43067504093)
passed: .NET/guards/mutations, portable validation, browser JSON and browser SQLite.
The public ZIP/checksum were downloaded into a new verification folder and matched
the local bytes, 47472644-byte size and recorded SHA-256. GitHub asset digests also
match. Receipts: `github-ci.json`, `github-release.json`, `github-download.json`.
Latest stable v0.6.2 remains unchanged; no Pages or hosted-backend deployment ran.
The subsequent receipt-only documentation commit skips redundant CI, with no
runtime/workflow changes. The release stays frozen at the fully tested commit.

## Publication Boundaries

Preserve upstream Git history: source had uncommitted validated rc.12 work and
remote documentation updates through 9b632e1. Local snapshot dfa7fd9 and merge
8af125b retained both. The public delta passed credential/private-path checks;
pre-existing published ZIPs in releases/ are historical, not new package payloads.
Never commit DBs, operator JSON, private snapshots, test/build outputs or the new
ZIP to source Git. The verified neutral ZIP and checksum belong in a prerelease.

Other-PC acceptance, remaining deployment gates and previously recorded Windows
JSON/file-sharing intermittencies remain separate risks, not claimed resolved.
