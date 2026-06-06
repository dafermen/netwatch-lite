using System.Text.Json;
using System.Text.Json.Serialization;
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
        WriteIndented = true,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
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
    public async Task<MonitorConfiguration> ReloadAsync(CancellationToken cancellationToken = default)
    {
        await _reloadLock.WaitAsync(cancellationToken);

        try
        {
            var filePath = ResolveDeviceFilePath();

            if (!File.Exists(filePath))
            {
                var starterConfiguration = CreateStarterConfiguration();
                await SaveNormalizedConfigurationAsync(
                    filePath,
                    Normalize(starterConfiguration),
                    createBackup: false,
                    cancellationToken);
                _configuration = Normalize(starterConfiguration);
                return _configuration;
            }

            await using var stream = File.OpenRead(filePath);
            var configuration = await JsonSerializer.DeserializeAsync<MonitorConfiguration>(
                stream,
                JsonOptions,
                cancellationToken);

            Validate(configuration);
            _configuration = Normalize(configuration);
            return _configuration;
        }
        catch (JsonException ex)
        {
            throw new InvalidDataException("config.json contains invalid JSON.", ex);
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

            var normalized = Normalize(configuration);
            await SaveNormalizedConfigurationAsync(
                ResolveDeviceFilePath(),
                normalized,
                createBackup: true,
                cancellationToken);
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

        if (File.Exists(developmentDataPath))
        {
            return developmentDataPath;
        }

        return Directory.Exists(Path.Combine(_environment.ContentRootPath, "Data"))
            ? developmentDataPath
            : contentRootPath;
    }

    /// <summary>
    /// Writes a normalized configuration to disk and optionally backs up the previous file.
    /// </summary>
    /// <param name="filePath">Absolute path to config.json.</param>
    /// <param name="configuration">Already-normalized configuration to persist.</param>
    /// <param name="createBackup">Whether to create config.backup.json when replacing an existing file.</param>
    /// <param name="cancellationToken">Token used to cancel file IO.</param>
    private static async Task SaveNormalizedConfigurationAsync(
        string filePath,
        MonitorConfiguration configuration,
        bool createBackup,
        CancellationToken cancellationToken)
    {
        var directory = Path.GetDirectoryName(filePath);

        if (!string.IsNullOrWhiteSpace(directory))
        {
            Directory.CreateDirectory(directory);
        }

        if (createBackup && File.Exists(filePath))
        {
            var backupPath = Path.Combine(
                directory ?? string.Empty,
                $"{Path.GetFileNameWithoutExtension(filePath)}.backup{Path.GetExtension(filePath)}");
            File.Copy(filePath, backupPath, true);
        }

        await using var stream = File.Create(filePath);
        await JsonSerializer.SerializeAsync(stream, configuration, JsonOptions, cancellationToken);
    }

    /// <summary>
    /// Creates a minimal first-run configuration so new installations can run a successful local check.
    /// </summary>
    /// <returns>A monitor configuration with one enabled localhost ping device.</returns>
    private static MonitorConfiguration CreateStarterConfiguration()
    {
        return new MonitorConfiguration
        {
            Settings = new MonitorSettings
            {
                IntervalSeconds = 60,
                TimeoutMs = 1000,
                MaxParallelChecks = 50
            },
            Devices =
            [
                new Device
                {
                    Name = "Localhost",
                    Ip = "127.0.0.1",
                    Hostname = "localhost",
                    UseHostnameForPing = false,
                    Category = "Getting Started",
                    Enabled = true,
                    Checks =
                    [
                        new DeviceCheck
                        {
                            Type = "ping"
                        }
                    ]
                }
            ]
        };
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

        var legacyUseHostnameForPing = configuration.Settings?.UseHostnameForPing ?? false;
        var devices = configuration.Devices
            .Where(IsValidDevice)
            .Select(device => new Device
            {
                Name = device.Name,
                Ip = device.Ip,
                Hostname = NormalizeOptionalText(device.Hostname),
                UseHostnameForPing = device.UseHostnameForPing ?? legacyUseHostnameForPing,
                WebsiteUrl = NormalizeOptionalText(device.WebsiteUrl),
                Category = NormalizeCategory(device.Category),
                Enabled = device.Enabled,
                Checks = (device.Checks ?? [])
                    .Where(IsValidCheck)
                    .ToList()
            })
            .ToList();

        return new MonitorConfiguration
        {
            Settings = NormalizeSettings(configuration.Settings),
            Devices = devices
        };
    }

    /// <summary>
    /// Serializes the current normalized configuration for download.
    /// </summary>
    /// <param name="cancellationToken">Token used to cancel serialization.</param>
    /// <returns>Indented JSON bytes containing the current monitor configuration.</returns>
    public Task<byte[]> ExportAsync(CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        return Task.FromResult(JsonSerializer.SerializeToUtf8Bytes(_configuration, JsonOptions));
    }

    /// <summary>
    /// Imports a complete monitor configuration from JSON, validates it, saves it, and reloads memory.
    /// </summary>
    /// <param name="jsonStream">Readable stream containing a monitor configuration JSON document.</param>
    /// <param name="cancellationToken">Token used to cancel JSON parsing and save operations.</param>
    /// <returns>The normalized configuration after it has been saved and loaded into memory.</returns>
    /// <exception cref="InvalidDataException">Thrown when JSON is malformed or the configuration is invalid.</exception>
    public async Task<MonitorConfiguration> ImportAsync(
        Stream jsonStream,
        CancellationToken cancellationToken = default)
    {
        try
        {
            var configuration = await JsonSerializer.DeserializeAsync<MonitorConfiguration>(
                jsonStream,
                JsonOptions,
                cancellationToken);

            if (configuration is null)
            {
                throw new InvalidDataException("Imported file does not contain a configuration object.");
            }

            return await SaveAsync(configuration, cancellationToken);
        }
        catch (JsonException ex)
        {
            throw new InvalidDataException("Imported file contains invalid JSON.", ex);
        }
    }

    /// <summary>
    /// Normalizes current global settings while dropping legacy ping mode from saved configuration.
    /// </summary>
    /// <param name="settings">Settings parsed from JSON or submitted by the UI.</param>
    /// <returns>Settings containing only current global execution options.</returns>
    private static MonitorSettings NormalizeSettings(MonitorSettings? settings)
    {
        if (settings is null)
        {
            return new MonitorSettings();
        }

        return new MonitorSettings
        {
            IntervalSeconds = settings.IntervalSeconds,
            TimeoutMs = settings.TimeoutMs,
            MaxParallelChecks = settings.MaxParallelChecks
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

        if (configuration.Devices is null)
        {
            throw new InvalidDataException("devices is required.");
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

            if (!IsValidWebsiteUrl(device.WebsiteUrl))
            {
                throw new InvalidDataException($"Device '{device.Name}' has an invalid websiteUrl. Use an absolute http:// or https:// URL.");
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
    /// Determines whether an optional dashboard website URL is empty or an absolute HTTP/HTTPS URL.
    /// </summary>
    /// <param name="websiteUrl">Optional URL submitted by the configuration UI.</param>
    /// <returns>True when the URL can be safely opened by the browser dashboard.</returns>
    private static bool IsValidWebsiteUrl(string? websiteUrl)
    {
        if (string.IsNullOrWhiteSpace(websiteUrl))
        {
            return true;
        }

        return Uri.TryCreate(websiteUrl.Trim(), UriKind.Absolute, out var uri)
            && (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps);
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
