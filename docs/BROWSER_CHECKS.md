# Authenticated Browser Checks

## Configure And Sign In

Use this separate check when an approved read-only application redirects to
Microsoft sign-in. Anonymous [HTTP checks](HTTP_CHECKS.md) remain unchanged.

1. In Configuration, add/edit an item. Replace unwanted Ping with **Authenticated
   browser**, or deliberately retain mixed checks. Enter the full application
   URL, including query values, e.g. `https://app.example.invalid/BIP?bldg=LAB`.
   Never save a Microsoft login URL, authorization callback, tokens or credentials.
2. Set Timeout (1000-60000 ms; default 15000). Expected status is always 200.
   Expected text is optional, case-sensitive visible body text. A stable marker
   from the authenticated page gives stronger validation.
3. Save. In the saved Dashboard/Configuration row choose **Sign in**. A dedicated
   Edge window opens on the PC running NetWatch, not a remote viewer's PC.
   Complete login/MFA yourself, then choose **Finish sign-in**. A recognized login
   or wrong destination cannot become ready. A non-auth error/content mismatch
   at the application can be confirmed and subsequently recorded as a failure.
4. Full Check/Run evaluates the item/current filtered selection. Auto checks reuse
   ready sessions. Unfinished sign-in is not navigated or interrupted by checks.
   Ping Only does not execute this check.
5. **Close browser session** discards the context. Up to four contexts, each with
   one page, exist. Close another context to free a slot. Login must use same-tab
   redirects; popup-based login is not supported and extra pages are closed.

Manage sessions from localhost on the same PC. The endpoint rejects remote IPs,
forwarded requests, non-local Host, missing custom header and mismatched/missing
Origin. It validates saved profile/revision/key/check index: no draft/stale/paused
row, arbitrary URL, credentials or browser-state upload/download API.

## Requirements And Trust

- Windows x64 portable: installed Microsoft Edge, interactive Windows desktop and
  corporate network access. Windows services/session 0 cannot perform manual
  login. Group policy, proxy or Conditional Access can block this browser; never
  bypass corporate controls.
- Portable includes the driver, not Edge or login state. No automated password
  entry/MFA, personal-profile reuse, certificate bypass or persistent login. This
  feature does not authenticate NetWatch itself.
- Non-persistent contexts are separate from the personal browser. NetWatch never
  calls StorageState or imports/exports cookies. Edge can use ordinary temporary
  OS/browser files; this is not a forensic secure-erasure guarantee.
- Sessions expire after 60 minutes without evaluation or eight hours absolute,
  browser/service closure, or a changed row/profile binding detected on the next
  session action/evaluation. Restart, portable
  copy or replacement requires manual login again. Identity-provider cookie/token
  lifetimes are independent of these limits.
- Top-level navigation permits application origin and exact Microsoft origins:
  `https://login.microsoftonline.com`, `https://login.microsoft.com`,
  `https://login.windows.net`, `https://login.live.com`. Configure up to eight
  approved additional HTTPS origins for federation, one per line/comma-separated.
  No wildcard, credentials, path, query or fragment. HTTP is accepted only for
  loopback tests. Subresources/iframes load normally; this is not a network
  sandbox or general SSRF defense.

## Results

| Result | Meaning |
| --- | --- |
| Healthy / Success | Intended origin/path/query, HTTP 200, nonempty visible content, no recognized login/error page and optional text matched. |
| Sign-in required / AuthenticationRequired | Missing/unready session, identity-provider redirect, visible password/login field, 401/403 or recognized AADSTS/Windows-auth error. Not downtime. |
| Down / Unavailable or TimedOut | Ready browser failed to load within deadline or received a non-auth HTTP error. Check TLS/network/proxy/site before concluding root cause. |
| Down / ValidationFailed | Application response/content did not pass configured validation. |
| Not evaluated / Unknown | Unscoped legacy run, unavailable browser, blocked redirect or wrong destination. Neither offline nor healthy. |

Mixed checks retain Degraded semantics when only part can be validated.
AuthenticationRequired/Unknown are excluded from offline counts and measured
availability denominators. Reports/history retain their distinct status; sample
health ratios are not time-based uptime.

Basic access validation is not a complete functional test. It cannot recognize
every custom login/error screen returned with HTTP 200. Configure a stable
positive Expected text when that distinction matters. Required query values must
survive login return, preventing silent validation of another facility. Extra
query values may exist; paths and query keys/values are case-sensitive. Fragment
destinations are not accepted; hash-router applications need separate support.

One attempt per evaluation, with a total deadline; global network retries do not
repeat browser checks. Cancellation/deadline closes the dedicated context to stop
pending navigation; login may be required again. Stored results contain sanitized
configured origin/path, status, duration and generic messages, not HTML, cookies,
headers, redirect URLs or identity-provider error details.

## API And Compatibility

```json
{"type":"browser","url":"https://app.example.invalid/BIP?bldg=LAB",
 "timeoutMs":15000,"expectedStatusCode":200,"expectedText":null,
 "authenticationOrigins":["https://sso.example.invalid"]}
```

`POST /api/browser-sessions`: saved `profileId`, `revision`, opaque `key`,
`checkIndex`, `action` (`open`, `ready`, `close`, `status`). Requires header
`X-NetWatch-Browser: 1`, exact same-origin loopback request; 30 requests/minute.
Returns state/presence/readiness/generic message, never account data. 409=stale
scope, 403=local-origin guard, 400=invalid action/definition, 503=browser unavailable.

Use `/api/monitor/plans` and single-use SSE selection to evaluate browser checks.
Legacy unscoped runs return NotEvaluated rather than reuse an ambiguous duplicate
row's session. Numeric device statuses 0/1/2 are unchanged; 3=AuthenticationRequired,
4=Unknown. SQLite stays schema 2. JSON copy/import/export preserves definitions,
not sessions.

Older versions do not understand `type: browser`. The compatibility pilot proves
rollback of existing pre-feature data, not support for new browser definitions in
rc.15. After creating them, review a compatible export or restore a pre-change
backup offline into a new folder before downgrading; never overwrite a live DB.

Tests use synthetic loopback login flows, never real corporate SSO. The operator
must accept real login/MFA/Conditional Access, a successful check and an expired
session on the target PC. See [validation](VALIDATION_BROWSER_2026-11-12.md).
