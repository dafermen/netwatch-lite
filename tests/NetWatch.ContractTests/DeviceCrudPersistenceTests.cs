using System.Net;
using System.Net.Http.Json;
using System.Text.Json.Nodes;

namespace NetWatch.ContractTests;

public sealed class DeviceCrudPersistenceTests : IDisposable
{
    private readonly string _root = Path.Combine(Path.GetTempPath(), "netwatch-device-crud", Guid.NewGuid().ToString("N"));

    [Theory]
    [InlineData("json")]
    [InlineData("sqlite")]
    public async Task UrlCreateEditCopyRejectRestartAndDelete_PreserveTheSavedInventory(string provider)
    {
        string? originalId = null;
        using (var factory = new NetWatchApplicationFactory(_root, provider))
        using (var client = factory.CreateClient())
        {
            var config = JsonNode.Parse("""
                {"devices":[{"name":"URL original","ip":"example.invalid","deviceType":"other",
                "location":"Preserved location","command":"echo synthetic","notes":"Original notes",
                "checks":[{"type":"http","url":"https://example.invalid/health","timeoutMs":10000,"expectedStatusCode":200}]}]}
                """)!;
            (await client.PostAsJsonAsync("/api/config", config)).EnsureSuccessStatusCode();
            if (provider == "sqlite")
                originalId = (await ReadAsync(client, "/api/inventory/query"))["records"]![0]!["id"]!.GetValue<string>();

            config = await ReadAsync(client, "/api/config/export");
            var original = config["devices"]![0]!;
            original["name"] = "URL renamed";
            original["checks"]![0]!["url"] = "https://example.invalid/ready";
            (await client.PostAsJsonAsync("/api/config/devices/0", original)).EnsureSuccessStatusCode();
            config = await ReadAsync(client, "/api/config/export");
            var copy = config["devices"]![0]!.DeepClone();
            copy["name"] = "URL copy";
            copy["checks"]![0]!["expectedText"] = "READY";
            config["devices"]!.AsArray().Add(copy);
            (await client.PostAsJsonAsync("/api/config", config)).EnsureSuccessStatusCode();
            var beforeRejection = await client.GetStringAsync("/api/config/export");
            config["devices"]![1]!["checks"]![0]!["timeoutMs"] = 1;
            Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsJsonAsync("/api/config", config)).StatusCode);
            Assert.Equal(beforeRejection, await client.GetStringAsync("/api/config/export"));
            Assert.Empty((await ReadAsync(client, "/api/history"))["runs"]!.AsArray());
        }
        using (var restarted = new NetWatchApplicationFactory(_root, provider))
        using (var client = restarted.CreateClient())
        {
            var config = await ReadAsync(client, "/api/config/export");
            var devices = config["devices"]!.AsArray();
            Assert.Equal(2, devices.Count);
            Assert.Equal("URL renamed", devices[0]!["name"]!.GetValue<string>());
            Assert.Equal("https://example.invalid/ready", devices[0]!["checks"]![0]!["url"]!.GetValue<string>());
            Assert.Null(devices[0]!["checks"]![0]!["expectedText"]);
            Assert.Equal("READY", devices[1]!["checks"]![0]!["expectedText"]!.GetValue<string>());
            Assert.Equal("Preserved location", devices[1]!["location"]!.GetValue<string>());
            Assert.Equal("echo synthetic", devices[1]!["command"]!.GetValue<string>());
            if (provider == "sqlite")
            {
                var rows = (await ReadAsync(client, "/api/inventory/query"))["records"]!.AsArray();
                Assert.Equal(2, rows.Count);
                Assert.Equal(originalId, rows[0]!["id"]!.GetValue<string>());
                Assert.NotEqual(originalId, rows[1]!["id"]!.GetValue<string>());
            }
            devices.RemoveAt(1);
            (await client.PostAsJsonAsync("/api/config", config)).EnsureSuccessStatusCode();
            (await client.PostAsync("/api/reload", null)).EnsureSuccessStatusCode();
            Assert.Single((await ReadAsync(client, "/api/config"))["devices"]!.AsArray());
            if (provider == "sqlite")
            {
                var rows = (await ReadAsync(client, "/api/inventory/query"))["records"]!.AsArray();
                Assert.Equal(originalId, Assert.Single(rows)!["id"]!.GetValue<string>());
                Assert.Contains("URL copy", await client.GetStringAsync("/api/storage/audit"));
            }
        }
    }

    private static async Task<JsonNode> ReadAsync(HttpClient client, string path) =>
        JsonNode.Parse(await client.GetStringAsync(path))!;

    public void Dispose()
    {
        if (Directory.Exists(_root)) Directory.Delete(_root, recursive: true);
    }
}
