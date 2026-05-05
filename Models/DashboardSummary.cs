namespace NetWatch.Models;

/// <summary>
/// Top-level dashboard metrics calculated from the latest monitoring execution.
/// </summary>
public sealed class DashboardSummary
{
    /// <summary>
    /// Total number of enabled monitored devices.
    /// </summary>
    public required int TotalDevices { get; init; }

    /// <summary>
    /// Number of devices in Healthy status.
    /// </summary>
    public required int HealthyDevices { get; init; }

    /// <summary>
    /// Number of devices with a successful ping response.
    /// </summary>
    public required int OnlineDevices { get; init; }

    /// <summary>
    /// Number of devices in Down status.
    /// </summary>
    public required int OfflineDevices { get; init; }

    /// <summary>
    /// Number of devices in Degraded status.
    /// </summary>
    public required int DegradedDevices { get; init; }

    /// <summary>
    /// Percentage of healthy devices over total devices, rounded to one decimal place.
    /// </summary>
    public required double AvailabilityPercentage { get; init; }
}
