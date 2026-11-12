# Multilingual Monitoring Work Order - 2026-11-12

## Final Package Receipt

Local delivery is complete; GitHub remains unchanged. Immutable rc.14 was built
from clean commit `6812892d8ab8b40a461051d4c9c4d2739d6e26da`, with .NET/ASP.NET
8.0.34 included. Folder and ZIP/SHA are under artifacts/portable and
artifacts/packages respectively. ZIP: `NetWatch-Lite-v0.8.0-rc.14-win-x64.zip`.
Size: 49239005 bytes; 432 files / 88 public assets.
SHA-256: `3ea0a12229b556de816f4a3a01c3ba680389c4c32fc1aa648642bdd8eccdcebf`.

Generation, final ZIP (PS 5.1) and folder copy (PS 7) each passed 35 routes,
eight negative checks, clean SQLite-2 startup and immutable artifact hashes.
Receipts: `7e9e8f3bab2c47629541bc0d676ce668`, `67d10e33e8aa44e78df701f3f99cdbfe`,
`9e50621ed46f465d966812d418f95ba2` under artifacts/verification.
Extra native selections, single-use token, pause/resume preservation, redaction,
separate failures and language assets passed in
`native-workorder-9af2a4c7cafc4282892dd87e166b55c2/` under the work-order root.
The audit matched all 5347 protected files and 15 original Data JSON, all 88
build-time sources, manifest/checksum and absence of publisher lock. No private
database, operational JSON or backup was packaged. Source remains on port 5000.

This receipt follows the immutable build checkpoint. Earlier references below
to pending native packaging describe that checkpoint, not an unvalidated delivery.
Stable deployment/other-PC acceptance and runtime-support gates remain open.

## Scope And State

Local rc.14 implements eight requested improvements: English-default/Spanish UI,
inclusive device/website forms, shared Configuration filters, Facility/Device Type
grouping, exact filtered manual/automatic checks, pause/resume, execution visibility
and diagnostics/export. GitHub publication is **on hold**. Stable/other-PC acceptance
is separate. No schema migration or automatic corporate URL probes are performed.

## Executed Checks

- Full .NET: **416 passed** (34 unit, 28 integration, 354 contract), zero skips.
  JSON/SQLite coverage includes exact/empty/stale/duplicate/paused selections,
  plan bounds/expiry, busy streams retaining pending tokens, narrow Enabled writes,
  and diagnostics queries/redaction.
- Pure JavaScript: **2 tests passed**, including 2000 seeded filter intersection,
  search/immutability cases and HTTP explanation mappings.
- Eight monitoring and six storage sampled mutants were killed against green
  baselines. These are targeted, not whole-application mutation scores.
- Packaging guards passed 58 each on Windows PowerShell 5.1 and PowerShell 7.
- npm/NuGet audits found no known vulnerabilities; NuGet needed an unsandboxed
  retry after the sandbox denied profile/cache access. No dependency versions changed.
- Static checks passed 16 scripts, 957 translation keys/placeholder parity and
  321 relative links. Historical/original-data baseline covers 5347 files.
- Full browser matrix: **424 passed** (212 SQLite, 212 JSON), zero failures,
  skips or retries. Receipts: `release-sqlite.json`, `release-json.json` under the
  private evidence root. Both desktop and mobile are included.
- Final focused acceptance: 26 desktop/mobile cases passed. After the final
  read-only export/legacy-label changes, **80 targeted regressions passed**
  (40 per provider) for Reports, languages and Diagnostics, including safe export
  cancellation and neutral localized legacy measurements.
- Native packaging remains at this source checkpoint. The archive freezes this
  checkpoint; final native/hash receipts are recorded later in the source
  checkout without rewriting the immutable ZIP.
- A sandboxed testhost connection was blocked. That aborted attempt is not a pass;
  the complete .NET rerun outside that restriction passed.
- Localization regression exposed table placeholder and ignored-code/textarea
  interpolation issues. Fixes preserve table slots, literal inventory, escaped
  technical references and textarea values; focused tests guard these cases.
- An initial-load race could enable runs before the revision snapshot completed.
  Run/type controls now wait for that snapshot. A controlled delayed-read test
  guards this, alongside stale inventory/facility review and repeat Type-only Run.

Private evidence: `artifacts/verification/workorder-20261111/`. Do not package
operational pilots, browser downloads, databases, backups or logs. Active SQLite
and original JSON/historical archives require preservation checks before handoff.

## Local Activation

Source rc.14 is active on port 5000, PID 29836, backend commit 3a39dac. A private
verified snapshot preceded restart. Before/after document bytes, all eight
operational API snapshots and the 15 original Data JSON files matched. Schema 2
stayed unchanged. Eleven served source assets matched their local SHA-256.
Receipt: `activation-60ec61f0bde14e639528b51292344dcf/result.json` and
`live-service.json`. No real target probes or GitHub operations were performed.

## Gate Limits

The thirteen deployment gates require scoped evidence, not a blanket claim of
exhaustive coverage. Native package/audit receipts remain pending at this checkpoint.

| Gate | Actual scope / remaining limit |
| --- | --- |
| Acceptance | Automated synthetic workflows; owner/other-PC acceptance pending |
| Unit | 34 .NET cases and pure JS mappings |
| Properties / invariants | 2000 seeded filter cases, preservation/exact scope contracts |
| Mutation | Eight monitoring and six storage sampled mutants, not whole-app score |
| Fuzz | Seeded predicates and malformed/bounded API inputs, not a sustained campaign |
| Integration | 28 repository/storage cases |
| Contract | 354 cases including JSON and SQLite |
| End to end | 424 full-matrix desktop/mobile passes plus targeted regressions |
| Regression | Existing CRUD, catalogs, profiles, reports, clipboard and data preservation |
| Security | TLS/body/input bounds, redaction, escaping, CSV, rate limits and dependency audits; not a penetration test |
| Concurrency / resilience | Busy/token retention, interrupted/stale reads, atomic persistence and safe export cancellation |
| Performance / resources | Bounded plans/pages/exports/body/log counts; representative long-running load remains pending |
| Compatibility / deployment | PS 5.1/7 guards and local source restart; native package/other-PC acceptance pending |

Corporate proxy/SSO behavior, long-running load/resource tests and stable deployment
approval remain owner gates. Anonymous HTTP does not reuse browser login. Do not
automatically accept error codes, follow redirects or disable TLS to hide failures.
The existing UI still loads Bootstrap/FontAwesome from CDNs; browser QA supplies
their exact local copies. Verify those origins on the other PC. Self-contained
means the .NET runtime is included, not that all frontend resources work offline.

.NET 8 ended support on 2026-11-10, verified against
[Microsoft](https://dotnet.microsoft.com/en-us/platform/support/policy/dotnet-core).
The portable pins the final 8.0.34 patch, which does not restore support. A
supported-runtime migration is a separate high-priority stable-deployment gate
(IMP-009). The active shared runtime was not replaced. Package vulnerability
audits do not establish framework support.
