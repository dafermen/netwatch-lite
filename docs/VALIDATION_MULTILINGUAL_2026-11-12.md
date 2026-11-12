# Multilingual Monitoring Work Order - 2026-11-12

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
- Browser regression and native packaging: in progress.
  Final counts/receipts are added only after completion.
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

## Gate Limits

The thirteen deployment gates require scoped evidence, not a blanket claim of
exhaustive coverage. Final browser/package/audit receipts and source restart are
pending at this checkpoint. Other-PC/operator acceptance, representative corporate
proxy/SSO behavior, long-running load/resource tests and stable deployment approval
remain owner gates. Anonymous HTTP does not reuse a browser session. Do not
automatically accept error codes, follow redirects or disable TLS to hide failures.
