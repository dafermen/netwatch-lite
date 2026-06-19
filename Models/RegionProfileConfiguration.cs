using System.Text.Json.Serialization;

namespace NetWatch.Models;

/// <summary>
/// Runtime registry of available region profiles and the active configuration file.
/// </summary>
public sealed class RegionProfileConfiguration
{
    /// <summary>
    /// Identifier of the region profile currently used by dashboard and configuration endpoints.
    /// </summary>
    [JsonPropertyName("activeProfileId")]
    public string ActiveProfileId { get; init; } = "sg1";

    /// <summary>
    /// Region profiles available to the operator.
    /// </summary>
    [JsonPropertyName("profiles")]
    public List<RegionProfile> Profiles { get; init; } = [];
}
