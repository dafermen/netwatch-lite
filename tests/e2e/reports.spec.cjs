const { test, expect } = require('./fixtures.cjs');
const fs = require('node:fs/promises');

test.use({ timezoneId: 'America/New_York' });

const result = (name, status = 'Healthy', extra = {}) => ({
  name, ip: '127.0.0.1', hostname: `${name.toLowerCase().replaceAll(' ', '-')}.example.test`,
  region: 'North', supportGroup: 'Team A', facility: 'Alpha', category: 'Workstations',
  status, isOnline: status === 'Healthy', checks: [{ type: 'ping', label: 'Ping', isAvailable: status === 'Healthy', latencyMs: status === 'Healthy' ? 5 : null }], ...extra
});
const run = (runId, completedAt, results, extra = {}) => ({
  runId, completedAt, startedAt: completedAt, durationMs: 120, checkMode: 'Full', executionStatus: 'Completed',
  scope: { region: 'North', supportGroup: 'Team A' }, results, ...extra
});
const dataset = () => ({ schemaVersion: 1, runs: [
  run('old-ping', '2026-10-20T10:00:00-04:00', [result('Desk one')], { checkMode: 'PingOnly' }),
  run('empty-run', '2026-11-05T10:00:00-05:00', []),
  run('yesterday', '2026-11-06T10:00:00-05:00', [result('Desk one', 'Down'), result('Desk two')]),
  run('today-a', '2026-11-07T10:00:00-05:00', [result('Desk one'), result('Web portal', 'Down', {
    category: 'Applications', checks: [{ type: 'http', label: 'HTTP', url: 'https://example.test/health', isAvailable: false,
      statusCode: 503, expectedStatusCode: 200, durationMs: 42, message: 'HTTP 503; expected 200' }] }),
    { name: 'Legacy record', ip: '127.0.0.2', facility: 'Alpha', category: 'Other', checks: [] }]),
  run('today-b', '2026-11-07T11:00:00-05:00', [result('Desk one', 'Healthy', { supportGroup: 'Team B' })], {
    scope: { region: 'North', supportGroup: 'Team B', facility: 'Alpha' }
  })
] });

async function serveHistory(page, data = dataset()) {
  let current = data;
  // These legacy presentation cases intentionally exercise the compatible JSON adapter.
  await page.route('**/api/storage', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ provider: 'json' }) }));
  await page.clock.setFixedTime(new Date('2026-11-07T16:00:00-05:00'));
  await page.route('**/api/history', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(current) }));
  return { set: value => { current = value; }, get: () => current };
}
const rows = page => page.locator('#reports-table-body [data-report-evaluation]');
const tab = (page, name) => page.getByRole('tab', { name, exact: true });
async function exportReport(page, format) {
  await page.locator('#reports-export-menu').click();
  const pending = page.waitForEvent('download');
  await page.locator(format === 'csv' ? '#export-reports-csv' : '#export-reports').click();
  const download = await pending;
  return { name: download.suggestedFilename(), text: await fs.readFile(await download.path(), 'utf8') };
}
async function deleteMenu(page, id) {
  const item = page.locator(`[data-report-run="${id}"]`);
  await item.locator('[data-bs-toggle="dropdown"]').click();
  await item.locator('[data-delete-report-run]').click();
  await expect(page.locator('#management-confirm-modal')).toBeVisible();
}
async function withinViewport(page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBeTruthy();
}

test('report tabs show honest metrics and profile-separated drilldowns without writes', async ({ page, request }, testInfo) => {
  await serveHistory(page);
  const before = await (await request.get('/api/history')).json();
  const writes = [];
  page.on('request', req => { if (req.method() !== 'GET' && new URL(req.url()).pathname.startsWith('/api/')) writes.push(req.url()); });
  await page.goto('/reports');
  await expect(page.locator('#reports-run-count')).toHaveText('5');
  await expect(page.locator('#reports-device-count')).toHaveText('5');
  await expect(page.locator('#reports-row-count')).toHaveText('7');
  await expect(page.locator('#reports-problem-count')).toHaveText('2');
  await expect(page.locator('#reports-avg-availability')).toHaveText('66.7%');
  await expect(page.locator('#reports-healthy-count')).toHaveText('4 / 6');
  await expect(tab(page, 'Summary')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#reports-facility-executive-body tr')).toHaveCount(2);
  await tab(page, 'Summary').focus();
  await page.keyboard.press('ArrowRight');
  await expect(tab(page, 'Runs')).toBeFocused();
  await expect(page.locator('[data-report-run="empty-run"] [data-report-open-run]')).toBeDisabled();
  await page.keyboard.press('End');
  await expect(tab(page, 'Devices')).toBeFocused();
  await expect(rows(page)).toHaveCount(7);
  await page.keyboard.press('Home');
  await page.locator('[data-report-facility]').filter({ hasText: 'Alpha' }).first().click();
  await expect(tab(page, 'Devices')).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#reports-profile-filter')).not.toHaveValue('');
  await expect(page.locator('#reports-row-count')).toHaveText('6');
  await page.locator('#reset-report-filters').click();
  await expect(tab(page, 'Devices')).toHaveAttribute('aria-selected', 'true');
  await expect(rows(page)).toHaveCount(7);
  await tab(page, 'Summary').click();
  await page.locator('[data-report-group="category"]').click();
  await expect(page.locator('#reports-category-panel')).toBeVisible();
  await page.locator('[data-report-category="Applications"]').click();
  await expect(rows(page)).toHaveCount(1);
  await expect(rows(page)).toContainText('Web portal');
  expect(writes).toEqual([]);
  expect(await (await request.get('/api/history')).json()).toEqual(before);
  await withinViewport(page);
  await page.locator('#reset-report-filters').click();
  await tab(page, 'Summary').click();
  await page.locator('[data-report-group="facility"]').click();
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await page.screenshot({ path: testInfo.outputPath('reports-summary.png'), fullPage: true });
});

test('shared filters, periods, invalid ranges and removable chips retain the selected view', async ({ page }) => {
  await serveHistory(page);
  await page.goto('/reports');
  await expect(page.locator('#reports-row-count')).toHaveText('7');
  await page.locator('#reports-period-filter').selectOption('today');
  await expect(page.locator('#reports-row-count')).toHaveText('4');
  await page.locator('#reports-period-filter').selectOption('7');
  await expect(page.locator('#reports-row-count')).toHaveText('6');
  await page.locator('#reports-period-filter').selectOption('30');
  await expect(page.locator('#reports-row-count')).toHaveText('7');
  await page.locator('#reports-profile-filter').selectOption({ label: 'Team A / North' });
  await page.locator('#reports-category-filter').selectOption('Workstations');
  await expect(page.locator('#reports-row-count')).toHaveText('4');
  await page.locator('#reports-mode-filter').selectOption('PingOnly');
  await expect(page.locator('#reports-row-count')).toHaveText('1');
  await page.locator('[data-report-remove-filter="mode"]').click();
  await page.locator('#reports-status-filter').selectOption('Problems');
  await expect(page.locator('#reports-row-count')).toHaveText('1');
  await page.locator('#reports-search').fill('DESK-ONE.EXAMPLE.TEST');
  await expect(page.locator('#reports-row-count')).toHaveText('1');
  await page.locator('#reset-report-filters').click();
  await tab(page, 'Devices').click();
  await page.locator('#reports-period-filter').selectOption('custom');
  await page.locator('#reports-from-date').fill('2026-11-06');
  await page.locator('#reports-to-date').fill('2026-11-06');
  await expect(rows(page)).toHaveCount(2);
  await page.locator('#reports-to-date').fill('2026-11-05');
  await expect(page.locator('#reports-range-error')).toContainText('From must');
  await expect(page.locator('#reports-avg-availability')).toHaveText('-');
  await expect(page.locator('#reports-export-menu')).toBeDisabled();
  await page.locator('#reset-report-filters').click();
  await expect(rows(page)).toHaveCount(7);
  await expect(tab(page, 'Devices')).toHaveAttribute('aria-selected', 'true');
  await page.locator('#reports-search').fill('does-not-exist');
  await expect(rows(page)).toHaveCount(0);
  await expect(page.locator('#reports-state')).toContainText('No results match');
  await expect(page.locator('#reports-avg-availability')).toHaveText('-');
});

test('evaluation detail escapes diagnostics and navigates to its exact device history and execution', async ({ page, isMobile }, testInfo) => {
  const data = dataset();
  const malicious = '<img src=x onerror=alert(1)>';
  data.runs[3].results[0].checks.push({ type: 'tcp', label: 'TCP 443', port: 443, isAvailable: false, status: malicious });
  await serveHistory(page, data);
  await page.goto('/');
  if (isMobile) await page.locator('#sidebar-toggle').click();
  await page.locator('a.nav-link[data-route="/reports"]').click();
  await tab(page, 'Devices').click();
  const opener = rows(page).filter({ hasText: 'Desk one' }).filter({ hasText: 'Team A / North' }).first().getByRole('button', { name: 'Desk one', exact: true });
  await opener.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#reports-detail-modal')).toBeVisible();
  await expect(page.locator('#reports-detail-body')).toContainText(malicious);
  await expect(page.locator('#reports-detail-body img')).toHaveCount(0);
  await expect(page.locator('#reports-detail-body')).toContainText('TCP 443');
  await expect(page.locator('#reports-detail-body')).toContainText('Run duration');
  await expect(page.getByRole('button', { name: 'Close evaluation', exact: true })).toBeFocused();
  const bounds = await page.locator('.reports-detail-dialog').boundingBox();
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(page.viewportSize().width + 1);
  await withinViewport(page);
  await page.screenshot({ path: testInfo.outputPath('reports-detail.png') });
  await page.keyboard.press('Escape');
  await expect(page.locator('#reports-detail-modal')).toBeHidden();
  await expect(opener).toBeFocused();
  await opener.click();
  await page.locator('#reports-detail-device').click();
  await expect(page.locator('#reports-detail-modal')).toBeHidden();
  await expect(rows(page)).toHaveCount(3);
  await expect(page.locator('[data-report-remove-filter="deviceKey"]')).toBeVisible();
  await rows(page).first().getByRole('button', { name: 'Desk one', exact: true }).click();
  await page.locator('#reports-detail-run').click();
  await expect(page.locator('#reports-detail-modal')).toBeHidden();
  await expect(rows(page)).toHaveCount(1);
  await expect(page.locator('[data-report-remove-filter="runKey"]')).toBeVisible();
  await page.locator('#reset-report-filters').click();
  await rows(page).getByRole('button', { name: 'Web portal', exact: true }).click();
  await expect(page.locator('#reports-detail-body')).toContainText('HTTP 503 / expected 200');
  await expect(page.locator('#reports-detail-body')).toContainText('Duration: 42 ms');
  await page.goBack();
  await expect(page.locator('#reports-detail-modal')).toBeHidden();
  await expect(page.locator('.topbar-actions')).toBeVisible();
});

test('empty history and unrecorded legacy values stay neutral and distinct from failed checks', async ({ page }) => {
  const history = await serveHistory(page, { runs: [] });
  await page.goto('/reports');
  await expect(page.locator('#reports-state')).toContainText('No monitoring executions');
  await expect(page.locator('#reports-run-count')).toHaveText('0');
  await expect(page.locator('#reports-avg-availability')).toHaveText('-');
  await expect(page.locator('#reports-export-menu')).toBeDisabled();
  history.set({ runs: [run('legacy', null, [{ name: 'Legacy', ip: '127.0.0.1', status: 'constructor', latencyMs: {} }], { scope: null, durationMs: null })] });
  await page.locator('#refresh-reports').click();
  await expect(page.locator('#reports-row-count')).toHaveText('1');
  await expect(page.locator('#reports-problem-count')).toHaveText('0');
  await expect(page.locator('#reports-avg-availability')).toHaveText('-');
  await expect(page.locator('#reports-coverage')).toHaveText('Dates not recorded');
  await tab(page, 'Devices').click();
  await expect(rows(page)).toContainText('Not recorded');
  await expect(rows(page).locator('.text-bg-danger')).toHaveCount(0);
  await rows(page).getByRole('button', { name: 'Legacy', exact: true }).click();
  await expect(page.locator('#reports-detail-body')).toContainText('Checks not recorded.');
  await expect(page.locator('#reports-detail-body')).not.toContainText('0 ms');
  await page.getByRole('button', { name: 'Close evaluation', exact: true }).click();
  const exported = JSON.parse((await exportReport(page, 'json')).text);
  expect(exported.rows[0].latencyMs).toBeNull();
});

test('failed and malformed history reloads clear stale results and retry restores real data', async ({ page }) => {
  const history = await serveHistory(page);
  await page.goto('/reports');
  await expect(page.locator('#reports-row-count')).toHaveText('7');
  history.set({ runs: [{ runId: 'broken', results: 'invalid' }] });
  await page.locator('#refresh-reports').click();
  await expect(page.locator('#reports-alert')).toContainText('History response is invalid');
  await expect(page.locator('#reports-row-count')).toHaveText('-');
  await expect(page.locator('#reports-export-menu')).toBeDisabled();
  await expect(page.locator('#reports-search')).toBeDisabled();
  await expect(rows(page)).toHaveCount(0);
  await expect(page.locator('[data-delete-report-run]')).toHaveCount(0);
  await page.route('**/api/history', route => route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"Synthetic history unavailable"}' }));
  await page.locator('#refresh-reports').click();
  await expect(page.locator('#reports-alert')).toContainText('Synthetic history unavailable');
  await page.unroute('**/api/history');
  await serveHistory(page);
  await page.locator('#refresh-reports').click();
  await expect(page.locator('#reports-row-count')).toHaveText('7');
  await expect(page.locator('#reports-search')).toBeEnabled();
});

test('duplicate legacy execution IDs remain readable and cannot cause ambiguous deletion', async ({ page }) => {
  await serveHistory(page, { runs: [
    run('same-id', '2026-11-07T10:00:00-05:00', [result('First legacy')]),
    run('same-id', '2026-11-07T11:00:00-05:00', [result('Second legacy', 'Down')])
  ] });
  let deletes = 0;
  page.on('request', req => { if (req.method() === 'DELETE') deletes++; });
  await page.goto('/reports');
  await expect(page.locator('#reports-run-count')).toHaveText('2');
  await expect(page.locator('#reports-row-count')).toHaveText('2');
  await tab(page, 'Runs').click();
  await expect(page.locator('[data-report-open-run]')).toHaveCount(2);
  await expect(page.locator('[data-delete-report-run]').first()).toBeDisabled();
  await expect(page.locator('[data-delete-report-run]').last()).toBeDisabled();
  await page.locator('[data-report-open-run]').first().click();
  await expect(rows(page)).toHaveCount(1);
  await expect(rows(page)).toContainText('Second legacy');
  await rows(page).getByRole('button', { name: 'Second legacy', exact: true }).click();
  await expect(page.locator('#reports-detail-body')).toContainText('same-id');
  await page.locator('#reports-detail-run').click();
  await expect(page.locator('#reports-detail-modal')).toBeHidden();
  await expect(rows(page)).toHaveCount(1);
  expect(deletes).toBe(0);
});

test('an older delayed read cannot replace a newer report snapshot', async ({ page, isMobile }) => {
  await page.route('**/api/storage', route => route.fulfill({ contentType: 'application/json', body: '{"provider":"json"}' }));
  let oldRoute;
  let calls = 0;
  await page.route('**/api/history', route => {
    if (++calls === 1) { oldRoute = route; return; }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(dataset()) });
  });
  await page.goto('/reports');
  await expect.poll(() => calls).toBe(1);
  await expect(page.locator('#reports-export-menu')).toBeDisabled();
  if (isMobile) await page.locator('#sidebar-toggle').click();
  await page.locator('a.nav-link[data-route="/reports"]').click();
  await expect(page.locator('#reports-row-count')).toHaveText('7');
  const completed = page.waitForResponse(response => response.url().endsWith('/api/history') && response.status() === 200);
  await oldRoute.fulfill({ status: 200, contentType: 'application/json', body: '{"runs":[]}' });
  await (await completed).finished();
  await page.evaluate(() => new Promise(requestAnimationFrame));
  await expect(page.locator('#reports-row-count')).toHaveText('7');
  await expect(page.locator('#reports-export-menu')).toBeEnabled();
  await expect(page.locator('.topbar-status')).toBeHidden();
  await expect(page.locator('#app-language')).toBeVisible();
  if (isMobile) await page.locator('#sidebar-toggle').click();
  await page.locator('a.nav-link[data-route="/"]').click();
  await expect(page.locator('.topbar-actions')).toBeVisible();
});

test('CSV quotes separators and formula prefixes while JSON preserves exact filtered values', async ({ page }) => {
  const names = ['=1+2', ' +SUM(1,1)', '\t=1+1', '@formula', '-1+2', '+1+2', '\uff1d1+2', 'Desk "quoted",\nsecond line'];
  const data = { runs: [run('csv', '2026-11-07T10:00:00-05:00', names.map(name => result(name, 'Healthy', { hostname: '' })))] };
  await serveHistory(page, data);
  await page.goto('/reports');
  await expect(page.locator('#reports-row-count')).toHaveText(String(names.length));
  const csv = await exportReport(page, 'csv');
  expect(csv.name).toMatch(/\.csv$/);
  expect(csv.text.startsWith('\ufeff"Recorded UTC"')).toBeTruthy();
  expect(csv.text).toContain('"\'=1+2"');
  expect(csv.text).toContain('"\' +SUM(1,1)"');
  expect(csv.text).toContain('"\'\t=1+1"');
  expect(csv.text).toContain('"\'\uff1d1+2"');
  expect(csv.text).toContain('"Desk ""quoted"",\nsecond line"');
  expect(csv.text).toContain('Applied filters JSON');
  await page.locator('#reports-search').fill('Desk "quoted"');
  await expect(page.locator('#reports-row-count')).toHaveText('1');
  const json = JSON.parse((await exportReport(page, 'json')).text);
  expect(json.rows.map(row => row.deviceName)).toEqual([names.at(-1)]);
  expect(json.filters.search).toBe('Desk "quoted"');
});

test('table pagination and sorting reset correctly across all three report views', async ({ page, isMobile }) => {
  const data = { runs: Array.from({ length: 16 }, (_, index) => run(`page-${index}`, `2026-11-07T${String(index).padStart(2, '0')}:00:00-05:00`,
    [result(`Desk ${String(index).padStart(2, '0')}`, 'Healthy', { facility: `Site ${index}` }), result(`Other ${index}`, 'Down', { facility: `Site ${index}` })])) };
  await serveHistory(page, data);
  await page.goto('/reports');
  await expect(page.locator('#reports-facility-executive-body tr')).toHaveCount(10);
  await page.locator('#reports-facility-next-page').click();
  await expect(page.locator('#reports-facility-executive-body tr')).toHaveCount(6);
  await tab(page, 'Runs').click();
  await expect(page.locator('#reports-recent-runs-body tr')).toHaveCount(10);
  await page.locator('#reports-runs-next-page').click();
  await expect(page.locator('#reports-recent-runs-body tr')).toHaveCount(6);
  await tab(page, 'Devices').click();
  if (isMobile) await page.locator('#reports-device-sort').selectOption('deviceName:asc');
  else await page.locator('[data-report-sort="deviceName"]').click();
  await expect(rows(page).first()).toContainText('Desk 00');
  await page.locator('#reports-next-page').click();
  await expect(rows(page).first()).toContainText('Desk 10');
  await page.locator('#reports-page-size').selectOption('25');
  await expect(rows(page)).toHaveCount(25);
  await expect(rows(page).first()).toContainText('Desk 00');
  await page.locator('#reports-status-filter').selectOption('Down');
  await expect(rows(page)).toHaveCount(16);
  await expect(page.locator('#reports-prev-page')).toBeDisabled();
  await withinViewport(page);
});

test('run deletion confirms scope and retains data on cancellation and server failure', async ({ page, isMobile }) => {
  const history = await serveHistory(page);
  let deletes = 0;
  let fail = true;
  await page.route('**/api/history/runs/*', route => {
    deletes++;
    if (fail) return route.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"Synthetic deletion failed"}' });
    const id = decodeURIComponent(new URL(route.request().url()).pathname.split('/').at(-1));
    history.set({ ...history.get(), runs: history.get().runs.filter(item => item.runId !== id) });
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(history.get()) });
  });
  await page.goto('/');
  if (isMobile) await page.locator('#sidebar-toggle').click();
  await page.locator('a.nav-link[data-route="/reports"]').click();
  await tab(page, 'Runs').click();
  await deleteMenu(page, 'today-a');
  await expect(page.locator('#management-confirm-message')).toContainText('Delete the execution recorded');
  await page.locator('#management-cancel').click();
  await expect(page.locator('#management-confirm-modal')).toBeHidden();
  expect(deletes).toBe(0);
  await deleteMenu(page, 'today-a');
  await page.locator('#management-confirm').click();
  await expect(page.locator('#reports-alert')).toContainText('Synthetic deletion failed');
  await expect(page.locator('#reports-row-count')).toHaveText('7');
  await expect(page.locator('[data-report-run="today-a"]')).toBeVisible();
  fail = false;
  await deleteMenu(page, 'today-a');
  await page.locator('#management-confirm').click();
  await expect(page.locator('#reports-row-count')).toHaveText('4');
  await expect(page.locator('[data-report-run="today-a"]')).toHaveCount(0);
  expect(deletes).toBe(2);
  expect(history.get().runs).toHaveLength(4);
  await deleteMenu(page, 'today-b');
  await page.goBack();
  await expect(page.locator('#management-confirm-modal')).toBeHidden();
  expect(deletes).toBe(2);
  await page.goForward();
  await expect(page.locator('#reports-run-count')).toHaveText('4');
});
