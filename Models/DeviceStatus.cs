namespace NetWatch.Models;

/// <summary>
/// Final computed health state for a monitored device after all configured checks finish.
/// </summary>
public enum DeviceStatus
{
    /// <summary>
    /// Ping succeeded and every configured TCP port is open.
    /// </summary>
    Healthy,

    /// <summary>
    /// Ping succeeded, but at least one configured TCP port is closed or unreachable.
    /// </summary>
    Degraded,

    /// <summary>
    /// Ping failed. Port results may still exist, but the device is considered unavailable.
    /// </summary>
    Down
}
