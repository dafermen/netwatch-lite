using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.Extensions.DependencyInjection;
using NetWatch.Models;
using NetWatch.Services;

namespace NetWatch.ContractTests;

public sealed class DiagnosticApiTests
{
    [Theory]
    [InlineData("json")]
    [InlineData("sqlite")]
    public async Task BrowserErrorsAreBoundedRedactedAndSearchableByTheirCorrelation(string provider)
    {
        using var factory = new NetWatchApplicationFactory(null, provider);
        using var client = factory.CreateClient();
        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/diagnostics/client?token=request-secret")
        {
            Content = JsonContent.Create(new { kind = "error", message = "Failed https://user:credential@example.invalid/health?key=query-secret Authorization: Bearer bearer-secret", script = "/app.js?user=script-secret", line = 9, column = 4 })
        };
        request.Headers.TryAddWithoutValidation("User-Agent", "Agent token=agent-secret");
        using var response = await client.SendAsync(request);
        response.EnsureSuccessStatusCode();
        var receipt = JsonNode.Parse(await response.Content.ReadAsStringAsync())!;
        var trace = receipt["traceId"]!.GetValue<string>();
        Assert.Equal(trace, response.Headers.GetValues("X-NetWatch-Trace").Single());
        var raw = await client.GetStringAsync("/api/errors");
        foreach (var secret in new[] { "request-secret", "credential", "query-secret", "bearer-secret", "agent-secret", "script-secret" }) Assert.DoesNotContain(secret, raw);
        var page = await Json(client, "/api/diagnostics?search=" + Uri.EscapeDataString(trace));
        var entry = Assert.Single(page["entries"]!.AsArray())!;
        Assert.Equal(trace, entry["traceId"]!.GetValue<string>());
        Assert.Equal("browser", entry["source"]!.GetValue<string>());
        Assert.Contains("/app.js", entry["message"]!.GetValue<string>());
    }

    [Theory]
    [InlineData("json")]
    [InlineData("sqlite")]
    public async Task LegacyLogsAreRedactedForConsultationWithoutRewritingTheirSource(string provider)
    {
        using var factory = new NetWatchApplicationFactory(null, provider);
        using var client = factory.CreateClient();
        var storage = factory.Services.GetRequiredService<LocalDataStore>();
        var path = Path.Combine(factory.RuntimeDataRoot, "app-errors.json");
        await storage.WriteJsonAsync(path, new AppErrorLogStore
        {
            Errors = [new AppErrorEntry
            {
                ErrorId = "legacy-1", Timestamp = DateTimeOffset.Parse("2026-01-01T12:00:00Z"), Source = "legacy",
                ExceptionType = "ExampleException", Message = "https://user:private-pass@example.invalid/path?value=private-query",
                QueryString = "?token=legacy-query", StackTrace = "Authorization: Bearer legacy-bearer"
            }]
        }, new JsonSerializerOptions { WriteIndented = true });
        var before = await storage.ReadAllTextAsync(path);
        var redacted = await client.GetStringAsync("/api/diagnostics");
        foreach (var secret in new[] { "private-pass", "private-query", "legacy-query", "legacy-bearer" }) Assert.DoesNotContain(secret, redacted);
        Assert.Contains("https://example.invalid/path", redacted);
        Assert.Equal(before, await storage.ReadAllTextAsync(path));
        Assert.Contains("legacy-query", await client.GetStringAsync("/api/errors"));
    }

    [Theory]
    [InlineData("json")]
    [InlineData("sqlite")]
    public async Task PagingAndDateFiltersAreBoundedAndRejectStaleExports(string provider)
    {
        using var factory = new NetWatchApplicationFactory(null, provider);
        using var client = factory.CreateClient();
        for (var index = 0; index < 3; index++)
            (await client.PostAsJsonAsync("/api/diagnostics/client", new { kind = "error", message = "Synthetic error " + index })).EnsureSuccessStatusCode();
        var first = await Json(client, "/api/diagnostics?size=2");
        Assert.Equal(3, first["total"]!.GetValue<int>());
        Assert.Equal(2, first["entries"]!.AsArray().Count);
        var second = await Json(client, "/api/diagnostics?size=2&page=2&revision=" + first["revision"]!.GetValue<string>());
        Assert.Single(second["entries"]!.AsArray());
        (await client.PostAsJsonAsync("/api/diagnostics/client", new { kind = "error", message = "Another synthetic error" })).EnsureSuccessStatusCode();
        Assert.Equal(HttpStatusCode.Conflict, (await client.GetAsync("/api/diagnostics?revision=" + first["revision"]!.GetValue<string>())).StatusCode);
        var empty = await Json(client, "/api/diagnostics?to=2000-01-01T00:00:00Z");
        Assert.Empty(empty["entries"]!.AsArray());
        Assert.Equal(0, empty["total"]!.GetValue<int>());
    }

    [Theory]
    [InlineData("json", "source=invalid")]
    [InlineData("sqlite", "source=invalid")]
    [InlineData("json", "size=1000")]
    [InlineData("sqlite", "size=1000")]
    [InlineData("json", "page=-1")]
    [InlineData("sqlite", "page=-1")]
    [InlineData("json", "from=not-a-date")]
    [InlineData("sqlite", "from=not-a-date")]
    [InlineData("json", "from=2026-02-01&to=2026-01-01")]
    [InlineData("sqlite", "from=2026-02-01&to=2026-01-01")]
    public async Task InvalidQueriesReturnControlledErrors(string provider, string query)
    {
        using var factory = new NetWatchApplicationFactory(null, provider);
        using var client = factory.CreateClient();
        Assert.Equal(HttpStatusCode.BadRequest, (await client.GetAsync("/api/diagnostics?" + query)).StatusCode);
        Assert.Empty((await Json(client, "/api/errors"))["errors"]!.AsArray());
    }

    [Theory]
    [InlineData("json")]
    [InlineData("sqlite")]
    public async Task ProbeFailuresStayInHistoryAndNotInTheInternalApplicationLog(string provider)
    {
        using var factory = new NetWatchApplicationFactory(null, provider);
        using var client = factory.CreateClient();
        var config = JsonNode.Parse("""
        {"settings":{"timeoutMs":100,"retryCount":0},"devices":[{"name":"Local web test","ip":"127.0.0.1","checks":[{"type":"http","url":"http://127.0.0.1:1/health?token=private-query","timeoutMs":100}]}]}
        """)!;
        (await client.PostAsJsonAsync("/api/config", config)).EnsureSuccessStatusCode();
        (await client.PostAsync("/api/monitor/run", null)).EnsureSuccessStatusCode();
        var before = await client.GetStringAsync("/api/history");
        var page = await Json(client, "/api/diagnostics?source=monitoring&size=1");
        var entry = Assert.Single(page["entries"]!.AsArray())!;
        Assert.Equal("Local web test", entry["result"]!["name"]!.GetValue<string>());
        Assert.Equal("Down", entry["result"]!["status"]!.GetValue<string>());
        Assert.DoesNotContain("private-query", page.ToJsonString());
        Assert.Equal(1, entry["result"]!["checks"]![0]!["attempts"]!.GetValue<int>());
        Assert.Equal(before, await client.GetStringAsync("/api/history"));
        Assert.Empty((await Json(client, "/api/errors"))["errors"]!.AsArray());
    }

    [Fact]
    public async Task BrowserCollectionRejectsInvalidPayloadsAndLimitsFlooding()
    {
        using var factory = new NetWatchApplicationFactory();
        using var client = factory.CreateClient();
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsJsonAsync("/api/diagnostics/client", new { kind = "unexpected", message = "Test" })).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsJsonAsync("/api/diagnostics/client", new { kind = "error", message = new string('x', 4097) })).StatusCode);
        for (var index = 0; index < 28; index++)
            (await client.PostAsJsonAsync("/api/diagnostics/client", new { kind = "error", message = "Synthetic limited error" })).EnsureSuccessStatusCode();
        Assert.Equal(HttpStatusCode.TooManyRequests, (await client.PostAsJsonAsync("/api/diagnostics/client", new { kind = "error", message = "Over quota" })).StatusCode);
        Assert.Equal(28, (await Json(client, "/api/errors"))["errors"]!.AsArray().Count);
    }

    private static async Task<JsonNode> Json(HttpClient client, string path) => JsonNode.Parse(await client.GetStringAsync(path))!;
}
