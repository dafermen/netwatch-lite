const { test, expect } = require('./fixtures.cjs');

test.beforeEach(async ({ request }) => {
  expect((await request.post('/api/config', { data: { devices: [] } })).ok()).toBeTruthy();
});

async function addByApi(request, id = 'web-app', name = 'Web application') {
  const snapshot = await (await request.get('/api/device-types')).json();
  const response = await request.post('/api/device-types', { data: {
    profileId: snapshot.profileId, version: snapshot.version, deviceTypes: [...snapshot.deviceTypes, { id, name }]
  } });
  expect(response.ok()).toBeTruthy();
  return response.json();
}

async function openType(page, id = '') {
  await expect(page.locator('#add-device-type')).toBeEnabled();
  await (id ? page.locator(`[data-edit-device-type="${id}"]`) : page.locator('#add-device-type')).click();
  await expect(page.locator('#device-type-modal .modal-dialog')).toHaveCSS('transform', 'none');
}

async function expandConfig(page) {
  await expect(page.locator('[data-config-facility-toggle]').first()).toBeVisible();
  for (const attribute of ['data-config-facility-toggle', 'data-config-category-toggle']) {
    for (const toggle of await page.locator(`[${attribute}][aria-expanded="false"]`).all()) await toggle.click();
  }
}

test('type catalog protects defaults and supports custom create, rename, filters and deletion', async ({ page }, testInfo) => {
  await page.goto('/device-types');
  const workstation = page.locator('[data-device-type-row="workstation"]');
  await expect(workstation).toContainText('Protected');
  await expect(workstation.locator('[data-edit-device-type]')).toBeDisabled();
  await expect(workstation.locator('[data-delete-device-type]')).toBeDisabled();
  await openType(page);
  await page.locator('#device-type-name').fill('Web application');
  await page.locator('#save-device-type').click();
  await expect(page.locator('#device-type-modal')).toBeHidden();
  await expect(page.locator('#device-types-count')).toHaveText('6 of 6 types');
  await openType(page);
  await page.locator('#device-type-name').fill('web APPLICATION');
  await page.locator('#save-device-type').click();
  await expect(page.locator('#device-type-form-alert')).toContainText('names must be unique');
  await page.locator('#device-type-modal .btn-close').click();
  await expect(page.locator('#device-type-modal')).toBeHidden();
  await page.locator('#device-types-filter').selectOption('custom');
  const row = page.locator('[data-device-type-row]').filter({ hasText: 'Web application' });
  await row.locator('[data-edit-device-type]').click();
  await expect(page.locator('#device-type-modal .modal-dialog')).toHaveCSS('transform', 'none');
  await page.locator('#device-type-name').fill('Web portal');
  await page.locator('#save-device-type').click();
  await expect(page.locator('#device-type-modal')).toBeHidden();
  await page.locator('#device-types-search').fill('PORTAL');
  await expect(page.locator('#device-types-body')).toContainText('Web portal');
  await expect(page.locator('#device-types-count')).toHaveText('1 of 6 types');
  await page.locator('#device-types-search').fill('');
  await page.locator('#device-types-filter').selectOption('');
  await page.screenshot({ path: testInfo.outputPath('device-types-catalog.png') });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBeTruthy();
  await page.locator('#device-types-filter').selectOption('custom');
  await page.locator('[data-delete-device-type]:enabled').click();
  await page.locator('#management-confirm').click();
  await expect(page.locator('#device-types-count')).toHaveText('0 of 5 types');
  await page.locator('#device-types-filter').selectOption('protected');
  await expect(page.locator('#device-types-count')).toHaveText('5 of 5 types');
});

test('custom assignments survive copy, bulk save, rename and support-group copies without workstation behavior', async ({ page, request }) => {
  test.setTimeout(45000);
  await addByApi(request);
  await page.goto('/config');
  await page.locator('#add-device').click();
  await page.locator('#device-name').fill('Portal');
  await page.locator('#device-address').fill('127.0.0.1');
  await page.locator('#device-type').selectOption('web-app');
  await expect(page.locator('#workstation-peripherals')).toBeHidden();
  await page.locator('#device-type').selectOption('workstation');
  await expect(page.locator('#workstation-peripherals')).toBeVisible();
  await page.locator('#device-type').selectOption('web-app');
  await page.locator('#device-enabled').uncheck();
  await page.locator('#submit-device').click();
  await expect(page.locator('#device-form-modal')).toBeHidden();
  await expandConfig(page);
  await page.locator('[data-copy-device]').click();
  await expect(page.locator('#device-type')).toHaveValue('web-app');
  await page.locator('#device-name').fill('Portal copy');
  await page.locator('#submit-device').click();
  await expect(page.locator('#device-form-modal')).toBeHidden();
  await page.locator('#config-bulk-view').click();
  for (const toggle of await page.locator('[data-bulk-facility-toggle][aria-expanded="false"]').all()) await toggle.click();
  const row = page.locator('[data-bulk-index="1"]');
  await row.locator('[data-bulk-field="name"]').fill('Portal revised');
  await row.locator('[data-bulk-save]').click();
  await expect(page.locator('#config-alert')).toContainText("Device 'Portal revised' saved.");
  await page.goto('/device-types');
  await expect(page.locator('[data-device-type-row="web-app"]')).toContainText('2 devices');
  await expect(page.locator('[data-delete-device-type="web-app"]')).toBeDisabled();
  await openType(page, 'web-app');
  await page.locator('#device-type-name').fill('Application web');
  await page.locator('#save-device-type').click();
  await expect(page.locator('#device-type-modal')).toBeHidden();
  await page.goto('/config');
  await expandConfig(page);
  await page.locator('[data-edit-device]').first().click();
  await expect(page.locator('#device-type')).toHaveValue('web-app');
  await expect(page.locator('#device-type option:checked')).toHaveText('Application web');
  const exported = await (await request.get('/api/config/export')).json();
  expect(exported.devices.every(device => device.deviceType === 'web-app' && device.workstationPeripherals == null)).toBeTruthy();
  await request.post('/api/regions', { data: { name: 'Copied catalog', copyFromActive: true } });
  await page.goto('/device-types');
  await expect(page.locator('#device-types-profile')).toContainText('Copied catalog');
  await expect(page.locator('[data-device-type-row="web-app"]')).toContainText('2 devices');
  await request.post('/api/regions', { data: { name: 'Fresh catalog', copyFromActive: false } });
  await page.reload();
  await expect(page.locator('#device-types-profile')).toContainText('Fresh catalog');
  await expect(page.locator('#device-types-body')).not.toContainText('Application web');
});

test('stale catalog and switched profile block the old editor until explicit reload', async ({ page, request }) => {
  await page.goto('/device-types');
  await openType(page);
  await page.locator('#device-type-name').fill('Unsaved local type');
  await addByApi(request, 'remote-type', 'Remote type <img src=x onerror="window.typeInjected=true">');
  await page.locator('#save-device-type').click();
  await expect(page.locator('#device-type-form-alert')).toContainText('changed');
  await expect(page.locator('#device-type-name')).toHaveValue('Unsaved local type');
  await expect(page.locator('#save-device-type')).toBeDisabled();
  await page.locator('#reload-type-editor').click();
  await expect(page.locator('#device-type-modal')).toBeHidden();
  await expect(page.locator('#device-types-body')).toContainText('Remote type');
  expect(await page.evaluate(() => window.typeInjected)).toBeUndefined();
  const original = await (await request.get('/api/device-types')).json();
  await openType(page);
  await page.locator('#device-type-name').fill('Old group draft');
  await request.post('/api/regions', { data: { name: 'Different support group', copyFromActive: false } });
  await page.locator('#save-device-type').click();
  await expect(page.locator('#device-type-form-alert')).toContainText('changed');
  await page.locator('#reload-type-editor').click();
  await expect(page.locator('#device-type-modal')).toBeHidden();
  await expect(page.locator('#device-types-profile')).toContainText('Different support group');
  await expect(page.locator('#device-types-count')).toHaveText('5 of 5 types');
  await request.post(`/api/regions/${original.profileId}/activate`);
  const restored = await (await request.get('/api/device-types')).json();
  expect(restored.version).toBe(original.version);
  expect(restored.deviceTypes.some(type => type.name === 'Old group draft')).toBeFalsy();
});

test('failed catalog load clears stale rows and retry recovers; editor navigation confirms discard', async ({ page, request }) => {
  await addByApi(request);
  await page.goto('/device-types');
  await expect(page.locator('#device-types-body')).toContainText('Web application');
  await page.route('**/api/device-types', route => route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"Simulated type catalog failure"}' }));
  await page.locator('#reload-device-types').click();
  await expect(page.locator('#device-types-alert')).toContainText('Simulated');
  await expect(page.locator('#device-types-body')).not.toContainText('Web application');
  await expect(page.locator('#add-device-type')).toBeDisabled();
  await expect(page.locator('#reload-device-types')).toBeEnabled();
  await page.unroute('**/api/device-types');
  await page.locator('#reload-device-types').click();
  await expect(page.locator('#device-types-body')).toContainText('Web application');
  await page.goto('/config');
  await page.locator('#add-device').click();
  await page.locator('#device-name').fill('Unsaved device');
  await expect(page.locator('#device-form-modal .modal-dialog')).toHaveCSS('transform', 'none');
  page.once('dialog', dialog => dialog.dismiss());
  await page.locator('#manage-device-types').click();
  await expect(page.locator('#device-form-modal')).toBeVisible();
  await expect(page.locator('#device-name')).toHaveValue('Unsaved device');
  page.once('dialog', dialog => dialog.accept());
  await page.locator('#manage-device-types').click();
  await expect(page.locator('#device-form-modal')).toBeHidden();
  await expect(page).toHaveURL(/\/device-types$/);
  await expect(page.locator('#device-types-body')).toContainText('Web application');
});
