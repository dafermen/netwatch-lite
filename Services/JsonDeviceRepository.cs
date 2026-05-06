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
        AllowTrailingCommas = true,
        WriteIndented = true
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
    /// <returns>A read-only list of devices loaded from config.json.</returns>
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
    /// Reloads config.json from disk, validates supported fields, and replaces the in-memory configuration atomically.
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
    /// Saves a complete monitor configuration to disk, backs up the previous file, and reloads memory.
    /// </summary>
    /// <param name="configuration">Configuration object received from the configuration UI.</param>
    /// <param name="cancellationToken">Token used to cancel file operations.</param>
    /// <returns>The normalized configuration after it has been saved and loaded into memory.</returns>
    /// <exception cref="InvalidDataException">Thrown when the submitted configuration is not valid.</exception>
    public async Task<MonitorConfiguration> SaveAsync(
        MonitorConfiguration configuration,
        CancellationToken cancellationToken = default)
    {
        await _reloadLock.WaitAsync(cancellationToken);

        try
        {
            Validate(configuration);

            var filePath = ResolveDeviceFilePath();
            var directory = Path.GetDirectoryName(filePath);

            if (!string.IsNullOrWhiteSpace(directory))
            {
                Directory.CreateDirectory(directory);
            }

            if (File.Exists(filePath))
            {
                var backupPath = Path.Combine(
                    directory ?? string.Empty,
                    $"{Path.GetFileNameWithoutExtension(filePath)}.backup{Path.GetExtension(filePath)}");
                File.Copy(filePath, backupPath, true);
            }

            var normalized = Normalize(configuration);
            await using var stream = File.Create(filePath);
            await JsonSerializer.SerializeAsync(stream, normalized, JsonOptions, cancellationToken);

            _configuration = normalized;
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
    /// <returns>Absolute path to config.json.</returns>
    private string ResolveDeviceFilePath()
    {
        if (Path.IsPathRooted(_options.DeviceFilePath))
        {
            return _options.DeviceFilePath;
        }

        var contentRootPath = Path.Combine(_environment.ContentRootPath, _options.DeviceFilePath);

        if (File.Exists(contentRootPath))
        {
            return contentRootPath;
        }

        var developmentDataPath = Path.Combine(_environment.ContentRootPath, "Data", _options.DeviceFilePath);

        return File.Exists(developmentDataPath)
            ? developmentDataPath
            : contentRootPath;
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
                Hostname = NormalizeOptionalText(device.Hostname),
                Category = NormalizeCategory(device.Category),
                Enabled = device.Enabled,
                Checks = (device.Checks ?? [])
                    .Where(IsValidCheck)
                    .ToList()
            })
            .ToList();

        return new MonitorConfiguration
        {
            Settings = configuration.Settings ?? new MonitorSettings(),
            Devices = devices
        };
    }

    /// <summary>
    /// Validates submitted configuration before writing it to disk.
    /// </summary>
    /// <param name="configuration">Configuration submitted by the CRUD UI.</param>
    /// <exception cref="InvalidDataException">Thrown when required fields or checks are invalid.</exception>
    private static void Validate(MonitorConfiguration? configuration)
    {
        if (configuration is null)
        {
            throw new InvalidDataException("Configuration body is required.");
        }

        if (configuration.Settings is null)
        {
            throw new InvalidDataException("settings is required.");
        }

        if (configuration.Settings.IntervalSeconds <= 0)
        {
            throw new InvalidDataException("intervalSeconds must be greater than zero.");
        }

        if (configuration.Settings.TimeoutMs <= 0)
        {
            throw new InvalidDataException("timeoutMs must be greater than zero.");
        }

        if (configuration.Settings.MaxParallelChecks <= 0)
        {
            throw new InvalidDataException("maxParallelChecks must be greater than zero.");
        }

        for (var deviceIndex = 0; deviceIndex < configuration.Devices.Count; deviceIndex++)
        {
            var device = configuration.Devices[deviceIndex];

            if (string.IsNullOrWhiteSpace(device.Name))
            {
                throw new InvalidDataException($"Device #{deviceIndex + 1} requires a name.");
            }

            if (string.IsNullOrWhiteSpace(device.Ip))
            {
                throw new InvalidDataException($"Device '{device.Name}' requires an address.");
            }

            if (device.Checks is null || device.Checks.Count == 0)
            {
                throw new InvalidDataException($"Device '{device.Name}' requires at least one check.");
            }

            foreach (var check in device.Checks)
            {
                if (!IsValidCheck(check))
                {
                    throw new InvalidDataException($"Device '{device.Name}' has an invalid check.");
                }
            }
        }
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

    /// <summary>
    /// Converts optional text fields to null when no usable value was supplied.
    /// </summary>
    /// <param name="value">Raw optional value from JSON or the configuration UI.</param>
    /// <returns>A trimmed string, or null when the value is empty.</returns>
    private static string? NormalizeOptionalText(string? value)
    {
        return string.IsNullOrWhiteSpace(value)
            ? null
            : value.Trim();
    }
}
