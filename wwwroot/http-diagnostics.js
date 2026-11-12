(function (root) {
  'use strict';
  function describe(check) {
    const actual = check.statusCode == null ? null : Number(check.statusCode);
    const expected = check.expectedStatusCode == null ? null : Number(check.expectedStatusCode);
    const status = check.status || 'Unknown';
    let title = 'HTTP check failed';
    let summary = 'The configured response requirements did not match.';
    let action = 'Inspect the web server and proxy from the backend host.';
    if (check.isAvailable) return { title: actual ? `HTTP ${actual}` : 'HTTP check succeeded',
      summary: 'The configured response requirements matched.', action: '', code: status };
    if (status === 'UnexpectedStatus') {
      title = actual ? `HTTP ${actual}` : 'Unexpected HTTP status';
      summary = actual && expected ? `HTTP ${actual}; expected ${expected}.` : 'The response status did not match the configured expectation.';
      if (actual >= 300 && actual < 400) {
        title = `HTTP ${actual} - Redirect`;
        summary += ' Redirects are not followed.';
        action = 'Use the final authorized URL, or explicitly expect the redirect. Browser login sessions are not used.';
      } else if (actual === 404) {
        title = 'HTTP 404 - Not found';
        action = 'Verify the exact URL path and application health endpoint from the backend host.';
      } else if (actual === 401 || actual === 403) {
        title = `HTTP ${actual} - Access required`;
        action = 'This check is anonymous. Use an approved health endpoint that does not require a browser login.';
      } else if (actual >= 500) action = 'The server or gateway reported an error. Inspect its health and server/proxy logs.';
    } else if (status === 'TimedOut') {
      title = 'HTTP timeout';
      summary = check.timeoutMs ? `HTTP check exceeded the ${check.timeoutMs} ms timeout.` : 'The HTTP deadline was exceeded.';
      action = 'Check backend reachability and server latency. Increase the timeout only when the expected response legitimately needs longer.';
    } else if (status === 'ExpectedTextMissing') {
      title = actual ? `HTTP ${actual} - Text not matched` : 'Expected text not matched';
      summary = 'The response did not contain the configured case-sensitive text.';
      action = 'Use a stable literal marker in the anonymous HTTP response, not JavaScript-rendered or signed-in browser content.';
    } else if (status === 'DnsError') {
      title = 'DNS lookup failed'; summary = 'The backend could not resolve the target hostname.';
      action = 'Check the hostname and DNS resolution on the backend computer.';
    } else if (status === 'TlsError') {
      title = 'TLS verification failed'; summary = 'TLS negotiation or certificate validation failed.';
      action = 'Correct the certificate hostname, chain, expiry or backend trust store. Do not disable TLS verification.';
    } else if (status === 'ConnectionError') {
      title = check.diagnosticCode === 'ProxyTunnelError' ? 'Proxy connection failed' : 'Connection failed';
      summary = 'The backend could not establish the HTTP connection.';
      action = 'Check the listener, routing, firewall and system proxy from the backend computer.';
    } else if (status === 'HttpError' || status === 'ResponseReadError') {
      title = check.diagnosticCode === 'ResponseEnded' || status === 'ResponseReadError' ? 'Incomplete HTTP response' : 'Invalid HTTP response';
      summary = check.diagnosticCode === 'ResponseEnded' ? 'The server or proxy closed the connection before the response completed.'
        : 'The backend received an invalid, interrupted or incomplete HTTP response.';
      action = 'Verify HTTP versus HTTPS, server/proxy protocol support and premature connection closure. Do not treat this as an application crash.';
    } else if (status === 'ResponseTooLarge') {
      title = 'Response too large'; summary = 'The response exceeded the 1 MiB text-validation limit.';
      action = 'Use a smaller health endpoint. Remove text matching only if status-only monitoring is sufficient.';
    } else if (status === 'UnsupportedEncoding') {
      title = 'Unsupported response encoding'; summary = 'The server declared an unsupported character encoding.';
      action = 'Correct the response charset on the web server.';
    }
    return { title, summary, action, code: check.diagnosticCode || status };
  }
  const api = Object.freeze({ describe });
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.NetWatchHttpDiagnostics = api;
})(typeof window !== 'undefined' ? window : globalThis);
