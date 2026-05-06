namespace NetWatch.Models;

/// <summary>
/// Incremental monitoring event sent to the dashboard while a full check is running.
/// </summary>
public sealed class MonitorStreamEvent
{
    /// <summary>
    /// Event type consumed by the browser. Supported values are started, result, completed, and busy.
    /// </summary>
    public required string Type { get; init; }

    /// <summary>
    /// Total number of enabled devices in the execution.
    /// </summary>
    public required int TotalDevices { get; init; }

    /// <summary>
    /// Number of devices already checked.
    /// </summary>
    public required int CompletedDevices { get; init; }

    /// <summary>
    /// Settings used by the current execution.
    /// </summary>
    public MonitorSettings? Settings { get; init; }

    /// <summary>
    /// Device result emitted by result events.
    /// </summary>
    public DeviceResult? Result { get; init; }

    /// <summary>
    /// Current dashboard summary. During streaming this is calculated from completed devices.
    /// </summary>
    public DashboardSummary? Summary { get; init; }

    /// <summary>
    /// Final grouped category payload emitted by completed events.
    /// </summary>
    public IReadOnlyList<CategoryResult>? Categories { get; init; }

    /// <summary>
    /// Final flat results emitted by completed events.
    /// </summary>
    public IReadOnlyList<DeviceResult>? Results { get; init; }

    /// <summary>
    /// Event timestamp.
    /// </summary>
    public required DateTimeOffset Timestamp { get; init; }

    /// <summary>
    /// Optional human-readable execution status.
    /// </summary>
    public string? ExecutionStatus { get; init; }

    /// <summary>
    /// Optional message for busy or error-like stream events.
    /// </summary>
    public string? Message { get; init; }
}
