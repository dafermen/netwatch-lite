const { test, expect } = require('./fixtures.cjs');

const desk = (name, facility = 'Factory') => ({ name, ip: '127.0.0.1', deviceType: 'workstation',
  facility, category: 'Workstations', checks: [{ type: 'ping' }] });

test('Configuration keeps editing disabled until the initial profile and inventory loads complete', async ({ page, request }) => {
  await request.post('/api/config', { data: { devices: [] } });
  let release;
  const delayed = new Promise(resolve => { release = resolve; });
  await page.route('**/api/regions', async route => { await delayed; await route.continue(); });
  await page.goto('/config');
  await expect(page.locator('#add-device')).toBeDisabled();
  release();
  await expect(page.locator('#add-device')).toBeEnabled();
  await page.locator('#add-device').click();
  await page.locator('#device-name').fill('Draft survives loading');
  await page.locator('#device-monitoring-preset').selectOption('web');
  await expect(page.locator('#device-form-modal')).toBeVisible();
  await expect(page.locator('#device-name')).toHaveValue('Draft survives loading');
});

test('Search rerenders keep Normal and Bulk actions blocked until inventory loading settles', async ({ page, request }) => {
  await request.post('/api/config', { data: { devices: [desk('Loading desk')] } });
  const gates = [];
  const gate = () => {
    let enter, release;
    const entered = new Promise(resolve => { enter = resolve; });
    const wait = new Promise(resolve => { release = resolve; });
    const value = { enter, release, entered, wait }; gates.push(value); return value;
  };
  await page.route('**/api/monitor/inventory', async route => {
    const pending = gates.shift();
    if (pending) { pending.enter(); await pending.wait; }
    await route.continue();
  });
  const initial = gate();
  try {
    await page.goto('/config');
    await initial.entered;
    await page.locator('#config-device-search').fill('Loading desk');
    const edit = page.locator('[data-edit-device="0"]');
    await expect(edit).toBeVisible();
    for (const action of ['edit', 'copy', 'delete']) await expect(page.locator(`[data-${action}-device="0"]`)).toBeDisabled();
    await edit.dispatchEvent('click');
    await expect(page.locator('#device-form-modal')).toBeHidden();
  } finally { initial.release(); }
  await expect(page.locator('#add-device')).toBeEnabled();
  await page.locator('[data-edit-device="0"]').click();
  await page.locator('#device-name').fill('Draft after loading');
  await expect(page.locator('#device-form-modal')).toBeVisible();
  await page.locator('#device-form-modal .btn-close').click();
  await page.locator('#config-bulk-view').click();
  const reload = gate();
  try {
    await page.locator('#reload-config').click();
    await reload.entered;
    await page.locator('#config-device-search').fill('Loading');
    await expect(page.locator('[data-bulk-field="name"]')).toBeDisabled();
    await expect(page.locator('[data-bulk-advanced="0"]')).toBeDisabled();
    await page.locator('[data-bulk-advanced="0"]').dispatchEvent('click');
    await expect(page.locator('#device-form-modal')).toBeHidden();
  } finally { reload.release(); }
  await expect(page.locator('[data-bulk-field="name"]')).toBeEnabled();
  expect((await (await request.get('/api/config')).json()).devices[0].name).toBe('Loading desk');
  expect((await (await request.get('/api/history')).json()).runs).toHaveLength(0);
});

test('Configuration search reveals matching parents, preserves actions and resets collapse state', async ({ page, request }) => {
  await request.post('/api/config', { data: { devices: [desk('Desk one'), desk('Desk two', 'Office')] } });
  await page.goto('/config');
  await expect(page.locator('[data-edit-device="0"]')).toBeHidden();
  await page.locator('#config-device-search').fill('Desk one');
  await expect(page.locator('[data-edit-device="0"]')).toBeVisible();
  await expect(page.locator('[data-config-facility-toggle]')).toHaveAttribute('aria-expanded', 'true');
  await expect(page.locator('[data-config-category-toggle]')).toHaveAttribute('aria-expanded', 'true');
  await page.locator('[data-config-category-toggle]').click();
  await expect(page.locator('[data-edit-device="0"]')).toBeHidden();
  await page.locator('[data-config-category-toggle]').click();
  await page.locator('[data-edit-device="0"]').click();
  await expect(page.locator('#device-name')).toHaveValue('Desk one');
  await page.locator('#device-form-modal .btn-close').click();
  await page.locator('#config-device-search').fill('no such workstation');
  await expect(page.locator('#config-devices-body')).toContainText('No devices match');
  await page.locator('#config-device-search').fill('');
  await expect(page.locator('[data-config-facility-toggle]').first()).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('[data-edit-device="0"]')).toBeHidden();
  expect((await (await request.get('/api/history')).json()).runs).toHaveLength(0);
});

test('Bulk search temporarily reveals collapsed facilities and restores the previous state', async ({ page, request }) => {
  await request.post('/api/config', { data: { devices: [desk('Bulk desk')] } });
  await page.goto('/config');
  await page.locator('#config-bulk-view').click();
  const toggle = page.locator('[data-bulk-facility-toggle]');
  if (await toggle.getAttribute('aria-expanded') === 'true') await toggle.click();
  await page.locator('#config-device-search').fill('Bulk desk');
  await expect(page.locator('[data-bulk-index="0"]')).toBeVisible();
  await toggle.click();
  await expect(page.locator('[data-bulk-index="0"]')).toBeHidden();
  await page.locator('#config-device-search').fill('');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
});

test('Web preset creates HTTP only, adapts fields and preserves identity and shortcuts on edit', async ({ page, request }, testInfo) => {
  await request.post('/api/config', { data: { devices: [] } });
  await page.goto('/config');
  await page.locator('#add-device').click();
  await page.locator('#device-monitoring-preset').selectOption('web');
  await page.locator('#device-name').fill('Web application');
  await expect(page.locator('#device-network-fields')).toBeHidden();
  await expect(page.locator('#device-hostname-fields')).toBeHidden();
  await expect(page.locator('#device-ping-fields')).toBeHidden();
  await expect(page.locator('#workstation-peripherals')).toBeHidden();
  await expect(page.getByText('URL to monitor', { exact: true })).toBeVisible();
  await page.locator('[data-check-url]').fill('https://example.invalid/health');
  await page.locator('#device-website-url').fill('https://example.invalid/');
  await expect(page.locator('#device-command')).toBeHidden();
  await expect(page.locator('#device-location')).toBeHidden();
  await page.locator('#device-notes').fill('Synthetic inventory');
  await page.locator('[data-check-url]').scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath('dynamic-web-form.png') });
  expect(await page.locator('#device-form-modal .modal-body').evaluate(element => element.scrollWidth <= element.clientWidth)).toBeTruthy();
  await page.locator('#submit-device').click();
  await expect(page.locator('#device-form-modal')).toBeHidden();
  const before = (await (await request.get('/api/config')).json()).devices[0];
  expect(before.ip).toBe('example.invalid');
  expect(before.checks).toHaveLength(1);
  expect(before.checks[0].type).toBe('http');
  await page.locator('#config-device-search').fill('Web application');
  await page.locator('[data-edit-device="0"]').click();
  await expect(page.locator('#device-monitoring-preset-wrap')).toBeHidden();
  await page.locator('#device-type').selectOption('server');
  await expect(page.locator('#device-network-fields')).toBeHidden();
  await page.locator('#submit-device').click();
  await expect(page.locator('#device-form-modal')).toBeHidden();
  const after = (await (await request.get('/api/config')).json()).devices[0];
  for (const key of ['ip', 'checks', 'websiteUrl', 'command', 'location', 'notes']) expect(after[key]).toEqual(before[key]);
});

test('Changing a configured check requires confirmation and cancellation preserves its draft', async ({ page, request }) => {
  await request.post('/api/config', { data: { devices: [] } });
  await page.goto('/config');
  await page.locator('#add-device').click();
  await page.locator('#device-monitoring-preset').selectOption('web');
  await page.locator('[data-check-url]').fill('https://example.invalid/health');
  await page.locator('[data-check-text]').fill('READY');
  page.once('dialog', dialog => dialog.dismiss());
  await page.locator('[data-check-type]').selectOption('tcp');
  await expect(page.locator('[data-check-type]')).toHaveValue('http');
  await expect(page.locator('[data-check-url]')).toHaveValue('https://example.invalid/health');
  await expect(page.locator('[data-check-text]')).toHaveValue('READY');
  page.once('dialog', dialog => dialog.accept());
  await page.locator('[data-check-type]').selectOption('tcp');
  await expect(page.locator('#device-network-fields')).toBeVisible();
  await expect(page.locator('#device-ping-fields')).toBeHidden();
  await page.locator('#device-name').fill('Network device');
  await page.locator('#device-address').fill('https://example.invalid');
  await page.locator('[data-check-port]').fill('443');
  await page.locator('#submit-device').click();
  await expect(page.locator('#device-check-alert')).toContainText('not a website URL');
  expect((await (await request.get('/api/config')).json()).devices).toHaveLength(0);
});

test('A failed create keeps its draft and retry saves exactly one device', async ({ page, request }) => {
  await request.post('/api/config', { data: { devices: [] } });
  await page.goto('/config');
  await page.locator('#add-device').click();
  await page.locator('#device-name').fill('Retry desk');
  await page.locator('#device-address').fill('127.0.0.1');
  await page.route('**/api/config', route => route.request().method() === 'POST'
    ? route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"Synthetic save failure"}' })
    : route.continue());
  await page.locator('#submit-device').click();
  await expect(page.locator('#device-check-alert')).toContainText('Synthetic save failure');
  await expect(page.locator('#device-name')).toHaveValue('Retry desk');
  expect((await (await request.get('/api/config')).json()).devices).toHaveLength(0);
  await page.unroute('**/api/config');
  await page.locator('#submit-device').click();
  await expect(page.locator('#device-form-modal')).toBeHidden();
  const saved = (await (await request.get('/api/config')).json()).devices;
  expect(saved).toHaveLength(1);
  expect(saved[0].name).toBe('Retry desk');
});

test('A switched server profile rejects the old draft and explicit reload targets the new profile', async ({ page, request }) => {
  await request.post('/api/config', { data: { devices: [] } });
  await page.goto('/config');
  await page.locator('#add-device').click();
  await page.locator('#device-name').fill('Old group draft');
  await page.locator('#device-address').fill('127.0.0.1');
  expect((await request.post('/api/regions', { data: { name: 'Another group', copyFromActive: false } })).ok()).toBeTruthy();
  expect((await request.post('/api/config', { data: { devices: [desk('Other group desk')] } })).ok()).toBeTruthy();
  const before = await (await request.get('/api/config/export')).json();
  await page.locator('#submit-device').click();
  await expect(page.locator('#device-check-alert')).toContainText('support group changed');
  await expect(page.locator('#device-name')).toHaveValue('Old group draft');
  expect(await (await request.get('/api/config/export')).json()).toEqual(before);
  await page.locator('#reset-device-form').click();
  await expect(page.locator('#device-form-modal')).toBeHidden();
  await page.locator('#reload-config').click();
  await expect(page.locator('#config-alert')).toContainText('Reloaded');
  await page.locator('#add-device').click();
  await page.locator('#device-name').fill('New group desk');
  await page.locator('#device-address').fill('127.0.0.1');
  await page.locator('#submit-device').click();
  await expect(page.locator('#device-form-modal')).toBeHidden();
  expect((await (await request.get('/api/config')).json()).devices.map(item => item.name)).toEqual(['Other group desk', 'New group desk']);
});
