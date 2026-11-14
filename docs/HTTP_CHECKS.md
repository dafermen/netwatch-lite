# HTTP And HTTPS Checks

For manual Microsoft sign-in/rendered-page validation, use the separate
[authenticated browser check](BROWSER_CHECKS.md). The rules below apply only to
anonymous `type: http`. Redirects remain off by default; opt-in support is below.

## Configure A Web Application

Open Configuration, add/edit a device and choose **HTTP / HTTPS** in its checks.
Enter the complete URL, timeout in milliseconds, expected status and optional
expected response text. Use Full Check or Auto Refresh to execute these checks.
You can add several URLs to one device, or create one record per application.

For HTTP-only devices, the editor can leave Address empty and saves the first
URL's hostname as the address. API/import callers still supply `ip` as before;
it may be a DNS name. HTTP always uses its own URL, not this address or the
separate Website URL shortcut. Website URL alone does not create a check.

For a website-only record, change the initial Ping check to HTTP / HTTPS or
remove Ping after adding the HTTP check; do not leave an unwanted Ping check.
If keeping Ping, Address must be a hostname/IP such as `host.example.invalid`,
not `https://host.example.invalid`. For availability based only on HTTP status,
use the complete URL, expected status 200 and leave Expected text empty.
An HTTP 200 with ExpectedTextMissing means a response arrived but did not match
the configured literal text; it does not mean the endpoint failed to respond.
Text is checked against the backend's anonymous response, not JavaScript-rendered
or signed-in browser content. Execute Full Check, not Ping Only.

```json
{
  "name": "Example application",
  "ip": "app.example.invalid",
  "category": "Web Apps",
  "checks": [
    {
      "type": "http",
      "url": "https://app.example.invalid/health",
      "timeoutMs": 10000,
      "expectedStatusCode": 200,
      "expectedText": "READY"
    }
  ]
}
```

The example host is deliberately non-operational. Use an approved target that
the backend machine can reach, preferably a read-only application health URL.

## Fields And Semantics

| Field | Rule |
| --- | --- |
| `type` | `http` for both HTTP and HTTPS; input is case-insensitive. |
| `url` | Absolute HTTP/HTTPS URL, at most 2048 characters; no credentials, fragments or control characters. A custom port belongs in the URL, not `port`. |
| `timeoutMs` | 100-60000 ms; defaults to 10000. Independent of the global ping/TCP timeout. Applies per attempt, from request through required body reading. |
| `expectedStatusCode` | Exact status 200-599; defaults to 200. Explicitly expecting an error status will count it as successful. |
| `expectedText` | Optional literal, case-sensitive substring, at most 4096 characters. Empty means status-only. Whitespace is preserved. No regex, HTML parsing or JavaScript execution. |
| `followRedirects` | Optional boolean, default false; HTTP-only. Follows up to five 301/302/303/307/308 redirects under one per-attempt deadline. |

HTTP checks send anonymous GET requests with `NetWatch-Lite/1.0` as User-Agent.
They never share cookies or send operator/browser login credentials. By default
a 302 fails expected 200; explicitly expecting 302 only proves that redirect was
returned. **Follow HTTP redirects (including 302)** is a saved, per-check opt-in,
not a global switch or authentication. TLS certificates are validated against the backend
machine's trust store; there is no bypass switch.

Opt-in redirects allow relative and cross-origin HTTP/HTTPS GET destinations.
Only monitor authorized safe-to-GET targets; host/network controls must restrict
destinations. Loops, more than five hops, missing/invalid Location, embedded
credentials, non-HTTP schemes and HTTPS-to-HTTP downgrade are blocked. Fragments
are removed before requesting. Hops and final body share the same attempt timeout;
redirects are not retries. No Authorization, Cookie or Referer is carried along.
Built-in Microsoft login destinations are stopped before fetching; recognizable
authentication/error content is also neutral AuthenticationRequired, not health.
Unknown/custom login pages cannot all be detected: use a stable positive expected
text or an authenticated browser check for protected applications.

If text or redirect following is configured, at most 1 MiB of decompressed body is accepted. The
declared character encoding is used, or UTF-8 when absent. Over-limit and
unsupported-encoding responses fail clearly. Text matching requires the whole
bounded response to finish; finding a substring in an unfinished stream is
not enough. Default no-follow status-only checks finish at response headers and
do not prove body completion. Opt-in checks read the bounded body even without
expected text, to reject recognized login/error documents. This is not rendering.

Existing global concurrency and retry settings apply. With `retryCount=N`,
there are at most N+1 attempts, each with its own timeout and the configured
delay between failures. Total run time also includes queue time and retries.
The displayed HTTP duration is the final attempt, not total run duration.
Device-level latency retains its ICMP meaning; use the individual HTTP
duration for web response timing, not a zero/no-ping device latency.

Configure retries in **Configuration > Settings**: **Retries** accepts 0-5
(0 means one attempt; 2 means at most three after failures), and **Retry delay**
accepts 0-10000 milliseconds between failed attempts. Use **Save Settings**.
These settings belong to the active support group and apply to Ping, TCP and
HTTP; they are not a per-URL retry override. A successful attempt stops retries.
AuthenticationRequired is not retried as an outage.

The HTTP editor has concise English/Spanish helper text below Timeout and Expected text,
following the explicit UI language (English by default).
Timeout is a per-attempt duration, not a ping count; blank expected text checks
only the expected HTTP status. Literal text is case-sensitive and comes from
the anonymous backend response, not a JavaScript-rendered/authenticated browser.
Each row has independent accessible description IDs; mobile fields stack.

Full Check aggregates all configured ping/TCP/HTTP results: all successful is
Healthy, some successful is Degraded, none successful is Down. An HTTP failure
is not hidden by a successful TCP connection. Ping Only skips HTTP and TCP;
the legacy synthetic ping is still used when no ping was configured. A
successful Ping Only run is not evidence that a web application works.

## Results And Diagnostics

Open Diagnostics for separate internal/browser errors and recorded monitoring
failures, searchable references and private filtered exports. Dashboard details
explain 404/redirect/timeout/DNS/TLS/incomplete-response cases without bypassing
security or automatically accepting a failed expectation. New HTTP records include
actual `attempts` and optional transport `diagnosticCode`; old records remain unknown.
Opt-in redirect results additionally include `redirectCount` and `finalUrl`
(query/fragment removed), available in Dashboard details even after success.
See [diagnostics](DIAGNOSTICS.md) and [exact filter execution](DASHBOARD_FILTERS.md).

Dashboard's TCP / HTTP column shows actual status, elapsed time, target and
failure message. Reports show the recorded HTTP checks beside device health;
filtered JSON exports and local history retain those details.

HTTP `CheckResult` adds `url`, `statusCode`, `expectedStatusCode`, `timeoutMs`,
`durationMs` and `message`. `statusCode` can be null before headers arrive, or
present on body-read timeouts. Status strings include:

| Status | Meaning / action |
| --- | --- |
| `Success` | Configured status and optional text matched. |
| `AuthenticationRequired` | Opt-in HTTP reached a known login destination/content; not confirmed health or downtime. Use a browser check. |
| `RedirectBlocked` | Invalid/unsafe destination, loop or more than five hops; inspect the diagnostic code. |
| `UnexpectedStatus` | Inspect the returned code, server health, authentication requirement or redirect. |
| `ExpectedTextMissing` | Check the expected case/content; a 200 error/login/maintenance page is not sufficient. |
| `TimedOut` | Check server latency and reachability; adjust the deadline deliberately. |
| `DnsError` | Verify DNS from the backend host. |
| `ConnectionError` | Verify listener, port, routing, proxy and firewall. |
| `TlsError` | Correct certificate chain, hostname, expiry and backend trust configuration; do not disable validation. |
| `ResponseTooLarge` | Use a smaller health endpoint or remove content matching only when appropriate. |
| `UnsupportedEncoding` | Correct the server's declared charset. |
| `HttpError` / `ResponseReadError` | Inspect malformed, interrupted or incomplete HTTP responses. |

Caller cancellation is propagated, not recorded as a normal website outage.
Expected probe failures are monitoring results, not unexpected application 500s.

## Compatibility And Security

Old ping/TCP configuration and stored history require no migration. New fields
are optional; normalization materializes HTTP defaults on load/save. HTTP
definitions survive device edits/copies, bulk updates, profile copies and JSON
import/export. Old application binaries do not support HTTP checks; back up
configuration before upgrading or rolling back, and do not save new profiles
through an older binary.

rc.16 understands HTTP but not the new redirect flag/recovery UI. The private
rollback pilot covers unchanged existing data, not saving new opt-in definitions
through an older build. Keep the matching rc.17 binary/UI with new configuration;
use verified offline copies for a deliberate rollback.

This adds outbound requests to configured destinations, including internal and
loopback addresses by design. It is not an SSRF-safe public API. Only trusted
operators may reach this unauthenticated tool. Restrict inbound access and
outbound destinations through host/network controls, and only monitor URLs
that are authorized and safe to GET. Avoid tokens in URLs. Full URLs and
expected text remain private operational configuration/export data; results
strip query strings, diagnostics do not echo exceptions/bodies/expected text,
and named HttpClient URL logging is disabled. Host/path are still sensitive;
avoid secrets in path segments as well. Body content is never retained.

No email, webhook, desktop notification, authenticated transaction, browser
journey, background scheduler or certificate-expiry warning was added. Auto
Refresh follows the existing open-dashboard workflow. Operator acceptance on
real approved applications and the thirteen deployment gates remain separate.

## References

The deadline explicitly covers body reads because `ResponseHeadersRead` alone
does not do so; see the [.NET completion-option documentation](https://learn.microsoft.com/dotnet/api/system.net.http.httpcompletionoption).
Transport behavior follows the [.NET SocketsHttpHandler API](https://learn.microsoft.com/dotnet/api/system.net.http.socketshttphandler).
See [testing](TESTING.md), [security](SECURITY.md) and the
[architecture decision](adr/0003-bounded-http-checks.md).
