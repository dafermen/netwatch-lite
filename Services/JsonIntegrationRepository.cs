using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Options;
using NetWatch.Models;

namespace NetWatch.Services;

/// <summary>
/// Loads and stores external integration settings in integrations.json.
/// </summary>
public sealed class JsonIntegrationRepository
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        ReadCommentHandling = JsonCommentHandling.Skip,
        AllowTrailingCommas = true,
        WriteIndented = true,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    private static readonly HashSet<string> InventoryModes = new(StringComparer.OrdinalIgnoreCase)
    {
        "localJson",
        "externalEndpoint"
    };

    private static readonly HashSet<string> InventoryMethods = new(StringComparer.OrdinalIgnoreCase)
    {
        "GET",
        "POST"
    };

    private static readonly HashSet<string> ReportMethods = new(StringComparer.OrdinalIgnoreCase)
    {
        "POST",
        "PUT"
    };

    private readonly IWebHostEnvironment _environment;
    private readonly NetworkMonitorOptions _options;
    private readonly SemaphoreSlim _integrationLock = new(1, 1);
    private IntegrationConfiguration _configuration = CreateDefaultConfiguration();

    /// <summary>
    /// Initializes an integration repository that resolves integrations.json relative to the app content root.
    /// </summary>
    /// <param name="environment">ASP.NET Core hosting environment used to resolve relative file paths.</param>
    /// <param name="options">Network monitor options containing the integrations file path.</param>
    public JsonIntegrationRepository(
        IWebHostEnvironment environment,
        IOptions<NetworkMonitorOptions> options)
    {
        _environment = environment;
        _options = options.Value;
    }

    /// <summary>
    /// Returns the normalized integration configuration, creating integrations.json when missing.
    /// </summary>
    /// <param name="cancellationToken">Token used to cancel file operations.</param>
    /// <returns>The current integration configuration.</returns>
    public async Task<IntegrationConfiguration> GetAsync(CancellationToken cancellationToken = default)
    {
        await _integrationLock.WaitAsync(cancellationToken);

        try
        {
            var filePath = ResolveIntegrationFilePath();

            if (!File.Exists(filePath))
            {
                _configuration = CreateDefaultConfiguration();
                await SaveNormalizedConfigurationAsync(filePath, _configuration, cancellationToken);
                return _configuration;
            }

            IntegrationConfiguration? configuration;

            await using (var stream = File.OpenRead(filePath))
            {
                configuration = await JsonSerializer.DeserializeAsync<IntegrationConfiguration>(
                    stream,
                    JsonOptions,
                    cancellationToken);
            }

            _configuration = Normalize(configuration);
            await SaveNormalizedConfigurationAsync(filePath, _configuration, cancellationToken);
            return _configuration;
        }
        catch (JsonException ex)
        {
            throw new InvalidDataException("integrations.json contains invalid JSON.", ex);
        }
        finally
        {
            _integrationLock.Release();
        }
    }

    /// <summary>
    /// Saves the complete integration configuration after validation and normalization.
    /// </summary>
    /// <param name="configuration">Integration configuration submitted by the UI.</param>
    /// <param name="cancellationToken">Token used to cancel file operations.</param>
    /// <returns>The normalized saved integration configuration.</returns>
    public async Task<IntegrationConfiguration> SaveAsync(
        IntegrationConfiguration configuration,
        CancellationToken cancellationToken = default)
    {
        await _integrationLock.WaitAsync(cancellationToken);

        try
        {
            _configuration = Normalize(configuration);
            Validate(_configuration);
            _configuration.UpdatedAt = DateTimeOffset.Now;
            await SaveNormalizedConfigurationAsync(ResolveIntegrationFilePath(), _configuration, cancellationToken);
            return _configuration;
        }
        finally
        {
            _integrationLock.Release();
        }
    }

    private string ResolveIntegrationFilePath()
    {
        if (Path.IsPathRooted(_options.IntegrationFilePath))
        {
            return _options.IntegrationFilePath;
        }

        var contentRootPath = Path.Combine(_environment.ContentRootPath, _options.IntegrationFilePath);

        if (File.Exists(contentRootPath))
        {
            return contentRootPath;
        }

        var developmentDataPath = Path.Combine(_environment.ContentRootPath, "Data", _options.IntegrationFilePath);

        if (File.Exists(developmentDataPath))
        {
            return developmentDataPath;
        }

        return Directory.Exists(Path.Combine(_environment.ContentRootPath, "Data"))
            ? developmentDataPath
            : contentRootPath;
    }

    private static IntegrationConfiguration Normalize(IntegrationConfiguration? configuration)
    {
        configuration ??= CreateDefaultConfiguration();
        configuration.SchemaVersion = Math.Max(1, configuration.SchemaVersion);
        configuration.InventorySource ??= new InventorySourceConfiguration();
        configuration.ReportDestination ??= new ReportDestinationConfiguration();

        configuration.InventorySource.Mode = NormalizeText(configuration.InventorySource.Mode, "localJson");
        configuration.InventorySource.LocalJsonPath = NormalizeText(configuration.InventorySource.LocalJsonPath, "config.json");
        configuration.InventorySource.EndpointUrl = configuration.InventorySource.EndpointUrl?.Trim() ?? string.Empty;
        configuration.InventorySource.Method = NormalizeHttpMethod(configuration.InventorySource.Method, "GET");

        configuration.ReportDestination.EndpointUrl = configuration.ReportDestination.EndpointUrl?.Trim() ?? string.Empty;
        configuration.ReportDestination.Method = NormalizeHttpMethod(configuration.ReportDestination.Method, "POST");

        return configuration;
    }

    private static void Validate(IntegrationConfiguration configuration)
    {
        if (!InventoryModes.Contains(configuration.InventorySource.Mode))
        {
            throw new InvalidDataException("Inventory source mode must be localJson or externalEndpoint.");
        }

        if (!InventoryMethods.Contains(configuration.InventorySource.Method))
        {
            throw new InvalidDataException("Inventory source method must be GET or POST.");
        }

        if (!ReportMethods.Contains(configuration.ReportDestination.Method))
        {
            throw new InvalidDataException("Report destination method must be POST or PUT.");
        }

        if (configuration.InventorySource.Mode.Equals("externalEndpoint", StringComparison.OrdinalIgnoreCase)
            && string.IsNullOrWhiteSpace(configuration.InventorySource.EndpointUrl))
        {
            throw new InvalidDataException("External inventory source requires an endpoint URL.");
        }

        if (configuration.ReportDestination.Enabled
            && string.IsNullOrWhiteSpace(configuration.ReportDestination.EndpointUrl))
        {
            throw new InvalidDataException("Enabled report destination requires an endpoint URL.");
        }
    }

    private static string NormalizeText(string? value, string fallback)
    {
        return string.IsNullOrWhiteSpace(value) ? fallback : value.Trim();
    }

    private static string NormalizeHttpMethod(string? value, string fallback)
    {
        return NormalizeText(value, fallback).ToUpperInvariant();
    }

    private static async Task SaveNormalizedConfigurationAsync(
        string filePath,
        IntegrationConfiguration configuration,
        CancellationToken cancellationToken)
    {
        var directory = Path.GetDirectoryName(filePath);

        if (!string.IsNullOrWhiteSpace(directory))
        {
            Directory.CreateDirectory(directory);
        }

        await using var stream = File.Create(filePath);
        await JsonSerializer.SerializeAsync(stream, configuration, JsonOptions, cancellationToken);
    }

    private static IntegrationConfiguration CreateDefaultConfiguration()
    {
        return new IntegrationConfiguration();
    }
}
