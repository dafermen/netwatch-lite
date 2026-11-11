using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using NetWatch.Models;

namespace NetWatch.ContractTests;

public sealed class ApiContractTests : IClassFixture<NetWatchApplicationFactory>, IDisposable
{
    private readonly HttpClient _client;

    public ApiContractTests(NetWatchApplicationFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task HomePage_ReturnsNetWatchHtml()
    {
        var response = await _client.GetAsync("/");
        var html = await response.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("text/html", response.Content.Headers.ContentType?.MediaType);
        Assert.Contains("<title>NetWatch Lite</title>", html);
    }

    [Fact]
    public async Task DocumentationHome_ReturnsNavigationShellUnderDocsRoute()
    {
        var response = await _client.GetAsync("/docs/");
        var html = await response.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("text/html", response.Content.Headers.ContentType?.MediaType);
        Assert.Contains("<title>NetWatch Lite Documentation</title>", html);
        Assert.Contains("id=\"docs-sidebar\"", html);
        Assert.Contains("id=\"docs-search-input\"", html);
        Assert.Contains("href=\"/\" target=\"_self\">Volver a la aplicacion</a>", html);
        Assert.DoesNotContain("/docs/docs/", html);
    }

    [Theory]
    [InlineData("/docs/styles.css", "text/css")]
    [InlineData("/docs/app.js", "text/javascript")]
    public async Task DocumentationAssets_AreServed(string path, string mediaType)
    {
        var response = await _client.GetAsync(path);
        var content = await response.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(mediaType, response.Content.Headers.ContentType?.MediaType);
        Assert.NotEmpty(content);
    }

    [Fact]
    public async Task GetConfig_ReturnsSettingsAndDeviceArray()
    {
        var response = await _client.GetAsync("/api/config");
        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var root = document.RootElement;

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(JsonValueKind.Object, root.ValueKind);
        Assert.Equal(JsonValueKind.Object, root.GetProperty("settings").ValueKind);
        Assert.Equal(JsonValueKind.Array, root.GetProperty("devices").ValueKind);
    }

    [Fact]
    public async Task GetRegions_ReturnsActiveProfileContract()
    {
        var response = await _client.GetAsync("/api/regions");
        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var root = document.RootElement;

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.False(string.IsNullOrWhiteSpace(root.GetProperty("activeProfileId").GetString()));
        Assert.NotEmpty(root.GetProperty("profiles").EnumerateArray());
    }

    [Fact]
    public async Task GetIntegrations_ReturnsPreparatoryConfigurationContract()
    {
        var response = await _client.GetAsync("/api/integrations");
        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var root = document.RootElement;

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(1, root.GetProperty("schemaVersion").GetInt32());
        Assert.Equal("localJson", root.GetProperty("inventorySource").GetProperty("mode").GetString());
        Assert.False(root.GetProperty("reportDestination").GetProperty("enabled").GetBoolean());
    }

    [Fact]
    public async Task SaveIntegrations_ReturnsSavedConfigurationEnvelope()
    {
        var configuration = new IntegrationConfiguration();

        var response = await _client.PostAsJsonAsync("/api/integrations", configuration);
        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        var root = document.RootElement;

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(JsonValueKind.String, root.GetProperty("savedAt").ValueKind);
        Assert.Equal(
            "localJson",
            root.GetProperty("configuration").GetProperty("inventorySource").GetProperty("mode").GetString());
    }

    [Fact]
    public async Task SaveIntegrations_RejectsMissingExternalEndpoint()
    {
        var configuration = new IntegrationConfiguration
        {
            InventorySource = new InventorySourceConfiguration
            {
                Mode = "externalEndpoint",
                EndpointUrl = string.Empty,
                Method = "GET"
            }
        };

        var response = await _client.PostAsJsonAsync("/api/integrations", configuration);
        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Contains(
            "requires an endpoint URL",
            document.RootElement.GetProperty("error").GetString());
    }

    [Theory]
    [InlineData("/api/history", "runs")]
    [InlineData("/api/errors", "errors")]
    public async Task LocalStores_ReturnExpectedCollectionContract(string path, string collectionName)
    {
        var response = await _client.GetAsync(path);
        using var document = JsonDocument.Parse(await response.Content.ReadAsStringAsync());

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(
            JsonValueKind.Array,
            document.RootElement.GetProperty(collectionName).ValueKind);
    }

    public void Dispose()
    {
        _client.Dispose();
    }

    [Theory]
    [InlineData("{\"devices\":[null]}", "must not be null")]
    [InlineData("{\"devices\":[{\"name\":\"test\",\"ip\":\"127.0.0.1\",\"checks\":[null]}]}", "null check")]
    public async Task SaveConfig_RejectsNullMembersWithoutChangingConfiguration(string json, string error)
    {
        var before = await _client.GetStringAsync("/api/config/export");
        using var body = new StringContent(json, System.Text.Encoding.UTF8, "application/json");
        var response = await _client.PostAsync("/api/config", body);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Contains(error, await response.Content.ReadAsStringAsync());
        Assert.Equal(before, await _client.GetStringAsync("/api/config/export"));
    }

    [Theory]
    [InlineData("{\"devices\":[null]}", "must not be null")]
    [InlineData("{\"devices\":[{\"name\":\"test\",\"ip\":\"127.0.0.1\",\"checks\":[null]}]}", "null check")]
    public async Task ImportConfig_RejectsNullMembersWithoutChangingConfiguration(string json, string error)
    {
        var before = await _client.GetStringAsync("/api/config/export");
        using var body = new MultipartFormDataContent();
        body.Add(new StringContent(json), "configFile", "config.json");
        var response = await _client.PostAsync("/api/config/import", body);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Contains(error, await response.Content.ReadAsStringAsync());
        Assert.Equal(before, await _client.GetStringAsync("/api/config/export"));
    }
}
