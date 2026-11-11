using System.Text.Json.Serialization;

namespace NetWatch.Models;

/// <summary>A stable device classification key and its editable display name.</summary>
public sealed class DeviceTypeDefinition
{
    /// <summary>Stable lowercase identifier stored in Device.DeviceType.</summary>
    [JsonPropertyName("id")]
    public required string Id { get; init; }

    /// <summary>Operator-facing name, independent of monitoring checks.</summary>
    [JsonPropertyName("name")]
    public required string Name { get; init; }

    /// <summary>Independent defaults for legacy profiles; system keys/names are protected.</summary>
    public static List<DeviceTypeDefinition> CreateDefaults() =>
    [
        new() { Id = "unspecified", Name = "Not specified" },
        new() { Id = "workstation", Name = "Workstation" },
        new() { Id = "server", Name = "Server" },
        new() { Id = "network", Name = "Network device" },
        new() { Id = "other", Name = "Other" }
    ];
}

/// <summary>Catalog-only edit with optimistic concurrency and an explicit profile identity.</summary>
public sealed class UpdateDeviceTypesRequest
{
    /// <summary>Profile identity returned by the catalog read.</summary>
    public string ProfileId { get; init; } = "";
    /// <summary>Opaque catalog revision returned by the last read.</summary>
    public string Version { get; init; } = "";
    /// <summary>Complete proposed type catalog, including protected entries.</summary>
    public List<DeviceTypeDefinition> DeviceTypes { get; init; } = [];
}

/// <summary>Consistent active-profile catalog, usage counts and concurrency token.</summary>
public sealed class DeviceTypeCatalogSnapshot
{
    /// <summary>Captured active profile identity, not a filesystem path.</summary>
    public required string ProfileId { get; init; }
    /// <summary>Captured profile display name.</summary>
    public required string ProfileName { get; init; }
    /// <summary>Captured region display name.</summary>
    public required string Region { get; init; }
    /// <summary>Opaque revision of the normalized catalog, independent of its ordering.</summary>
    public required string Version { get; init; }
    /// <summary>Protected system IDs which cannot be renamed, removed or repurposed.</summary>
    public List<string> ProtectedIds { get; init; } = [];
    /// <summary>Configured classifications.</summary>
    public List<DeviceTypeDefinition> DeviceTypes { get; init; } = [];
    /// <summary>Number of configured devices per type, including disabled records.</summary>
    public Dictionary<string, int> Usage { get; init; } = [];
}
