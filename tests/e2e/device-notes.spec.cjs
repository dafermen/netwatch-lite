const { test, expect } = require('./fixtures.cjs');
const fs = require('node:fs/promises');

const notes = 'Location: Floor 2 - Reception\nUsed by: Front desk\t<img src=x onerror=alert(1)> & "quotes"';
const editedNotes = notes + '\nShift: Morning';
const inventory = (value = notes) => ({
  settings: { intervalSeconds: 60, timeoutMs: 500, maxParallelChecks: 2, retryCount: 0, retryDelayMs: 0 },
  devices: [
    { name: 'Notes desk', ip: '127.0.0.1', facility: 'Lab', category: 'Workstations', deviceType: 'workstation',
      notes: value, enabled: true, checks: [{ type: 'ping' }] },
    { name: 'Legacy desk', ip: '127.0.0.1', facility: 'Lab', category: 'Workstations', enabled: true, checks: [{ type: 'ping' }] }
  ]
});

async function expandConfig(page) {
  for (const selector of ['data-config-facility-toggle', 'data-config-category-toggle']) {
    for (const toggle of await page.locator(`[${selector}][aria-expanded="false"]`).all()) await toggle.click();
  }
}

test.beforeEach(async ({ request }) => {
  expect((await request.post('/api/config', { data: inventory() })).ok()).toBeTruthy();
});

test('notes survive editing, copying, bulk changes, JSON round trips and profile copies', async ({ page, request }) => {
  await page.goto('/config');
  await expect(page.locator('[data-edit-device]')).toHaveCount(2);
  await expandConfig(page);
  await page.locator('[data-edit-device="0"]').click();
  await expect(page.locator('#device-notes')).toHaveValue(notes);
  await page.locator('#device-notes').fill('  ' + editedNotes + '  ');
  await page.locator('#submit-device').click();
  await expect(page.locator('#device-form-modal')).toBeHidden();
  await expandConfig(page);
  await page.locator('[data-copy-device="0"]').click();
  await expect(page.locator('#device-notes')).toHaveValue(editedNotes);
  await page.locator('#device-name').fill('Copied notes desk');
  await page.locator('#submit-device').click();
  await expect(page.locator('#device-form-modal')).toBeHidden();
  await page.locator('#config-bulk-view').click();
  for (const toggle of await page.locator('[data-bulk-facility-toggle][aria-expanded="false"]').all()) await toggle.click();
  const row = page.locator('[data-bulk-index="2"]');
  await row.locator('[data-bulk-field="name"]').fill('Bulk notes desk');
  const saving = page.waitForResponse(response => response.url().endsWith('/api/config/devices/2') && response.request().method() === 'POST');
  await row.locator('[data-bulk-save]').click();
  expect((await saving).ok()).toBeTruthy();
  const downloading = page.waitForEvent('download');
  await page.locator('#export-config').click();
  const download = await downloading;
  const text = await fs.readFile(await download.path(), 'utf8');
  expect(JSON.parse(text).devices.map(device => device.notes ?? null)).toEqual([editedNotes, null, editedNotes]);
  await page.locator('#import-config-file').setInputFiles({ name: 'notes.json', mimeType: 'application/json', buffer: Buffer.from(text) });
  await expect(page.locator('#config-alert')).toContainText('3 devices loaded');
  expect((await request.post('/api/regions', { data: { name: 'Copied notes profile', copyFromActive: true } })).ok()).toBeTruthy();
  expect((await (await request.get('/api/config')).json()).devices.map(device => device.notes ?? null)).toEqual([editedNotes, null, editedNotes]);
  expect((await (await request.get('/api/history')).json()).runs).toEqual([]);
});

test('notes are searchable and escaped before and after checks, without entering history', async ({ page, request }) => {
  const before = await (await request.get('/api/config')).json();
  await page.goto('/');
  await page.locator('#device-search').fill('front desk');
  const row = page.locator('[data-dashboard-device="Notes desk"]');
  await expect(row).toBeVisible();
  await expect(page.locator('[data-dashboard-device="Legacy desk"]')).toHaveCount(0);
  const disclosure = row.locator('.device-notes');
  await expect(disclosure.locator('.device-notes-text')).toBeHidden();
  await disclosure.locator('summary').click();
  await expect(disclosure.locator('.device-notes-text')).toBeVisible();
  expect(await disclosure.locator('.device-notes-text').textContent()).toBe(notes);
  await expect(row.locator('img, script')).toHaveCount(0);
  await disclosure.locator('summary').press('Space');
  await expect(disclosure).not.toHaveAttribute('open');
  await expect(page.locator('.category-section > .collapse')).toHaveClass(/collapse show/);
  expect((await (await request.get('/api/history')).json()).runs).toEqual([]);
  await row.locator('[data-run-device-name]').click();
  await expect(page.locator('#last-check')).toContainText('Last Notes desk execution:');
  await expect(row.locator('.device-notes')).toBeVisible();
  await row.locator('.device-notes summary').click();
  expect(await row.locator('.device-notes-text').textContent()).toBe(notes);
  const history = await (await request.get('/api/history')).json();
  expect(history.runs).toHaveLength(1);
  expect(history.runs[0].results[0]).not.toHaveProperty('notes');
  expect(await (await request.get('/api/config')).json()).toEqual(before);
  await page.goto('/config');
  await page.locator('#config-device-search').fill('FRONT DESK');
  await expect(page.locator('[data-edit-device]')).toHaveCount(1);
  await expandConfig(page);
  await page.locator('.config-device-row .device-notes summary').click();
  expect(await page.locator('.config-device-row .device-notes-text').textContent()).toBe(notes);
  await expect(page.locator('.config-device-row img, .config-device-row script')).toHaveCount(0);
});

test('legacy notes start blank, new forms reset, invalid controls are blocked and notes can be cleared', async ({ page, request }) => {
  await page.goto('/config');
  await expect(page.locator('[data-edit-device]')).toHaveCount(2);
  await expandConfig(page);
  await page.locator('[data-edit-device="1"]').click();
  await expect(page.locator('#device-notes')).toHaveValue('');
  await expect(page.locator('#device-notes')).toHaveAttribute('maxlength', '2000');
  await page.locator('#device-notes').fill('before\u001bafter');
  await page.locator('#submit-device').click();
  await expect(page.locator('#device-check-alert')).toContainText('Notes must be at most 2000 characters');
  await expect(page.locator('#device-notes')).toBeFocused();
  await page.locator('#device-notes').fill(editedNotes);
  await page.locator('#submit-device').click();
  await expect(page.locator('#device-form-modal')).toBeHidden();
  await expandConfig(page);
  await page.locator('[data-edit-device="1"]').click();
  await expect(page.locator('#device-notes')).toHaveValue(editedNotes);
  await page.locator('#device-notes').fill(' \n\t ');
  await page.locator('#submit-device').click();
  await expect(page.locator('#device-form-modal')).toBeHidden();
  expect((await (await request.get('/api/config')).json()).devices[1].notes).toBeNull();
  await expandConfig(page);
  await page.locator('[data-edit-device="0"]').click();
  await expect(page.locator('#device-notes')).toHaveValue(notes);
  await page.locator('#reset-device-form').click();
  await expect(page.locator('#device-form-modal')).toBeHidden();
  await page.locator('#add-device').click();
  await expect(page.locator('#device-notes')).toHaveValue('');
  await page.locator('#device-name').fill('New notes desk');
  await page.locator('#device-address').fill('127.0.0.1');
  await page.locator('#device-notes').fill('Location: Floor 3\nUsed by: Help desk');
  await page.locator('#submit-device').click();
  await expect(page.locator('#device-form-modal')).toBeHidden();
  expect((await (await request.get('/api/config')).json()).devices[2].notes).toBe('Location: Floor 3\nUsed by: Help desk');
});

test('long notes wrap inside their device cells and the editor fits desktop and mobile', async ({ page, request }, testInfo) => {
  const longNotes = 'Location: Floor 2 - Reception\nUsed by: Front desk\n' + 'x'.repeat(1800);
  expect((await request.post('/api/config', { data: inventory(longNotes) })).ok()).toBeTruthy();
  await page.goto('/config');
  await page.locator('#config-device-search').fill('Front desk');
  await expect(page.locator('[data-edit-device]')).toHaveCount(1);
  await expandConfig(page);
  await page.locator('.config-device-row .device-notes summary').click();
  const assertNotesBounds = async locator => {
    await expect(locator).toBeVisible();
    expect(await locator.evaluate(element => {
      const cell = element.closest('td').getBoundingClientRect();
      const bounds = element.getBoundingClientRect();
      return bounds.left >= cell.left && bounds.right <= cell.right + 1 && element.scrollWidth <= element.clientWidth + 1;
    })).toBeTruthy();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBeTruthy();
  };
  await assertNotesBounds(page.locator('.config-device-row .device-notes-text'));
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await page.screenshot({ path: testInfo.outputPath('notes-configuration.png'), fullPage: true });
  await page.locator('#device-form-modal').evaluate(element => {
    window.notesEditorReady = new Promise(resolve => element.addEventListener('shown.bs.modal', () => resolve(), { once: true }));
  });
  await page.locator('[data-edit-device="0"]').click();
  await expect(page.locator('#device-notes')).toHaveValue(longNotes);
  await page.evaluate(() => window.notesEditorReady);
  await page.locator('#device-notes').scrollIntoViewIfNeeded();
  expect(await page.locator('#device-form-modal .modal-content').evaluate(element => {
    const bounds = element.getBoundingClientRect();
    return bounds.top >= 0 && bounds.bottom <= innerHeight + 1 && bounds.left >= 0 && bounds.right <= innerWidth;
  })).toBeTruthy();
  expect(await page.locator('#device-notes').evaluate(element => {
    const bounds = element.getBoundingClientRect();
    const modal = element.closest('.modal-content').getBoundingClientRect();
    return bounds.left >= modal.left && bounds.right <= modal.right;
  })).toBeTruthy();
  await page.screenshot({ path: testInfo.outputPath('notes-editor.png') });
  await page.locator('#reset-device-form').click();
  await expect(page.locator('#device-form-modal')).toBeHidden();
  await page.goto('/');
  await page.locator('#device-search').fill('Front desk');
  await page.locator('.device-notes summary').click();
  await assertNotesBounds(page.locator('.device-notes-text'));
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await page.screenshot({ path: testInfo.outputPath('notes-dashboard.png'), fullPage: true });
});
