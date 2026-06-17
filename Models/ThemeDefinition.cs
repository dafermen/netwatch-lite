using System.Text.Json.Serialization;

namespace NetWatch.Models;

/// <summary>
/// One named UI theme template.
/// </summary>
public sealed class ThemeDefinition
{
    /// <summary>
    /// Stable unique theme identifier.
    /// </summary>
    [JsonPropertyName("id")]
    public required string Id { get; init; }

    /// <summary>
    /// Human-readable theme name.
    /// </summary>
    [JsonPropertyName("name")]
    public required string Name { get; init; }

    /// <summary>
    /// Built-in themes cannot be deleted by the UI.
    /// </summary>
    [JsonPropertyName("builtIn")]
    public bool BuiltIn { get; init; }

    /// <summary>
    /// Color values keyed by supported theme token name.
    /// </summary>
    [JsonPropertyName("colors")]
    public Dictionary<string, string> Colors { get; init; } = [];
}
