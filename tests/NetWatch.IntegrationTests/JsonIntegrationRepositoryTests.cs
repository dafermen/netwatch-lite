using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;
using NetWatch.Models;
using NetWatch.Services;

namespace NetWatch.IntegrationTests;

public sealed class JsonIntegrationRepositoryTests
{
    [Fact]
    public async Task GetAsync_CreatesDefaultConfigurationInDataDirectory()
    {
        using var tempDirectory = new TemporaryDirectory();
        Directory.CreateDirectory(Path.Combine(tempDirectory.Path, "Data"));
        var repository = CreateRepository(tempDirectory.Path);

        var configuration = await repository.GetAsync();

        Assert.Equal("localJson", configuration.InventorySource.Mode);
        Assert.False(configuration.ReportDestination.Enabled);
        Assert.True(File.Exists(Path.Combine(
            tempDirectory.Path,
            "Data",
            "integrations.json")));
    }

    [Fact]
    public async Task SaveAsync_NormalizesAndPersistsConfiguration()
    {
        using var tempDirectory = new TemporaryDirectory();
        Directory.CreateDirectory(Path.Combine(tempDirectory.Path, "Data"));
        var repository = CreateRepository(tempDirectory.Path);
        var input = new IntegrationConfiguration
        {
            SchemaVersion = 0,
            InventorySource = new InventorySourceConfiguration
            {
                Mode = " localJson ",
                LocalJsonPath = " custom-config.json ",
                Method = "get"
            },
            ReportDestination = new ReportDestinationConfiguration
            {
                Enabled = true,
                EndpointUrl = " https://example.invalid/reports ",
                Method = "put"
            }
        };

        var saved = await repository.SaveAsync(input);
        var reloaded = await CreateRepository(tempDirectory.Path).GetAsync();

        Assert.Equal(1, saved.SchemaVersion);
        Assert.Equal("localJson", reloaded.InventorySource.Mode);
        Assert.Equal("custom-config.json", reloaded.InventorySource.LocalJsonPath);
        Assert.Equal("GET", reloaded.InventorySource.Method);
        Assert.Equal("https://example.invalid/reports", reloaded.ReportDestination.EndpointUrl);
        Assert.Equal("PUT", reloaded.ReportDestination.Method);
        Assert.NotNull(reloaded.UpdatedAt);
    }

    [Fact]
    public async Task SaveAsync_RejectsExternalInventoryWithoutEndpoint()
    {
        using var tempDirectory = new TemporaryDirectory();
        Directory.CreateDirectory(Path.Combine(tempDirectory.Path, "Data"));
        var repository = CreateRepository(tempDirectory.Path);
        var configuration = new IntegrationConfiguration
        {
            InventorySource = new InventorySourceConfiguration
            {
                Mode = "externalEndpoint",
                EndpointUrl = string.Empty,
                Method = "GET"
            }
        };

        var exception = await Assert.ThrowsAsync<InvalidDataException>(
            () => repository.SaveAsync(configuration));

        Assert.Contains("requires an endpoint URL", exception.Message);
        Assert.False(File.Exists(Path.Combine(
            tempDirectory.Path,
            "Data",
            "integrations.json")));
    }

    private static JsonIntegrationRepository CreateRepository(string contentRoot)
    {
        var environment = new TestWebHostEnvironment
        {
            ContentRootPath = contentRoot
        };
        var options = Options.Create(new NetworkMonitorOptions
        {
            IntegrationFilePath = "integrations.json"
        });

        return new JsonIntegrationRepository(environment, options);
    }

    private sealed class TestWebHostEnvironment : IWebHostEnvironment
    {
        public string ApplicationName { get; set; } = "NetWatch.IntegrationTests";
        public IFileProvider WebRootFileProvider { get; set; } = new NullFileProvider();
        public string WebRootPath { get; set; } = string.Empty;
        public string EnvironmentName { get; set; } = Environments.Development;
        public string ContentRootPath { get; set; } = string.Empty;
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }

    private sealed class TemporaryDirectory : IDisposable
    {
        public TemporaryDirectory()
        {
            Path = System.IO.Path.Combine(
                System.IO.Path.GetTempPath(),
                "netwatch-lite-tests",
                Guid.NewGuid().ToString("N"));
            Directory.CreateDirectory(Path);
        }

        public string Path { get; }

        public void Dispose()
        {
            if (Directory.Exists(Path))
            {
                Directory.Delete(Path, recursive: true);
            }
        }
    }
}
