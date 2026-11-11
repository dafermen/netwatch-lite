const { test, expect } = require('./fixtures.cjs');
const fs = require('node:fs/promises');

test('Deleting an execution waits for the write before refreshing reports', async ({ page, request }) => {
  await request.post('/api/config', { data: { settings: { timeoutMs: 300, retryCount: 0 },
    devices: [{ name: 'Delete race fixture', ip: '127.0.0.1', checks: [{ type: 'ping' }] }] } });
  expect((await request.post('/api/monitor/run')).ok()).toBeTruthy();
  await page.goto('/reports');
  await expect(page.locator('#reports-run-count')).toHaveText('1');
  await page.getByRole('tab', { name: 'Runs', exact: true }).click();
  await expect(page.locator('#reports-recent-runs-body [data-bs-toggle="dropdown"]')).toBeEnabled();
  let release, entered;
  const pending = new Promise(resolve => { release = resolve; });
  const started = new Promise(resolve => { entered = resolve; });
  let deleting = false;
  const concurrentQueries = [];
  page.on('request', req => {
    if (deleting && new URL(req.url()).pathname === '/api/reports/query') concurrentQueries.push(req.url());
  });
  await page.route('**/api/history/runs/*', async route => {
    entered();
    await pending;
    deleting = false;
    await route.continue();
  });
  await page.locator('#reports-recent-runs-body [data-bs-toggle="dropdown"]').click();
  await page.locator('[data-delete-report-run]').click();
  deleting = true;
  await page.locator('#management-confirm').click();
  try {
    await started;
    // Hold the write longer than the SQL render debounce to expose read/write overlap.
    await page.waitForTimeout(300);
    expect(concurrentQueries, 'No report query may supersede the pending deletion').toEqual([]);
  } finally { release(); }
  await expect(page.locator('#reports-run-count')).toHaveText('0');
  await expect(page.locator('#reports-state')).toContainText('No monitoring executions recorded');
  expect((await (await request.get('/api/history')).json()).runs).toHaveLength(0);
});

test('SQL reports use bounded pages, whole-filter metrics and complete exports', async ({ page, request }, testInfo) => {
  const storage = await (await request.get('/api/storage')).json();
  if (storage.provider !== 'sqlite') {
    expect((await request.get('/api/reports/query')).status()).toBe(400);
    return;
  }
  const configuration = { settings: { timeoutMs: 300, retryCount: 0 }, devices: Array.from({ length: 12 }, (_, index) => ({
    name: `Desk ${String(index + 1).padStart(2, '0')}`, ip: '127.0.0.1', facility: index < 6 ? 'Office' : 'Plant', category: 'Workstations',
    deviceType: 'workstation', checks: [{ type: 'ping' }]
  })) };
  expect((await request.post('/api/config', { data: configuration })).ok()).toBeTruthy();
  for (let index = 0; index < 11; index++) expect((await request.post('/api/monitor/run')).ok()).toBeTruthy();
  const historyReads = [];
  page.on('request', req => { if (new URL(req.url()).pathname === '/api/history') historyReads.push(req.url()); });
  await page.goto('/reports');
  await expect(page.locator('#reports-row-count')).toHaveText('132');
  await expect(page.locator('#reports-device-count')).toHaveText('12');
  await expect(page.locator('#reports-run-count')).toHaveText('11');
  await page.getByRole('tab', { name: 'Devices', exact: true }).click();
  await expect(page.locator('#reports-table-body [data-report-evaluation]')).toHaveCount(10);
  await page.locator('#reports-next-page').click();
  await expect(page.locator('#reports-page-summary')).toContainText('11-20 / 132');
  await expect(page.locator('#reports-row-count')).toHaveText('132');
  await page.locator('#reports-facility-filter').selectOption('Plant');
  await expect(page.locator('#reports-row-count')).toHaveText('66');
  await page.locator('#reset-report-filters').click();
  await expect(page.locator('#reports-row-count')).toHaveText('132');
  await page.locator('#reports-period-filter').selectOption('custom');
  await page.locator('#reports-from-date').fill('2030-01-02');
  await expect(page.locator('#reports-from-date')).toBeEnabled();
  await page.locator('#reports-to-date').fill('2020-01-01');
  await expect(page.locator('#reports-range-error')).toContainText('From must');
  await expect(page.locator('#reports-to-date')).toBeEnabled();
  await page.locator('#reset-report-filters').click();
  await expect(page.locator('#reports-row-count')).toHaveText('132');
  await page.locator('#reports-search').fill('  Desk 01  ');
  await expect(page.locator('#reports-row-count')).toHaveText('11');
  await page.locator('#reset-report-filters').click();
  await expect(page.locator('#reports-row-count')).toHaveText('132');
  await page.locator('#reports-export-menu').click();
  const download = page.waitForEvent('download');
  await page.locator('#export-reports').click();
  const artifact = await download;
  const exported = JSON.parse(await fs.readFile(await artifact.path(), 'utf8'));
  expect(exported.rows).toHaveLength(132);
  expect(historyReads).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
  await page.screenshot({ path: testInfo.outputPath('sql-reports.png'), fullPage: true });
});

test('data policy, verified backups and escaped change history are usable', async ({ page, request }, testInfo) => {
  const sqlite = (await (await request.get('/api/storage')).json()).provider === 'sqlite';
  await page.goto('/config');
  await page.locator('#storage-tools > summary').click();
  await expect(page.locator('#history-max-runs')).toHaveValue('500');
  await page.locator('#history-max-runs').fill('20');
  await page.locator('#backup-copies').fill('3');
  await page.locator('#storage-policy-form button[type=submit]').click();
  await expect(page.locator('#management-confirm-modal')).toBeVisible();
  await page.locator('#management-confirm').click();
  await expect(page.locator('#storage-alert')).toContainText('Data policy saved');
  expect((await (await request.get('/api/storage/policy')).json()).historyMaxRuns).toBe(20);
  if (sqlite) {
    await page.locator('#storage-backup-now').click();
    await expect(page.locator('#storage-alert')).toContainText('integrity verified');
    await expect(page.locator('#storage-backups-body')).toContainText('manual-');
    await page.locator('#storage-audit-refresh').click();
    await expect(page.locator('#storage-audit-body')).toContainText('storage-policy.json');
  } else await expect(page.locator('#storage-backup-now')).toBeDisabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
  expect(await page.locator('#storage-tools td').evaluateAll(cells => cells.every(cell => cell.scrollWidth <= cell.clientWidth + 1))).toBeTruthy();
  expect(await page.locator('#storage-tools table').evaluateAll(tables => tables.every(table => table.getBoundingClientRect().width <= table.parentElement.clientWidth + 1))).toBeTruthy();
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
  await page.screenshot({ path: testInfo.outputPath('data-backups.png'), fullPage: true });
});
