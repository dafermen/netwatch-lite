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
builder.Services.AddSingleton<JsonRegionProfileRepository>();
builder.Services.AddSingleton<JsonDeviceRepository>();
builder.Services.AddSingleton<JsonThemeRepository>();
builder.Services.AddSingleton<NetworkMonitorService>();
builder.Services.AddSingleton<MonitorExecutionService>();

var app = builder.Build();

app.UseDefaultFiles();
app.UseStaticFiles();

// Load config.json at startup so configuration errors are visible immediately.
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
    app.Logger.LogError(ex, "Unable to load config.json at startup. The configuration page can still be used to repair it.");
}

// Returns the normalized devices currently loaded from config.json.
app.MapGet("/api/devices", async (JsonDeviceRepository deviceRepository) =>
{
    var devices = await deviceRepository.GetDevicesAsync();
    return Results.Ok(devices);
});

// Reloads config.json from disk without restarting the application.
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

// Saves the full monitor configuration to config.json, creates config.backup.json, and reloads memory.
app.MapPost("/api/config", async (
    MonitorConfiguration configuration,
    JsonDeviceRepository deviceRepository) =>
{
    try
    {
        var saved = await deviceRepository.SaveAsync(configuration);

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
    CancellationToken cancellationToken) =>
{
    try
    {
        var saved = await deviceRepository.UpdateDeviceAsync(deviceIndex, device, cancellationToken);

        return Results.Ok(new
        {
            savedAt = DateTimeOffset.Now,
            deviceIndex,
            device = saved.Devices[deviceIndex],
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
            title: "Unable to save device.",
            detail: ex.Message,
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
        var imported = await deviceRepository.ImportAsync(stream, cancellationToken);

        return Results.Ok(new
        {
            importedAt = DateTimeOffset.Now,
            count = imported.Devices.Count,
            enabledCount = imported.Devices.Count(device => device.Enabled),
            configuration = imported
        });
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
app.MapGet("/api/results", async (MonitorExecutionService executionService) =>
{
    try
    {
        return Results.Ok(await executionService.RunFullCheckAsync());
    }
    catch (Exception ex)
    {
        return Results.Problem(
            title: "Monitoring execution failed.",
            detail: ex.Message,
            statusCode: StatusCodes.Status500InternalServerError);
    }
});

// Starts a full monitoring execution immediately and rejects overlapping runs with HTTP 409.
app.MapPost("/api/monitor/run", async (MonitorExecutionService executionService) =>
{
    try
    {
        var response = await executionService.TryRunFullCheckAsync();

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
        var started = await executionService.TryStreamFullCheckAsync(
            WriteEventAsync,
            facilityName,
            categoryName,
            deviceName,
            deviceIps,
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
        await WriteErrorEventAsync(ex);
    }
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
