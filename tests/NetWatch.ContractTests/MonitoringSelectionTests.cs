using System.Net;
using System.Net.Http.Json;
using System.Text.Json.Nodes;
using Microsoft.Extensions.DependencyInjection;
using NetWatch.Services;

namespace NetWatch.ContractTests;

public sealed class MonitoringSelectionTests
{
    [Theory]
    [InlineData("json")]
    [InlineData("sqlite")]
    public async Task BusyExecutionDoesNotConsumeThePendingSelection(string provider)
    {
        using var factory = new NetWatchApplicationFactory(null, provider);
        using var client = factory.CreateClient();
        await Seed(client);
        var token = await Plan(client, Request(await Snapshot(client), 1));
        var coordinator = factory.Services.GetRequiredService<MonitorExecutionService>();
        var entered = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var release = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        using var deadline = new CancellationTokenSource(TimeSpan.FromSeconds(10));
        var running = coordinator.TryStreamFullCheckAsync(async (message, cancellation) =>
        {
            if (message.Type != "started") return;
            entered.TrySetResult();
            await release.Task.WaitAsync(cancellation);
        }, cancellationToken: deadline.Token);
        try
        {
            await entered.Task.WaitAsync(deadline.Token);
            var busy = await client.GetStringAsync("/api/monitor/stream?selection=" + token, deadline.Token);
            Assert.Contains("event: busy", busy);
            Assert.DoesNotContain("event: started", busy);
        }
        finally
        {
            release.TrySetResult();
            await running.WaitAsync(deadline.Token);
        }
        Assert.Single((await Stream(client, token)).Last()["results"]!.AsArray());
        Assert.Equal(2, (await Json(client, "/api/history"))["runs"]!.AsArray().Count);
    }

    [Theory]
    [InlineData("json")]
    [InlineData("sqlite")]
    public async Task PlansAreBoundedAndExpiredSelectionsNeverRun(string provider)
    {
        using var original = new NetWatchApplicationFactory(null, provider);
        var clock = new PlanClock();
        using var factory = original.WithWebHostBuilder(builder => builder.ConfigureServices(services =>
            services.AddSingleton(serviceProvider => new MonitorPlans(serviceProvider.GetRequiredService<JsonDeviceRepository>(), clock))));
        using var client = factory.CreateClient();
        await Seed(client);
        var request = Request(await Snapshot(client), 0);
        var token = await Plan(client, request);
        for (var index = 1; index < 128; index++) await Plan(client, request);
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsJsonAsync("/api/monitor/plans", request)).StatusCode);
        clock.Now += TimeSpan.FromMinutes(2);
        Assert.Equal("error", (await Stream(client, token)).Last()["type"]!.GetValue<string>());
        Assert.Empty((await Json(client, "/api/history"))["runs"]!.AsArray());
        var fresh = await Plan(client, request);
        Assert.Single((await Stream(client, fresh)).Last()["results"]!.AsArray());
    }

    private sealed class PlanClock : TimeProvider
    {
        public DateTimeOffset Now { get; set; } = DateTimeOffset.UtcNow;
        public override DateTimeOffset GetUtcNow() => Now;
    }

    [Theory]
    [InlineData("json")]
    [InlineData("sqlite")]
    public async Task SnapshotIsReadOnlyAndKeysSeparateIdenticalInventoryRecords(string provider)
    {
        using var factory = new NetWatchApplicationFactory(null, provider);
        using var client = factory.CreateClient();
        await Seed(client);
        var before = await client.GetStringAsync("/api/config");
        var first = await Snapshot(client);
        var second = await Snapshot(client);
        Assert.True(JsonNode.DeepEquals(first, second));
        Assert.Equal(before, await client.GetStringAsync("/api/config"));
        var keys = first["keys"]!.AsArray().Select(node => node!.GetValue<string>()).ToArray();
        Assert.Equal(4, keys.Length);
        Assert.Equal(keys.Length, keys.Distinct().Count());
        Assert.All(keys, key => Assert.Matches("^[A-F0-9]{64}$", key));
        Assert.Empty((await Json(client, "/api/history"))["runs"]!.AsArray());
    }

    [Theory]
    [InlineData("json")]
    [InlineData("sqlite")]
    public async Task ExactSelectionChecksOnlyTheChosenDuplicateAndCannotBeReused(string provider)
    {
        using var factory = new NetWatchApplicationFactory(null, provider);
        using var client = factory.CreateClient();
        await Seed(client);
        var snapshot = await Snapshot(client);
        var request = Request(snapshot, 1);
        request["deviceType"] = "workstation";
        request["facility"] = "Alpha";
        request["category"] = "Shared";
        var token = await Plan(client, request);
        var events = await Stream(client, token);
        var result = Assert.Single(events.Last()["results"]!.AsArray())!;
        Assert.Equal(snapshot["keys"]![1]!.GetValue<string>(), result["inventoryKey"]!.GetValue<string>());
        Assert.Equal("tcp", Assert.Single(result["checks"]!.AsArray())!["type"]!.GetValue<string>());
        Assert.Equal(1, (await Json(client, "/api/history"))["runs"]![0]!["scope"]!["selectionCount"]!.GetValue<int>());
        var repeated = await Stream(client, token);
        Assert.Equal("error", repeated.Last()["type"]!.GetValue<string>());
        Assert.Single((await Json(client, "/api/history"))["runs"]!.AsArray());
    }

    [Theory]
    [InlineData("json")]
    [InlineData("sqlite")]
    public async Task EmptySelectionIsZeroAndNeverAnUnfilteredFallback(string provider)
    {
        using var factory = new NetWatchApplicationFactory(null, provider);
        using var client = factory.CreateClient();
        await Seed(client);
        var snapshot = await Snapshot(client);
        var token = await Plan(client, Request(snapshot));
        var events = await Stream(client, token);
        Assert.Equal("completed", events.Last()["type"]!.GetValue<string>());
        Assert.Equal(0, events[0]["totalDevices"]!.GetValue<int>());
        Assert.Empty(events.Last()["results"]!.AsArray());
        Assert.Equal(0, (await Json(client, "/api/history"))["runs"]![0]!["scope"]!["selectionCount"]!.GetValue<int>());
    }

    [Theory]
    [InlineData("json", "paused")]
    [InlineData("sqlite", "paused")]
    [InlineData("json", "type")]
    [InlineData("sqlite", "type")]
    [InlineData("json", "facility")]
    [InlineData("sqlite", "facility")]
    [InlineData("json", "category")]
    [InlineData("sqlite", "category")]
    [InlineData("json", "duplicate-key")]
    [InlineData("sqlite", "duplicate-key")]
    public async Task InvalidOrOutOfScopeSelectionsAreRejectedWithoutChecks(string provider, string kind)
    {
        using var factory = new NetWatchApplicationFactory(null, provider);
        using var client = factory.CreateClient();
        await Seed(client);
        var snapshot = await Snapshot(client);
        var request = Request(snapshot, kind == "paused" ? 3 : 0);
        if (kind == "type") request["deviceType"] = "server";
        if (kind == "facility") request["facility"] = "Beta";
        if (kind == "category") request["category"] = "Other";
        if (kind == "duplicate-key") request["keys"]!.AsArray().Add(request["keys"]![0]!.DeepClone());
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsJsonAsync("/api/monitor/plans", request)).StatusCode);
        Assert.Empty((await Json(client, "/api/history"))["runs"]!.AsArray());
    }

    [Theory]
    [InlineData("json")]
    [InlineData("sqlite")]
    public async Task StaleInventoryIsRejectedBeforePlanCreationAndBeforeExecution(string provider)
    {
        using var factory = new NetWatchApplicationFactory(null, provider);
        using var client = factory.CreateClient();
        await Seed(client);
        var snapshot = await Snapshot(client);
        var request = Request(snapshot, 0);
        var token = await Plan(client, request);
        var config = (await Json(client, "/api/config"));
        config["devices"]![0]!["name"] = "Changed safely";
        (await client.PostAsJsonAsync("/api/config", config)).EnsureSuccessStatusCode();
        Assert.Equal(HttpStatusCode.Conflict, (await client.PostAsJsonAsync("/api/monitor/plans", request)).StatusCode);
        Assert.Equal("error", (await Stream(client, token)).Last()["type"]!.GetValue<string>());
        Assert.Empty((await Json(client, "/api/history"))["runs"]!.AsArray());
        Assert.Empty((await Json(client, "/api/errors"))["errors"]!.AsArray());
    }

    [Theory]
    [InlineData("json")]
    [InlineData("sqlite")]
    public async Task NarrowPausePreservesEveryOtherFieldAndRejectsStaleUpdates(string provider)
    {
        using var factory = new NetWatchApplicationFactory(null, provider);
        using var client = factory.CreateClient();
        await Seed(client);
        var snapshot = await Snapshot(client);
        var before = snapshot["configuration"]!.DeepClone();
        var request = new { profileId = snapshot["profileId"]!.GetValue<string>(), revision = snapshot["revision"]!.GetValue<string>(), enabled = false };
        var response = await client.PostAsJsonAsync("/api/config/devices/0/monitoring", request);
        response.EnsureSuccessStatusCode();
        var after = await Json(client, "/api/config");
        before["devices"]![0]!["enabled"] = false;
        Assert.True(JsonNode.DeepEquals(before, after));
        Assert.Equal(HttpStatusCode.Conflict, (await client.PostAsJsonAsync("/api/config/devices/1/monitoring", request)).StatusCode);
        Assert.True(JsonNode.DeepEquals(after, await Json(client, "/api/config")));
        var fresh = await Snapshot(client);
        var resume = new { profileId = fresh["profileId"]!.GetValue<string>(), revision = fresh["revision"]!.GetValue<string>(), enabled = true };
        (await client.PostAsJsonAsync("/api/config/devices/0/monitoring", resume)).EnsureSuccessStatusCode();
        before["devices"]![0]!["enabled"] = true;
        Assert.True(JsonNode.DeepEquals(before, await Json(client, "/api/config")));
    }

    private static async Task Seed(HttpClient client)
    {
        var data = JsonNode.Parse("""
        {"settings":{"timeoutMs":100,"retryCount":0},"devices":[
          {"name":"Mirror","ip":"127.0.0.1","facility":"Alpha","category":"Shared","deviceType":"workstation","notes":"Private test notes","location":"Desk 3","command":"literal text","checks":[{"type":"ping"}]},
          {"name":"Mirror","ip":"127.0.0.1","facility":"Alpha","category":"Shared","deviceType":"workstation","checks":[{"type":"tcp","port":1}]},
          {"name":"Other","ip":"127.0.0.1","facility":"Beta","category":"Office","deviceType":"server","checks":[{"type":"ping"}]},
          {"name":"Paused","ip":"127.0.0.1","facility":"Alpha","category":"Shared","enabled":false,"checks":[{"type":"ping"}]}]}
        """)!;
        (await client.PostAsJsonAsync("/api/config", data)).EnsureSuccessStatusCode();
    }
    private static Task<JsonNode> Snapshot(HttpClient client) => Json(client, "/api/monitor/inventory");
    private static async Task<JsonNode> Json(HttpClient client, string path) => JsonNode.Parse(await client.GetStringAsync(path))!;
    private static JsonObject Request(JsonNode snapshot, params int[] indexes) => new()
    {
        ["profileId"] = snapshot["profileId"]!.DeepClone(), ["revision"] = snapshot["revision"]!.DeepClone(),
        ["keys"] = new JsonArray(indexes.Select(index => snapshot["keys"]![index]!.DeepClone()).ToArray())
    };
    private static async Task<string> Plan(HttpClient client, JsonObject request)
    {
        using var response = await client.PostAsJsonAsync("/api/monitor/plans", request);
        response.EnsureSuccessStatusCode();
        return JsonNode.Parse(await response.Content.ReadAsStringAsync())!["token"]!.GetValue<string>();
    }
    private static async Task<JsonNode[]> Stream(HttpClient client, string token)
    {
        var text = await client.GetStringAsync("/api/monitor/stream?selection=" + token);
        return text.Split('\n').Where(line => line.StartsWith("data: ")).Select(line => JsonNode.Parse(line[6..])!).ToArray();
    }
}
