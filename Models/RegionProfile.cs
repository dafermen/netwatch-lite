using System.Text.Json.Serialization;

namespace NetWatch.Models;

/// <summary>
/// Describes one independent monitor configuration profile.
/// </summary>
public sealed class RegionProfile
{
    /// <summary>
    /// Stable profile identifier used by API routes and the active profile selection.
    /// </summary>
    [JsonPropertyName("id")]
    public required string Id { get; init; }

    /// <summary>
    /// Human-readable profile name shown in the UI.
    /// </summary>
    [JsonPropertyName("name")]
    public required string Name { get; init; }

    /// <summary>
    /// Region or support group label represented by this profile.
    /// </summary>
    [JsonPropertyName("region")]
    public required string Region { get; init; }

    /// <summary>
    /// Relative JSON file path containing this profile's monitor configuration.
    /// </summary>
    [JsonPropertyName("file")]
    public required string File { get; init; }

    /// <summary>
    /// Indicates whether the profile is protected from deletion.
    /// </summary>
    [JsonPropertyName("builtIn")]
    public bool BuiltIn { get; init; }
}
