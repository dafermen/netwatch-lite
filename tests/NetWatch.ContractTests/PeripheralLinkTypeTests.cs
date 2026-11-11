using System.Net;
using System.Net.Http.Json;
using System.Text.Json.Nodes;

namespace NetWatch.ContractTests;

public sealed class PeripheralLinkTypeTests
{
    private static JsonNode Inventory() => JsonNode.Parse("""
        {
          "peripheralCatalog":[
            {"id":"printer-a","kind":"printer","manufacturer":"Example","model":"Laser A"},
            {"id":"scanner-a","kind":"scanner","manufacturer":"Example","model":"Scan A"}
          ],
          "devices":[{
            "name":"Link desk","ip":"127.0.0.1","deviceType":"workstation","checks":[{"type":"ping"}],
            "workstationPeripherals":{
              "printers":{"status":"assigned","items":[{"modelId":"printer-a","connection":"network","address":"printer.example.test","identifier":"PRN-A","notes":"Printer notes"}]},
              "scanners":{"status":"assigned","items":[{"modelId":"scanner-a","connection":"usb","identifier":"SCAN-A","notes":"Scanner notes"}]}
            }
          }]
        }
        """)!;

    private static JsonNode Item(JsonNode inventory, string group) =>
        inventory["devices"]![0]!["workstationPeripherals"]![group]!["items"]![0]!;

    [Fact]
    public async Task MissingNullBlankAndCaseVariants_NormalizeWithoutInferringFromConnection()
    {
        using var factory = new NetWatchApplicationFactory();
        using var client = factory.CreateClient();
        foreach (var value in new[] { null, "", "  ", "unrecorded", " WIRELESS ", " CABLED " })
        {
            var inventory = Inventory();
            foreach (var group in new[] { "printers", "scanners" })
                if (value is not null) Item(inventory, group)["linkType"] = value;
            (await client.PostAsJsonAsync("/api/config", inventory)).EnsureSuccessStatusCode();
            var saved = JsonNode.Parse(await client.GetStringAsync("/api/config"))!;
            var expected = string.IsNullOrWhiteSpace(value) ? "unrecorded" : value.Trim().ToLowerInvariant();
            foreach (var group in new[] { "printers", "scanners" })
                Assert.Equal(expected, Item(saved, group)["linkType"]!.GetValue<string>());
            Assert.Equal("network", Item(saved, "printers")["connection"]!.GetValue<string>());
            Assert.Equal("printer.example.test", Item(saved, "printers")["address"]!.GetValue<string>());
            Assert.Equal("usb", Item(saved, "scanners")["connection"]!.GetValue<string>());
        }
        var explicitNull = Inventory();
        Item(explicitNull, "printers")["linkType"] = null;
        Item(explicitNull, "scanners")["linkType"] = null;
        (await client.PostAsJsonAsync("/api/config", explicitNull)).EnsureSuccessStatusCode();
        var restored = JsonNode.Parse(await client.GetStringAsync("/api/config"))!;
        Assert.Equal("unrecorded", Item(restored, "printers")["linkType"]!.GetValue<string>());
        Assert.Equal("unrecorded", Item(restored, "scanners")["linkType"]!.GetValue<string>());
    }

    [Fact]
    public async Task IndependentLinks_SurviveReloadRowSaveJsonRoundTripAndProfileCopy()
    {
        using var factory = new NetWatchApplicationFactory();
        using var client = factory.CreateClient();
        var inventory = Inventory();
        Item(inventory, "printers")["linkType"] = "wireless";
        Item(inventory, "scanners")["linkType"] = "cabled";
        (await client.PostAsJsonAsync("/api/config", inventory)).EnsureSuccessStatusCode();
        (await client.PostAsync("/api/reload", null)).EnsureSuccessStatusCode();
        var saved = JsonNode.Parse(await client.GetStringAsync("/api/config"))!;
        var peripherals = saved["devices"]![0]!["workstationPeripherals"]!.DeepClone();
        saved["devices"]![0]!["name"] = "Renamed link desk";
        (await client.PostAsJsonAsync("/api/config/devices/0", saved["devices"]![0])).EnsureSuccessStatusCode();
        var exported = await client.GetStringAsync("/api/config/export");
        using var form = new MultipartFormDataContent();
        form.Add(new StringContent(exported), "configFile", "links.json");
        (await client.PostAsync("/api/config/import", form)).EnsureSuccessStatusCode();
        (await client.PostAsJsonAsync("/api/regions", new { name = "Copied links", copyFromActive = true })).EnsureSuccessStatusCode();
        var copied = JsonNode.Parse(await client.GetStringAsync("/api/config"))!;
        Assert.True(JsonNode.DeepEquals(peripherals, copied["devices"]![0]!["workstationPeripherals"]));
    }

    [Fact]
    public async Task ClearingLink_DoesNotChangeConnectionAddressOrOtherAssignmentFields()
    {
        using var factory = new NetWatchApplicationFactory();
        using var client = factory.CreateClient();
        var inventory = Inventory();
        Item(inventory, "printers")["linkType"] = "wireless";
        (await client.PostAsJsonAsync("/api/config", inventory)).EnsureSuccessStatusCode();
        var saved = JsonNode.Parse(await client.GetStringAsync("/api/config"))!;
        Item(saved, "printers")["linkType"] = "unrecorded";
        (await client.PostAsJsonAsync("/api/config/devices/0", saved["devices"]![0])).EnsureSuccessStatusCode();
        Assert.True(JsonNode.DeepEquals(saved, JsonNode.Parse(await client.GetStringAsync("/api/config"))));
    }

    [Fact]
    public async Task RecordedLink_DoesNotEnterMonitoringResultsOrHistory()
    {
        using var factory = new NetWatchApplicationFactory();
        using var client = factory.CreateClient();
        var inventory = Inventory();
        Item(inventory, "printers")["linkType"] = "wireless";
        (await client.PostAsJsonAsync("/api/config", inventory)).EnsureSuccessStatusCode();
        var response = await client.PostAsync("/api/monitor/run", null);
        response.EnsureSuccessStatusCode();
        Assert.DoesNotContain("linkType", await response.Content.ReadAsStringAsync());
        Assert.DoesNotContain("linkType", await client.GetStringAsync("/api/history"));
    }

    public static IEnumerable<object[]> InvalidLinks()
    {
        foreach (var group in new[] { "printers", "scanners" })
            foreach (var value in new[] { "wired", "wifi", "bluetooth", "<script>bad</script>" })
                foreach (var endpoint in new[] { "full", "row", "import" }) yield return [group, value, endpoint];
    }

    [Theory]
    [MemberData(nameof(InvalidLinks))]
    public async Task InvalidLink_IsRejectedWithoutReplacingData(string group, string value, string endpoint)
    {
        using var factory = new NetWatchApplicationFactory();
        using var client = factory.CreateClient();
        (await client.PostAsJsonAsync("/api/config", Inventory())).EnsureSuccessStatusCode();
        var before = await client.GetStringAsync("/api/config/export");
        var candidate = Inventory();
        Item(candidate, group)["linkType"] = value;
        HttpResponseMessage response;
        if (endpoint == "import")
        {
            using var form = new MultipartFormDataContent();
            form.Add(new StringContent(candidate.ToJsonString()), "configFile", "invalid-links.json");
            response = await client.PostAsync("/api/config/import", form);
        }
        else response = await client.PostAsJsonAsync(endpoint == "row" ? "/api/config/devices/0" : "/api/config",
            endpoint == "row" ? candidate["devices"]![0] : candidate);
        using (response) Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(before, await client.GetStringAsync("/api/config/export"));
    }
}
