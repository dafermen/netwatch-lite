using System.Collections.Concurrent;
using System.Diagnostics;
using System.Text.Json;
using Microsoft.Playwright;
using NetWatch.Models;

namespace NetWatch.Services;

/// <summary>Bounded, volatile authenticated sessions owned by one saved check and active profile.</summary>
public sealed class BrowserCheckService(JsonDeviceRepository repository, IBrowserRuntime runtime, TimeProvider? timeProvider = null) : BackgroundService
{
    private readonly TimeProvider _time = timeProvider ?? TimeProvider.System;
    private readonly ConcurrentDictionary<string, Session> _sessions = new(StringComparer.Ordinal);
    private readonly SemaphoreSlim _creation = new(1, 1);
    private static readonly TimeSpan IdleLifetime = TimeSpan.FromMinutes(60);
    private static readonly TimeSpan AbsoluteLifetime = TimeSpan.FromHours(8);

    /// <summary>Performs an explicit local session action against a fresh revision-checked definition.</summary>
    public async Task<object> SessionAsync(BrowserSessionRequest request, CancellationToken token)
    {
        var snapshot = await repository.GetMonitoringInventoryAsync(token);
        MonitorPlans.AssertRevision(snapshot, request.ProfileId, request.Revision);
        var binding = Resolve(snapshot, request.Key, request.CheckIndex);
        await PruneAsync(snapshot);
        var id = Id(snapshot.ProfileId, request.Key!, request.CheckIndex);
        if (request.Action == "close")
        {
            await RemoveAsync(id);
            return new { state = "AuthenticationRequired", sessionPresent = false, ready = false };
        }
        if (request.Action == "open")
        {
            await _creation.WaitAsync(token);
            try
            {
                if (_sessions.TryGetValue(id, out var existing)) return View(existing);
                if (_sessions.Count >= 4) return new { state = "SessionLimit", sessionPresent = false, ready = false };
                var context = await runtime.CreateContextAsync(token);
                var session = new Session(snapshot.ProfileId, request.Key!, binding, context, _time.GetUtcNow());
                try
                {
                    context.Page += (_, page) =>
                    {
                        if (session.Page is not null) { session.BlockedNavigation = true; _ = page.CloseAsync(); return; }
                        page.Dialog += (_, dialog) => _ = dialog.DismissAsync();
                        page.Request += (_, request) =>
                        {
                            try { if (request.IsNavigationRequest && request.Frame == page.MainFrame) session.Responses[page] = 0; }
                            catch (PlaywrightException) { }
                        };
                        page.Response += (_, response) =>
                        {
                            try { if (response.Request.IsNavigationRequest && response.Frame == page.MainFrame) session.Responses[page] = response.Status; }
                            catch (PlaywrightException) { }
                        };
                    };
                    session.Page = await context.NewPageAsync().WaitAsync(token);
                    await InstallNavigationGuardAsync(session, token);
                    _sessions[id] = session;
                    try { await NavigateAsync(session, token); }
                    catch (System.TimeoutException) { }
                    catch (PlaywrightException) { }
                    return View(session);
                }
                catch { _sessions.TryRemove(id, out _); await context.CloseAsync(); throw; }
            }
            finally { _creation.Release(); }
        }
        if (!_sessions.TryGetValue(id, out var current)) return new { state = "AuthenticationRequired", sessionPresent = false, ready = false };
        if (request.Action == "status") return View(current);
        if (request.Action != "ready") throw new InvalidDataException("Unknown browser session action.");
        using var deadline = CancellationTokenSource.CreateLinkedTokenSource(token);
        deadline.CancelAfter(current.Check.TimeoutMs ?? 15000);
        await current.Gate.WaitAsync(deadline.Token);
        try
        {
            var result = await ObserveAsync(current, deadline.Token);
            current.SigningIn = result.Status is "AuthenticationRequired" or "NavigationBlocked" or "UnexpectedDestination";
            current.LastUsed = _time.GetUtcNow();
            return new { state = result.Status, sessionPresent = true, ready = !current.SigningIn, message = result.Message };
        }
        finally { current.Gate.Release(); }
    }

    /// <summary>Checks the intended application using a manually authenticated, non-persistent session.</summary>
    public async Task<CheckResult> CheckAsync(string? key, int checkIndex, DeviceCheck check, CancellationToken token)
    {
        var watch = Stopwatch.StartNew();
        if (key is null) return Result(check, "NotEvaluated", "Use the current Dashboard selection to run authenticated browser checks.", watch.ElapsedMilliseconds);
        var snapshot = await repository.GetMonitoringInventoryAsync(token);
        await PruneAsync(snapshot);
        DeviceCheck actual;
        try { actual = Resolve(snapshot, key, checkIndex); }
        catch (InvalidDataException) { return Result(check, "NotEvaluated", "The saved browser check changed. Reload the inventory and sign in again.", watch.ElapsedMilliseconds); }
        if (!_sessions.TryGetValue(Id(snapshot.ProfileId, key, checkIndex), out var session) || session.Page is null || session.Page.IsClosed)
            return Result(actual, "AuthenticationRequired", "Sign in using the dedicated browser on the NetWatch host.", watch.ElapsedMilliseconds);
        if (session.SigningIn) return Result(actual, "AuthenticationRequired", "Finish manual sign-in, then choose Finish sign-in before running checks.", watch.ElapsedMilliseconds);
        using var deadline = CancellationTokenSource.CreateLinkedTokenSource(token);
        deadline.CancelAfter(actual.TimeoutMs ?? 15000);
        var acquired = false;
        try
        {
            await session.Gate.WaitAsync(deadline.Token); acquired = true;
            session.LastUsed = _time.GetUtcNow();
            await NavigateAsync(session, deadline.Token);
            var result = await ObserveAsync(session, deadline.Token);
            if (result.Status == "AuthenticationRequired") session.SigningIn = true;
            return WithDuration(result, watch.ElapsedMilliseconds);
        }
        catch (Exception exception) when (exception is PlaywrightException or System.TimeoutException or OperationCanceledException or BrowserUnavailableException)
        {
            var authentication = session.Page is null || session.Page.IsClosed || IsAuthenticationPage(session);
            if (authentication) session.SigningIn = true;
            if (exception is OperationCanceledException or System.TimeoutException || token.IsCancellationRequested)
            {
                _sessions.TryRemove(Id(snapshot.ProfileId, key, checkIndex), out _);
                try { await session.Context.CloseAsync(); } catch (PlaywrightException) { }
            }
            if (token.IsCancellationRequested) throw new OperationCanceledException(token);
            return Result(actual, session.BlockedNavigation ? "NavigationBlocked" : authentication ? "AuthenticationRequired" : exception is OperationCanceledException or System.TimeoutException ? "TimedOut" : "Unavailable",
                authentication ? "The browser session requires sign-in again. Site availability was not evaluated." : "The browser could not load the application within the configured deadline. Check network, TLS and site availability.", watch.ElapsedMilliseconds);
        }
        finally { if (acquired) session.Gate.Release(); }
    }

    private static string Id(string profile, string key, int index) => profile + ":" + key + ":" + index;
    private static DeviceCheck Resolve(MonitoringInventory snapshot, string? key, int index)
    {
        var deviceIndex = key is { Length: 64 } ? Array.IndexOf(snapshot.Keys.ToArray(), key) : -1;
        if (deviceIndex < 0 || index < 0 || index >= snapshot.Configuration.Devices[deviceIndex].Checks.Count) throw new InvalidDataException("The saved browser check was not found.");
        var device = snapshot.Configuration.Devices[deviceIndex];
        var check = device.Checks[index];
        if (!device.Enabled || check.Type != "browser") throw new InvalidDataException("Select an enabled browser check from the current inventory.");
        return check;
    }

    private async Task NavigateAsync(Session session, CancellationToken token)
    {
        session.BlockedNavigation = false;
        var response = await session.Page!.GotoAsync(session.Check.Url!, new() { WaitUntil = WaitUntilState.DOMContentLoaded, Timeout = session.Check.TimeoutMs ?? 15000 }).WaitAsync(token);
        session.StatusCode = response?.Status;
    }

    private static async Task InstallNavigationGuardAsync(Session session, CancellationToken token)
    {
        var client = await session.Context.NewCDPSessionAsync(session.Page!).WaitAsync(token);
        var tree = await client.SendAsync("Page.getFrameTree").WaitAsync(token);
        var mainFrame = tree!.Value.GetProperty("frameTree").GetProperty("frame").GetProperty("id").GetString();
        // CDP pauses every redirect hop; Playwright routing only pauses the first URL.
        client.Event("Fetch.requestPaused").OnEvent += (_, payload) => { if (payload is { } data) _ = ContinueNavigationAsync(session, client, mainFrame!, data); };
        await client.SendAsync("Fetch.enable", new() { ["patterns"] = new[] { new { urlPattern = "*", resourceType = "Document", requestStage = "Request" } } }).WaitAsync(token);
    }

    private static async Task ContinueNavigationAsync(Session session, ICDPSession client, string mainFrame, JsonElement payload)
    {
        try
        {
            var id = payload.GetProperty("requestId").GetString()!;
            if (payload.GetProperty("frameId").GetString() == mainFrame
                && !BrowserCheckRules.CanNavigate(session.Check, payload.GetProperty("request").GetProperty("url").GetString()!))
            {
                session.BlockedNavigation = true;
                await client.SendAsync("Fetch.failRequest", new() { ["requestId"] = id, ["errorReason"] = "BlockedByClient" });
                return;
            }
            await client.SendAsync("Fetch.continueRequest", new() { ["requestId"] = id });
        }
        catch (Exception exception) when (exception is PlaywrightException or InvalidOperationException or KeyNotFoundException)
        { session.BlockedNavigation = true; try { await session.Context.CloseAsync(); } catch (PlaywrightException) { } }
    }

    private static bool IsAuthenticationPage(Session session) => session.Context.Pages.Any(page => !page.IsClosed && Uri.TryCreate(page.Url, UriKind.Absolute, out var uri) && BrowserCheckRules.IsAuthentication(session.Check, uri));

    private static async Task<CheckResult> ObserveAsync(Session session, CancellationToken token)
    {
        if (session.BlockedNavigation) return Result(session.Check, "NavigationBlocked", "A top-level redirect was blocked. Review the trusted authentication origins; no access was validated.", 0);
        if (IsAuthenticationPage(session)) return Result(session.Check, "AuthenticationRequired", "The browser is at the identity provider. Sign in again; this is not a site-down result.", 0);
        var target = new Uri(session.Check.Url!);
        var page = session.Context.Pages.FirstOrDefault(page => !page.IsClosed && Uri.TryCreate(page.Url, UriKind.Absolute, out var uri) && BrowserCheckRules.IsTarget(target, uri));
        if (page is null) return Result(session.Check, IsAuthenticationPage(session) ? "AuthenticationRequired" : "UnexpectedDestination",
            IsAuthenticationPage(session) ? "The browser is at the identity provider. Sign in again; this is not a site-down result." : "The browser did not reach the configured application URL.", 0);
        session.Page = page;
        session.StatusCode = session.Responses.GetValueOrDefault(page, session.StatusCode ?? 0);
        await page.WaitForLoadStateAsync(LoadState.Load, new() { Timeout = session.Check.TimeoutMs ?? 15000 }).WaitAsync(token);
        var authenticationField = page.Locator("input[type=password]:visible, input[name=loginfmt]:visible");
        if (await authenticationField.CountAsync().WaitAsync(token) > 0 || session.StatusCode is 401 or 403)
            return Result(session.Check, "AuthenticationRequired", "Authentication or application access is required. Availability was not validated.", 0);
        if (session.StatusCode is >= 400) return Result(session.Check, "Unavailable", "The application returned an HTTP error.", 0, session.StatusCode);
        if (session.StatusCode != 200) return Result(session.Check, "ValidationFailed", "The application did not return the expected HTTP 200 document.", 0, session.StatusCode);
        await page.Locator("body").WaitForAsync(new() { State = WaitForSelectorState.Visible, Timeout = session.Check.TimeoutMs ?? 15000 }).WaitAsync(token);
        var text = await page.Locator("body").EvaluateAsync<string>("element => element.innerText.slice(0, 1048577)").WaitAsync(token);
        if (BrowserCheckRules.IsAuthenticationContent(text))
            return Result(session.Check, "AuthenticationRequired", "Microsoft sign-in requires attention. Application availability was not validated.", 0);
        if (!Uri.TryCreate(page.Url, UriKind.Absolute, out var final) || !BrowserCheckRules.IsTarget(target, final))
            return Result(session.Check, IsAuthenticationPage(session) ? "AuthenticationRequired" : "UnexpectedDestination", "The browser did not reach the configured application URL.", 0);
        if (string.IsNullOrWhiteSpace(text) || text.Length > 1048576 || session.Check.ExpectedText is { Length: > 0 } expected && !text.Contains(expected, StringComparison.Ordinal))
            return Result(session.Check, "ValidationFailed", "The application loaded but its configured visible-content validation did not pass.", 0, session.StatusCode);
        return Result(session.Check, "Success", "Application access validated. This is not a complete functional application test.", 0, session.StatusCode, true);
    }

    private object View(Session session) => new { state = session.Page is null || session.Page.IsClosed ? "AuthenticationRequired" : session.SigningIn ? "SigningIn" : "Ready",
        sessionPresent = session.Page is { IsClosed: false }, ready = !session.SigningIn && session.Page is { IsClosed: false } };

    private static CheckResult Result(DeviceCheck check, string status, string message, long duration, int? code = null, bool available = false) => new()
    {
        Type = "browser", Label = "Browser", Url = new Uri(check.Url!).GetLeftPart(UriPartial.Path), IsAvailable = available,
        Status = status, DiagnosticCode = status, Message = message, StatusCode = code, ExpectedStatusCode = 200,
        TimeoutMs = check.TimeoutMs ?? 15000, DurationMs = duration, Attempts = 1
    };
    private static CheckResult WithDuration(CheckResult result, long duration) => new()
    { Type=result.Type,Label=result.Label,Url=result.Url,IsAvailable=result.IsAvailable,Status=result.Status,DiagnosticCode=result.DiagnosticCode,Message=result.Message,StatusCode=result.StatusCode,ExpectedStatusCode=200,TimeoutMs=result.TimeoutMs,DurationMs=duration,Attempts=1 };

    private async Task PruneAsync(MonitoringInventory? snapshot = null)
    {
        var now = _time.GetUtcNow();
        foreach (var pair in _sessions)
            if (now - pair.Value.LastUsed > IdleLifetime || now - pair.Value.Created > AbsoluteLifetime || pair.Value.Page is { IsClosed: true }
                || snapshot is not null && (pair.Value.Profile != snapshot.ProfileId || !snapshot.Keys.Contains(pair.Value.Key))) await RemoveAsync(pair.Key);
    }
    private async Task RemoveAsync(string id)
    {
        if (!_sessions.TryRemove(id, out var session)) return;
        await session.Gate.WaitAsync();
        try { await session.Context.CloseAsync(); }
        catch (PlaywrightException) { }
        finally { session.Gate.Release(); }
    }

    /// <inheritdoc/>
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(TimeSpan.FromMinutes(1));
        try { while (await timer.WaitForNextTickAsync(stoppingToken)) await PruneAsync(); }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { }
    }
    /// <inheritdoc/>
    public override async Task StopAsync(CancellationToken cancellationToken)
    {
        await base.StopAsync(cancellationToken);
        foreach (var id in _sessions.Keys) await RemoveAsync(id);
    }

    private sealed class Session(string profile, string key, DeviceCheck check, IBrowserContext context, DateTimeOffset created)
    {
        public string Profile { get; } = profile;
        public string Key { get; } = key;
        public DeviceCheck Check { get; } = check;
        public IBrowserContext Context { get; } = context;
        public IPage? Page { get; set; }
        public ConcurrentDictionary<IPage, int> Responses { get; } = new();
        public SemaphoreSlim Gate { get; } = new(1, 1);
        public bool SigningIn { get; set; } = true;
        public bool BlockedNavigation { get; set; }
        public int? StatusCode { get; set; }
        public DateTimeOffset Created { get; } = created;
        public DateTimeOffset LastUsed { get; set; } = created;
    }
}

/// <summary>Only saved definitions can create a local sign-in window.</summary>
public sealed record BrowserSessionRequest(string? ProfileId, string? Revision, string? Key, int CheckIndex, string Action);
