using System.Text.Json.Serialization;

namespace NetWatch.Models;

/// <summary>
/// Global execution settings loaded from the JSON configuration.
/// </summary>
public sealed class MonitorSettings
{
    /// <summary>
    /// Legacy interval value retained in configuration for compatibility.
    /// The current UI auto mode runs a full check every 60 seconds.
    /// </summary>
    [JsonPropertyName("intervalSeconds")]
    public int IntervalSeconds { get; init; } = 15;

    /// <summary>
    /// Timeout in milliseconds for ping and TCP checks.
    /// </summary>
    [JsonPropertyName("timeoutMs")]
    public int TimeoutMs { get; init; } = 1000;

    /// <summary>
    /// Maximum number of checks allowed to run concurrently across all devices.
    /// </summary>
    [JsonPropertyName("maxParallelChecks")]
    public int MaxParallelChecks { get; init; } = 50;

    /// <summary>
    /// When true, ping checks use the device hostname when available; otherwise they use the configured IP address.
    /// </summary>
    [JsonPropertyName("useHostnameForPing")]
    public bool UseHostnameForPing { get; init; }
}
