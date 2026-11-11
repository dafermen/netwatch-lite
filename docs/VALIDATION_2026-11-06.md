# Browser Regression And Resilience - 2026-11-06

## Scope

Add reproducible browser workflows and deterministic concurrency/recovery
coverage to the existing Windows/.NET 8 application. Operational inventory
and the shared port-5000 service are not used by the tests. Existing unrelated
working-tree changes were preserved.

## Implemented

- Playwright with locked test-only dependencies and Chromium desktop/mobile
  projects. Each test starts a server on a dynamically allocated loopback port
  with its own temporary content/data root, including profile files. Static
  assets and safe samples come from a published candidate in `tests/.app/`.
- Device CRUD/copy, settings reload, valid/invalid import, configuration export,
  independent profile switching, dashboard monitoring, report filters/export/
  targeted deletion, and docs search/theme/menu/return workflows.
- Deterministic overlap checks (HTTP 409 and SSE busy), cancelled waiter/stream,
  simulated disconnect via a failing stream writer, and subsequent lock reuse.
- Concurrent device row updates and history appends without lost records.
- New hosts reading saved data after restart; controlled malformed-file errors
  and manual restoration from known-good configuration/history backups.
- Browser CI job with dependency audit and retained test artifacts.

## Defect Found And Fixed

The same completion timestamp produced identical history run IDs. A regression
with 20 concurrent appends reproduced 20 stored records but only one distinct
ID. The repository now appends a GUID to IDs for new records. Tests verify 20
distinct IDs and deletion of exactly one run; a legacy-ID deletion test verifies
backward compatibility. Existing history IDs are not migrated or deduplicated.

## Validation

- Release build: zero warnings/errors.
- .NET: 45 passing tests (11 unit, 7 integration, 27 contract), zero skips.
- Chromium: 10 passing workflows, five each at 1440px desktop and 390px mobile.
- .NET coverage: Cobertura files under `TestResults/`.
- Browser report/screenshots: `playwright-report/` and `test-results/`.
- Failed runs preserve traces and isolated server logs; successful documentation
  flows also save screenshots. The suite has no automatic retries.
- npm dependency installation/audit reported zero vulnerabilities.
- A fresh Release publish excluded `node_modules`, `tests`, npm manifests,
  Playwright configuration and backup JSON, while retaining the documentation.
- The normal service was restored at `http://localhost:5000`; application,
  documentation and configuration endpoints returned HTTP 200.

See [TESTING.md](TESTING.md) for repeatable commands. CI configuration is local;
no remote Actions execution or GitHub publication is claimed.

## Remaining Limits

This is initial regression/resilience evidence, not completion of all thirteen
deployment gates. Real-device/mobile Safari/Firefox compatibility, power-loss
fault injection, multi-process shared-data locking, performance/load limits,
mutation and fuzz analysis, full property suites and security penetration
testing remain outstanding. Stream disconnects are simulated at the writer
callback, not a physical network drop. CDN assets use local copies of the
production versions during browser tests, so CDN availability is not certified.
Restart recovery uses fresh application hosts and the same private files;
it does not simulate an OS crash.
