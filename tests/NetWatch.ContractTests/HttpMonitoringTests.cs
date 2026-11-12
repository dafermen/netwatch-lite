using System.Net;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Security.Cryptography.X509Certificates;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Hosting.Server;
using Microsoft.AspNetCore.Hosting.Server.Features;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using NetWatch.Models;
using NetWatch.Services;

namespace NetWatch.ContractTests;

public sealed class HttpMonitoringTests
{
    private static readonly JsonSerializerOptions WireJson = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() }
    };
    private static MonitorConfiguration Config(params DeviceCheck[] checks) => new()
    {
        Devices = [new Device { Name = "Example web app", Ip = "127.0.0.1", Checks = [.. checks] }]
    };

    [Fact]
    public async Task FullRun_StoresDiagnosticsAndAggregatesHttpHealth()
    {
        await using var server = await ProbeServer.StartAsync();
        using var factory = new NetWatchApplicationFactory();
        using var client = factory.CreateClient();
        var configuration = Config(
            new DeviceCheck { Type = "http", Url = server.Http + "/ok?token=private", ExpectedText = "READY" },
            new DeviceCheck { Type = "http", Url = server.Http + "/unavailable" });
        (await client.PostAsJsonAsync("/api/config", configuration)).EnsureSuccessStatusCode();
        var response = await client.PostAsync("/api/monitor/run", null);
        response.EnsureSuccessStatusCode();
        var payload = JsonNode.Parse(await response.Content.ReadAsStringAsync())!;
        var result = payload["results"]![0]!;
        Assert.Equal("Degraded", result["status"]!.GetValue<string>());
        Assert.True(result["checks"]![0]!["isAvailable"]!.GetValue<bool>());
        Assert.Equal(503, result["checks"]![1]!["statusCode"]!.GetValue<int>());
        Assert.Equal("UnexpectedStatus", result["checks"]![1]!["status"]!.GetValue<string>());
        var historyText = await client.GetStringAsync("/api/history");
        Assert.DoesNotContain("token=private", historyText);
        Assert.Contains("expected 200", historyText);
        Assert.Contains("durationMs", historyText);
        Assert.Single(JsonNode.Parse(historyText)!["runs"]!.AsArray());
    }

    [Theory]
    [InlineData("/ok", "missing", "ExpectedTextMissing", 200)]
    [InlineData("/slow", null, "TimedOut", null)]
    [InlineData("/slow-body", "READY", "TimedOut", 200)]
    [InlineData("/redirect", null, "UnexpectedStatus", 302)]
    public async Task FailedProbe_IsDownAndStreamsItsMessage(string path, string? text, string status, int? code)
    {
        await using var server = await ProbeServer.StartAsync();
        using var factory = new NetWatchApplicationFactory();
        using var client = factory.CreateClient();
        (await client.PostAsJsonAsync("/api/config", Config(new DeviceCheck
        {
            Type = "http", Url = server.Http + path, ExpectedText = text,
            TimeoutMs = path.StartsWith("/slow", StringComparison.Ordinal) ? 200 : 10000
        }))).EnsureSuccessStatusCode();
        var stream = await client.GetStringAsync("/api/monitor/stream");
        Assert.Contains("event: result", stream);
        Assert.Contains(status, stream);
        var history = await client.GetFromJsonAsync<MonitorHistoryStore>("/api/history", WireJson);
        var result = Assert.Single(Assert.Single(history!.Runs).Results);
        Assert.Equal(DeviceStatus.Down, result.Status);
        var check = Assert.Single(result.Checks);
        Assert.Equal(status, check.Status);
        if (path == "/slow-body")
        {
            // The end-to-end deadline also covers scheduling/connection/headers, not only body reads.
            Assert.True(check.StatusCode is null or 200);
            Assert.Equal(200, check.TimeoutMs);
            Assert.Contains("200 ms", check.Message!);
        }
        else Assert.Equal(code, check.StatusCode);
        Assert.NotEmpty(check.Message!);
        if (path == "/redirect") Assert.Equal(0, server.RedirectTargetRequests);
    }

    [Fact]
    public async Task Https_UntrustedCertificateIsRejectedByProductionTransport()
    {
        await using var server = await ProbeServer.StartAsync();
        using var factory = new NetWatchApplicationFactory();
        using var client = factory.CreateClient();
        (await client.PostAsJsonAsync("/api/config", Config(new DeviceCheck { Type = "http", Url = server.Https + "/ok" }))).EnsureSuccessStatusCode();
        (await client.PostAsync("/api/monitor/run", null)).EnsureSuccessStatusCode();
        var history = await client.GetFromJsonAsync<MonitorHistoryStore>("/api/history", WireJson);
        var check = Assert.Single(Assert.Single(Assert.Single(history!.Runs).Results).Checks);
        Assert.Equal("TlsError", check.Status);
        Assert.False(check.IsAvailable);
    }

    [Fact]
    public async Task FailedHttpProbe_UsesExistingRetryPolicy()
    {
        await using var server = await ProbeServer.StartAsync();
        using var factory = new NetWatchApplicationFactory();
        using var client = factory.CreateClient();
        var configuration = Config(new DeviceCheck { Type = "http", Url = server.Http + "/flaky" });
        configuration = new MonitorConfiguration
        {
            Settings = new MonitorSettings { RetryCount = 1, RetryDelayMs = 0 }, Devices = configuration.Devices
        };
        (await client.PostAsJsonAsync("/api/config", configuration)).EnsureSuccessStatusCode();
        (await client.PostAsync("/api/monitor/run", null)).EnsureSuccessStatusCode();
        var history = await client.GetFromJsonAsync<MonitorHistoryStore>("/api/history", WireJson);
        Assert.True(Assert.Single(Assert.Single(Assert.Single(history!.Runs).Results).Checks).IsAvailable);
        Assert.Equal(2, server.FlakyRequests);
    }

    [Fact]
    public async Task PingOnly_PreservesLegacySyntheticPingWithoutExecutingHttp()
    {
        await using var server = await ProbeServer.StartAsync();
        using var factory = new NetWatchApplicationFactory();
        using var client = factory.CreateClient();
        (await client.PostAsJsonAsync("/api/config", Config(new DeviceCheck { Type = "http", Url = server.Http + "/flaky" }))).EnsureSuccessStatusCode();
        (await client.PostAsync("/api/monitor/run?checkMode=PingOnly", null)).EnsureSuccessStatusCode();
        var history = await client.GetFromJsonAsync<MonitorHistoryStore>("/api/history", WireJson);
        Assert.Equal("ping", Assert.Single(Assert.Single(Assert.Single(history!.Runs).Results).Checks).Type);
        Assert.Equal(0, server.FlakyRequests);
    }

    [Fact]
    public async Task HttpFields_SurviveReloadRowUpdateExportImportAndProfileCopy()
    {
        using var factory = new NetWatchApplicationFactory();
        using var client = factory.CreateClient();
        var configuration = Config(new DeviceCheck
        {
            Type = "HTTP", Url = " https://example.invalid/health ", ExpectedText = " READY\n", TimeoutMs = 3000, ExpectedStatusCode = 202
        });
        (await client.PostAsJsonAsync("/api/config", configuration)).EnsureSuccessStatusCode();
        (await client.PostAsync("/api/reload", null)).EnsureSuccessStatusCode();
        var saved = (await client.GetFromJsonAsync<MonitorConfiguration>("/api/config"))!;
        (await client.PostAsJsonAsync("/api/config/devices/0", saved.Devices[0])).EnsureSuccessStatusCode();
        using var form = new MultipartFormDataContent();
        form.Add(new StringContent(await client.GetStringAsync("/api/config/export")), "configFile", "http.json");
        (await client.PostAsync("/api/config/import", form)).EnsureSuccessStatusCode();
        (await client.PostAsJsonAsync("/api/regions", new { name = "Copied web checks", copyFromActive = true })).EnsureSuccessStatusCode();
        var copy = (await client.GetFromJsonAsync<MonitorConfiguration>("/api/config"))!;
        var check = Assert.Single(Assert.Single(copy.Devices).Checks);
        Assert.Equal("http", check.Type);
        Assert.Equal("https://example.invalid/health", check.Url);
        Assert.Equal(" READY\n", check.ExpectedText);
        Assert.Equal(3000, check.TimeoutMs);
        Assert.Equal(202, check.ExpectedStatusCode);
    }

    public static IEnumerable<object[]> InvalidCases()
    {
        foreach (var field in new[] { "url", "relative", "scheme", "credentials", "fragment", "longUrl", "control", "lowTimeout", "highTimeout", "lowStatus", "highStatus", "longText", "port" })
            foreach (var import in new[] { false, true }) yield return [field, import];
    }

    [Theory]
    [MemberData(nameof(InvalidCases))]
    public async Task InvalidHttpCheck_Returns400WithoutChangingConfiguration(string field, bool import)
    {
        using var factory = new NetWatchApplicationFactory();
        using var client = factory.CreateClient();
        (await client.PostAsJsonAsync("/api/config", Config(new DeviceCheck { Type = "ping" }))).EnsureSuccessStatusCode();
        var before = await client.GetStringAsync("/api/config/export");
        var invalid = JsonSerializer.SerializeToNode(Config(new DeviceCheck { Type = "http", Url = "https://example.invalid/health" }), new JsonSerializerOptions(JsonSerializerDefaults.Web))!;
        var check = invalid["devices"]![0]!["checks"]![0]!;
        switch (field)
        {
            case "url": check["url"] = null; break;
            case "relative": check["url"] = "/health"; break;
            case "scheme": check["url"] = "file:///etc/passwd"; break;
            case "credentials": check["url"] = "https://user:secret@example.invalid/"; break;
            case "fragment": check["url"] = "https://example.invalid/#ready"; break;
            case "longUrl": check["url"] = "https://example.invalid/" + new string('a', 2048); break;
            case "control": check["url"] = "https://example.invalid/\nhealth"; break;
            case "lowTimeout": check["timeoutMs"] = 99; break;
            case "highTimeout": check["timeoutMs"] = 60001; break;
            case "lowStatus": check["expectedStatusCode"] = 199; break;
            case "highStatus": check["expectedStatusCode"] = 600; break;
            case "longText": check["expectedText"] = new string('a', 4097); break;
            case "port": check["port"] = 443; break;
        }
        HttpResponseMessage response;
        if (import)
        {
            using var form = new MultipartFormDataContent();
            form.Add(new StringContent(invalid.ToJsonString()), "configFile", "invalid.json");
            response = await client.PostAsync("/api/config/import", form);
        }
        else response = await client.PostAsJsonAsync("/api/config", invalid);
        using (response)
        {
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
            Assert.Contains("HTTP", await response.Content.ReadAsStringAsync());
        }
        Assert.Equal(before, await client.GetStringAsync("/api/config/export"));
    }

    private sealed class ProbeServer(WebApplication app, X509Certificate2 certificate) : IAsyncDisposable
    {
        public string Http { get; private set; } = "";
        public string Https { get; private set; } = "";
        public int FlakyRequests;
        public int RedirectTargetRequests;

        public static async Task<ProbeServer> StartAsync()
        {
            using var key = RSA.Create(2048);
            var request = new CertificateRequest("CN=localhost", key, HashAlgorithmName.SHA256, RSASignaturePadding.Pkcs1);
            using var generated = request.CreateSelfSigned(DateTimeOffset.UtcNow.AddDays(-1), DateTimeOffset.UtcNow.AddDays(1));
            var certificate = X509CertificateLoader.LoadPkcs12(generated.Export(X509ContentType.Pfx), null);
            var builder = WebApplication.CreateBuilder();
            builder.Logging.ClearProviders();
            builder.WebHost.ConfigureKestrel(options =>
            {
                options.Listen(IPAddress.Loopback, 0);
                options.Listen(IPAddress.Loopback, 0, listener => listener.UseHttps(certificate));
            });
            var app = builder.Build();
            var server = new ProbeServer(app, certificate);
            app.MapGet("/ok", () => Results.Text("Service READY"));
            app.MapGet("/unavailable", () => Results.StatusCode(503));
            app.MapGet("/redirect", () => Results.Redirect("/redirect-target"));
            app.MapGet("/redirect-target", () => { Interlocked.Increment(ref server.RedirectTargetRequests); return Results.Ok(); });
            app.MapGet("/flaky", () => Results.StatusCode(Interlocked.Increment(ref server.FlakyRequests) == 1 ? 503 : 200));
            app.MapGet("/slow", async context =>
            {
                await Task.Delay(5000, context.RequestAborted);
                await context.Response.WriteAsync("READY");
            });
            app.MapGet("/slow-body", async context =>
            {
                await context.Response.WriteAsync("Starting ");
                await context.Response.Body.FlushAsync(context.RequestAborted);
                await Task.Delay(5000, context.RequestAborted);
                await context.Response.WriteAsync("READY");
            });
            await app.StartAsync();
            var addresses = app.Services.GetRequiredService<IServer>().Features.Get<IServerAddressesFeature>()!.Addresses;
            server.Http = addresses.Single(address => address.StartsWith("http://", StringComparison.Ordinal));
            server.Https = addresses.Single(address => address.StartsWith("https://", StringComparison.Ordinal));
            return server;
        }

        public async ValueTask DisposeAsync()
        {
            await app.StopAsync();
            await app.DisposeAsync();
            certificate.Dispose();
        }
    }
}
