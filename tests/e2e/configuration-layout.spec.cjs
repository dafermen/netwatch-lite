const { test, expect } = require('./fixtures.cjs');

const inventory = () => ({
  settings: { intervalSeconds: 60, timeoutMs: 500, maxParallelChecks: 2, retryCount: 0, retryDelayMs: 0 },
  devices: [{ name: 'Layout workstation with a long name', ip: '127.0.0.1',
    hostname: 'long-workstation-name.example.test', facility: 'Layout Lab', category: 'Workstations',
    deviceType: 'workstation', enabled: true, checks: [{ type: 'ping' }] }]
});

async function expandGroups(page) {
  await page.locator('[data-config-facility-toggle]').click();
  await page.locator('[data-config-category-toggle]').click();
  await expect(page.locator('.config-device-row')).toBeVisible();
}

test.beforeEach(async ({ request }) => {
  expect((await request.post('/api/config', { data: inventory() })).ok()).toBeTruthy();
});

test('configuration headers are neutral and device actions stay aligned without overlap', async ({ page, request }, testInfo) => {
  const before = await (await request.get('/api/config')).json();
  await page.goto('/config');
  await expect(page.locator('.config-facility-row td')).toHaveCSS('background-color', 'rgb(241, 243, 245)');
  await expect(page.locator('.config-facility-row td')).toHaveCSS('color', 'rgb(33, 37, 41)');
  await expandGroups(page);
  await expect(page.locator('.config-category-row td')).toHaveCSS('background-color', 'rgb(248, 249, 250)');
  await expect(page.locator('.config-devices-table th').filter({ hasText: /^Checks$/ })).toHaveCSS('white-space', 'nowrap');
  const actions = page.locator('.config-device-actions');
  await expect(actions.getByRole('button')).toHaveCount(3);
  for (const action of ['Edit', 'Copy', 'Delete']) {
    await expect(actions.getByRole('button', { name: `${action} ${before.devices[0].name}`, exact: true })).toHaveAttribute('title', `${action} device`);
  }
  await actions.scrollIntoViewIfNeeded();
  const geometry = await actions.evaluate(group => {
    const cell = group.closest('td').getBoundingClientRect();
    const buttons = [...group.querySelectorAll('button')].map(button => {
      const rect = button.getBoundingClientRect();
      return { x: rect.x, y: rect.y, right: rect.right, width: rect.width, height: rect.height,
        unobscured: button.contains(document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2)) };
    });
    return { cell: { x: cell.x, right: cell.right }, buttons };
  });
  expect(geometry.buttons.map(button => button.y)).toEqual(Array(3).fill(geometry.buttons[0].y));
  for (const [index, button] of geometry.buttons.entries()) {
    expect(button.width).toBe(32);
    expect(button.height).toBe(32);
    expect(button.unobscured).toBeTruthy();
    expect(button.x).toBeGreaterThanOrEqual(geometry.cell.x);
    expect(button.right).toBeLessThanOrEqual(geometry.cell.right);
    if (index) expect(button.x).toBeGreaterThan(geometry.buttons[index - 1].right);
  }
  const pageWidth = await page.evaluate(() => ({ actual: document.documentElement.scrollWidth, viewport: document.documentElement.clientWidth }));
  expect(pageWidth.actual).toBeLessThanOrEqual(pageWidth.viewport);
  await page.locator('#config-devices-table-wrapper').screenshot({ path: testInfo.outputPath('configuration-actions.png') });

  await page.locator('[data-config-category-toggle]').click();
  await expect(page.locator('.config-device-row')).toBeHidden();
  await page.locator('[data-config-category-toggle]').click();
  await expect(page.locator('.config-device-row')).toBeVisible();
  await page.locator('[data-config-facility-toggle]').click();
  await expect(page.locator('.config-device-row')).toBeHidden();
  await page.locator('#config-bulk-view').click();
  await expect(page.locator('.bulk-group-row td')).toHaveCSS('background-color', 'rgb(241, 243, 245)');
  await expect(page.locator('.bulk-category-row td')).toHaveCSS('background-color', 'rgb(248, 249, 250)');
  expect(await (await request.get('/api/config')).json()).toEqual(before);
});

test('custom configuration header colors and active theme are preserved', async ({ page, request }) => {
  const themes = await (await request.get('/api/themes')).json();
  const custom = structuredClone(themes.themes.find(theme => theme.id === 'default'));
  custom.id = 'custom-layout';
  custom.name = 'Custom layout palette';
  custom.builtIn = false;
  custom.colors.configFacilityHeader = '#111827';
  custom.colors.configFacilityText = '#e5e7eb';
  custom.colors.configCategoryHeader = '#e2e4e6';
  custom.colors.configCategoryText = '#212529';
  themes.themes.push(custom);
  themes.activeThemeId = custom.id;
  expect((await request.post('/api/themes', { data: themes })).ok()).toBeTruthy();
  const before = await (await request.get('/api/config')).json();
  await page.goto('/config');
  await expandGroups(page);
  await expect(page.locator('.config-facility-row td')).toHaveCSS('background-color', 'rgb(17, 24, 39)');
  await expect(page.locator('.config-category-row td')).toHaveCSS('background-color', 'rgb(226, 228, 230)');
  const after = await (await request.get('/api/themes')).json();
  expect(after.activeThemeId).toBe(custom.id);
  expect(after.themes.find(theme => theme.id === custom.id)).toEqual(custom);
  expect(await (await request.get('/api/config')).json()).toEqual(before);
});
