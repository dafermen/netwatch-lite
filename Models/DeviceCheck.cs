using System.Text.Json.Serialization;

namespace NetWatch.Models;

/// <summary>
/// Describes a single monitoring operation to execute against a device.
/// </summary>
public sealed class DeviceCheck
{
    /// <summary>
    /// Check type. Supported values are ping and tcp.
    /// </summary>
    [JsonPropertyName("type")]
    public required string Type { get; init; }

    /// <summary>
    /// TCP port to test when <see cref="Type"/> is tcp. Ping checks do not use this value.
    /// </summary>
    [JsonPropertyName("port")]
    public int? Port { get; init; }
}
