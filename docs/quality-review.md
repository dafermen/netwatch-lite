# NetWatch Lite Quality Review

Use this document before an internal release or before asking another developer to continue the project.

## Current Review Scope

Review the current MVP without assuming future Nexus Intelligence capabilities are already implemented. NetWatch Lite currently covers local monitoring, configuration, support groups, themes, reports, local history, local error logging, and local integration settings.

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
- Use Bulk Edit `Collapse All` and `Expand All` after filtering a large facility list.
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
- Confirm Facility Performance, Category Performance, and Recent Runs load collapsed by default and expand on demand.
- Confirm Facility Performance, Category Performance, Recent Runs, and Detailed Monitor History load from the same filtered rows.
- Filter by search, status, mode, facility, category, and date range.
- Confirm category filter options narrow when a facility is selected.
- Confirm summary cards and all report tables match the filtered report rows.
- Sort each table column in Facility Performance, Category Performance, Recent Runs, and Detailed Monitor History.
- Change page size and verify Previous/Next pagination in each report table.
- Export filtered JSON.
- Delete one test execution only when demo/test data can be removed.

## Integrations Flow

- Open Integrations and confirm the default inventory source is `Local JSON`.
- Switch inventory source to `External endpoint` and confirm endpoint URL/method fields are enabled.
- Try saving without an external endpoint URL and confirm validation appears.
- Return inventory source to `Local JSON` before release unless a real integration has been approved.
- Enable outbound report endpoint, confirm URL/method/include options are enabled, then save only test placeholder values.
- Confirm `integrations.json` is created only as runtime data and is not committed.
- Review the documented inbound inventory and outbound report payload examples before implementing external calls.
- Confirm future security notes mention authentication, tokens outside Git, allowlisted destinations, logging, retries, and Microsoft Entra ID.

## Error Logging Flow

- Confirm `app-errors.json` is created only as runtime data.
- Confirm `GET /api/errors` returns a controlled payload.
- Confirm `POST /api/errors/clear` clears the local file.
- Do not commit runtime error data.

## Security And Data Boundaries

- Confirm runtime files are ignored by Git: local config, support group profiles, themes, history, error logs, and integration settings.
- Confirm sample data is generic and safe.
- Confirm the app is not exposed directly to untrusted networks.
- Do not claim Microsoft Entra ID, SSO, user identity, external inventory import, or outbound report delivery as current capabilities.

## Acceptance Criteria

The MVP is ready for an internal checkpoint when:

- `dotnet build` succeeds with no errors.
- `git diff --check` reports no whitespace errors.
- Dashboard, Configuration, Support Groups, Themes, Reports, Integrations, and docs have been reviewed.
- Runtime data is excluded from Git and portable release output.
- `CHANGELOG.md` describes the user-facing changes.
