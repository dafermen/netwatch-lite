# .NET 10 Migration Validation - 2026-11-12

## Scope

Authorized IMP-009: .NET 10 LTS, runtime 10.0.15, SDK 10.0.404, app/test/CI and
portable policy alignment. Microsoft.Data.Sqlite/Mvc.Testing 10.0.15 requires
SQLitePCLRaw 2.1.13. No database schema or product workflow change is intended.
GitHub publication remains on hold. All evidence is local and private where it
contains operational copies; no corporate URL probes are performed.

## Checkpoint

SDK download was verified against Microsoft's SHA-512. Historical baseline
contains 5781 original/historical files, including 15 Data JSON files.

- .NET regression: 416 passes (34 unit, 28 integration, 354 contract), no skips.
  After updating the obsolete test-only certificate loader, the final solution
  build has zero warnings/errors and all 35 HTTP/TLS cases passed again.
- Private SQLite runtime pilot passed: eight API snapshots/raw document bytes/
  SQL counts matched; the copy reopened with the net8.0 binary after net10.0.
  Original Data JSON and live database were not migrated. Schema remains 2.
- Packaging guards: 70 passes each on PowerShell 5.1 and 7, including supported
  framework/patch rejection. Two JS cases passed, including 2000 seeded predicates.
- Static checks: 16 product/docs scripts, 957 translation keys/placeholder parity,
  62 Markdown documents and 351 relative links. NuGet/npm audits found no known
  vulnerabilities; this is not a support/security certification.
- First full-browser attempt stopped on a 30-second Command workflow timeout
  while other compilations were active. The same desktop/mobile cases passed
  unchanged with one worker and the original timeout. A second full attempt passed
  90 cases before another whole-test timeout. Its trace identified app fixture
  setup at 19.518 s, before hooks at 23.600 s and workflow actions about 7.2 s:
  preparation consumed the shared 30-second budget, closing the request context
  before the final history assertion. The fixture now has its own 30-second budget,
  separate from the unchanged 30-second workflow/8-second assertion limits and
  15-second server readiness deadline. Total setup-plus-workflow allowance changes;
  this is runner isolation, not a claimed application performance improvement.
  Every final case records copy/startup/setup timings. Both failed attempts and
  traces are retained; require the complete final rerun without retries.
  Eight repeated desktop/mobile affected workflows passed after separation.
  Metrics then showed Node asset copies taking up to 17.161 s. A Windows native
  copy benchmark matched all 115 asset hashes in 953 ms, so Windows fixtures now
  use bounded copy-only Robocopy, with Node copy retained elsewhere. The slower
  in-progress matrix was deliberately stopped for a consistent final rerun;
  partial attempts are not counted as a complete pass. No shared mutable files,
  junctions, mirror/purge operations or operator clipboard/data are involved.

- Mutation sampling passed against green baselines: eight monitoring/selection
  and six storage mutants killed. This is not whole-application mutation coverage.
- Historical schema-1 pilot updated for separate .NET hosts and verified on a
  neutral rc.10 copy: eight APIs/document bytes/query counts and restored rollback
  passed. Legacy initialization creates default backups before freezing the baseline;
  strict baseline document count/bytes remain enforced. No live schema migration.

The first complete JSON matrix passed 220 cases with zero failures/skips/retries.
SQLite passed 195 before a mobile URL edit exposed a separate UI loading race:
search rerendered enabled row actions while configurationBusy was true, so a
pending inventory read could reset/close an editor opened prematurely. Normal/
Bulk rerenders now retain read-only state and event/action guards reject early
mutations. A deliberately delayed inventory read failed before the fix and passed
both viewports after it. No schema or stored data change was needed.
The corrected final matrices passed **444** cases: 222 JSON and 222 SQLite,
zero failures/skips/retries, desktop/mobile and both languages. Final fixture
max setup: JSON 8409 ms / SQLite 6491 ms; max startup 5713/4026 ms respectively.
These are bounded local observations, not production SLOs or a general speedup.
Consolidated receipt: `regression-summary.json` in the evidence root.
Fresh private runtime pilot: `runtime-pilot-9054ef0bf79243d49da7804796638ab7`.
Source activation and rc.15 native folder/ZIP/SHA are complete; see receipts below.
The port 5000 service was already stopped when inspected; no unknown/source process
was terminated. Activation used the fresh private net8/net10 copy pilot baseline.

Evidence root: `artifacts/verification/dotnet10-20261112/`. These ignored receipts
must not be packaged or published. See [runtime policy](RUNTIME.md) and
[current status](../CURRENT_STATUS.md) for the final checkpoint.

## Final Local Activation And Package

- Source PID 22568 uses the private SDK host and verified loaded CLR 10.0.15;
  localhost:5000 listens only on 127.0.0.1/::1. SQLite schema 2/engine 3.53.3.
- Activation `activation-1348ced460e64cfeaad845d701d7c991` retained before.db and
  the old runtime. All document bytes/eight APIs/15 Data JSON matched; 13 served
  source assets matched. No schema migration or machine-wide runtime replacement.
- Clean package source: `4c5dafdf026944b360a02cb3da932e212fc62b93`.
  Immutable folder: `artifacts/portable/NetWatch-Lite-v0.8.0-rc.15-win-x64/`.
  ZIP/SHA: `artifacts/packages/NetWatch-Lite-v0.8.0-rc.15-win-x64.zip[.sha256]`.
  ZIP 52543152 bytes, 442 package files/91 public source assets.
- SHA-256: `54169c3a0b6ac63e8d1fee3995f35ff8c23ea63b091c1736d26e0b35c473a308`.
  Microsoft.NETCore.App/Microsoft.AspNetCore.App 10.0.15 are both included.
- Generation, exact ZIP on PowerShell 5.1 and folder copy on PowerShell 7 each
  passed 38 routes/eight negative checks, clean SQLite and unchanged artifacts.
  Receipts: `141bb50d9d0043a6a068dbde6d8b4253`,
  `ecacb78f33894515a6cd5bd93cb056eb`, `af7cd833cdc145eca12c88904eb87579`.
- Extra native execution/token/pause/diagnostic cases passed in
  `native-workorder-5e8faaf946e642d98bdd0cc017c4c45e` (actual rc.15 version checked).
  Earlier extra receipt with an old hardcoded report label is superseded.

## Historical Audit Exception - Owner Confirmed

5780/5781 baseline paths matched exactly, including all 15 original Data JSON.
The extra `artifacts/portable/NetWatch-Lite-v0.8.0-rc.11-win-x64.zip` is absent;
its initial SHA was `9d2b69e06f745bcc270f2cf318641eec0d82396aea5ad3ab6ea8b8035059d4a3`.
No present historical file has a hash mismatch. The canonical rc.11 folder and
packages ZIP remain unchanged, but the canonical ZIP SHA is different
(`4d9992d921442cabb7342df7fa82086d6ec6348c8904daa6e2c736496006e3cb`).
The owner subsequently confirmed moving/deleting that additional ZIP and
explicitly instructed leaving it as-is. The observation is closed as an accepted,
owner-managed absence; do not recreate the file or extend the exception to other
archives. No portable was restored/recompressed and no baseline was rewritten.
package-audit.json retains packagePassed=true and historicalAuditPassed=false
as the original exact-path result. An owner-confirmation addendum records the
resolution without rewriting evidence. This is not a claim that all 5781 paths
still exist or that stable deployment is approved.

The ZIP is an immutable build-time checkpoint; these subsequent source receipts
do not change its docs/bytes. GitHub and remote CI were not updated or run.

## Remaining Acceptance

Passing local regression does not establish real corporate proxy/SSO behavior,
other-PC acceptance, sustained production load, multi-user support or stable
deployment approval. Existing CDN frontend assets still require reachability;
the runtime migration does not make the UI offline or add authentication.
