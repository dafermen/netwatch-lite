namespace NetWatch.Models;

/// <summary>
/// API response returned to the dashboard for cached or freshly executed monitoring results.
/// </summary>
public sealed class MonitorResponse
{
    /// <summary>
    /// Timestamp for the result payload. Kept for backwards compatibility with earlier UI code.
    /// </summary>
    public required DateTimeOffset LastCheck { get; init; }

    /// <summary>
    /// Timestamp when the latest full monitoring execution completed.
    /// </summary>
    public required DateTimeOffset LastExecutionTime { get; init; }

    /// <summary>
    /// Execution status label, for example Completed.
    /// </summary>
    public required string ExecutionStatus { get; init; }

    /// <summary>
    /// Settings used by the dashboard to control refresh timing and display execution context.
    /// </summary>
    public required MonitorSettings Settings { get; init; }

    /// <summary>
    /// Aggregated totals for the top dashboard cards.
    /// </summary>
    public required DashboardSummary Summary { get; init; }

    /// <summary>
    /// Results grouped by device category.
    /// </summary>
    public required IReadOnlyList<CategoryResult> Categories { get; init; }

    /// <summary>
    /// Flat result list for clients that prefer not to consume grouped results.
    /// </summary>
    public required IReadOnlyList<DeviceResult> Results { get; init; }
}
