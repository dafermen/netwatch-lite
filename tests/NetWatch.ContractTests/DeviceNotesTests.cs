using System.Net;
using System.Net.Http.Json;
using System.Text.Json.Nodes;

namespace NetWatch.ContractTests;

public sealed class DeviceNotesTests
{
    private const string Notes = "Location: Floor 2 - Reception\nUsed by: Front desk\t<not markup> & \"quotes\"";

    private static JsonNode Inventory(string? notes = null)
    {
        var body = JsonNode.Parse("""{"devices":[{"name":"Notes desk","ip":"127.0.0.1","checks":[{"type":"ping"}]}]}""")!;
        if (notes is not null) body["devices"]![0]!["notes"] = notes;
        return body;
    }

    [Fact]
    public async Task LegacyNullBlankMultilineAndMaximumNotes_RemainCompatible()
    {
        using var factory = new NetWatchApplicationFactory();
        using var client = factory.CreateClient();
        foreach (var value in new[] { null, "", " \r\n\t ", Notes, new string('\u00e1', 2000), "Line 1\r\nLine 2" })
        {
            var body = Inventory(value);
            using var response = await client.PostAsJsonAsync("/api/config", body);
            Assert.True(response.IsSuccessStatusCode,
                $"Configuration save returned {(int)response.StatusCode}: {await response.Content.ReadAsStringAsync()}");
            var saved = JsonNode.Parse(await client.GetStringAsync("/api/config"))!;
            Assert.Equal(string.IsNullOrWhiteSpace(value) ? null : value,
                saved["devices"]![0]!["notes"]?.GetValue<string>());
        }
        var explicitNull = Inventory(Notes);
        explicitNull["devices"]![0]!["notes"] = null;
        (await client.PostAsJsonAsync("/api/config", explicitNull)).EnsureSuccessStatusCode();
        Assert.Null(JsonNode.Parse(await client.GetStringAsync("/api/config"))!["devices"]![0]!["notes"]);
    }

    [Fact]
    public async Task Notes_SurviveReloadRowSaveExportImportAndProfileCopy()
    {
        using var factory = new NetWatchApplicationFactory();
        using var client = factory.CreateClient();
        (await client.PostAsJsonAsync("/api/config", Inventory(" \r\n" + Notes + "\t "))).EnsureSuccessStatusCode();
        (await client.PostAsync("/api/reload", null)).EnsureSuccessStatusCode();
        var saved = JsonNode.Parse(await client.GetStringAsync("/api/config"))!;
        Assert.Equal(Notes, saved["devices"]![0]!["notes"]!.GetValue<string>());
        saved["devices"]![0]!["name"] = "Renamed notes desk";
        (await client.PostAsJsonAsync("/api/config/devices/0", saved["devices"]![0])).EnsureSuccessStatusCode();
        var exported = await client.GetStringAsync("/api/config/export");
        Assert.Equal(Notes, JsonNode.Parse(exported)!["devices"]![0]!["notes"]!.GetValue<string>());
        using var form = new MultipartFormDataContent();
        form.Add(new StringContent(exported), "configFile", "notes.json");
        (await client.PostAsync("/api/config/import", form)).EnsureSuccessStatusCode();
        (await client.PostAsJsonAsync("/api/regions", new { name = "Copied notes", copyFromActive = true })).EnsureSuccessStatusCode();
        var copied = JsonNode.Parse(await client.GetStringAsync("/api/config"))!;
        Assert.Equal(Notes, copied["devices"]![0]!["notes"]!.GetValue<string>());
    }

    [Fact]
    public async Task ClearingNotes_DoesNotChangeOtherFields()
    {
        using var factory = new NetWatchApplicationFactory();
        using var client = factory.CreateClient();
        (await client.PostAsJsonAsync("/api/config", Inventory(Notes))).EnsureSuccessStatusCode();
        var row = JsonNode.Parse(await client.GetStringAsync("/api/config"))!["devices"]![0]!;
        row["notes"] = null;
        (await client.PostAsJsonAsync("/api/config/devices/0", row)).EnsureSuccessStatusCode();
        var saved = JsonNode.Parse(await client.GetStringAsync("/api/config"))!["devices"]![0]!;
        Assert.Null(saved["notes"]);
        Assert.True(JsonNode.DeepEquals(row, saved));
    }

    [Fact]
    public async Task Notes_AreConfigurationOnlyAndNotCopiedToMonitoringOrHistory()
    {
        using var factory = new NetWatchApplicationFactory();
        using var client = factory.CreateClient();
        (await client.PostAsJsonAsync("/api/config", Inventory(Notes))).EnsureSuccessStatusCode();
        var response = await client.PostAsync("/api/monitor/run", null);
        response.EnsureSuccessStatusCode();
        var result = JsonNode.Parse(await response.Content.ReadAsStringAsync())!;
        Assert.Null(result["results"]![0]!["notes"]);
        var history = JsonNode.Parse(await client.GetStringAsync("/api/history"))!;
        Assert.Null(history["runs"]![0]!["results"]![0]!["notes"]);
        Assert.Equal(Notes, JsonNode.Parse(await client.GetStringAsync("/api/config"))!["devices"]![0]!["notes"]!.GetValue<string>());
    }

    public static IEnumerable<object[]> InvalidNotes()
    {
        foreach (var notes in new[] { new string('x', 2001), new string(' ', 2001), "before\0after",
                     "before\u001bafter", "before\vafter", "before\u007fafter", "before\u0085after" })
            foreach (var endpoint in new[] { "full", "row", "import" }) yield return [notes, endpoint];
    }

    [Theory]
    [MemberData(nameof(InvalidNotes))]
    public async Task InvalidNotes_AreRejectedWithoutReplacingConfiguration(string notes, string endpoint)
    {
        using var factory = new NetWatchApplicationFactory();
        using var client = factory.CreateClient();
        (await client.PostAsJsonAsync("/api/config", Inventory(Notes))).EnsureSuccessStatusCode();
        var before = await client.GetStringAsync("/api/config/export");
        var candidate = Inventory(notes);
        HttpResponseMessage response;
        if (endpoint == "import")
        {
            using var form = new MultipartFormDataContent();
            form.Add(new StringContent(candidate.ToJsonString()), "configFile", "invalid-notes.json");
            response = await client.PostAsync("/api/config/import", form);
        }
        else response = await client.PostAsJsonAsync(endpoint == "row" ? "/api/config/devices/0" : "/api/config",
            endpoint == "row" ? candidate["devices"]![0] : candidate);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(before, await client.GetStringAsync("/api/config/export"));
    }
}
