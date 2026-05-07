namespace NetWatch.Models;

/// <summary>
/// Root configuration object for the NOC-style iframe wallboard mode.
/// </summary>
public sealed class WallboardConfiguration
{
    /// <summary>
    /// Title shown in the wallboard top bar.
    /// </summary>
    public string AppTitle { get; set; } = "NetWatch Lite Wallboard";

    /// <summary>
    /// Determines whether automatic page rotation is enabled by default.
    /// </summary>
    public bool RotationEnabled { get; set; } = true;

    /// <summary>
    /// Number of seconds between wallboard page rotations.
    /// </summary>
    public int RotationSeconds { get; set; } = 20;

    /// <summary>
    /// Default number of panels displayed at once. Supported values are 2 and 4.
    /// </summary>
    public int DefaultLayout { get; set; } = 4;

    /// <summary>
    /// External monitoring panels displayed by the wallboard.
    /// </summary>
    public List<WallboardPanel> Panels { get; set; } = [];
}
