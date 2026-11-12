const { test, expect } = require('./fixtures.cjs');
const fs = require('node:fs/promises');
test.use({ locale: 'es-ES' });

test.beforeEach(async ({ request }) => {
  const config = await (await request.get('/api/config')).json();
  config.settings = { intervalSeconds: 60, timeoutMs: 100, retryCount: 0, retryDelayMs: 0, maxParallelChecks: 2 };
  config.devices = [{ name: 'Run', deviceType: 'other', facility: 'Server', category: 'Website',
    ip: '127.0.0.1', checks: [{ type: 'http', url: 'http://127.0.0.1:1/health', timeoutMs: 100 }] },
  { name: 'Server', deviceType: 'workstation', ip: '127.0.0.1', facility: 'Server', category: 'Office', checks: [{ type: 'ping' }] }];
  expect((await request.post('/api/config', { data: config })).ok()).toBeTruthy();
});

test('English is the default regardless of browser locale and language switching preserves stored inventory', async ({ page, request }) => {
  const before = await (await request.get('/api/config')).json();
  await page.goto('/config');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('#add-device')).toContainText('Add device or website');
  await expect(page.locator('#add-device')).toBeEnabled();
  await page.locator('#app-language').selectOption('es');
  await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  await expect(page.locator('#add-device')).toContainText('Agregar dispositivo o sitio web');
  await page.locator('#config-device-search').fill('Run');
  await expect(page.locator('.config-device-row')).toHaveCount(1);
  await expect(page.locator('.config-device-row')).toContainText('Run');
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  expect(await (await request.get('/api/config')).json()).toEqual(before);
  expect((await (await request.get('/api/history')).json()).runs).toHaveLength(0);
  await page.goto('/config?lang=es');
  await expect(page.locator('#add-device')).toBeEnabled();
  await page.locator('#app-language').selectOption('en');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
});

test('Localized HTML preserves table slots, boolean attributes and operator text without translating or injecting it', async ({ page }) => {
  await page.goto('/?lang=es');
  const result = await page.evaluate(() => {
    const I = NetWatchI18n;
    const value = 'Server __nw_i18n_value_4__ <img src=x onerror=alert(1)>';
    const encoded = value.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
    const row = I.html`<tr data-test="row"><td>${encoded}</td><td>Run</td></tr>`;
    const fragment = I.html`<table><tbody>${row}</tbody></table><select>${I.html`<option value="a" ${'selected'}>Not recorded</option>`}</select><pre>${'RAW original'}</pre><code>${'reference-123'}</code><textarea>${encoded}</textarea>`;
    const host = document.createElement('div'); host.innerHTML = fragment;
    return { rows: host.querySelectorAll('tbody tr').length, data: host.querySelector('td').textContent,
      label: host.querySelectorAll('td')[1].textContent, selected: host.querySelector('option').selected,
      option: host.querySelector('option').textContent, images: host.querySelectorAll('img').length,
      phrase: I.text('HTTP 302 - Redirect'), original: host.querySelector('pre').textContent, reference: host.querySelector('code').textContent,
      textarea: host.querySelector('textarea').value };
  });
  expect(result).toEqual({ rows: 1, data: 'Server __nw_i18n_value_4__ <img src=x onerror=alert(1)>', label: 'Ejecutar',
    selected: true, option: 'Sin registrar', images: 0, phrase: 'HTTP 302 - Redirección', original: 'RAW original', reference: 'reference-123',
    textarea: 'Server __nw_i18n_value_4__ <img src=x onerror=alert(1)>' });
});

test('Spanish covers static pages and dynamic catalogs, forms, results and history without changing operator names', async ({ page, request }, testInfo) => {
  const missing = new Set();
  for (const route of ['/config', '/regions', '/themes', '/device-types', '/peripherals', '/workstations', '/integrations', '/reports', '/diagnostics', '/manual', '/about', '/']) {
    await page.goto(`${route}?lang=es`);
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
    await expect(page.locator('#app-language')).toBeVisible();
    await expect.poll(() => page.evaluate(() => typeof configState !== 'undefined')).toBeTruthy();
    if (route === '/config') {
      await expect(page.locator('#add-device')).toBeEnabled();
      await page.locator('#config-device-search').fill('Run');
      await expect(page.locator('.config-device-row')).toHaveCount(1);
      await page.locator('[data-edit-device]').first().click();
      await expect(page.locator('#device-form-modal')).toBeVisible();
      await expect(page.locator('#device-form-title')).toContainText('Editar dispositivo o sitio web');
      await page.locator('#device-form-modal [data-bs-dismiss="modal"]').last().click();
    }
    if (route === '/') {
      await page.locator('#dashboard-device-type').selectOption('other');
      await page.locator('#run-group-check').click();
      await expect.poll(async () => (await (await request.get('/api/history')).json()).runs.length).toBe(1);
      await expect(page.locator('#last-run-receipt')).toContainText('elementos comprobados');
      await expect(page.locator('#execution-mode')).toContainText('Comprobación completa');
      await expect(page.locator('#results-body')).toContainText('Run');
      const runButton = page.locator('.category-run-button').first();
      expect(await runButton.evaluate(element => element.scrollWidth <= element.clientWidth)).toBeTruthy();
      await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
      await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
      await page.screenshot({ path: testInfo.outputPath('dashboard-es.png'), fullPage: true });
    }
    for (const key of await page.evaluate(() => NetWatchI18n.missing())) missing.add(key);
    const overflow = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth,
      elements: [...document.querySelectorAll('body *')].filter(e => e.getBoundingClientRect().right > innerWidth + 1 && e.getBoundingClientRect().width > 0)
        .slice(0, 12).map(e => [e.tagName, e.id, e.className, e.getBoundingClientRect().right]) }));
    expect(overflow.scroll <= overflow.width, route + JSON.stringify(overflow)).toBeTruthy();
  }
  await testInfo.attach('missing-localization', { body: JSON.stringify([...missing].sort(), null, 2), contentType: 'application/json' });
  await fs.writeFile(testInfo.outputPath('missing-localization.json'), JSON.stringify([...missing].sort(), null, 2));
  const neutral = value => /^(https?:|github\.com\/|config\.json$|SQLite|JSON$|USB$|TCP$|HTTP$|IP$|A-Z$|Z-A$)/.test(value);
  expect([...missing].filter(value => !neutral(value))).toEqual([]);
});

test('Language changes do not discard bulk or settings drafts without confirmation', async ({ page }) => {
  await page.goto('/config');
  await expect(page.locator('#add-device')).toBeEnabled();
  await page.locator('#config-bulk-view').click();
  await page.locator('[data-bulk-field="name"]').first().fill('Unsaved name');
  await page.locator('#app-language').selectOption('es');
  await expect(page.locator('#management-confirm-modal')).toBeVisible();
  await page.locator('#management-confirm-modal [data-bs-dismiss="modal"]').last().click();
  await expect(page.locator('[data-bulk-field="name"]').first()).toHaveValue('Unsaved name');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
});

test('Legacy report measurements stay neutral and localized without translating the device name', async ({ page }) => {
  await page.route('**/api/storage', route => route.fulfill({ contentType: 'application/json', body: '{"provider":"json"}' }));
  await page.route('**/api/history', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ runs: [{
    runId: 'legacy-language', checkMode: null, scope: { region: 'North', supportGroup: 'Team A' },
    results: [{ name: 'Run', ip: '127.0.0.1', facility: 'Lab', category: 'Office', checks: [] }]
  }] }) }));
  await page.goto('/reports?lang=es');
  await page.locator('#reports-tab-devices').click();
  await expect(page.locator('#reports-table-body')).toContainText('Sin registrar');
  await expect(page.locator('#reports-table-body')).not.toContainText('Not recorded');
  await page.locator('#reports-table-body').getByRole('button', { name: 'Run', exact: true }).click();
  await expect(page.locator('#reports-detail-body')).not.toContainText('Not recorded');
  await expect(page.locator('#reports-detail-body')).toContainText('Sin registrar');
  await expect(page.locator('#reports-detail-title')).toHaveText('Run');
});
