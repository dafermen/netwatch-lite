using NetWatch.Services;
using NetWatch.Models;
using System.Text.Json;
using System.Text.Json.Serialization;

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
builder.Services.AddSingleton<JsonDeviceRepository>();
builder.Services.AddSingleton<NetworkMonitorService>();
builder.Services.AddSingleton<MonitorExecutionService>();
builder.Services.AddSingleton<WallboardConfigService>();

var app = builder.Build();

app.UseDefaultFiles();
app.UseStaticFiles();

// Load config.json at startup so configuration errors are visible immediately.
var repository = app.Services.GetRequiredService<JsonDeviceRepository>();
var wallboardConfigService = app.Services.GetRequiredService<WallboardConfigService>();
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

await wallboardConfigService.ReloadAsync();

// Serves the NOC-style iframe wallboard directly so /wallboard works without relying on browser redirects.
app.MapGet("/wallboard", ReadWallboardHtmlAsync);
app.MapGet("/wallboard/", ReadWallboardHtmlAsync);

static async Task<IResult> ReadWallboardHtmlAsync(
    IWebHostEnvironment environment,
    CancellationToken cancellationToken)
{
    var filePath = Path.Combine(environment.WebRootPath, "wallboard.html");

    if (!File.Exists(filePath))
    {
        return Results.NotFound("wallboard.html was not found.");
    }

    var html = await File.ReadAllTextAsync(filePath, cancellationToken);
    return Results.Content(html, "text/html");
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
    catch (Exception ex) when (
        ex is InvalidDataException
            or FileNotFoundException
            or IOException
            or UnauthorizedAccessException)
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
    return Results.Ok(await deviceRepository.GetConfigurationAsync());
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
});

// Returns the full wallboard configuration used by /wallboard.
app.MapGet("/api/wallboard/config", async (WallboardConfigService service) =>
{
    return Results.Ok(await service.GetConfigurationAsync());
});

// Reloads wallboard.json from disk without restarting the application.
app.MapPost("/api/wallboard/reload", async (WallboardConfigService service) =>
{
    var configuration = await service.ReloadAsync();

    return Results.Ok(new
    {
        reloadedAt = DateTimeOffset.Now,
        panelCount = configuration.Panels.Count,
        configuration
    });
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

    var started = await executionService.TryStreamFullCheckAsync(
        WriteEventAsync,
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
});

app.MapFallbackToFile("index.html");

app.Run();
