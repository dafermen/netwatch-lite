const { test, expect } = require('./fixtures.cjs');

const rows = page => page.locator('#results-body [data-dashboard-device]');
const typedRows = (page, type) => page.locator(`#results-body [data-dashboard-device][data-device-type="${type}"]`);
const runs = async request => (await (await request.get('/api/history')).json()).runs;
const customTypeName = 'Web <application> ' + 'x'.repeat(82);
const device = (name, type, facility = 'Alpha', category = 'Shared') => ({
  name, deviceType: type, ip: '127.0.0.1', facility, category,
  checks: type === 'server' ? [{ type: 'tcp', port: 1 }] : [{ type: 'ping' }]
});

test.beforeEach(async ({ request }) => {
  const config = await (await request.get('/api/config')).json();
  config.deviceTypes.push({ id: 'web-app', name: customTypeName });
  config.settings = { intervalSeconds: 60, timeoutMs: 300, maxParallelChecks: 2, retryCount: 0, retryDelayMs: 0 };
  config.devices = [device('Mirror', 'workstation'), device('Mirror', 'server'),
    device('Beta desk', 'workstation', 'Beta', 'Office'), device('Beta server', 'server', 'Beta', 'Office'),
    device('Network', 'network', 'Alpha', 'Infrastructure'), device('Legacy', undefined, 'Gamma', 'Legacy'),
    device('Portal', 'web-app', 'Alpha', 'Websites'),
    { ...device('Disabled', 'server', 'Hidden'), enabled: false }];
  expect((await request.post('/api/config', { data: config })).ok()).toBeTruthy();
});

test('type filter combines with facility/search/status without writes or widening an empty selection', async ({ page, request }) => {
  const before = await (await request.get('/api/config')).json();
  let executions = 0;
  page.on('request', req => { if (new URL(req.url()).pathname === '/api/monitor/stream') executions++; });
  await page.goto('/');
  await expect(rows(page)).toHaveCount(7);
  await page.locator('#dashboard-device-type').selectOption('workstation');
  await expect(rows(page)).toHaveCount(2);
  await expect(page.locator('#metric-total')).toHaveText('2');
  await expect(page.locator('[data-facility-filter="Alpha"]')).toContainText('1 devices');
  await expect(page.locator('[data-facility-filter="Gamma"]')).toHaveClass(/facility-tab-pending/);
  await page.locator('[data-facility-filter="Alpha"]').click();
  await page.locator('#device-search').fill('Beta');
  await expect(rows(page)).toHaveCount(0);
  await page.locator('#device-search').fill('');
  await page.locator('#dashboard-device-type').selectOption('unspecified');
  await expect(rows(page)).toHaveCount(0);
  await expect(page.locator('#active-facility-label')).toHaveText('Showing Alpha');
  await expect(page.locator('#run-facility-check')).toBeDisabled();
  await expect(page.locator('#run-group-check')).toBeDisabled();
  await page.locator('#dashboard-device-type').selectOption('web-app');
  await expect(rows(page)).toHaveCount(1);
  await expect(page.locator('#group-check-select option')).toHaveText(['All categories', 'Infrastructure', 'Shared', 'Websites']);
  await expect(page.locator('#dashboard-device-type option[value="web-app"]')).toHaveText(customTypeName);
  await expect(page.locator('#dashboard-device-type img')).toHaveCount(0);
  await page.locator('label[for="filter-offline"]').click();
  await expect(rows(page)).toHaveCount(0);
  await page.locator('#clear-dashboard-filters').click();
  await expect(page.locator('#dashboard-device-type')).toHaveValue('');
  await expect(page.locator('#group-check-select')).toHaveValue('');
  await expect(page.locator('#filter-all')).toBeChecked();
  await expect(rows(page)).toHaveCount(7);
  await expect(page.locator('#clear-dashboard-filters')).toBeDisabled();
  expect(executions).toBe(0);
  expect(await runs(request)).toHaveLength(0);
  expect(await (await request.get('/api/config')).json()).toEqual(before);
});

test('group execution intersects type/facility/category and does not mark an identical device of another type', async ({ page, request }) => {
  await page.goto('/');
  await page.locator('#dashboard-device-type').selectOption('workstation');
  await page.locator('[data-facility-filter="Alpha"]').click();
  await page.locator('#group-check-select').selectOption('Shared');
  await page.locator('#device-search').fill('Mirror');
  const requestEvent = page.waitForRequest(req => new URL(req.url()).pathname === '/api/monitor/stream');
  await page.locator('#run-group-check').click();
  const query = new URL((await requestEvent).url()).searchParams;
  expect(Object.fromEntries(query)).toMatchObject({ deviceType: 'workstation', facility: 'Alpha', category: 'Shared' });
  await expect.poll(async () => (await runs(request)).length).toBe(1);
  const saved = (await runs(request))[0];
  expect(saved.results).toHaveLength(1);
  expect(saved.results[0]).toMatchObject({ name: 'Mirror', deviceType: 'workstation' });
  expect(saved.scope).toMatchObject({ deviceType: 'workstation', facility: 'Alpha', category: 'Shared' });
  await expect(page.locator('#dashboard-device-type')).toBeEnabled();
  await page.locator('#clear-dashboard-filters').click();
  await page.locator('#device-search').fill('Mirror');
  await expect(typedRows(page, 'workstation').filter({ has: page.getByText('Mirror', { exact: true }) })).toContainText('Healthy');
  await expect(typedRows(page, 'server').filter({ has: page.getByText('Mirror', { exact: true }) })).toContainText('Not checked');
});

test('facility, individual and failed checks retain the type scope with shared addresses', async ({ page, request }) => {
  await page.goto('/');
  await page.locator('#dashboard-device-type').selectOption('workstation');
  await page.locator('#run-facility-check').click();
  await expect.poll(async () => (await runs(request)).length).toBe(1);
  expect((await runs(request))[0].results.map(result => result.deviceType)).toEqual(['workstation', 'workstation']);
  await page.locator('#clear-dashboard-filters').click();
  await page.locator('#device-search').fill('Mirror');
  await typedRows(page, 'server').filter({ has: page.getByText('Mirror', { exact: true }) }).locator('[data-run-device-name]').click();
  await expect.poll(async () => (await runs(request)).length).toBe(2);
  expect((await runs(request))[1].results).toHaveLength(1);
  expect((await runs(request))[1].scope.deviceType).toBe('server');
  await expect(page.locator('#dashboard-device-type')).toBeEnabled();
  await page.locator('#dashboard-device-type').selectOption('server');
  await page.locator('[data-facility-filter="Alpha"]').click();
  await page.locator('#run-failed-check').click();
  await expect.poll(async () => (await runs(request)).length).toBe(3);
  const retried = (await runs(request))[2];
  expect(retried.scope).toMatchObject({ deviceType: 'server', facility: 'Alpha' });
  expect(retried.results).toHaveLength(1);
  expect(retried.results[0].name).toBe('Mirror');
});

test('automatic executions intersect the current type and facility filters', async ({ page, request }) => {
  await page.goto('/');
  await page.locator('#dashboard-device-type').selectOption('server');
  await page.locator('[data-facility-filter="Alpha"]').click();
  const requestEvent = page.waitForRequest(req => new URL(req.url()).pathname === '/api/monitor/stream');
  await page.locator('#auto-refresh-toggle').click();
  const query = new URL((await requestEvent).url()).searchParams;
  expect(query.get('deviceType')).toBe('server');
  expect(query.get('facility')).toBe('Alpha');
  await expect.poll(async () => (await runs(request)).length).toBe(1);
  await page.locator('#auto-refresh-toggle').click();
  expect((await runs(request))[0].results).toHaveLength(1);
  expect((await runs(request))[0].scope.deviceType).toBe('server');
  await expect(rows(page)).toHaveCount(1);
  await expect(typedRows(page, 'server')).toContainText('Down');
});

test('a removed type never expands a pending filtered run to all devices', async ({ page, request }) => {
  await page.goto('/');
  await page.locator('#dashboard-device-type').selectOption('web-app');
  const config = await (await request.get('/api/config')).json();
  config.devices = config.devices.filter(device => device.deviceType !== 'web-app');
  config.deviceTypes = config.deviceTypes.filter(type => type.id !== 'web-app');
  expect((await request.post('/api/config', { data: config })).ok()).toBeTruthy();
  await page.locator('#run-facility-check').click();
  await expect(page.locator('#last-check')).toContainText('Review the refreshed selection');
  expect(await runs(request)).toHaveLength(0);
  await expect(page.locator('#metric-total')).toHaveText('0');
  await expect(page.locator('#dashboard-device-type')).toHaveValue('web-app');
  await expect(page.locator('#run-facility-check')).toBeDisabled();
  await page.locator('#clear-dashboard-filters').click();
  await expect(rows(page)).toHaveCount(6);
});

test('type selector precedes Category and long catalog names fit desktop and mobile', async ({ page }, testInfo) => {
  await page.goto('/');
  await page.locator('#dashboard-device-type').selectOption('web-app');
  const type = page.locator('.device-type-filter-control');
  const category = page.locator('.group-check-control');
  const left = await type.boundingBox();
  const right = await category.boundingBox();
  expect(left.y < right.y || left.x + left.width <= right.x).toBeTruthy();
  await page.locator('#run-facility-check').click();
  await expect(page.locator('#last-check')).toContainText('execution:');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBeTruthy();
  expect(await type.evaluate(element => element.scrollWidth <= element.clientWidth)).toBeTruthy();
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
  await page.screenshot({ path: testInfo.outputPath('device-type-filter.png'), fullPage: true });
});
