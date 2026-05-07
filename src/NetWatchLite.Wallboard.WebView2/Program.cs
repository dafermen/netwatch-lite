namespace NetWatchLite.Wallboard.WebView2;

internal static class Program
{
    [STAThread]
    private static void Main()
    {
        ApplicationConfiguration.Initialize();
        Application.Run(new WallboardForm());
    }
}
