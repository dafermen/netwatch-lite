const { test, expect } = require('./fixtures.cjs');
const fs = require('node:fs/promises');

const inventory = () => ({
  settings: { intervalSeconds: 60, timeoutMs: 500, maxParallelChecks: 2, retryCount: 0, retryDelayMs: 0 },
  peripheralCatalog: [
    { id: 'printer-a', kind: 'printer', manufacturer: 'Example', model: 'Laser A' },
    { id: 'scanner-a', kind: 'scanner', manufacturer: 'Example', model: 'Scan A' }
  ],
  devices: [{ name: 'Link desk', ip: '127.0.0.1', facility: 'Lab', category: 'Workstations', deviceType: 'workstation',
    enabled: true, checks: [{ type: 'ping' }], workstationPeripherals: {
      printers: { status: 'assigned', items: [{ modelId: 'printer-a', connection: 'network', address: 'printer.example.test', identifier: 'PRN-A', notes: '<img src=x onerror=alert(1)>' }] },
      scanners: { status: 'assigned', items: [{ modelId: 'scanner-a', connection: 'usb', identifier: 'SCAN-A', notes: 'Scanner notes' }] }
    } }]
});
const groupRows = (page, key) => page.locator(`[data-peripheral-group="${key}"] [data-peripheral-assignment]`);
async function expandConfig(page) {
  for (const attribute of ['data-config-facility-toggle', 'data-config-category-toggle']) {
    for (const toggle of await page.locator(`[${attribute}][aria-expanded="false"]`).all()) await toggle.click();
  }
}
async function editDevice(page) {
  await page.goto('/config');
  await expect(page.locator('[data-edit-device]')).toHaveCount(1);
  await expandConfig(page);
  await page.locator('[data-edit-device]').click();
}
test.beforeEach(async ({ request }) => {
  expect((await request.post('/api/config', { data: inventory() })).ok()).toBeTruthy();
});

test('printer and scanner links survive edits, duplicate models, copy, bulk and JSON/profile round trips', async ({ page, request }) => {
  await editDevice(page);
  const printers = groupRows(page, 'printers');
  const scanner = groupRows(page, 'scanners');
  await expect(printers.first().locator('[data-assignment-link-type]')).toHaveValue('unrecorded');
  await expect(scanner.locator('[data-assignment-link-type]')).toHaveValue('unrecorded');
  await printers.first().locator('[data-assignment-link-type]').selectOption('wireless');
  await scanner.locator('[data-assignment-link-type]').selectOption('cabled');
  await page.locator('[data-add-peripheral="printers"]').click();
  await expect(printers.nth(1).locator('[data-assignment-link-type]')).toHaveValue('unrecorded');
  await printers.nth(1).locator('[data-assignment-model]').selectOption('printer-a');
  await printers.nth(1).locator('[data-assignment-link-type]').selectOption('cabled');
  await printers.nth(1).locator('[data-assignment-identifier]').fill('PRN-B');
  await expect(printers.first().locator('[data-assignment-address]')).toHaveValue('printer.example.test');
  await page.locator('#submit-device').click();
  await expect(page.locator('#device-form-modal')).toBeHidden();
  await expandConfig(page);
  await page.locator('[data-copy-device]').click();
  await expect(printers.first().locator('[data-assignment-link-type]')).toHaveValue('wireless');
  await expect(printers.nth(1).locator('[data-assignment-link-type]')).toHaveValue('cabled');
  await expect(scanner.locator('[data-assignment-link-type]')).toHaveValue('cabled');
  await page.locator('#device-name').fill('Copied link desk');
  await page.locator('#submit-device').click();
  await expect(page.locator('#device-form-modal')).toBeHidden();
  await page.locator('#config-bulk-view').click();
  for (const toggle of await page.locator('[data-bulk-facility-toggle][aria-expanded="false"]').all()) await toggle.click();
  const row = page.locator('[data-bulk-index="1"]');
  await row.locator('[data-bulk-field="name"]').fill('Bulk link desk');
  const saving = page.waitForResponse(response => response.url().endsWith('/api/config/devices/1') && response.request().method() === 'POST');
  await row.locator('[data-bulk-save]').click();
  expect((await saving).ok()).toBeTruthy();
  await row.locator('[data-bulk-advanced]').click();
  await expect(printers.first().locator('[data-assignment-link-type]')).toHaveValue('wireless');
  await page.locator('#reset-device-form').click();
  await expect(page.locator('#device-form-modal')).toBeHidden();
  const downloading = page.waitForEvent('download');
  await page.locator('#export-config').click();
  const download = await downloading;
  const text = await fs.readFile(await download.path(), 'utf8');
  for (const device of JSON.parse(text).devices) {
    expect(device.workstationPeripherals.printers.items.map(item => item.linkType)).toEqual(['wireless', 'cabled']);
    expect(device.workstationPeripherals.scanners.items[0].linkType).toBe('cabled');
  }
  await page.locator('#import-config-file').setInputFiles({ name: 'peripheral-links.json', mimeType: 'application/json', buffer: Buffer.from(text) });
  await expect(page.locator('#config-alert')).toContainText('2 devices loaded');
  expect((await request.post('/api/regions', { data: { name: 'Copied links', copyFromActive: true } })).ok()).toBeTruthy();
  const copied = await (await request.get('/api/config')).json();
  expect(copied.devices.map(device => device.workstationPeripherals)).toEqual(JSON.parse(text).devices.map(device => device.workstationPeripherals));
});

test('link changes retain Connection/address rules and appear in all inventory views without checks', async ({ page, request }) => {
  await editDevice(page);
  const printer = groupRows(page, 'printers');
  const scanner = groupRows(page, 'scanners');
  await expect(printer.locator('[data-assignment-link-type] option')).toHaveText(['Not recorded', 'Wireless', 'Cabled']);
  await printer.locator('[data-assignment-link-type]').selectOption('wireless');
  await expect(printer.locator('[data-assignment-connection]')).toHaveValue('network');
  await expect(printer.locator('[data-assignment-address]')).toBeEnabled();
  await expect(printer.locator('[data-assignment-address]')).toHaveValue('printer.example.test');
  await scanner.locator('[data-assignment-link-type]').selectOption('cabled');
  await expect(scanner.locator('[data-assignment-connection]')).toHaveValue('usb');
  await expect(scanner.locator('[data-assignment-address]')).toBeDisabled();
  await page.locator('#submit-device').click();
  await expect(page.locator('#device-form-modal')).toBeHidden();
  const beforeReads = await (await request.get('/api/config')).json();
  await expandConfig(page);
  await page.locator('.workstation-inventory summary').click();
  await expect(page.locator('.workstation-inventory')).toContainText('Network \u00b7 Wireless');
  await expect(page.locator('.workstation-inventory')).toContainText('USB \u00b7 Cabled');
  await expect(page.locator('.workstation-inventory img')).toHaveCount(0);
  await page.goto('/');
  await page.locator('#device-search').fill('Link desk');
  await page.locator('.workstation-inventory summary').click();
  await expect(page.locator('.workstation-inventory')).toContainText('Wireless');
  await expect(page.locator('.workstation-inventory')).toContainText('Cabled');
  await page.goto('/workstations');
  for (const summary of await page.locator('.workstation-peripheral-cell summary').all()) await summary.click();
  await expect(page.locator('#workstations-body')).toContainText('Network | Wireless');
  await expect(page.locator('#workstations-body')).toContainText('USB | Cabled');
  await expect(page.locator('#workstations-pending')).toHaveText('0');
  expect(await (await request.get('/api/config')).json()).toEqual(beforeReads);
  expect((await (await request.get('/api/history')).json()).runs).toEqual([]);
  await editDevice(page);
  await printer.locator('[data-assignment-connection]').selectOption('usb');
  await expect(printer.locator('[data-assignment-address]')).toHaveValue('');
  await expect(printer.locator('[data-assignment-link-type]')).toHaveValue('wireless');
  await page.locator('#submit-device').click();
  await expect(page.locator('#device-form-modal')).toBeHidden();
  const changed = (await (await request.get('/api/config')).json()).devices[0].workstationPeripherals.printers.items[0];
  expect(changed.connection).toBe('usb');
  expect(changed.address).toBe('');
  expect(changed.linkType).toBe('wireless');
});

test('clearing the link leaves assigned inventory and existing metadata intact', async ({ page, request }) => {
  const body = inventory();
  body.devices[0].workstationPeripherals.printers.items[0].linkType = 'wireless';
  body.devices[0].workstationPeripherals.scanners.items[0].linkType = 'cabled';
  expect((await request.post('/api/config', { data: body })).ok()).toBeTruthy();
  const before = await (await request.get('/api/config')).json();
  await editDevice(page);
  await groupRows(page, 'printers').locator('[data-assignment-link-type]').selectOption('unrecorded');
  await page.locator('#submit-device').click();
  await expect(page.locator('#device-form-modal')).toBeHidden();
  before.devices[0].workstationPeripherals.printers.items[0].linkType = 'unrecorded';
  expect(await (await request.get('/api/config')).json()).toEqual(before);
  await page.goto('/workstations');
  await expect(page.locator('#workstations-pending')).toHaveText('0');
  await page.locator('.workstation-peripheral-cell summary').first().click();
  await expect(page.locator('#workstations-body')).toContainText('Link not recorded');
});

test('link selectors and assignment layout fit desktop and mobile', async ({ page }, testInfo) => {
  await page.goto('/config');
  await expect(page.locator('[data-edit-device]')).toHaveCount(1);
  await expandConfig(page);
  await page.locator('#device-form-modal').evaluate(element => {
    window.linkEditorReady = new Promise(resolve => element.addEventListener('shown.bs.modal', () => resolve(), { once: true }));
  });
  await page.locator('[data-edit-device]').click();
  await page.evaluate(() => window.linkEditorReady);
  const printer = groupRows(page, 'printers');
  await printer.locator('[data-assignment-link-type]').selectOption('wireless');
  await groupRows(page, 'scanners').locator('[data-assignment-link-type]').selectOption('cabled');
  await printer.scrollIntoViewIfNeeded();
  expect(await printer.evaluate(element => {
    const grid = element.querySelector('.peripheral-assignment-grid').getBoundingClientRect();
    const connection = element.querySelector('[data-assignment-connection]').getBoundingClientRect();
    const link = element.querySelector('[data-assignment-link-type]').getBoundingClientRect();
    const model = element.querySelector('[data-assignment-model]').getBoundingClientRect();
    const inside = bounds => bounds.left >= grid.left - 1 && bounds.right <= grid.right + 1;
    const separated = innerWidth < 576 ? link.top >= connection.bottom : link.left >= connection.right;
    return inside(connection) && inside(link) && inside(model) && separated
      && Math.abs(model.width - grid.width) <= 2 && element.scrollWidth <= element.clientWidth + 1;
  })).toBeTruthy();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBeTruthy();
  await printer.screenshot({ path: testInfo.outputPath('printer-link-selector.png') });
  await groupRows(page, 'scanners').screenshot({ path: testInfo.outputPath('scanner-link-selector.png') });
});
