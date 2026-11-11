# Reports And Historical Evaluations

Reports reads the existing local monitoring history. Opening, filtering,
drilling down or exporting does not execute checks, change inventory or rewrite
stored runs. These are historical observations, not live device status.

## Views

- Summary opens with recorded results grouped by Facility or Category. Groups
  from different regions/support groups remain separate. Selecting a group
  opens its matching device evaluations.
- Runs lists executions with their original scope, mode and run duration.
  Matching/recorded counts distinguish the filtered subset from the complete
  recorded execution. Empty executions remain visible for metadata-only filters
  and cannot invent device evaluations.
- Devices lists individual historical evaluations with device identity,
  recorded time, result and mode. Its detail panel shows recorded ping/TCP/HTTP
  checks, codes/messages and execution context. View execution retains the
  current filters; Device history clears search/result/execution selection,
  selects that exact identity, and retains period/mode.

Desktop tables have sortable headers. Mobile rows expose the same information
without horizontal table scrolling and provide an Order selector. Tab arrows,
Home/End, detail Escape/Close and browser back are supported. Opening/closing
transitions retain focus and do not leave a modal backdrop behind.

## Filters And Time

All three views and exports share search, historical support group/region,
Facility, Category, result, mode and period. Reports explicitly starts with all
recorded support groups, not the Dashboard's active profile. Historical names
are not looked up or rewritten from today's configuration.

Today, Last 7 days and Last 30 days use inclusive browser-local calendar dates;
Custom dates accepts open bounds. An inverted range is an error, not an outage.
All recorded history can include legacy rows without valid dates; bounded date
filters exclude those rows. CSV timestamps are UTC, while the screen uses the
browser's locale/time zone. The coverage header reflects stored history bounds,
not a promise of continuous monitoring or full retention for that interval.

Filter chips remove individual criteria; Clear all retains the selected view.
Changing support group resets dependent Facility/Category/execution/device
criteria; changing Facility resets Category/execution/device criteria.
Unavailable selections do not silently broaden a refreshed report.

## Metric Definitions

- Runs counts matching executions, including recorded zero-result executions
  when no device/result-specific filter excludes them.
- Unique devices counts distinct, case-insensitive recorded identity tuples:
  region, support group, Facility, Category, name and address. This is not an
  asset-ID-based physical-device census; historical renames/address changes can
  appear separately.
- Evaluations counts device results across matching executions. Several
  evaluations of the same device are not several unique devices.
- Problem evaluations counts recorded Down or Degraded results, not unknowns.
- Healthy evaluations is Healthy / (Healthy + Degraded + Down). Unknown status
  values are neutral and excluded from that denominator. No known-status data
  produces a dash, not 0% or 100%. This replaces the misleading historical
  Avg availability label; it is not time-based uptime or an SLA.
- Avg ping uses recorded successful ping latency, with a legacy latency-field
  fallback when no checks were stored. Missing values and HTTP-only defaults
  are not fabricated zero-millisecond pings. Run duration is not device latency.

All modes can combine Full and Ping Only observations. Select a mode before
comparing results; Ping Only does not establish HTTP/TCP health.

## Refresh And Deletion

Loading/read failure clears stale results, summaries and detail, and disables
export/deletion until a successful retry. Late responses cannot overwrite a
newer report snapshot. No-history, no-match, invalid-range and failed-read states
are distinct.

Delete execution is a secondary Runs menu action with shared confirmation. It
targets the recorded run, not the filtered subset or active Dashboard profile.
The UI applies deletion only after server success; cancellation/failure retains
the confirmed snapshot. Leaving Reports invalidates pending confirmation.
In SQLite mode, deletion invalidates queued SQL refreshes and renders its busy
state without starting another query. Refresh runs after the write settles,
avoiding a stale revision or ignored mutation response when storage is slower.

Legacy duplicate run IDs remain readable and unchanged. Browser snapshot keys
distinguish their executions/evaluations; they are not new persisted IDs. The UI
disables deletion when an ID is ambiguous. The existing backend ID-based API is
unchanged: do not use it directly to resolve ambiguous legacy IDs. A selected
snapshot key that disappears after refresh remains unavailable until cleared.

## Export And Privacy

Export CSV for Excel or JSON includes every matching evaluation, not only the
visible page. Neither format includes unfiltered rows. JSON retains the derived
row fields and exact recorded text/check values, with additive filter/context
fields and nullable missing measurements. It is not a raw history backup or a
configuration import file.

CSV uses UTF-8 BOM, quoted fields, doubled quotes and CRLF record separators.
It includes UTC times, identity, mode, raw run ID, run duration, ping latency,
checks JSON and applied-filter JSON. A text prefix is added to formula-like
or leading-control text cells, including full-width formula prefixes. This is
a mitigation for initial spreadsheet import, not a universal spreadsheet
safety guarantee after editing/saving/reopening. See [security](SECURITY.md).
Use JSON when exact text round trips are required.
If Excel uses a different regional delimiter, import the UTF-8 CSV with comma
as the separator; this download is not an XLSX workbook.

Exports contain private operational data. Protect them like local history;
they are not sent to an external integration automatically. Command text stays
out of monitoring history and these report rows.

## Compatibility And Next Steps

The original redesign first shipped in rc.4. Candidate rc.11 adds SQLite schema-2
projections with SQL filtering/aggregation/sorting/pagination. Metrics and summaries
cover the whole filter, not just the displayed page. Query payloads omit unrelated
run results; complete exports fetch matching pages under a shared revision token
and abort when history changes. Above 100000 evaluations select a smaller period.
JSON mode retains the compatible client-side implementation and all legacy history
endpoints remain available. See [storage](STORAGE.md) for upgrade, retention and
identity limits; archived portables stay immutable.

Trends, compatible-run comparison, print/PDF output, durable asset identities
and complete accessibility/performance certification are future work. Complete
the thirteen [deployment gates](DEPLOYMENT.md) before deployment; local browser
coverage is not production approval.
