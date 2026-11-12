using System.Net;

namespace NetWatch.Services;

/// <summary>Local, same-origin, explicit manual-session actions; no passwords or browser-state API.</summary>
public static class BrowserCheckEndpoints
{
    /// <summary>Validates browser launch/close requests against loopback and the exact local origin.</summary>
    public static bool IsLocalRequest(HttpContext context)
    {
        var request = context.Request;
        var host = request.Host.Host.Trim('[', ']');
        return context.Connection.RemoteIpAddress is { } remote && IPAddress.IsLoopback(remote)
            && (host.Equals("localhost", StringComparison.OrdinalIgnoreCase) || IPAddress.TryParse(host, out var address) && IPAddress.IsLoopback(address))
            && request.Headers["X-NetWatch-Browser"] == "1"
            && !request.Headers.Keys.Any(key => key.Equals("Forwarded", StringComparison.OrdinalIgnoreCase) || key.StartsWith("X-Forwarded-", StringComparison.OrdinalIgnoreCase))
            && Uri.TryCreate(request.Headers.Origin.ToString(), UriKind.Absolute, out var origin)
            && origin.GetLeftPart(UriPartial.Authority).Equals(request.Scheme + "://" + request.Host.Value, StringComparison.OrdinalIgnoreCase)
            && origin.AbsolutePath == "/" && origin.Query.Length == 0 && origin.Fragment.Length == 0 && origin.UserInfo.Length == 0;
    }

    /// <summary>Maps the guarded session endpoint. Status never includes URLs, cookies, account data or storage state.</summary>
    public static void MapBrowserCheckEndpoints(this WebApplication app)
    {
        app.MapPost("/api/browser-sessions", async (HttpContext context, BrowserSessionRequest request, BrowserCheckService service, CancellationToken token) =>
        {
            if (!IsLocalRequest(context)) return Results.Json(new { error = "Manual browser sessions require a same-origin request from localhost on the NetWatch host." }, statusCode: 403);
            try
            {
                if (request.Action is not ("open" or "ready" or "close" or "status")) throw new InvalidDataException("Unknown browser session action.");
                return Results.Ok(await service.SessionAsync(request, token));
            }
            catch (MonitorScopeConflictException exception) { return Results.Conflict(new { code="ScopeChanged",error=exception.Message }); }
            catch (InvalidDataException exception) { return Results.BadRequest(new { error=exception.Message }); }
            catch (BrowserUnavailableException exception) { return Results.Json(new { state="BrowserUnavailable",error=exception.Message },statusCode:503); }
            catch (Microsoft.Playwright.PlaywrightException) { return Results.Json(new { state="NotEvaluated",error="The dedicated browser could not complete this action. Reopen sign-in on the NetWatch host." },statusCode:503); }
            catch (System.TimeoutException) { return Results.Json(new { state="NotEvaluated",error="The dedicated browser did not finish loading. Complete sign-in and try again." },statusCode:503); }
            catch (OperationCanceledException) when (!token.IsCancellationRequested) { return Results.Json(new { state="NotEvaluated",error="The dedicated browser did not finish loading. Complete sign-in and try again." },statusCode:503); }
        }).RequireRateLimiting("browser-sessions");
    }
}
