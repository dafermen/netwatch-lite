# NetWatch Lite Quality Review

Use this document before an internal release or before asking another developer to continue the project.

## Current Review Scope

Review the current MVP without assuming future Nexus Intelligence capabilities are already implemented. NetWatch Lite currently covers local monitoring, configuration, support groups, themes, reports, local history, and local error logging.

## Dashboard Flow

- Start the app locally and open the Dashboard.
- Confirm the dashboard starts in manual mode.
- Run `Run All Facilities` and confirm facility tabs, summary cards, progress, and device rows update.
- Select one facility and confirm the primary button changes to `Run Facility`.
- Run the selected facility and then click `All Facilities`; all facilities should return without refreshing the page.
- Run one category through `Run Group`.
- Run one failed device through the row action when a degraded/down result exists.
- Confirm `Full Check` and `Ping Only` both work and display the expected port behavior.

## Configuration Flow

- Load Configuration and confirm the active support group data appears.
- Add a test device, edit it, copy it, and delete it.
- Save settings and confirm validation errors are clear when values are invalid.
- Use Bulk Edit filters by facility and category.
- Use Bulk Edit `Select Visible`, apply a safe bulk action, and confirm the selection clears after save.
- Export configuration JSON.
- Import a valid JSON file.
- Try invalid import cases: empty file, non-JSON file, malformed JSON, and oversized file.

## Support Groups Flow

- Create a support group profile.
- Copy an existing profile.
- Rename a profile.
- Activate another profile and confirm Dashboard/Configuration use the active profile.
- Delete a non-protected profile and confirm it is archived locally.

## Themes Flow

- Load Themes and confirm `NetWatch Default` and `Corporate Logistics` exist.
- Create a custom theme.
- Copy and rename a custom theme.
- Activate a custom theme.
- Confirm built-in themes cannot be deleted.
- Reset themes only when it is acceptable to remove custom local themes.

## Reports Flow

- Run at least one full check so `monitor-history.json` has data.
- Open Reports and confirm summary cards load.
- Confirm executive tables show facility performance, top problem devices, and recent runs.
- Filter by search, status, mode, facility, category, and date range.
- Sort each table column in Detailed Monitor History.
- Export filtered JSON.
- Clear history only when demo/test data can be removed.

## Error Logging Flow

- Confirm `app-errors.json` is created only as runtime data.
- Confirm `GET /api/errors` returns a controlled payload.
- Confirm `POST /api/errors/clear` clears the local file.
- Do not commit runtime error data.

## Security And Data Boundaries

- Confirm runtime files are ignored by Git: local config, support group profiles, themes, history, and error logs.
- Confirm sample data is generic and safe.
- Confirm the app is not exposed directly to untrusted networks.
- Do not claim Microsoft Entra ID, SSO, user identity, or external integrations as current capabilities.

## Acceptance Criteria

The MVP is ready for an internal checkpoint when:

- `dotnet build` succeeds with no errors.
- `git diff --check` reports no whitespace errors.
- Dashboard, Configuration, Support Groups, Themes, Reports, and docs have been reviewed.
- Runtime data is excluded from Git and portable release output.
- `CHANGELOG.md` describes the user-facing changes.
