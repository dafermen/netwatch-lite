using System.Text.Json.Serialization;

namespace NetWatch.Models;

/// <summary>
/// Represents one monitored network device loaded from the editable JSON configuration file.
/// </summary>
public sealed class Device
{
    /// <summary>
    /// Human-readable device name shown in the dashboard and used by client-side search.
    /// </summary>
    [JsonPropertyName("name")]
    public required string Name { get; init; }

    /// <summary>
    /// IP address or host address used by ping and TCP checks.
    /// </summary>
    [JsonPropertyName("ip")]
    public required string Ip { get; init; }

    /// <summary>
    /// Optional DNS host name used for ping checks when hostname mode is enabled for this device.
    /// </summary>
    [JsonPropertyName("hostname")]
    public string? Hostname { get; init; }

    /// <summary>
    /// Optional per-device ping mode. When true, ping uses Hostname when present; when false, ping uses Ip.
    /// Null falls back to the global monitor setting for compatibility with older config files.
    /// </summary>
    [JsonPropertyName("useHostnameForPing")]
    public bool? UseHostnameForPing { get; init; }

    /// <summary>
    /// Optional web page associated with the device, opened from the dashboard when present.
    /// </summary>
    [JsonPropertyName("websiteUrl")]
    public string? WebsiteUrl { get; init; }

    /// <summary>
    /// Physical site or branch where the device is located, for example Miami Warehouse or Orlando Office.
    /// </summary>
    [JsonPropertyName("facility")]
    public string Facility { get; init; } = "Unassigned";

    /// <summary>
    /// Logical dashboard group, for example Servers, IP Cameras, Power Devices, or Critical Workstations.
    /// </summary>
    [JsonPropertyName("category")]
    public string Category { get; init; } = "Uncategorized";

    /// <summary>
    /// Indicates whether this device should be included in monitoring executions.
    /// </summary>
    [JsonPropertyName("enabled")]
    public bool Enabled { get; init; } = true;

    /// <summary>
    /// List of checks to run for this device. Supported check types are ping and tcp.
    /// </summary>
    [JsonPropertyName("checks")]
    public List<DeviceCheck> Checks { get; init; } = [];
}
