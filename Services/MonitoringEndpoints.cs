using NetWatch.Models;

namespace NetWatch.Services;

/// <summary>Explicit, revision-checked monitoring selections and narrow participation updates.</summary>
public static class MonitoringEndpoints
{
    /// <summary>Registers additive endpoints; legacy configuration and stream clients remain supported.</summary>
    public static void MapMonitoringEndpoints(this WebApplication app)
    {
        app.MapGet("/api/monitor/inventory", async (JsonDeviceRepository repository, CancellationToken cancellationToken) =>
            await HandleAsync(async () => await repository.GetMonitoringInventoryAsync(cancellationToken)));
        app.MapPost("/api/monitor/plans", async (MonitoringSelectionRequest request, MonitorPlans plans, CancellationToken cancellationToken) =>
            await HandleAsync(() => plans.CreateAsync(request, cancellationToken)));
        app.MapPost("/api/config/devices/{index:int}/monitoring", async (int index, MonitoringEnabledRequest request,
            JsonDeviceRepository repository, CancellationToken cancellationToken) =>
            await HandleAsync(async () => await repository.SetMonitoringEnabledAsync(index, request, cancellationToken)));
    }

    private static async Task<IResult> HandleAsync(Func<Task<object>> operation)
    {
        try { return Results.Ok(await operation()); }
        catch (MonitorScopeConflictException exception) { return Results.Conflict(new { code = "ScopeChanged", error = exception.Message }); }
        catch (InvalidDataException exception) { return Results.BadRequest(new { code = "InvalidSelection", error = exception.Message }); }
    }
}
