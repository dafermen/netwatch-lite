using System.Text.Json;

namespace NetWatchLite.Wallboard.WebView2;

internal static class WallboardConfigReader
{
    private const string WallboardFileName = "wallboard.json";

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        ReadCommentHandling = JsonCommentHandling.Skip,
        AllowTrailingCommas = true,
        WriteIndented = true
    };

    public static async Task<WallboardConfiguration> LoadAsync(CancellationToken cancellationToken = default)
    {
        var filePath = ResolveWallboardFilePath();

        if (!File.Exists(filePath))
        {
            return CreateDefaultConfiguration();
        }

        try
        {
            await using var stream = File.OpenRead(filePath);
            var configuration = await JsonSerializer.DeserializeAsync<WallboardConfiguration>(
                stream,
                JsonOptions,
                cancellationToken);

            return Normalize(configuration);
        }
        catch
        {
            return CreateDefaultConfiguration();
        }
    }

    private static string ResolveWallboardFilePath()
    {
        var runtimePath = Path.Combine(AppContext.BaseDirectory, WallboardFileName);

        if (File.Exists(runtimePath))
        {
            return runtimePath;
        }

        var developmentPath = Path.GetFullPath(Path.Combine(
            AppContext.BaseDirectory,
            "..",
            "..",
            "..",
            "..",
            "..",
            "Data",
            WallboardFileName));

        return File.Exists(developmentPath)
            ? developmentPath
            : runtimePath;
    }

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
                    Name = "Sample Panel",
                    Url = "/wallboard-sample.html?panel=Sample%20Panel",
                    RefreshSeconds = 30
                }
            ]
        };
    }
}
