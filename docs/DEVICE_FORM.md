# Device Form And Configuration Search

## Search Visibility

A nonempty Configuration search opens the matching Facility/category groups so
the device rows are visible immediately. Their Edit/Copy/Delete actions still
use original inventory indexes. Groups can be manually collapsed/expanded while
searching. A new search reveals its matches again; no matches shows the explicit
empty state. Clearing restores the Normal view's default collapsed groups.

Search includes the URL of every HTTP check, not just the optional website
shortcut or the separately stored network identity. Bulk Edit also reveals
matching facilities. Clearing the search restores the
facility-collapse state captured before searching. Search does not save inventory
or run checks. Existing Facility/category filters still intersect Bulk results.

## Classification And Monitoring

Device Type is inventory classification, not a rule that replaces configured checks.
All types keep Name, Facility, Notes, Category and Enabled. Location and Command
are hidden for HTTP-only records; their saved values are retained. Only Workstation
has printer/scanner assignments; changing away from it confirms recorded-inventory
removal, and cancellation retains the draft. Custom types and protected legacy IDs
remain compatible.

New records offer Monitoring preset: Network device (initial Ping) or Web application
(HTTP/HTTPS only). Replacing configured checks requires confirmation. Edit/Copy and
Advanced workflows retain their existing definitions and do not apply a creation
preset. Additional Ping/TCP/HTTP checks can be combined on any device type.

- Network target (IP / hostname) and Hostname appear for Ping/TCP checks.
- Ping by hostname appears only when Ping is present.
- Location and Command appear when Ping/TCP is present, including mixed checks.
- URL to monitor, timeout, expected status and optional literal text belong to
  each HTTP check, independently of device classification.
- Open website link (optional) and Command are grouped under Shortcuts. They open
  a page/copy inert text; they are not monitoring definitions.

The Shortcuts legend has no extra note, keeping the section compact. Command
retains its aria-describedby description about clipboard-only text. HTTP Timeout
and Expected text have associated Spanish descriptions about per-attempt waiting,
retry settings and optional literal response matching, without JavaScript or
browser sessions. Unique IDs keep descriptions attached to their own check.
These notes do not become saved values. Small screens stack the HTTP fields.

Changing visibility never clears a hidden network identity, hostname, shortcut,
Location or Notes. For a new HTTP-only record without a network identity, the
first URL's hostname supplies the existing API's required `ip` field. Editing a
saved HTTP device retains its original identity, even when its URL changes.
Switching an already configured check to another kind confirms replacement;
cancellation retains the original check draft. Network targets reject full HTTP
URLs in the editor, preventing accidental Ping of an HTTPS string.

The API/JSON property names remain `ip`, `hostname`, `websiteUrl`, `command` and
`checks[].url`; label changes do not migrate data. Older JSON remains supported.
See [HTTP checks](HTTP_CHECKS.md), [peripherals](PERIPHERALS.md) and
[storage](STORAGE.md) for their independent contracts.

Saves/imports carry the selected profile precondition; a changed active group
returns 409 instead of applying the old draft to another profile. The editor
shows the error and retains its draft. Cancel/Reload explicitly loads the new
group and its current identity. A failed create/update restores the prior local
inventory snapshot, so retry does not append the same new device twice.

## Saved Record Visibility

After a successful create, edit or copy, Configuration opens the saved device's
Facility/category. A text or Bulk filter is cleared only if it excludes that
record. The next Dashboard visit reveals its enabled, not-yet-checked row and
opens its parents; no monitoring runs automatically. This reveal is scoped to
the current support group. Disabled devices remain disabled and the success
message explains why they are not shown on Dashboard.

Required-field validation and API error details appear inside the device modal.
A failed save retains the draft and restores type-specific disabled controls;
retry does not duplicate the device. Visibility is not evidence of persistence:
regressions also read the saved API, reload and restart the isolated service.
