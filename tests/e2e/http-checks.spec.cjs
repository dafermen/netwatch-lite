const { test, expect } = require('./fixtures.cjs');
const http = require('node:http');
const fs = require('node:fs/promises');

async function webTarget() {
  const server = http.createServer((request, response) => {
    response.setHeader('Content-Type', 'text/plain; charset=utf-8');
    if (request.url.startsWith('/slow')) {
      const timer = setTimeout(() => response.end('READY'), 2000);
      response.on('close', () => clearTimeout(timer));
    } else if (request.url.startsWith('/down')) {
      response.writeHead(503).end('Unavailable');
    } else if (request.url.startsWith('/redirect')) {
      response.writeHead(302, { Location: '/ok' }).end();
    } else {
      response.end(request.url.startsWith('/missing') ? 'Maintenance' : 'Service READY');
    }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return {
    url: `http://127.0.0.1:${server.address().port}`,
    close: async () => { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
  };
}

const probe = (url, text = 'READY', timeoutMs = 3000) => ({ type: 'http', url, timeoutMs, expectedStatusCode: 200, expectedText: text });
const device = (name, checks) => ({ name, ip: '127.0.0.1', facility: 'Web Lab', category: 'Web Apps', checks });

async function expandConfig(page) {
  for (const attribute of ['data-config-facility-toggle', 'data-config-category-toggle']) {
    for (const toggle of await page.locator(`[${attribute}][aria-expanded="false"]`).all()) await toggle.click();
  }
}

test('HTTP field help is accessible per check, wraps on mobile and retries remain configurable', async ({ page, request }, testInfo) => {
  await request.post('/api/config', { data: { devices: [] } });
  await page.goto('/config');
  await expect(page.locator('#retry-count')).toBeEnabled();
  await page.locator('#retry-count').fill('2');
  await page.locator('#retry-delay-ms').fill('500');
  await page.locator('#save-config').click();
  await expect(page.locator('#config-alert')).toContainText('Settings saved');
  const savedSettings = (await (await request.get('/api/config')).json()).settings;
  expect(savedSettings.retryCount).toBe(2);
  expect(savedSettings.retryDelayMs).toBe(500);
  await page.locator('#add-device').click();
  await page.locator('#device-monitoring-preset').selectOption('web');
  await expect(page.locator('[data-http-timeout-help]')).toContainText('10000 ms = 10 s');
  await expect(page.locator('[data-http-timeout-help]')).toContainText('no cantidad de pings');
  await expect(page.locator('[data-http-timeout-help]')).toContainText('0 = un intento; 2 = hasta tres si falla');
  await expect(page.locator('[data-http-text-help]')).toContainText('READY');
  await expect(page.locator('[data-http-text-help]')).toContainText('sensible a may\u00fasculas');
  await expect(page.locator('[data-http-text-help]')).toContainText('Vac\u00edo: solo el c\u00f3digo esperado');
  await expect(page.locator('#device-shortcuts-help')).toHaveCount(0);
  await expect(page.locator('#device-command-help')).toHaveText('Comando para copiar al portapapeles. No se ejecuta autom\u00e1ticamente.');
  for (const field of ['timeout', 'text']) {
    const input = page.locator(`[data-check-${field}]`);
    const help = page.locator(`[data-http-${field}-help]`);
    await expect(input).toHaveAttribute('aria-describedby', await help.getAttribute('id'));
    await help.scrollIntoViewIfNeeded();
    expect(await help.evaluate(element => element.scrollWidth <= element.clientWidth)).toBeTruthy();
    await page.screenshot({ path: testInfo.outputPath(`http-${field}-help.png`) });
  }
  expect(await page.locator('#device-form-modal .modal-body').evaluate(element => element.scrollWidth <= element.clientWidth)).toBeTruthy();
  await page.locator('#add-check').click();
  page.once('dialog', dialog => dialog.accept());
  await page.locator('[data-check-type]').last().selectOption('http');
  await expect(page.locator('[data-http-fields]').last()).toBeVisible();
  const references = await page.locator('[data-check-timeout], [data-check-text]').evaluateAll(inputs => inputs.map(input => input.getAttribute('aria-describedby')));
  expect(new Set(references).size).toBe(4);
  await page.locator('[data-remove-check]').last().click();
  await expect(page.locator('[data-http-timeout-help]')).toHaveCount(1);
  expect((await (await request.get('/api/config')).json()).devices).toHaveLength(0);
  expect((await (await request.get('/api/history')).json()).runs).toHaveLength(0);
});

test('HTTP editor preserves URL rules through reload, copy, bulk edit and export', async ({ page, request }, testInfo) => {
  test.setTimeout(45000);
  const target = await webTarget();
  try {
    expect((await request.post('/api/config', { data: { devices: [] } })).ok()).toBeTruthy();
    await page.goto('/config');
    await page.locator('#add-device').click();
    await expect(page.locator('#device-form-modal .modal-dialog')).toHaveCSS('transform', 'none');
    await page.locator('#device-name').fill('Web portal');
    await page.locator('#device-category').fill('Web Apps');
    await page.locator('[data-check-type]').selectOption('http');
    await expect(page.locator('#device-address')).not.toHaveAttribute('required', '');
    await expect(page.locator('[data-check-port]')).toBeHidden();
    await page.locator('[data-check-url]').fill(`${target.url}/ok`);
    await page.locator('[data-check-timeout]').fill('4500');
    await page.locator('[data-check-text]').fill('READY');
    await page.locator('[data-http-fields]').scrollIntoViewIfNeeded();
    await page.screenshot({ path: testInfo.outputPath('http-editor.png') });
    expect(await page.locator('#device-form-modal .modal-body').evaluate(element => element.scrollWidth <= element.clientWidth)).toBeTruthy();
    await page.locator('#submit-device').click();
    await expect(page.locator('#device-form-modal')).toBeHidden();
    await page.reload();
    await expect(page.locator('[data-config-facility-toggle]').first()).toBeVisible();
    await expandConfig(page);
    await page.locator('[data-edit-device]').click();
    await expect(page.locator('#device-address')).toHaveValue('127.0.0.1');
    await expect(page.locator('[data-check-type]')).toHaveValue('http');
    await expect(page.locator('[data-check-timeout]')).toHaveValue('4500');
    await expect(page.locator('[data-check-text]')).toHaveValue('READY');
    await expect(page.locator('#device-form-modal .modal-dialog')).toHaveCSS('transform', 'none');
    await page.locator('#device-form-modal .btn-close').click();
    await expect(page.locator('#device-form-modal')).toBeHidden();
    await page.locator('[data-copy-device]').click();
    await page.locator('#device-name').fill('Portal copy');
    await page.locator('#submit-device').click();
    await expect(page.locator('#device-form-modal')).toBeHidden();
    await page.locator('#config-bulk-view').click();
    for (const toggle of await page.locator('[data-bulk-facility-toggle][aria-expanded="false"]').all()) await toggle.click();
    const row = page.locator('[data-bulk-index="1"]');
    await row.locator('[data-bulk-field="name"]').fill('Portal renamed');
    await row.locator('[data-bulk-save]').click();
    await expect(page.locator('#config-alert')).toContainText("Device 'Portal renamed' saved.");
    const exported = await (await request.get('/api/config/export')).json();
    expect(exported.devices.map(item => item.name)).toEqual(['Web portal', 'Portal renamed']);
    expect(exported.devices[1].checks).toEqual([probe(`${target.url}/ok`, 'READY', 4500)]);
  } finally { await target.close(); }
});

test('HTTP failures appear in dashboard, history and export; Ping Only skips HTTP', async ({ page, request }, testInfo) => {
  test.setTimeout(45000);
  const target = await webTarget();
  try {
    const devices = [
      device('Healthy app', [probe(`${target.url}/ok`)]),
      device('Down app', [probe(`${target.url}/down`)]),
      device('Wrong content', [probe(`${target.url}/missing`)]),
      device('Slow app', [probe(`${target.url}/slow`, null, 150)]),
      device('Partial app', [probe(`${target.url}/ok`), probe(`${target.url}/down`)]),
      device('Redirected app', [probe(`${target.url}/redirect`)])
    ];
    expect((await request.post('/api/config', { data: { devices } })).ok()).toBeTruthy();
    await page.goto('/');
    await page.locator('#run-facility-check').click();
    await expect(page.locator('#last-check')).toContainText('Last execution:');
    await expect(page.locator('#metric-total')).toHaveText('6');
    for (const selector of ['#results-body .facility-toggle', '#results-body .category-toggle']) {
      for (const button of await page.locator(`${selector}[aria-expanded="false"]`).all()) await button.click();
    }
    const results = page.locator('#results-body');
    await expect(results).toContainText('expected 200');
    await expect(results).toContainText('expected text was not found');
    await expect(results).toContainText('150 ms timeout');
    await expect(results).toContainText('Redirects are not followed');
    await expect(results.locator('tr').filter({ hasText: 'Partial app' })).toContainText('Degraded');
    await expect(results.locator('tr').filter({ hasText: 'Healthy app' })).toContainText('Healthy');
    await results.locator('.http-check-result').first().scrollIntoViewIfNeeded();
    await page.screenshot({ path: testInfo.outputPath('http-dashboard.png') });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBeTruthy();
    await page.goto('/reports');
    await page.getByRole('tab', { name: 'Devices', exact: true }).click();
    await page.locator('#reports-table-body').getByRole('button', { name: 'Wrong content', exact: true }).click();
    await expect(page.locator('#reports-detail-body')).toContainText('expected text was not found');
    await page.getByRole('button', { name: 'Close evaluation', exact: true }).click();
    await expect(page.locator('#reports-detail-modal')).toBeHidden();
    await page.locator('#reports-table-body').getByRole('button', { name: 'Slow app', exact: true }).click();
    await expect(page.locator('#reports-detail-body')).toContainText('150 ms timeout');
    await page.getByRole('button', { name: 'Close evaluation', exact: true }).click();
    await expect(page.locator('#reports-detail-modal')).toBeHidden();
    const downloaded = page.waitForEvent('download');
    await page.locator('#reports-export-menu').click();
    await page.locator('#export-reports').click();
    const report = JSON.parse(await fs.readFile(await (await downloaded).path(), 'utf8'));
    expect(report.rows.find(row => row.deviceName === 'Down app').checks[0].statusCode).toBe(503);
    await page.goto('/');
    await page.locator('label[for="check-mode-ping"]').click();
    await page.locator('#run-facility-check').click();
    await expect(page.locator('#last-check')).toContainText('Last execution:');
    await expect(page.locator('#results-body')).toContainText('HTTP skipped - Ping Only');
    const history = await (await request.get('/api/history')).json();
    expect(history.runs.at(-1).results.every(result => result.checks.every(check => check.type === 'ping'))).toBeTruthy();
  } finally { await target.close(); }
});

test('HTTP URL credentials are rejected and expected text is rendered safely', async ({ page, request }) => {
  await request.post('/api/config', { data: { devices: [] } });
  await page.goto('/config');
  await page.locator('#add-device').click();
  await page.locator('#device-name').fill('Safe probe');
  await page.locator('[data-check-type]').selectOption('http');
  await page.locator('[data-check-url]').fill('https://user:secret@example.invalid/');
  await page.locator('#submit-device').click();
  await expect(page.locator('#device-check-alert')).toBeVisible();
  await expect(page.locator('#device-check-alert')).toContainText('without credentials');
  expect((await (await request.get('/api/config')).json()).devices).toHaveLength(0);
  await page.locator('[data-check-url]').fill('https://example.invalid/health');
  await page.locator('[data-check-text]').fill('<img src=x onerror="window.httpInjected=true">');
  await page.locator('#submit-device').click();
  await expect(page.locator('#device-form-modal')).toBeHidden();
  await expect(page.locator('[data-config-facility-toggle]').first()).toBeVisible();
  await expandConfig(page);
  await page.locator('[data-edit-device]').click();
  await expect(page.locator('[data-check-text]')).toHaveValue('<img src=x onerror="window.httpInjected=true">');
  expect(await page.evaluate(() => window.httpInjected)).toBeUndefined();
});
