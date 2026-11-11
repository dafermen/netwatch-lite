const { test, expect } = require('./fixtures.cjs');

const webDevice = () => ({
  name: 'Stored URL', ip: 'example.invalid', deviceType: 'other', facility: 'Web Lab',
  category: 'URLs', location: 'Existing office', command: 'echo synthetic', notes: 'Existing notes',
  checks: [{ type: 'http', url: 'https://example.invalid/health', timeoutMs: 10000, expectedStatusCode: 200 }]
});

test('Stored URL edits and copies persist after reload without changing the original', async ({ page, request }, testInfo) => {
  expect((await request.post('/api/config', { data: { devices: [webDevice()] } })).ok()).toBeTruthy();
  await page.goto('/config');
  await page.locator('#config-device-search').fill('Stored URL');
  await page.locator('[data-edit-device="0"]').click();
  await expect(page.locator('#device-location')).toBeHidden();
  await expect(page.locator('#device-command')).toBeHidden();
  await page.locator('[data-check-url]').fill('https://example.invalid/ready');
  await page.locator('[data-check-timeout]').fill('12000');
  await page.locator('[data-check-status]').fill('204');
  await page.locator('#device-notes').fill('Updated notes');
  const invalid = await page.locator('#device-form').evaluate(form => [...form.elements]
    .filter(input => input.willValidate && !input.validity.valid)
    .map(input => ({ id: input.id, name: input.getAttribute('aria-label'), message: input.validationMessage })));
  expect(invalid, 'No irrelevant or hidden field prevents a URL save').toEqual([]);
  await expect(page.locator('#device-form-modal')).toHaveCSS('opacity', '1');
  await expect(page.locator('#device-form-modal .modal-dialog')).toHaveCSS('transform', 'none');
  await page.screenshot({ path: testInfo.outputPath('url-edit.png') });
  await page.locator('#submit-device').click();
  await expect(page.locator('#device-form-modal')).toBeHidden();
  await page.reload();
  await page.locator('#config-device-search').fill('Stored URL');
  await page.locator('[data-copy-device="0"]').click();
  await page.locator('#device-name').fill('URL duplicate');
  await page.locator('[data-check-url]').fill('https://example.invalid/copied');
  await page.locator('#submit-device').click();
  await expect(page.locator('#device-form-modal')).toBeHidden();
  await page.reload();
  const devices = (await (await request.get('/api/config')).json()).devices;
  expect(devices).toHaveLength(2);
  expect(devices[0].checks[0]).toMatchObject({ url: 'https://example.invalid/ready', timeoutMs: 12000, expectedStatusCode: 204 });
  expect(devices[1]).toMatchObject({ name: 'URL duplicate', location: 'Existing office', command: 'echo synthetic', notes: 'Updated notes' });
  expect(devices[1].checks[0].url).toBe('https://example.invalid/copied');
});

test('A rejected URL copy keeps its draft and retries exactly once', async ({ page, request }) => {
  expect((await request.post('/api/config', { data: { devices: [webDevice()] } })).ok()).toBeTruthy();
  await page.goto('/config');
  await page.locator('#config-device-search').fill('Stored URL');
  await page.locator('[data-copy-device="0"]').click();
  await page.route('**/api/config', route => route.request().method() === 'POST'
    ? route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"Synthetic rejection"}' })
    : route.continue());
  await page.locator('#submit-device').click();
  await expect(page.locator('#device-check-alert')).toContainText('Synthetic rejection');
  await page.unroute('**/api/config');
  await page.locator('#submit-device').click();
  await expect(page.locator('#device-form-modal')).toBeHidden();
  expect((await (await request.get('/api/config')).json()).devices).toHaveLength(2);
});

test('Configuration searches the monitored URL, not only the network identity', async ({ page, request }) => {
  await request.post('/api/config', { data: { devices: [webDevice()] } });
  await page.goto('/config');
  await page.locator('#config-device-search').fill('https://example.invalid/health');
  await expect(page.locator('[data-edit-device="0"]')).toBeVisible();
  expect((await (await request.get('/api/config')).json()).devices).toHaveLength(1);
});

test('Saving a renamed URL reveals its row even when the old search no longer matches', async ({ page, request }) => {
  await request.post('/api/config', { data: { devices: [webDevice()] } });
  await page.goto('/config');
  await page.locator('#config-device-search').fill('Stored URL');
  await page.locator('[data-edit-device="0"]').click();
  await page.locator('#device-name').fill('Renamed application');
  await page.locator('#submit-device').click();
  await expect(page.locator('#config-alert')).toContainText('saved');
  expect((await (await request.get('/api/config')).json()).devices[0].name).toBe('Renamed application');
  await expect(page.locator('[data-edit-device="0"]')).toBeVisible();
  await expect(page.locator('#config-devices-body')).toContainText('Renamed application');
});

test('A saved URL copy is visible without expanding groups or clearing old dashboard filters', async ({ page, request, isMobile }) => {
  await request.post('/api/config', { data: { devices: [webDevice()] } });
  await page.goto('/');
  await page.locator('#device-search').fill('unrelated previous search');
  await page.locator('label[for="filter-online"]').click();
  if (isMobile) await page.locator('#sidebar-toggle').click();
  await page.locator('a[data-route="/config"]').first().click();
  await page.locator('[data-config-facility-toggle]').click();
  await page.locator('[data-config-category-toggle]').click();
  await page.locator('[data-copy-device="0"]').click();
  await page.locator('#device-name').fill('Visible copy');
  await page.locator('#submit-device').click();
  await expect(page.locator('#device-form-modal')).toBeHidden();
  expect((await (await request.get('/api/config')).json()).devices).toHaveLength(2);
  await expect(page.locator('[data-edit-device="1"]')).toBeVisible();
  if (isMobile) await page.locator('#sidebar-toggle').click();
  await page.locator('a[data-route="/"]').first().click();
  await expect(page.locator('#results-body')).toContainText('Visible copy');
  await expect(page.locator('#results-body tr').filter({ hasText: 'Visible copy' })).toBeVisible();
  expect((await (await request.get('/api/history')).json()).runs).toHaveLength(0);
});

test('HTTP-only fields stay compact and mixed checks restore hidden draft values', async ({ page, request }, testInfo) => {
  await request.post('/api/config', { data: { devices: [webDevice()] } });
  await page.goto('/config');
  await page.locator('#config-device-search').fill('Stored URL');
  await page.locator('[data-edit-device="0"]').click();
  await expect(page.locator('#device-location-fields')).toBeHidden();
  await expect(page.locator('#device-command-fields')).toBeHidden();
  await expect(page.locator('#device-location')).toHaveValue('Existing office');
  await expect(page.locator('#device-command')).toHaveValue('echo synthetic');
  await expect(page.locator('#device-form-modal')).toHaveCSS('opacity', '1');
  await expect(page.locator('#device-form-modal .modal-dialog')).toHaveCSS('transform', 'none');
  expect(await page.locator('#device-form-modal .modal-body').evaluate(element => element.scrollWidth <= element.clientWidth)).toBeTruthy();
  await page.screenshot({ path: testInfo.outputPath('compact-url-form.png') });
  await page.locator('#add-check').click();
  await expect(page.locator('#device-location-fields')).toBeVisible();
  await expect(page.locator('#device-command-fields')).toBeVisible();
  await expect(page.locator('#device-location')).toHaveValue('Existing office');
  await page.locator('[data-remove-check]').last().click();
  await expect(page.locator('#device-command-fields')).toBeHidden();
  await page.locator('#submit-device').click();
  await expect(page.locator('#device-form-modal')).toBeHidden();
  const saved = (await (await request.get('/api/config')).json()).devices[0];
  expect(saved).toMatchObject({ location: 'Existing office', command: 'echo synthetic' });
  expect(saved.checks).toHaveLength(1);
});

test('Invalid HTTP fields and API problem details stay visible inside the editor', async ({ page, request }) => {
  await request.post('/api/config', { data: { devices: [webDevice()] } });
  await page.goto('/config');
  await page.locator('#config-device-search').fill('Stored URL');
  await page.locator('[data-copy-device="0"]').click();
  await page.locator('[data-check-url]').fill('');
  await page.locator('#submit-device').click();
  await expect(page.locator('#device-check-alert')).not.toBeEmpty();
  await page.locator('[data-check-url]').fill('https://example.invalid/valid');
  await page.route('**/api/config', route => route.request().method() === 'POST'
    ? route.fulfill({ status: 500, contentType: 'application/problem+json', body: '{"title":"Save rejected","detail":"Synthetic storage failure"}' })
    : route.continue());
  await page.locator('#submit-device').click();
  await expect(page.locator('#device-check-alert')).toContainText('Synthetic storage failure');
  await expect(page.locator('#device-name')).toHaveValue('Stored URL Copy');
  await expect(page.locator('[data-check-port]')).toBeDisabled();
  await page.unroute('**/api/config');
  await page.locator('#submit-device').click();
  await expect(page.locator('#device-form-modal')).toBeHidden();
  expect((await (await request.get('/api/config')).json()).devices).toHaveLength(2);
});

test('A disabled URL saves visibly in Configuration without being silently enabled', async ({ page, request }) => {
  await request.post('/api/config', { data: { devices: [webDevice()] } });
  await page.goto('/config');
  await page.locator('#config-device-search').fill('Stored URL');
  await page.locator('[data-edit-device="0"]').click();
  await page.locator('#device-enabled').uncheck();
  await page.locator('#submit-device').click();
  await expect(page.locator('#device-form-modal')).toBeHidden();
  await expect(page.locator('#config-alert')).toContainText('disabled');
  await expect(page.locator('[data-edit-device="0"]')).toBeVisible();
  expect((await (await request.get('/api/config')).json()).devices[0].enabled).toBe(false);
  await page.goto('/');
  await expect(page.locator('#results-body')).not.toContainText('Stored URL');
});
