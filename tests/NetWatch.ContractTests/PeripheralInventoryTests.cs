using System.Net;
using System.Net.Http.Json;
using System.Text.Json.Nodes;

namespace NetWatch.ContractTests;

public sealed class PeripheralInventoryTests
{
    private static JsonNode ValidInventory() => JsonNode.Parse("""
        {
          "peripheralCatalog": [
            {"id":"printer-a","kind":"printer","manufacturer":"Example","model":"Laser A"},
            {"id":"scanner-a","kind":"scanner","manufacturer":"Example","model":"Scan A"}
          ],
          "devices": [{
            "name":"Desk A","ip":"127.0.0.1","deviceType":"workstation","checks":[{"type":"ping"}],
            "workstationPeripherals": {
              "printers":{"status":"assigned","items":[{"modelId":"printer-a","connection":"network","address":"192.0.2.10","identifier":"Print A","notes":"Front desk"}]},
              "scanners":{"status":"none","items":[]}
            }
          }]
        }
        """)!;

    [Fact]
    public async Task LegacyInventory_KeepsUnspecifiedTypeAndDoesNotInferAbsenceFromCategory()
    {
        using var factory = new NetWatchApplicationFactory();
        using var client = factory.CreateClient();
        var legacy = JsonNode.Parse("""{"devices":[{"name":"Old desk","ip":"127.0.0.1","category":"Workstations","checks":[{"type":"ping"}]}]}""")!;
        (await client.PostAsJsonAsync("/api/config", legacy)).EnsureSuccessStatusCode();
        (await client.PostAsync("/api/reload", null)).EnsureSuccessStatusCode();
        var saved = JsonNode.Parse(await client.GetStringAsync("/api/config"))!;
        Assert.Empty(saved["peripheralCatalog"]!.AsArray());
        Assert.Equal("unspecified", saved["devices"]![0]!["deviceType"]!.GetValue<string>());
        Assert.Null(saved["devices"]![0]!["workstationPeripherals"]);
    }

    [Fact]
    public async Task Assignments_SurviveReloadRowUpdateExportAndImport()
    {
        using var factory = new NetWatchApplicationFactory();
        using var client = factory.CreateClient();
        var inventory = ValidInventory();
        var printers = inventory["devices"]![0]!["workstationPeripherals"]!["printers"]!["items"]!.AsArray();
        printers.Add(JsonNode.Parse("""{"modelId":" PRINTER-A ","connection":" USB ","identifier":"USB printer"}"""));
        (await client.PostAsJsonAsync("/api/config", inventory)).EnsureSuccessStatusCode();
        (await client.PostAsync("/api/reload", null)).EnsureSuccessStatusCode();
        var saved = JsonNode.Parse(await client.GetStringAsync("/api/config"))!;
        saved["devices"]![0]!["name"] = "Renamed desk";
        (await client.PostAsJsonAsync("/api/config/devices/0", saved["devices"]![0])).EnsureSuccessStatusCode();
        var exported = await client.GetStringAsync("/api/config/export");
        using var form = new MultipartFormDataContent();
        form.Add(new StringContent(exported), "configFile", "inventory.json");
        (await client.PostAsync("/api/config/import", form)).EnsureSuccessStatusCode();
        var restored = JsonNode.Parse(await client.GetStringAsync("/api/config"))!;
        Assert.Equal(2, restored["peripheralCatalog"]!.AsArray().Count);
        Assert.Equal("Renamed desk", restored["devices"]![0]!["name"]!.GetValue<string>());
        var actual = restored["devices"]![0]!["workstationPeripherals"]!;
        Assert.Equal(2, actual["printers"]!["items"]!.AsArray().Count);
        Assert.Equal("printer-a", actual["printers"]!["items"]![1]!["modelId"]!.GetValue<string>());
        Assert.Equal("usb", actual["printers"]!["items"]![1]!["connection"]!.GetValue<string>());
        Assert.Equal("none", actual["scanners"]!["status"]!.GetValue<string>());
    }

    [Fact]
    public async Task ProfileCopy_CarriesCatalogAndAssignmentsWhileNewProfileStartsEmpty()
    {
        using var factory = new NetWatchApplicationFactory();
        using var client = factory.CreateClient();
        (await client.PostAsJsonAsync("/api/config", ValidInventory())).EnsureSuccessStatusCode();
        (await client.PostAsJsonAsync("/api/regions", new { name = "Copied inventory", copyFromActive = true })).EnsureSuccessStatusCode();
        var copy = JsonNode.Parse(await client.GetStringAsync("/api/config"))!;
        Assert.Equal(2, copy["peripheralCatalog"]!.AsArray().Count);
        Assert.Equal("printer-a", copy["devices"]![0]!["workstationPeripherals"]!["printers"]!["items"]![0]!["modelId"]!.GetValue<string>());
        (await client.PostAsJsonAsync("/api/regions", new { name = "Empty inventory", copyFromActive = false })).EnsureSuccessStatusCode();
        var empty = JsonNode.Parse(await client.GetStringAsync("/api/config"))!;
        Assert.Empty(empty["peripheralCatalog"]!.AsArray());
    }

    [Fact]
    public async Task CatalogModel_CannotBeDeletedWhileAssignedButCanBeDeletedAfterUnassignment()
    {
        using var factory = new NetWatchApplicationFactory();
        using var client = factory.CreateClient();
        var inventory = ValidInventory();
        (await client.PostAsJsonAsync("/api/config", inventory)).EnsureSuccessStatusCode();
        inventory["peripheralCatalog"]!.AsArray().RemoveAt(0);
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsJsonAsync("/api/config", inventory)).StatusCode);
        inventory["devices"]![0]!["workstationPeripherals"]!["printers"] = JsonNode.Parse("""{"status":"none","items":[]}""");
        (await client.PostAsJsonAsync("/api/config", inventory)).EnsureSuccessStatusCode();
        Assert.Single(JsonNode.Parse(await client.GetStringAsync("/api/config"))!["peripheralCatalog"]!.AsArray());
    }

    public static IEnumerable<object[]> InvalidCases()
    {
        foreach (var value in new[] { "nullCatalog", "nullModel", "duplicateId", "duplicateName", "kind", "manufacturer", "deviceType", "notWorkstation", "missingModel", "wrongKind", "status", "emptyAssigned", "itemsWithNone", "nullAssignment", "connection", "usbAddress", "nullGroup", "tooManyItems" })
            foreach (var import in new[] { false, true }) yield return [value, import];
    }

    [Theory]
    [MemberData(nameof(InvalidCases))]
    public async Task InvalidPeripheralInventory_IsRejectedWithoutChangingSavedData(string invalidCase, bool import)
    {
        using var factory = new NetWatchApplicationFactory();
        using var client = factory.CreateClient();
        (await client.PostAsJsonAsync("/api/config", ValidInventory())).EnsureSuccessStatusCode();
        var before = await client.GetStringAsync("/api/config/export");
        var inventory = ValidInventory();
        var model = inventory["peripheralCatalog"]![0]!;
        var workstation = inventory["devices"]![0]!;
        var group = workstation["workstationPeripherals"]!["printers"]!;
        var item = group["items"]![0]!;
        switch (invalidCase)
        {
            case "nullCatalog": inventory["peripheralCatalog"] = null; break;
            case "nullModel": inventory["peripheralCatalog"]!.AsArray().Add((JsonNode?)null); break;
            case "duplicateId": inventory["peripheralCatalog"]![1]!["id"] = "PRINTER-A"; break;
            case "duplicateName": inventory["peripheralCatalog"]!.AsArray().Add(JsonNode.Parse("""{"id":"another","kind":"printer","manufacturer":"example","model":"laser a"}""")); break;
            case "kind": model["kind"] = "keyboard"; break;
            case "manufacturer": model["manufacturer"] = " "; break;
            case "deviceType": workstation["deviceType"] = "unexpected"; break;
            case "notWorkstation": workstation["deviceType"] = "server"; break;
            case "missingModel": item["modelId"] = "missing"; break;
            case "wrongKind": item["modelId"] = "scanner-a"; break;
            case "status": group["status"] = "unexpected"; break;
            case "emptyAssigned": group["items"] = new JsonArray(); break;
            case "itemsWithNone": group["status"] = "none"; break;
            case "nullAssignment": group["items"]![0] = null; break;
            case "connection": item["connection"] = "unexpected"; break;
            case "usbAddress": item["connection"] = "usb"; break;
            case "nullGroup": workstation["workstationPeripherals"]!["printers"] = null; break;
            case "tooManyItems": for (var i = 0; i < 50; i++) group["items"]!.AsArray().Add(item.DeepClone()); break;
        }
        HttpResponseMessage response;
        if (import)
        {
            using var form = new MultipartFormDataContent();
            form.Add(new StringContent(inventory.ToJsonString()), "configFile", "inventory.json");
            response = await client.PostAsync("/api/config/import", form);
        }
        else response = await client.PostAsJsonAsync("/api/config", inventory);
        using (response) Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal(before, await client.GetStringAsync("/api/config/export"));
    }
}
