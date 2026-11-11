# Functional Validation - 2026-11-05

## Post-Fix Validation

The initial review below is historical evidence. Its four findings were
addressed in the subsequent authorized implementation on the same date:

- Null devices/checks now return HTTP 400 on save and multipart import without
  replacing the current configuration.
- All six JSON repositories, including profile creation/copy, use
  `AtomicFileWriter`. The new file is serialized/copied to a unique sibling,
  flushed and closed before replacement. Replacing an existing destination
  preserves its previous content in a sibling `*.backup.json` file. Failed
  serialization and cancelled writes preserve the existing destination.
- Unexpected failures before response start return safe `application/problem+json`
  with HTTP 500 and a `traceId`, even if error logging also fails. Responses
  already started are not rewritten; SSE retains its event-specific handling.
- Process-scoped .NET 8 runtime selection is documented in
  [TROUBLESHOOTING.md](TROUBLESHOOTING.md).

Release build passed with zero warnings/errors. All 36 tests passed with no
skips (11 unit, 7 integration, 18 contract); coverage evidence was generated
under `TestResults/`. Regression tests exercise failed serialization,
cancellation, repeated replacement/backups, copy collision, rejected null
members on save/import, safe error responses with a broken error log, and
SSE/history behavior without network inventory.

HTTP smoke checks on an isolated port-5001 instance passed for valid save,
rejected null members on save/import with unchanged configuration, Full and
PingOnly loopback checks, SSE completion, history, theme/integration saves,
profile creation/copy, and documentation assets. Temporary Release publication
included documentation and contained zero `*.backup.json` files. Git and
publication exclusions cover backups and temporary writer files. CI syntax
checks include all documentation JavaScript.

The isolated smoke service was stopped after testing; the final shared service
was started on port 5000 with the normal project configuration. `/`, `/docs/`
and `/api/config` returned HTTP 200 after startup. No GitHub
publication is performed. Fault injection tests do not certify power-loss
durability, cross-process writes or transactions spanning multiple files.

## Scope And Environment

Local Windows validation of the current working tree, not a deployment
certification. Existing uncommitted changes were preserved. No product source
code was changed during this review.

SDK: 8.0.422. Installed .NET 8 runtime: 8.0.28 under
`C:\Program Files\dotnet`. An initial test run aborted because testhost selected
`C:\Users\dafer\.dotnet`, which only had runtime 10.0.10. Selecting the correct
runtime for this process resolved the failure:

```powershell
$env:DOTNET_ROOT_X64 = 'C:\Program Files\dotnet'
$env:DOTNET_ROOT = 'C:\Program Files\dotnet'
& 'C:\Program Files\dotnet\dotnet.exe' test netwatch.sln --configuration Release --no-build
```

No persistent environment settings were changed.

The HTTP/browser instance used port 5000 with all six runtime file paths
overridden to a unique temporary directory. Only synthetic loopback devices
were monitored. Operational inventory was not used or changed. This temporary
instance is stopped at the end of the review.

## Passed Checks

- Release build: zero warnings and zero errors.
- Automated tests: 25 passed, zero failed/skipped (11 unit, 3 integration,
  11 HTTP contract).
- JavaScript syntax: application, documentation, reading tools and initializer.
- Local Markdown links resolve; Git whitespace validation passed.
- NuGet vulnerability check, including transitive packages: no vulnerable
  packages reported by the configured NuGet source for any solution project.
- HTTP 200 for the application, docs, config, regions, themes, integrations,
  history and errors endpoints.
- Valid configuration save; invalid TCP port rejected with HTTP 400 while
  preserving the saved configuration.
- Full check: loopback port 5000 healthy, loopback port 59999 unavailable;
  summary correctly reported 50 percent availability.
- PingOnly check: both loopback devices healthy, 100 percent availability.
- SSE returned started/completed events; three API-triggered runs appeared in
  history.
- Dashboard run button completed and displayed both synthetic devices without
  visible alerts.
- Dashboard, Configuration, Support Groups, Themes, Reports, Integrations,
  Manual, About and Documentation opened in Chrome at 1440 and 390 CSS pixels;
  no horizontal page overflow or uncaught JavaScript exceptions was observed.
- Documentation theme/search/context controls worked; search for API returned
  seven results, and six copy-code controls were present. Mobile drawer opened
  at the viewport edge and Escape fully closed it after its transition.
- Missing docs assets, root continuity files under `/docs/`, and an encoded
  parent-directory traversal request returned HTTP 404.

## Findings To Correct

1. **P2 - Null array members return HTTP 500.** POST `/api/config` with
   `{"devices":[null]}` or a device whose `checks` is `[null]` returned an empty
   HTTP 500 response. `JsonDeviceRepository.Validate` dereferences device
   entries around line 478 and `IsValidCheck` dereferences check entries around
   line 515. Reject null members with HTTP 400 before normalization/persistence
   and add regression cases for both save and import paths.
2. **P2 - JSON writes are not atomic.** Configuration and history persistence
   use `File.Create` directly on the destination (`JsonDeviceRepository.cs`
   around line 262 and `JsonMonitorHistoryRepository.cs` around line 201).
   Inspection shows an interruption can leave the file truncated; no crash was
   injected during this review. Write/flush a sibling temporary file, then
   replace the destination atomically, preserving a recovery backup. Review the
   other JSON repositories for the same pattern.
3. **P2 - Unexpected errors do not honor the documented response contract.**
   Exception middleware logs and rethrows (`Program.cs` around line 58). The
   reproduced null-member cases returned empty 500 responses although API.md
   promises controlled problem responses. Add a centralized safe problem
   response with a correlation identifier when the response has not started;
   preserve SSE-specific handling after streaming starts.
4. **P3 - Local runtime selection needs clarification.** Compilation succeeds
   while testhost can fail due to a conflicting per-user .NET installation.
   Document diagnosis and process-scoped runtime selection before changing any
   machine-wide environment configuration.

## Recommended Improvements

1. Correct the input-validation and persistence findings first.
2. Add repeatable browser tests for monitoring, device CRUD/import, profile
   switching, report filtering/deletion and documentation controls. Extend CI
   syntax checks to all documentation JavaScript files.
3. Exercise concurrent runs, disconnect/cancellation, file recovery and larger
   inventories. Define measurable thresholds and evidence for the remaining
   mandatory deployment gates.
4. For shared deployment, implement approved authentication/authorization or
   enforce an authenticated reverse-proxy boundary before broadening access.
5. Consolidate documentation status dates: the previous status file mixed an
   August last-updated marker with October revision notes. Keep historical
   evidence explicitly dated and the current checkpoint at the top.

## Limits

This review did not certify all thirteen deployment gates, exercise real
network inventory, test every CRUD workflow, inject power/process failures,
benchmark load, or validate a production deployment/portable package. GitHub
workflow execution and publication were not performed. Opening a page is a
smoke check, not complete acceptance of all controls on that page.
