using System.Text.Json.Serialization;

namespace NetWatch.Models;

/// <summary>
/// Describes a single monitoring operation to execute against a device.
/// </summary>
public sealed class DeviceCheck
{
    /// <summary>
    /// Check type: ping, tcp, anonymous http (including HTTPS), or authenticated browser.
    /// </summary>
    [JsonPropertyName("type")]
    public required string Type { get; init; }

    /// <summary>
    /// TCP port to test when <see cref="Type"/> is tcp. Ping checks do not use this value.
    /// </summary>
    [JsonPropertyName("port")]
    public int? Port { get; init; }

    /// <summary>Absolute HTTP/HTTPS URL for an HTTP probe or separate browser evaluation.</summary>
    [JsonPropertyName("url")]
    public string? Url { get; init; }

    /// <summary>HTTP deadline per attempt, including response-body validation.</summary>
    [JsonPropertyName("timeoutMs")]
    public int? TimeoutMs { get; init; }

    /// <summary>Exact final response status; defaults to 200 for HTTP checks.</summary>
    [JsonPropertyName("expectedStatusCode")]
    public int? ExpectedStatusCode { get; init; }

    /// <summary>Optional case-sensitive text in the HTTP response or browser's visible content.</summary>
    [JsonPropertyName("expectedText")]
    public string? ExpectedText { get; init; }

    /// <summary>Opt-in anonymous HTTP redirects; absent/false retains legacy behavior.</summary>
    [JsonPropertyName("followRedirects")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public bool FollowRedirects { get; init; }

    /// <summary>Additional trusted HTTPS identity-provider origins for an interactive browser check.</summary>
    [JsonPropertyName("authenticationOrigins")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public IReadOnlyList<string>? AuthenticationOrigins { get; init; }
}
