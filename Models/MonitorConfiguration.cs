using System.Text.Json.Serialization;

namespace NetWatch.Models;

/// <summary>
/// Root object of config.json. Contains global monitor settings and the device inventory.
/// </summary>
public sealed class MonitorConfiguration
{
    /// <summary>
    /// Runtime settings that control refresh interval, timeout, and maximum check concurrency.
    /// </summary>
    [JsonPropertyName("settings")]
    public MonitorSettings Settings { get; init; } = new();

    /// <summary>
    /// Device inventory loaded from config.json.
    /// </summary>
    [JsonPropertyName("devices")]
    public List<Device> Devices { get; init; } = [];
}
