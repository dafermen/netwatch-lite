const { test, expect } = require('./fixtures.cjs');

const workstation = (name, facility) => ({
  name, ip: '127.0.0.1', hostname: `${name.toLowerCase().replaceAll(' ', '-')}.example.test`,
  facility, category: 'Workstations', deviceType: 'workstation', enabled: true, checks: [{ type: 'ping' }]
});
const inventory = () => ({
  settings: { intervalSeconds: 60, timeoutMs: 500, maxParallelChecks: 2, retryCount: 0, retryDelayMs: 0 },
  devices: [workstation('Desk A one', 'Alpha'), workstation('Desk A two', 'Alpha'), workstation('Desk B', 'Beta'),
    { ...workstation('Portal <img onerror=alert(1)>', 'Alpha'), category: 'Servers', deviceType: 'server',
      websiteUrl: 'https://example.test/help', checks: [{ type: 'tcp', port: 9 }, { type: 'http', url: 'http://127.0.0.1:9/unique-portal', timeoutMs: 100 }] },
    { ...workstation('Disabled desk', 'Hidden site'), enabled: false }]
});
const rows = page => page.locator('#results-body [data-dashboard-device]');
const row = (page, name) => rows(page).filter({ has: page.getByText(name, { exact: true }) });
const history = async request => (await (await request.get('/api/history')).json()).runs;

test.beforeEach(async ({ request }) => {
  expect((await request.post('/api/config', { data: inventory() })).ok()).toBeTruthy();
});

test('dashboard searches untested inventory without executions, false failures or inventory writes', async ({ page, request }, testInfo) => {
  const before = await (await request.get('/api/config')).json();
  let executions = 0;
  page.on('request', req => { if (new URL(req.url()).pathname === '/api/monitor/stream') executions++; });
  await page.goto('/');
  await expect(rows(page)).toHaveCount(4);
  await expect(page.locator('#metric-total')).toHaveText('4');
  await expect(page.locator('#metric-offline')).toHaveText('0');
  await expect(page.locator('#metric-availability')).toHaveText('-');
  await expect(page.locator('#results-body .fa-spin')).toHaveCount(0);
  await expect(page.locator('[data-facility-filter="Hidden site"]')).toContainText('0 devices');
  await page.locator('#device-search').fill('desk b');
  await expect(rows(page)).toHaveCount(1);
  await expect(row(page, 'Desk B')).toBeVisible();
  await expect(row(page, 'Desk B')).toContainText('Not checked');
  await page.locator('[data-facility-filter="Alpha"]').click();
  await expect(page.locator('#results-body')).toContainText('No devices match');
  await expect(page.locator('#active-facility-label')).toHaveText('Showing Alpha');
  await page.locator('#device-search').fill('DESK-A-ONE.EXAMPLE.TEST');
  await expect(row(page, 'Desk A one')).toBeVisible();
  await expect(page.locator('.category-counts')).toContainText('1 not checked');
  await page.locator('#device-search').fill('127.0.0.1');
  await expect(rows(page)).toHaveCount(3);
  await page.locator('#device-search').fill('unique-portal');
  await expect(row(page, 'Portal <img onerror=alert(1)>')).toBeVisible();
  await expect(row(page, 'Portal <img onerror=alert(1)>')).toContainText('TCP not checked');
  await expect(row(page, 'Portal <img onerror=alert(1)>')).toContainText('HTTP not checked');
  await expect(row(page, 'Portal <img onerror=alert(1)>').locator('img')).toHaveCount(0);
  for (const filter of ['offline', 'online', 'problems']) {
    await page.locator(`label[for="filter-${filter}"]`).click();
    await expect(rows(page)).toHaveCount(0);
  }
  await page.locator('label[for="filter-all"]').click();
  await expect(rows(page)).toHaveCount(1);
  await page.locator('#device-search').fill('desk');
  await expect(rows(page)).toHaveCount(2);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await page.screenshot({ path: testInfo.outputPath('dashboard-before-check.png'), fullPage: true });
  const width = await page.evaluate(() => ({ actual: document.documentElement.scrollWidth, viewport: document.documentElement.clientWidth }));
  expect(width.actual).toBeLessThanOrEqual(width.viewport);
  expect(executions).toBe(0);
  expect(await history(request)).toEqual([]);
  expect(await (await request.get('/api/config')).json()).toEqual(before);
});

test('group runs intersect facility, category and textbox, preserving all unselected inventory', async ({ page, request }) => {
  await page.goto('/');
  await expect(rows(page)).toHaveCount(4);
  await page.locator('[data-facility-filter="Alpha"]').click();
  await page.locator('#device-search').fill('Desk A one');
  await expect(rows(page)).toHaveCount(1);
  await page.locator('#group-check-select').selectOption('Workstations');
  const scopedRequest = page.waitForRequest(req => new URL(req.url()).pathname === '/api/monitor/stream');
  await page.locator('#run-group-check').click();
  const scopedUrl = new URL((await scopedRequest).url());
  expect(scopedUrl.searchParams.get('facility')).toBe('Alpha');
  expect(scopedUrl.searchParams.get('category')).toBe('Workstations');
  await expect(page.locator('#last-check')).toContainText('Last Alpha / Workstations execution:');
  let runs = await history(request);
  expect(runs).toHaveLength(1);
  expect(runs[0].results.map(result => result.name).sort()).toEqual(['Desk A one']);
  expect(runs[0].scope.facility).toBe('Alpha');
  expect(runs[0].scope.category).toBe('Workstations');
  await page.locator('[data-facility-filter="Beta"]').click();
  await expect(page.locator('#active-facility-label')).toHaveText('Showing Beta');
  await page.locator('#device-search').fill('Desk B');
  await expect(row(page, 'Desk B')).toBeVisible();
  await expect(row(page, 'Desk B')).toContainText('Not checked');
  await expect(page.locator('#metric-offline')).toHaveText('0');
  await page.locator('[data-facility-filter=""]').click();
  await page.locator('#device-search').fill('');
  await page.locator('#group-check-select').selectOption('Workstations');
  const allRequest = page.waitForRequest(req => new URL(req.url()).pathname === '/api/monitor/stream');
  await page.locator('#run-group-check').click();
  expect(new URL((await allRequest).url()).searchParams.has('facility')).toBe(false);
  await expect(page.locator('#last-check')).toContainText('Last Workstations execution:');
  runs = await history(request);
  expect(runs).toHaveLength(2);
  expect(runs[1].results.map(result => result.name).sort()).toEqual(['Desk A one', 'Desk A two', 'Desk B']);
  expect(runs[1].results.some(result => result.name.startsWith('Portal'))).toBe(false);
  await page.locator('[data-facility-filter="Alpha"]').click();
  await page.locator('#group-check-select').selectOption('Workstations');
  await page.locator('#device-search').fill('Desk A one');
  await page.locator('label[for="filter-online"]').click();
  await page.locator('#clear-dashboard-filters').click();
  await expect(page.locator('#active-facility-label')).toHaveText('Showing all facilities');
  await expect(page.locator('#device-search')).toHaveValue('');
  await expect(page.locator('#group-check-select')).toHaveValue('');
  await expect(page.locator('#filter-all')).toBeChecked();
  await expect(rows(page)).toHaveCount(4);
  await expect(page.locator('#clear-dashboard-filters')).toBeDisabled();
  expect(await history(request)).toHaveLength(2);
});

test('a pending device can run alone while other searchable rows remain untested', async ({ page, request }, testInfo) => {
  await page.goto('/');
  await page.locator('#device-search').fill('Desk A one');
  await expect(row(page, 'Desk A one')).toBeVisible();
  await row(page, 'Desk A one').locator('[data-run-device-name]').click();
  await expect(page.locator('#last-check')).toContainText('Last Desk A one execution:');
  const runs = await history(request);
  expect(runs).toHaveLength(1);
  expect(runs[0].results.map(result => result.name)).toEqual(['Desk A one']);
  await row(page, 'Desk A one').locator('[data-run-device-name]').click();
  await expect.poll(async () => (await history(request)).length).toBe(2);
  expect((await history(request))[1].results.map(result => result.name)).toEqual(['Desk A one']);
  await page.locator('#device-search').fill('Desk B');
  await expect(row(page, 'Desk B')).toBeVisible();
  await expect(row(page, 'Desk B')).toContainText('Not checked');
  await page.locator('label[for="filter-offline"]').click();
  await expect(rows(page)).toHaveCount(0);
  await page.locator('label[for="filter-all"]').click();
  await expect(row(page, 'Desk B')).toBeVisible();
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await page.screenshot({ path: testInfo.outputPath('dashboard-partial-check.png'), fullPage: true });
  expect(await history(request)).toHaveLength(2);
});

test('failed dashboard reload hides stale inventory and retry restores pending search', async ({ page, isMobile }) => {
  await page.goto('/');
  await page.locator('#device-search').fill('Desk B');
  await expect(row(page, 'Desk B')).toBeVisible();
  await page.route('**/api/config', route => route.request().method() === 'GET'
    ? route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'Synthetic inventory unavailable' }) }) : route.continue());
  if (isMobile) await page.locator('#sidebar-toggle').click();
  await page.locator('a.nav-link[data-route="/"]').click();
  await expect(page.locator('#last-check')).toContainText('Synthetic inventory unavailable');
  await page.locator('#device-search').fill('Desk B');
  await expect(rows(page)).toHaveCount(0);
  await expect(page.locator('#results-body')).toContainText('Inventory unavailable');
  await expect(page.locator('#run-facility-check')).toBeDisabled();
  await expect(page.locator('#run-group-check')).toBeDisabled();
  await page.unroute('**/api/config');
  if (isMobile) await page.locator('#sidebar-toggle').click();
  await page.locator('a.nav-link[data-route="/"]').click();
  await page.locator('#device-search').fill('Desk B');
  await expect(row(page, 'Desk B')).toBeVisible();
  await expect(row(page, 'Desk B')).toContainText('Not checked');
});

test('facility and category header bands toggle once while run controls remain independent', async ({ page }) => {
  await page.goto('/');
  await expect(rows(page)).toHaveCount(4);
  await page.locator('#run-facility-check').click();
  await expect(page.locator('#last-check')).toContainText('Last execution:');
  const alpha = page.locator('.facility-section').filter({ has: page.locator('.facility-title', { hasText: 'Alpha' }) });
  const facilityBody = alpha.locator(':scope > .collapse');
  await expect(facilityBody).toHaveClass(/show/);
  await alpha.locator('.facility-run-button').click();
  await expect(page.locator('#last-check')).toContainText('Last Alpha execution:');
  await expect(facilityBody).toHaveClass(/show/);
  await alpha.locator('.facility-title').click();
  await expect(facilityBody).toHaveClass('collapse');
  await alpha.locator('.facility-title').click();
  await expect(facilityBody).toHaveClass(/collapse show/);
  const category = alpha.locator('.category-section').filter({ has: page.getByRole('heading', { name: 'Workstations', exact: true }) });
  const categoryBody = category.locator(':scope > .collapse');
  await category.locator('.category-run-button').click();
  await expect(page.locator('#last-check')).toContainText('Last Alpha / Workstations execution:');
  await expect(categoryBody).toHaveClass(/show/);
  await category.locator('.category-header h2').click();
  await expect(categoryBody).toHaveClass('collapse');
  await category.locator('.category-header h2').click();
  await expect(categoryBody).toHaveClass(/collapse show/);
  await category.locator('.category-toggle').click();
  await expect(categoryBody).toHaveClass('collapse');
  await category.locator('.category-toggle').press('Enter');
  await expect(categoryBody).toHaveClass(/collapse show/);
  await alpha.locator('.facility-counts').click();
  await expect(facilityBody).toHaveClass('collapse');
});

test('single-row execution includes category when another category shares its name and address', async ({ page, request }) => {
  const config = inventory();
  config.devices.push({ ...config.devices[0], category: 'Servers', deviceType: 'server' });
  expect((await request.post('/api/config', { data: config })).ok()).toBeTruthy();
  await page.goto('/');
  await page.locator('[data-facility-filter="Alpha"]').click();
  await page.locator('#device-search').fill('Desk A one');
  const selected = page.locator('.category-section').filter({ has: page.getByRole('heading', { name: 'Workstations', exact: true }) });
  await expect(selected.locator('[data-run-device-name]')).toHaveCount(1);
  await selected.locator('[data-run-device-name="Desk A one"]').click();
  await expect.poll(async () => (await history(request)).length).toBe(1);
  const run = (await history(request))[0];
  expect(run.results).toHaveLength(1);
  expect(run.results[0].name).toBe('Desk A one');
  expect(run.results[0].category).toBe('Workstations');
  expect(run.scope.category).toBe('Workstations');
});
