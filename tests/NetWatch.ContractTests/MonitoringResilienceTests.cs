using System.Net;
using System.Net.Http.Json;
using Microsoft.Extensions.DependencyInjection;
using NetWatch.Models;
using NetWatch.Services;

namespace NetWatch.ContractTests;

public sealed class MonitoringResilienceTests
{
    [Fact]
    public async Task LegacyTimestampRunId_CanStillBeDeleted()
    {
        using var factory = new NetWatchApplicationFactory();
        using var client = factory.CreateClient();
        (await client.PostAsJsonAsync("/api/config", new MonitorConfiguration())).EnsureSuccessStatusCode();
        (await client.PostAsync("/api/monitor/run", null)).EnsureSuccessStatusCode();
        var file = Path.Combine(factory.RuntimeDataRoot, "monitor-history.json");
        var json = System.Text.Json.Nodes.JsonNode.Parse(await File.ReadAllTextAsync(file))!;
        const string legacyId = "20260101-120000-000-full";
        json[nameof(MonitorHistoryStore.Runs)]![0]![nameof(MonitorHistoryRun.RunId)] = legacyId;
        await File.WriteAllTextAsync(file, json.ToJsonString());

        (await client.DeleteAsync($"/api/history/runs/{legacyId}")).EnsureSuccessStatusCode();
        Assert.Empty((await client.GetFromJsonAsync<MonitorHistoryStore>("/api/history"))!.Runs);
    }

    [Fact]
    public async Task ConcurrentHistoryAppends_KeepEveryRunDistinctAndDeleteOnlyTheSelectedRun()
    {
        using var factory = new NetWatchApplicationFactory();
        using var client = factory.CreateClient();
        var historyRepository = factory.Services.GetRequiredService<JsonMonitorHistoryRepository>();
        var timestamp = DateTimeOffset.UtcNow;
        var response = new MonitorResponse
        {
            LastCheck = timestamp, LastExecutionTime = timestamp, ExecutionStatus = "Completed",
            Settings = new(), Categories = [], Results = [],
            Summary = new()
            {
                TotalDevices = 0, HealthyDevices = 0, OnlineDevices = 0,
                OfflineDevices = 0, DegradedDevices = 0, AvailabilityPercentage = 0
            }
        };
        var runs = await Task.WhenAll(Enumerable.Range(0, 20).Select(_ =>
            historyRepository.AppendAsync(response, new(), timestamp, timestamp)));

        var stored = await historyRepository.GetAsync();
        Assert.Equal(20, stored.Runs.Count);
        Assert.Equal(20, stored.Runs.Select(run => run.RunId).Distinct().Count());
        var deleted = await client.DeleteAsync($"/api/history/runs/{runs[0].RunId}");
        deleted.EnsureSuccessStatusCode();
        var remaining = await historyRepository.GetAsync();
        Assert.Equal(19, remaining.Runs.Count);
        Assert.DoesNotContain(remaining.Runs, run => run.RunId == runs[0].RunId);
    }

    [Fact]
    public async Task ConcurrentDeviceRowUpdates_PreserveBothChangesAfterReload()
    {
        using var factory = new NetWatchApplicationFactory();
        using var client = factory.CreateClient();
        (await client.PostAsJsonAsync("/api/config", new MonitorConfiguration
        {
            Devices = [CreateDevice("First"), CreateDevice("Second")]
        })).EnsureSuccessStatusCode();

        var responses = await Task.WhenAll(
            client.PostAsJsonAsync("/api/config/devices/0", CreateDevice("Updated First")),
            client.PostAsJsonAsync("/api/config/devices/1", CreateDevice("Updated Second")));
        foreach (var result in responses) result.EnsureSuccessStatusCode();
        (await client.PostAsync("/api/reload", null)).EnsureSuccessStatusCode();
        var persisted = await client.GetFromJsonAsync<MonitorConfiguration>("/api/config");
        Assert.Equal(["Updated First", "Updated Second"], persisted!.Devices.Select(device => device.Name));
    }

    private static Device CreateDevice(string name) => new()
    {
        Name = name, Ip = "127.0.0.1", Enabled = false, Checks = [new() { Type = "ping" }]
    };

    [Fact]
    public async Task OverlappingRequests_ReturnBusyWithoutStartingAnotherRun()
    {
        using var factory = new NetWatchApplicationFactory();
        using var client = factory.CreateClient();
        (await client.PostAsJsonAsync("/api/config", new MonitorConfiguration())).EnsureSuccessStatusCode();
        var coordinator = factory.Services.GetRequiredService<MonitorExecutionService>();
        var entered = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var release = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(10));
        var running = coordinator.TryStreamFullCheckAsync(async (message, token) =>
        {
            if (message.Type == "started")
            {
                entered.TrySetResult();
                await release.Task.WaitAsync(token);
            }
        }, cancellationToken: timeout.Token);
        try
        {
            await entered.Task.WaitAsync(timeout.Token);
            var overlapping = await client.PostAsync("/api/monitor/run", null, timeout.Token);
            Assert.Equal(HttpStatusCode.Conflict, overlapping.StatusCode);
            var stream = await client.GetStringAsync("/api/monitor/stream", timeout.Token);
            Assert.Contains("event: busy", stream);
            Assert.DoesNotContain("event: started", stream);
            var history = await client.GetFromJsonAsync<MonitorHistoryStore>("/api/history", timeout.Token);
            Assert.Empty(history!.Runs);
        }
        finally
        {
            release.TrySetResult();
            await running.WaitAsync(TimeSpan.FromSeconds(5));
        }
        Assert.True(await coordinator.TryRunFullCheckAsync() is not null);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task InterruptedStream_ReleasesLockAndDoesNotRecordAnIncompleteRun(bool disconnect)
    {
        using var factory = new NetWatchApplicationFactory();
        using var client = factory.CreateClient();
        (await client.PostAsJsonAsync("/api/config", new MonitorConfiguration())).EnsureSuccessStatusCode();
        var coordinator = factory.Services.GetRequiredService<MonitorExecutionService>();
        var entered = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        var release = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        using var cancellation = new CancellationTokenSource(TimeSpan.FromSeconds(10));
        var running = coordinator.TryStreamFullCheckAsync(async (_, token) =>
        {
            entered.TrySetResult();
            await release.Task.WaitAsync(token);
            throw new IOException("Simulated stream client disconnect.");
        }, cancellationToken: cancellation.Token);
        await entered.Task.WaitAsync(TimeSpan.FromSeconds(5));
        if (disconnect)
        {
            release.TrySetResult();
            await Assert.ThrowsAsync<IOException>(() => running);
        }
        else
        {
            cancellation.Cancel();
            await Assert.ThrowsAnyAsync<OperationCanceledException>(() => running);
        }

        var before = await client.GetFromJsonAsync<MonitorHistoryStore>("/api/history");
        Assert.Empty(before!.Runs);
        var next = await coordinator.TryRunFullCheckAsync();
        Assert.NotNull(next);
        var after = await client.GetFromJsonAsync<MonitorHistoryStore>("/api/history");
        Assert.Single(after!.Runs);
    }

    [Fact]
    public async Task CancelledWaiter_DoesNotReleaseAnotherExecutionsLock()
    {
        using var factory = new NetWatchApplicationFactory();
        using var client = factory.CreateClient();
        (await client.PostAsJsonAsync("/api/config", new MonitorConfiguration())).EnsureSuccessStatusCode();
        var coordinator = factory.Services.GetRequiredService<MonitorExecutionService>();
        var release = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        using var timeout = new CancellationTokenSource(TimeSpan.FromSeconds(10));
        var running = coordinator.TryStreamFullCheckAsync((_, token) => release.Task.WaitAsync(token), cancellationToken: timeout.Token);
        try
        {
            using var waiterCancellation = new CancellationTokenSource();
            var waiter = coordinator.RunFullCheckAsync(cancellationToken: waiterCancellation.Token);
            waiterCancellation.Cancel();
            await Assert.ThrowsAnyAsync<OperationCanceledException>(() => waiter);
            Assert.Null(await coordinator.TryRunFullCheckAsync());
        }
        finally
        {
            release.TrySetResult();
            await running.WaitAsync(TimeSpan.FromSeconds(5));
        }
        Assert.NotNull(await coordinator.TryRunFullCheckAsync());
    }
}
