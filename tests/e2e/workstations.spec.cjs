const { test, expect } = require('./fixtures.cjs');

const group = (status, items = []) => ({ status, items });
const assignment = (modelId, identifier, connection = 'usb', address = '', notes = '') => ({ modelId, identifier, connection, address, notes });
function workstation(name, facility, printers, scanners, extra = {}) {
  const device = { name, ip: '127.0.0.1', facility, category: 'Desks', deviceType: 'workstation', checks: [{ type: 'ping' }], ...extra };
  if (printers || scanners) device.workstationPeripherals = { printers: printers || group('unrecorded'), scanners: scanners || group('unrecorded') };
  return device;
}
const catalog = [
  { id: 'laser', kind: 'printer', manufacturer: 'Example', model: 'Laser A' },
  { id: 'scan', kind: 'scanner', manufacturer: 'Example', model: 'Scanner A' },
  { id: 'unused', kind: 'scanner', manufacturer: 'Example', model: 'Scanner B' }
];
const inventory = () => ({ peripheralCatalog: catalog, devices: [
  workstation('Desk Alpha', 'North', group('assigned', [
    assignment('laser', 'USB-A'),
    assignment('laser', 'NET-A', 'network', '192.0.2.20', '<img src=x onerror="window.inventoryInjected=true">')
  ]), group('none'), { hostname: 'alpha.example.invalid' }),
  workstation('Desk Beta', 'South', group('assigned', [assignment('laser', 'NET-B', 'network', '192.0.2.21')]), group('unrecorded')),
  workstation('Desk Gamma', 'North', group('unrecorded'), group('assigned', [assignment('scan', 'SCAN-G')]), { enabled: false }),
  workstation('Desk Delta', 'North'),
  workstation('Desk Epsilon', 'South', group('none'), group('none')),
  { name: 'Legacy Desk', ip: '127.0.0.1', category: 'Workstations', checks: [{ type: 'ping' }] },
  { name: 'Server A', ip: '127.0.0.1', deviceType: 'server', checks: [{ type: 'ping' }] }
] });
const rows = page => page.locator('[data-workstation-row]');
const row = (page, name) => rows(page).filter({ has: page.getByText(name, { exact: true }) });

test.beforeEach(async ({ request }) => {
  expect((await request.post('/api/config', { data: inventory() })).ok()).toBeTruthy();
});

test('pending filters distinguish unrecorded from none and search is read-only', async ({ page, request }, testInfo) => {
  const before = await (await request.get('/api/config/export')).json();
  await page.goto('/workstations');
  await expect(page.locator('#workstations-total')).toHaveText('5');
  await expect(page.locator('#workstations-pending')).toHaveText('3');
  await expect(page.locator('#workstations-recorded')).toHaveText('2');
  await expect(rows(page)).toHaveCount(5);
  await expect(page.locator('#workstations-body')).not.toContainText('Legacy Desk');
  await expect(page.locator('#workstations-body')).not.toContainText('Server A');
  await expect(row(page, 'Desk Gamma')).toContainText('Monitoring disabled');

  const state = page.locator('#workstation-inventory-filter');
  await state.selectOption('pending');
  await expect(rows(page)).toHaveCount(3);
  await expect(page.locator('#workstations-body')).not.toContainText('Desk Epsilon');
  await state.selectOption('printers');
  await expect(rows(page)).toHaveCount(2);
  await expect(row(page, 'Desk Gamma')).toBeVisible();
  await expect(row(page, 'Desk Delta')).toBeVisible();
  await state.selectOption('scanners');
  await expect(rows(page)).toHaveCount(2);
  await expect(row(page, 'Desk Beta')).toBeVisible();
  await state.selectOption('recorded');
  await expect(rows(page)).toHaveCount(2);
  await expect(row(page, 'Desk Epsilon')).toContainText('None');
  await state.selectOption('all');
  await page.locator('#workstation-facility-filter').selectOption('North');
  await expect(rows(page)).toHaveCount(3);
  await page.locator('#workstation-model-filter').selectOption('laser');
  await expect(rows(page)).toHaveCount(1);
  await expect(page.locator('#workstations-match-summary')).toContainText('2 assignments');
  await page.locator('#reset-workstation-filters').click();

  for (const [query, expected] of [['NET-B', 'Desk Beta'], ['alpha.example.invalid', 'Desk Alpha'], ['192.0.2.20', 'Desk Alpha'], ['Scanner A', 'Desk Gamma']]) {
    await page.locator('#workstation-search').fill(query);
    await expect(rows(page)).toHaveCount(1);
    await expect(rows(page)).toContainText(expected);
  }
  await page.locator('#workstation-search').fill('no-such-inventory');
  await expect(rows(page)).toHaveCount(0);
  await expect(page.locator('#workstations-body')).toContainText('No workstations match');
  await page.locator('#reset-workstation-filters').click();
  await row(page, 'Desk Alpha').locator('[data-label="Printers"] summary').click();
  await expect(row(page, 'Desk Alpha')).toContainText('<img src=x');
  expect(await page.evaluate(() => window.inventoryInjected)).toBeUndefined();
  await expect(row(page, 'Desk Alpha').locator('img')).toHaveCount(0);
  expect(await (await request.get('/api/config/export')).json()).toEqual(before);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBeTruthy();
  await page.screenshot({ path: testInfo.outputPath('workstations.png'), fullPage: true });
});

test('model lookup deduplicates workstations and survives direct links and reload', async ({ page }, testInfo) => {
  await page.goto('/peripherals');
  await expect(page.locator('#peripheral-profile-label')).toContainText('Support group:');
  await page.locator('[data-view-model-workstations="laser"]').click();
  await expect(page).toHaveURL(/\/workstations\?model=laser$/);
  await expect(page.locator('#workstations-total')).toHaveText('5');
  await expect(rows(page)).toHaveCount(2);
  await expect(page.locator('#workstations-match-summary')).toHaveText('2 matching workstations | 3 assignments of Example Laser A');
  await page.reload();
  await expect(page.locator('#workstation-model-filter')).toHaveValue('laser');
  await expect(rows(page)).toHaveCount(2);
  await page.locator('#workstation-inventory-filter').selectOption('pending');
  await expect(rows(page)).toHaveCount(1);
  await expect(rows(page)).toContainText('Desk Beta');
  await page.locator('#workstation-inventory-filter').selectOption('all');
  await page.screenshot({ path: testInfo.outputPath('model-workstations.png'), fullPage: true });
  await page.locator('#workstation-model-filter').selectOption('unused');
  await expect(rows(page)).toHaveCount(0);
  await expect(page.locator('#workstations-match-summary')).toContainText('0 assignments');
  await page.goto('/workstations?model=missing-model');
  await expect(page.locator('#workstations-total')).toHaveText('5');
  await expect(rows(page)).toHaveCount(0);
  await expect(page.locator('#workstations-match-summary')).toContainText('Model unavailable');
  await expect(page.locator('#workstation-model-filter')).toHaveValue('missing-model');
});

test('pagination and combined filter URLs persist through reload and back navigation', async ({ page, request }) => {
  const devices = Array.from({ length: 26 }, (_, index) => workstation(`Desk ${String(index + 1).padStart(2, '0')}`, index % 2 ? 'South' : 'North', group('none'), group('none')));
  expect((await request.post('/api/config', { data: { devices } })).ok()).toBeTruthy();
  await page.goto('/workstations');
  await expect(page.locator('#workstations-total')).toHaveText('26');
  await expect(rows(page)).toHaveCount(25);
  await expect(page.locator('#workstations-prev')).toBeDisabled();
  await page.locator('#workstations-next').click();
  await expect(rows(page)).toHaveCount(1);
  await expect(rows(page)).toContainText('Desk 26');
  await expect(page.locator('#workstations-next')).toBeDisabled();
  await page.locator('#workstations-prev').click();
  await page.locator('#workstations-page-size').selectOption('10');
  await page.locator('#workstations-next').click();
  await expect(page.locator('#workstations-page-summary')).toHaveText('11-20 of 26');
  await page.reload();
  await expect(page.locator('#workstations-page-summary')).toHaveText('11-20 of 26');
  await expect(page.locator('#workstations-page-size')).toHaveValue('10');
  await page.locator('#workstation-facility-filter').selectOption('North');
  await page.locator('#workstation-inventory-filter').selectOption('recorded');
  await expect(page.locator('#workstations-page-summary')).toHaveText('1-10 of 13');
  await page.goto('/manual');
  await page.goBack();
  await expect(page.locator('#workstation-facility-filter')).toHaveValue('North');
  await expect(page.locator('#workstation-inventory-filter')).toHaveValue('recorded');
  await expect(page.locator('#workstations-page-summary')).toHaveText('1-10 of 13');
  await page.locator('#reset-workstation-filters').click();
  await expect(rows(page)).toHaveCount(25);
  await expect(page).toHaveURL(/\/workstations$/);
});

test('profile scope and load failure do not expose stale inventory', async ({ page, request }) => {
  await page.goto('/workstations?model=laser');
  await expect(rows(page)).toHaveCount(2);
  expect((await request.post('/api/regions', { data: { name: 'Other Team', copyFromActive: false } })).ok()).toBeTruthy();
  await page.reload();
  await expect(page.locator('#workstations-total')).toHaveText('0');
  await expect(rows(page)).toHaveCount(0);
  await expect(page.locator('#workstations-profile-label')).toContainText('Other Team');
  await expect(page.locator('#workstations-match-summary')).toContainText('Model unavailable');
  await expect(page.locator('#workstations-body')).toContainText('No workstations in this support group');
  expect((await request.post('/api/config', { data: { devices: [workstation('Other Desk', 'Other Facility')] } })).ok()).toBeTruthy();
  await page.goto('/workstations');
  await expect(page.locator('#workstations-total')).toHaveText('1');
  await expect(rows(page)).toContainText('Other Desk');
  await page.route('**/api/config', route => route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Temporary inventory read error' }) }), { times: 1 });
  await page.locator('#reload-workstations').click();
  await expect(page.locator('#workstations-alert')).toContainText('Temporary inventory read error');
  await expect(rows(page)).toHaveCount(0);
  await expect(page.locator('#workstations-total')).toHaveText('-');
  await expect(page.locator('#reload-workstations')).toBeEnabled();
  await page.locator('#reload-workstations').click();
  await expect(page.locator('#workstations-total')).toHaveText('1');
  await expect(rows(page)).toContainText('Other Desk');
  await expect(page.locator('#workstations-alert')).toBeEmpty();
});
