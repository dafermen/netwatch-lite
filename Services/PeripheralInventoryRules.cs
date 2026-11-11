using NetWatch.Models;

namespace NetWatch.Services;

/// <summary>Validates the self-contained catalog and workstation references before persistence.</summary>
internal static class PeripheralInventoryRules
{
    internal static string Token(string? value) => value?.Trim().ToLowerInvariant() ?? "";

    internal static void Validate(MonitorConfiguration configuration)
    {
        if (configuration.PeripheralCatalog is null || configuration.PeripheralCatalog.Count > 500)
            throw new InvalidDataException("peripheralCatalog must be an array with at most 500 models.");
        var models = new Dictionary<string, PeripheralCatalogEntry>(StringComparer.OrdinalIgnoreCase);
        var names = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var model in configuration.PeripheralCatalog)
        {
            if (model is null) throw new InvalidDataException("Catalog models must not be null.");
            Required(model.Id, 80, "Catalog model id");
            Required(model.Manufacturer, 100, "Manufacturer");
            Required(model.Model, 150, "Model");
            if (Token(model.Kind) is not ("printer" or "scanner"))
                throw new InvalidDataException("Catalog kind must be printer or scanner.");
            if (!models.TryAdd(model.Id.Trim(), model))
                throw new InvalidDataException("Catalog model ids must be unique.");
            if (!names.Add($"{Token(model.Kind)}\u001f{model.Manufacturer.Trim()}\u001f{model.Model.Trim()}"))
                throw new InvalidDataException("The catalog already contains this manufacturer and model.");
        }
        foreach (var device in configuration.Devices)
        {
            if (device is null) continue; // Core configuration validation reports the device index.
            var type = Token(device.DeviceType);
            if (device.WorkstationPeripherals is null) continue;
            if (type != "workstation")
                throw new InvalidDataException("Peripheral inventory can only be assigned to workstations.");
            ValidateGroup(device.WorkstationPeripherals.Printers, "printer", models);
            ValidateGroup(device.WorkstationPeripherals.Scanners, "scanner", models);
        }
    }

    private static void ValidateGroup(PeripheralGroup? group, string kind,
        Dictionary<string, PeripheralCatalogEntry> models)
    {
        if (group is null || group.Items is null || group.Items.Count > 50)
            throw new InvalidDataException($"The {kind} inventory requires a group with at most 50 items.");
        var status = Token(group.Status);
        if (status is not ("unrecorded" or "none" or "assigned"))
            throw new InvalidDataException("Peripheral status must be unrecorded, none or assigned.");
        if ((status == "assigned") != (group.Items.Count > 0))
            throw new InvalidDataException("Only assigned peripheral groups may contain items, and they require at least one item.");
        foreach (var item in group.Items)
        {
            if (item is null) throw new InvalidDataException("Peripheral assignments must not be null.");
            Required(item.ModelId, 80, "Assigned model id");
            if (!models.TryGetValue(item.ModelId.Trim(), out var model) || Token(model.Kind) != kind)
                throw new InvalidDataException($"Assigned {kind} model is missing or has the wrong kind. Remove its assignments before deleting a model.");
            if (Token(item.Connection) is not ("usb" or "network" or "other"))
                throw new InvalidDataException("Peripheral connection must be usb, network or other.");
            if (NormalizeLinkType(item.LinkType) is not ("unrecorded" or "wireless" or "cabled"))
                throw new InvalidDataException("Peripheral linkType must be unrecorded, wireless or cabled.");
            Optional(item.Identifier, 200, "Peripheral identifier");
            Optional(item.Address, 253, "Peripheral address");
            Optional(item.Notes, 1000, "Peripheral notes");
            if (Token(item.Connection) != "network" && !string.IsNullOrWhiteSpace(item.Address))
                throw new InvalidDataException("Only network peripherals may have a network address.");
        }
    }

    internal static List<PeripheralCatalogEntry> NormalizeCatalog(List<PeripheralCatalogEntry> catalog) =>
        catalog.Select(model => new PeripheralCatalogEntry
        {
            Id = Token(model.Id), Kind = Token(model.Kind),
            Manufacturer = model.Manufacturer.Trim(), Model = model.Model.Trim()
        }).ToList();

    internal static WorkstationPeripherals? Normalize(WorkstationPeripherals? inventory) => inventory is null ? null : new()
    {
        Printers = NormalizeGroup(inventory.Printers), Scanners = NormalizeGroup(inventory.Scanners)
    };

    private static PeripheralGroup NormalizeGroup(PeripheralGroup group) => new()
    {
        Status = Token(group.Status),
        Items = group.Items.Select(item => new PeripheralAssignment
        {
            ModelId = Token(item.ModelId), Connection = Token(item.Connection),
            LinkType = NormalizeLinkType(item.LinkType),
            Identifier = item.Identifier?.Trim() ?? "", Address = item.Address?.Trim() ?? "", Notes = item.Notes?.Trim() ?? ""
        }).ToList()
    };

    private static string NormalizeLinkType(string? value) => string.IsNullOrWhiteSpace(value) ? "unrecorded" : Token(value);

    private static void Required(string? value, int maximum, string label)
    {
        if (string.IsNullOrWhiteSpace(value)) throw new InvalidDataException($"{label} is required.");
        Optional(value, maximum, label);
    }

    private static void Optional(string? value, int maximum, string label)
    {
        if (value?.Length > maximum) throw new InvalidDataException($"{label} exceeds {maximum} characters.");
    }
}
