# Recovery And Monitoring UX Validation - 2026-11-13

Status: source and immutable portable validated; rc.17 active locally on port 5000.
Published as a GitHub prerelease on 2026-11-14 under separate owner approval;
not a stable/public-service deployment approval.
Scope: IMP-013/016/017/018/019. AND filtering is retained.

## Safety Checkpoint

The previous rc.16 runtime/webroot and a verified consistent SQLite snapshot are
kept in a private checkpoint. The live service uses that frozen matching runtime
and UI while the candidate is validated in isolated synthetic instances. Eight
pre/post checkpoint API responses matched. No migration or live database restore.

## Current Evidence

An initial JSON stress/mutation baseline reproduced Windows ReplaceFileW error
1175 (unable to remove replaced file), not a data migration failure. Atomic-file
replacement now retries that code only while both original paths still exist,
with the existing six-delay/cancellation bound. It never retries partial-state
1176/1177 or falls back to delete/copy. For those partial-state errors, staged
bytes are retained privately for offline inspection rather than removed by cleanup.
Added no-backup byte-write stress and
permanent-sharing-failure regression. Microsoft's
[ReplaceFileW error-state contract](https://learn.microsoft.com/windows/win32/api/winbase/nf-winbase-replacefilew)
specifies which names are retained; this does not identify the external locker.

Final backend: **517 passed** (91 unit, 30 integration, 396 contract), no skips.
The final recovery contracts include a held-profile-lock / independent SQLite
writer probe and renamed-destination rejection. The shared profile callback
prevents the writer/profile lock-order inversion; the revision includes all
profile metadata as well as current bytes and recovery history. An early test
used PUT for the existing POST rename API; the corrected test passes.

Nine selected recovery/redirect mutants were killed with real failed-test
receipts, including reverting the lock order; both baselines pass. This is
sampled guard mutation coverage, not a whole-application score.

Full browser suites passed: **240 JSON and 240 SQLite** desktop/mobile cases,
with no failures/retries/skips. The final JSON suite uses the final concurrency
refinement; **42 final SQLite affected-workflow retests** also passed afterward.
Screenshots verified bilingual build/history views and responsive history rows;
Configuration headers wrap without overlapping. Recovery metadata is escaped.

Static/Node checks passed: 19 scripts, 1074 unique translation keys with placeholder
parity, 66 Markdown files/384 relative links, 2000 generated filter intersections and
safe HTTP explanations. NuGet/npm advisory checks reported zero vulnerabilities.
75 packaging guards passed on each PowerShell 5.1/7. Public asset lists remain
explicit; private recovery vaults, databases, sessions and operational JSON stay
excluded.

Private final pilot `compatibility-pilot-f58b30b2907f4afa83457803049b6ce8` matched
eight API responses, exact exported document bytes, schema-2 SQL counts and rc.16
rollback, preserving original JSON. Candidate readiness was 1328 ms / 68087808
working-set bytes in that small existing-data run; not a production load test.
The pre-release archive/original baseline has 6790 files, including 15 Data JSON;
the preceding 6224-file baseline also matched. Post-package reconciliation passed.

## Native Portable

Clean package source/tag target: `132396c37ab2270bac8a4ecbafc915ba949b5538`.
The original local delivery had no push; publication followed on 2026-11-14.
Folder `artifacts/portable/NetWatch-Lite-v0.8.0-rc.17-win-x64` and matching ZIP/SHA
under `artifacts/packages`. ZIP: 92514810 bytes; SHA-256:
`caf599060965df9b1ba9642a21b0c61413ab67bea73ed04cfc22fddbbc1fb020`.
568 physical files/567 manifest entries, 98 public assets, 117 pinned driver files.

Generation, PowerShell 5.1 ZIP extraction and PowerShell 7 folder-copy validation
each passed 47 routes/12 negatives, neutral SQLite first run, correct running
build/runtime/storage and native reviewed import/stale rejection/profile restore.
Receipts: `4e05da2bffcf43558a2252fa35897a05`, `d3a0c93fd0794d35a74b0967f27c3e2c`,
`fc37c305f2fb4174ad10ad2f44ad0915`. An initial nested private-sentinel test setup
failure promoted nothing; the parent-directory setup correction passed on retry.

Packaged Node 24.22.1 / Playwright driver 1.64.1 exercised installed Edge
157.0.4341.57 with synthetic loopback only. No corporate sign-in or personal
profile. Prior archives stayed byte-identical; owner-confirmed extra rc.11 ZIP
absence remains unchanged. The immutable package contains build-time docs;
post-generation receipts here never rewrite its ZIP/manifest.

## Deployment Gates

Local activation `activation-a2fbff8a13734e9eab22e41e763ebcad` preserved a verified
before.db, matched eight API responses and exact document exports, and retained
all original Data JSON. PID 26428 runs rc.17 + source commit 132396c on private
.NET 10.0.15, SQLite schema 2/engine 3.53.3. No migration/database rollback.
Live Dashboard/About read-only UI checks confirmed the actual version/runtime
without running checks, posting writes or capturing private inventory screenshots.

| Gate | Evidence / Scope |
| --- | --- |
| Acceptance | Two distinct import/restore confirmations; either cancellation preserves data/drafts; exact enabled AND scopes and default-off redirects. Bilingual browser workflows. |
| Unit | 91 passed, including safe redirects, identity detection, deadlines and unchanged transport defaults. |
| Properties/invariants | 2000 JS filter intersections; generated browser-origin rules and redirect request/hop bounds; no input mutation. |
| Mutation | Nine selected recovery/redirect guards killed; baseline receipts passed, not build failures. |
| Fuzzing | 200 deterministic redirect cases; 128 malformed imports plus 128 tampered-revision commits across providers; existing storage/metacharacter cases. |
| Integration | 30 passed, including exact migration/export of private recovery documents, 160 no-backup replacements, cancellation and bounded sharing failure. |
| Contract | 396 passed: scope/file/revision guards, repeat/stale requests, capacity, raw BOM/unknowns, repair, tamper, write failures and profile isolation. |
| E2E | Full JSON 240 / SQLite 240 passed, plus 42 final SQLite retests; no failures, skips or retries. |
| Regression | Full .NET and browser suites plus earlier notes/commands/peripherals/copy/import workflows updated for confirmations. |
| Security | Strict TLS, no cookies/credentials/downgrade, known Microsoft login not fetched/marked healthy; escaped metadata, private payload exclusions and zero reported dependency advisories. Not a public-service penetration test. |
| Concurrency/resilience | Concurrent reviewed commits allow one winner; profile-first transaction locking; write/snapshot failures do not replace configuration; JSON can retain an extra safe point. Partial native errors retain staged bytes. |
| Performance/resources | One deadline/five hops/1-MiB body bound; 5-MiB config and 20-point/80-MiB vault bounds; bounded SQL tests, browser startup deadlines and private pilot measurement above. Not a maximum-vault/production soak. |
| Compatibility/deployment | Existing-data rc.16 reversal/schema-2/API/raw-byte pilot, native immutable ZIP/folder and backed-up local activation/API/document reconciliation passed. |

Private receipts are under `artifacts/verification/ux17-20261113`, mutation run
`uxmut-82f56479` and the named packaging guard runs. Use loopback/synthetic
fixtures. Real corporate SSO, another-PC acceptance, hardware/disk faults and
production load remain owner/environment validation, not claims from these
local checks. The owner authorized rc.17 GitHub publication on 2026-11-14, not a
stable/public-service deployment or future release.

## GitHub Publication - 2026-11-14

[v0.8.0-rc.17](https://github.com/dafermen/netwatch-lite/releases/tag/v0.8.0-rc.17)
is an evaluation prerelease. Public main includes the reviewed source and later
documentation receipts; the annotated tag points to the exact package source
132396c37ab2270bac8a4ecbafc915ba949b5538. No archive was regenerated.

All four source CI jobs passed in
[43575295012](https://github.com/dafermen/netwatch-lite/actions/runs/43575295012):
backend/static/guards/mutations, full JSON and SQLite browser workflows, and
isolated CI portable validation. The existing non-blocking Actions Node-20
deprecation warning remains tracked in IMP-015; no workflow-major change here.

The draft's two uploaded asset sizes/digests matched the existing local ZIP/SHA
before publication. Downloaded published ZIP and checksum are byte/hash-identical
to local. The post-publication audit matched all 6790 historical/original files,
seven previous releases/assets and nine previous tag objects. Stable latest
remains v0.6.2; only the new rc.17 release/tag/assets were added. The accepted
extra rc.11 ZIP absence is unchanged. Private before/after/CI/download receipts
are in artifacts/verification/publication-rc17-20261114; CURRENT_STATUS records
the publication result. No private receipts were uploaded.
Later repository documentation does not change the immutable build-time package.
No separately hosted backend or GitHub Pages deployment was performed.
