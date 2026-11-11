using NetWatch.Services;
using NetWatch.Models;
using System.Text.Json;
using System.Text.Json.Serialization;

const long MaxConfigImportBytes = 5 * 1024 * 1024;

var builder = WebApplication.CreateBuilder(args);

var streamJsonOptions = new JsonSerializerOptions(JsonSerializerDefaults.Web);
streamJsonOptions.Converters.Add(new JsonStringEnumConverter());

// Serialize enums as readable strings so the UI receives "Healthy", "Degraded", and "Down".
builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.Converters.Add(new JsonStringEnumConverter());
});

// Register configuration and singleton services. Singletons keep the loaded JSON in memory.
builder.Services.Configure<NetworkMonitorOptions>(
    builder.Configuration.GetSection(NetworkMonitorOptions.SectionName));
builder.Services.Configure<StorageOptions>(builder.Configuration.GetSection("Storage"));
builder.Services.AddSingleton<LocalDataStore>();
builder.Services.AddSingleton<StorageOperations>();
builder.Services.AddSingleton<SqliteQueries>();
builder.Services.AddHostedService<StorageBackupWorker>();
builder.Services.AddSingleton<RuntimeDataLease>();
builder.Services.AddSingleton<JsonRegionProfileRepository>();
builder.Services.AddSingleton<JsonDeviceRepository>();
builder.Services.AddSingleton<JsonThemeRepository>();
builder.Services.AddSingleton<JsonMonitorHistoryRepository>();
builder.Services.AddSingleton<JsonAppErrorLogRepository>();
builder.Services.AddSingleton<JsonIntegrationRepository>();
builder.Services.AddHttpClient(HttpCheckService.ClientName, client =>
{
    client.Timeout = Timeout.InfiniteTimeSpan;
}).ConfigurePrimaryHttpMessageHandler(HttpCheckService.CreateHandler)
  .RemoveAllLoggers();
builder.Services.AddSingleton<HttpCheckService>();
builder.Services.AddSingleton<NetworkMonitorService>();
builder.Services.AddSingleton<MonitorExecutionService>();

await using var app = builder.Build();
_ = app.Services.GetRequiredService<RuntimeDataLease>();
var storageAction = builder.Configuration["StorageAction"];
if (!string.IsNullOrWhiteSpace(storageAction))
{
    var storageOptions = builder.Configuration.GetSection("Storage").Get<StorageOptions>() ?? new StorageOptions();
    var database = StorageMaintenance.DatabasePath(app.Environment.ContentRootPath, storageOptions);
    var destination = builder.Configuration["StorageDestination"];
    switch (storageAction.ToLowerInvariant())
    {
        case "migrate-json":
            var result = await StorageMaintenance.MigrateAsync(app.Environment.ContentRootPath, storageOptions,
                builder.Configuration.GetSection(NetworkMonitorOptions.SectionName).Get<NetworkMonitorOptions>() ?? new());
            Console.WriteLine(JsonSerializer.Serialize(result));
            break;
        case "verify":
            Console.WriteLine(JsonSerializer.Serialize(new { documents = StorageMaintenance.Verify(database), integrity = "ok" }));
            break;
        case "export-json":
            destination ??= Path.Combine(app.Environment.ContentRootPath, "storage-exports", Guid.NewGuid().ToString("N"));
            Console.WriteLine(JsonSerializer.Serialize(new { documents = await StorageMaintenance.ExportAsync(database, destination), destination }));
            break;
        case "backup":
            destination ??= Path.Combine(app.Environment.ContentRootPath, "storage-backups", Guid.NewGuid().ToString("N") + ".db");
            Directory.CreateDirectory(Path.GetDirectoryName(Path.GetFullPath(destination))!);
            app.Services.GetRequiredService<LocalDataStore>().Backup(destination);
            Console.WriteLine(JsonSerializer.Serialize(new { destination, integrity = StorageMaintenance.Verify(destination) }));
            break;
        case "restore-backup":
            var source = builder.Configuration["StorageSource"] ?? throw new InvalidDataException("StorageSource is required.");
            destination ??= Path.Combine(app.Environment.ContentRootPath,"storage-restores",Guid.NewGuid().ToString("N"));
            StorageMaintenance.Restore(source,destination);
            Console.WriteLine(JsonSerializer.Serialize(new { destination,verified=true }));
            break;
        case "snapshot-readonly":
            var snapshotSource = builder.Configuration["StorageSource"] ?? throw new InvalidDataException("StorageSource is required.");
            destination ??= Path.Combine(app.Environment.ContentRootPath,"storage-backups",Guid.NewGuid().ToString("N")+".db");
            StorageMaintenance.SnapshotReadOnly(snapshotSource,destination);
            Console.WriteLine(JsonSerializer.Serialize(new { destination,verified=true }));
            break;
        default: throw new InvalidDataException("Unknown StorageAction. Use migrate-json, verify, backup, restore-backup or export-json.");
    }
    return;
}

app.UseDefaultFiles();
app.UseStaticFiles();

var documentationPath = Path.Combine(app.Environment.ContentRootPath, "docs");

app.Use(async (context, next) =>
{
    try
    {
        await next();
    }
    catch (OperationCanceledException) when (context.RequestAborted.IsCancellationRequested)
    {
        app.Logger.LogDebug("Request {TraceId} was cancelled by the client.", context.TraceIdentifier);
    }
    catch (Exception ex)
    {
        app.Logger.LogError(ex, "Unhandled application error {TraceId}.", context.TraceIdentifier);

        try
        {
            var errorRepository = context.RequestServices.GetRequiredService<JsonAppErrorLogRepository>();
            await errorRepository.AppendAsync(ex, "UnhandledExceptionMiddleware", context, StatusCodes.Status500InternalServerError, context.RequestAborted);
        }
        catch (Exception logException)
        {
            app.Logger.LogError(logException, "Unable to write app-errors.json.");
        }

        if (context.Response.HasStarted)
        {
            throw;
        }

        context.Response.Clear();
        await Results.Problem(
            title: "An unexpected application error occurred.",
            statusCode: StatusCodes.Status500InternalServerError,
            extensions: new Dictionary<string, object?> { ["traceId"] = context.TraceIdentifier })
            .ExecuteAsync(context);
    }
});

// Load the active support group JSON at startup so configuration errors are visible immediately.
var repository = app.Services.GetRequiredService<JsonDeviceRepository>();
try
{
    await repository.ReloadAsync();
}
catch (Exception ex) when (
    ex is InvalidDataException
        or FileNotFoundException
        or IOException
        or UnauthorizedAccessException)
{
    app.Logger.LogError(ex, "Unable to load the active support group JSON at startup. The configuration page can still be used to repair it.");
}

// Returns the normalized devices currently loaded from the active support group JSON.
app.MapGet("/api/devices", async (JsonDeviceRepository deviceRepository) =>
{
    var devices = await deviceRepository.GetDevicesAsync();
    return Results.Ok(devices);
});

app.MapGet("/api/storage", (LocalDataStore storage) => Results.Ok(new
{
    provider = storage.Provider, schemaVersion = storage.IsSqlite ? LocalDataStore.CurrentSchemaVersion : (int?)null, engineVersion = storage.EngineVersion
}));
app.MapStorageEndpoints();

// Reloads the active support group JSON from disk without restarting the application.
app.MapPost("/api/reload", async (JsonDeviceRepository deviceRepository) =>
{
    try
    {
        var configuration = await deviceRepository.ReloadAsync();
        return Results.Ok(new
        {
            count = configuration.Devices.Count,
            enabledCount = configuration.Devices.Count(device => device.Enabled),
            settings = configuration.Settings,
            reloadedAt = DateTimeOffset.Now
        });
    }
    catch (Exception ex) when (IsConfigurationReadException(ex))
    {
        return Results.BadRequest(new
        {
            error = ex.Message
        });
    }
});

// Returns the full editable monitor configuration used by the configuration page.
app.MapGet("/api/config", async (JsonDeviceRepository deviceRepository) =>
{
    try
    {
        return Results.Ok(await deviceRepository.GetConfigurationAsync());
    }
    catch (Exception ex) when (IsConfigurationReadException(ex))
    {
        return Results.BadRequest(new
        {
            error = ex.Message
        });
    }
});

// Saves the full monitor configuration to the active support group JSON, creates a sibling backup, and reloads memory.
app.MapPost("/api/config", async (
    MonitorConfiguration configuration,
    JsonDeviceRepository deviceRepository,
    HttpRequest request) =>
{
    try
    {
        var saved = await deviceRepository.SaveAsync(configuration, expectedProfileId: request.Headers["X-NetWatch-Profile"].ToString());

        return Results.Ok(new
        {
            savedAt = DateTimeOffset.Now,
            configuration = saved
        });
    }
    catch (ConfigurationConflictException ex)
    {
        return Results.Conflict(new { error = ex.Message });
    }
    catch (InvalidDataException ex)
    {
        return Results.BadRequest(new
        {
            error = ex.Message
        });
    }
    catch (Exception ex) when (IsConfigurationWriteException(ex))
    {
        return Results.Problem(
            title: "Unable to save configuration.",
            detail: ex.Message,
            statusCode: StatusCodes.Status500InternalServerError);
    }
});

// Saves one device row in the active support group JSON for bulk-edit workflows.
app.MapPost("/api/config/devices/{deviceIndex:int}", async (
    int deviceIndex,
    Device device,
    JsonDeviceRepository deviceRepository,
    HttpRequest request,
    CancellationToken cancellationToken) =>
{
    try
    {
        var saved = await deviceRepository.UpdateDeviceAsync(deviceIndex, device, cancellationToken, request.Headers["X-NetWatch-Profile"].ToString());

        return Results.Ok(new
        {
            savedAt = DateTimeOffset.Now,
            deviceIndex,
            device = saved.Devices[deviceIndex],
            configuration = saved
        });
    }
    catch (ConfigurationConflictException ex)
    {
        return Results.Conflict(new { error = ex.Message });
    }
    catch (InvalidDataException ex)
    {
        return Results.BadRequest(new
        {
            error = ex.Message
        });
    }
    catch (Exception ex) when (IsConfigurationWriteException(ex))
    {
        return Results.Problem(
            title: "Unable to save device.",
            detail: ex.Message,
            statusCode: StatusCodes.Status500InternalServerError);
    }
});

// Reads/edits classifications without posting an old copy of the device inventory.
app.MapGet("/api/device-types", async (JsonDeviceRepository deviceRepository, CancellationToken cancellationToken) =>
{
    try
    {
        return Results.Ok(await deviceRepository.GetDeviceTypeCatalogAsync(cancellationToken));
    }
    catch (Exception ex) when (IsConfigurationReadException(ex))
    {
        return Results.BadRequest(new { error = ex.Message });
    }
});

app.MapPost("/api/device-types", async (
    UpdateDeviceTypesRequest request, JsonDeviceRepository deviceRepository, CancellationToken cancellationToken) =>
{
    try
    {
        return Results.Ok(await deviceRepository.UpdateDeviceTypeCatalogAsync(request, cancellationToken));
    }
    catch (DeviceTypeConflictException ex)
    {
        return Results.Conflict(new { error = ex.Message });
    }
    catch (InvalidDataException ex)
    {
        return Results.BadRequest(new { error = ex.Message });
    }
    catch (Exception ex) when (IsConfigurationWriteException(ex) || IsConfigurationReadException(ex))
    {
        return Results.Problem(title: "Unable to save device types.", detail: ex.Message,
            statusCode: StatusCodes.Status500InternalServerError);
    }
});

// Downloads the current normalized monitor configuration as a JSON file.
app.MapGet("/api/config/export", async (
    JsonDeviceRepository deviceRepository,
    CancellationToken cancellationToken) =>
{
    try
    {
        var bytes = await deviceRepository.ExportAsync(cancellationToken);
        var fileName = $"netwatch-lite-config-{DateTimeOffset.Now:yyyyMMdd-HHmmss}.json";
        return Results.File(bytes, "application/json", fileName);
    }
    catch (Exception ex) when (IsConfigurationReadException(ex))
    {
        return Results.BadRequest(new
        {
            error = ex.Message
        });
    }
});

// Imports a JSON configuration file, validates it, backs up the current file, and reloads memory.
app.MapPost("/api/config/import", async (
    HttpRequest request,
    JsonDeviceRepository deviceRepository,
    CancellationToken cancellationToken) =>
{
    try
    {
        if (!request.HasFormContentType)
        {
            return Results.BadRequest(new
            {
                error = "Import requires multipart form data with a configFile upload."
            });
        }

        var form = await request.ReadFormAsync(cancellationToken);
        var file = form.Files["configFile"];

        if (file is null)
        {
            return Results.BadRequest(new
            {
                error = "Choose a JSON configuration file to import."
            });
        }

        if (file.Length == 0)
        {
            return Results.BadRequest(new
            {
                error = "Imported file is empty."
            });
        }

        if (file.Length > MaxConfigImportBytes)
        {
            return Results.BadRequest(new
            {
                error = "Imported file is too large. Maximum size is 5 MB."
            });
        }

        if (!string.Equals(Path.GetExtension(file.FileName), ".json", StringComparison.OrdinalIgnoreCase))
        {
            return Results.BadRequest(new
            {
                error = "Imported file must use the .json extension."
            });
        }

        await using var stream = file.OpenReadStream();
        var imported = await deviceRepository.ImportAsync(stream, cancellationToken, request.Headers["X-NetWatch-Profile"].ToString());

        return Results.Ok(new
        {
            importedAt = DateTimeOffset.Now,
            count = imported.Devices.Count,
            enabledCount = imported.Devices.Count(device => device.Enabled),
            configuration = imported
        });
    }
    catch (ConfigurationConflictException ex)
    {
        return Results.Conflict(new { error = ex.Message });
    }
    catch (InvalidDataException ex)
    {
        return Results.BadRequest(new
        {
            error = ex.Message
        });
    }
    catch (IOException ex)
    {
        return Results.Problem(
            title: "Configuration import failed",
            detail: ex.Message,
            statusCode: StatusCodes.Status500InternalServerError);
    }
    catch (UnauthorizedAccessException ex)
    {
        return Results.Problem(
            title: "Configuration import failed",
            detail: ex.Message,
            statusCode: StatusCodes.Status500InternalServerError);
    }
});

// Returns the editable UI theme templates and active theme selection.
app.MapGet("/api/themes", async (
    JsonThemeRepository themeRepository,
    CancellationToken cancellationToken) =>
{
    try
    {
        return Results.Ok(await themeRepository.GetConfigurationAsync(cancellationToken));
    }
    catch (Exception ex) when (IsConfigurationReadException(ex))
    {
        return Results.BadRequest(new
        {
            error = ex.Message
        });
    }
});

// Saves UI theme templates to themes.json.
app.MapPost("/api/themes", async (
    ThemeConfiguration configuration,
    JsonThemeRepository themeRepository,
    CancellationToken cancellationToken) =>
{
    try
    {
        var saved = await themeRepository.SaveAsync(configuration, cancellationToken);

        return Results.Ok(new
        {
            savedAt = DateTimeOffset.Now,
            configuration = saved
        });
    }
    catch (InvalidDataException ex)
    {
        return Results.BadRequest(new
        {
            error = ex.Message
        });
    }
    catch (Exception ex) when (IsConfigurationWriteException(ex))
    {
        return Results.Problem(
            title: "Unable to save themes.",
            detail: ex.Message,
            statusCode: StatusCodes.Status500InternalServerError);
    }
});

// Resets UI theme templates to the built-in default.
app.MapPost("/api/themes/reset", async (
    JsonThemeRepository themeRepository,
    CancellationToken cancellationToken) =>
{
    try
    {
        return Results.Ok(new
        {
            resetAt = DateTimeOffset.Now,
            configuration = await themeRepository.ResetAsync(cancellationToken)
        });
    }
    catch (Exception ex) when (IsConfigurationWriteException(ex))
    {
        return Results.Problem(
            title: "Unable to reset themes.",
            detail: ex.Message,
            statusCode: StatusCodes.Status500InternalServerError);
    }
});

// Returns locally stored monitoring history for reporting and analysis.
app.MapGet("/api/history", async (
    JsonMonitorHistoryRepository historyRepository,
    CancellationToken cancellationToken) =>
{
    try
    {
        return Results.Ok(await historyRepository.GetAsync(cancellationToken));
    }
    catch (Exception ex) when (IsConfigurationReadException(ex))
    {
        return Results.BadRequest(new
        {
            error = ex.Message
        });
    }
});

// Clears local monitoring history. Intended for local maintenance and demo resets.
app.MapPost("/api/history/clear", async (
    JsonMonitorHistoryRepository historyRepository,
    CancellationToken cancellationToken) =>
{
    try
    {
        return Results.Ok(await historyRepository.ClearAsync(cancellationToken));
    }
    catch (Exception ex) when (IsConfigurationWriteException(ex))
    {
        return Results.Problem(
            title: "Unable to clear monitor history.",
            detail: ex.Message,
            statusCode: StatusCodes.Status500InternalServerError);
    }
});

// Deletes one locally stored monitoring execution by run id.
app.MapDelete("/api/history/runs/{runId}", async (
    string runId,
    JsonMonitorHistoryRepository historyRepository,
    CancellationToken cancellationToken) =>
{
    try
    {
        return Results.Ok(await historyRepository.DeleteRunAsync(runId, cancellationToken));
    }
    catch (InvalidDataException ex)
    {
        return Results.BadRequest(new
        {
            error = ex.Message
        });
    }
    catch (KeyNotFoundException ex)
    {
        return Results.NotFound(new
        {
            error = ex.Message
        });
    }
    catch (Exception ex) when (IsConfigurationWriteException(ex))
    {
        return Results.Problem(
            title: "Unable to delete monitor history run.",
            detail: ex.Message,
            statusCode: StatusCodes.Status500InternalServerError);
    }
});

// Returns locally stored application errors for troubleshooting.
app.MapGet("/api/errors", async (
    JsonAppErrorLogRepository errorRepository,
    CancellationToken cancellationToken) =>
{
    try
    {
        return Results.Ok(await errorRepository.GetAsync(cancellationToken));
    }
    catch (Exception ex) when (IsConfigurationReadException(ex))
    {
        return Results.BadRequest(new
        {
            error = ex.Message
        });
    }
});

// Clears local application errors. Intended for local maintenance and demo resets.
app.MapPost("/api/errors/clear", async (
    JsonAppErrorLogRepository errorRepository,
    CancellationToken cancellationToken) =>
{
    try
    {
        return Results.Ok(await errorRepository.ClearAsync(cancellationToken));
    }
    catch (Exception ex) when (IsConfigurationWriteException(ex))
    {
        return Results.Problem(
            title: "Unable to clear application errors.",
            detail: ex.Message,
            statusCode: StatusCodes.Status500InternalServerError);
    }
});

// Returns external integration settings for future inventory imports and report exports.
app.MapGet("/api/integrations", async (
    JsonIntegrationRepository integrationRepository,
    CancellationToken cancellationToken) =>
{
    try
    {
        return Results.Ok(await integrationRepository.GetAsync(cancellationToken));
    }
    catch (Exception ex) when (IsConfigurationReadException(ex))
    {
        return Results.BadRequest(new
        {
            error = ex.Message
        });
    }
});

// Saves integration settings locally. External calls are intentionally not executed by this endpoint.
app.MapPost("/api/integrations", async (
    IntegrationConfiguration configuration,
    JsonIntegrationRepository integrationRepository,
    CancellationToken cancellationToken) =>
{
    try
    {
        var saved = await integrationRepository.SaveAsync(configuration, cancellationToken);

        return Results.Ok(new
        {
            savedAt = DateTimeOffset.Now,
            configuration = saved
        });
    }
    catch (InvalidDataException ex)
    {
        return Results.BadRequest(new
        {
            error = ex.Message
        });
    }
    catch (Exception ex) when (IsConfigurationWriteException(ex))
    {
        return Results.Problem(
            title: "Unable to save integrations.",
            detail: ex.Message,
            statusCode: StatusCodes.Status500InternalServerError);
    }
});

// Returns the available region profiles and the active monitor configuration selection.
app.MapGet("/api/regions", async (
    JsonRegionProfileRepository profileRepository,
    CancellationToken cancellationToken) =>
{
    try
    {
        return Results.Ok(await profileRepository.GetConfigurationAsync(cancellationToken));
    }
    catch (Exception ex) when (IsConfigurationReadException(ex))
    {
        return Results.BadRequest(new
        {
            error = ex.Message
        });
    }
});

// Creates a new independent region profile and makes it active.
app.MapPost("/api/regions", async (
    CreateRegionProfileRequest request,
    JsonRegionProfileRepository profileRepository,
    JsonDeviceRepository deviceRepository,
    CancellationToken cancellationToken) =>
{
    try
    {
        var configuration = await profileRepository.CreateAsync(request, cancellationToken);
        await deviceRepository.ReloadAsync(cancellationToken);

        return Results.Ok(new
        {
            savedAt = DateTimeOffset.Now,
            configuration
        });
    }
    catch (InvalidDataException ex)
    {
        return Results.BadRequest(new
        {
            error = ex.Message
        });
    }
    catch (Exception ex) when (IsConfigurationWriteException(ex))
    {
        return Results.Problem(
            title: "Unable to create region profile.",
            detail: ex.Message,
            statusCode: StatusCodes.Status500InternalServerError);
    }
});

// Activates an existing region profile.
app.MapPost("/api/regions/{profileId}/activate", async (
    string profileId,
    JsonRegionProfileRepository profileRepository,
    JsonDeviceRepository deviceRepository,
    CancellationToken cancellationToken) =>
{
    try
    {
        var configuration = await profileRepository.SetActiveAsync(profileId, cancellationToken);
        var monitorConfiguration = await deviceRepository.ReloadAsync(cancellationToken);

        return Results.Ok(new
        {
            savedAt = DateTimeOffset.Now,
            count = monitorConfiguration.Devices.Count,
            enabledCount = monitorConfiguration.Devices.Count(device => device.Enabled),
            configuration
        });
    }
    catch (InvalidDataException ex)
    {
        return Results.BadRequest(new
        {
            error = ex.Message
        });
    }
    catch (Exception ex) when (IsConfigurationWriteException(ex) || IsConfigurationReadException(ex))
    {
        return Results.Problem(
            title: "Unable to activate region profile.",
            detail: ex.Message,
            statusCode: StatusCodes.Status500InternalServerError);
    }
});

// Duplicates an existing region profile and makes the copy active.
app.MapPost("/api/regions/{profileId}/duplicate", async (
    string profileId,
    JsonRegionProfileRepository profileRepository,
    JsonDeviceRepository deviceRepository,
    CancellationToken cancellationToken) =>
{
    try
    {
        var configuration = await profileRepository.DuplicateAsync(profileId, cancellationToken);
        await deviceRepository.ReloadAsync(cancellationToken);

        return Results.Ok(new
        {
            savedAt = DateTimeOffset.Now,
            configuration
        });
    }
    catch (InvalidDataException ex)
    {
        return Results.BadRequest(new
        {
            error = ex.Message
        });
    }
    catch (Exception ex) when (IsConfigurationWriteException(ex) || IsConfigurationReadException(ex))
    {
        return Results.Problem(
            title: "Unable to duplicate region profile.",
            detail: ex.Message,
            statusCode: StatusCodes.Status500InternalServerError);
    }
});

// Renames a region profile and updates its display region.
app.MapPost("/api/regions/{profileId}", async (
    string profileId,
    RenameRegionProfileRequest request,
    JsonRegionProfileRepository profileRepository,
    CancellationToken cancellationToken) =>
{
    try
    {
        var configuration = await profileRepository.RenameAsync(profileId, request, cancellationToken);

        return Results.Ok(new
        {
            savedAt = DateTimeOffset.Now,
            configuration
        });
    }
    catch (InvalidDataException ex)
    {
        return Results.BadRequest(new
        {
            error = ex.Message
        });
    }
    catch (Exception ex) when (IsConfigurationWriteException(ex))
    {
        return Results.Problem(
            title: "Unable to rename region profile.",
            detail: ex.Message,
            statusCode: StatusCodes.Status500InternalServerError);
    }
});

// Deletes one region profile and keeps the remaining profiles intact.
app.MapDelete("/api/regions/{profileId}", async (
    string profileId,
    JsonRegionProfileRepository profileRepository,
    JsonDeviceRepository deviceRepository,
    CancellationToken cancellationToken) =>
{
    try
    {
        var configuration = await profileRepository.DeleteAsync(profileId, cancellationToken);
        await deviceRepository.ReloadAsync(cancellationToken);

        return Results.Ok(new
        {
            deletedAt = DateTimeOffset.Now,
            configuration
        });
    }
    catch (InvalidDataException ex)
    {
        return Results.BadRequest(new
        {
            error = ex.Message
        });
    }
    catch (Exception ex) when (IsConfigurationWriteException(ex) || IsConfigurationReadException(ex))
    {
        return Results.Problem(
            title: "Unable to delete region profile.",
            detail: ex.Message,
            statusCode: StatusCodes.Status500InternalServerError);
    }
});

// Backwards-compatible endpoint that forces a fresh full check and returns the monitor payload.
app.MapGet("/api/results", async (
    HttpContext context,
    MonitorExecutionService executionService,
    JsonAppErrorLogRepository errorRepository) =>
{
    try
    {
        return Results.Ok(await executionService.RunFullCheckAsync());
    }
    catch (Exception ex)
    {
        await errorRepository.AppendAsync(ex, "GET /api/results", context, StatusCodes.Status500InternalServerError, context.RequestAborted);

        return Results.Problem(
            title: "Monitoring execution failed.",
            detail: ex.Message,
            statusCode: StatusCodes.Status500InternalServerError);
    }
});

// Starts a monitoring execution immediately and rejects overlapping runs with HTTP 409.
app.MapPost("/api/monitor/run", async (
    HttpContext context,
    MonitorExecutionService executionService,
    JsonAppErrorLogRepository errorRepository) =>
{
    try
    {
        var checkMode = context.Request.Query["checkMode"].FirstOrDefault();
        var response = await executionService.TryRunFullCheckAsync(checkMode ?? NetworkMonitorService.FullCheckMode);

        if (response is null)
        {
            return Results.Conflict(new
            {
                executionStatus = "Running",
                message = "A monitoring execution is already in progress."
            });
        }

        return Results.Ok(response);
    }
    catch (Exception ex)
    {
        await errorRepository.AppendAsync(ex, "POST /api/monitor/run", context, StatusCodes.Status500InternalServerError, context.RequestAborted);

        return Results.Problem(
            title: "Monitoring execution failed.",
            detail: ex.Message,
            statusCode: StatusCodes.Status500InternalServerError);
    }
});

// Streams a full monitoring execution so the dashboard can render devices as soon as each one finishes.
app.MapGet("/api/monitor/stream", async (
    HttpContext context,
    MonitorExecutionService executionService) =>
{
    context.Response.Headers.CacheControl = "no-cache";
    context.Response.Headers.Connection = "keep-alive";
    context.Response.ContentType = "text/event-stream";

    async Task WriteEventAsync(MonitorStreamEvent streamEvent, CancellationToken cancellationToken)
    {
        var json = JsonSerializer.Serialize(streamEvent, streamJsonOptions);
        await context.Response.WriteAsync($"event: {streamEvent.Type}\n", cancellationToken);
        await context.Response.WriteAsync($"data: {json}\n\n", cancellationToken);
        await context.Response.Body.FlushAsync(cancellationToken);
    }

    async Task WriteErrorEventAsync(Exception exception)
    {
        try
        {
            await WriteEventAsync(new MonitorStreamEvent
            {
                Type = "error",
                TotalDevices = 0,
                CompletedDevices = 0,
                Timestamp = DateTimeOffset.Now,
                ExecutionStatus = "Failed",
                Message = exception.Message
            }, context.RequestAborted);
        }
        catch (Exception writeException) when (
            writeException is OperationCanceledException
                or IOException
                or ObjectDisposedException)
        {
            app.Logger.LogDebug(writeException, "Unable to send monitoring error event because the client disconnected.");
        }
    }

    try
    {
        var facilityName = context.Request.Query["facility"].FirstOrDefault();
        var categoryName = context.Request.Query["category"].FirstOrDefault();
        var deviceName = context.Request.Query["deviceName"].FirstOrDefault();
        var deviceIps = context.Request.Query["deviceIp"]
            .Where(value => !string.IsNullOrWhiteSpace(value))
            .Select(value => value!)
            .ToList();
        var checkMode = context.Request.Query["checkMode"].FirstOrDefault()
            ?? NetworkMonitorService.FullCheckMode;
        var started = await executionService.TryStreamFullCheckAsync(
            WriteEventAsync,
            facilityName,
            categoryName,
            deviceName,
            deviceIps,
            checkMode,
            context.RequestAborted);

        if (!started)
        {
            await WriteEventAsync(new MonitorStreamEvent
            {
                Type = "busy",
                TotalDevices = 0,
                CompletedDevices = 0,
                Timestamp = DateTimeOffset.Now,
                ExecutionStatus = "Running",
                Message = "A monitoring execution is already in progress."
            }, context.RequestAborted);
        }
    }
    catch (OperationCanceledException ex) when (context.RequestAborted.IsCancellationRequested)
    {
        app.Logger.LogDebug(ex, "Monitoring stream client disconnected.");
    }
    catch (Exception ex)
    {
        app.Logger.LogError(ex, "Monitoring stream failed.");
        var errorRepository = context.RequestServices.GetRequiredService<JsonAppErrorLogRepository>();
        await errorRepository.AppendAsync(ex, "GET /api/monitor/stream", context, StatusCodes.Status500InternalServerError, context.RequestAborted);
        await WriteErrorEventAsync(ex);
    }
});

app.MapGet("/docs/{**documentationFile}", (HttpContext context, string? documentationFile) =>
{
    if (string.IsNullOrWhiteSpace(documentationFile)
        && !context.Request.Path.Value!.EndsWith('/'))
    {
        return Results.Redirect("/docs/");
    }

    return GetDocumentationFile(documentationPath, documentationFile);
});

app.MapFallbackToFile("index.html");

app.Run();

static bool IsConfigurationReadException(Exception exception)
{
    return exception is InvalidDataException
        or FileNotFoundException
        or IOException
        or UnauthorizedAccessException;
}

static bool IsConfigurationWriteException(Exception exception)
{
    return exception is IOException
        or UnauthorizedAccessException
        or OperationCanceledException;
}

static IResult GetDocumentationFile(string documentationRoot, string? requestedFile)
{
    var rootPath = Path.GetFullPath(documentationRoot);
    var relativePath = string.IsNullOrWhiteSpace(requestedFile)
        ? "index.html"
        : requestedFile.TrimStart('/', '\\');
    var filePath = Path.GetFullPath(Path.Combine(rootPath, relativePath));
    var rootPrefix = rootPath.TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar)
        + Path.DirectorySeparatorChar;

    if (!filePath.StartsWith(rootPrefix, StringComparison.OrdinalIgnoreCase)
        || !File.Exists(filePath))
    {
        return Results.NotFound();
    }

    var contentType = Path.GetExtension(filePath).ToLowerInvariant() switch
    {
        ".html" => "text/html; charset=utf-8",
        ".css" => "text/css; charset=utf-8",
        ".js" => "text/javascript; charset=utf-8",
        ".md" => "text/markdown; charset=utf-8",
        ".png" => "image/png",
        ".jpg" or ".jpeg" => "image/jpeg",
        ".gif" => "image/gif",
        ".svg" => "image/svg+xml",
        ".webp" => "image/webp",
        _ => null
    };

    return contentType is null
        ? Results.NotFound()
        : Results.File(filePath, contentType, enableRangeProcessing: true);
}

/// <summary>
/// Exposes the Minimal API entry point to isolated ASP.NET Core test hosts.
/// </summary>
public partial class Program;
