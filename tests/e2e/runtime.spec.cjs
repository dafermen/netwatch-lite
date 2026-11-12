const { test, expect } = require('./fixtures.cjs');

for (const [language, expected] of [
  ['en', 'Built with .NET 10 LTS, ASP.NET Core Minimal API, C#, Bootstrap 5, FontAwesome, and vanilla JavaScript.'],
  ['es', 'Desarrollado con .NET 10 LTS, ASP.NET Core Minimal API, C#, Bootstrap 5, FontAwesome y JavaScript.']
]) {
  test(`supported runtime is visible in About and documentation (${language})`, async ({ page, request }, testInfo) => {
    await page.goto(`/about?lang=${language}`);
    const about = page.locator('#about-page');
    await expect(about).toBeVisible();
    await expect(about).toContainText(expected);
    await expect(about).not.toContainText('.NET 8');
    await expect(page.locator('html')).toHaveAttribute('lang', language);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBeTruthy();
    const guide = await request.get('/docs/RUNTIME.md');
    expect(guide.ok()).toBeTruthy();
    expect(await guide.text()).toContain('runtime **10.0.15**');
    const decision = await request.get('/docs/adr/0008-dotnet10-lts.md');
    expect(decision.ok()).toBeTruthy();
    expect(await decision.text()).toContain('Accepted 2026-11-12');
    await page.screenshot({ path: testInfo.outputPath(`runtime-${language}.png`), fullPage: true });
  });
}
