const { test: base, expect } = require('@playwright/test');
const { spawn } = require('node:child_process');
const { mkdtemp, rm, cp, copyFile } = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');

async function copyPublicTree(source, destination) {
  if (process.platform !== 'win32') return cp(source, destination, { recursive: true });
  // Copy only into the fresh test root; never mirror, purge or share writable data.
  await new Promise((resolve, reject) => {
    const child = spawn('robocopy.exe', [source, destination, '/E', '/COPY:DAT', '/R:0', '/W:0',
      '/MT:8', '/XJ', '/NJH', '/NJS', '/NFL', '/NDL', '/NP'], { windowsHide: true, stdio: 'ignore' });
    const timer = setTimeout(() => { child.kill(); reject(new Error('Public test asset copy timed out.')); }, 15000);
    child.once('error', error => { clearTimeout(timer); reject(error); });
    child.once('close', code => {
      clearTimeout(timer);
      if (code !== null && code >= 0 && code < 8) resolve();
      else reject(new Error(`Public test asset copy failed: ${code}`));
    });
  });
}

const test = base.extend({
  app: [async ({}, use, testInfo) => {
    const setupStarted = Date.now();
    const runtime = await mkdtemp(path.join(os.tmpdir(), 'netwatch-e2e-'));
    const publishedRoot = path.resolve(__dirname, '../.app');
    const contentRoot = runtime;
    // Profiles are resolved relative to the content root, not just the registry path.
    await copyPublicTree(path.join(publishedRoot, 'wwwroot'), path.join(contentRoot, 'wwwroot'));
    await copyPublicTree(path.join(publishedRoot, 'docs'), path.join(contentRoot, 'docs'));
    await copyFile(path.join(publishedRoot, 'config.sample.json'), path.join(contentRoot, 'config.sample.json'));
    await copyFile(path.join(publishedRoot, 'appsettings.json'), path.join(contentRoot, 'appsettings.json'));
    const copyCompleted = Date.now();
    const env = { ...process.env, ASPNETCORE_ENVIRONMENT: 'Testing' };
    env.Storage__Provider = process.env.NETWATCH_TEST_STORAGE || 'json';
    for (const [setting, file] of Object.entries({
      DeviceFilePath: 'config.json', ProfileFilePath: 'regions.json',
      ThemeFilePath: 'themes.json', HistoryFilePath: 'monitor-history.json',
      ErrorLogFilePath: 'app-errors.json', IntegrationFilePath: 'integrations.json'
    })) env[`NetworkMonitor__${setting}`] = path.join(runtime, file);
    const child = spawn(process.env.NETWATCH_DOTNET || 'dotnet', [
      path.join(publishedRoot, 'NetWatch-Lite.dll'), '--contentRoot', contentRoot,
      '--urls', 'http://127.0.0.1:0'
    ], { env, cwd: contentRoot, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    const spawnStarted = Date.now();
    let logs = '';
    const exited = new Promise(resolve => child.once('close', resolve));
    child.stderr.on('data', chunk => { logs += chunk; });
    try {
      const url = await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Test app startup timed out.')), 15000);
        child.once('error', error => { clearTimeout(timer); reject(error); });
        child.once('exit', code => { clearTimeout(timer); reject(new Error(`Test app exited: ${code}`)); });
        child.stdout.on('data', chunk => {
          logs += chunk;
          const match = logs.match(/Now listening on: (http:\/\/127\.0\.0\.1:\d+)/);
          if (match) { clearTimeout(timer); resolve(match[1]); }
        });
      });
      const ready = Date.now();
      await testInfo.attach('isolated-runtime-metrics', {
        body: JSON.stringify({ copyMs: copyCompleted - setupStarted, startupMs: ready - spawnStarted,
          setupMs: ready - setupStarted, provider: env.Storage__Provider }), contentType: 'application/json'
      });
      await use({ url });
    } finally {
      if (child.exitCode === null && !child.killed) child.kill();
      await exited;
      if (testInfo.status !== testInfo.expectedStatus) {
        await testInfo.attach('isolated-server-log', { body: logs, contentType: 'text/plain' });
      }
      if (path.dirname(runtime) !== os.tmpdir() || !path.basename(runtime).startsWith('netwatch-e2e-')) {
        throw new Error('Refusing to remove a directory outside the owned test runtime.');
      }
      await rm(runtime, { recursive: true, force: true });
    }
  }, { timeout: 30000 }],
  baseURL: async ({ app }, use) => use(app.url),
  localAssets: [async ({ context }, use) => {
    await context.route('https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/**', route => {
      const relative = new URL(route.request().url()).pathname.split('/dist/')[1];
      return route.fulfill({ path: path.resolve(__dirname, '../../node_modules/bootstrap/dist', relative) });
    });
    await context.route('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/**', route => {
      const relative = new URL(route.request().url()).pathname.split('/6.5.2/')[1];
      return route.fulfill({ path: path.resolve(__dirname, '../../node_modules/@fortawesome/fontawesome-free', relative) });
    });
    await use();
  }, { auto: true }],
  uncaughtErrors: [async ({ page }, use) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await use();
    expect(errors, 'No uncaught browser exceptions').toEqual([]);
  }, { auto: true }]
});

module.exports = { test, expect };
