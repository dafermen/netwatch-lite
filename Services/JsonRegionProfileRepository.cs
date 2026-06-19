using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Options;
using NetWatch.Models;

namespace NetWatch.Services;

/// <summary>
/// Manages independent region/profile JSON files and the active monitor configuration selection.
/// </summary>
public sealed class JsonRegionProfileRepository
{
    private const string DefaultRegionName = "Sample Region";
    private const string DefaultSupportGroupName = "Support Team A";

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
    private readonly SemaphoreSlim _profileLock = new(1, 1);
    private RegionProfileConfiguration? _configuration;

    /// <summary>
    /// Initializes a repository that stores region profile metadata and per-region JSON files.
    /// </summary>
    /// <param name="environment">ASP.NET Core hosting environment used to resolve runtime data paths.</param>
    /// <param name="options">Network monitor options bound from appsettings.json.</param>
    public JsonRegionProfileRepository(
        IWebHostEnvironment environment,
        IOptions<NetworkMonitorOptions> options)
    {
        _environment = environment;
        _options = options.Value;
    }

    /// <summary>
    /// Returns the normalized region profile registry, creating defaults when missing.
    /// </summary>
    /// <param name="cancellationToken">Token used to cancel file operations.</param>
    /// <returns>The active profile id and available profiles.</returns>
    public async Task<RegionProfileConfiguration> GetConfigurationAsync(CancellationToken cancellationToken = default)
    {
        await _profileLock.WaitAsync(cancellationToken);

        try
        {
            return await LoadConfigurationUnsafeAsync(cancellationToken);
        }
        finally
        {
            _profileLock.Release();
        }
    }

    /// <summary>
    /// Resolves the active profile's monitor JSON file path.
    /// </summary>
    /// <param name="cancellationToken">Token used to cancel file operations.</param>
    /// <returns>Absolute file path for the active monitor configuration.</returns>
    public async Task<string> GetActiveDeviceFilePathAsync(CancellationToken cancellationToken = default)
    {
        await _profileLock.WaitAsync(cancellationToken);

        try
        {
            var configuration = await LoadConfigurationUnsafeAsync(cancellationToken);
            var profile = configuration.Profiles.First(current =>
                string.Equals(current.Id, configuration.ActiveProfileId, StringComparison.OrdinalIgnoreCase));

            return ResolveProfileDeviceFilePath(profile.File);
        }
        finally
        {
            _profileLock.Release();
        }
    }

    /// <summary>
    /// Returns the active region profile metadata.
    /// </summary>
    /// <param name="cancellationToken">Token used to cancel file operations.</param>
    /// <returns>The profile currently used by dashboard and configuration endpoints.</returns>
    public async Task<RegionProfile> GetActiveProfileAsync(CancellationToken cancellationToken = default)
    {
        await _profileLock.WaitAsync(cancellationToken);

        try
        {
            var configuration = await LoadConfigurationUnsafeAsync(cancellationToken);
            return configuration.Profiles.First(current =>
                string.Equals(current.Id, configuration.ActiveProfileId, StringComparison.OrdinalIgnoreCase));
        }
        finally
        {
            _profileLock.Release();
        }
    }

    /// <summary>
    /// Changes the active region profile.
    /// </summary>
    /// <param name="profileId">Profile id to activate.</param>
    /// <param name="cancellationToken">Token used to cancel file operations.</param>
    /// <returns>The updated profile registry.</returns>
    public async Task<RegionProfileConfiguration> SetActiveAsync(string profileId, CancellationToken cancellationToken = default)
    {
        await _profileLock.WaitAsync(cancellationToken);

        try
        {
            var configuration = await LoadConfigurationUnsafeAsync(cancellationToken);
            var profile = configuration.Profiles.FirstOrDefault(current =>
                string.Equals(current.Id, profileId, StringComparison.OrdinalIgnoreCase));

            if (profile is null)
            {
                throw new InvalidDataException("Region profile was not found.");
            }

            var updated = new RegionProfileConfiguration
            {
                ActiveProfileId = profile.Id,
                Profiles = configuration.Profiles
            };

            await SaveConfigurationUnsafeAsync(updated, cancellationToken);
            return updated;
        }
        finally
        {
            _profileLock.Release();
        }
    }

    /// <summary>
    /// Creates a new region profile and makes it active.
    /// </summary>
    /// <param name="request">Profile name, region label, and copy behavior.</param>
    /// <param name="cancellationToken">Token used to cancel file operations.</param>
    /// <returns>The updated profile registry.</returns>
    public async Task<RegionProfileConfiguration> CreateAsync(
        CreateRegionProfileRequest request,
        CancellationToken cancellationToken = default)
    {
        await _profileLock.WaitAsync(cancellationToken);

        try
        {
            var configuration = await LoadConfigurationUnsafeAsync(cancellationToken);
            var name = NormalizeRequiredText(request.Name, "Support group name");
            var region = NormalizeOptionalText(request.Region) ?? DefaultRegionName;
            var id = CreateUniqueProfileId(name, configuration.Profiles);
            var file = $"regions/{id}.json";
            var filePath = ResolveProfileDeviceFilePath(file);

            if (request.CopyFromActive)
            {
                var activeProfile = configuration.Profiles.First(current =>
                    string.Equals(current.Id, configuration.ActiveProfileId, StringComparison.OrdinalIgnoreCase));
                var activePath = ResolveProfileDeviceFilePath(activeProfile.File);
                if (File.Exists(activePath))
                {
                    Directory.CreateDirectory(Path.GetDirectoryName(filePath)!);
                    File.Copy(activePath, filePath, overwrite: false);
                }
            }

            if (!File.Exists(filePath))
            {
                Directory.CreateDirectory(Path.GetDirectoryName(filePath)!);
                await File.WriteAllTextAsync(filePath, CreateStarterConfigurationJson(region, name), cancellationToken);
            }

            configuration.Profiles.Add(new RegionProfile
            {
                Id = id,
                Name = name,
                Region = region,
                File = file
            });

            var updated = new RegionProfileConfiguration
            {
                ActiveProfileId = id,
                Profiles = SortProfiles(configuration.Profiles)
            };

            await SaveConfigurationUnsafeAsync(updated, cancellationToken);
            return updated;
        }
        finally
        {
            _profileLock.Release();
        }
    }

    /// <summary>
    /// Duplicates one region profile and makes the copy active.
    /// </summary>
    /// <param name="sourceProfileId">Profile id to copy.</param>
    /// <param name="cancellationToken">Token used to cancel file operations.</param>
    /// <returns>The updated profile registry.</returns>
    public async Task<RegionProfileConfiguration> DuplicateAsync(string sourceProfileId, CancellationToken cancellationToken = default)
    {
        await _profileLock.WaitAsync(cancellationToken);

        try
        {
            var configuration = await LoadConfigurationUnsafeAsync(cancellationToken);
            var source = configuration.Profiles.FirstOrDefault(current =>
                string.Equals(current.Id, sourceProfileId, StringComparison.OrdinalIgnoreCase));

            if (source is null)
            {
                throw new InvalidDataException("Region profile was not found.");
            }

            var name = CreateCopyProfileName(source.Name, configuration.Profiles);
            var id = CreateUniqueProfileId(name, configuration.Profiles);
            var file = $"regions/{id}.json";
            var sourcePath = ResolveProfileDeviceFilePath(source.File);
            var targetPath = ResolveProfileDeviceFilePath(file);
            Directory.CreateDirectory(Path.GetDirectoryName(targetPath)!);

            if (File.Exists(sourcePath))
            {
                File.Copy(sourcePath, targetPath, overwrite: false);
            }
            else
            {
                await File.WriteAllTextAsync(targetPath, CreateStarterConfigurationJson(source.Region, name), cancellationToken);
            }

            configuration.Profiles.Add(new RegionProfile
            {
                Id = id,
                Name = name,
                Region = source.Region,
                File = file
            });

            var updated = new RegionProfileConfiguration
            {
                ActiveProfileId = id,
                Profiles = SortProfiles(configuration.Profiles)
            };

            await SaveConfigurationUnsafeAsync(updated, cancellationToken);
            return updated;
        }
        finally
        {
            _profileLock.Release();
        }
    }

    /// <summary>
    /// Updates a region profile's display name and region label.
    /// </summary>
    /// <param name="profileId">Profile id to update.</param>
    /// <param name="request">Updated profile values.</param>
    /// <param name="cancellationToken">Token used to cancel file operations.</param>
    /// <returns>The updated profile registry.</returns>
    public async Task<RegionProfileConfiguration> RenameAsync(
        string profileId,
        RenameRegionProfileRequest request,
        CancellationToken cancellationToken = default)
    {
        await _profileLock.WaitAsync(cancellationToken);

        try
        {
            var configuration = await LoadConfigurationUnsafeAsync(cancellationToken);
            var profile = configuration.Profiles.FirstOrDefault(current =>
                string.Equals(current.Id, profileId, StringComparison.OrdinalIgnoreCase));

            if (profile is null)
            {
                throw new InvalidDataException("Region profile was not found.");
            }

            var name = NormalizeRequiredText(request.Name, "Support group name");
            var region = NormalizeOptionalText(request.Region) ?? DefaultRegionName;
            var file = profile.File;

            if (!profile.BuiltIn)
            {
                file = RenameProfileFile(profile.File, name, configuration.Profiles);
            }

            var profiles = configuration.Profiles
                .Select(current => string.Equals(current.Id, profile.Id, StringComparison.OrdinalIgnoreCase)
                    ? new RegionProfile
                    {
                        Id = current.Id,
                        Name = name,
                        Region = region,
                        File = file,
                        BuiltIn = current.BuiltIn
                    }
                    : current)
                .ToList();

            var updated = new RegionProfileConfiguration
            {
                ActiveProfileId = configuration.ActiveProfileId,
                Profiles = SortProfiles(profiles)
            };

            await SaveConfigurationUnsafeAsync(updated, cancellationToken);
            return updated;
        }
        finally
        {
            _profileLock.Release();
        }
    }

    /// <summary>
    /// Deletes one profile and archives its JSON file locally.
    /// </summary>
    /// <param name="profileId">Profile id to delete.</param>
    /// <param name="cancellationToken">Token used to cancel file operations.</param>
    /// <returns>The updated profile registry.</returns>
    public async Task<RegionProfileConfiguration> DeleteAsync(string profileId, CancellationToken cancellationToken = default)
    {
        await _profileLock.WaitAsync(cancellationToken);

        try
        {
            var configuration = await LoadConfigurationUnsafeAsync(cancellationToken);
            var profile = configuration.Profiles.FirstOrDefault(current =>
                string.Equals(current.Id, profileId, StringComparison.OrdinalIgnoreCase));

            if (profile is null)
            {
                throw new InvalidDataException("Region profile was not found.");
            }

            if (configuration.Profiles.Count == 1)
            {
                throw new InvalidDataException("At least one region profile is required.");
            }

            if (profile.BuiltIn)
            {
                throw new InvalidDataException("Built-in region profiles cannot be deleted.");
            }

            var profiles = configuration.Profiles
                .Where(current => !string.Equals(current.Id, profile.Id, StringComparison.OrdinalIgnoreCase))
                .ToList();
            var activeProfileId = string.Equals(configuration.ActiveProfileId, profile.Id, StringComparison.OrdinalIgnoreCase)
                ? profiles[0].Id
                : configuration.ActiveProfileId;

            var updated = new RegionProfileConfiguration
            {
                ActiveProfileId = activeProfileId,
                Profiles = SortProfiles(profiles)
            };

            await SaveConfigurationUnsafeAsync(updated, cancellationToken);

            var filePath = ResolveProfileDeviceFilePath(profile.File);
            if (File.Exists(filePath))
            {
                var deletedPath = Path.Combine(
                    Path.GetDirectoryName(filePath)!,
                    $"{Path.GetFileNameWithoutExtension(filePath)}.deleted-{DateTimeOffset.Now:yyyyMMddHHmmss}{Path.GetExtension(filePath)}");
                File.Move(filePath, deletedPath, overwrite: false);
            }

            return updated;
        }
        finally
        {
            _profileLock.Release();
        }
    }

    private async Task<RegionProfileConfiguration> LoadConfigurationUnsafeAsync(CancellationToken cancellationToken)
    {
        if (_configuration is not null)
        {
            return _configuration;
        }

        var filePath = ResolveProfilesFilePath();

        if (!File.Exists(filePath))
        {
            _configuration = await CreateInitialConfigurationAsync(cancellationToken);
            await SaveConfigurationUnsafeAsync(_configuration, cancellationToken);
            return _configuration;
        }

        try
        {
            var json = await File.ReadAllTextAsync(filePath, cancellationToken);
            var configuration = JsonSerializer.Deserialize<RegionProfileConfiguration>(
                json,
                JsonOptions);
            _configuration = Normalize(configuration);
            if (_configuration.Profiles.Count == 0)
            {
                _configuration = await CreateInitialConfigurationAsync(cancellationToken);
            }
            await EnsureProfileFilesAsync(_configuration, cancellationToken);
            await SaveConfigurationUnsafeAsync(_configuration, cancellationToken);
            return _configuration;
        }
        catch (JsonException ex)
        {
            throw new InvalidDataException("regions.json contains invalid JSON.", ex);
        }
    }

    private async Task<RegionProfileConfiguration> CreateInitialConfigurationAsync(CancellationToken cancellationToken)
    {
        var profiles = new List<RegionProfile>();
        var activeFile = "regions/support-team-a.json";
        var activePath = ResolveProfileDeviceFilePath(activeFile);
        var legacyPath = ResolveLegacyDeviceFilePath();

        Directory.CreateDirectory(Path.GetDirectoryName(activePath)!);

        if (File.Exists(legacyPath))
        {
            File.Copy(legacyPath, activePath, overwrite: true);
        }
        else
        {
            await File.WriteAllTextAsync(activePath, CreateStarterConfigurationJson(DefaultRegionName, DefaultSupportGroupName), cancellationToken);
        }

        profiles.Add(new RegionProfile
        {
            Id = "support-team-a",
            Name = DefaultSupportGroupName,
            Region = DefaultRegionName,
            File = activeFile
        });

        var demoFile = "regions/demo.json";
        var demoPath = ResolveProfileDeviceFilePath(demoFile);
        var samplePath = Path.Combine(ResolveDataRoot(), "config.sample.json");

        if (File.Exists(samplePath))
        {
            File.Copy(samplePath, demoPath, overwrite: true);
        }
        else
        {
            await File.WriteAllTextAsync(demoPath, CreateStarterConfigurationJson(DefaultRegionName, "Demo"), cancellationToken);
        }

        profiles.Add(new RegionProfile
        {
            Id = "demo",
            Name = "Demo",
            Region = DefaultRegionName,
            File = demoFile,
            BuiltIn = true
        });

        return new RegionProfileConfiguration
        {
            ActiveProfileId = "support-team-a",
            Profiles = SortProfiles(profiles)
        };
    }

    private async Task EnsureProfileFilesAsync(RegionProfileConfiguration configuration, CancellationToken cancellationToken)
    {
        foreach (var profile in configuration.Profiles)
        {
            var filePath = ResolveProfileDeviceFilePath(profile.File);

            if (File.Exists(filePath))
            {
                continue;
            }

            Directory.CreateDirectory(Path.GetDirectoryName(filePath)!);
            await File.WriteAllTextAsync(filePath, CreateStarterConfigurationJson(profile.Region, profile.Name), cancellationToken);
        }
    }

    private async Task SaveConfigurationUnsafeAsync(
        RegionProfileConfiguration configuration,
        CancellationToken cancellationToken)
    {
        _configuration = Normalize(configuration);
        var filePath = ResolveProfilesFilePath();
        Directory.CreateDirectory(Path.GetDirectoryName(filePath)!);
        await using var stream = File.Create(filePath);
        await JsonSerializer.SerializeAsync(stream, _configuration, JsonOptions, cancellationToken);
    }

    private string ResolveProfilesFilePath()
    {
        var profileFilePath = string.IsNullOrWhiteSpace(_options.ProfileFilePath)
            ? "regions.json"
            : _options.ProfileFilePath;

        if (Path.IsPathRooted(profileFilePath))
        {
            return profileFilePath;
        }

        return Path.Combine(ResolveDataRoot(), profileFilePath);
    }

    private string ResolveProfileDeviceFilePath(string profileFile)
    {
        var fileName = string.IsNullOrWhiteSpace(profileFile)
            ? "regions/sg1.json"
            : profileFile.Replace('\\', '/').TrimStart('/');

        if (Path.IsPathRooted(fileName))
        {
            return fileName;
        }

        return Path.GetFullPath(Path.Combine(ResolveDataRoot(), fileName));
    }

    private string ResolveLegacyDeviceFilePath()
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

        return Path.Combine(ResolveDataRoot(), _options.DeviceFilePath);
    }

    private string ResolveDataRoot()
    {
        var dataPath = Path.Combine(_environment.ContentRootPath, "Data");
        return Directory.Exists(dataPath) ? dataPath : _environment.ContentRootPath;
    }

    private static RegionProfileConfiguration Normalize(RegionProfileConfiguration? configuration)
    {
        if (configuration is null || configuration.Profiles.Count == 0)
        {
            return new RegionProfileConfiguration();
        }

        var profiles = configuration.Profiles
            .Where(profile => !string.IsNullOrWhiteSpace(profile.Id)
                && !string.IsNullOrWhiteSpace(profile.Name)
                && !string.IsNullOrWhiteSpace(profile.File))
            .GroupBy(profile => profile.Id.Trim(), StringComparer.OrdinalIgnoreCase)
            .Select(group => group.First())
            .Select(NormalizeProfile)
            .ToList();

        if (profiles.Count == 0)
        {
            return new RegionProfileConfiguration();
        }

        var activeProfileId = profiles.Any(profile =>
            string.Equals(profile.Id, configuration.ActiveProfileId, StringComparison.OrdinalIgnoreCase))
            ? configuration.ActiveProfileId.Trim()
            : profiles[0].Id;

        return new RegionProfileConfiguration
        {
            ActiveProfileId = activeProfileId,
            Profiles = SortProfiles(profiles)
        };
    }

    private static List<RegionProfile> SortProfiles(IEnumerable<RegionProfile> profiles)
    {
        return profiles
            .OrderBy(profile => profile.BuiltIn)
            .ThenBy(profile => profile.Name, StringComparer.OrdinalIgnoreCase)
            .ToList();
    }

    private static string CreateUniqueProfileId(string name, IEnumerable<RegionProfile> profiles)
    {
        var baseId = Slugify(name);
        var ids = profiles.Select(profile => profile.Id).ToHashSet(StringComparer.OrdinalIgnoreCase);
        var candidate = baseId;
        var suffix = 2;

        while (ids.Contains(candidate))
        {
            candidate = $"{baseId}-{suffix}";
            suffix += 1;
        }

        return candidate;
    }

    private static RegionProfile NormalizeProfile(RegionProfile profile)
    {
        var name = profile.Name.Trim();
        var region = NormalizeProfileRegion(profile.Region, name);

        if (IsSupportGroupName(profile.Region) && !IsSupportGroupName(name))
        {
            region = string.Equals(name, profile.Region, StringComparison.OrdinalIgnoreCase)
                ? DefaultRegionName
                : name;
            name = profile.Region.Trim().ToUpperInvariant();
        }

        return new RegionProfile
        {
            Id = profile.Id.Trim(),
            Name = name,
            Region = NormalizeProfileRegion(region, name),
            File = profile.File.Replace('\\', '/').TrimStart('/'),
            BuiltIn = profile.BuiltIn
        };
    }

    private static bool IsSupportGroupName(string? value)
    {
        var normalized = value?.Trim();
        return normalized is not null
            && normalized.Length >= 2
            && normalized.StartsWith("SG", StringComparison.OrdinalIgnoreCase)
            && normalized.Skip(2).All(char.IsDigit);
    }

    private static string Slugify(string value)
    {
        var chars = value
            .Trim()
            .ToLowerInvariant()
            .Select(character => char.IsLetterOrDigit(character) ? character : '-')
            .ToArray();
        var slug = string.Join("", chars)
            .Split('-', StringSplitOptions.RemoveEmptyEntries)
            .DefaultIfEmpty("region")
            .Aggregate((left, right) => $"{left}-{right}");

        return slug;
    }

    private string RenameProfileFile(
        string currentFile,
        string newName,
        IEnumerable<RegionProfile> profiles)
    {
        var currentPath = ResolveProfileDeviceFilePath(currentFile);
        var currentDirectory = Path.GetDirectoryName(currentPath)!;
        var newFile = $"regions/{CreateUniqueProfileId(newName, profiles.Where(profile => !string.Equals(profile.File, currentFile, StringComparison.OrdinalIgnoreCase)))}.json";
        var newPath = ResolveProfileDeviceFilePath(newFile);

        if (string.Equals(currentPath, newPath, StringComparison.OrdinalIgnoreCase))
        {
            return currentFile;
        }

        Directory.CreateDirectory(currentDirectory);

        if (File.Exists(currentPath) && !File.Exists(newPath))
        {
            File.Move(currentPath, newPath);
        }

        return newFile;
    }

    private static string CreateCopyProfileName(string sourceName, IEnumerable<RegionProfile> profiles)
    {
        var baseName = $"{sourceName} Copy";
        var names = profiles.Select(profile => profile.Name).ToHashSet(StringComparer.OrdinalIgnoreCase);

        if (!names.Contains(baseName))
        {
            return baseName;
        }

        var suffix = 2;
        var candidate = $"{baseName} {suffix}";

        while (names.Contains(candidate))
        {
            suffix += 1;
            candidate = $"{baseName} {suffix}";
        }

        return candidate;
    }

    private static string NormalizeProfileRegion(string? region, string supportGroup)
    {
        var normalized = NormalizeOptionalText(region);

        if (normalized is null || string.Equals(normalized, supportGroup, StringComparison.OrdinalIgnoreCase))
        {
            return DefaultRegionName;
        }

        return normalized;
    }

    private static string NormalizeRequiredText(string value, string label)
    {
        var normalized = NormalizeOptionalText(value);

        if (normalized is null)
        {
            throw new InvalidDataException($"{label} is required.");
        }

        return normalized;
    }

    private static string? NormalizeOptionalText(string? value)
    {
        var normalized = value?.Trim();
        return string.IsNullOrWhiteSpace(normalized) ? null : normalized;
    }

    private static string CreateStarterConfigurationJson(string region, string supportGroup)
    {
        var configuration = new MonitorConfiguration
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
                    Region = region,
                    SupportGroup = supportGroup,
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

        return $"{JsonSerializer.Serialize(configuration, JsonOptions)}{Environment.NewLine}";
    }
}
