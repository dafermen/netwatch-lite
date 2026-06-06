namespace NetWatch.Models;

/// <summary>
/// Final computed health state for a monitored device after all configured checks finish.
/// </summary>
public enum DeviceStatus
{
    /// <summary>
    /// Every configured ping and TCP check succeeded.
    /// </summary>
    Healthy,

    /// <summary>
    /// At least one configured check succeeded, but one or more checks failed.
    /// </summary>
    Degraded,

    /// <summary>
    /// No configured checks succeeded.
    /// </summary>
    Down
}
