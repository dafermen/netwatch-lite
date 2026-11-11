using System.Net;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.DependencyInjection;
using NetWatch.Models;

namespace NetWatch.ContractTests;

public sealed class UnexpectedErrorTests
{
    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task SerializationFailure_ReturnsSafeProblemEvenWhenErrorLogCannotBeWritten(bool breakErrorLog)
    {
        using var factory = new NetWatchApplicationFactory();
        if (breakErrorLog)
        {
            Directory.CreateDirectory(Path.Combine(factory.RuntimeDataRoot, "app-errors.json"));
        }
        using var host = factory.WithWebHostBuilder(builder => builder.ConfigureServices(services =>
            services.Configure<Microsoft.AspNetCore.Http.Json.JsonOptions>(options =>
                options.SerializerOptions.Converters.Add(new FailingIntegrationConverter()))));
        using var client = host.CreateClient();

        var response = await client.GetAsync("/api/integrations");
        var content = await response.Content.ReadAsStringAsync();
        using var problem = JsonDocument.Parse(content);

        Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        Assert.Equal(500, problem.RootElement.GetProperty("status").GetInt32());
        Assert.False(string.IsNullOrWhiteSpace(problem.RootElement.GetProperty("traceId").GetString()));
        Assert.DoesNotContain("private failure details", content);
        if (!breakErrorLog)
        {
            Assert.Contains("private failure details", await File.ReadAllTextAsync(
                Path.Combine(factory.RuntimeDataRoot, "app-errors.json")));
        }
    }

    private sealed class FailingIntegrationConverter : JsonConverter<IntegrationConfiguration>
    {
        public override IntegrationConfiguration? Read(ref Utf8JsonReader reader, Type typeToConvert,
            JsonSerializerOptions options) => throw new NotSupportedException();

        public override void Write(Utf8JsonWriter writer, IntegrationConfiguration value,
            JsonSerializerOptions options) => throw new InvalidOperationException("private failure details");
    }
}
