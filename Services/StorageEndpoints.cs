using NetWatch.Models;

namespace NetWatch.Services;

/// <summary>Local-only storage maintenance and SQL query endpoints.</summary>
public static class StorageEndpoints
{
    /// <summary>Registers compatible additive endpoints; no restore is exposed over HTTP.</summary>
    public static void MapStorageEndpoints(this WebApplication app)
    {
        app.MapGet("/api/reports/query",(HttpRequest request,SqliteQueries queries) => Guard(() => queries.Reports(request.Query)));
        app.MapGet("/api/storage/audit",(HttpRequest request,SqliteQueries queries) => Guard(() => queries.Audit(request.Query)));
        app.MapGet("/api/inventory/query",async (HttpRequest request,SqliteQueries queries,JsonRegionProfileRepository profiles,IWebHostEnvironment environment) =>
        {
            var profile = await profiles.GetActiveProfileAsync(request.HttpContext.RequestAborted);
            var path = Path.GetRelativePath(environment.ContentRootPath,profiles.ResolveProfileDeviceFilePath(profile.File)).Replace('\\','/');
            return Guard(() => queries.Inventory(path,request.Query));
        });
        app.MapGet("/api/storage/policy",async (StorageOperations operations,CancellationToken token) => Results.Ok(await operations.GetPolicyAsync(token)));
        app.MapPut("/api/storage/policy",async (StoragePolicy policy,StorageOperations operations,CancellationToken token) =>
        {
            try { return Results.Ok(await operations.SavePolicyAsync(policy,token)); }
            catch (InvalidDataException ex) { return Results.BadRequest(new {error=ex.Message}); }
        });
        app.MapGet("/api/storage/backups",(StorageOperations operations) => Results.Ok(operations.ListBackups()));
        app.MapPost("/api/storage/backups",async (StorageOperations operations,CancellationToken token) =>
        {
            try { return Results.Ok(new { name=await operations.BackupAsync(automatic:false,token),verified=true }); }
            catch (InvalidDataException ex) { return Results.BadRequest(new {error=ex.Message}); }
        });
    }
    private static IResult Guard(Func<object> action)
    {
        try { return Results.Ok(action()); }
        catch (InvalidDataException ex) { return Results.BadRequest(new {error=ex.Message}); }
    }
}
