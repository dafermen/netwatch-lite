# Device Type Validation - 2026-11-07

## Scope

Profile-scoped device-type catalog, protected legacy classifications, dynamic
device editor and dedicated fresh-inventory catalog mutation. Support Groups
layout changes are a [proposal only](SUPPORT_GROUPS_UX_PROPOSAL.md).

Environment: Windows, .NET SDK 8.0.422 / runtime 8.0.28, Node.js 24.18,
Playwright Chromium desktop 1440x1000 and emulated mobile 390x844. All tests
use synthetic data in isolated temporary roots, not operational inventories.

## Evidence

- Release solution compilation: zero warnings/errors.
- .NET baseline: 194 passed, zero failed/skipped (33 unit, 7 integration,
  154 contract), with Cobertura output under ignored `TestResults/`.
- Browser validation: 38 passed, zero failed/skipped (19 desktop, 19 mobile).
  The complete suite includes the four new desktop/mobile catalog workflows
  plus existing HTTP, inventory, monitoring, profiles, reports and documentation.

Three new unit cases verify legacy defaults, independent list instances and
unique protected IDs/names. Fifty-two new API/contract cases cover protected
types, usage/reference checks, malformed catalogs across save/import, row and
profile-copy preservation, normalized order-independent revisions, fresh row
edits, new usage between read/delete, concurrent catalog edits and stale profile
rejection. In-use counts include monitoring-disabled devices.

The new browser workflows cover create/rename/delete, duplicate-name errors,
filters/search, system/in-use disabled actions, device selection, workstation
isolation, copy/bulk/profile preservation, escaped labels, conflict reload and
failed-load retry without stale rows. The device-editor navigation guard also
preserves a draft when leaving is cancelled. Screenshots use synthetic catalog
data. Desktop/mobile screenshots were visually reviewed; page-width checks
passed with wrapped names and no horizontal page overflow.

An existing HTTP browser case initially filled a numeric field during modal
opening; the delayed focus handler sent those digits to Name. The test now
waits for the modal's shown transform before editing, consistent with the new
catalog tests. No arbitrary delay or retry was added to hide the failure.

## Commands

```powershell
$env:DOTNET_ROOT_X64 = 'C:\Program Files\dotnet'
$env:DOTNET_ROOT = 'C:\Program Files\dotnet'
dotnet build netwatch.sln --configuration Release --no-restore
dotnet test netwatch.sln --configuration Release --no-build --collect "XPlat Code Coverage" --results-directory TestResults
npm run test:e2e
node --check wwwroot/device-types.js
node --check wwwroot/app.js
node --check wwwroot/peripherals.js
node --check tests/e2e/device-types.spec.cjs
git diff --check
```

Browser reports/screenshots/traces are ignored under `playwright-report/` and
`test-results/`. Existing CI discovers the suites; JavaScript checks now include
the new catalog script. Remote CI was not run as part of local testing.

## Final Checks And Limits

New/affected JavaScript syntax checks passed. All 142 local Markdown file links
in 35 documents resolved; git diff whitespace checks passed (only existing
LF/CRLF conversion notices). Fresh publish contains the catalog script, guide,
validation, ADR and Support Groups proposal, without private runtime/backups,
test dependencies or evidence. The owned temporary publish directory was removed.

The normal-data service is active at http://localhost:5000/ (PID 34140 at this
checkpoint). `/`, `/device-types`, `/config`, `/regions`, `/docs/`, type guide/
validation/proposal, `/device-types.js`, `/api/config` and `/api/device-types`
returned HTTP 200. Workstation is protected in the live catalog response. Only
read-only smoke requests were made; no operational inventory edits were made.
The browser fixture cleaned its instances; no isolated browser app processes
remain. Final continuity is recorded in CURRENT_STATUS.md.

Catalog revision guards apply only to the dedicated type endpoint, not all
configuration APIs. Profile switching and profile file writes are not a single
transaction; the captured file path prevents redirection to another profile.
Run one writer process per data directory. Authentication/roles, full load and
cross-browser/device compatibility are not certified here.

Full property/invariant, mutation, fuzz, security, performance, deployment and
other mandatory gates still need evidence or owner-approved exceptions under
[DEPLOYMENT.md](DEPLOYMENT.md). No GitHub push, backend deployment or Support
Groups redesign was requested/performed in this checkpoint.
