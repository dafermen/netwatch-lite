const { test, expect } = require('./fixtures.cjs');

test.setTimeout(45000);
test.beforeEach(async ({ request }) => {
  expect((await request.post('/api/config', { data: { devices: [] } })).ok()).toBeTruthy();
});

async function action(page, kind, id, key) {
  const row = page.locator(`[data-${kind}-row="${id}"]`);
  await row.locator('.management-menu-toggle').click();
  await row.locator(`[data-management-action="${key}"]`).click();
}

async function confirmation(page, accept = true) {
  await page.locator(accept ? '#management-confirm' : '#management-cancel').click();
  await expect(page.locator('#management-confirm-modal')).toBeHidden();
}

async function readyModal(page, id) {
  await expect(page.locator(`${id} .modal-dialog`)).toHaveCSS('transform', 'none');
}

async function richInventory(request) {
  const catalog = await (await request.get('/api/device-types')).json();
  const data = {
    settings: { intervalSeconds: 60, timeoutMs: 500, maxParallelChecks: 2, retryCount: 0, retryDelayMs: 0 },
    deviceTypes: [...catalog.deviceTypes, { id: 'web-app', name: 'Web application' }],
    peripheralCatalog: [{ id: 'laser-a', kind: 'printer', manufacturer: 'Example', model: 'Laser A' }],
    devices: [
      { name: 'Inventory workstation', ip: '127.0.0.1', deviceType: 'workstation', checks: [{ type: 'ping' }],
        workstationPeripherals: { printers: { status: 'assigned', items: [{ modelId: 'laser-a', connection: 'usb', identifier: 'Asset A', notes: 'Keep this assignment' }] }, scanners: { status: 'none', items: [] } } },
      { name: 'Inventory portal', ip: '127.0.0.1', deviceType: 'web-app', enabled: false,
        checks: [{ type: 'http', url: 'http://127.0.0.1:9/health', timeoutMs: 4500, expectedStatusCode: 200, expectedText: 'READY' }] }
    ]
  };
  expect((await request.post('/api/config', { data })).ok()).toBeTruthy();
  return (await request.get('/api/config/export')).json();
}

function sameInventory(actual, expected) {
  expect(actual.settings).toEqual(expected.settings);
  expect(actual.deviceTypes).toEqual(expected.deviceTypes);
  expect(actual.peripheralCatalog).toEqual(expected.peripheralCatalog);
  const records = config => config.devices.map(({ region, supportGroup, ...device }) => device);
  expect(records(actual)).toEqual(records(expected));
}

async function seedThemes(request, active = 'default') {
  const original = await (await request.get('/api/themes')).json();
  const colors = original.themes.find(theme => theme.id === 'default').colors;
  const data = { ...original, activeThemeId: active, themes: [...original.themes,
    { id: 'lab-green', name: 'Lab Green', builtIn: false, colors: { ...colors, primary: '#276749' } },
    { id: 'lab-rose', name: 'Lab Rose', builtIn: false, colors: { ...colors, primary: '#c2185b' } }
  ] };
  expect((await request.post('/api/themes', { data })).ok()).toBeTruthy();
  return (await request.get('/api/themes')).json();
}

async function primary(page) {
  return page.evaluate(() => document.documentElement.style.getPropertyValue('--nw-primary').trim());
}

async function spaLink(page, route) {
  const link = page.locator(`.sidebar a[data-route="${route}"]`);
  if (page.viewportSize().width < 992 && !await page.locator('#sidebar').evaluate(element => element.classList.contains('show'))) await page.locator('#sidebar-toggle').click();
  await link.click();
}

test('support groups filter and select without activating, preserve inventory and support keyboard menus', async ({ page, request }, testInfo) => {
  const before = await richInventory(request);
  const original = await (await request.get('/api/regions')).json();
  const active = original.profiles.find(profile => profile.id === original.activeProfileId);
  await request.post('/api/regions', { data: { name: 'East group <img src=x onerror="window.managerInjected=true">', region: 'East Region', copyFromActive: true } });
  const created = await (await request.get('/api/regions')).json();
  const id = created.activeProfileId;
  await request.post(`/api/regions/${original.activeProfileId}/activate`);
  await page.goto('/regions');
  await expect(page.locator('#active-region-summary')).toContainText(active.name);
  await page.locator(`[data-select-region="${id}"]`).click();
  await expect(page.locator(`[data-select-region="${id}"]`)).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#active-region-summary')).toContainText(active.name);
  expect((await (await request.get('/api/regions')).json()).activeProfileId).toBe(original.activeProfileId);
  expect(await (await request.get('/api/config/export')).json()).toEqual(before);
  expect(await page.evaluate(() => window.managerInjected)).toBeUndefined();
  await page.locator('#regions-search').fill('__no_match__');
  await expect(page.locator('#regions-body')).toContainText('No support groups match');
  await expect(page.locator('#active-region-summary')).toContainText(active.name);
  await page.locator('#regions-search').fill('');
  await page.locator('#regions-region-filter').selectOption('East Region');
  await expect(page.locator('[data-region-row]')).toHaveCount(1);
  await page.locator('#regions-status-filter').selectOption('active');
  await expect(page.locator('[data-region-row]')).toHaveCount(0);
  await page.locator('#regions-status-filter').selectOption('available');
  const toggle = page.locator(`[data-region-row="${id}"] .management-menu-toggle`);
  await toggle.focus();
  await page.keyboard.press('Enter');
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  const menu = await page.locator('.management-row-menu .dropdown-menu.show').boundingBox();
  expect(menu.x).toBeGreaterThanOrEqual(0);
  expect(menu.x + menu.width).toBeLessThanOrEqual(page.viewportSize().width);
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Escape');
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(toggle).toBeFocused();
  await page.locator('#regions-region-filter').selectOption('');
  await page.locator('#regions-status-filter').selectOption('');
  await request.post(`/api/regions/${id}`, { data: { name: 'East Team', region: 'East Region' } });
  await page.locator('#reload-regions').click();
  await expect(page.locator(`[data-select-region="${id}"]`)).toHaveText('East Team');
  await page.screenshot({ path: testInfo.outputPath('support-groups.png') });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBeTruthy();
});

test('support group create, copy, rename, open configuration and targeted delete preserve all inventory fields', async ({ page, request }) => {
  const source = await richInventory(request);
  const initial = await (await request.get('/api/regions')).json();
  await page.goto('/regions');
  await page.locator('#new-region').click();
  await readyModal(page, '#region-form-modal');
  await expect(page.locator('#region-copy-active')).toBeChecked();
  await page.locator('#region-name').fill('West Team');
  await page.locator('#region-value').fill('West Region');
  await page.locator('#submit-region').click();
  await expect(page.locator('#region-form-modal')).toBeHidden();
  await expect(page.locator('#region-alert')).toContainText('created and activated');
  const west = (await (await request.get('/api/regions')).json()).activeProfileId;
  sameInventory(await (await request.get('/api/config/export')).json(), source);
  await action(page, 'region', west, 'copy');
  await expect(page.locator('#region-alert')).toContainText('copied and activated');
  const copied = (await (await request.get('/api/regions')).json()).activeProfileId;
  expect(copied).not.toBe(west);
  sameInventory(await (await request.get('/api/config/export')).json(), source);
  await action(page, 'region', copied, 'rename');
  await readyModal(page, '#region-form-modal');
  await page.locator('#region-name').fill('Renamed copy');
  await page.locator('#region-value').fill('South Region');
  await page.locator('#submit-region').click();
  await expect(page.locator('#region-form-modal')).toBeHidden();
  await expect(page.locator('#active-region-summary')).toContainText('Renamed copy');
  sameInventory(await (await request.get('/api/config/export')).json(), source);
  await action(page, 'region', initial.activeProfileId, 'activate');
  await expect(page.locator('#region-alert')).toContainText('Active support group changed');
  await action(page, 'region', copied, 'open');
  await expect(page.locator('#management-confirm-message')).toContainText('Renamed copy');
  await confirmation(page);
  await expect(page).toHaveURL(/\/config$/);
  expect((await (await request.get('/api/regions')).json()).activeProfileId).toBe(copied);
  await page.goto('/regions');
  const beforeDelete = await (await request.get('/api/regions')).json();
  const next = beforeDelete.profiles.filter(profile => profile.id !== copied)[0];
  await action(page, 'region', copied, 'delete');
  await expect(page.locator('#management-confirm-message')).toContainText(`Active support group afterward: ${next.name}`);
  await confirmation(page, false);
  await expect(page.locator(`[data-region-row="${copied}"]`)).toBeVisible();
  await action(page, 'region', copied, 'delete');
  await confirmation(page);
  await expect(page.locator(`[data-region-row="${copied}"]`)).toHaveCount(0);
  const afterDelete = await (await request.get('/api/regions')).json();
  expect(afterDelete.profiles.map(profile => profile.id)).toEqual(beforeDelete.profiles.filter(profile => profile.id !== copied).map(profile => profile.id));
  expect(afterDelete.activeProfileId).toBe(next.id);
  const protectedProfile = afterDelete.profiles.find(profile => profile.builtIn);
  await page.locator(`[data-region-row="${protectedProfile.id}"] .management-menu-toggle`).click();
  await expect(page.locator(`[data-region-row="${protectedProfile.id}"] [data-management-action="delete"]`)).toBeDisabled();
  await page.keyboard.press('Escape');
  await request.post(`/api/regions/${initial.activeProfileId}/activate`);
  expect(await (await request.get('/api/config/export')).json()).toEqual(source);
});

test('support group failures retain the real active profile and drafts; failed loads clear rows and retry', async ({ page, request }) => {
  const initial = await (await request.get('/api/regions')).json();
  const target = initial.profiles.find(profile => profile.id !== initial.activeProfileId);
  await page.goto('/regions');
  await expect(page.locator(`[data-region-row="${target.id}"]`)).toBeVisible();
  const before = await page.locator('#active-region-summary').textContent();
  await page.route('**/api/regions/*/activate', route => route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"Simulated activation failure"}' }));
  await action(page, 'region', target.id, 'activate');
  await expect(page.locator('#region-alert')).toContainText('Simulated activation');
  await expect(page.locator('#active-region-summary')).toHaveText(before);
  await page.unroute('**/api/regions/*/activate');
  await page.route('**/api/regions', route => route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"Simulated registry failure"}' }));
  await page.locator('#reload-regions').click();
  await expect(page.locator('#region-alert')).toContainText('Simulated registry');
  await expect(page.locator('[data-region-row]')).toHaveCount(0);
  await expect(page.locator('#new-region')).toBeDisabled();
  await page.unroute('**/api/regions');
  await page.locator('#reload-regions').click();
  await expect(page.locator('#new-region')).toBeEnabled();
  await page.route('**/api/regions', route => route.request().method() === 'POST'
    ? route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"Simulated create failure"}' }) : route.continue());
  await page.locator('#new-region').click();
  await readyModal(page, '#region-form-modal');
  await page.locator('#region-name').fill('Keep this draft');
  await page.locator('#submit-region').click();
  await expect(page.locator('#region-form-alert')).toContainText('Simulated create');
  await expect(page.locator('#region-name')).toHaveValue('Keep this draft');
  expect((await (await request.get('/api/regions')).json()).activeProfileId).toBe(initial.activeProfileId);
});

test('theme selection and preview do not activate or save; saving colors preserves other themes', async ({ page, request }, testInfo) => {
  const original = await seedThemes(request);
  const config = await (await request.get('/api/config/export')).json();
  await page.goto('/themes');
  await expect(page.locator('#themes-count')).toHaveText('4 of 4 themes');
  const applied = await primary(page);
  await page.locator('[data-select-theme="lab-green"]').click();
  await expect(page.locator('#theme-editor-name')).toHaveText('Lab Green');
  expect(await primary(page)).toBe(applied);
  expect(await (await request.get('/api/themes')).json()).toEqual(original);
  await page.locator('[data-theme-color="primary"]').fill('#00695c');
  await expect(page.locator('#theme-dirty-label')).toBeVisible();
  expect(await primary(page)).toBe(applied);
  expect(await page.locator('#theme-preview').evaluate(element => element.style.getPropertyValue('--nw-primary'))).toBe('#00695c');
  await page.screenshot({ path: testInfo.outputPath('theme-editor.png') });
  await page.locator('#theme-preview').screenshot({ path: testInfo.outputPath('theme-preview.png') });
  await page.locator('#save-themes').click();
  await expect(page.locator('#theme-alert')).toContainText('Colors for');
  await expect(page.locator('#theme-dirty-label')).toBeHidden();
  const saved = await (await request.get('/api/themes')).json();
  expect(saved.activeThemeId).toBe('default');
  expect(saved.themes.find(theme => theme.id === 'lab-green').colors.primary).toBe('#00695c');
  expect(saved.themes.filter(theme => theme.id !== 'lab-green')).toEqual(original.themes.filter(theme => theme.id !== 'lab-green'));
  await page.locator('#close-theme-editor').click();
  await action(page, 'theme', 'lab-green', 'activate');
  await expect(page.locator('#active-theme-summary')).toHaveText('Lab Green');
  expect(await primary(page)).toBe('#00695c');
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: testInfo.outputPath('themes-library.png') });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBeTruthy();
  expect(await (await request.get('/api/config/export')).json()).toEqual(config);
});

test('themes create, copy and rename save immediately with protected originals and unchanged IDs', async ({ page, request }) => {
  const original = await (await request.get('/api/themes')).json();
  await page.goto('/themes');
  await expect(page.locator('#themes-count')).toHaveText('2 of 2 themes');
  await page.locator('[data-theme-row="default"] .management-menu-toggle').click();
  await expect(page.locator('[data-theme-row="default"] [data-management-action="delete"]')).toBeDisabled();
  await expect(page.locator('[data-theme-row="default"] [data-management-action="rename"]')).toBeDisabled();
  await page.keyboard.press('Escape');
  await page.locator('[data-select-theme="default"]').click();
  await expect(page.locator('[data-theme-color="primary"]')).toBeDisabled();
  await page.locator('#close-theme-editor').click();
  await page.locator('#new-theme').click();
  await readyModal(page, '#theme-form-modal');
  await page.locator('#theme-name').fill('Team theme');
  await page.locator('#submit-theme').click();
  await expect(page.locator('#theme-form-modal')).toBeHidden();
  await page.reload();
  await expect(page.locator('[data-theme-row="team-theme"]')).toContainText('Team theme');
  await action(page, 'theme', 'team-theme', 'rename');
  await readyModal(page, '#theme-form-modal');
  await page.locator('#theme-name').fill('Ops <img src=x onerror="window.themeInjected=true">');
  await page.locator('#submit-theme').click();
  await expect(page.locator('#theme-form-modal')).toBeHidden();
  await expect(page.locator('[data-theme-row="team-theme"]')).toContainText('Ops <img');
  expect(await page.evaluate(() => window.themeInjected)).toBeUndefined();
  await action(page, 'theme', 'corporate-logistics', 'copy');
  await readyModal(page, '#theme-form-modal');
  await page.locator('#theme-name').fill('Corporate safe copy');
  await page.locator('#submit-theme').click();
  await expect(page.locator('#theme-form-modal')).toBeHidden();
  const saved = await (await request.get('/api/themes')).json();
  expect(saved.activeThemeId).toBe('default');
  expect(saved.themes.find(theme => theme.id === 'corporate-safe-copy').colors).toEqual(original.themes.find(theme => theme.id === 'corporate-logistics').colors);
  expect(saved.themes.filter(theme => theme.builtIn)).toEqual(original.themes);
  await page.locator('#themes-search').fill('corporate safe');
  await expect(page.locator('#themes-count')).toHaveText('1 of 4 themes');
  await page.locator('#themes-status-filter').selectOption('protected');
  await expect(page.locator('#themes-body')).toContainText('No themes match');
});

test('unsaved theme colors survive failed saves, cancelled selection, reload and navigation', async ({ page, request }) => {
  const original = await seedThemes(request);
  await page.goto('/themes');
  await page.locator('[data-select-theme="lab-green"]').click();
  const applied = await primary(page);
  await page.route('**/api/themes', route => route.request().method() === 'POST'
    ? route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"Simulated theme save failure"}' }) : route.continue());
  await action(page, 'theme', 'lab-rose', 'activate');
  await expect(page.locator('#theme-alert')).toContainText('Simulated theme save');
  await expect(page.locator('#active-theme-summary')).toHaveText('NetWatch Default');
  expect(await primary(page)).toBe(applied);
  await page.locator('[data-theme-color="primary"]').fill('#00796b');
  await page.locator('#save-themes').click();
  await expect(page.locator('#theme-alert')).toContainText('Simulated theme save');
  await expect(page.locator('[data-theme-color="primary"]')).toHaveValue('#00796b');
  await expect(page.locator('#theme-dirty-label')).toBeVisible();
  expect(await primary(page)).toBe(applied);
  expect(await (await request.get('/api/themes')).json()).toEqual(original);
  await page.locator('[data-select-theme="lab-rose"]').click();
  await confirmation(page, false);
  await expect(page.locator('#theme-editor-name')).toHaveText('Lab Green');
  await page.locator('#reload-themes').click();
  await confirmation(page, false);
  await expect(page.locator('[data-theme-color="primary"]')).toHaveValue('#00796b');
  await spaLink(page, '/themes');
  await confirmation(page, false);
  await expect(page.locator('[data-theme-color="primary"]')).toHaveValue('#00796b');
  await spaLink(page, '/regions');
  await confirmation(page, false);
  await expect(page).toHaveURL(/\/themes$/);
  await spaLink(page, '/regions');
  await confirmation(page);
  await expect(page).toHaveURL(/\/regions$/);
  expect(await (await request.get('/api/themes')).json()).toEqual(original);
});

test('theme delete and restore defaults confirm scope and keep saved state on failure or cancel', async ({ page, request }) => {
  const original = await seedThemes(request, 'lab-green');
  await page.goto('/themes');
  await expect(page.locator('#active-theme-summary')).toHaveText('Lab Green');
  await action(page, 'theme', 'lab-green', 'delete');
  await expect(page.locator('#management-confirm-message')).toContainText('NetWatch Default');
  await confirmation(page, false);
  expect(await (await request.get('/api/themes')).json()).toEqual(original);
  await page.route('**/api/themes', route => route.request().method() === 'POST'
    ? route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"Simulated delete failure"}' }) : route.continue());
  await action(page, 'theme', 'lab-green', 'delete');
  await confirmation(page);
  await expect(page.locator('#theme-alert')).toContainText('Simulated delete');
  await expect(page.locator('#active-theme-summary')).toHaveText('Lab Green');
  await expect(page.locator('[data-theme-row="lab-green"]')).toBeVisible();
  await page.unroute('**/api/themes');
  await action(page, 'theme', 'lab-green', 'delete');
  await confirmation(page);
  await expect(page.locator('[data-theme-row="lab-green"]')).toHaveCount(0);
  await expect(page.locator('#active-theme-summary')).toHaveText('NetWatch Default');
  await page.getByRole('button', { name: 'Theme library actions', exact: true }).click();
  await page.locator('#reset-themes').click();
  await confirmation(page, false);
  await expect(page.locator('[data-theme-row="lab-rose"]')).toBeVisible();
  await page.route('**/api/themes/reset', route => route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"Simulated reset failure"}' }));
  await page.getByRole('button', { name: 'Theme library actions', exact: true }).click();
  await page.locator('#reset-themes').click();
  await confirmation(page);
  await expect(page.locator('#theme-alert')).toContainText('Simulated reset');
  await expect(page.locator('[data-theme-row="lab-rose"]')).toBeVisible();
  await page.unroute('**/api/themes/reset');
  await page.getByRole('button', { name: 'Theme library actions', exact: true }).click();
  await page.locator('#reset-themes').click();
  await confirmation(page);
  await expect(page.locator('#themes-count')).toHaveText('2 of 2 themes');
  expect((await (await request.get('/api/themes')).json()).themes.every(theme => theme.builtIn)).toBeTruthy();
});

test('failed theme load never invents an editable library and a failed create retains its form', async ({ page, request }) => {
  const original = await seedThemes(request);
  await page.goto('/themes');
  await expect(page.locator('#themes-count')).toHaveText('4 of 4 themes');
  await page.route('**/api/themes', route => route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"Simulated theme load failure"}' }));
  await page.locator('#reload-themes').click();
  await expect(page.locator('#theme-alert')).toContainText('Simulated theme load');
  await expect(page.locator('[data-theme-row]')).toHaveCount(0);
  await expect(page.locator('#new-theme')).toBeDisabled();
  await page.unroute('**/api/themes');
  await page.locator('#reload-themes').click();
  await expect(page.locator('#new-theme')).toBeEnabled();
  await page.route('**/api/themes', route => route.request().method() === 'POST'
    ? route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"Simulated theme create failure"}' }) : route.continue());
  await page.locator('#new-theme').click();
  await readyModal(page, '#theme-form-modal');
  await page.locator('#theme-name').fill('Do not lose this name');
  await page.locator('#submit-theme').click();
  await expect(page.locator('#theme-form-alert')).toContainText('Simulated theme create');
  await expect(page.locator('#theme-name')).toHaveValue('Do not lose this name');
  expect(await (await request.get('/api/themes')).json()).toEqual(original);
});

test('entry modal restores the interacted field instead of stealing input when opening finishes', async ({ page }) => {
  await page.goto('/config');
  await page.locator('#add-device').click();
  await readyModal(page, '#device-form-modal');
  await page.locator('#device-name').fill('Stable name');
  await page.locator('#device-address').fill('127.0.0.1');
  await page.locator('#device-address').focus();
  await page.locator('#device-form-modal').evaluate(modal => {
    modal.focus();
    modal.dispatchEvent(new Event('shown.bs.modal'));
  });
  await expect(page.locator('#device-address')).toBeFocused();
  await expect(page.locator('#device-name')).toHaveValue('Stable name');
  await page.locator('#reset-device-form').click();
  await expect(page.locator('#device-form-modal')).toBeHidden();
  await page.locator('#device-form-modal').evaluate(modal => {
    modal.addEventListener('hidden.bs.modal', () => { modal.dataset.queuedCloseComplete = 'true'; }, { once: true });
    modal.addEventListener('show.bs.modal', () => { hideManagementModal(modal); }, { once: true });
  });
  await page.locator('#add-device').click();
  await expect(page.locator('#device-form-modal')).toHaveAttribute('data-queued-close-complete', 'true');
  await expect(page.locator('#device-form-modal')).toBeHidden();
});

test('browser back keeps dirty theme colors on cancel and navigates only after discard', async ({ page, request }) => {
  const original = await seedThemes(request);
  await page.goto('/');
  await spaLink(page, '/themes');
  await page.locator('[data-select-theme="lab-green"]').click();
  await page.locator('[data-theme-color="primary"]').fill('#005a4f');
  await page.goBack();
  await confirmation(page, false);
  await expect(page).toHaveURL(/\/themes$/);
  await expect(page.locator('[data-theme-color="primary"]')).toHaveValue('#005a4f');
  await page.goBack();
  await confirmation(page);
  await expect(page).toHaveURL(/\/$/);
  expect(await (await request.get('/api/themes')).json()).toEqual(original);
});
