namespace NetWatch.Models;

/// <summary>
/// Result of one executed ping, TCP or HTTP/HTTPS check.
/// </summary>
public sealed class CheckResult
{
    /// <summary>
    /// Check type that produced this result: ping, tcp or http.
    /// </summary>
    public required string Type { get; init; }

    /// <summary>
    /// TCP port that was checked. Null for ping checks.
    /// </summary>
    public int? Port { get; init; }

    /// <summary>
    /// Ping round-trip latency in milliseconds. Null for TCP/HTTP checks.
    /// </summary>
    public int? LatencyMs { get; init; }

    /// <summary>
    /// True when the configured connectivity or HTTP response requirements succeeded.
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

    /// <summary>HTTP target without query/fragment, to avoid storing URL tokens in history.</summary>
    public string? Url { get; init; }
    /// <summary>Actual HTTP status, when response headers were received.</summary>
    public int? StatusCode { get; init; }
    /// <summary>Configured expected HTTP status.</summary>
    public int? ExpectedStatusCode { get; init; }
    /// <summary>Applied HTTP timeout per attempt.</summary>
    public int? TimeoutMs { get; init; }
    /// <summary>Elapsed HTTP time for the final attempt, including text validation.</summary>
    public long? DurationMs { get; init; }
    /// <summary>Safe HTTP diagnostic, without response bodies or query values.</summary>
    public string? Message { get; init; }
    /// <summary>Safe transport reason code, without exception messages, credentials or response bodies.</summary>
    [System.Text.Json.Serialization.JsonIgnore(Condition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull)]
    public string? DiagnosticCode { get; init; }
    /// <summary>Actual HTTP attempt count; absent in legacy history and checks without this measurement.</summary>
    [System.Text.Json.Serialization.JsonIgnore(Condition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull)]
    public int? Attempts { get; set; }
}
