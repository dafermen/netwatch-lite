using System.Text.Json;
using System.Text.Json.Serialization;
using NetWatch.Models;

namespace NetWatch.Services;

/// <summary>
/// Loads, validates, normalizes, and caches the wallboard JSON configuration.
/// </summary>
public sealed class WallboardConfigService
{
    private const string WallboardFileName = "wallboard.json";

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        ReadCommentHandling = JsonCommentHandling.Skip,
        AllowTrailingCommas = true,
        WriteIndented = true,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    private readonly IWebHostEnvironment _environment;
    private readonly ILogger<WallboardConfigService> _logger;
    private readonly SemaphoreSlim _fileLock = new(1, 1);
    private WallboardConfiguration _configuration = CreateDefaultConfiguration();

    /// <summary>
    /// Initializes a wallboard configuration service that resolves wallboard.json from the app root or Data folder.
    /// </summary>
    /// <param name="environment">ASP.NET Core environment used to resolve file paths.</param>
    /// <param name="logger">Logger used for invalid JSON and validation warnings.</param>
    public WallboardConfigService(
        IWebHostEnvironment environment,
        ILogger<WallboardConfigService> logger)
    {
        _environment = environment;
        _logger = logger;
    }

    /// <summary>
    /// Returns the cached wallboard configuration currently used by /wallboard.
    /// </summary>
    /// <returns>The normalized wallboard configuration.</returns>
    public Task<WallboardConfiguration> GetConfigurationAsync()
    {
        return Task.FromResult(_configuration);
    }

    /// <summary>
    /// Reloads wallboard.json from disk. Invalid or missing files fall back to a safe default configuration.
    /// </summary>
    /// <param name="cancellationToken">Token used to cancel file and JSON operations.</param>
    /// <returns>The normalized configuration loaded from disk or the default fallback.</returns>
    public async Task<WallboardConfiguration> ReloadAsync(CancellationToken cancellationToken = default)
    {
        await _fileLock.WaitAsync(cancellationToken);

        try
        {
            var filePath = ResolveWallboardFilePath();

            if (!File.Exists(filePath))
            {
                _logger.LogWarning("wallboard.json was not found at {FilePath}. Using defaults.", filePath);
                _configuration = CreateDefaultConfiguration();
                return _configuration;
            }

            await using var stream = File.OpenRead(filePath);
            var configuration = await JsonSerializer.DeserializeAsync<WallboardConfiguration>(
                stream,
                JsonOptions,
                cancellationToken);

            _configuration = Normalize(configuration);
            return _configuration;
        }
        catch (Exception ex) when (ex is JsonException or IOException or UnauthorizedAccessException or InvalidDataException)
        {
            _logger.LogWarning(ex, "Unable to load wallboard.json. Using defaults.");
            _configuration = CreateDefaultConfiguration();
            return _configuration;
        }
        finally
        {
            _fileLock.Release();
        }
    }

    /// <summary>
    /// Resolves wallboard.json to an absolute path, preferring the runtime root and falling back to Data during development.
    /// </summary>
    /// <returns>Absolute path where wallboard.json should be read from.</returns>
    private string ResolveWallboardFilePath()
    {
        var contentRootPath = Path.Combine(_environment.ContentRootPath, WallboardFileName);

        if (File.Exists(contentRootPath))
        {
            return contentRootPath;
        }

        var developmentDataPath = Path.Combine(_environment.ContentRootPath, "Data", WallboardFileName);

        return File.Exists(developmentDataPath)
            ? developmentDataPath
            : contentRootPath;
    }

    /// <summary>
    /// Normalizes title, layout, rotation values, and panel declarations into predictable runtime values.
    /// </summary>
    /// <param name="configuration">Configuration parsed from wallboard.json.</param>
    /// <returns>A safe wallboard configuration.</returns>
    private static WallboardConfiguration Normalize(WallboardConfiguration? configuration)
    {
        if (configuration is null)
        {
            return CreateDefaultConfiguration();
        }

        var panels = (configuration.Panels ?? [])
            .Where(IsValidPanel)
            .Select(panel => new WallboardPanel
            {
                Name = string.IsNullOrWhiteSpace(panel.Name) ? "Monitoring Panel" : panel.Name.Trim(),
                Url = panel.Url.Trim(),
                RefreshSeconds = panel.RefreshSeconds <= 0 ? 30 : panel.RefreshSeconds
            })
            .ToList();

        return new WallboardConfiguration
        {
            AppTitle = string.IsNullOrWhiteSpace(configuration.AppTitle)
                ? "NetWatch Lite Wallboard"
                : configuration.AppTitle.Trim(),
            RotationEnabled = configuration.RotationEnabled,
            RotationSeconds = configuration.RotationSeconds <= 0 ? 20 : configuration.RotationSeconds,
            DefaultLayout = configuration.DefaultLayout == 2 ? 2 : 4,
            Panels = panels.Count == 0 ? CreateDefaultConfiguration().Panels : panels
        };
    }

    /// <summary>
    /// Determines whether a wallboard panel has a usable absolute HTTP/HTTPS URL or root-relative local URL.
    /// </summary>
    /// <param name="panel">Panel read from JSON.</param>
    /// <returns>True when the panel can be rendered by an iframe.</returns>
    private static bool IsValidPanel(WallboardPanel panel)
    {
        if (string.IsNullOrWhiteSpace(panel.Url))
        {
            return false;
        }

        var url = panel.Url.Trim();

        if (url.StartsWith('/'))
        {
            return true;
        }

        return Uri.TryCreate(url, UriKind.Absolute, out var uri)
            && (uri.Scheme == Uri.UriSchemeHttp || uri.Scheme == Uri.UriSchemeHttps);
    }

    /// <summary>
    /// Creates a small fallback wallboard configuration that keeps the UI usable if wallboard.json is unavailable.
    /// </summary>
    /// <returns>Fallback wallboard configuration.</returns>
    private static WallboardConfiguration CreateDefaultConfiguration()
    {
        return new WallboardConfiguration
        {
            AppTitle = "NetWatch Lite Wallboard",
            RotationEnabled = true,
            RotationSeconds = 20,
            DefaultLayout = 4,
            Panels =
            [
                new WallboardPanel
                {
                    Name = "NetWatch Lite",
                    Url = "http://localhost:5000/",
                    RefreshSeconds = 30
                }
            ]
        };
    }
}
