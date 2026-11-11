using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using NetWatch.Models;
using NetWatch.Services;

namespace NetWatch.ContractTests;

public sealed class PersistenceRecoveryTests : IDisposable
{
    private readonly string _root = Path.Combine(Path.GetTempPath(), "netwatch-recovery-tests", Guid.NewGuid().ToString("N"));

    [Fact]
    public async Task Configuration_SurvivesRestartAndCanRecoverPreviousBackupAfterCorruption()
    {
        string configurationFile;
        using (var first = new NetWatchApplicationFactory(_root))
        using (var client = first.CreateClient())
        {
            (await client.PostAsJsonAsync("/api/config", new MonitorConfiguration
            {
                Settings = new MonitorSettings { IntervalSeconds = 31 }
            })).EnsureSuccessStatusCode();
            (await client.PostAsJsonAsync("/api/config", new MonitorConfiguration
            {
                Settings = new MonitorSettings { IntervalSeconds = 47 }
            })).EnsureSuccessStatusCode();
            configurationFile = await first.Services.GetRequiredService<JsonRegionProfileRepository>().GetActiveDeviceFilePathAsync();
        }

        using (var restarted = new NetWatchApplicationFactory(_root))
        using (var client = restarted.CreateClient())
        {
            var persisted = await client.GetFromJsonAsync<MonitorConfiguration>("/api/config");
            Assert.Equal(47, persisted!.Settings.IntervalSeconds);
        }

        await File.WriteAllTextAsync(configurationFile, "{ damaged configuration");
        using var recovery = new NetWatchApplicationFactory(_root);
        using var recoveryClient = recovery.CreateClient();
        Assert.Equal(HttpStatusCode.OK, (await recoveryClient.GetAsync("/")).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await recoveryClient.PostAsync("/api/reload", null)).StatusCode);
        File.Copy(Path.ChangeExtension(configurationFile, ".backup.json"), configurationFile, overwrite: true);
        (await recoveryClient.PostAsync("/api/reload", null)).EnsureSuccessStatusCode();
        var restored = await recoveryClient.GetFromJsonAsync<MonitorConfiguration>("/api/config");
        Assert.Equal(31, restored!.Settings.IntervalSeconds);
    }

    [Fact]
    public async Task History_SurvivesRestartAndRestoresPreviousRunsFromBackup()
    {
        string historyFile;
        using (var first = new NetWatchApplicationFactory(_root))
        using (var client = first.CreateClient())
        {
            (await client.PostAsJsonAsync("/api/config", new MonitorConfiguration())).EnsureSuccessStatusCode();
            (await client.PostAsync("/api/monitor/run", null)).EnsureSuccessStatusCode();
            (await client.PostAsync("/api/monitor/run", null)).EnsureSuccessStatusCode();
            historyFile = Path.Combine(first.RuntimeDataRoot, "monitor-history.json");
        }
        using (var restarted = new NetWatchApplicationFactory(_root))
        using (var client = restarted.CreateClient())
        {
            var persisted = await client.GetFromJsonAsync<MonitorHistoryStore>("/api/history");
            Assert.Equal(2, persisted!.Runs.Count);
            await File.WriteAllTextAsync(historyFile, "{ damaged history");
            Assert.Equal(HttpStatusCode.BadRequest, (await client.GetAsync("/api/history")).StatusCode);
            File.Copy(Path.ChangeExtension(historyFile, ".backup.json"), historyFile, overwrite: true);
        }
        using var recovered = new NetWatchApplicationFactory(_root);
        using var recoveredClient = recovered.CreateClient();
        var history = await recoveredClient.GetFromJsonAsync<MonitorHistoryStore>("/api/history");
        Assert.Single(history!.Runs);
        using var validFile = JsonDocument.Parse(await File.ReadAllTextAsync(historyFile));
        Assert.Equal(1, validFile.RootElement.GetProperty(nameof(MonitorHistoryStore.Runs)).GetArrayLength());
    }

    public void Dispose()
    {
        if (Directory.Exists(_root)) Directory.Delete(_root, recursive: true);
    }
}
