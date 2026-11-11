# Support Groups UX Proposal

Status: delivered in the management redesign - 2026-11-07. This proposal was
separate from the earlier device-type checkpoint. See the current
[administration guide](ADMINISTRATION.md) and
[validation record](VALIDATION_MANAGEMENT_2026-11-07.md). The sections below
preserve the original rationale and delivery plan.

## Observed Friction

The current screen represents profile selection twice: a dropdown/action panel
and a clickable table. Selection highlighting can be mistaken for the active
group; both states are different. Actions are distant from the row they affect.
The three-column list also inherits the global 48rem minimum table width,
which explains unnecessary horizontal scrolling in the supplied desktop image.

## Recommended Direction

Use one full-width, work-focused list grouped by Region, with a compact toolbar
for search, region/status filters and New Group. Keep an Active support group
label visible above the list; highlight selection independently of the Active
badge. Avoid the separate left selection/action card and duplicate dropdown.

Each row should show Group, Region, status and a compact action menu for Set
Active, Copy, Rename and Delete. Provide a direct Open Configuration command.
Keep protected/delete constraints visible through lock indicators and tooltips;
confirm deletion with the exact group name and the resulting active selection.
Use a modal for create/rename, with explicit blank-versus-copy initialization.

Scope width rules to this table (`min-width: 0`, predictable columns and wrapped
names) instead of changing every table in the app. On mobile, use stacked rows
with the group name, region, status and the same action menu, not horizontal
scrolling. Reuse existing Bootstrap/Font Awesome styling and restrained colors.

## Safe Delivery Sequence

1. Fix layout/width and add search/filtering without changing profile storage.
2. Consolidate selection/activation and move actions into rows, retaining IDs,
   protected-group rules and existing API paths.
3. Validate selection versus active state, create/copy/rename/delete, switching
   failure, loading/empty/error states, browser back, keyboard and mobile use.
4. Consider inventory counts or previews only after deciding how to read
   inactive profiles efficiently; do not imply those counts exist today.

Profile deletion/copy/activation needs isolated-data regression evidence before
delivery. Existing authentication and single-writer limitations still apply.
