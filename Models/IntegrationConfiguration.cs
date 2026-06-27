using System.Text.Json.Serialization;

namespace NetWatch.Models;

/// <summary>
/// Root document stored in integrations.json for future external data exchange.
/// </summary>
public sealed class IntegrationConfiguration
{
    /// <summary>
    /// Schema version used for future migrations.
    /// </summary>
    [JsonPropertyName("schemaVersion")]
    public int SchemaVersion { get; set; } = 1;

    /// <summary>
    /// Current inventory source selection.
    /// </summary>
    [JsonPropertyName("inventorySource")]
    public InventorySourceConfiguration InventorySource { get; set; } = new();

    /// <summary>
    /// Current outbound report destination selection.
    /// </summary>
    [JsonPropertyName("reportDestination")]
    public ReportDestinationConfiguration ReportDestination { get; set; } = new();

    /// <summary>
    /// Timestamp of the last saved update, when available.
    /// </summary>
    [JsonPropertyName("updatedAt")]
    public DateTimeOffset? UpdatedAt { get; set; }
}

/// <summary>
/// Defines whether device inventory comes from the local JSON profile or a future external endpoint.
/// </summary>
public sealed class InventorySourceConfiguration
{
    /// <summary>
    /// Source mode: localJson or externalEndpoint.
    /// </summary>
    [JsonPropertyName("mode")]
    public string Mode { get; set; } = "localJson";

    /// <summary>
    /// Local JSON path used while the app is not connected to external systems.
    /// </summary>
    [JsonPropertyName("localJsonPath")]
    public string LocalJsonPath { get; set; } = "config.json";

    /// <summary>
    /// External endpoint URL planned for inventory import.
    /// </summary>
    [JsonPropertyName("endpointUrl")]
    public string EndpointUrl { get; set; } = string.Empty;

    /// <summary>
    /// HTTP method planned for inventory import.
    /// </summary>
    [JsonPropertyName("method")]
    public string Method { get; set; } = "GET";
}

/// <summary>
/// Defines where report data should be sent when outbound integrations are implemented.
/// </summary>
public sealed class ReportDestinationConfiguration
{
    /// <summary>
    /// Enables the future outbound report destination.
    /// </summary>
    [JsonPropertyName("enabled")]
    public bool Enabled { get; set; }

    /// <summary>
    /// External endpoint URL planned for report delivery.
    /// </summary>
    [JsonPropertyName("endpointUrl")]
    public string EndpointUrl { get; set; } = string.Empty;

    /// <summary>
    /// HTTP method planned for report delivery.
    /// </summary>
    [JsonPropertyName("method")]
    public string Method { get; set; } = "POST";

    /// <summary>
    /// Indicates whether executive summary data should be sent.
    /// </summary>
    [JsonPropertyName("includeSummary")]
    public bool IncludeSummary { get; set; } = true;

    /// <summary>
    /// Indicates whether detailed device report rows should be sent.
    /// </summary>
    [JsonPropertyName("includeRows")]
    public bool IncludeRows { get; set; } = true;
}
