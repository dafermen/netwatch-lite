using System.Net;
using System.Net.Http.Json;
using System.Text.Json.Nodes;

namespace NetWatch.ContractTests;

public sealed class DeviceLocationTests
{
    private const string Location = "Floor 2 - Office 204 <not markup> & \"quotes\"";
    private const string Notes = "Existing observations\nLocation: keep this legacy note";

    private static JsonNode Inventory(string? location = null)
    {
        var body = JsonNode.Parse("""{"devices":[{"name":"Location desk","ip":"127.0.0.1","facility":"Site A","checks":[{"type":"ping"}]}]}""")!;
        body["devices"]![0]!["notes"] = Notes;
        if (location is not null) body["devices"]![0]!["location"] = location;
        return body;
    }

    [Fact]
    public async Task LegacyNullBlankAndMaximumLocations_PreserveFacilityAndNotes()
    {
        using var factory = new NetWatchApplicationFactory();
        using var client = factory.CreateClient();
        foreach (var value in new[] { null, "", "  ", Location, new string('\u00f3', 200) })
        {
            (await client.PostAsJsonAsync("/api/config", Inventory(value))).EnsureSuccessStatusCode();
            var saved = JsonNode.Parse(await client.GetStringAsync("/api/config"))!["devices"]![0]!;
            Assert.Equal(string.IsNullOrWhiteSpace(value) ? null : value, saved["location"]?.GetValue<string>());
            Assert.Equal("Site A", saved["facility"]!.GetValue<string>());
            Assert.Equal(Notes, saved["notes"]!.GetValue<string>());
        }
        var explicitNull = Inventory(Location);
        explicitNull["devices"]![0]!["location"] = null;
        (await client.PostAsJsonAsync("/api/config", explicitNull)).EnsureSuccessStatusCode();
        Assert.Null(JsonNode.Parse(await client.GetStringAsync("/api/config"))!["devices"]![0]!["location"]);
    }

    [Fact]
    public async Task Location_SurvivesReloadRowSaveExportImportAndProfileCopy()
    {
        using var factory = new NetWatchApplicationFactory();
        using var client = factory.CreateClient();
        (await client.PostAsJsonAsync("/api/config", Inventory("  " + Location + "  "))).EnsureSuccessStatusCode();
        (await client.PostAsync("/api/reload", null)).EnsureSuccessStatusCode();
        var saved = JsonNode.Parse(await client.GetStringAsync("/api/config"))!;
        Assert.Equal(Location, saved["devices"]![0]!["location"]!.GetValue<string>());
        saved["devices"]![0]!["name"] = "Renamed location desk";
        (await client.PostAsJsonAsync("/api/config/devices/0", saved["devices"]![0])).EnsureSuccessStatusCode();
        var exported = await client.GetStringAsync("/api/config/export");
        Assert.Equal(Location, JsonNode.Parse(exported)!["devices"]![0]!["location"]!.GetValue<string>());
        using var form = new MultipartFormDataContent();
        form.Add(new StringContent(exported), "configFile", "locations.json");
        (await client.PostAsync("/api/config/import", form)).EnsureSuccessStatusCode();
        (await client.PostAsJsonAsync("/api/regions", new { name = "Copied locations", copyFromActive = true })).EnsureSuccessStatusCode();
        var copied = JsonNode.Parse(await client.GetStringAsync("/api/config"))!["devices"]![0]!;
        Assert.Equal(Location, copied["location"]!.GetValue<string>());
        Assert.Equal(Notes, copied["notes"]!.GetValue<string>());
    }

    [Fact]
    public async Task ClearingLocation_DoesNotChangeNotesFacilityOrOtherFields()
    {
        using var factory = new NetWatchApplicationFactory();
        using var client = factory.CreateClient();
        (await client.PostAsJsonAsync("/api/config", Inventory(Location))).EnsureSuccessStatusCode();
        var row = JsonNode.Parse(await client.GetStringAsync("/api/config"))!["devices"]![0]!;
        row["location"] = null;
        (await client.PostAsJsonAsync("/api/config/devices/0", row)).EnsureSuccessStatusCode();
        var saved = JsonNode.Parse(await client.GetStringAsync("/api/config"))!["devices"]![0]!;
        Assert.Null(saved["location"]);
        Assert.True(JsonNode.DeepEquals(row, saved));
    }

    [Fact]
    public async Task Location_IsConfigurationOnlyAndDoesNotEnterMonitoringOrHistory()
    {
        using var factory = new NetWatchApplicationFactory();
        using var client = factory.CreateClient();
        (await client.PostAsJsonAsync("/api/config", Inventory(Location))).EnsureSuccessStatusCode();
        var response = await client.PostAsync("/api/monitor/run", null);
        response.EnsureSuccessStatusCode();
        var result = JsonNode.Parse(await response.Content.ReadAsStringAsync())!;
        Assert.False(result["results"]![0]!.AsObject().ContainsKey("location"));
        var history = JsonNode.Parse(await client.GetStringAsync("/api/history"))!;
        Assert.False(history["runs"]![0]!["results"]![0]!.AsObject().ContainsKey("location"));
        Assert.Equal(Location, JsonNode.Parse(await client.GetStringAsync("/api/config"))!["devices"]![0]!["location"]!.GetValue<string>());
    }

    public static IEnumerable<object[]> InvalidLocations()
    {
        foreach (var location in new[] { new string('x', 201), new string(' ', 201), "before\nafter", "before\rafter",
                     "before\tafter", "before\0after", "before\u001bafter", "before\u0085after", "before\u2028after", "before\u2029after" })
            foreach (var endpoint in new[] { "full", "row", "import" }) yield return [location, endpoint];
    }

    [Theory]
    [MemberData(nameof(InvalidLocations))]
    public async Task InvalidLocation_IsRejectedWithoutReplacingConfiguration(string location, string endpoint)
    {
        using var factory = new NetWatchApplicationFactory();
        using var client = factory.CreateClient();
        (await client.PostAsJsonAsync("/api/config", Inventory(Location))).EnsureSuccessStatusCode();
        var before = await client.GetStringAsync("/api/config/export");
        var candidate = Inventory(location);
        HttpResponseMessage response;
        if (endpoint == "import")
        {
            using var form = new MultipartFormDataContent();
            form.Add(new StringContent(candidate.ToJsonString()), "configFile", "invalid-location.json");
            response = await client.PostAsync("/api/config/import", form);
        }
        else response = await client.PostAsJsonAsync(endpoint == "row" ? "/api/config/devices/0" : "/api/config",
            endpoint == "row" ? candidate["devices"]![0] : candidate);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(before, await client.GetStringAsync("/api/config/export"));
    }
}
