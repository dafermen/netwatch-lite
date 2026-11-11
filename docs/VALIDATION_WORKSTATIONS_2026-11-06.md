# Workstation Inventory Queries - 2026-11-06

## Scope

Read-only Workstations inventory at `/workstations`, combined search/facility/
model/pending filters, model-to-workstation lookup from the catalog, distinct
workstation and assignment counts, paging and persistent URLs. No backend
schema, runtime file, package or monitoring behavior changed.

Only explicit workstation types are included; unclassified legacy categories
are not inferred. Missing metadata remains Not recorded, while None is fully
recorded. Disabled monitoring records remain inventory records. See
[the operator guide](PERIPHERALS.md#workstation-inventory-view).

## Validation

- .NET regression baseline: 85 tests (11 unit, 7 integration, 67 contract).
- Browser baseline: 24 Chromium workflows across desktop 1440px and mobile 390px.
- Eight new cases cover combined filters/search, None versus unknown, missing
  metadata, explicit types, disabled records, multiple units per workstation,
  model links/reload, unused/missing models, pagination/back navigation, profile
  scope, load-failure clearing/retry, escaped notes and read-only exported data.
- New screenshot evidence is saved as `workstations.png` and
  `model-workstations.png` under `test-results/`. Browser failure traces and
  server logs follow the existing Playwright configuration.
- Mobile validation caught an inherited table minimum-width and layout issue;
  the new table now overrides it locally and stacks records without page
  overflow or pagination controls being obscured.
- CI syntax checking includes the new module. Test instances use separate
  temporary content/data roots and dynamic ports; operational inventory is not
  used by the tests.
- Release build: zero warnings/errors. All 85 .NET and 24 browser tests passed
  without skips; Cobertura evidence is under `TestResults/`.
- JavaScript syntax, local documentation links and Git whitespace checks passed.
- A fresh publish included the Workstations module/guide and excluded private
  backups/test dependencies. The normal service was restored on port 5000;
  application, workstation route/query, script, catalog, docs and config API
  returned HTTP 200.

## Limits

This is current recorded inventory, not live discovery, peripheral health or
HTTP application checking. Queries resolve within the currently active support
group and do not merge catalogs. View refresh reads current server state; it
does not replace Configuration's Reload JSON command for disk edits.
Remote CI, deployment certification and the remaining thirteen quality gates
are separate work. Existing multi-client configuration replacement semantics
remain unchanged; no audit/authentication or CSV import was added.
