const { test, expect } = require('./fixtures.cjs');
const fs = require('node:fs/promises');

const location = 'Floor 2 - Office 204 <img src=x onerror=alert(1)> & "desk"';
const editedLocation = 'Floor 3 - Office 305';
const notes = 'Existing observations\nLocation: keep this legacy note';
const inventory = (value = location) => ({
  settings: { intervalSeconds: 60, timeoutMs: 500, maxParallelChecks: 2, retryCount: 0, retryDelayMs: 0 },
  devices: [
    { name: 'Location desk', ip: '127.0.0.1', facility: 'Site A', category: 'Workstations', deviceType: 'workstation',
      location: value, notes, enabled: true, checks: [{ type: 'ping' }] },
    { name: 'Legacy desk', ip: '127.0.0.1', facility: 'Site A', category: 'Workstations', notes, enabled: true, checks: [{ type: 'ping' }] }
  ]
});

async function expandConfig(page) {
  for (const attribute of ['data-config-facility-toggle', 'data-config-category-toggle']) {
    for (const toggle of await page.locator(`[${attribute}][aria-expanded="false"]`).all()) await toggle.click();
  }
}

test.beforeEach(async ({ request }) => {
  expect((await request.post('/api/config', { data: inventory() })).ok()).toBeTruthy();
});

test('location preserves Notes and Facility through edit, copy, bulk, JSON and profile workflows', async ({ page, request }) => {
  await page.goto('/config');
  await expect(page.locator('[data-edit-device]')).toHaveCount(2);
  await expandConfig(page);
  await page.locator('[data-edit-device="0"]').click();
  await expect(page.locator('#device-location')).toHaveValue(location);
  await expect(page.locator('#device-notes')).toHaveValue(notes);
  await page.locator('#device-location').fill('  ' + editedLocation + '  ');
  await page.locator('#submit-device').click();
  await expect(page.locator('#device-form-modal')).toBeHidden();
  await expandConfig(page);
  await page.locator('[data-copy-device="0"]').click();
  await expect(page.locator('#device-location')).toHaveValue(editedLocation);
  await expect(page.locator('#device-notes')).toHaveValue(notes);
  await page.locator('#device-name').fill('Copied location desk');
  await page.locator('#submit-device').click();
  await expect(page.locator('#device-form-modal')).toBeHidden();
  await page.locator('#config-bulk-view').click();
  for (const toggle of await page.locator('[data-bulk-facility-toggle][aria-expanded="false"]').all()) await toggle.click();
  const row = page.locator('[data-bulk-index="2"]');
  await row.locator('[data-bulk-field="name"]').fill('Bulk location desk');
  const saving = page.waitForResponse(response => response.url().endsWith('/api/config/devices/2') && response.request().method() === 'POST');
  await row.locator('[data-bulk-save]').click();
  expect((await saving).ok()).toBeTruthy();
  await row.locator('[data-bulk-advanced]').click();
  await expect(page.locator('#device-location')).toHaveValue(editedLocation);
  await expect(page.locator('#device-notes')).toHaveValue(notes);
  await page.locator('#reset-device-form').click();
  await expect(page.locator('#device-form-modal')).toBeHidden();
  const downloading = page.waitForEvent('download');
  await page.locator('#export-config').click();
  const download = await downloading;
  const text = await fs.readFile(await download.path(), 'utf8');
  expect(JSON.parse(text).devices.map(device => device.location ?? null)).toEqual([editedLocation, null, editedLocation]);
  expect(JSON.parse(text).devices.every(device => device.notes === notes && device.facility === 'Site A')).toBeTruthy();
  await page.locator('#import-config-file').setInputFiles({ name: 'locations.json', mimeType: 'application/json', buffer: Buffer.from(text) });
  await expect(page.locator('#config-alert')).toContainText('3 devices loaded');
  expect((await request.post('/api/regions', { data: { name: 'Copied location profile', copyFromActive: true } })).ok()).toBeTruthy();
  const copied = await (await request.get('/api/config')).json();
  expect(copied.devices.map(device => device.location ?? null)).toEqual([editedLocation, null, editedLocation]);
  expect(copied.devices.every(device => device.notes === notes && device.facility === 'Site A')).toBeTruthy();
  expect((await (await request.get('/api/history')).json()).runs).toEqual([]);
});

test('location search and escaped display work before and after checks without historical disclosure', async ({ page, request }) => {
  const before = await (await request.get('/api/config')).json();
  await page.goto('/');
  await page.locator('#device-search').fill('office 204');
  const row = page.locator('[data-dashboard-device="Location desk"]');
  await expect(row).toBeVisible();
  await expect(page.locator('[data-dashboard-device="Legacy desk"]')).toHaveCount(0);
  expect(await row.locator('.device-location-text').textContent()).toBe(location);
  await expect(row.locator('img, script')).toHaveCount(0);
  await expect(row.locator('.device-notes summary')).toBeVisible();
  expect((await (await request.get('/api/history')).json()).runs).toEqual([]);
  await row.locator('[data-run-device-name]').click();
  await expect(page.locator('#last-check')).toContainText('Last Location desk execution:');
  await expect(row.locator('.device-location-text')).toHaveText(location);
  const history = await (await request.get('/api/history')).json();
  expect(history.runs).toHaveLength(1);
  expect(history.runs[0].results[0]).not.toHaveProperty('location');
  expect(history.runs[0].results[0].facility).toBe('Site A');
  expect(await (await request.get('/api/config')).json()).toEqual(before);
  await page.goto('/config');
  await page.locator('#config-device-search').fill('OFFICE 204');
  await expect(page.locator('[data-edit-device]')).toHaveCount(1);
  await expandConfig(page);
  expect(await page.locator('.config-device-row .device-location-text').textContent()).toBe(location);
  await expect(page.locator('.config-device-row img, .config-device-row script')).toHaveCount(0);
});

test('legacy locations stay blank, validation blocks bad input and clearing leaves notes unchanged', async ({ page, request }) => {
  await page.goto('/config');
  await expect(page.locator('[data-edit-device]')).toHaveCount(2);
  await expandConfig(page);
  await page.locator('[data-edit-device="1"]').click();
  await expect(page.locator('#device-location')).toHaveValue('');
  await expect(page.locator('#device-notes')).toHaveValue(notes);
  await expect(page.locator('#device-location')).toHaveAttribute('maxlength', '200');
  await page.locator('#device-location').fill('before\u001bafter');
  await page.locator('#submit-device').click();
  await expect(page.locator('#device-check-alert')).toContainText('Location must be a single line');
  await expect(page.locator('#device-location')).toBeFocused();
  await page.locator('#device-location').evaluate(element => { element.value = 'x'.repeat(201); });
  await page.locator('#submit-device').click();
  await expect(page.locator('#device-check-alert')).toContainText('at most 200');
  await page.locator('#device-location').fill('Office 205');
  await page.locator('#submit-device').click();
  await expect(page.locator('#device-form-modal')).toBeHidden();
  await expandConfig(page);
  await page.locator('[data-edit-device="1"]').click();
  await expect(page.locator('#device-location')).toHaveValue('Office 205');
  await page.locator('#device-location').fill('  ');
  await page.locator('#submit-device').click();
  await expect(page.locator('#device-form-modal')).toBeHidden();
  const saved = (await (await request.get('/api/config')).json()).devices[1];
  expect(saved.location).toBeNull();
  expect(saved.notes).toBe(notes);
  expect(saved.facility).toBe('Site A');
  await expandConfig(page);
  await page.locator('[data-edit-device="0"]').click();
  await expect(page.locator('#device-location')).toHaveValue(location);
  await page.locator('#reset-device-form').click();
  await expect(page.locator('#device-form-modal')).toBeHidden();
  await page.locator('#add-device').click();
  await expect(page.locator('#device-location')).toHaveValue('');
  await expect(page.locator('#device-notes')).toHaveValue('');
  await page.locator('#device-name').fill('New location desk');
  await page.locator('#device-address').fill('127.0.0.1');
  await page.locator('#device-location').fill('Floor 1 - Office 101');
  await page.locator('#device-notes').fill('Used by: Help desk');
  await page.locator('#submit-device').click();
  await expect(page.locator('#device-form-modal')).toBeHidden();
  expect((await (await request.get('/api/config')).json()).devices[2].location).toBe('Floor 1 - Office 101');
});

test('Location precedes Notes and long positions fit their cells and editor on both viewports', async ({ page, request }, testInfo) => {
  const longLocation = 'Office 204 - ' + 'x'.repeat(187);
  expect(longLocation).toHaveLength(200);
  expect((await request.post('/api/config', { data: inventory(longLocation) })).ok()).toBeTruthy();
  await page.goto('/config');
  await page.locator('#config-device-search').fill('Office 204');
  await expect(page.locator('[data-edit-device]')).toHaveCount(1);
  await expandConfig(page);
  const assertLocationBounds = async locator => {
    await expect(locator).toBeVisible();
    expect(await locator.evaluate(element => {
      const cell = element.closest('td').getBoundingClientRect();
      const bounds = element.getBoundingClientRect();
      return bounds.left >= cell.left && bounds.right <= cell.right + 1 && element.scrollWidth <= element.clientWidth + 1;
    })).toBeTruthy();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBeTruthy();
  };
  await assertLocationBounds(page.locator('.config-device-row .device-location'));
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await page.screenshot({ path: testInfo.outputPath('location-configuration.png'), fullPage: true });
  await page.locator('#device-form-modal').evaluate(element => {
    window.locationEditorReady = new Promise(resolve => element.addEventListener('shown.bs.modal', () => resolve(), { once: true }));
  });
  await page.locator('[data-edit-device="0"]').click();
  await page.evaluate(() => window.locationEditorReady);
  await expect(page.locator('#device-location')).toHaveValue(longLocation);
  await expect(page.locator('#device-notes')).toHaveValue(notes);
  await page.locator('#device-location').scrollIntoViewIfNeeded();
  expect(await page.locator('#device-location').evaluate(element => {
    const bounds = element.getBoundingClientRect();
    const notesBounds = document.querySelector('#device-notes').getBoundingClientRect();
    const modal = element.closest('.modal-content').getBoundingClientRect();
    return bounds.bottom <= notesBounds.top && bounds.left >= modal.left && bounds.right <= modal.right
      && modal.top >= 0 && modal.bottom <= innerHeight + 1;
  })).toBeTruthy();
  await page.screenshot({ path: testInfo.outputPath('location-editor.png') });
  await page.locator('#reset-device-form').click();
  await expect(page.locator('#device-form-modal')).toBeHidden();
  await page.goto('/');
  await page.locator('#device-search').fill('Office 204');
  await assertLocationBounds(page.locator('.device-location'));
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await page.screenshot({ path: testInfo.outputPath('location-dashboard.png'), fullPage: true });
});
