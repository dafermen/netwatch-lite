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

## Publication Boundaries

Preserve upstream Git history: source had uncommitted validated rc.12 work and
remote documentation updates through 9b632e1. Local snapshot dfa7fd9 and merge
8af125b retained both. The public delta passed credential/private-path checks;
pre-existing published ZIPs in releases/ are historical, not new package payloads.
Never commit DBs, operator JSON, private snapshots, test/build outputs or the new
ZIP to source Git. The verified neutral ZIP and checksum belong in a prerelease.

Other-PC acceptance, remaining deployment gates and previously recorded Windows
JSON/file-sharing intermittencies remain separate risks, not claimed resolved.
