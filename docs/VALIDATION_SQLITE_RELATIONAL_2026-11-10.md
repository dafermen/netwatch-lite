# Relational SQLite Validation - 2026-11-10

## Scope

Approved IMP-005: SQLite schema-2 inventory/history projections with SQL Reports,
global configurable retention, private field-change audit, managed verified
snapshots and offline new-directory restore. API/JSON document contracts stay
compatible. No automatic monitoring, actor identity, encryption or GitHub release.

## Validation Evidence

Initial full .NET runs passed the new functionality. Browser validation exposed
PascalCase/numeric-enum history compatibility; the projector/browser adapter were
corrected and real 132-evaluation SQL pagination/export passed on desktop/mobile.
Legacy Reports mocks deliberately select JSON; they do not substitute for real SQL
tests. A subsequent run exposed asynchronous test-host cleanup before release of
the root lease; factory cleanup now awaits DisposeAsync and retries only transient
Windows sharing violations for a bounded interval. Later parallel runs still
exposed a cleanup sharing violation and one JSON File.Replace removal failure.
Sequential-collection regression passed all 354 tests; this reduces test load,
not proof of the historical JSON incident's root cause. Production lease/JSON
replacement semantics were not weakened to make tests pass. Explicit concurrency
tests still execute their own concurrent workloads.

Private-copy pilot `artifacts/verification/relational-pilot-32f66ca0e130499ba04c8f996f262efe/`
passed eight schema-1/schema-2 API comparisons, exact document payload hashes,
verified pre-upgrade backup and restored schema-1 API comparisons, with original
JSON unchanged. User explicitly approved active-root upgrade after this pilot.
The source base remains unchanged until controlled restart; CURRENT_STATUS records
the actual final state, tests, performance sample, native package and checksum.

Expanded .NET regression passed 354 cases (34 unit, 28 integration, 292 contract),
without skips. Evidence: `artifacts/verification/sqlite-v2-final/`. Six sampled
mutants were killed under `storage-mutations-feb43301eb784f0eb2933e97a3c6ae9e/`.
The subsequent final-code pilot `relational-pilot-a902e91ef1274abe8f6bb7e3c7c6ccaa/`
also passed. A 5000-evaluation sample returned 7394 bytes for ten records versus
784800 full-document bytes; the request took 188.4 ms in the test host. This is
response-size evidence, not a latency SLO or proof of general acceleration.

During browser iteration, tightening-retention confirmation was added after one
test run had discovered its older policy test. Those two cases stopped at the
new confirmation. Their initial failure evidence remains in test-results; final
validation uses a fresh fixed app/test snapshot. SQL invalid-date recovery and
neutral loading states also have explicit regression coverage.

Final source regression passed 355 cases (34 unit, 28 integration, 293 contract)
with sequential collections under `artifacts/verification/sqlite-v2-final-source/`.
Four final focused SQL desktop/mobile cases passed under
`sqlite-v2-focused-final/`, including retention confirmation and invalid date
recovery. Neither a JSON production fix nor a parallel-run certification is claimed.

Full browser matrices passed 296 cases (148 SQLite/148 JSON; desktop/mobile),
without failures/skips/retries. Separate reports/test-results are under
`sqlite-v2-browser-sqlite/` and `sqlite-v2-browser-json/`. Four final UI delta
cases passed under `sqlite-v2-final-ui/` after search trimming/mobile table-width
correction; screenshots and cell/table overflow checks were reviewed. The new
SQL cases use real synthetic runs; legacy mocked Reports cases select JSON.

Final private pilot `relational-pilot-0030903427974f17be26454a4422922c/` reconciled
SQL history/inventory counts as well as all eight APIs, exact document bytes,
schema-1 restore and original JSON preservation. Both shells passed 58 package
guards (`guards-4269e424bbd44743ada91adc3ad2f772/` and
`guards-ff5e408e4889421bb1807535763fa4b6/`). NuGet/npm audits reported no known
vulnerabilities, not comprehensive security proof. Syntax, whitespace and all
277 local links across 55 Markdown documents passed. The handoff baseline hashes
4062 historical portable/package files and 14 original JSON files.

## Final Delivery And Local Activation

Local rc.11 folder, ZIP and SHA sidecar were generated without private data:

- Folder: `artifacts/portable/NetWatch-Lite-v0.8.0-rc.11-win-x64/`.
- ZIP: `artifacts/packages/NetWatch-Lite-v0.8.0-rc.11-win-x64.zip`, 47454045 bytes.
- SHA-256: `4d9992d921442cabb7342df7fa82086d6ec6348c8904daa6e2c736496006e3cb`.

All 420 package files/76 public assets passed manifests and build-time source
comparison. Each native check passed 26 read-only routes, eight corruption/private
file probes and neutral SQLite schema-2 startup. Receipts under artifacts/verification/:

- `b485cd59331143758f757585eb1dcda0/result.json`: generated ZIP, PowerShell 5.1.
- `dd86245730b944218b8c6838749fed20/result.json`: final ZIP, PowerShell 7.
- `b26b2b9af46e4358ad75956e026ba052/result.json`: folder copy, PowerShell 5.1.

User-authorized live-root activation passed with a verified pre-upgrade snapshot,
retained old runtime and automatic schema-1 backup. Offline exports matched every
document byte before server startup; eight actual source API responses and the
original JSON matched after restart. Source PID 30132 serves port 5000 with
SQLite schema 2 / engine 3.53.3. No agent monitoring request was made on operator
devices. Activation/recovery evidence is private under
`sqlite-v2-handoff/activation-60949302224f41928e55bc267b1af999/`.

`sqlite-v2-handoff/final-audit.json` confirmed matching ZIP/SHA, all 4062 historical
files and 14 original JSON unchanged, no publisher staging/lock left and the
expected source service. NuGet audit scope is application dependencies; npm audit
scope is local tooling. No GitHub push, tag or upload was performed.
Final receipts are repository handoff notes; historical archive documentation
remains frozen at its build-time state and is not rewritten to add its own hash.

## Limits And Deployment Gates

Queries are bounded and indexed, but compatibility writes can still reserialize/
reproject full aggregates. A 5000-evaluation byte/time sample is not an SLO or
general speedup proof. Projections add database/backup storage overhead.
Retention exports and audit records can grow; restrict
access and monitor disk use. Backup rotation covers owned automatic snapshots,
not manual/upgrade snapshots or private retention archives. Audit has no verified
actor and is not tamper-proof. Ambiguous legacy bulk identity/order changes cannot
create verified physical-device IDs. No multi-instance/network-share support.

Other-PC/operator acceptance, broader load/security/accessibility analysis and all
thirteen deployment gates remain separate. Sampled mutations/fuzz and dependency
audits are not comprehensive certification or stable-deployment authorization.
