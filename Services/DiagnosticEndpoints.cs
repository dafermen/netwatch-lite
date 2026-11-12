using NetWatch.Models;

namespace NetWatch.Services;

/// <summary>Private diagnostic consultation and bounded browser-error collection.</summary>
public static class DiagnosticEndpoints
{
    /// <summary>Registers additive diagnostic APIs without changing legacy log contracts.</summary>
    public static void MapDiagnosticEndpoints(this WebApplication app)
    {
        app.MapGet("/api/diagnostics", async (HttpContext context, DiagnosticPages pages, CancellationToken cancellationToken) =>
        {
            try { return Results.Ok(await pages.QueryAsync(context.Request.Query, cancellationToken)); }
            catch (MonitorScopeConflictException exception) { return Results.Conflict(new { code = "DiagnosticsChanged", error = exception.Message }); }
            catch (InvalidDataException exception) { return Results.BadRequest(new { error = exception.Message }); }
        });
        app.MapPost("/api/diagnostics/client", async (BrowserDiagnostic report, HttpContext context, JsonAppErrorLogRepository repository) =>
        {
            if (report.Kind is not ("error" or "unhandledrejection" or "resource-error")
                || string.IsNullOrWhiteSpace(report.Message) || report.Message.Length > 4096 || report.Script?.Length > 1024
                || report.Line is < 0 or > 10000000 || report.Column is < 0 or > 10000000)
                return Results.BadRequest(new { error = "Invalid browser diagnostic." });
            var location = report.Script is { Length: > 0 } script ? $" ({DiagnosticSanitizer.Text(script.Split('?', '#')[0], 1024)}:{report.Line}:{report.Column})" : "";
            using var deadline = new CancellationTokenSource(TimeSpan.FromSeconds(3));
            var entry = await repository.AppendAsync(new BrowserDiagnosticException(report.Kind + ": " + report.Message + location),
                "browser", context, cancellationToken: deadline.Token);
            return Results.Ok(new { errorId = entry.ErrorId, traceId = entry.TraceId });
        }).RequireRateLimiting("browser-diagnostics");
    }
}

internal sealed class BrowserDiagnosticException(string message) : Exception(message);
