namespace NetWatch.Models;

/// <summary>
/// Root document stored in monitor-history.json.
/// </summary>
public sealed class MonitorHistoryStore
{
    /// <summary>
    /// Schema version for future migrations.
    /// </summary>
    public int SchemaVersion { get; init; } = 1;

    /// <summary>
    /// Recent monitoring executions, newest last.
    /// </summary>
    public List<MonitorHistoryRun> Runs { get; init; } = [];
}

/// <summary>
/// One completed monitoring execution saved for reporting and analysis.
/// </summary>
public sealed class MonitorHistoryRun
{
    /// <summary>
    /// Unique identifier generated for this saved run.
    /// </summary>
    public required string RunId { get; init; }

    /// <summary>
    /// Timestamp when the monitoring execution started.
    /// </summary>
    public required DateTimeOffset StartedAt { get; init; }

    /// <summary>
    /// Timestamp when the monitoring execution completed.
    /// </summary>
    public required DateTimeOffset CompletedAt { get; init; }

    /// <summary>
    /// Total execution duration in milliseconds.
    /// </summary>
    public required long DurationMs { get; init; }

    /// <summary>
    /// Execution mode used by the run, such as Full or PingOnly.
    /// </summary>
    public required string CheckMode { get; init; }

    /// <summary>
    /// Final execution status label.
    /// </summary>
    public required string ExecutionStatus { get; init; }

    /// <summary>
    /// User-selected scope for this run.
    /// </summary>
    public required MonitorHistoryScope Scope { get; init; }

    /// <summary>
    /// Dashboard summary captured when the run completed.
    /// </summary>
    public required DashboardSummary Summary { get; init; }

    /// <summary>
    /// Device-level results captured when the run completed.
    /// </summary>
    public required IReadOnlyList<DeviceResult> Results { get; init; }
}

/// <summary>
/// Scope selected by the user when the execution was started.
/// </summary>
public sealed class MonitorHistoryScope
{
    /// <summary>
    /// Region in scope for the run, when known.
    /// </summary>
    public string? Region { get; init; }

    /// <summary>
    /// Support group in scope for the run, when known.
    /// </summary>
    public string? SupportGroup { get; init; }

    /// <summary>
    /// Facility requested by the user, or null for all facilities.
    /// </summary>
    public string? Facility { get; init; }

    /// <summary>
    /// Category requested by the user, or null for all categories.
    /// </summary>
    public string? Category { get; init; }

    /// <summary>
    /// Device name requested by the user, or null for multiple devices.
    /// </summary>
    public string? DeviceName { get; init; }

    /// <summary>
    /// Device IPs requested by the user, empty for normal scoped runs.
    /// </summary>
    public IReadOnlyList<string> DeviceIps { get; init; } = [];
}
