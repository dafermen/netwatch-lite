namespace NetWatch.Models;

/// <summary>
/// Grouped monitoring results for one device category.
/// </summary>
public sealed class CategoryResult
{
    /// <summary>
    /// Category name, for example Servers or Power Devices.
    /// </summary>
    public required string Name { get; init; }

    /// <summary>
    /// Number of enabled devices returned in this category.
    /// </summary>
    public required int TotalDevices { get; init; }

    /// <summary>
    /// Number of devices with successful ping results in this category.
    /// </summary>
    public required int OnlineDevices { get; init; }

    /// <summary>
    /// Number of devices with failed ping results in this category.
    /// </summary>
    public required int OfflineDevices { get; init; }

    /// <summary>
    /// Device results belonging to this category.
    /// </summary>
    public required IReadOnlyList<DeviceResult> Devices { get; init; }
}
