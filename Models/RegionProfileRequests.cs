using System.Text.Json.Serialization;

namespace NetWatch.Models;

/// <summary>
/// Request body used to create a new independent region profile.
/// </summary>
public sealed class CreateRegionProfileRequest
{
    /// <summary>
    /// Human-readable name for the new profile.
    /// </summary>
    [JsonPropertyName("name")]
    public string Name { get; init; } = "";

    /// <summary>
    /// Region or support group label for the new profile.
    /// </summary>
    [JsonPropertyName("region")]
    public string Region { get; init; } = "";

    /// <summary>
    /// When true, seeds the new profile with a copy of the active profile's JSON.
    /// </summary>
    [JsonPropertyName("copyFromActive")]
    public bool CopyFromActive { get; init; } = true;
}

/// <summary>
/// Request body used to rename a region profile.
/// </summary>
public sealed class RenameRegionProfileRequest
{
    /// <summary>
    /// Updated human-readable name.
    /// </summary>
    [JsonPropertyName("name")]
    public string Name { get; init; } = "";

    /// <summary>
    /// Updated region or support group label.
    /// </summary>
    [JsonPropertyName("region")]
    public string Region { get; init; } = "";
}
