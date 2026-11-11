using System.Text.Json.Serialization;

namespace NetWatch.Models;

/// <summary>
/// Root object of config.json. Contains global monitor settings and the device inventory.
/// </summary>
public sealed class MonitorConfiguration
{
    /// <summary>Profile-scoped classification catalog; absent legacy fields use protected defaults.</summary>
    [JsonPropertyName("deviceTypes")]
    public List<DeviceTypeDefinition> DeviceTypes { get; init; } = DeviceTypeDefinition.CreateDefaults();

    /// <summary>Optional printer/scanner catalog carried with the support-group inventory.</summary>
    [JsonPropertyName("peripheralCatalog")]
    public List<PeripheralCatalogEntry> PeripheralCatalog { get; init; } = [];

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
