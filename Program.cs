using NetWatch.Services;
using NetWatch.Models;
using System.Text.Json.Serialization;

var builder = WebApplication.CreateBuilder(args);

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

var app = builder.Build();

app.UseDefaultFiles();
app.UseStaticFiles();

// Load config.json at startup so configuration errors are visible immediately.
var repository = app.Services.GetRequiredService<JsonDeviceRepository>();
await repository.ReloadAsync();

// Returns the normalized devices currently loaded from config.json.
app.MapGet("/api/devices", async (JsonDeviceRepository deviceRepository) =>
{
    var devices = await deviceRepository.GetDevicesAsync();
    return Results.Ok(devices);
});

// Reloads config.json from disk without restarting the application.
app.MapPost("/api/reload", async (JsonDeviceRepository deviceRepository) =>
{
    var configuration = await deviceRepository.ReloadAsync();
    return Results.Ok(new
    {
        count = configuration.Devices.Count,
        enabledCount = configuration.Devices.Count(device => device.Enabled),
        settings = configuration.Settings,
        reloadedAt = DateTimeOffset.Now
    });
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

// Backwards-compatible endpoint that forces a fresh full check and returns the monitor payload.
app.MapGet("/api/results", async (MonitorExecutionService executionService) =>
{
    return Results.Ok(await executionService.RunFullCheckAsync());
});

// Starts a full monitoring execution immediately and rejects overlapping runs with HTTP 409.
app.MapPost("/api/monitor/run", async (MonitorExecutionService executionService) =>
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
});

app.MapFallbackToFile("index.html");

app.Run();
