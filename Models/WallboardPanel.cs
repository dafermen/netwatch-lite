namespace NetWatch.Models;

/// <summary>
/// Defines one external monitoring page rendered inside a wallboard iframe panel.
/// </summary>
public sealed class WallboardPanel
{
    /// <summary>
    /// Display name shown in the panel title bar.
    /// </summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Absolute HTTP/HTTPS URL or root-relative local URL loaded by the iframe.
    /// </summary>
    public string Url { get; set; } = string.Empty;

    /// <summary>
    /// Independent refresh interval for this panel, in seconds.
    /// </summary>
    public int RefreshSeconds { get; set; } = 30;
}
