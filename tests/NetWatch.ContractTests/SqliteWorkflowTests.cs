using System.Net;
using System.Net.Http.Json;
using System.Text.Json.Nodes;
using Microsoft.Extensions.DependencyInjection;
using NetWatch.Services;
using NetWatch.Models;
using Microsoft.Data.Sqlite;

namespace NetWatch.ContractTests;

public sealed class SqliteWorkflowTests : IDisposable
{
    private readonly string _root = Path.Combine(Path.GetTempPath(), "netwatch-sqlite-contract", Guid.NewGuid().ToString("N"));

    [Theory]
    [InlineData("json")]
    [InlineData("sqlite")]
    public async Task InventoryCatalogProfilesAndPrivateFields_PreserveTheSameApiContract(string provider)
    {
        string profileId;
        using (var factory = new NetWatchApplicationFactory(_root, provider))
        using (var client = factory.CreateClient())
        {
            var storage = JsonNode.Parse(await client.GetStringAsync("/api/storage"))!;
            Assert.Equal(provider, storage["provider"]!.GetValue<string>());
            var inventory = JsonNode.Parse("""
                {"peripheralCatalog":[{"id":"p","kind":"printer","manufacturer":"Test","model":"Printer"}],
                "devices":[{"name":"Desk","ip":"127.0.0.1","deviceType":"workstation","facility":"Lab",
                "location":"Floor 1","notes":"Private <text>","command":"echo test","websiteUrl":"https://example.invalid/",
                "checks":[{"type":"http","url":"https://example.invalid/health","timeoutMs":1000,"expectedStatusCode":200}],
                "workstationPeripherals":{"printers":{"status":"assigned","items":[{"modelId":"p","connection":"network","linkType":"wireless","address":"printer.invalid"}]},"scanners":{"status":"none","items":[]}}}]}
                """)!;
            using var save = await client.PostAsJsonAsync("/api/config", inventory);
            Assert.True(save.IsSuccessStatusCode, await save.Content.ReadAsStringAsync());
            var baseline = await client.GetStringAsync("/api/config/export");
            (await client.PostAsync("/api/reload", null)).EnsureSuccessStatusCode();
            Assert.True(JsonNode.DeepEquals(JsonNode.Parse(baseline), JsonNode.Parse(await client.GetStringAsync("/api/config/export"))));
            var row = JsonNode.Parse(baseline)!["devices"]![0]!;
            row["name"] = "Updated desk";
            (await client.PostAsJsonAsync("/api/config/devices/0", row)).EnsureSuccessStatusCode();
            using var form = new MultipartFormDataContent();
            form.Add(new StringContent(await client.GetStringAsync("/api/config/export")), "configFile", "synthetic.json");
            (await client.PostAsync("/api/config/import", form)).EnsureSuccessStatusCode();
            (await client.PostAsJsonAsync("/api/regions", new { name = "SQLite copy", region = "Lab", copyFromActive = true })).EnsureSuccessStatusCode();
            var regions = JsonNode.Parse(await client.GetStringAsync("/api/regions"))!;
            profileId = regions["activeProfileId"]!.GetValue<string>();
            (await client.PostAsJsonAsync($"/api/regions/{profileId}", new { name = "Renamed SQLite copy", region = "Lab" })).EnsureSuccessStatusCode();
            (await client.PostAsync("/api/reload", null)).EnsureSuccessStatusCode();
            Assert.Equal("Updated desk", JsonNode.Parse(await client.GetStringAsync("/api/config"))!["devices"]![0]!["name"]!.GetValue<string>());
            foreach (var route in new[] { "/api/device-types", "/api/themes", "/api/history", "/api/errors", "/api/integrations" })
                Assert.Equal(HttpStatusCode.OK, (await client.GetAsync(route)).StatusCode);
        }
        using (var restarted = new NetWatchApplicationFactory(_root, provider))
        using (var client = restarted.CreateClient())
        {
            var saved = JsonNode.Parse(await client.GetStringAsync("/api/config"))!["devices"]![0]!;
            Assert.Equal("Updated desk", saved["name"]!.GetValue<string>());
            Assert.Equal("Floor 1", saved["location"]!.GetValue<string>());
            Assert.Equal("Private <text>", saved["notes"]!.GetValue<string>());
            Assert.Equal("echo test", saved["command"]!.GetValue<string>());
            Assert.Equal("wireless", saved["workstationPeripherals"]!["printers"]!["items"]![0]!["linkType"]!.GetValue<string>());
            Assert.Equal("none", saved["workstationPeripherals"]!["scanners"]!["status"]!.GetValue<string>());
            (await client.DeleteAsync($"/api/regions/{profileId}")).EnsureSuccessStatusCode();
        }
    }

    [Fact]
    public async Task FailedProfileRegistryWrite_RollsBackCopiedInventoryAndReloadsCache()
    {
        using var factory = new NetWatchApplicationFactory(_root, "sqlite");
        using var client = factory.CreateClient();
        var repository = factory.Services.GetRequiredService<JsonRegionProfileRepository>();
        var before = await repository.GetConfigurationAsync();
        var profileCount = before.Profiles.Count;
        using var connection = new SqliteConnection($"Data Source={Path.Combine(_root, "netwatch.db")};Pooling=False");
        connection.Open();
        using var command = connection.CreateCommand();
        command.CommandText = "SELECT COUNT(*) FROM documents WHERE path LIKE 'Data/regions/%'";
        var documents = Convert.ToInt32(command.ExecuteScalar());
        command.CommandText = "CREATE TRIGGER refuse_registry BEFORE UPDATE ON documents WHEN NEW.path='Data/regions.json' BEGIN SELECT RAISE(ABORT,'injected'); END";
        command.ExecuteNonQuery();
        await Assert.ThrowsAsync<SqliteException>(() => repository.CreateAsync(new CreateRegionProfileRequest { Name = "Failed copy", CopyFromActive = true }));
        command.CommandText = "DROP TRIGGER refuse_registry";
        command.ExecuteNonQuery();
        command.CommandText = "SELECT COUNT(*) FROM documents WHERE path LIKE 'Data/regions/%'";
        Assert.Equal(documents, Convert.ToInt32(command.ExecuteScalar()));
        var after = await repository.GetConfigurationAsync();
        Assert.Equal(before.ActiveProfileId, after.ActiveProfileId);
        Assert.Equal(profileCount, after.Profiles.Count);
        Assert.DoesNotContain(after.Profiles, profile => profile.Name == "Failed copy");
    }

    [Theory]
    [InlineData("json", "full")]
    [InlineData("json", "row")]
    [InlineData("json", "import")]
    [InlineData("sqlite", "full")]
    [InlineData("sqlite", "row")]
    [InlineData("sqlite", "import")]
    public async Task StaleProfilePrecondition_RejectsWritesWithoutChangingTheActiveInventory(string provider, string mode)
    {
        using var factory = new NetWatchApplicationFactory(_root, provider);
        using var client = factory.CreateClient();
        var regions = JsonNode.Parse(await client.GetStringAsync("/api/regions"))!;
        var oldId = regions["activeProfileId"]!.GetValue<string>();
        var inventory = JsonNode.Parse("""{"devices":[{"name":"Old profile desk","ip":"127.0.0.1","checks":[{"type":"ping"}]}]}""")!;
        (await client.PostAsJsonAsync("/api/config", inventory)).EnsureSuccessStatusCode();
        (await client.PostAsJsonAsync("/api/regions", new { name = "Other profile", copyFromActive = false })).EnsureSuccessStatusCode();
        var before = await client.GetStringAsync("/api/config/export");
        client.DefaultRequestHeaders.Add("X-NetWatch-Profile", oldId);
        HttpResponseMessage response;
        if (mode == "import")
        {
            using var form = new MultipartFormDataContent();
            form.Add(new StringContent(inventory.ToJsonString()), "configFile", "synthetic.json");
            response = await client.PostAsync("/api/config/import", form);
        }
        else response = await client.PostAsJsonAsync(mode == "row" ? "/api/config/devices/0" : "/api/config",
            mode == "row" ? inventory["devices"]![0] : inventory);
        using (response)
        {
            Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
            Assert.Contains("support group changed", await response.Content.ReadAsStringAsync());
        }
        Assert.Equal(before, await client.GetStringAsync("/api/config/export"));
    }

    [Theory]
    [InlineData("json")]
    [InlineData("sqlite")]
    public async Task ActivationBeforeInventoryReload_CannotWriteTheOldCachedRowsIntoTheNewProfile(string provider)
    {
        using var factory = new NetWatchApplicationFactory(_root, provider);
        using var client = factory.CreateClient();
        var repository = factory.Services.GetRequiredService<JsonDeviceRepository>();
        var profiles = factory.Services.GetRequiredService<JsonRegionProfileRepository>();
        var old = (await profiles.GetConfigurationAsync()).ActiveProfileId;
        var other = await profiles.CreateAsync(new CreateRegionProfileRequest { Name = "Activation gap" });
        await profiles.SetActiveAsync(old);
        await repository.ReloadAsync();
        var row = (await repository.GetConfigurationAsync()).Devices[0];
        await profiles.SetActiveAsync(other.ActiveProfileId);
        var response = await client.PostAsJsonAsync("/api/config/devices/0", row);
        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    [Fact]
    public async Task RealRepositoryNotesWrite_SurvivesShortWindowsSharingConflict()
    {
        using var factory = new NetWatchApplicationFactory(_root);
        using var client = factory.CreateClient();
        var configuration = JsonNode.Parse("""{"devices":[{"name":"Desk","ip":"127.0.0.1","checks":[{"type":"ping"}]}]}""")!;
        (await client.PostAsJsonAsync("/api/config", configuration)).EnsureSuccessStatusCode();
        var path = await factory.Services.GetRequiredService<JsonRegionProfileRepository>().GetActiveDeviceFilePathAsync();
        using var reader = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.Read);
        configuration["devices"]![0]!["notes"] = "Saved after reader releases";
        var save = client.PostAsJsonAsync("/api/config", configuration);
        await Task.Delay(100);
        reader.Dispose();
        using var response = await save;
        Assert.True(response.IsSuccessStatusCode, await response.Content.ReadAsStringAsync());
        Assert.Equal("Saved after reader releases", JsonNode.Parse(await client.GetStringAsync("/api/config"))!["devices"]![0]!["notes"]!.GetValue<string>());
    }

    public void Dispose()
    {
        if (Directory.Exists(_root)) Directory.Delete(_root, recursive: true);
    }
}
