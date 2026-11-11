using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;

namespace NetWatch.ContractTests;

public sealed class NetWatchApplicationFactory : WebApplicationFactory<Program>
{
    private readonly string _contentRoot;
    private readonly string _webRoot;
    private readonly bool _ownsContentRoot;
    private readonly string _provider;

    public NetWatchApplicationFactory() : this(null)
    {
    }

    internal NetWatchApplicationFactory(string? contentRoot, string provider = "json")
    {
        _provider = provider;
        _ownsContentRoot = contentRoot is null;
        _contentRoot = contentRoot ?? Path.Combine(
            Path.GetTempPath(),
            "netwatch-lite-contract-tests",
            Guid.NewGuid().ToString("N"));
        var source = new DirectoryInfo(AppContext.BaseDirectory);
        while (source is not null && !File.Exists(Path.Combine(source.FullName,"NetWatch.csproj"))) source = source.Parent;
        var sourceRoot = source?.FullName ?? throw new DirectoryNotFoundException("NetWatch source root not found.");
        _webRoot = Path.Combine(sourceRoot,"wwwroot");
        var documentationSourceRoot = Path.Combine(sourceRoot,"docs");

        Directory.CreateDirectory(Path.Combine(_contentRoot, "Data"));
        CopyDirectory(documentationSourceRoot, Path.Combine(_contentRoot, "docs"));
    }

    public string RuntimeDataRoot => Path.Combine(_contentRoot, "Data");

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.UseContentRoot(_contentRoot);
        builder.UseWebRoot(_webRoot);
        builder.ConfigureAppConfiguration((_, configuration) =>
        {
            var dataRoot = RuntimeDataRoot;
            configuration.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Storage:Provider"] = _provider,
                ["NetworkMonitor:DeviceFilePath"] = Path.Combine(dataRoot, "config.json"),
                ["NetworkMonitor:ProfileFilePath"] = Path.Combine(dataRoot, "regions.json"),
                ["NetworkMonitor:ThemeFilePath"] = Path.Combine(dataRoot, "themes.json"),
                ["NetworkMonitor:HistoryFilePath"] = Path.Combine(dataRoot, "monitor-history.json"),
                ["NetworkMonitor:ErrorLogFilePath"] = Path.Combine(dataRoot, "app-errors.json"),
                ["NetworkMonitor:IntegrationFilePath"] = Path.Combine(dataRoot, "integrations.json")
            });
        });
    }

    private static void CopyDirectory(string sourcePath, string destinationPath)
    {
        Directory.CreateDirectory(destinationPath);

        foreach (var directory in Directory.GetDirectories(sourcePath, "*", SearchOption.AllDirectories))
        {
            Directory.CreateDirectory(directory.Replace(sourcePath, destinationPath));
        }

        foreach (var file in Directory.GetFiles(sourcePath, "*", SearchOption.AllDirectories))
        {
            File.Copy(file, file.Replace(sourcePath, destinationPath), overwrite: true);
        }
    }

    public override async ValueTask DisposeAsync()
    {
        await base.DisposeAsync();

        if (_ownsContentRoot && Directory.Exists(_contentRoot))
        {
            // Windows may retain a sharing handle briefly after the test host closes.
            for (var attempt=0;;attempt++)
            {
                try { Directory.Delete(_contentRoot, recursive:true); break; }
                catch(IOException ex) when (attempt<9 && (ex.HResult & 0xffff) is 32 or 33)
                { await Task.Delay(50*(attempt+1)); }
            }
        }
    }
}
