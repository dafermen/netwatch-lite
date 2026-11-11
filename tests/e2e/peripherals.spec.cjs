const { test, expect } = require('./fixtures.cjs');

test.beforeEach(async ({ request }) => {
  expect((await request.post('/api/config', { data: { devices: [] } })).ok()).toBeTruthy();
});

async function openCatalog(page) {
  await page.goto('/peripherals');
  await expect(page.locator('#peripheral-profile-label')).toContainText('Support group:');
}

async function addModel(page, kind, model) {
  await page.locator('#add-peripheral-model').click();
  await page.locator('#peripheral-model-kind').selectOption(kind);
  await page.locator('#peripheral-manufacturer').fill('Example');
  await page.locator('#peripheral-model-name').fill(model);
  await page.locator('#save-peripheral-model').click();
  await expect(page.locator('#peripheral-model-modal')).toBeHidden();
  await expect(page.locator('#peripheral-catalog-body')).toContainText(model);
}

async function expandGroups(page) {
  await expect(page.locator('[data-config-facility-toggle]').first()).toBeVisible();
  for (const attribute of ['data-config-facility-toggle', 'data-config-category-toggle']) {
    for (const toggle of await page.locator(`[${attribute}][aria-expanded="false"]`).all()) await toggle.click();
  }
}

test('catalog create, edit, duplicate rejection, filters and unused deletion', async ({ page }, testInfo) => {
  await openCatalog(page);
  await addModel(page, 'printer', 'Laser A');
  await addModel(page, 'scanner', 'Scan A');
  await page.locator('#peripheral-kind-filter').selectOption('printer');
  await expect(page.locator('#peripheral-catalog-body')).not.toContainText('Scan A');
  await page.locator('[data-edit-peripheral-model]').click();
  await page.locator('#peripheral-model-name').fill('Laser B');
  await page.locator('#save-peripheral-model').click();
  await expect(page.locator('#peripheral-model-modal')).toBeHidden();
  await page.locator('#add-peripheral-model').click();
  await page.locator('#peripheral-manufacturer').fill('example');
  await page.locator('#peripheral-model-name').fill('laser b');
  await page.locator('#save-peripheral-model').click();
  await expect(page.locator('#peripheral-model-alert')).toContainText('already contains');
  await page.locator('#peripheral-model-modal .btn-close').click();
  await page.locator('#peripheral-kind-filter').selectOption('');
  await page.locator('#peripheral-catalog-search').fill('Scan');
  await expect(page.locator('#peripheral-catalog-body')).not.toContainText('Laser B');
  await page.locator('[data-delete-peripheral-model]').click();
  await page.locator('#management-confirm').click();
  await expect(page.locator('#peripheral-catalog-body')).toContainText('No models found');
  await page.locator('#peripheral-catalog-search').fill('');
  await expect(page.locator('#peripheral-catalog-body')).toContainText('Laser B');
  await page.screenshot({ path: testInfo.outputPath('peripheral-catalog.png') });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBeTruthy();
});

test('workstation assignments survive save, copy, bulk edit and export with in-use protection', async ({ page, request }, testInfo) => {
  await openCatalog(page);
  await addModel(page, 'printer', 'Laser A');
  await addModel(page, 'scanner', 'Scan A');
  const catalog = (await (await request.get('/api/config')).json()).peripheralCatalog;
  const printer = catalog.find(model => model.kind === 'printer').id;
  const scanner = catalog.find(model => model.kind === 'scanner').id;
  await page.goto('/config');
  await page.locator('#add-device').click();
  await page.locator('#device-type').selectOption('workstation');
  await page.locator('#device-name').fill('Desk A');
  await page.locator('#device-address').fill('127.0.0.1');
  await page.locator('#device-printer-status').selectOption('assigned');
  await page.locator('[data-add-peripheral="printers"]').click();
  const printers = page.locator('[data-peripheral-group="printers"] [data-peripheral-assignment]');
  await printers.first().locator('[data-assignment-model]').selectOption(printer);
  await printers.first().locator('[data-assignment-identifier]').fill('USB-A');
  await printers.first().locator('[data-assignment-notes]').fill('<img src=x onerror="window.inventoryInjected=true">');
  await page.locator('[data-add-peripheral="printers"]').click();
  await printers.nth(1).locator('[data-assignment-model]').selectOption(printer);
  await printers.nth(1).locator('[data-assignment-connection]').selectOption('network');
  await printers.nth(1).locator('[data-assignment-address]').fill('printer.example.invalid');
  await page.locator('#device-scanner-status').selectOption('assigned');
  await page.locator('[data-add-peripheral="scanners"]').click();
  await page.locator('[data-peripheral-group="scanners"] [data-assignment-model]').selectOption(scanner);
  await page.locator('#device-enabled').uncheck();
  await printers.nth(1).scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath('workstation-editor.png') });
  await printers.nth(1).screenshot({ path: testInfo.outputPath('network-printer-assignment.png') });
  await page.locator('#submit-device').click();
  await expect(page.locator('#device-form-modal')).toBeHidden();
  await page.reload();
  await expandGroups(page);
  await expect(page.locator('.workstation-inventory summary')).toContainText('Printers: 2');
  await expect(page.locator('.workstation-inventory summary')).toContainText('Scanners: 1');
  await page.locator('.workstation-inventory summary').click();
  await expect(page.locator('.workstation-inventory')).toContainText('printer.example.invalid');
  expect(await page.evaluate(() => window.inventoryInjected)).toBeUndefined();
  await page.locator('[data-edit-device]').click();
  await expect(printers.nth(1).locator('[data-assignment-address]')).toHaveValue('printer.example.invalid');
  await printers.nth(1).locator('[data-assignment-connection]').selectOption('usb');
  await expect(printers.nth(1).locator('[data-assignment-address]')).toHaveValue('');
  await page.locator('#submit-device').click();
  await expect(page.locator('#device-form-modal')).toBeHidden();
  await expandGroups(page);
  await page.locator('[data-copy-device]').click();
  await page.locator('#device-name').fill('Desk B');
  await page.locator('#submit-device').click();
  await expect(page.locator('#device-form-modal')).toBeHidden();
  await page.locator('#config-bulk-view').click();
  const facilityToggle = page.locator('[data-bulk-facility-toggle]');
  for (const toggle of await facilityToggle.all()) {
    if (await toggle.getAttribute('aria-expanded') === 'false') await toggle.click();
  }
  const row = page.locator('[data-bulk-index="1"]');
  await row.locator('[data-bulk-field="name"]').fill('Desk B Updated');
  const updated = page.waitForResponse(response => response.url().endsWith('/api/config/devices/1') && response.request().method() === 'POST');
  await row.locator('[data-bulk-save]').click();
  expect((await updated).ok()).toBeTruthy();
  await expect(page.locator('#config-alert')).toContainText("Device 'Desk B Updated' saved.");
  const saved = await (await request.get('/api/config/export')).json();
  expect(saved.devices).toHaveLength(2);
  expect(saved.devices[1].name).toBe('Desk B Updated');
  expect(saved.devices[1].workstationPeripherals.printers.items).toHaveLength(2);
  expect(saved.peripheralCatalog).toHaveLength(2);
  await openCatalog(page);
  await expect(page.locator('[data-delete-peripheral-model]').first()).toBeDisabled();
  await page.locator('[data-edit-peripheral-model]').first().click();
  await expect(page.locator('#peripheral-model-kind')).toBeDisabled();
});

test('legacy workstation category is not reclassified and recorded states need explicit confirmation', async ({ page, request }) => {
  await request.post('/api/config', { data: { devices: [{ name: 'Legacy desk', ip: '127.0.0.1', category: 'Workstations', checks: [{ type: 'ping' }] }] } });
  await page.goto('/config');
  await expandGroups(page);
  await page.locator('[data-edit-device]').click();
  await expect(page.locator('#device-type')).toHaveValue('unspecified');
  await expect(page.locator('#workstation-peripherals')).toBeHidden();
  await page.locator('#device-type').selectOption('workstation');
  await expect(page.locator('#device-printer-status')).toHaveValue('unrecorded');
  page.once('dialog', dialog => dialog.dismiss());
  await page.locator('#workstation-peripherals a[data-route]').click();
  await expect(page.locator('#device-form-modal')).toBeVisible();
  await expect(page.locator('#device-name')).toHaveValue('Legacy desk');
  await page.locator('#device-printer-status').selectOption('assigned');
  await page.locator('#submit-device').click();
  await expect(page.locator('#device-peripheral-alert')).toContainText('at least one');
  await page.locator('#device-printer-status').selectOption('none');
  page.once('dialog', dialog => dialog.dismiss());
  await page.locator('#device-type').selectOption('other');
  await expect(page.locator('#device-type')).toHaveValue('workstation');
  await page.locator('#submit-device').click();
  await expect(page.locator('#device-form-modal')).toBeHidden();
  const saved = (await (await request.get('/api/config')).json()).devices[0];
  expect(saved.workstationPeripherals.printers.status).toBe('none');
  expect(saved.workstationPeripherals.scanners.status).toBe('unrecorded');
});
