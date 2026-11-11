using System.Net;
using System.Net.Http.Json;
using System.Text.Json.Nodes;

namespace NetWatch.ContractTests;

public sealed class DashboardDeviceTypeTests
{
    [Theory]
    [InlineData("json", "workstation", 2)]
    [InlineData("sqlite", "workstation", 2)]
    [InlineData("json", "SERVER", 1)]
    [InlineData("sqlite", "SERVER", 1)]
    [InlineData("json", "unspecified", 1)]
    [InlineData("sqlite", "unspecified", 1)]
    [InlineData("json", "not-in-catalog", 0)]
    [InlineData("sqlite", "not-in-catalog", 0)]
    public async Task TypeScope_FiltersBeforeExecutionAndCapturesClassification(string provider, string type, int count)
    {
        using var factory = new NetWatchApplicationFactory(null, provider);
        using var client = factory.CreateClient();
        await SeedAsync(client);
        var events = await ReadStreamAsync(client, "?deviceType=" + type);
        var results = events.Last()["results"]!.AsArray();
        Assert.Equal(count, results.Count);
        Assert.All(results, result => Assert.Equal(type.ToLowerInvariant(), result!["deviceType"]!.GetValue<string>()));
        Assert.Equal(count, events[0]["totalDevices"]!.GetValue<int>());
        var history = JsonNode.Parse(await client.GetStringAsync("/api/history"))!["runs"]!.AsArray();
        Assert.Equal(type.ToLowerInvariant(), Assert.Single(history)!["scope"]!["deviceType"]!.GetValue<string>());
        Assert.Equal(count, history[0]!["results"]!.AsArray().Count);
    }

    [Theory]
    [InlineData("json")]
    [InlineData("sqlite")]
    public async Task TypeFacilityCategoryNameAndAddress_IntersectDespiteIdenticalDeviceIdentities(string provider)
    {
        using var factory = new NetWatchApplicationFactory(null, provider);
        using var client = factory.CreateClient();
        await SeedAsync(client);
        var events = await ReadStreamAsync(client,
            "?deviceType=workstation&facility=Alpha&category=Shared&deviceName=Mirror&deviceIp=127.0.0.1");
        var result = Assert.Single(events.Last()["results"]!.AsArray())!;
        Assert.Equal("Mirror", result["name"]!.GetValue<string>());
        Assert.Equal("workstation", result["deviceType"]!.GetValue<string>());
        var scope = JsonNode.Parse(await client.GetStringAsync("/api/history"))!["runs"]![0]!["scope"]!;
        Assert.Equal("Alpha", scope["facility"]!.GetValue<string>());
        Assert.Equal("Shared", scope["category"]!.GetValue<string>());
        Assert.Equal("workstation", scope["deviceType"]!.GetValue<string>());
    }

    [Theory]
    [InlineData("json")]
    [InlineData("sqlite")]
    public async Task TypeAndFacility_ExcludeOtherSitesWithoutRelyingOnDeviceName(string provider)
    {
        using var factory = new NetWatchApplicationFactory(null, provider);
        using var client = factory.CreateClient();
        await SeedAsync(client);
        var events = await ReadStreamAsync(client, "?deviceType=workstation&facility=Alpha");
        var result = Assert.Single(events.Last()["results"]!.AsArray())!;
        Assert.Equal("Alpha", result["facility"]!.GetValue<string>());
        Assert.Equal("workstation", result["deviceType"]!.GetValue<string>());
    }

    [Theory]
    [InlineData("json")]
    [InlineData("sqlite")]
    public async Task TypeAndCategory_ExcludeOtherCategoriesWithoutRelyingOnFacility(string provider)
    {
        using var factory = new NetWatchApplicationFactory(null, provider);
        using var client = factory.CreateClient();
        await SeedAsync(client);
        var events = await ReadStreamAsync(client, "?deviceType=workstation&category=Office");
        var result = Assert.Single(events.Last()["results"]!.AsArray())!;
        Assert.Equal("Office", result["category"]!.GetValue<string>());
        Assert.Equal("Beta", result["facility"]!.GetValue<string>());
    }

    [Theory]
    [InlineData("json")]
    [InlineData("sqlite")]
    public async Task UnscopedRun_RemainsGlobalAndDoesNotInventATypeScope(string provider)
    {
        using var factory = new NetWatchApplicationFactory(null, provider);
        using var client = factory.CreateClient();
        await SeedAsync(client);
        var events = await ReadStreamAsync(client, "");
        Assert.Equal(4, events.Last()["results"]!.AsArray().Count);
        var scope = JsonNode.Parse(await client.GetStringAsync("/api/history"))!["runs"]![0]!["scope"]!;
        Assert.False(scope.AsObject().ContainsKey("deviceType"));
    }

    private static async Task SeedAsync(HttpClient client)
    {
        var config = JsonNode.Parse("""
            {"settings":{"timeoutMs":300,"retryCount":0},"devices":[
            {"name":"Mirror","ip":"127.0.0.1","facility":"Alpha","category":"Shared","deviceType":"workstation","checks":[{"type":"ping"}]},
            {"name":"Mirror","ip":"127.0.0.1","facility":"Alpha","category":"Shared","deviceType":"server","checks":[{"type":"ping"}]},
            {"name":"Legacy","ip":"127.0.0.1","facility":"Alpha","category":"Legacy","checks":[{"type":"ping"}]},
            {"name":"Beta desk","ip":"127.0.0.1","facility":"Beta","category":"Office","deviceType":"workstation","checks":[{"type":"ping"}]},
            {"name":"Disabled","ip":"127.0.0.1","facility":"Alpha","category":"Shared","deviceType":"workstation","enabled":false,"checks":[{"type":"ping"}]}]}
            """)!;
        (await client.PostAsJsonAsync("/api/config", config)).EnsureSuccessStatusCode();
    }

    private static async Task<JsonNode[]> ReadStreamAsync(HttpClient client, string query)
    {
        using var response = await client.GetAsync("/api/monitor/stream" + query);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var text = await response.Content.ReadAsStringAsync();
        var events = text.Split('\n').Where(line => line.StartsWith("data: "))
            .Select(line => JsonNode.Parse(line[6..])!).ToArray();
        Assert.Equal("completed", events.Last()["type"]!.GetValue<string>());
        return events;
    }
}
