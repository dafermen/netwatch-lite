# Diagnostics And HTTP Guidance

## Separate Sources

Open Diagnostics. Application errors lists unexpected backend exceptions,
handled HTTP 500 responses and bounded browser reports. Monitoring failures lists
failed/degraded evaluations already stored in history. Website 404, 302, timeout
or invalid HTTP responses are not internal application crashes and are not
duplicated into app-errors.

Both tabs support search, dates, paging, detail, refresh and private JSON/CSV
export of all matching records, not just the page. Application search accepts
reference, source, exception/message or request path; monitoring search uses
recorded inventory identity fields. Filter changes invalidate reads/exports.
Exports recheck revisions across pages, cap at 100000 records and abort stale/
failed reads rather than downloading partial success. CSV cells neutralize formulas.

Responses have `X-NetWatch-Trace`; unexpected Problem responses include `traceId`.
Search that reference without sharing private exception screenshots. Detail labels
follow the UI language; Original technical detail retains the escaped original.
Handled 500 paths have generic records when no thrown exception is available.
Startup failures before the HTTP pipeline remain in process stdout/stderr.

## Website Failures

| Result | Check from the backend computer |
| --- | --- |
| 404 | Exact path and approved health URL |
| 302/redirect | Final authorized URL or deliberately expected redirect; no browser login reuse |
| 401/403 | Anonymous access; not an authenticated browser check |
| 5xx | Application/gateway health and server/proxy logs |
| Timeout | Routing/response time and legitimate deadline; not a ping count |
| Text missing | Literal case-sensitive anonymous response, not JavaScript-rendered content |
| DNS/connection/proxy | DNS, listener, routes, firewall and system proxy |
| TLS | Correct certificate/trust/hostname/expiry; never disable verification |
| Invalid/incomplete HTTP | HTTP versus HTTPS, protocol and premature closure |

The UI uses owned guidance rather than raw transport exceptions. HTTP explicitly
uses HTTP/1.1 with downgrade allowed (the existing default), strict TLS, no cookies
or redirects. Optional `diagnosticCode` identifies transport reasons and `attempts`
records actual HTTP attempts. Do not invent measurements for older history.

## Storage And Privacy

Errors use the selected JSON/SQLite repository; schema 2 is unchanged. New writes
and diagnostic projections bound/sanitize message, stack and user agent, strip URL
credentials/query/fragment, redact common token/password/Authorization patterns
and omit request query strings. The monitoring projection excludes response bodies,
expected text, Commands, Location and Notes. Consultation never probes a target.

Redaction is defense in depth, **not guaranteed anonymization**. Hostnames, paths,
names and arbitrary free text remain sensitive. Exports are private and need
review before sharing. Legacy stored errors are not rewritten. `/api/errors`
remains compatible; `/api/diagnostics` sanitizes legacy entries on read.

The browser collector sends error/rejection/resource metadata, not DOM, forms,
response bodies or automatic stack captures. It strips URL secrets, deduplicates
and caps at 20/minute; the backend has an application-wide 30/minute limit and
bounded fields. The claimed source is not an authenticated identity. No deletion
UI or outbound log delivery is added. Startup failures remain console records.

Protect this unauthenticated app behind trusted local/network controls. Retention
follows existing error/history policies. See [API](API.md), [HTTP](HTTP_CHECKS.md),
[storage](STORAGE.md) and [validation](VALIDATION_MULTILINGUAL_2026-11-12.md).
