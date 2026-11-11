using System.Text.Json.Serialization;

namespace NetWatch.Models;

/// <summary>
/// Represents one monitored network device loaded from the editable JSON configuration file.
/// </summary>
public sealed class Device
{
    /// <summary>Explicit inventory type; legacy devices remain unspecified.</summary>
    [JsonPropertyName("deviceType")]
    public string DeviceType { get; init; } = "unspecified";

    /// <summary>Optional manually recorded workstation peripheral inventory.</summary>
    [JsonPropertyName("workstationPeripherals")]
    public WorkstationPeripherals? WorkstationPeripherals { get; init; }

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

    /// <summary>Optional single-line text copied by an operator; never executed by the application.</summary>
    [JsonPropertyName("command")]
    public string? Command { get; init; }

    /// <summary>Optional physical position within a facility, such as floor, office or desk.</summary>
    [JsonPropertyName("location")]
    public string? Location { get; init; }

    /// <summary>Optional private inventory notes, such as assigned user or other observations.</summary>
    [JsonPropertyName("notes")]
    public string? Notes { get; init; }

    /// <summary>
    /// Higher-level operational region, for example Sample Region.
    /// </summary>
    [JsonPropertyName("region")]
    public string Region { get; init; } = "Unassigned";

    /// <summary>
    /// Support group inside the region, for example Support Team A or Support Team B.
    /// </summary>
    [JsonPropertyName("supportGroup")]
    public string SupportGroup { get; init; } = "Unassigned";

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
    /// List of checks to run for this device. Supported types are ping, tcp and http.
    /// </summary>
    [JsonPropertyName("checks")]
    public List<DeviceCheck> Checks { get; init; } = [];
}
