using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Options;
using NetWatch.Models;

namespace NetWatch.Services;

/// <summary>
/// Loads, validates, normalizes, and stores UI theme templates in themes.json.
/// </summary>
public sealed partial class JsonThemeRepository
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        ReadCommentHandling = JsonCommentHandling.Skip,
        AllowTrailingCommas = true,
        WriteIndented = true,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    private static readonly string[] SupportedColorKeys =
    [
        "appBackground",
        "surface",
        "sidebarBackground",
        "sidebarText",
        "primary",
        "success",
        "warning",
        "danger",
        "text",
        "mutedText",
        "border",
        "categoryHealthy",
        "categoryProblem",
        "categoryRunning",
        "autoRefreshOn",
        "autoRefreshOff",
        "runFullCheck"
    ];

    private readonly IWebHostEnvironment _environment;
    private readonly NetworkMonitorOptions _options;
    private readonly SemaphoreSlim _themeLock = new(1, 1);
    private ThemeConfiguration _configuration = CreateDefaultConfiguration();

    /// <summary>
    /// Initializes a theme repository that resolves themes.json relative to the application content root.
    /// </summary>
    /// <param name="environment">ASP.NET Core hosting environment used to resolve relative file paths.</param>
    /// <param name="options">Network monitor options containing the theme file path.</param>
    public JsonThemeRepository(
        IWebHostEnvironment environment,
        IOptions<NetworkMonitorOptions> options)
    {
        _environment = environment;
        _options = options.Value;
    }

    /// <summary>
    /// Returns the normalized theme configuration, creating themes.json with the default theme when needed.
    /// </summary>
    /// <param name="cancellationToken">Token used to cancel file operations.</param>
    /// <returns>The active theme selection and available theme templates.</returns>
    public async Task<ThemeConfiguration> GetConfigurationAsync(CancellationToken cancellationToken = default)
    {
        await _themeLock.WaitAsync(cancellationToken);

        try
        {
            var filePath = ResolveThemeFilePath();

            if (!File.Exists(filePath))
            {
                _configuration = CreateDefaultConfiguration();
                await SaveNormalizedConfigurationAsync(filePath, _configuration, cancellationToken);
                return _configuration;
            }

            ThemeConfiguration? configuration;

            await using (var stream = File.OpenRead(filePath))
            {
                configuration = await JsonSerializer.DeserializeAsync<ThemeConfiguration>(
                    stream,
                    JsonOptions,
                    cancellationToken);
            }

            _configuration = Normalize(configuration);
            await SaveNormalizedConfigurationAsync(filePath, _configuration, cancellationToken);
            return _configuration;
        }
        catch (JsonException ex)
        {
            throw new InvalidDataException("themes.json contains invalid JSON.", ex);
        }
        finally
        {
            _themeLock.Release();
        }
    }

    /// <summary>
    /// Saves a complete theme configuration to themes.json after validation and normalization.
    /// </summary>
    /// <param name="configuration">Theme configuration submitted by the UI.</param>
    /// <param name="cancellationToken">Token used to cancel file operations.</param>
    /// <returns>The normalized saved theme configuration.</returns>
    public async Task<ThemeConfiguration> SaveAsync(
        ThemeConfiguration configuration,
        CancellationToken cancellationToken = default)
    {
        await _themeLock.WaitAsync(cancellationToken);

        try
        {
            Validate(configuration);
            _configuration = Normalize(configuration);
            await SaveNormalizedConfigurationAsync(ResolveThemeFilePath(), _configuration, cancellationToken);
            return _configuration;
        }
        finally
        {
            _themeLock.Release();
        }
    }

    /// <summary>
    /// Replaces themes.json with the built-in default theme configuration.
    /// </summary>
    /// <param name="cancellationToken">Token used to cancel file operations.</param>
    /// <returns>The default theme configuration.</returns>
    public async Task<ThemeConfiguration> ResetAsync(CancellationToken cancellationToken = default)
    {
        await _themeLock.WaitAsync(cancellationToken);

        try
        {
            _configuration = CreateDefaultConfiguration();
            await SaveNormalizedConfigurationAsync(ResolveThemeFilePath(), _configuration, cancellationToken);
            return _configuration;
        }
        finally
        {
            _themeLock.Release();
        }
    }

    private string ResolveThemeFilePath()
    {
        if (Path.IsPathRooted(_options.ThemeFilePath))
        {
            return _options.ThemeFilePath;
        }

        var contentRootPath = Path.Combine(_environment.ContentRootPath, _options.ThemeFilePath);

        if (File.Exists(contentRootPath))
        {
            return contentRootPath;
        }

        var developmentDataPath = Path.Combine(_environment.ContentRootPath, "Data", _options.ThemeFilePath);

        if (File.Exists(developmentDataPath))
        {
            return developmentDataPath;
        }

        return Directory.Exists(Path.Combine(_environment.ContentRootPath, "Data"))
            ? developmentDataPath
            : contentRootPath;
    }

    private static async Task SaveNormalizedConfigurationAsync(
        string filePath,
        ThemeConfiguration configuration,
        CancellationToken cancellationToken)
    {
        var directory = Path.GetDirectoryName(filePath);

        if (!string.IsNullOrWhiteSpace(directory))
        {
            Directory.CreateDirectory(directory);
        }

        await using var stream = File.Create(filePath);
        await JsonSerializer.SerializeAsync(stream, configuration, JsonOptions, cancellationToken);
    }

    private static ThemeConfiguration Normalize(ThemeConfiguration? configuration)
    {
        if (configuration is null || configuration.Themes.Count == 0)
        {
            return CreateDefaultConfiguration();
        }

        var defaultTheme = CreateDefaultTheme();
        var themes = configuration.Themes
            .Where(theme => !string.IsNullOrWhiteSpace(theme.Id) && !string.IsNullOrWhiteSpace(theme.Name))
            .GroupBy(theme => theme.Id.Trim(), StringComparer.OrdinalIgnoreCase)
            .Select(group => NormalizeTheme(group.First()))
            .ToList();

        var defaultIndex = themes.FindIndex(theme => string.Equals(theme.Id, defaultTheme.Id, StringComparison.OrdinalIgnoreCase));

        if (defaultIndex >= 0)
        {
            themes[defaultIndex] = defaultTheme;
        }
        else
        {
            themes.Insert(0, defaultTheme);
        }

        var activeThemeId = themes.Any(theme => string.Equals(theme.Id, configuration.ActiveThemeId, StringComparison.OrdinalIgnoreCase))
            ? configuration.ActiveThemeId.Trim()
            : defaultTheme.Id;

        return new ThemeConfiguration
        {
            ActiveThemeId = activeThemeId,
            Themes = themes
        };
    }

    private static ThemeDefinition NormalizeTheme(ThemeDefinition theme)
    {
        var defaultColors = CreateDefaultColors();
        var colors = SupportedColorKeys.ToDictionary(
            key => key,
            key => NormalizeColor(theme.Colors.GetValueOrDefault(key), defaultColors[key]));

        return new ThemeDefinition
        {
            Id = theme.Id.Trim(),
            Name = theme.Name.Trim(),
            BuiltIn = string.Equals(theme.Id, "default", StringComparison.OrdinalIgnoreCase) || theme.BuiltIn,
            Colors = colors
        };
    }

    private static void Validate(ThemeConfiguration? configuration)
    {
        if (configuration is null)
        {
            throw new InvalidDataException("Theme configuration body is required.");
        }

        if (configuration.Themes is null || configuration.Themes.Count == 0)
        {
            throw new InvalidDataException("At least one theme is required.");
        }

        var ids = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var theme in configuration.Themes)
        {
            if (string.IsNullOrWhiteSpace(theme.Id))
            {
                throw new InvalidDataException("Every theme requires an id.");
            }

            if (string.IsNullOrWhiteSpace(theme.Name))
            {
                throw new InvalidDataException($"Theme '{theme.Id}' requires a name.");
            }

            if (!ids.Add(theme.Id.Trim()))
            {
                throw new InvalidDataException($"Theme id '{theme.Id}' is duplicated.");
            }

            foreach (var key in SupportedColorKeys)
            {
                if (!IsHexColor(theme.Colors.GetValueOrDefault(key)))
                {
                    throw new InvalidDataException($"Theme '{theme.Name}' has an invalid {key} color. Use #RRGGBB.");
                }
            }
        }

        if (!ids.Contains(configuration.ActiveThemeId))
        {
            throw new InvalidDataException("activeThemeId must match an existing theme.");
        }
    }

    private static ThemeConfiguration CreateDefaultConfiguration()
    {
        return new ThemeConfiguration
        {
            ActiveThemeId = "default",
            Themes = [CreateDefaultTheme()]
        };
    }

    private static ThemeDefinition CreateDefaultTheme()
    {
        return new ThemeDefinition
        {
            Id = "default",
            Name = "NetWatch Default",
            BuiltIn = true,
            Colors = CreateDefaultColors()
        };
    }

    private static Dictionary<string, string> CreateDefaultColors()
    {
        return new Dictionary<string, string>
        {
            ["appBackground"] = "#f7f8fa",
            ["surface"] = "#ffffff",
            ["sidebarBackground"] = "#111827",
            ["sidebarText"] = "#e5e7eb",
            ["primary"] = "#0d6efd",
            ["success"] = "#198754",
            ["warning"] = "#ffc107",
            ["danger"] = "#dc3545",
            ["text"] = "#17212b",
            ["mutedText"] = "#657182",
            ["border"] = "#dee2e6",
            ["categoryHealthy"] = "#3b9b40",
            ["categoryProblem"] = "#be302b",
            ["categoryRunning"] = "#465464",
            ["autoRefreshOn"] = "#198754",
            ["autoRefreshOff"] = "#dc3545",
            ["runFullCheck"] = "#ffc107"
        };
    }

    private static string NormalizeColor(string? value, string fallback)
    {
        return IsHexColor(value) ? value!.Trim() : fallback;
    }

    private static bool IsHexColor(string? value)
    {
        return !string.IsNullOrWhiteSpace(value) && HexColorRegex().IsMatch(value.Trim());
    }

    [GeneratedRegex("^#[0-9a-fA-F]{6}$")]
    private static partial Regex HexColorRegex();
}
