namespace NetWatchLite.Wallboard.WebView2;

internal sealed class WallboardConfiguration
{
    public string AppTitle { get; set; } = "NetWatch Lite Wallboard";

    public bool RotationEnabled { get; set; } = true;

    public int RotationSeconds { get; set; } = 20;

    public int DefaultLayout { get; set; } = 4;

    public List<WallboardPanel> Panels { get; set; } = [];
}
