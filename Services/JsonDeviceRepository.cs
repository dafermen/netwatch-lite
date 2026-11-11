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
    private readonly LocalDataStore _storage;
    private readonly JsonRegionProfileRepository _profileRepository;
    private readonly SemaphoreSlim _reloadLock = new(1, 1);
    private MonitorConfiguration _configuration = new();
    private string? _loadedProfileId;

    /// <summary>
    /// Initializes a repository that resolves the configured JSON file relative to the application content root.
    /// </summary>
    /// <param name="environment">ASP.NET Core hosting environment used to resolve relative file paths.</param>
    /// <param name="options">Network monitor options bound from appsettings.json.</param>
    /// <param name="profileRepository">Repository that resolves the active region profile JSON file.</param>
    /// <param name="storage">Shared JSON/SQLite persistence adapter; JSON when omitted by legacy callers.</param>
    public JsonDeviceRepository(
        IWebHostEnvironment environment,
        IOptions<NetworkMonitorOptions> options,
        JsonRegionProfileRepository profileRepository,
        LocalDataStore? storage = null)
    {
        _environment = environment;
        _options = options.Value;
        _storage = storage ?? new LocalDataStore(environment, Options.Create(new StorageOptions { Provider = "json" }));
        _profileRepository = profileRepository;
    }

    /// <summary>
    /// Returns the normalized device inventory currently loaded in memory.
    /// </summary>
    /// <returns>A read-only list of devices loaded from the active support group JSON.</returns>
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
    /// Reloads the active support group JSON from disk, validates supported fields, and replaces the in-memory configuration atomically.
    /// </summary>
    /// <param name="cancellationToken">Token used to cancel the file read or JSON parse operation.</param>
    /// <returns>The normalized configuration loaded from disk.</returns>
    public async Task<MonitorConfiguration> ReloadAsync(CancellationToken cancellationToken = default)
    {
        await _reloadLock.WaitAsync(cancellationToken);

        try
        {
            var profile = await _profileRepository.GetActiveProfileAsync(cancellationToken);
            var filePath = _profileRepository.ResolveProfileDeviceFilePath(profile.File);
            var activeProfile = (Region: profile.Region, SupportGroup: profile.Name);

            if (!_storage.Exists(filePath))
            {
                var starterConfiguration = CreateStarterConfiguration();
                await SaveNormalizedConfigurationAsync(
                    filePath,
                    Normalize(starterConfiguration, activeProfile.Region, activeProfile.SupportGroup),
                    createBackup: false,
                    cancellationToken);
                _configuration = Normalize(starterConfiguration, activeProfile.Region, activeProfile.SupportGroup);
                _loadedProfileId = profile.Id;
                return _configuration;
            }

            await using var stream = _storage.OpenRead(filePath);
            var configuration = await JsonSerializer.DeserializeAsync<MonitorConfiguration>(
                stream,
                JsonOptions,
                cancellationToken);

            Validate(configuration);
            _configuration = Normalize(configuration, activeProfile.Region, activeProfile.SupportGroup);
            _loadedProfileId = profile.Id;
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
    /// <param name="expectedProfileId">Optional client profile precondition; older clients may omit it.</param>
    /// <returns>The normalized configuration after it has been saved and loaded into memory.</returns>
    /// <exception cref="InvalidDataException">Thrown when the submitted configuration is not valid.</exception>
    public async Task<MonitorConfiguration> SaveAsync(
        MonitorConfiguration configuration,
        CancellationToken cancellationToken = default,
        string? expectedProfileId = null)
    {
        await _reloadLock.WaitAsync(cancellationToken);

        try
        {
            Validate(configuration);

            var profile = await _profileRepository.GetActiveProfileAsync(cancellationToken);
            AssertProfile(profile, expectedProfileId);
            var activeProfile = (Region: profile.Region, SupportGroup: profile.Name);
            var normalized = Normalize(configuration, activeProfile.Region, activeProfile.SupportGroup);
            await SaveNormalizedConfigurationAsync(
                _profileRepository.ResolveProfileDeviceFilePath(profile.File),
                normalized,
                createBackup: true,
                cancellationToken);
            _configuration = normalized;
            _loadedProfileId = profile.Id;
            return _configuration;
        }
        finally
        {
            _reloadLock.Release();
        }
    }

    /// <summary>
    /// Updates one device in the active support group configuration and persists the JSON file.
    /// </summary>
    /// <param name="deviceIndex">Zero-based device index in the active configuration.</param>
    /// <param name="device">Replacement device submitted by the UI.</param>
    /// <param name="cancellationToken">Token used to cancel file operations.</param>
    /// <param name="expectedProfileId">Optional client profile precondition.</param>
    /// <returns>The normalized configuration after the row update is saved.</returns>
    public async Task<MonitorConfiguration> UpdateDeviceAsync(
        int deviceIndex,
        Device device,
        CancellationToken cancellationToken = default,
        string? expectedProfileId = null)
    {
        await _reloadLock.WaitAsync(cancellationToken);

        try
        {
            var profile = await _profileRepository.GetActiveProfileAsync(cancellationToken);
            AssertProfile(profile, expectedProfileId);
            if (deviceIndex < 0 || deviceIndex >= _configuration.Devices.Count)
            {
                throw new InvalidDataException("Device was not found in the active configuration.");
            }

            var devices = _configuration.Devices.ToList();
            devices[deviceIndex] = device;

            var candidate = new MonitorConfiguration
            {
                Settings = _configuration.Settings,
                DeviceTypes = _configuration.DeviceTypes,
                PeripheralCatalog = _configuration.PeripheralCatalog,
                Devices = devices
            };

            Validate(candidate);

            var activeProfile = (Region: profile.Region, SupportGroup: profile.Name);
            var normalized = Normalize(candidate, activeProfile.Region, activeProfile.SupportGroup);
            await SaveNormalizedConfigurationAsync(
                _profileRepository.ResolveProfileDeviceFilePath(profile.File),
                normalized,
                createBackup: true,
                cancellationToken);
            _configuration = normalized;
            _loadedProfileId = profile.Id;
            return _configuration;
        }
        finally
        {
            _reloadLock.Release();
        }
    }

    /// <summary>Returns a fresh, consistent catalog snapshot for the active profile.</summary>
    public async Task<DeviceTypeCatalogSnapshot> GetDeviceTypeCatalogAsync(CancellationToken cancellationToken = default)
    {
        await _reloadLock.WaitAsync(cancellationToken);
        try
        {
            var (profile, _, configuration) = await ReadDeviceTypeConfigurationAsync(cancellationToken);
            _configuration = configuration;
            _loadedProfileId = profile.Id;
            return DeviceTypeRules.Snapshot(profile, configuration);
        }
        finally { _reloadLock.Release(); }
    }

    /// <summary>Updates only the type catalog against fresh inventory with stale-editor protection.</summary>
    public async Task<DeviceTypeCatalogSnapshot> UpdateDeviceTypeCatalogAsync(
        UpdateDeviceTypesRequest request, CancellationToken cancellationToken = default)
    {
        await _reloadLock.WaitAsync(cancellationToken);
        try
        {
            var (profile, filePath, current) = await ReadDeviceTypeConfigurationAsync(cancellationToken);
            var snapshot = DeviceTypeRules.Snapshot(profile, current);
            if (request.ProfileId != snapshot.ProfileId || request.Version != snapshot.Version)
                throw new DeviceTypeConflictException("The active support group or type catalog changed. Reload Device Types before saving.");

            var candidate = new MonitorConfiguration
            {
                DeviceTypes = request.DeviceTypes,
                Settings = current.Settings,
                PeripheralCatalog = current.PeripheralCatalog,
                Devices = current.Devices
            };
            Validate(candidate);
            var normalized = Normalize(candidate, profile.Region, profile.Name);
            // Use the captured profile path, never resolve a possibly switched profile for this write.
            await SaveNormalizedConfigurationAsync(filePath, normalized, createBackup: true, cancellationToken);
            _configuration = normalized;
            _loadedProfileId = profile.Id;
            return DeviceTypeRules.Snapshot(profile, normalized);
        }
        finally { _reloadLock.Release(); }
    }

    private async Task<(RegionProfile Profile, string FilePath, MonitorConfiguration Configuration)> ReadDeviceTypeConfigurationAsync(
        CancellationToken cancellationToken)
    {
        var profile = await _profileRepository.GetActiveProfileAsync(cancellationToken);
        var filePath = _profileRepository.ResolveProfileDeviceFilePath(profile.File);
        try
        {
            await using var stream = _storage.OpenRead(filePath);
            var configuration = await JsonSerializer.DeserializeAsync<MonitorConfiguration>(stream, JsonOptions, cancellationToken);
            Validate(configuration);
            return (profile, filePath, Normalize(configuration, profile.Region, profile.Name));
        }
        catch (JsonException ex) { throw new InvalidDataException("config.json contains invalid JSON.", ex); }
    }

    /// <summary>
    /// Resolves the configured JSON path to an absolute filesystem path.
    /// </summary>
    /// <returns>Absolute path to config.json.</returns>
    private async Task<string> ResolveDeviceFilePathAsync(CancellationToken cancellationToken)
    {
        var activeProfilePath = await _profileRepository.GetActiveDeviceFilePathAsync(cancellationToken);

        if (!string.IsNullOrWhiteSpace(activeProfilePath))
        {
            return activeProfilePath;
        }

        if (Path.IsPathRooted(_options.DeviceFilePath))
        {
            return _options.DeviceFilePath;
        }

        var contentRootPath = Path.Combine(_environment.ContentRootPath, _options.DeviceFilePath);

        if (_storage.Exists(contentRootPath))
        {
            return contentRootPath;
        }

        var developmentDataPath = Path.Combine(_environment.ContentRootPath, "Data", _options.DeviceFilePath);

        if (_storage.Exists(developmentDataPath))
        {
            return developmentDataPath;
        }

        return Directory.Exists(Path.Combine(_environment.ContentRootPath, "Data"))
            ? developmentDataPath
            : contentRootPath;
    }

    private async Task<(string Region, string SupportGroup)> ResolveActiveProfileAsync(CancellationToken cancellationToken)
    {
        var profile = await _profileRepository.GetActiveProfileAsync(cancellationToken);
        var supportGroup = string.IsNullOrWhiteSpace(profile.Name) ? "Unassigned" : profile.Name;
        var region = string.IsNullOrWhiteSpace(profile.Region) ? "Sample Region" : profile.Region;
        return (region, supportGroup);
    }

    /// <summary>
    /// Writes a normalized configuration to disk and optionally backs up the previous file.
    /// </summary>
    /// <param name="filePath">Absolute path to config.json.</param>
    /// <param name="configuration">Already-normalized configuration to persist.</param>
    /// <param name="createBackup">Whether to create config.backup.json when replacing an existing file.</param>
    /// <param name="cancellationToken">Token used to cancel file IO.</param>
    private async Task SaveNormalizedConfigurationAsync(
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

        await _storage.WriteJsonAsync(filePath, configuration, JsonOptions, cancellationToken, createBackup);
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
                MaxParallelChecks = 50,
                RetryCount = 0,
                RetryDelayMs = 250
            },
            Devices =
            [
                new Device
                {
                    Name = "Localhost",
                    Ip = "127.0.0.1",
                    Hostname = "localhost",
                    UseHostnameForPing = false,
                    Region = "Local",
                    SupportGroup = "Local",
                    Facility = "Local",
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
    /// <param name="defaultRegion">Region label to assign when legacy devices do not include a region field.</param>
    /// <param name="defaultSupportGroup">Support group label to assign when legacy devices do not include a support group field.</param>
    /// <returns>A configuration with valid devices, normalized categories, and supported checks only.</returns>
    private static MonitorConfiguration Normalize(
        MonitorConfiguration? configuration,
        string defaultRegion = "Sample Region",
        string defaultSupportGroup = "Unassigned")
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
                DeviceType = string.IsNullOrWhiteSpace(device.DeviceType) ? "unspecified" : PeripheralInventoryRules.Token(device.DeviceType),
                WorkstationPeripherals = PeripheralInventoryRules.Normalize(device.WorkstationPeripherals),
                Name = device.Name,
                Ip = device.Ip,
                Hostname = NormalizeOptionalText(device.Hostname),
                UseHostnameForPing = device.UseHostnameForPing ?? legacyUseHostnameForPing,
                WebsiteUrl = NormalizeOptionalText(device.WebsiteUrl),
                Command = NormalizeOptionalText(device.Command),
                Location = NormalizeOptionalText(device.Location),
                Notes = NormalizeOptionalText(device.Notes),
                Region = NormalizeRegion(device.Region, defaultRegion, defaultSupportGroup),
                SupportGroup = NormalizeFacility(defaultSupportGroup),
                Facility = NormalizeFacility(device.Facility),
                Category = NormalizeCategory(device.Category),
                Enabled = device.Enabled,
                Checks = (device.Checks ?? [])
                    .Where(IsValidCheck)
                    .Select(check => string.Equals(check.Type, "http", StringComparison.OrdinalIgnoreCase)
                        ? new DeviceCheck
                        {
                            Type = "http", Url = check.Url!.Trim(),
                            TimeoutMs = check.TimeoutMs ?? HttpCheckService.DefaultTimeoutMs,
                            ExpectedStatusCode = check.ExpectedStatusCode ?? 200,
                            ExpectedText = string.IsNullOrEmpty(check.ExpectedText) ? null : check.ExpectedText
                        } : check)
                    .ToList()
            })
            .ToList();

        return new MonitorConfiguration
        {
            Settings = NormalizeSettings(configuration.Settings),
            DeviceTypes = DeviceTypeRules.Normalize(configuration.DeviceTypes),
            PeripheralCatalog = PeripheralInventoryRules.NormalizeCatalog(configuration.PeripheralCatalog),
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
    /// <param name="expectedProfileId">Optional client profile precondition.</param>
    /// <returns>The normalized configuration after it has been saved and loaded into memory.</returns>
    /// <exception cref="InvalidDataException">Thrown when JSON is malformed or the configuration is invalid.</exception>
    public async Task<MonitorConfiguration> ImportAsync(
        Stream jsonStream,
        CancellationToken cancellationToken = default,
        string? expectedProfileId = null)
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

            return await SaveAsync(configuration, cancellationToken, expectedProfileId);
        }
        catch (JsonException ex)
        {
            throw new InvalidDataException("Imported file contains invalid JSON.", ex);
        }
    }

    private void AssertProfile(RegionProfile profile, string? expectedProfileId)
    {
        if ((!string.IsNullOrWhiteSpace(expectedProfileId) && !string.Equals(expectedProfileId, profile.Id, StringComparison.OrdinalIgnoreCase))
            || (_loadedProfileId is not null && !string.Equals(_loadedProfileId, profile.Id, StringComparison.OrdinalIgnoreCase)))
            throw new ConfigurationConflictException();
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
            MaxParallelChecks = settings.MaxParallelChecks,
            RetryCount = settings.RetryCount,
            RetryDelayMs = settings.RetryDelayMs
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

        DeviceTypeRules.Validate(configuration);
        PeripheralInventoryRules.Validate(configuration);

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

        if (configuration.Settings.RetryCount < 0 || configuration.Settings.RetryCount > 5)
        {
            throw new InvalidDataException("retryCount must be between 0 and 5.");
        }

        if (configuration.Settings.RetryDelayMs < 0 || configuration.Settings.RetryDelayMs > 10000)
        {
            throw new InvalidDataException("retryDelayMs must be between 0 and 10000.");
        }

        for (var deviceIndex = 0; deviceIndex < configuration.Devices.Count; deviceIndex++)
        {
            var device = configuration.Devices[deviceIndex];

            if (device is null)
            {
                throw new InvalidDataException($"Device #{deviceIndex + 1} must not be null.");
            }

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

            if (device.Command is { } command && (command.Length > 4096
                || command.Any(character => char.IsControl(character) || character is '\u2028' or '\u2029')))
            {
                throw new InvalidDataException("Command must be a single line of at most 4096 characters without control characters.");
            }

            if (device.Location is { } location && (location.Length > 200
                || location.Any(character => char.IsControl(character) || character is '\u2028' or '\u2029')))
            {
                throw new InvalidDataException("Location must be a single line of at most 200 characters without control characters.");
            }

            if (device.Notes is { } notes && (notes.Length > 2000
                || notes.Any(character => char.IsControl(character) && character is not ('\r' or '\n' or '\t'))))
            {
                throw new InvalidDataException("Notes must be at most 2000 characters; only line breaks and tabs are allowed as control characters.");
            }

            foreach (var check in device.Checks)
            {
                if (check is null)
                {
                    throw new InvalidDataException($"Device '{device.Name}' contains a null check.");
                }

                if (!IsValidCheck(check))
                {
                    var detail = string.Equals(check.Type, "http", StringComparison.OrdinalIgnoreCase)
                        ? HttpCheckService.ValidationError(check)
                        : "Use ping, TCP with a port between 1 and 65535, or HTTP/HTTPS with a URL.";
                    throw new InvalidDataException($"Device '{device.Name}' has an invalid check. {detail}");
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

        if (string.Equals(check.Type, "http", StringComparison.OrdinalIgnoreCase))
        {
            return HttpCheckService.ValidationError(check) is null;
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
    /// Converts missing or whitespace facility values into a stable fallback site name.
    /// </summary>
    /// <param name="facility">Facility value from JSON.</param>
    /// <returns>A trimmed facility or Unassigned when no value was supplied.</returns>
    private static string NormalizeFacility(string? facility)
    {
        return string.IsNullOrWhiteSpace(facility)
            ? "Unassigned"
            : facility.Trim();
    }

    /// <summary>
    /// Converts missing or whitespace region values into a stable fallback group name.
    /// </summary>
    /// <param name="region">Region value from JSON.</param>
    /// <param name="defaultRegion">Fallback region supplied by the active profile.</param>
    /// <param name="defaultSupportGroup">Fallback support group supplied by the active profile.</param>
    /// <returns>A trimmed region or Unassigned when no value was supplied.</returns>
    private static string NormalizeRegion(string? region, string defaultRegion, string defaultSupportGroup)
    {
        return string.IsNullOrWhiteSpace(region)
            || string.Equals(region.Trim(), "Unassigned", StringComparison.OrdinalIgnoreCase)
            || string.Equals(region.Trim(), defaultSupportGroup, StringComparison.OrdinalIgnoreCase)
            ? NormalizeFacility(defaultRegion)
            : region.Trim();
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
