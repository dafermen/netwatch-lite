# Authenticated Browser Validation - 2026-11-12

Status: local regression complete; package/activation/publication in progress.
Candidate 0.8.0-rc.16, not stable-deployment approval.
Owner authorized implementation, backed-up local activation, immutable portable/
ZIP/SHA and GitHub source/prerelease publication. No real corporate endpoint or
login is used in automated tests. Schema 2/anonymous HTTP semantics are unchanged.

Private evidence: `artifacts/verification/browser-checks-20261112/`.

## Verified So Far

- Final .NET regression: 465 passed (73 unit, 28 integration, 364 contract), zero
  failures/skips. Includes single/multi-hop redirects with zero requests received
  by the forbidden loopback server, login confirmation, Windows-auth/AADSTS
  errors, expiry, wrong query/destination, content errors, deadlines/cancellation,
  session isolation/limits, eight-hour lifetime and JSON/SQLite CRUD/import/copy.
- Browser UI: 456 full passes (228 JSON/228 SQLite), plus six final SQLite
  focused retests; zero failures/skips/retries. Both languages and viewports.
- Four browser/eight monitoring/six storage sampled mutants killed. These are
  hand-selected guards, not a whole-application mutation coverage claim.
- 1000 seeded destination cases and 2000 JS intersection cases; syntax, 1009
  translation keys/placeholder parity and relative Markdown links verified.
- 73 packaging guards passed on each of PowerShell 5.1/7. NuGet/npm advisory
  queries report no vulnerable dependencies; this is not a penetration test or
  an independent audit of bundled Node/Edge.
- Private compatibility pilot e110374d32844921b84e9e0631635522 matched eight APIs,
  relational counts and document bytes, preserved all original JSON and proved
  rc.15 rollback for pre-feature data. Schema stays 2; startup samples 1353,
  1390, 1375 ms and approximately 67 MB working set are observations, not an SLO.

## Findings And Limits

The first redirect test exposed Playwright route interception's first-URL limit;
CDP now guards each top-level document hop. Browser test runtimes registered as
external DI instances required explicit disposal; the fixture now closes them
per case. A storage mutation failed to build because unnecessary driver copies
exceeded Windows path limits: storage/monitoring-only mutants skip those copies,
while real browser tests/portable retain the driver. Browser mutation workspaces
use short names. Failed/early receipts remain evidence, not final passes.

Package/native/privacy/activation and GitHub publication receipts remain pending.
The portable includes only neutral sample data and pinned driver assets; sessions
must never be exported. Original archives and Data JSON have a 6224-file hash
baseline. The previously owner-confirmed missing extra rc.11 ZIP remains absent.

Real application/MFA/Conditional Access and another-PC acceptance remain
operator-owned; synthetic tests do not certify those external conditions.

## Quality Gates

| Gate | Evidence And Boundary |
| --- | --- |
| Acceptance | Synthetic manual-login, expiry and failure workflows; real corporate acceptance pending. |
| Unit | 73 passed. |
| Properties/invariants | 1000 generated destination cases; 2000 generated filter intersections. |
| Mutation | Four browser/eight monitoring/six storage sampled mutants killed. |
| Fuzzing | Seeded bounded URI/query/filter cases, not coverage-guided whole-app fuzzing. |
| Integration | 28 storage/atomicity/upgrade cases passed. |
| Contract | 364 API/transport/browser cases passed; JSON and SQLite. |
| End-to-end | 456 full browser passes plus six final SQLite focused retests. |
| Regression | Full .NET 465/full browser 456 passed with zero skips/retries. |
| Security | Local-origin/revision/navigation guards, cookie/query privacy, strict TLS and advisory checks; no penetration-test claim. |
| Concurrency/resilience | Session limits/isolation, idle/absolute expiry, cancellation, stale scope, existing execution/storage tests. |
| Performance/resources | Bounded evaluations and pilot startup/memory observations; sustained enterprise load/SLO pending. |
| Compatibility/deployment | Schema-2 private pilot/eight APIs/rollback; portable/native/other-PC acceptance still pending. |

This is a local evaluation/prerelease work order. Open operational acceptance
items must not be presented as completed stable-deployment gates.
