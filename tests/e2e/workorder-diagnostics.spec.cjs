const { test, expect } = require('./fixtures.cjs');
const fs = require('node:fs/promises');

test('Internal errors can be searched, inspected and exported without URL credentials or query secrets', async ({ page, request }, testInfo) => {
  const message = '=FORMULA synthetic token=private-test https://user:pass@example.invalid/check?token=private-test#fragment';
  const saved = await request.post('/api/diagnostics/client', { data: { kind: 'error', message, script: '/app.js?secret=private-test', line: 10, column: 3 } });
  expect(saved.ok()).toBeTruthy();
  const reference = (await saved.json()).traceId;
  await page.goto('/diagnostics');
  await expect(page.locator('#diagnostics-body')).toContainText(reference);
  await page.locator('#diagnostics-search').fill(reference);
  await expect(page.locator('#diagnostics-page-summary')).toContainText('1 records');
  await page.locator('[data-diagnostic-detail]').click();
  await expect(page.locator('#diagnostics-detail-body')).toContainText('=FORMULA synthetic');
  await expect(page.locator('#diagnostics-detail-body')).not.toContainText('private-test');
  await expect(page.locator('#diagnostics-detail-body')).not.toContainText('user:pass');
  await page.locator('#diagnostics-detail-modal [data-bs-dismiss="modal"]').first().click();
  await expect(page.locator('#diagnostics-detail-modal')).toBeHidden();
  for (const format of ['json', 'csv']) {
    await page.locator('#diagnostics-export').click();
    await expect(page.locator(`[data-diagnostics-export="${format}"]`)).toBeVisible();
    const download = page.waitForEvent('download');
    await page.locator(`[data-diagnostics-export="${format}"]`).click();
    const data = await download;
    const text = await fs.readFile(await data.path(), 'utf8');
    expect(text).toContain(reference);
    expect(text).not.toContain('private-test');
    expect(text).not.toContain('user:pass');
    if (format === 'csv') expect(text).toContain('error: =FORMULA');
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBeTruthy();
  await page.screenshot({ path: testInfo.outputPath('diagnostics.png'), fullPage: true });
});

test('Expected website failures stay in monitoring history with actionable HTTP diagnosis, not internal errors', async ({ page, request }) => {
  const config = await (await request.get('/api/config')).json();
  config.settings = { intervalSeconds: 60, timeoutMs: 100, retryCount: 0, maxParallelChecks: 1 };
  config.devices = [{ name: 'Loopback web', ip: '127.0.0.1', facility: 'Lab', category: 'Web',
    checks: [{ type: 'http', url: 'http://127.0.0.1:1/status?private=value', timeoutMs: 100 }] }];
  expect((await request.post('/api/config', { data: config })).ok()).toBeTruthy();
  await page.goto('/?lang=es');
  await page.locator('#run-group-check').click();
  await expect.poll(async () => (await (await request.get('/api/history')).json()).runs.length).toBe(1);
  await page.goto('/diagnostics?lang=es');
  await page.locator('[data-diagnostics-source="monitoring"]').click();
  await expect(page.locator('#diagnostics-body')).toContainText('Loopback web');
  await expect(page.locator('#diagnostics-body')).toContainText(/Conexión fallida|Tiempo HTTP agotado/);
  await page.locator('[data-diagnostic-detail]').click();
  await expect(page.locator('#diagnostics-detail-body')).toContainText(/Conexión fallida|Tiempo HTTP agotado/);
  await expect(page.locator('#diagnostics-detail-body')).not.toContainText('private=value');
  expect((await (await request.get('/api/errors')).json()).errors).toHaveLength(0);
});

test('Failed reads and invalid dates disable exports and a later refresh recovers', async ({ page }) => {
  let fail = true;
  await page.route('**/api/diagnostics?**', async route => {
    if (fail) return route.fulfill({ status: 500, contentType: 'application/json', body: '{"detail":"Synthetic read failure","traceId":"test-reference"}' });
    return route.continue();
  });
  await page.goto('/diagnostics');
  await expect(page.locator('#diagnostics-alert')).toContainText('test-reference');
  await expect(page.locator('#diagnostics-export')).toBeDisabled();
  fail = false;
  await page.locator('#diagnostics-refresh').click();
  await expect(page.locator('#diagnostics-body')).toContainText('No matching diagnostics');
  await page.locator('#diagnostics-from').fill('2026-11-12');
  await page.locator('#diagnostics-to').fill('2026-11-01');
  await expect(page.locator('#diagnostics-alert')).toContainText('From must be on or before To');
  await expect(page.locator('#diagnostics-export')).toBeDisabled();
  await page.locator('#diagnostics-clear').click();
  await expect(page.locator('#diagnostics-body')).toContainText('No matching diagnostics');
});

test('The browser collector strips URL query data, deduplicates and never navigates or runs a check', async ({ page, request }) => {
  await page.goto('/');
  await page.evaluate(() => {
    for (let index = 0; index < 2; index++) window.dispatchEvent(new ErrorEvent('error', {
      message: 'Synthetic resource https://user:pass@example.invalid/resource?token=private-test',
      filename: location.origin + '/app.js?secret=private-test', lineno: 7, colno: 2
    }));
  });
  await expect.poll(async () => (await (await request.get('/api/errors')).json()).errors.length).toBe(1);
  const data = await (await request.get('/api/diagnostics')).text();
  expect(data).not.toContain('private-test');
  expect(data).not.toContain('user:pass');
  expect((await (await request.get('/api/history')).json()).runs).toHaveLength(0);
});
