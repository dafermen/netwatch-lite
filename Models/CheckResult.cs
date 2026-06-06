namespace NetWatch.Models;

/// <summary>
/// Result of one executed ping or TCP check.
/// </summary>
public sealed class CheckResult
{
    /// <summary>
    /// Check type that produced this result. Supported values are ping and tcp.
    /// </summary>
    public required string Type { get; init; }

    /// <summary>
    /// TCP port that was checked. Null for ping checks.
    /// </summary>
    public int? Port { get; init; }

    /// <summary>
    /// Ping round-trip latency in milliseconds. Null for TCP checks.
    /// </summary>
    public int? LatencyMs { get; init; }

    /// <summary>
    /// True when the check succeeded. For ping this means ICMP success; for TCP this means the socket connected.
    /// </summary>
    public required bool IsAvailable { get; init; }

    /// <summary>
    /// Optional diagnostic status returned by the network check, such as Success, TimedOut, or SocketException.
    /// </summary>
    public string? Status { get; init; }

    /// <summary>
    /// Display label used by clients, for example Ping or TCP 443.
    /// </summary>
    public required string Label { get; init; }
}
