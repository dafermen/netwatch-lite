const { test, expect } = require('./fixtures.cjs');
const fs = require('node:fs/promises');

const command = '"C:\\Program Files (x86)\\Remote Client\\guest.exe" "desk.example.test"';
const editedCommand = command + ' "<img src=x onerror=alert(1)> & quoted"';
const inventory = () => ({
  settings: { intervalSeconds: 60, timeoutMs: 500, maxParallelChecks: 2, retryCount: 0, retryDelayMs: 0 },
  devices: [{ name: 'Command desk', ip: '127.0.0.1', facility: 'Lab', category: 'Workstations', deviceType: 'workstation',
    enabled: true, websiteUrl: 'https://example.test/support', command, checks: [{ type: 'ping' }] }]
});
async function expandConfig(page) {
  for (const selector of ['data-config-facility-toggle', 'data-config-category-toggle']) {
    for (const toggle of await page.locator(`[${selector}][aria-expanded="false"]`).all()) await toggle.click();
  }
}
test.beforeEach(async ({ request, page }) => {
  expect((await request.post('/api/config', { data: inventory() })).ok()).toBeTruthy();
  // Do not read or replace the operator's system clipboard during automation.
  await page.addInitScript(() => Object.defineProperty(navigator, 'clipboard', {
    configurable: true, value: { writeText: async value => { window.copiedCommand = value; } }
  }));
});

test('command description stays accessible without the removed Shortcuts note', async ({ page, request }, testInfo) => {
  const before = await (await request.get('/api/config')).json();
  await page.goto('/config');
  await page.locator('#add-device').click();
  const shortcuts = page.locator('#device-shortcuts');
  const help = page.locator('#device-command-help');
  await expect(shortcuts).not.toHaveAttribute('aria-describedby', 'device-shortcuts-help');
  await expect(page.locator('#device-shortcuts-help')).toHaveCount(0);
  await expect(page.locator('#device-command')).toHaveAttribute('aria-describedby', 'device-command-help');
  await expect(help).toHaveText('Comando para copiar al portapapeles. No se ejecuta autom\u00e1ticamente.');
  await expect(page.locator('#device-command')).toHaveValue('');
  await shortcuts.scrollIntoViewIfNeeded();
  await expect(help).toBeVisible();
  expect(await shortcuts.evaluate(element => element.scrollWidth <= element.clientWidth)).toBeTruthy();
  expect(await help.evaluate(element => element.scrollWidth <= element.clientWidth)).toBeTruthy();
  expect(await page.locator('#device-form-modal .modal-body').evaluate(element => element.scrollWidth <= element.clientWidth)).toBeTruthy();
  await page.screenshot({ path: testInfo.outputPath('shortcut-command-descriptions.png') });
  await page.locator('#reset-device-form').click();
  await expect(page.locator('#device-form-modal')).toBeHidden();
  await expandConfig(page);
  await page.locator('[data-edit-device]').click();
  await expect(page.locator('#device-command')).toHaveValue(command);
  await expect(help).toBeVisible();
  expect(await (await request.get('/api/config')).json()).toEqual(before);
  expect((await (await request.get('/api/history')).json()).runs).toEqual([]);
});

test('command editing, copying, bulk save and JSON round trip preserve literal command text', async ({ page, request }) => {
  await page.goto('/config');
  await expect(page.locator('[data-edit-device]')).toHaveCount(1);
  await expandConfig(page);
  await page.locator('[data-edit-device]').click();
  await expect(page.locator('#device-command')).toHaveValue(command);
  await page.locator('#device-command').fill(editedCommand);
  await page.locator('#submit-device').click();
  await expect(page.locator('#device-form-modal')).toBeHidden();
  await expandConfig(page);
  await page.locator('[data-copy-device]').click();
  await expect(page.locator('#device-command')).toHaveValue(editedCommand);
  await page.locator('#device-name').fill('Copied command desk');
  await page.locator('#submit-device').click();
  await expect(page.locator('#device-form-modal')).toBeHidden();
  await page.locator('#config-bulk-view').click();
  for (const toggle of await page.locator('[data-bulk-facility-toggle][aria-expanded="false"]').all()) await toggle.click();
  const row = page.locator('[data-bulk-index="1"]');
  await row.locator('[data-bulk-field="name"]').fill('Bulk copied desk');
  const saved = page.waitForResponse(response => response.url().endsWith('/api/config/devices/1') && response.request().method() === 'POST');
  await row.locator('[data-bulk-save]').click();
  expect((await saved).ok()).toBeTruthy();
  const downloading = page.waitForEvent('download');
  await page.locator('#export-config').click();
  const download = await downloading;
  const text = await fs.readFile(await download.path(), 'utf8');
  expect(JSON.parse(text).devices.map(device => device.command)).toEqual([editedCommand, editedCommand]);
  await page.locator('#import-config-file').setInputFiles({ name: 'commands.json', mimeType: 'application/json', buffer: Buffer.from(text) });
  await expect(page.locator('#config-alert')).toContainText('2 devices loaded');
  await page.goto('/');
  await page.locator('#device-search').fill('Bulk copied desk');
  const button = page.locator('[data-dashboard-device="Bulk copied desk"] [data-copy-command]');
  await expect(button).toBeVisible();
  await button.click();
  await expect(button).toContainText('Copied');
  expect(await page.evaluate(() => window.copiedCommand)).toBe(editedCommand);
  await expect(page.locator('#results-body img')).toHaveCount(0);
  expect((await (await request.get('/api/history')).json()).runs).toEqual([]);
});

test('clipboard fallback copies exact text and failure is reported without navigation or execution', async ({ page, request }) => {
  await page.goto('/');
  await page.evaluate(() => {
    navigator.clipboard.writeText = async () => { throw new Error('Synthetic clipboard denial'); };
    document.execCommand = name => { window.fallbackCommand = document.activeElement.value; return name === 'copy'; };
  });
  await page.locator('#device-search').fill('Command desk');
  const before = await (await request.get('/api/config')).json();
  const button = page.locator('[data-copy-command]');
  await button.click();
  await expect(button).toContainText('Copied');
  expect(await page.evaluate(() => window.fallbackCommand)).toBe(command);
  await expect(page.locator('textarea[readonly]')).toHaveCount(0);
  await expect(button).toBeFocused();
  await page.evaluate(() => { document.execCommand = () => false; });
  await button.click();
  await expect(button).toContainText('Copy failed');
  expect(new URL(page.url()).pathname).toBe('/');
  expect((await (await request.get('/api/history')).json()).runs).toEqual([]);
  expect(await (await request.get('/api/config')).json()).toEqual(before);
});

test('command remains available after execution and copying does not collapse its section', async ({ page }, testInfo) => {
  await page.goto('/');
  await expect(page.locator('#run-facility-check')).toBeEnabled();
  await page.locator('#run-facility-check').click();
  await expect(page.locator('#last-check')).toContainText('Last execution:');
  await page.locator('.facility-title').click();
  await expect(page.locator('.facility-section > .collapse')).toHaveClass(/collapse show/);
  await page.locator('.category-header h2').click();
  await expect(page.locator('.category-section > .collapse')).toHaveClass(/collapse show/);
  const button = page.locator('[data-copy-command]');
  await button.click();
  await expect(button).toContainText('Copied');
  expect(await page.evaluate(() => window.copiedCommand)).toBe(command);
  await expect(page.locator('.category-section > .collapse')).toHaveClass(/collapse show/);
  await expect(page.locator('#results-body a')).toHaveAttribute('href', 'https://example.test/support');
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await page.screenshot({ path: testInfo.outputPath('device-command.png'), fullPage: true });
});
