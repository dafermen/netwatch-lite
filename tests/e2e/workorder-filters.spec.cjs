const { test, expect } = require('./fixtures.cjs');
const rows = page => page.locator('#results-body [data-dashboard-device]');
const history = async request => (await (await request.get('/api/history')).json()).runs;

test.beforeEach(async ({ request }) => {
  const config = await (await request.get('/api/config')).json();
  const item = (name, type, facility, category, checks) => ({ name, deviceType: type, facility, category, ip: '127.0.0.1', checks });
  config.settings = { intervalSeconds: 60, timeoutMs: 150, retryCount: 0, retryDelayMs: 0, maxParallelChecks: 2 };
  config.devices = [item('Desk Alpha', 'workstation', 'Alpha', 'Office', [{ type: 'ping' }]),
    item('Desk Beta', 'workstation', 'Beta', 'Office', [{ type: 'ping' }]),
    item('Portal Alpha', 'other', 'Alpha', 'Websites', [{ type: 'http', url: 'http://127.0.0.1:1/healthA', timeoutMs: 100 }]),
    item('Portal Beta', 'other', 'Beta', 'Websites', [{ type: 'http', url: 'http://127.0.0.1:1/healthB', timeoutMs: 100 }]),
    item('Server Alpha', 'server', 'Alpha', 'Network', [{ type: 'tcp', port: 1 }]),
    { ...item('Paused desk', 'workstation', 'Alpha', 'Office', [{ type: 'ping' }]), enabled: false }];
  expect((await request.post('/api/config', { data: config })).ok()).toBeTruthy();
});

test('Dashboard run controls stay disabled until the revision snapshot finishes loading', async ({ page, request }) => {
  let release, entered;
  const gate = new Promise(resolve => { release = resolve; });
  const started = new Promise(resolve => { entered = resolve; });
  await page.route('**/api/monitor/inventory', async route => { entered(); await gate; await route.continue(); });
  try {
    await page.goto('/');
    await started;
    await expect(page.locator('#dashboard-device-type')).toBeDisabled();
    await expect(page.locator('#run-group-check')).toBeDisabled();
    await expect(page.locator('#run-facility-check')).toBeDisabled();
    for (const button of await page.locator('#results-body [data-run-device-index]').all()) await expect(button).toBeDisabled();
  } finally { release(); }
  await expect(page.locator('#dashboard-device-type')).toBeEnabled();
  await expect(page.locator('#run-group-check')).toBeEnabled();
  expect(await history(request)).toHaveLength(0);
});

test('Run selection works with only Device Type and checks exactly the visible enabled inventory', async ({ page, request }) => {
  await page.goto('/');
  await page.locator('#dashboard-device-type').selectOption('workstation');
  await expect(rows(page)).toHaveCount(2);
  await expect(page.locator('#group-check-select')).toHaveValue('');
  await expect(page.locator('#run-group-check')).toBeEnabled();
  await page.locator('#run-group-check').click();
  await expect.poll(async () => (await history(request)).length).toBe(1);
  expect((await history(request))[0].results.map(item => item.name).sort()).toEqual(['Desk Alpha', 'Desk Beta']);
  expect((await history(request))[0].scope.selectionCount).toBe(2);
  await expect(page.locator('#last-run-receipt')).toBeVisible();
  await expect(rows(page).first()).toBeVisible();
  await expect(page.locator('#run-group-check')).toBeEnabled();
  await page.locator('#run-group-check').click();
  await expect.poll(async () => (await history(request)).length).toBe(2);
});

test('Facility, Category and the live textbox constrain execution even before search debounce settles', async ({ page, request }) => {
  await page.goto('/');
  await page.locator('#dashboard-device-type').selectOption('other');
  await page.locator('[data-facility-filter="Alpha"]').click();
  await page.locator('#group-check-select').selectOption('Websites');
  await page.locator('#device-search').fill('healthA');
  await page.locator('#run-group-check').click();
  await expect.poll(async () => (await history(request)).length).toBe(1);
  const run = (await history(request))[0];
  expect(run.results).toHaveLength(1);
  expect(run.results[0].name).toBe('Portal Alpha');
  expect(run.scope).toMatchObject({ facility: 'Alpha', category: 'Websites', deviceType: 'other', selectionCount: 1 });
  await page.locator('#show-last-run').click();
  await expect(page.locator('#last-run-body')).toContainText('Portal Alpha');
  await expect(page.locator('#last-run-body')).toContainText('/healthA');
  await expect(page.locator('#last-run-body')).not.toContainText('Portal Beta');
});

test('Configuration uses the shared filters in Normal and Bulk and grouping does not change inventory', async ({ page, request }, testInfo) => {
  const before = await (await request.get('/api/config')).json();
  await page.goto('/config');
  await expect(page.locator('#add-device')).toBeEnabled();
  await page.locator('#config-grouping').selectOption('deviceType');
  await expect(page.locator('.config-facility-row')).toContainText(['Workstation', 'Server', 'Other'].sort());
  await page.locator('#config-device-type-filter').selectOption('other');
  await page.locator('#config-facility-filter').selectOption('Alpha');
  await page.locator('#config-category-filter').selectOption('Websites');
  await page.locator('#config-device-search').fill('healthA');
  await expect(page.locator('.config-device-row')).toHaveCount(1);
  await expect(page.locator('.config-device-row')).toBeVisible();
  await page.locator('#config-bulk-view').click();
  await expect(page.locator('[data-bulk-index]')).toHaveCount(1);
  expect(await (await request.get('/api/config')).json()).toEqual(before);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBeTruthy();
  await page.screenshot({ path: testInfo.outputPath('shared-config-filters.png'), fullPage: true });
  await page.reload();
  await expect(page.locator('#config-grouping')).toHaveValue('deviceType');
});

test('Quick pause and resume retain the device and skip it in monitoring without deleting its settings', async ({ page, request }) => {
  const config = await (await request.get('/api/config')).json();
  config.devices[0].notes = 'Original private notes';
  config.devices[0].location = 'Desk 8';
  config.devices[0].command = 'literal clipboard text';
  expect((await request.post('/api/config', { data: config })).ok()).toBeTruthy();
  const original = (await (await request.get('/api/config')).json()).devices[0];
  await page.goto('/config');
  await expect(page.locator('#add-device')).toBeEnabled();
  await page.locator('#config-device-search').fill('Desk Alpha');
  const toggle = page.locator('#config-devices-body [data-monitoring-index="0"]');
  await toggle.uncheck();
  await expect.poll(async () => (await (await request.get('/api/config')).json()).devices[0].enabled).toBe(false);
  expect((await (await request.get('/api/config')).json()).devices[0]).toEqual({ ...original, enabled: false });
  await expect(toggle).not.toBeChecked();
  await toggle.check();
  await expect.poll(async () => (await (await request.get('/api/config')).json()).devices[0].enabled).toBe(true);
  expect((await (await request.get('/api/config')).json()).devices[0]).toEqual(original);
  await page.goto('/');
  await page.locator('#dashboard-monitoring').selectOption('paused');
  await expect(rows(page)).toHaveCount(1);
  await expect(rows(page)).toContainText('Monitoring paused');
  await expect(page.locator('#run-group-check')).toBeDisabled();
  await expect(page.locator('#metric-availability')).toHaveText('-');
});

test('A changed inventory requires review before a filtered run instead of silently checking new targets', async ({ page, request }) => {
  await page.goto('/');
  await page.locator('#dashboard-device-type').selectOption('workstation');
  const config = await (await request.get('/api/config')).json();
  config.devices[0].name = 'Updated desk';
  expect((await request.post('/api/config', { data: config })).ok()).toBeTruthy();
  await page.locator('#run-group-check').click();
  await expect(page.locator('#last-check')).toContainText('Review the refreshed selection');
  expect(await history(request)).toHaveLength(0);
  await expect(rows(page)).toHaveCount(2);
  await page.locator('#run-group-check').click();
  await expect.poll(async () => (await history(request)).length).toBe(1);
  expect((await history(request))[0].results).toHaveLength(2);
});

test('Automatic monitoring respects the same active filters as the visible website selection', async ({ page, request }) => {
  await page.goto('/');
  await page.locator('#dashboard-device-type').selectOption('other');
  await page.locator('[data-facility-filter="Alpha"]').click();
  await page.locator('#group-check-select').selectOption('Websites');
  await page.locator('#auto-refresh-toggle').click();
  await expect.poll(async () => (await history(request)).length).toBe(1);
  await page.locator('#auto-refresh-toggle').click();
  expect((await history(request))[0].results.map(item => item.name)).toEqual(['Portal Alpha']);
});

test('A removed facility remains unavailable and cannot silently broaden the next run', async ({ page, request }) => {
  await page.goto('/');
  await page.locator('[data-facility-filter="Alpha"]').click();
  const config = await (await request.get('/api/config')).json();
  config.devices = config.devices.filter(item => item.facility !== 'Alpha');
  expect((await request.post('/api/config', { data: config })).ok()).toBeTruthy();
  await page.locator('#run-group-check').click();
  await expect(page.locator('#last-check')).toContainText('Review the refreshed selection');
  await expect(page.locator('#active-facility-label')).toHaveText('Showing Alpha');
  await expect(rows(page)).toHaveCount(0);
  await expect(page.locator('#run-group-check')).toBeDisabled();
  expect(await history(request)).toHaveLength(0);
});

test('Editing through shared Configuration facets reveals the saved row when its classification changes', async ({ page }) => {
  await page.goto('/config');
  await expect(page.locator('#add-device')).toBeEnabled();
  await page.locator('#config-device-type-filter').selectOption('workstation');
  await page.locator('#config-facility-filter').selectOption('Alpha');
  await page.locator('#config-category-filter').selectOption('Office');
  await page.locator('#config-device-search').fill('Desk Alpha');
  await page.locator('[data-edit-device="0"]').click();
  await page.locator('#device-type').selectOption('server');
  await page.locator('#device-facility').fill('Beta');
  await page.locator('#device-category').fill('New category');
  await page.locator('#submit-device').click();
  await expect(page.locator('#device-form-modal')).toBeHidden();
  await expect(page.locator('[data-edit-device="0"]')).toBeVisible();
  await expect(page.locator('#config-device-type-filter')).toHaveValue('');
  await expect(page.locator('#config-facility-filter')).toHaveValue('');
  await expect(page.locator('#config-category-filter')).toHaveValue('');
});
