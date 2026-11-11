# 0003 - Bounded HTTP Application Checks

## Status

Accepted - 2026-11-06.

## Context

ICMP/TCP availability does not prove that an application returns the required
page or health response. Operators need URL checks without losing existing
profile compatibility, execution limits or local history.

## Decision

Add `http` definitions to the existing per-device check list for HTTP/HTTPS.
Use anonymous GET, exact expected status and optional literal response text.
Use a named pooled HttpClient with a linked cancellation deadline spanning
headers and required body reads, a 1 MiB decompressed body limit, normal TLS
validation, no cookie state and no automatic redirects. Reuse existing retry,
concurrency, Full/PingOnly, SSE and history flows. Preserve old ping/TCP data.

Store HTTP diagnostics as additive optional result fields. Do not persist
bodies or URL query strings in results and disable named-client URL logging.
Validation rejects credentials, fragments and unsupported schemes before save.
The service stays restricted to trusted operators; private target addresses
are legitimate here and must be constrained by deployment network controls.

## Consequences

Operators see failures even when TCP is available. Login redirects cannot
silently become successful login pages. Health checks do not emulate a browser,
render JavaScript, authenticate or follow multistep application flows. A
configured expected 503 is intentionally successful; select expectations with
care. Retries extend total elapsed execution beyond the per-attempt timeout.
Downgrading to an old binary requires a compatible backed-up configuration.

## Alternatives Considered

- TCP-only checks cannot validate HTTP status/content.
- Browser automation for every check would add authentication, resource and
  lifecycle complexity beyond this read-only probe feature.
- Automatic redirects could mask an authentication/maintenance failure.
- Blocking private targets would prevent the intended internal monitoring;
  the unauthenticated tool must not be published as a public URL checker.
