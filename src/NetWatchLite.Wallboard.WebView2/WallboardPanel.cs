namespace NetWatchLite.Wallboard.WebView2;

internal sealed class WallboardPanel
{
    public string Name { get; set; } = string.Empty;

    public string Url { get; set; } = string.Empty;

    public int RefreshSeconds { get; set; } = 30;
}
