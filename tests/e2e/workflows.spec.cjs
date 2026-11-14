const { test, expect, confirmConfigImport } = require('./fixtures.cjs');
const fs = require('node:fs/promises');

const device = (name, facility = 'Lab') => ({
  name, ip: '127.0.0.1', facility, category: 'Loopback', enabled: true,
  checks: [{ type: 'ping' }]
});
const configuration = devices => ({
  settings: { intervalSeconds: 60, timeoutMs: 500, maxParallelChecks: 2, retryCount: 0, retryDelayMs: 0 }, devices
});

async function expandGroups(page) {
  await expect(page.locator('[data-config-facility-toggle]').first()).toBeVisible();
  for (const selector of ['data-config-facility-toggle', 'data-config-category-toggle']) {
    for (const button of await page.locator(`[${selector}][aria-expanded="false"]`).all()) await button.click();
  }
}
const rowFor = (page, name) => page.locator('tr.config-device-row').filter({ has: page.getByText(name, { exact: true }) });

test.beforeEach(async ({ request }) => {
  expect((await request.post('/api/config', { data: configuration([]) })).ok()).toBeTruthy();
});

test('device create, edit, copy, delete and settings survive reload', async ({ page, request }) => {
  await page.goto('/config');
  await page.locator('#add-device').click();
  await page.locator('#device-name').fill('Browser Device');
  await page.locator('#device-address').fill('127.0.0.1');
  await page.locator('#device-facility').fill('Lab');
  await page.locator('#device-category').fill('Loopback');
  await page.locator('#submit-device').click();
  await expect(page.locator('#device-form-modal')).toBeHidden();
  await expandGroups(page);
  await rowFor(page, 'Browser Device').locator('[data-edit-device]').click();
  await page.locator('#device-name').fill('Edited Device');
  await page.locator('#submit-device').click();
  await expect(page.locator('#device-form-modal')).toBeHidden();
  await expandGroups(page);
  await rowFor(page, 'Edited Device').locator('[data-copy-device]').click();
  await page.locator('#device-name').fill('Copied Device');
  await page.locator('#submit-device').click();
  await expect(page.locator('#device-form-modal')).toBeHidden();
  await expandGroups(page);
  await rowFor(page, 'Copied Device').locator('[data-delete-device]').click();
  await page.locator('#confirm-delete-device').click();
  await expect(page.locator('#delete-device-modal')).toBeHidden();
  await page.locator('#interval-seconds').fill('37');
  await page.locator('#save-config').click();
  await expect(page.locator('#config-alert')).toContainText('saved');
  await page.reload();
  await expect(page.locator('#interval-seconds')).toHaveValue('37');
  const saved = await (await request.get('/api/config')).json();
  expect(saved.devices.map(d => d.name)).toEqual(['Edited Device']);
});

test('delete confirmation closes for confirm and cancel during its opening transition', async ({ page, request }) => {
  await request.post('/api/config', { data: configuration([device('Keep Device'), device('Delete Device')]) });
  await page.goto('/config');
  await expandGroups(page);
  await page.addStyleTag({ content: '#delete-device-modal.fade .modal-dialog { transition: transform 1s linear !important; }' });
  const armEarlyAction = async selector => page.evaluate(action => {
    const modal = document.querySelector('#delete-device-modal');
    let shown = false;
    window.deleteActionBeforeShown = null;
    modal.addEventListener('shown.bs.modal', () => { shown = true; }, { once: true });
    modal.querySelector('.modal-dialog').addEventListener('transitionstart', () => {
      window.deleteActionBeforeShown = !shown;
      modal.querySelector(action).click();
    }, { once: true });
  }, selector);

  await armEarlyAction('#confirm-delete-device');
  await rowFor(page, 'Delete Device').locator('[data-delete-device]').click();
  await expect.poll(() => page.evaluate(() => window.deleteActionBeforeShown)).toBe(true);
  await expect(page.locator('#delete-device-modal')).toBeHidden();
  await expect.poll(async () => (await (await request.get('/api/config')).json()).devices.map(item => item.name)).toEqual(['Keep Device']);
  await expect(page.locator('.modal-backdrop')).toHaveCount(0);

  await expandGroups(page);
  const beforeCancel = await (await request.get('/api/config')).json();
  await armEarlyAction('.modal-footer [data-bs-dismiss="modal"]');
  await rowFor(page, 'Keep Device').locator('[data-delete-device]').click();
  await expect.poll(() => page.evaluate(() => window.deleteActionBeforeShown)).toBe(true);
  await expect(page.locator('#delete-device-modal')).toBeHidden();
  await expect(page.locator('.modal-backdrop')).toHaveCount(0);
  expect(await (await request.get('/api/config')).json()).toEqual(beforeCancel);
});

test('JSON import, export and invalid import preserve saved data', async ({ page }) => {
  await page.goto('/config');
  await expect(page.locator('#import-config')).toBeEnabled();
  await page.locator('#import-config-file').setInputFiles({
    name: 'inventory.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(configuration([device('Imported Device')])) )
  });
  await confirmConfigImport(page);
  await expect(page.locator('#config-alert')).toContainText('1 devices loaded');
  const downloaded = page.waitForEvent('download');
  await page.locator('#export-config').click();
  const download = await downloaded;
  const exported = JSON.parse(await fs.readFile(await download.path(), 'utf8'));
  expect(exported.devices[0].name).toBe('Imported Device');
  await page.locator('#import-config-file').setInputFiles({ name: 'broken.json', mimeType: 'application/json', buffer: Buffer.from('{') });
  await expect(page.locator('#config-alert')).toContainText('JSON import failed');
  await page.reload();
  await expandGroups(page);
  await expect(rowFor(page, 'Imported Device')).toBeVisible();
});

test('switching support groups keeps independent inventories', async ({ page, request }) => {
  await request.post('/api/config', { data: configuration([device('Original Inventory')]) });
  const initial = await (await request.get('/api/regions')).json();
  await page.goto('/regions');
  await page.locator('#new-region').click();
  await page.locator('#region-name').fill('Browser Team');
  await page.locator('#region-value').fill('Browser Region');
  await page.locator('#region-copy-active').uncheck();
  await page.locator('#submit-region').click();
  await expect(page.locator('#region-form-modal')).toBeHidden();
  await expect(page.locator('#region-alert')).toContainText('created and activated');
  const created = await (await request.get('/api/regions')).json();
  await request.post('/api/config', { data: configuration([device('Independent Inventory')]) });
  await page.locator(`[data-region-row="${initial.activeProfileId}"] .management-menu-toggle`).click();
  await page.locator(`[data-region-row="${initial.activeProfileId}"] [data-management-action="activate"]`).click();
  await expect(page.locator('#region-alert')).toContainText('Active support group changed');
  expect((await (await request.get('/api/config')).json()).devices[0].name).toBe('Original Inventory');
  await page.locator(`[data-region-row="${created.activeProfileId}"] .management-menu-toggle`).click();
  await page.locator(`[data-region-row="${created.activeProfileId}"] [data-management-action="activate"]`).click();
  await expect.poll(async () => (await (await request.get('/api/config')).json()).devices[0].name).toBe('Independent Inventory');
  await page.reload();
  await expect(page.locator(`[data-region-row="${created.activeProfileId}"] .management-status-cell`)).toContainText('Active');
});

test('dashboard runs, report filters, export and targeted deletion', async ({ page, request }) => {
  await request.post('/api/config', { data: configuration([device('Alpha Device', 'Alpha'), device('Beta Device', 'Beta')]) });
  await page.goto('/');
  await page.locator('#run-facility-check').click();
  await expect(page.locator('#last-check')).toContainText('Last execution:');
  await expect(page.locator('#metric-total')).toHaveText('2');
  await expect(page.locator('#run-facility-check')).toBeEnabled();
  await page.goto('/reports');
  await expect(page.locator('#reports-run-count')).toHaveText('1');
  await page.locator('#reports-facility-filter').selectOption('Alpha');
  await page.getByRole('tab', { name: 'Devices', exact: true }).click();
  await expect(page.locator('#reports-table-body')).toContainText('Alpha Device');
  await expect(page.locator('#reports-table-body')).not.toContainText('Beta Device');
  const downloaded = page.waitForEvent('download');
  await page.locator('#reports-export-menu').click();
  await page.locator('#export-reports').click();
  const download = await downloaded;
  const report = JSON.parse(await fs.readFile(await download.path(), 'utf8'));
  expect(report.rows).toHaveLength(1);
  await page.getByRole('tab', { name: 'Runs', exact: true }).click();
  await page.locator('#reports-recent-runs-body [data-bs-toggle="dropdown"]').click();
  await page.locator('[data-delete-report-run]').click();
  await page.locator('#management-confirm').click();
  await expect(page.locator('#reports-run-count')).toHaveText('0');
  expect((await (await request.get('/api/history')).json()).runs).toEqual([]);
});

test('documentation search, theme, mobile drawer and return to app', async ({ page, isMobile }, testInfo) => {
  await page.goto('/docs/');
  await page.locator('#docs-search-input').fill('API');
  await expect(page.locator('#docs-search-results a').first()).toBeVisible();
  await page.locator('#docs-search-results a').first().click();
  await expect(page.locator('#on-page-nav a').first()).toHaveCount(1);
  const initial = await page.locator('html').getAttribute('data-theme');
  await page.locator('#docs-theme-toggle').click();
  const expected = initial === 'dark' ? 'light' : 'dark';
  await expect(page.locator('html')).toHaveAttribute('data-theme', expected);
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', expected);
  const widths = await page.evaluate(() => ({ client: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }));
  expect(widths.scroll).toBeLessThanOrEqual(widths.client);
  await page.screenshot({ path: testInfo.outputPath('documentation.png') });
  if (isMobile) {
    await page.locator('#docs-menu-button').click();
    await expect(page.locator('#docs-menu-button')).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('Escape');
    await expect(page.locator('#docs-menu-button')).toHaveAttribute('aria-expanded', 'false');
    await page.locator('#docs-menu-button').click();
    await page.locator('.mobile-app-link').click();
  } else {
    await page.locator('.desktop-app-link').click();
  }
  await expect(page).toHaveTitle('NetWatch Lite');
});
