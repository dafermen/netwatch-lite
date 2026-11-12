using Microsoft.Playwright;

namespace NetWatch.Services;

/// <summary>Lazy dedicated Edge process, separate from every personal browser profile.</summary>
public sealed class BrowserRuntime(bool headless = false) : IBrowserRuntime
{
    private readonly SemaphoreSlim _gate = new(1, 1);
    private IPlaywright? _playwright;
    private IBrowser? _browser;

    /// <summary>Opens an isolated non-persistent context; never loads or saves browser state.</summary>
    public async Task<IBrowserContext> CreateContextAsync(CancellationToken token)
    {
        await _gate.WaitAsync(token);
        try
        {
            if (!headless && !Environment.UserInteractive) throw new BrowserUnavailableException();
            if (_browser is not { IsConnected: true })
            {
                _playwright?.Dispose();
                _playwright = await Playwright.CreateAsync();
                token.ThrowIfCancellationRequested();
                _browser = await _playwright.Chromium.LaunchAsync(new() { Channel = "msedge", Headless = headless, Timeout = 15000 });
            }
            token.ThrowIfCancellationRequested();
            var context = await _browser.NewContextAsync(new() { AcceptDownloads = false, IgnoreHTTPSErrors = false,
                ServiceWorkers = ServiceWorkerPolicy.Block, ViewportSize = new() { Width = 1200, Height = 800 } });
            if (token.IsCancellationRequested) { await context.CloseAsync(); token.ThrowIfCancellationRequested(); }
            return context;
        }
        catch (Exception exception) when (exception is PlaywrightException or System.TimeoutException or System.ComponentModel.Win32Exception)
        {
            throw new BrowserUnavailableException();
        }
        finally { _gate.Release(); }
    }

    /// <inheritdoc/>
    public async ValueTask DisposeAsync()
    {
        if (_browser is not null) await _browser.CloseAsync();
        _playwright?.Dispose();
        _gate.Dispose();
    }
}

/// <summary>Browser creation boundary, including isolated synthetic test runtimes.</summary>
public interface IBrowserRuntime : IAsyncDisposable
{
    /// <summary>Creates a private, non-persistent context without loading personal profiles.</summary>
    Task<IBrowserContext> CreateContextAsync(CancellationToken token);
}

/// <summary>Missing/blocked Edge or interactive desktop; never presented as site downtime.</summary>
public sealed class BrowserUnavailableException() : Exception("Edge is unavailable or interactive sign-in is blocked on the NetWatch host.");
