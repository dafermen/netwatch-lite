using System.Net;
using System.Net.Http.Json;
using System.Text.Json.Nodes;

namespace NetWatch.ContractTests;

public sealed class DeviceCommandTests
{
    private const string Command = "\"C:\\Program Files\\Remote Client\\guest.exe\" \"desk.example.test\"";

    private static JsonNode Inventory(string? command = null)
    {
        var body = JsonNode.Parse("""{"devices":[{"name":"Desk","ip":"127.0.0.1","checks":[{"type":"ping"}]}]}""")!;
        if (command is not null) body["devices"]![0]!["command"] = command;
        return body;
    }

    [Fact]
    public async Task LegacyBlankAndMaximumCommands_RemainCompatible()
    {
        using var factory = new NetWatchApplicationFactory();
        using var client = factory.CreateClient();
        foreach (var value in new[] { null, "", "  ", new string('x', 4096) })
        {
            (await client.PostAsJsonAsync("/api/config", Inventory(value))).EnsureSuccessStatusCode();
            var saved = JsonNode.Parse(await client.GetStringAsync("/api/config"))!;
            Assert.Equal(string.IsNullOrWhiteSpace(value) ? null : value, saved["devices"]![0]!["command"]?.GetValue<string>());
        }
    }

    [Fact]
    public async Task Command_SurvivesReloadRowSaveExportImportAndProfileCopy()
    {
        using var factory = new NetWatchApplicationFactory();
        using var client = factory.CreateClient();
        (await client.PostAsJsonAsync("/api/config", Inventory("  " + Command + "  "))).EnsureSuccessStatusCode();
        (await client.PostAsync("/api/reload", null)).EnsureSuccessStatusCode();
        var saved = JsonNode.Parse(await client.GetStringAsync("/api/config"))!;
        Assert.Equal(Command, saved["devices"]![0]!["command"]!.GetValue<string>());
        saved["devices"]![0]!["name"] = "Renamed desk";
        (await client.PostAsJsonAsync("/api/config/devices/0", saved["devices"]![0])).EnsureSuccessStatusCode();
        var exported = await client.GetStringAsync("/api/config/export");
        Assert.Equal(Command, JsonNode.Parse(exported)!["devices"]![0]!["command"]!.GetValue<string>());
        using var form = new MultipartFormDataContent();
        form.Add(new StringContent(exported), "configFile", "commands.json");
        (await client.PostAsync("/api/config/import", form)).EnsureSuccessStatusCode();
        (await client.PostAsJsonAsync("/api/regions", new { name = "Copied commands", copyFromActive = true })).EnsureSuccessStatusCode();
        var copied = JsonNode.Parse(await client.GetStringAsync("/api/config"))!;
        Assert.Equal(Command, copied["devices"]![0]!["command"]!.GetValue<string>());
    }

    [Fact]
    public async Task ClearingCommand_DoesNotChangeOtherFields()
    {
        using var factory = new NetWatchApplicationFactory();
        using var client = factory.CreateClient();
        (await client.PostAsJsonAsync("/api/config", Inventory(Command))).EnsureSuccessStatusCode();
        var row = JsonNode.Parse(await client.GetStringAsync("/api/config"))!["devices"]![0]!;
        row["command"] = null;
        (await client.PostAsJsonAsync("/api/config/devices/0", row)).EnsureSuccessStatusCode();
        var saved = JsonNode.Parse(await client.GetStringAsync("/api/config"))!["devices"]![0]!;
        Assert.Null(saved["command"]);
        Assert.True(JsonNode.DeepEquals(row, saved));
    }

    [Fact]
    public async Task Command_IsConfigurationOnlyAndNotCopiedToMonitoringOrHistory()
    {
        using var factory = new NetWatchApplicationFactory();
        using var client = factory.CreateClient();
        (await client.PostAsJsonAsync("/api/config", Inventory(Command))).EnsureSuccessStatusCode();
        var response = await client.PostAsync("/api/monitor/run", null);
        response.EnsureSuccessStatusCode();
        var result = JsonNode.Parse(await response.Content.ReadAsStringAsync())!;
        Assert.Null(result["results"]![0]!["command"]);
        var history = JsonNode.Parse(await client.GetStringAsync("/api/history"))!;
        Assert.Null(history["runs"]![0]!["results"]![0]!["command"]);
        Assert.Equal(Command, JsonNode.Parse(await client.GetStringAsync("/api/config"))!["devices"]![0]!["command"]!.GetValue<string>());
    }

    public static IEnumerable<object[]> InvalidCommands()
    {
        foreach (var command in new[] { new string('x', 4097), "before\nafter", "before\rafter", "before\tafter",
                     "before\0after", "before\u001bafter", "before\u2028after", "before\u2029after" })
            foreach (var endpoint in new[] { "full", "row", "import" }) yield return [command, endpoint];
    }

    [Theory]
    [MemberData(nameof(InvalidCommands))]
    public async Task InvalidCommand_IsRejectedWithoutReplacingConfiguration(string command, string endpoint)
    {
        using var factory = new NetWatchApplicationFactory();
        using var client = factory.CreateClient();
        (await client.PostAsJsonAsync("/api/config", Inventory(Command))).EnsureSuccessStatusCode();
        var before = await client.GetStringAsync("/api/config/export");
        var candidate = Inventory(command);
        HttpResponseMessage response;
        if (endpoint == "import")
        {
            using var form = new MultipartFormDataContent();
            form.Add(new StringContent(candidate.ToJsonString()), "configFile", "invalid-command.json");
            response = await client.PostAsync("/api/config/import", form);
        }
        else response = await client.PostAsJsonAsync(endpoint == "row" ? "/api/config/devices/0" : "/api/config",
            endpoint == "row" ? candidate["devices"]![0] : candidate);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(before, await client.GetStringAsync("/api/config/export"));
    }
}
