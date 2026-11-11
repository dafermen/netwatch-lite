using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Nodes;
using NetWatch.Models;

namespace NetWatch.ContractTests;

public sealed class DeviceTypeCatalogTests
{
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    private static JsonNode Inventory()
    {
        var body = JsonNode.Parse("""
            {"devices":[
              {"name":"Desk","ip":"127.0.0.1","deviceType":"workstation","checks":[{"type":"ping"}],
               "workstationPeripherals":{"printers":{"status":"none","items":[]},"scanners":{"status":"unrecorded","items":[]}}},
              {"name":"Portal","ip":"127.0.0.1","deviceType":"web-app","enabled":false,"checks":[{"type":"http","url":"http://127.0.0.1:9/health","expectedText":"READY"}]}
            ]}
            """)!;
        body["deviceTypes"] = JsonSerializer.SerializeToNode(DeviceTypeDefinition.CreateDefaults()
            .Append(new DeviceTypeDefinition { Id = "web-app", Name = "Web application" }), Json);
        return body;
    }

    private static async Task<DeviceTypeCatalogSnapshot> Snapshot(HttpClient client) =>
        (await client.GetFromJsonAsync<DeviceTypeCatalogSnapshot>("/api/device-types"))!;

    private static Task<HttpResponseMessage> Save(HttpClient client, DeviceTypeCatalogSnapshot snapshot,
        IEnumerable<DeviceTypeDefinition> types) => client.PostAsJsonAsync("/api/device-types", new UpdateDeviceTypesRequest
        { ProfileId = snapshot.ProfileId, Version = snapshot.Version, DeviceTypes = types.ToList() });

    [Fact]
    public async Task LegacyInventory_GetsDefaultsWithoutReclassifyingOrRewritingDevices()
    {
        using var factory = new NetWatchApplicationFactory();
        using var client = factory.CreateClient();
        var legacy = JsonNode.Parse("""{"devices":[{"name":"Legacy","ip":"127.0.0.1","category":"Workstations","checks":[{"type":"ping"}]}]}""")!;
        (await client.PostAsJsonAsync("/api/config", legacy)).EnsureSuccessStatusCode();
        var before = await client.GetStringAsync("/api/config/export");
        var snapshot = await Snapshot(client);
        Assert.Equal(5, snapshot.DeviceTypes.Count);
        Assert.Contains("workstation", snapshot.ProtectedIds);
        Assert.Equal(1, snapshot.Usage["unspecified"]);
        Assert.Equal(0, snapshot.Usage["workstation"]);
        Assert.Equal(before, await client.GetStringAsync("/api/config/export"));
        Assert.Null(JsonSerializer.SerializeToNode(snapshot, Json)!["file"]);
    }

    [Fact]
    public async Task RenameInUseCustomType_KeepsIdDisabledDevicesChecksAndPeripheralData()
    {
        using var factory = new NetWatchApplicationFactory();
        using var client = factory.CreateClient();
        (await client.PostAsJsonAsync("/api/config", Inventory())).EnsureSuccessStatusCode();
        var before = JsonNode.Parse(await client.GetStringAsync("/api/config/export"))!;
        var snapshot = await Snapshot(client);
        Assert.Equal(1, snapshot.Usage["web-app"]);
        (await Save(client, snapshot, snapshot.DeviceTypes.Select(type => type.Id == "web-app"
            ? new DeviceTypeDefinition { Id = type.Id, Name = "Web portal" } : type))).EnsureSuccessStatusCode();
        var saved = JsonNode.Parse(await client.GetStringAsync("/api/config/export"))!;
        Assert.True(JsonNode.DeepEquals(before["devices"], saved["devices"]));
        Assert.True(JsonNode.DeepEquals(before["peripheralCatalog"], saved["peripheralCatalog"]));
        Assert.NotEqual(snapshot.Version, (await Snapshot(client)).Version);
    }

    [Fact]
    public async Task InUseDeletion_IsRejectedAndUnusedDeletionSucceeds()
    {
        using var factory = new NetWatchApplicationFactory();
        using var client = factory.CreateClient();
        (await client.PostAsJsonAsync("/api/config", Inventory())).EnsureSuccessStatusCode();
        var snapshot = await Snapshot(client);
        var before = await client.GetStringAsync("/api/config/export");
        Assert.Equal(HttpStatusCode.BadRequest, (await Save(client, snapshot, snapshot.DeviceTypes.Where(type => type.Id != "web-app"))).StatusCode);
        Assert.Equal(before, await client.GetStringAsync("/api/config/export"));
        (await Save(client, snapshot, snapshot.DeviceTypes.Append(new DeviceTypeDefinition { Id = "spare", Name = "Spare type" }))).EnsureSuccessStatusCode();
        snapshot = await Snapshot(client);
        (await Save(client, snapshot, snapshot.DeviceTypes.Where(type => type.Id != "spare"))).EnsureSuccessStatusCode();
        Assert.DoesNotContain((await Snapshot(client)).DeviceTypes, type => type.Id == "spare");
    }

    public static IEnumerable<object[]> ProtectedCases() => DeviceTypeDefinition.CreateDefaults()
        .SelectMany(type => new[] { new object[] { type.Id, false }, new object[] { type.Id, true } });

    [Theory]
    [MemberData(nameof(ProtectedCases))]
    public async Task SystemTypes_CannotBeRemovedOrRenamed(string id, bool rename)
    {
        using var factory = new NetWatchApplicationFactory();
        using var client = factory.CreateClient();
        var snapshot = await Snapshot(client);
        var before = await client.GetStringAsync("/api/config/export");
        var types = rename ? snapshot.DeviceTypes.Select(type => type.Id == id
            ? new DeviceTypeDefinition { Id = id, Name = "Repurposed type" } : type)
            : snapshot.DeviceTypes.Where(type => type.Id != id);
        var response = await Save(client, snapshot, types);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Contains("protected", await response.Content.ReadAsStringAsync());
        Assert.Equal(before, await client.GetStringAsync("/api/config/export"));
    }

    [Fact]
    public async Task CatalogOnlySave_UsesFreshInventoryRatherThanOldEditorSnapshot()
    {
        using var factory = new NetWatchApplicationFactory();
        using var client = factory.CreateClient();
        (await client.PostAsJsonAsync("/api/config", Inventory())).EnsureSuccessStatusCode();
        var snapshot = await Snapshot(client);
        var configuration = JsonNode.Parse(await client.GetStringAsync("/api/config"))!;
        configuration["devices"]![0]!["name"] = "Desk changed in another editor";
        (await client.PostAsJsonAsync("/api/config/devices/0", configuration["devices"]![0])).EnsureSuccessStatusCode();
        var latest = JsonNode.Parse(await client.GetStringAsync("/api/config/export"))!;
        (await Save(client, snapshot, snapshot.DeviceTypes.Append(new DeviceTypeDefinition { Id = "camera", Name = "Camera" }))).EnsureSuccessStatusCode();
        var saved = JsonNode.Parse(await client.GetStringAsync("/api/config/export"))!;
        Assert.True(JsonNode.DeepEquals(latest["devices"], saved["devices"]));
        Assert.Equal(7, saved["deviceTypes"]!.AsArray().Count);
    }

    [Fact]
    public async Task NewAssignmentAfterCatalogRead_PreventsDeletionEvenWithMatchingVersion()
    {
        using var factory = new NetWatchApplicationFactory();
        using var client = factory.CreateClient();
        (await client.PostAsJsonAsync("/api/config", Inventory())).EnsureSuccessStatusCode();
        var initial = await Snapshot(client);
        (await Save(client, initial, initial.DeviceTypes.Append(new DeviceTypeDefinition { Id = "camera", Name = "Camera" }))).EnsureSuccessStatusCode();
        var snapshot = await Snapshot(client);
        var configuration = JsonNode.Parse(await client.GetStringAsync("/api/config"))!;
        configuration["devices"]![1]!["deviceType"] = "camera";
        (await client.PostAsJsonAsync("/api/config/devices/1", configuration["devices"]![1])).EnsureSuccessStatusCode();
        var before = await client.GetStringAsync("/api/config/export");
        Assert.Equal(HttpStatusCode.BadRequest, (await Save(client, snapshot, snapshot.DeviceTypes.Where(type => type.Id != "camera"))).StatusCode);
        Assert.Equal(before, await client.GetStringAsync("/api/config/export"));
    }

    [Fact]
    public async Task ConcurrentCatalogEdits_ProduceOneSuccessAndOneConflict()
    {
        using var factory = new NetWatchApplicationFactory();
        using var client = factory.CreateClient();
        var snapshot = await Snapshot(client);
        var responses = await Task.WhenAll(
            Save(client, snapshot, snapshot.DeviceTypes.Append(new DeviceTypeDefinition { Id = "a", Name = "Type A" })),
            Save(client, snapshot, snapshot.DeviceTypes.Append(new DeviceTypeDefinition { Id = "b", Name = "Type B" })));
        Assert.Single(responses, response => response.StatusCode == HttpStatusCode.OK);
        Assert.Single(responses, response => response.StatusCode == HttpStatusCode.Conflict);
        Assert.Equal(6, (await Snapshot(client)).DeviceTypes.Count);
    }

    [Fact]
    public async Task SwitchedProfile_RejectsOldEditorAndLeavesBothProfilesIntact()
    {
        using var factory = new NetWatchApplicationFactory();
        using var client = factory.CreateClient();
        (await client.PostAsJsonAsync("/api/config", Inventory())).EnsureSuccessStatusCode();
        var old = await Snapshot(client);
        (await client.PostAsJsonAsync("/api/regions", new { name = "Other group", copyFromActive = false })).EnsureSuccessStatusCode();
        var before = await client.GetStringAsync("/api/config/export");
        Assert.Equal(HttpStatusCode.Conflict, (await Save(client, old, old.DeviceTypes.Append(new DeviceTypeDefinition { Id = "new", Name = "New type" }))).StatusCode);
        Assert.Equal(before, await client.GetStringAsync("/api/config/export"));
        (await client.PostAsync($"/api/regions/{old.ProfileId}/activate", null)).EnsureSuccessStatusCode();
        Assert.Equal(old.Version, (await Snapshot(client)).Version);
    }

    [Fact]
    public async Task Catalog_SurvivesReloadRowSaveImportExportAndProfileCopy()
    {
        using var factory = new NetWatchApplicationFactory();
        using var client = factory.CreateClient();
        (await client.PostAsJsonAsync("/api/config", Inventory())).EnsureSuccessStatusCode();
        (await client.PostAsync("/api/reload", null)).EnsureSuccessStatusCode();
        var inventory = JsonNode.Parse(await client.GetStringAsync("/api/config"))!;
        (await client.PostAsJsonAsync("/api/config/devices/0", inventory["devices"]![0])).EnsureSuccessStatusCode();
        var export = await client.GetStringAsync("/api/config/export");
        using var form = new MultipartFormDataContent();
        form.Add(new StringContent(export), "configFile", "types.json");
        (await client.PostAsync("/api/config/import", form)).EnsureSuccessStatusCode();
        (await client.PostAsJsonAsync("/api/regions", new { name = "Copied types", copyFromActive = true })).EnsureSuccessStatusCode();
        Assert.Contains((await Snapshot(client)).DeviceTypes, type => type.Id == "web-app");
        var copy = JsonNode.Parse(await client.GetStringAsync("/api/config"))!;
        Assert.Equal("web-app", copy["devices"]![1]!["deviceType"]!.GetValue<string>());
        Assert.Equal("none", copy["devices"]![0]!["workstationPeripherals"]!["printers"]!["status"]!.GetValue<string>());
        (await client.PostAsJsonAsync("/api/regions", new { name = "Fresh types", copyFromActive = false })).EnsureSuccessStatusCode();
        Assert.Equal(5, (await Snapshot(client)).DeviceTypes.Count);
    }

    [Fact]
    public async Task CatalogNormalization_HasOrderIndependentVersionsAndCanonicalKeys()
    {
        using var factory = new NetWatchApplicationFactory();
        using var client = factory.CreateClient();
        var snapshot = await Snapshot(client);
        (await Save(client, snapshot, snapshot.DeviceTypes.AsEnumerable().Reverse().Select(type => new DeviceTypeDefinition
        { Id = $" {type.Id.ToUpperInvariant()} ", Name = $" {type.Name} " }))).EnsureSuccessStatusCode();
        Assert.Equal(snapshot.Version, (await Snapshot(client)).Version);
    }

    public static IEnumerable<object[]> InvalidCases()
    {
        foreach (var name in new[] { "null", "empty", "nullType", "missingWorkstation", "renamedWorkstation", "duplicateId", "duplicateName", "emptyId", "invalidId", "longId", "emptyName", "longName", "controlName", "tooMany", "unknownReference", "fakeWorkstation" })
            foreach (var import in new[] { false, true }) yield return [name, import];
    }

    [Theory]
    [MemberData(nameof(InvalidCases))]
    public async Task InvalidTypes_AreRejectedOnSaveAndImportWithoutReplacingData(string invalidCase, bool import)
    {
        using var factory = new NetWatchApplicationFactory();
        using var client = factory.CreateClient();
        (await client.PostAsJsonAsync("/api/config", Inventory())).EnsureSuccessStatusCode();
        var before = await client.GetStringAsync("/api/config/export");
        var invalid = Inventory();
        var types = invalid["deviceTypes"]!.AsArray();
        switch (invalidCase)
        {
            case "null": invalid["deviceTypes"] = null; break;
            case "empty": types.Clear(); break;
            case "nullType": types.Add((JsonNode?)null); break;
            case "missingWorkstation": types.RemoveAt(1); break;
            case "renamedWorkstation": types[1]!["name"] = "Custom workstation"; break;
            case "duplicateId": types.Add(JsonNode.Parse("""{"id":"WEB-APP","name":"Another"}""")); break;
            case "duplicateName": types.Add(JsonNode.Parse("""{"id":"another","name":"web APPLICATION"}""")); break;
            case "emptyId": types[5]!["id"] = " "; break;
            case "invalidId": types[5]!["id"] = "bad/id"; break;
            case "longId": types[5]!["id"] = new string('a', 81); break;
            case "emptyName": types[5]!["name"] = " "; break;
            case "longName": types[5]!["name"] = new string('a', 101); break;
            case "controlName": types[5]!["name"] = "Name\nInjected"; break;
            case "tooMany":
                for (var index = 0; index < 195; index++) types.Add(JsonSerializer.SerializeToNode(new DeviceTypeDefinition { Id = $"extra-{index}", Name = $"Extra {index}" }, Json));
                break;
            case "unknownReference": invalid["devices"]![1]!["deviceType"] = "unknown"; break;
            case "fakeWorkstation": invalid["devices"]![0]!["deviceType"] = "web-app"; break;
        }
        HttpResponseMessage response;
        if (import)
        {
            using var form = new MultipartFormDataContent();
            form.Add(new StringContent(invalid.ToJsonString()), "configFile", "types.json");
            response = await client.PostAsync("/api/config/import", form);
        }
        else response = await client.PostAsJsonAsync("/api/config", invalid);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(before, await client.GetStringAsync("/api/config/export"));
    }

    [Fact]
    public async Task DeviceTypePageAndScript_AreServed()
    {
        using var factory = new NetWatchApplicationFactory();
        using var client = factory.CreateClient();
        Assert.Contains("id=\"device-types-page\"", await client.GetStringAsync("/device-types"));
        Assert.Contains("renderDeviceTypeOptions", await client.GetStringAsync("/device-types.js"));
    }
}
