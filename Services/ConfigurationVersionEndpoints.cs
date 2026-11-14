namespace NetWatch.Services;

/// <summary>Reviewed imports and private profile-only recovery; never replaces a database file.</summary>
public static class ConfigurationVersionEndpoints
{
    private const int MaxBytes = 5 * 1024 * 1024;

    private static async Task<byte[]> Upload(HttpRequest request, CancellationToken token)
    {
        if (!request.HasFormContentType) throw new InvalidDataException("Import requires multipart form data with a configFile upload.");
        var form = await request.ReadFormAsync(token);
        var file = form.Files["configFile"] ?? throw new InvalidDataException("Choose a JSON configuration file to import.");
        if (file.Length == 0) throw new InvalidDataException("Imported file is empty.");
        if (file.Length > MaxBytes) throw new InvalidDataException("Imported file is too large. Maximum size is 5 MB.");
        if (!Path.GetExtension(file.FileName).Equals(".json", StringComparison.OrdinalIgnoreCase)) throw new InvalidDataException("Imported file must use the .json extension.");
        await using var input = file.OpenReadStream();
        using var buffer = new MemoryStream();
        await input.CopyToAsync(buffer, token);
        if (buffer.Length > MaxBytes) throw new InvalidDataException("Imported file is too large. Maximum size is 5 MB.");
        return buffer.ToArray();
    }

    private static async Task<IResult> Guard(HttpContext context, Func<Task<IResult>> action)
    {
        context.Response.Headers.CacheControl = "no-store";
        try { return await action(); }
        catch (MonitorScopeConflictException exception) { return Results.Conflict(new { error = exception.Message }); }
        catch (ConfigurationConflictException exception) { return Results.Conflict(new { error = exception.Message }); }
        catch (InvalidDataException exception) { return Results.BadRequest(new { error = exception.Message }); }
    }

    /// <summary>Maps bounded preview, import and recovery actions against saved profile/revision guards.</summary>
    public static void MapConfigurationVersionEndpoints(this WebApplication app)
    {
        app.MapGet("/api/config/versions", (HttpContext context, JsonDeviceRepository repository, CancellationToken token) =>
            Guard(context, async () => Results.Ok(await repository.GetConfigurationVersionsAsync(token))));
        app.MapPost("/api/config/import/preview", (HttpContext context, JsonDeviceRepository repository, CancellationToken token) =>
            Guard(context, async () => Results.Ok(await repository.PreviewImportAsync(await Upload(context.Request, token), token, context.Request.Headers["X-NetWatch-Profile"]))));
        app.MapPost("/api/config/import/commit", (HttpContext context, JsonDeviceRepository repository, CancellationToken token) =>
            Guard(context, async () =>
            {
                var request = new ConfigurationVersionRequest(context.Request.Headers["X-NetWatch-Profile"],
                    context.Request.Headers["X-NetWatch-Revision"], context.Request.Headers["X-NetWatch-Import-SHA256"]);
                if (string.IsNullOrWhiteSpace(request.ProfileId) || string.IsNullOrWhiteSpace(request.Revision) || string.IsNullOrWhiteSpace(request.Sha256))
                    throw new MonitorScopeConflictException("Review the import before replacing configuration.");
                var saved = await repository.CommitImportAsync(await Upload(context.Request, token), request, token);
                return Results.Ok(new { count = saved.Devices.Count, configuration = saved });
            }));
        app.MapPost("/api/config/versions/{id}/preview", (string id, ConfigurationVersionRequest request, HttpContext context, JsonDeviceRepository repository, CancellationToken token) =>
            Guard(context, async () => Results.Ok((await repository.PreviewConfigurationVersionAsync(id, request, token)).Metadata)));
        app.MapPost("/api/config/versions/{id}/download", (string id, ConfigurationVersionRequest request, HttpContext context, JsonDeviceRepository repository, CancellationToken token) =>
            Guard(context, async () => Results.File((await repository.PreviewConfigurationVersionAsync(id, request, token)).Bytes, "application/json", "NetWatch-configuration-version.json")));
        app.MapPost("/api/config/versions/{id}/restore", (string id, ConfigurationVersionRequest request, HttpContext context, JsonDeviceRepository repository, CancellationToken token) =>
            Guard(context, async () => Results.Ok(new { configuration = await repository.RestoreConfigurationVersionAsync(id, request, token) })));
        app.MapPost("/api/config/versions/{id}/delete", (string id, ConfigurationVersionRequest request, HttpContext context, JsonDeviceRepository repository, CancellationToken token) =>
            Guard(context, async () => { await repository.DeleteConfigurationVersionAsync(id, request, token); return Results.Ok(new { deleted = true }); }));
    }
}
