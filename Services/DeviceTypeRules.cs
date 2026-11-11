using System.Security.Cryptography;
using System.Text.Json;
using NetWatch.Models;

namespace NetWatch.Services;

/// <summary>Self-contained classification rules; only workstation has peripheral behavior.</summary>
internal static class DeviceTypeRules
{
    internal static List<DeviceTypeDefinition> Normalize(List<DeviceTypeDefinition> types) => types
        .Select(type => new DeviceTypeDefinition { Id = PeripheralInventoryRules.Token(type.Id), Name = type.Name.Trim() })
        .ToList();

    internal static void Validate(MonitorConfiguration configuration)
    {
        var types = configuration.DeviceTypes;
        if (types is null || types.Count > 200)
            throw new InvalidDataException("deviceTypes must be an array with at most 200 types.");
        var ids = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        var names = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var type in types)
        {
            if (type is null) throw new InvalidDataException("Device types must not be null.");
            var id = PeripheralInventoryRules.Token(type.Id);
            if (id.Length is < 1 or > 80 || id[0] is < 'a' or > 'z'
                || id.Any(character => character is not (>= 'a' and <= 'z' or >= '0' and <= '9' or '-' or '_')))
                throw new InvalidDataException("Device type id must start with a letter and contain only letters, digits, hyphens or underscores (max 80).");
            if (string.IsNullOrWhiteSpace(type.Name) || type.Name.Length > 100 || type.Name.Any(char.IsControl))
                throw new InvalidDataException("Device type name is required, must not contain control characters and must not exceed 100 characters.");
            if (!ids.TryAdd(id, type.Name.Trim())) throw new InvalidDataException("Device type ids must be unique.");
            if (!names.Add(type.Name.Trim())) throw new InvalidDataException("Device type names must be unique.");
        }
        foreach (var systemType in DeviceTypeDefinition.CreateDefaults())
        {
            if (!ids.TryGetValue(systemType.Id, out var name) || name != systemType.Name)
                throw new InvalidDataException($"The system device type '{systemType.Id}' is protected and cannot be removed or renamed.");
        }
        foreach (var device in configuration.Devices)
        {
            if (device is null) continue;
            var id = string.IsNullOrWhiteSpace(device.DeviceType) ? "unspecified" : PeripheralInventoryRules.Token(device.DeviceType);
            if (!ids.ContainsKey(id))
                throw new InvalidDataException("A device references an unknown deviceType. Reassign all devices before deleting a type.");
        }
    }

    internal static DeviceTypeCatalogSnapshot Snapshot(RegionProfile profile, MonitorConfiguration configuration) => new()
    {
        ProfileId = profile.Id, ProfileName = profile.Name, Region = profile.Region,
        Version = Convert.ToHexString(SHA256.HashData(JsonSerializer.SerializeToUtf8Bytes(
            configuration.DeviceTypes.OrderBy(type => type.Id, StringComparer.Ordinal)))),
        DeviceTypes = configuration.DeviceTypes,
        ProtectedIds = DeviceTypeDefinition.CreateDefaults().Select(type => type.Id).ToList(),
        Usage = configuration.DeviceTypes.ToDictionary(type => type.Id,
            type => configuration.Devices.Count(device => device.DeviceType == type.Id))
    };
}

internal sealed class DeviceTypeConflictException(string message) : InvalidOperationException(message);
