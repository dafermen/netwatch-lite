# NetWatch Lite Internal Release Checklist

Use this checklist before tagging, packaging, demoing, or committing a stable milestone.

## 1. Prepare

- Confirm the working branch contains only intended changes.
- Review `git status --short --untracked-files=all`.
- Review changed files before staging.
- Confirm no real IP inventory, hostnames, credentials, or private support group data are being committed.
- Confirm `.private/` remains private planning material and should not be published externally.

## 2. Build Validation

Run:

```bash
dotnet build
git diff --check
```

Expected result:

- Build succeeds.
- No whitespace errors.
- No runtime JSON files are staged.

## 3. Functional Smoke Test

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

## 4. Documentation

- Update `README.md` for user-facing behavior.
- Update `docs/developer-guide.md` when architecture or developer workflow changes.
- Update `docs/quality-review.md` when new flows are added.
- Update this release checklist when release steps change.
- Update `CHANGELOG.md` with date, version, and user-facing changes.
- Keep private Spanish/English planning documents synchronized when roadmap or strategy changes.

## 5. Runtime Data Review

Do not commit:

- `Data/config.json`
- `Data/regions.json`
- `Data/regions/*.json`
- `Data/themes.json`
- `Data/monitor-history.json`
- `Data/app-errors.json`
- `Data/integrations.json`
- root-level runtime `config.json`, `themes.json`, `monitor-history.json`, `app-errors.json`, or `integrations.json`

## 6. Portable Package Review

Before publishing a Windows portable package:

- Use `Release` configuration.
- Include `config.sample.json`.
- Exclude operational runtime profiles, history, and error logs.
- Start the executable on a clean folder.
- Confirm first-run files are created locally.
- Confirm Dashboard, Configuration, Themes, Reports, and Integrations open from the packaged app.

## 7. Commit Readiness

Commit only after:

- Functional smoke test is complete.
- Documentation and changelog are updated.
- The user has reviewed the behavior.
- The commit message describes the milestone clearly.
