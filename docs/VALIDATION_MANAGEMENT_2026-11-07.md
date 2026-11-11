# Management Redesign Validation - 2026-11-07

## Scope

Support Groups/Themes list redesign and shared master-list confirmation/focus/
responsive patterns. Existing profile/theme repositories, API paths and JSON
schemas are unchanged. Tests run on Windows/.NET 8.0.422 (runtime 8.0.28),
Node.js 24.18 and Playwright Chromium at 1440x1000 desktop and 390x844 mobile.

All inventory, profiles and themes are synthetic and isolated under temporary
test content roots. No operational record is used for browser testing.

## Coverage

Ten new workflows run on both viewports:

1. Region-grouped search/filtering, selection without activation or inventory
   writes, active status outside filters, escaped labels and keyboard menus.
2. Profile creation/copy/rename/activation/open-configuration/targeted deletion,
   with device types, peripherals, assignments, settings and HTTP definitions
   retained, and protected-group deletion disabled.
3. Failed activation/create/load, preserved modal draft/active profile, cleared
   stale rows and successful retry without invented default profiles.
4. Theme selection and preview without activation/persistence, all-token color
   save isolation, successful activation and unchanged unrelated inventories.
5. Immediate theme create/copy/rename persistence, stable IDs, escaped names and
   protected originals.
6. Failed save/activation and cancelled draft discard across selection, reload,
   same-page navigation and leaving Themes.
7. Targeted theme deletion/default restoration, cancellation, failure and
   fallback-active semantics.
8. Failed theme read/create, disabled mutation and preserved naming draft.
9. Transition-safe modal focus and queued closing, preserving the field already
   being edited and completing close requests made during opening.
10. Browser-back cancellation/acceptance with a dirty color draft.

Existing Device Types and Peripherals browser tests now exercise the shared
confirmation while retaining their in-use/protected guards. The original
profile-switch workflow uses row actions instead of the removed dropdown.
Existing HTTP, workstation, import/export, monitoring, history and docs flows
remain in the complete suite.

Initial regression found delayed modal autofocus could redirect fast input to
Name. A shared focus handler now tracks the interacted control; regression
tests cover both restored focus and the existing HTTP form workflow. A later
fast-save regression showed Bootstrap ignoring hide during opening; close
requests now wait for the real shown event, with a deterministic lifecycle test.
A mobile test helper also needed to open the translated-offscreen sidebar rather than
treat CSS visibility as viewport reachability. These were not handled with
arbitrary sleeps or skipped tests.

## Commands And Evidence

```powershell
$env:DOTNET_ROOT_X64 = 'C:\Program Files\dotnet'
$env:DOTNET_ROOT = 'C:\Program Files\dotnet'
dotnet build netwatch.sln --configuration Release --no-restore
dotnet test netwatch.sln --configuration Release --no-build --collect "XPlat Code Coverage" --results-directory TestResults
npm run test:e2e
node --check wwwroot/management.js
node --check wwwroot/app.js
node --check wwwroot/peripherals.js
node --check wwwroot/device-types.js
node --check tests/e2e/management.spec.cjs
git diff --check
```

Ignored evidence: `TestResults/`, `playwright-report/` and `test-results/`.
Successful browser tests save synthetic Support Groups, theme library, editor
and actual color-preview screenshots.

## Final Results

- Release build: zero warnings/errors.
- .NET: 194 passed, zero failed/skipped (33 unit, 7 integration, 154 contract),
  with XPlat coverage collected.
- Chromium: 58 passed, zero failed/skipped (29 desktop, 29 mobile), no retries.
  The final full run includes all ten new workflows on both viewports.
- JavaScript syntax and git whitespace checks passed. Local documentation file
  links resolve. Desktop/mobile list, editor and preview screenshots were
  visually reviewed; master-list viewport bounds are also asserted in tests.
- Fresh Release publish contains management.js, the administration guide and
  ADR; private runtime/backups, dependencies and test reports are excluded.
  Its owned temporary publish directory was removed after inspection.
- Normal service restarted on port 5000 (PID 34484 at this checkpoint).
  Application, Support Groups, Themes, Device Types, Peripherals, Configuration,
  docs, new scripts/guides and config/regions/themes APIs returned HTTP 200.
  Operational inventory was not edited; no isolated browser app processes remain.

See [CURRENT_STATUS.md](../CURRENT_STATUS.md) for the current handoff and service
checkpoint. Runtime PID values are historical observations, not startup settings.

## Limits

This is local workflow evidence, not completion of all thirteen deployment
gates. Property/invariant, mutation, fuzz, security, load/resource and full
browser/device/deployment compatibility still need evidence or owner-approved
exceptions under [DEPLOYMENT.md](DEPLOYMENT.md). Browser emulation is not real
device/Safari certification. Full-document theme/config writes still require
coordinated editing; authentication and global multi-editor concurrency are not
added. Remote CI, GitHub publication and backend deployment are separate work.
