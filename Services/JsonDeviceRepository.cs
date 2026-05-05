using System.Text.Json;
using Microsoft.Extensions.Options;
using NetWatch.Models;

namespace NetWatch.Services;

/// <summary>
/// Loads, validates, normalizes, and caches the editable JSON monitoring configuration.
/// </summary>
public sealed class JsonDeviceRepository
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        ReadCommentHandling = JsonCommentHandling.Skip,
        AllowTrailingCommas = true
    };

    private readonly IWebHostEnvironment _environment;
    private readonly NetworkMonitorOptions _options;
    private readonly SemaphoreSlim _reloadLock = new(1, 1);
    private MonitorConfiguration _configuration = new();

    /// <summary>
    /// Initializes a repository that resolves the configured JSON file relative to the application content root.
    /// </summary>
    /// <param name="environment">ASP.NET Core hosting environment used to resolve relative file paths.</param>
    /// <param name="options">Network monitor options bound from appsettings.json.</param>
    public JsonDeviceRepository(
        IWebHostEnvironment environment,
        IOptions<NetworkMonitorOptions> options)
    {
        _environment = environment;
        _options = options.Value;
    }

    /// <summary>
    /// Returns the normalized device inventory currently loaded in memory.
    /// </summary>
    /// <returns>A read-only list of devices loaded from devices.json.</returns>
    public Task<IReadOnlyList<Device>> GetDevicesAsync()
    {
        return Task.FromResult<IReadOnlyList<Device>>(_configuration.Devices);
    }

    /// <summary>
    /// Returns the complete normalized monitor configuration currently loaded in memory.
    /// </summary>
    /// <returns>The cached monitor configuration including settings and devices.</returns>
    public Task<MonitorConfiguration> GetConfigurationAsync()
    {
        return Task.FromResult(_configuration);
    }

    /// <summary>
    /// Reloads devices.json from disk, validates supported fields, and replaces the in-memory configuration atomically.
    /// </summary>
    /// <param name="cancellationToken">Token used to cancel the file read or JSON parse operation.</param>
    /// <returns>The normalized configuration loaded from disk.</returns>
    /// <exception cref="FileNotFoundException">Thrown when the configured JSON file cannot be found.</exception>
    public async Task<MonitorConfiguration> ReloadAsync(CancellationToken cancellationToken = default)
    {
        await _reloadLock.WaitAsync(cancellationToken);

        try
        {
            var filePath = ResolveDeviceFilePath();

            if (!File.Exists(filePath))
            {
                throw new FileNotFoundException("Device JSON file was not found.", filePath);
            }

            await using var stream = File.OpenRead(filePath);
            var configuration = await JsonSerializer.DeserializeAsync<MonitorConfiguration>(
                stream,
                JsonOptions,
                cancellationToken);

            _configuration = Normalize(configuration);
            return _configuration;
        }
        finally
        {
            _reloadLock.Release();
        }
    }

    /// <summary>
    /// Resolves the configured JSON path to an absolute filesystem path.
    /// </summary>
    /// <returns>Absolute path to devices.json.</returns>
    private string ResolveDeviceFilePath()
    {
        if (Path.IsPathRooted(_options.DeviceFilePath))
        {
            return _options.DeviceFilePath;
        }

        return Path.Combine(_environment.ContentRootPath, _options.DeviceFilePath);
    }

    /// <summary>
    /// Determines whether a device contains the minimum fields required to be monitored.
    /// </summary>
    /// <param name="device">Device object parsed from JSON.</param>
    /// <returns>True when name and IP are present; otherwise false.</returns>
    private static bool IsValidDevice(Device device)
    {
        return !string.IsNullOrWhiteSpace(device.Name)
            && !string.IsNullOrWhiteSpace(device.Ip);
    }

    /// <summary>
    /// Cleans and filters a parsed configuration so downstream services receive predictable data.
    /// </summary>
    /// <param name="configuration">Configuration parsed from JSON, or null when deserialization produced no object.</param>
    /// <returns>A configuration with valid devices, normalized categories, and supported checks only.</returns>
    private static MonitorConfiguration Normalize(MonitorConfiguration? configuration)
    {
        if (configuration is null)
        {
            return new MonitorConfiguration();
        }

        var devices = configuration.Devices
            .Where(IsValidDevice)
            .Select(device => new Device
            {
                Name = device.Name,
                Ip = device.Ip,
                Category = NormalizeCategory(device.Category),
                Enabled = device.Enabled,
                Checks = device.Checks
                    .Where(IsValidCheck)
                    .ToList()
            })
            .ToList();

        return new MonitorConfiguration
        {
            Settings = configuration.Settings,
            Devices = devices
        };
    }

    /// <summary>
    /// Determines whether a check declaration is supported by the monitor engine.
    /// </summary>
    /// <param name="check">Check object parsed from JSON.</param>
    /// <returns>True for ping checks and tcp checks with a valid port from 1 to 65535.</returns>
    private static bool IsValidCheck(DeviceCheck check)
    {
        if (string.Equals(check.Type, "ping", StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        return string.Equals(check.Type, "tcp", StringComparison.OrdinalIgnoreCase)
            && check.Port is > 0 and <= 65535;
    }

    /// <summary>
    /// Converts missing or whitespace category values into a stable fallback group name.
    /// </summary>
    /// <param name="category">Category value from JSON.</param>
    /// <returns>A trimmed category or Uncategorized when no value was supplied.</returns>
    private static string NormalizeCategory(string? category)
    {
        return string.IsNullOrWhiteSpace(category)
            ? "Uncategorized"
            : category.Trim();
    }
}
