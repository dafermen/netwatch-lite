const { test, expect } = require('./fixtures.cjs');
const fs = require('node:fs/promises');

const synthetic = name => ({ devices: [{ name, ip: '127.0.0.1', deviceType: 'other',
  checks: [{ type: 'http', url: 'http://127.0.0.1:1/health', timeoutMs: 100, followRedirects: true }] }] });
const upload = async (page, name = 'Replacement') => {
  const choosing = page.waitForEvent('filechooser');
  await page.locator('#import-config').click();
  await (await choosing).setFiles({ name: 'synthetic.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(synthetic(name))) });
};
const versions = async request => (await (await request.get('/api/config/versions')).json()).versions;
const confirm = async (page, title) => {
  await expect(page.locator('#management-confirm-modal')).toBeVisible();
  await expect(page.locator('#management-confirm-title')).toHaveText(title);
  await page.locator('#management-confirm').click();
};

for (const language of ['en', 'es']) {
  const es = language === 'es';
  test(`import cancellation, recovery and actual build (${language})`, async ({ page, request }, testInfo) => {
    await request.post('/api/config', { data: synthetic('Original') });
    await page.addInitScript(lang => localStorage.setItem('netwatch.language', lang), language);
    await page.goto('/config');
    await expect(page.locator('#import-config')).toBeEnabled();
    const build = await (await request.get('/api/build')).json();
    await expect(page.locator('#running-version')).toHaveText(`v${build.version}`);
    const before = await (await request.get('/api/config')).json();
    const beforeExport = await (await request.get('/api/config/export')).json();
    await page.locator('#timeout-ms').fill('987');
    await upload(page);
    await expect(page.locator('#management-confirm-title')).toHaveText(es ? '¿Importar configuración?' : 'Import configuration?');
    await expect(page.locator('#management-confirm-message')).toContainText(es ? 'Archivo: synthetic.json' : 'File: synthetic.json');
    await page.locator('#management-cancel').click();
    await expect(page.locator('#management-confirm-modal')).toBeHidden();
    expect(await versions(request)).toHaveLength(0);
    expect(await (await request.get('/api/config')).json()).toEqual(before);
    await expect(page.locator('#timeout-ms')).toHaveValue('987');
    await upload(page);
    await confirm(page, es ? '¿Importar configuración?' : 'Import configuration?');
    await expect(page.locator('#management-confirm-title')).toHaveText(es ? 'Confirmación final' : 'Final confirmation');
    await page.locator('#management-cancel').click();
    await expect(page.locator('#management-confirm-modal')).toBeHidden();
    expect(await versions(request)).toHaveLength(0);
    expect(await (await request.get('/api/config')).json()).toEqual(before);
    await upload(page);
    await confirm(page, es ? '¿Importar configuración?' : 'Import configuration?');
    await confirm(page, es ? 'Confirmación final' : 'Final confirmation');
    await expect(page.locator('#config-alert')).toContainText(es ? 'JSON importado' : 'Imported');
    expect(await versions(request)).toHaveLength(1);
    await page.locator('#configuration-versions').click();
    const body = page.locator('#configuration-versions-body');
    await expect(body.locator('tr')).toHaveCount(1);
    await body.locator('[data-version-action="preview"]').click();
    await expect(page.locator('#configuration-version-preview')).toContainText('SHA-256:');
    const downloading = page.waitForEvent('download');
    await body.locator('[data-version-action="download"]').click();
    const download = await downloading;
    expect(JSON.parse(await fs.readFile(await download.path(), 'utf8'))).toEqual(beforeExport);
    await body.locator('[data-version-action="restore"]').click();
    await expect(page.locator('#management-confirm-title')).toHaveText(es ? '¿Restaurar configuración?' : 'Restore configuration?');
    await page.locator('#management-cancel').click();
    await expect(page.locator('#configuration-versions-modal')).toBeVisible();
    expect(await versions(request)).toHaveLength(1);
    await body.locator('[data-version-action="restore"]').click();
    await confirm(page, es ? '¿Restaurar configuración?' : 'Restore configuration?');
    await confirm(page, es ? 'Confirmación final' : 'Final confirmation');
    await expect(body.locator('tr')).toHaveCount(2);
    await expect(body.locator('tr').first().locator('td').first()).toBeInViewport();
    expect(await page.locator('#configuration-versions-modal .table-responsive').evaluate(element => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
    expect(await (await request.get('/api/config')).json()).toEqual(before);
    expect((await (await request.get('/api/history')).json()).runs).toHaveLength(0);
    await page.screenshot({ path: testInfo.outputPath(`configuration-history-${language}.png`), fullPage: true });
    await page.locator('#configuration-versions-modal [data-bs-dismiss]').click();
    await page.goto('/about');
    await expect(page.locator('#build-details')).toContainText(build.version);
    await expect(page.locator('#build-details')).toContainText(build.runtime);
    await expect(page.locator('#build-details')).toContainText(build.provider);
    await page.screenshot({ path: testInfo.outputPath(`build-${language}.png`), fullPage: true });
  });

  test(`HTTP redirect option defaults off and survives edit/copy (${language})`, async ({ page, request }) => {
    const config = synthetic('Redirect portal'); delete config.devices[0].checks[0].followRedirects;
    await request.post('/api/config', { data: config });
    await page.addInitScript(lang => localStorage.setItem('netwatch.language', lang), language);
    await page.goto('/config');
    await expect(page.locator('#add-device')).toBeEnabled();
    await page.locator('#config-device-search').fill('Redirect portal');
    await page.locator('[data-edit-device]').click();
    const flag = page.locator('[data-check-redirects]');
    await expect(flag).not.toBeChecked(); await flag.check();
    await page.locator('#submit-device').click();
    await expect(page.locator('#device-form-modal')).toBeHidden();
    expect((await (await request.get('/api/config')).json()).devices[0].checks[0].followRedirects).toBe(true);
    await page.locator('[data-copy-device]').click();
    await expect(flag).toBeChecked();
    await page.locator('#device-name').fill('Copied redirect portal');
    await page.locator('#submit-device').click();
    await expect(page.locator('#device-form-modal')).toBeHidden();
    expect((await (await request.get('/api/config')).json()).devices.map(value => value.checks[0].followRedirects)).toEqual([true, true]);
    await page.locator('#add-device').click();
    await page.locator('[data-check-type]').selectOption('http');
    await expect(flag).not.toBeChecked();
    await page.locator('[data-check-type]').selectOption('browser');
    await expect(flag).toBeHidden();
  });
}

test('type/category option lists remain independent while matching and running stays AND', async ({ page, request }, testInfo) => {
  const config = await (await request.get('/api/config')).json();
  config.devices = [{ name: 'Desk', deviceType: 'workstation', ip: '127.0.0.1', category: 'Office', facility: 'Alpha', checks: [{ type: 'ping' }] },
    { ...synthetic('Portal').devices[0], facility: 'Alpha', category: 'Websites' }];
  await request.post('/api/config', { data: config });
  await page.goto('/');
  await page.locator('#dashboard-device-type').selectOption('workstation');
  await expect(page.locator('#group-check-select option')).toHaveText(['All categories', 'Office', 'Websites']);
  await page.locator('#group-check-select').selectOption('Websites');
  await expect(page.locator('[data-dashboard-device]')).toHaveCount(0);
  await expect(page.locator('#run-group-check')).toBeDisabled();
  expect((await (await request.get('/api/history')).json()).runs).toHaveLength(0);
  await page.locator('#clear-dashboard-filters').click();
  await expect(page.locator('#dashboard-device-type')).toHaveValue('');
  await expect(page.locator('#group-check-select')).toHaveValue('');
  await expect(page.locator('[data-dashboard-device]')).toHaveCount(2);
  await expect(page.locator('#dashboard-monitoring option')).toHaveText(['Enabled for checks', 'Checks paused', 'All items']);
  await page.screenshot({ path: testInfo.outputPath('dashboard-build-filters.png'), fullPage: true });
  await page.goto('/config');
  await page.locator('#config-device-type-filter').selectOption('workstation');
  await expect(page.locator('#config-category-filter option')).toHaveText(['All categories', 'Office', 'Websites']);
  await page.locator('#config-category-filter').selectOption('Websites');
  await expect(page.locator('[data-edit-device]')).toHaveCount(0);
  await expect(page.locator('#config-device-type-filter option[value="workstation"]')).toHaveCount(1);
});

test('recovery metadata is escaped, not executable markup', async ({ page, request }) => {
  await request.post('/api/config/import', { multipart: { configFile: { name: 'synthetic.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(synthetic('Metadata test'))) } } });
  const literal = '<img src=x onerror="window.unsafeRecoveryMarkup=true">';
  await page.route('**/api/config/versions', async route => {
    const response = await route.fetch();
    const payload = await response.json(); payload.versions[0].reason = literal;
    await route.fulfill({ response, json: payload });
  });
  await page.goto('/config');
  await page.locator('#configuration-versions').click();
  await expect(page.locator('#configuration-versions-body')).toContainText(literal);
  await expect(page.locator('#configuration-versions-body img')).toHaveCount(0);
  expect(await page.evaluate(() => window.unsafeRecoveryMarkup)).toBeUndefined();
});
