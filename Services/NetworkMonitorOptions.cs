namespace NetWatch.Services;

/// <summary>
/// Application-level configuration values for locating the monitor JSON file.
/// </summary>
public sealed class NetworkMonitorOptions
{
    /// <summary>
    /// Configuration section name used by appsettings.json.
    /// </summary>
    public const string SectionName = "NetworkMonitor";

    /// <summary>
    /// Relative or absolute path to the editable devices.json configuration file.
    /// Relative paths are resolved from the ASP.NET Core content root, which is the executable folder after publish.
    /// </summary>
    public string DeviceFilePath { get; init; } = "Data/devices.json";
}
