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
    /// Number of additional attempts to make after a failed ping or TCP check.
    /// </summary>
    [JsonPropertyName("retryCount")]
    public int RetryCount { get; init; }

    /// <summary>
    /// Delay in milliseconds between retry attempts.
    /// </summary>
    [JsonPropertyName("retryDelayMs")]
    public int RetryDelayMs { get; init; } = 250;

    /// <summary>
    /// Legacy setting read from older config files and migrated to each device during normalization.
    /// New saved config files omit this value.
    /// </summary>
    [JsonPropertyName("useHostnameForPing")]
    public bool? UseHostnameForPing { get; init; }
}
