const { test } = require('node:test');
const assert = require('node:assert/strict');
const filters = require('../../wwwroot/inventory-filters.js');
const diagnostics = require('../../wwwroot/http-diagnostics.js');

test('Filter intersections never broaden a selection and do not mutate inventory (2000 generated cases)', () => {
  let state = 1234567;
  const random = maximum => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state % maximum; };
  for (let index = 0; index < 2000; index++) {
    const item = { name: `Device ${random(10)}`, deviceType: ['workstation', 'server', 'other'][random(3)],
      facility: ['A', 'B'][random(2)], category: ['Office', 'Web'][random(2)], enabled: random(3) !== 0,
      status: ['Healthy', 'Down', 'Degraded', 'Pending'][random(4)], isOnline: random(2) === 1,
      configuredChecks: [{ type: 'http', url: `http://127.0.0.1/check${random(5)}` }], notes: '<script>literal</script>' };
    const before = JSON.stringify(item);
    const first = { deviceType: ['workstation', 'server', 'other'][random(3)] };
    const combined = { ...first, facility: ['A', 'B'][random(2)], category: ['Office', 'Web'][random(2)], monitoring: 'enabled' };
    if (filters.matches(item, combined)) { assert.ok(filters.matches(item, first)); assert.notEqual(item.enabled, false); }
    assert.equal(filters.matches(item, { deviceType: 'removed-type' }), false);
    assert.equal(filters.search(item, '<script>literal</script>'), true);
    assert.equal(filters.search(item, item.configuredChecks[0].url.toUpperCase()), true);
    assert.equal(JSON.stringify(item), before);
    if (!item.enabled) for (const status of ['online', 'offline', 'problems', 'pending']) assert.equal(filters.status(item, status), false);
  }
});

test('HTTP explanations separate status failures, transport failures and text expectations without exposing raw errors', () => {
  const cases = [
    [{ status: 'UnexpectedStatus', statusCode: 404, expectedStatusCode: 200 }, 'HTTP 404 - Not found', 'exact URL'],
    [{ status: 'UnexpectedStatus', statusCode: 302, expectedStatusCode: 200 }, 'HTTP 302 - Redirect', 'final authorized URL'],
    [{ status: 'TimedOut', timeoutMs: 10000 }, 'HTTP timeout', 'reachability'],
    [{ status: 'ExpectedTextMissing', statusCode: 200 }, 'HTTP 200 - Text not matched', 'stable literal'],
    [{ status: 'HttpError', diagnosticCode: 'ResponseEnded' }, 'Incomplete HTTP response', 'premature connection'],
    [{ status: 'TlsError' }, 'TLS verification failed', 'Do not disable TLS'],
    [{ status: 'ConnectionError', diagnosticCode: 'ProxyTunnelError' }, 'Proxy connection failed', 'system proxy']
  ];
  for (const [value, title, action] of cases) {
    const result = diagnostics.describe({ ...value, isAvailable: false, message: 'PRIVATE RAW EXCEPTION' });
    assert.equal(result.title, title); assert.ok(result.action.includes(action));
    assert.ok(!JSON.stringify(result).includes('PRIVATE'));
  }
  assert.equal(diagnostics.describe({ status: 'Unknown' }).title, 'HTTP check failed');
  assert.equal(diagnostics.describe({ isAvailable: true, statusCode: 200 }).title, 'HTTP 200');
});
