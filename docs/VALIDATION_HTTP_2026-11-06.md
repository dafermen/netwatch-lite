# HTTP/HTTPS Validation - 2026-11-06

## Scope And Environment

HTTP/HTTPS probes, compatible configuration persistence, monitor aggregation,
SSE/history and desktop/mobile presentation. Windows, .NET SDK 8.0.422 / runtime
8.0.28, Node.js 24.18 and Playwright Chromium at 1440x1000 and 390x844.
Process-scoped DOTNET_ROOT and DOTNET_ROOT_X64 select the installed .NET 8
runtime; no machine-wide runtime change was made.

Only isolated temporary inventories and local synthetic HTTP/HTTPS servers
were used. Operational profiles were not changed or used as test targets.
The certificate test creates an ephemeral, untrusted self-signed certificate;
it never installs a certificate or disables production TLS validation.

## Automated Results

- Release solution build: passed, zero warnings and errors.
- .NET: 139 passed, zero failed/skipped (30 unit, 7 integration, 102 contract).
- Chromium: 30 passed, zero failed/skipped (15 desktop and 15 mobile).
- JavaScript syntax checks: passed for application, HTTP browser tests and
  documentation scripts.
- 120 local Markdown file links in 31 documents resolved; git diff whitespace
  checks passed (only the existing LF/CRLF conversion notices were emitted).

Commands from the repository root:

```powershell
$env:DOTNET_ROOT_X64 = 'C:\Program Files\dotnet'
$env:DOTNET_ROOT = 'C:\Program Files\dotnet'
dotnet build netwatch.sln --configuration Release --no-restore
dotnet test netwatch.sln --configuration Release --no-build --collect "XPlat Code Coverage" --results-directory TestResults
npm run test:e2e
node --check wwwroot/app.js
node --check tests/e2e/http-checks.spec.cjs
node --check docs/app.js
git diff --check
```

The first new contract-test run found test harness assumptions about SSE event
names and string-enum deserialization. Tests were corrected to the existing
`result` event and public string-enum contract; application contracts were not
changed to accommodate the tests. Subsequent full .NET/browser runs passed.
One later browser repeat exposed a close/copy race while Bootstrap's modal
opening transition was still active. The regression now waits for the modal's
shown transform and confirmed hidden state rather than clicking during that
transition; no arbitrary sleep was added.

## Feature Evidence

- Unit probes cover exact/default statuses, literal text and case, declared
  encoding/whitespace, invalid encoding, safe DNS/TLS/connection/protocol errors,
  timeout, caller cancellation and bodies over the limit with/without length.
- Production transport settings prohibit cookie state, redirects, background
  response draining and certificate-validation bypasses.
- Real loopback HTTP tests verify Degraded/Down aggregation, 503 and missing
  text messages, timeout before headers and during body reading, no redirect
  target access, retries, PingOnly skipping and stored SSE/history fields.
- Real loopback HTTPS rejects the untrusted certificate with TlsError.
- API tests reject 13 malformed HTTP configurations through both save and
  import, without changing the prior configuration. Other tests preserve new
  fields through reload, row updates, JSON export/import and profile copy.
- Six new desktop/mobile browser cases verify HTTP editing, host derivation,
  defaults, hidden TCP fields, reload/copy/bulk/export preservation, dashboard
  failures, Reports/JSON export, Ping Only and safe expected-text rendering.
- Configuration errors are visible inside the device modal. Visual inspection
  uses synthetic editor/dashboard screenshots; mobile checks assert no page or
  modal overflow. Wide monitoring tables retain their horizontal scrolling.
- Existing peripheral/workstation, configuration, profile, report, navigation
  and persistence regressions remain part of the full run.

Coverage: ignored `TestResults/*/coverage.cobertura.xml`. Browser report:
ignored `playwright-report/index.html`; screenshots/traces: ignored
`test-results/`. These are local evidence, not published operational data.

## Packaging And Local Service

A fresh publish check found `test-results/.last-run.json` was eligible for
inclusion by the SDK's JSON content defaults. The project now explicitly
excludes root browser/.NET evidence directories as well as test source and
dependencies. Recheck publish output after tests, not only in a clean checkout.
The temporary publish directory is removed only after its absolute owned path
is verified. The corrected fresh publish passed: HTTP guide/validation/ADR and
static assets are present; private runtime files/backups, test dependencies and
evidence are absent. Both owned temporary publish directories were removed.

The normal project service was restored on port 5000 (PID 36056 at this
checkpoint). `/`, `/config`, `/reports`, `/docs/`, `/docs/HTTP_CHECKS.md`,
`/docs/VALIDATION_HTTP_2026-11-06.md`, `/app.js` and `/api/config` returned HTTP
200 without changing operational inventory. Test instances were stopped.

## Remaining Gates And Limits

No real application URL was supplied for operator acceptance. Authenticated
login, JavaScript/browser journeys, real trusted-public-HTTPS success, proxy
matrix, full load/resource testing and hostile-network certification are not
covered by these synthetic tests. No external alert delivery or independent
background scheduler was implemented. Only the existing open-dashboard Auto
Refresh runs periodically.

This is not a production deployment approval. Full property/invariant,
mutation, fuzz, security, performance, compatibility and other required gates
still need evidence or owner-approved exceptions under
[DEPLOYMENT.md](DEPLOYMENT.md). Remote CI, GitHub publication and backend
deployment were not part of this request.
