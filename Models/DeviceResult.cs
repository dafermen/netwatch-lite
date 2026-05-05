namespace NetWatch.Models;

/// <summary>
/// Aggregated monitoring result for one device after all configured checks complete.
/// </summary>
public sealed class DeviceResult
{
    /// <summary>
    /// Device name copied from configuration.
    /// </summary>
    public required string Name { get; init; }

    /// <summary>
    /// Device IP address copied from configuration.
    /// </summary>
    public required string Ip { get; init; }

    /// <summary>
    /// Device category copied from configuration and used for grouped dashboard rendering.
    /// </summary>
    public required string Category { get; init; }

    /// <summary>
    /// True when the configured ping check succeeds.
    /// </summary>
    public required bool IsOnline { get; init; }

    /// <summary>
    /// Final computed device status: Healthy, Degraded, or Down.
    /// </summary>
    public required DeviceStatus Status { get; init; }

    /// <summary>
    /// Ping latency in milliseconds. Zero when ping failed or no ping result exists.
    /// </summary>
    public required int LatencyMs { get; init; }

    /// <summary>
    /// Indicates whether the source device was enabled when this result was produced.
    /// </summary>
    public required bool Enabled { get; init; }

    /// <summary>
    /// TCP ports requested by the device configuration.
    /// </summary>
    public required IReadOnlyList<int> RequestedPorts { get; init; }

    /// <summary>
    /// TCP ports that accepted a connection during this execution.
    /// </summary>
    public required IReadOnlyList<int> OpenPorts { get; init; }

    /// <summary>
    /// Raw per-check results used to compute the aggregated status.
    /// </summary>
    public required IReadOnlyList<CheckResult> Checks { get; init; }

    /// <summary>
    /// Timestamp when this device result was computed.
    /// </summary>
    public required DateTimeOffset LastCheck { get; init; }
}
