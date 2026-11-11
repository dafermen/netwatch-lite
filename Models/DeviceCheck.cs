using System.Text.Json.Serialization;

namespace NetWatch.Models;

/// <summary>
/// Describes a single monitoring operation to execute against a device.
/// </summary>
public sealed class DeviceCheck
{
    /// <summary>
    /// Check type. Supported values are ping, tcp and http (including HTTPS).
    /// </summary>
    [JsonPropertyName("type")]
    public required string Type { get; init; }

    /// <summary>
    /// TCP port to test when <see cref="Type"/> is tcp. Ping checks do not use this value.
    /// </summary>
    [JsonPropertyName("port")]
    public int? Port { get; init; }

    /// <summary>Absolute HTTP/HTTPS URL for an anonymous GET probe.</summary>
    [JsonPropertyName("url")]
    public string? Url { get; init; }

    /// <summary>HTTP deadline per attempt, including response-body validation.</summary>
    [JsonPropertyName("timeoutMs")]
    public int? TimeoutMs { get; init; }

    /// <summary>Exact final response status; defaults to 200 for HTTP checks.</summary>
    [JsonPropertyName("expectedStatusCode")]
    public int? ExpectedStatusCode { get; init; }

    /// <summary>Optional literal, case-sensitive substring of the HTTP response.</summary>
    [JsonPropertyName("expectedText")]
    public string? ExpectedText { get; init; }
}
