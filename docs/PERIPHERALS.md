# Printer And Scanner Inventory

## Scope

The Peripheral Catalog at `/peripherals` stores reusable manufacturer/model
records for printers and scanners in the active support-group inventory.
Configuration at `/config` assigns physical peripherals to devices explicitly
marked as `workstation`. A device's category is still only a display grouping.
Device types now have their own [catalog](DEVICE_TYPES.md); Workstation's key
and name remain protected. Custom types cannot enable peripheral behavior by
name, and existing workstation assignments require no migration.

Catalogs are scoped to each support group, not shared globally. Copying a
profile carries its catalog and assignments together; creating an independent
profile starts with an empty catalog. Configuration export/import includes both.
There is no new runtime file, database or external dependency.

## Operator Flow

1. Select the intended support group.
2. Open Peripherals and add a Printer or Scanner manufacturer/model. Existing
   models can be searched, filtered and edited. A model in use cannot be deleted
   or changed to the other kind; remove its assignments first.
3. In Configuration, add/edit a device and choose Device Type: Workstation.
4. Record printers and scanners separately as Not recorded, None or Assigned.
5. For Assigned, add one or more items and select each item's catalog model,
   USB/Network/Other connection, Wireless/Cabled Link type, optional local
   name/asset ID, address and notes. Leave Link type as Not recorded if unknown.
6. Save the device. Expand its inventory summary in Configuration or Dashboard
   to inspect the recorded models and connection details.

Not recorded means unknown, not confirmed absence. None means confirmed absence.
Assigned requires at least one item. Multiple physical units of the same model
are supported; use names/asset IDs to distinguish them. Only Network items have
an address field. Changing a connection away from Network clears its address.
Link type is independent: changing Wireless/Cabled does not enable, clear or
replace the network address or USB/Network/Other connection. Its missing legacy
value is unknown, never inferred as Cabled from USB. Several units of the same
model may have different links, so this field belongs to the assignment, not
the reusable catalog model.
Changing a recorded workstation to another device type requires confirmation
before the form removes the peripheral information. Changes take effect on save.
Opening Manage catalog from the device editor also asks before discarding an
unsaved device draft; cancel the prompt to keep editing it.

Device copy preserves inventory metadata; review physical identifiers on the
copy. Normal/bulk editing, row saves and profile copying preserve the fields.

## Workstation Inventory View

Open `/workstations` to consult the current support group's recorded inventory.
Only explicit `deviceType: "workstation"` records are included. Legacy category
names do not reclassify devices; disabled monitoring devices are still inventory
records and remain visible. This view reads configuration without saving it or
starting any ping/TCP/peripheral checks.

Search covers workstation name/address/hostname/facility/category, catalog
manufacturer/model/ID, assignment asset ID/address and notes. Facility, model
and inventory-state filters combine as an intersection:

- All workstations: all explicit workstations in the active group.
- Any not recorded: printer or scanner inventory is unrecorded.
- Printers not recorded / Scanners not recorded: the selected group is unknown.
- Fully recorded: both groups are either None or Assigned.

Missing workstation peripheral metadata is unrecorded, never None. Header totals
describe the complete active group; the matching summary and pagination describe
the filtered result. Expand Assigned to read each unit's model, connection, link type, asset
ID, address and notes. Results are ordered by workstation name and paginated at
25 rows by default, with 10/25/50/100 row choices. Mobile records stack vertically.

Select a model name in Peripherals to open its reverse lookup. Each configured
workstation appears once, even when several of its units use the same model.
The summary separately counts matching assignments across all matched workstations,
not only the current page. Unused or unavailable models return no matching rows;
they never silently fall back to all workstations.

Filters and page position are retained in the URL for reload/back navigation:
`/workstations?model=printer-a&inventory=pending&facility=North`. Supported keys
are `model`, `inventory` (`all`, `pending`, `printers`, `scanners`, `recorded`),
`facility`, `q`, `size` and `page`. Reset filters returns to the unfiltered first
page with the default size. Links resolve against the currently active support
group, not a globally shared model catalog. Reload retrieves current server
configuration; use Configuration's Reload JSON for externally edited files.

If loading fails, the view clears old rows/counters and offers Reload rather
than showing another profile's stale inventory. Search terms in URLs remain
internal operational information, like the inventory itself.

## JSON Contract

New fields are optional. Old configurations need no migration and retain
`deviceType: "unspecified"`, no workstation inventory, and an empty catalog.
Nothing is inferred from categories such as Workstations. Omitted printer or
scanner groups default to unrecorded. Explicitly null catalog/group/items or
null list members are invalid.

```json
{
  "peripheralCatalog": [
    { "id": "printer-a", "kind": "printer", "manufacturer": "Example", "model": "Laser A" },
    { "id": "scanner-a", "kind": "scanner", "manufacturer": "Example", "model": "Scan A" }
  ],
  "devices": [
    {
      "name": "Desk A",
      "ip": "127.0.0.1",
      "deviceType": "workstation",
      "checks": [{ "type": "ping" }],
      "workstationPeripherals": {
        "printers": {
          "status": "assigned",
          "items": [{
            "modelId": "printer-a",
            "connection": "network",
            "linkType": "wireless",
            "identifier": "Front desk printer",
            "address": "192.0.2.10",
            "notes": "Operator-maintained inventory"
          }]
        },
        "scanners": { "status": "none", "items": [] }
      }
    }
  ]
}
```

Supported device types: `unspecified`, `workstation`, `server`, `network`,
`other`. Workstation inventory is allowed only on a workstation. Each group has
`status` (`unrecorded`, `none`, `assigned`) and `items`. Each item has `modelId`,
`connection` (`usb`, `network`, `other`), optional `linkType` (`unrecorded`,
`wireless`, `cabled`), `identifier`, `address`, `notes`.
Printer groups reference printer models; scanner groups reference scanner models.
Tokens/IDs are trimmed and lowercased; display names and notes are trimmed.
Missing/null/blank linkType becomes unrecorded. Other nonempty values are
rejected before saving/importing. The UI offers Not recorded, Wireless, Cabled;
read-only summaries show Link not recorded for legacy/unknown links. This does
not make an assigned group unrecorded or change pending-inventory filters.

Limits: 500 catalog models, 50 items per group, ID 80 characters, manufacturer
100, model 150, identifier 200, address 253, notes 1000. IDs and manufacturer/model
combinations within a kind must be unique (case-insensitive). Only assigned
groups may contain items; an assigned group cannot be empty. USB/Other items
must not contain a network address.

## Persistence And Compatibility

GET/POST `/api/config`, row saves and multipart import/export are the existing
API surface. A complete configuration includes `peripheralCatalog`; validate
the entire document before replacing it. Removing an in-use catalog record or
providing a missing/wrong-kind reference returns HTTP 400 and leaves disk/cache
unchanged. Catalog and assignments share the same atomic file replacement and
backup as the rest of the support-group configuration.

Import replaces the complete active inventory, including its catalog. Importing
a legacy file therefore resets catalog/assignments to its absent/default state.
Keep a configuration export/backup before replacing inventory. Older builds may
discard unknown fields on save; use the updated build to edit peripheral data.
Portable rc.7 first preserves the separate linkType; rc.6 and older archives are
unchanged. Back up privately before using older binaries/clients that may drop it.

## Monitoring And Privacy

This is manually recorded inventory, not automatic USB discovery, driver health,
SNMP polling or physical presence detection. An assigned peripheral is not
necessarily connected/working. Peripheral addresses never initiate checks. To
monitor a network printer, add a separate normal monitored device with its IP
and checks. Dashboard inventory summaries show the current configuration;
existing monitor-history records do not gain peripheral snapshots retroactively.

Catalogs, asset IDs/serial numbers, notes and addresses are private operational
data in the already ignored runtime profiles. Sample data must remain synthetic.

See [testing](TESTING.md) and [architecture decision](adr/0002-profile-scoped-peripherals.md).
