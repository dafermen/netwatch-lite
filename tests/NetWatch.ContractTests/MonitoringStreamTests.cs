using System.Net;
using System.Net.Http.Json;
using NetWatch.Models;

namespace NetWatch.ContractTests;

public sealed class MonitoringStreamTests
{
    [Fact]
    public async Task EmptyInventory_StreamsStartedAndCompletedAndPersistsHistory()
    {
        using var factory = new NetWatchApplicationFactory();
        using var client = factory.CreateClient();
        var saved = await client.PostAsJsonAsync("/api/config", new MonitorConfiguration());
        saved.EnsureSuccessStatusCode();

        var response = await client.GetAsync("/api/monitor/stream");
        var stream = await response.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("text/event-stream", response.Content.Headers.ContentType?.MediaType);
        Assert.Contains("event: started", stream);
        Assert.Contains("event: completed", stream);
        Assert.DoesNotContain("application/problem", stream);
        var history = await client.GetFromJsonAsync<MonitorHistoryStore>("/api/history");
        Assert.Single(history!.Runs);
    }
}
