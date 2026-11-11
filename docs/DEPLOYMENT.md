# NetWatch Lite Deployment And Release Checklist

Use this checklist before tagging, packaging, demoing, committing a stable
milestone, or deploying the application.

A deployment is not ready until every quality gate below has recorded evidence.
If a gate cannot be executed, document the reason, risk, compensating control,
and project-owner approval before deployment.

## 1. Prepare

- Confirm the working branch contains only intended changes.
- Review `git status --short --untracked-files=all`.
- Review changed files before staging.
- Confirm no real IP inventory, hostnames, credentials, or private support group data are being committed.
- Confirm `.private/` remains private planning material and should not be published externally.

## 2. Build Validation

Run:

```bash
dotnet restore netwatch.sln
dotnet build netwatch.sln --configuration Release --no-restore
dotnet test netwatch.sln --configuration Release --no-build
npm ci --ignore-scripts
npx playwright install chromium
npm run test:e2e
node --check wwwroot/app.js
node --check wwwroot/reports-sql.js
node --check wwwroot/storage.js
node --check wwwroot/peripherals.js
node --check wwwroot/workstations.js
node --check docs/app.js
node --check docs/docs-reading-tools.js
node --check docs/docs-reading-init.js
git diff --check
```

Expected result:

- Build succeeds.
- Automated tests succeed.
- Browser workflows pass and their HTML report/traces are retained as evidence.
- Frontend JavaScript parses successfully.
- No whitespace errors.
- No runtime JSON files are staged.

## 3. Mandatory Pre-Deployment Quality Gates

Record the command, environment, date, result, and evidence location for each
gate.

1. **Acceptance testing**
   - Complete `docs/TESTING.md` against the release candidate.
   - Confirm the delivered behavior matches the approved product requirements.
2. **Unit testing**
   - Run all unit tests for models, validation, repositories, and services.
   - Require all tests to pass with no skipped critical cases.
3. **Property and invariant testing**
   - Verify configuration round trips, stable identifiers, valid state
     transitions, summary totals, and persistence invariants across generated
     inputs.
4. **Mutation testing**
   - Run mutation analysis on critical validation, monitoring, persistence, and
     reporting logic.
   - Review surviving mutations and add tests or document accepted risk.
5. **Fuzz testing**
   - Fuzz JSON imports, API inputs, URLs, filter values, and malformed or
     oversized payloads.
   - Confirm failures are controlled and do not corrupt runtime data.
6. **Integration testing**
   - Test API endpoints with repositories, runtime JSON persistence, monitoring
     services, history, errors, themes, support groups, and integration settings.
7. **Contract testing**
   - Validate API request/response schemas, Server-Sent Events, import/export
     formats, and documented future integration payloads.
8. **End-to-end testing**
   - Exercise the primary browser workflows from startup through monitoring,
     configuration, reporting, and administration.
9. **Regression testing**
   - Run the complete approved regression suite and reproduce checks for
     previously corrected defects that affect the release.
10. **Security testing**
    - Check for committed secrets and operational data, vulnerable dependencies,
      unsafe input handling, path/file exposure, and untrusted network exposure.
11. **Concurrency and resilience testing**
    - Test overlapping monitor runs, busy responses, cancellation, timeouts,
      partial device failures, malformed runtime files, and restart recovery.
12. **Performance and resource testing**
    - Measure response time, monitoring duration, browser responsiveness, memory,
      CPU, file growth, and behavior with large inventories and report history.
13. **Compatibility and deployment testing**
    - Verify supported Windows/runtime combinations, clean-folder startup,
      portable packaging, environment configuration, rollback, and post-deploy
      health checks.

## 4. Functional Smoke Test

- Workstations: check pending/fully-recorded filters, model reverse lookup,
  matching workstation/assignment counts, pagination and reload in desktop/mobile.
- Peripherals: create printer/scanner models in a test profile, assign them to
  a workstation, verify none/unrecorded states, reload/export/import, and confirm
  that an in-use model cannot be deleted. Review [PERIPHERALS.md](PERIPHERALS.md).
- Dashboard: `Run All Facilities`.
- Dashboard: select one facility, run it, return to `All Facilities`.
- Dashboard: run one category.
- Dashboard: run one failed device when available.
- Configuration: add, edit, copy, delete, save settings, export, import, Bulk Edit, Bulk Actions, and Bulk Edit collapse/expand all.
- Support Groups: create, copy, rename, activate, delete a test profile.
- Themes: activate `NetWatch Default`, activate `Corporate Logistics`, create/copy/rename a custom theme.
- Reports: load history, filter, confirm category/facility coherence, review collapsed Facility Performance, Category Performance, Recent Runs, paginate, sort, export filtered JSON, and delete only a test execution.
- Integrations: confirm local JSON mode, endpoint fields, validation, save/reload, runtime-only `integrations.json`, documented payload examples, and future security notes.
- Errors: load `/api/errors` and clear only test data.
- Documentation: open `/docs/`, use search, theme, section navigation,
  previous/next links, the mobile drawer, and both return-to-application links.

## 5. Documentation

- Update `README.md` for user-facing behavior.
- Update `docs/DEVELOPMENT.md` when the developer workflow changes.
- Update `docs/ARCHITECTURE.md` or `docs/API.md` when their contracts change.
- Update `docs/TESTING.md` when new flows are added.
- Update this release checklist when release steps change.
- Update `CHANGELOG.md` with date, version, and user-facing changes.
- Keep private Spanish/English planning documents synchronized when roadmap or strategy changes.

## 6. Runtime Data Review

Do not commit:

- `Data/config.json`
- `Data/regions.json`
- `Data/regions/*.json`
- `Data/themes.json`
- `Data/monitor-history.json`
- `Data/app-errors.json`
- `Data/integrations.json`
- root-level runtime `config.json`, `themes.json`, `monitor-history.json`, `app-errors.json`, or `integrations.json`

## 7. Portable Package Review

Use the versioned generator, not an ad hoc ZIP of the working directory:

```powershell
.\scripts\test-packaging.ps1
.\scripts\publish-portable.ps1 -Version 0.8.0-rc.1
```

Keep the generated folder, ZIP and checksum under `artifacts/portable/` and
`artifacts/packages/` without replacing earlier versions. See [PORTABLE.md](PORTABLE.md)
for exact contents, fail-closed privacy rules, test evidence, startup and rollback.
Package checks supplement, but do not waive, the thirteen gates above. They do
not publish a GitHub Release or approve a stable deployment.

Before publishing a Windows portable package:

- Use `Release` configuration.
- Include `config.sample.json`.
- Exclude operational runtime profiles, history, and error logs.
- Confirm no `*.backup.json` or `.netwatch-*.tmp` files are in the artifact.
- Start the executable on a clean folder.
- Confirm first-run files are created locally.
- Confirm Dashboard, Configuration, Themes, Reports, Integrations, and `/docs/`
  open from the packaged app.

## 8. Commit And Deployment Readiness

Commit only after:

- Functional smoke test is complete.
- All mandatory pre-deployment quality gates have passed or have an approved,
  documented exception.
- Documentation and changelog are updated.
- The user has reviewed the behavior.
- The commit message describes the milestone clearly.
