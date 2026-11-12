# Authenticated Browser Validation - 2026-11-12

Status: local regression/package/activation and source CI/publication complete.
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

## Package And Activation

- Clean source c74ad2d0a49f1b723e09243ee37cdd4c3c5bbe7e, rc.16 folder/ZIP/SHA.
  92470993-byte ZIP; 564 files, 94 build-time public source matches and 117 pinned
  driver files. Client DLL also matches the official NuGet package.
- SHA-256: `ef6e0c73aed74fe8f43c0392cef84dc105dc41b9058cac9f69ce591ee11b98fa`.
- Generation/PS5.1 ZIP/PS7 folder-copy each passed 41 routes/11 negatives:
  d9f329bf1d5c4445a5bf4d7340fd7103, e3b178309b9b414f85643ffb1e2fc5e0,
  237eba750a3d43779104bfcc06bf8b64. Altered driver/runtime and injected private
  files were rejected before startup. Neutral SQLite first run passed.
- Packaged driver smoke: Playwright 1.64.1/Node 24.22.1 with installed Edge
  157.0.4341.46, isolated loopback only. Extra packaged-EXE flow passed browser
  create/edit/copy/delete, local guarded status and exact selected run; auth-required
  evaluation remained offline=0/measured=0. No real website/browser opened there.
- Source activation PID 872, rc.16+c74ad2d, loaded CLR 10.0.15, loopback port 5000,
  SQLite schema 2/engine 3.53.3. Private before.db/old runtime and eight matching
  APIs/raw exports: activation-10e0d117dde14ad0ae77cb91bfd54518.
- Historical audit: all 6224 baseline files, including 15 original Data JSON,
  unchanged. Previously owner-confirmed extra rc.11 absence remains intentional.
- Source/tag and both assets are published in [rc.16](https://github.com/dafermen/netwatch-lite/releases/tag/v0.8.0-rc.16).
  All four source CI jobs passed in [43260541061](https://github.com/dafermen/netwatch-lite/actions/runs/43260541061).
  The downloaded ZIP/SHA match the local bytes/hash. Latest stable remains v0.6.2.
  No remote backend/Pages deployment. These receipts are a documentation-only
  follow-up to the tested binary/source commit; the tag/package remain frozen.
- CI reported a non-blocking warning for v4 actions targeting deprecated Node 20,
  currently forced to Node 24. This is recorded as proposed IMP-015, not silently
  resolved by changing workflow majors.

The immutable ZIP retains build-time docs; post-generation source receipts do not
rewrite it. No sessions, credentials, databases or private verification data are
release assets. Real corporate login and another-PC acceptance remain external.

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
| Compatibility/deployment | Schema-2 pilot/eight APIs/rollback and native ZIP/folder on PS5.1/7 passed; real corporate/other-PC acceptance remains open. |

This is a local evaluation/prerelease work order. Open operational acceptance
items must not be presented as completed stable-deployment gates.
