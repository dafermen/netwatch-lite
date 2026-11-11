# Administration Lists

## Shared Pattern

Support Groups (`/regions`) and Themes (`/themes`) use full-width searchable
lists, a persistent active-item summary, independent selection, row action menus
and explicit loading/empty/error states. They no longer duplicate selection in
a separate dropdown/action card. Keyboard-accessible buttons select rows;
selection alone never activates a profile or theme.

Device Types (`/device-types`) and Peripherals (`/peripherals`) keep their simpler
direct edit/delete icon actions. They share the compact heading, responsive
layout and scoped destructive confirmation dialog. Two-action catalogs are not
forced into multi-action menus. Device types keep their existing profile/version
guards and protected/in-use rules. Peripheral model links still open reverse
lookup in Workstations.

Dashboard, Reports, Configuration and Bulk Edit retain their specialized
monitoring/data-entry layouts. Wide operational tables can still scroll; the
master-list fixes do not remove necessary scrolling elsewhere.

## Support Groups

1. Search by group, region or ID; combine Region and Status filters. Results are
   grouped by region. The active group remains visible even if filters hide it.
2. Select a group name to inspect its selection state without changing the
   active group. Active and Selected badges describe different things.
3. Use its row menu for Set active, Copy and activate, Rename, Delete or Open
   configuration. Open configuration asks before activating an inactive group.
4. New Group identifies the current copy source and offers the existing Copy
   inventory and catalogs checkbox. Checked copies the active profile; unchecked
   uses the backend's existing starter inventory, not an imported external list.
5. Creation and copying activate the resulting profile, as before. The backend
   continues to assign IDs and filenames; renaming preserves profile identity.
6. Deletion shows the exact group name and the expected active group afterward.
   Protected profiles and the last remaining profile cannot be deleted. The
   existing backend archives the deleted profile file locally; other profile
   records and inventories remain intact.

Profile writes retain their existing endpoints and JSON schema. After a
successful operation, the UI reloads active configuration and clears stale
dashboard results. A saved-profile/reload failure is reported distinctly; it is
not presented as a successful monitoring refresh. Naming errors remain inside
the open modal with the draft preserved.

## Themes

The library shows each theme's palette and status. Select its name or Edit
colors/Preview colors to open the editor below the list. This previews only the
selected template: it does not change the active theme or write themes.json.
Built-in themes are read-only; copy one to customize it.

- New, Copy and Rename persist when the naming modal is submitted successfully.
  A second library-wide Save click is no longer required for those operations.
- Color inputs edit a separate draft with an Unsaved changes indicator. Use
  Save Colors to persist it; only the selected template's colors are replaced.
- Editing an inactive template does not apply it globally. Set active changes
  the application palette only after the server confirms the save.
- Failed saves, activation, deletion or restoration retain the last confirmed
  library/active theme. Color/name drafts remain available after save errors.
- Changing the edited theme, closing the editor, reloading the library or
  navigating away (including browser back) asks before discarding dirty colors.
  Cancelling preserves the editor, selection and draft. Page unload also uses
  the browser's standard unsaved-changes warning.
- Delete confirms the target and fallback active theme. Restore defaults is a
  separate library-menu command that confirms removal of all custom templates
  and restoration of the protected built-ins, with NetWatch Default active.

All 22 existing color tokens remain supported, including configuration headers,
category states and dashboard action colors. Existing theme IDs, custom palette
values and built-in protections use the same backend format and normalization.

## Configuration Presentation

The NetWatch Default theme uses light-gray facility/category bands in normal
Configuration and Bulk Edit. Built-in colors are refreshed by the existing
theme normalization; custom palettes, active selection and inventory are not
replaced by this default-color update. Copies of older themes retain their
chosen colors and can be edited through Themes.

Device Edit/Copy/Delete remain direct actions, displayed as three fixed-size
icon buttons on one row with hover titles and accessible names. The Actions
column reserves their width. Narrow screens scroll the table horizontally
instead of stacking the buttons or overflowing the page. Existing collapse,
editing/copying/deletion rules and confirmation requirements are unchanged.

Device deletion also uses the shared transition-safe modal close/focus behavior.
Confirmation or Cancel during the opening animation queues the close until the
dialog is ready, preventing an empty dialog/backdrop from remaining on screen.

## Interaction And Failure Rules

Row menus support Bootstrap's keyboard and Escape behavior. Re-rendering a list
disposes old dropdown instances. Dialogs wait until opening completes before
enabling confirmation/cancel buttons and return focus where possible. Entry
modals preserve the field an operator already focused instead of moving later
keystrokes into Name when the opening transition finishes. Close requests made
during opening are queued until Bootstrap can honor them; fast successful saves
do not leave a reset form stuck on screen.

Mobile master lists stack their rows and wrap long names. They do not inherit
the global minimum width intended for wide monitoring tables. Theme palettes
are real saved color swatches, not screenshots. Icons have accessible names
and titles; protected/in-use actions stay disabled.

Failed reads clear stale rows and disable mutation controls until a successful
retry. No editable default library or fake profile is substituted after a read
failure. The last confirmed application palette can remain on screen while the
theme library is unavailable; that is presentation, not proof of a fresh read.

The shared confirmation applies to top-level catalog/profile/theme deletion and
theme draft discard. Existing specialized device deletion, report deletion and
peripheral assignment/type-change prompts retain their established behavior.

## Data And Deployment Boundary

No migration, new runtime file, backend endpoint or authentication system was
added. Type/profile-scoped inventory and global theme storage stay separate.
Full theme/configuration saves still replace their complete JSON documents;
this UI does not add multi-user version control to those endpoints. Coordinate
editing and run one writer process per data directory. Catalog revision guards
remain specific to Device Types.

Validation uses synthetic profiles/themes and verifies unchanged inventories,
IDs, assignments and unrelated palettes. Do not use operational data in browser
test fixtures or publish runtime files/screenshots containing private inventory.
See [validation](VALIDATION_MANAGEMENT_2026-11-07.md), [testing](TESTING.md),
[operations](OPERATIONS.md) and [ADR 0005](adr/0005-consistent-management-lists.md).
