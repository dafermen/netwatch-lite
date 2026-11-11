using System.Text.Json.Serialization;

namespace NetWatch.Models;

/// <summary>A reusable printer or scanner model in a support group's inventory.</summary>
public sealed class PeripheralCatalogEntry
{
    /// <summary>Stable model identifier, independent of its display name.</summary>
    [JsonPropertyName("id")]
    public string Id { get; init; } = "";
    /// <summary>printer or scanner.</summary>
    [JsonPropertyName("kind")]
    public string Kind { get; init; } = "printer";
    /// <summary>Manufacturer name.</summary>
    [JsonPropertyName("manufacturer")]
    public string Manufacturer { get; init; } = "";
    /// <summary>Model name.</summary>
    [JsonPropertyName("model")]
    public string Model { get; init; } = "";
}

/// <summary>Manual inventory associated with a workstation, not a monitoring result.</summary>
public sealed class WorkstationPeripherals
{
    /// <summary>Recorded printer inventory.</summary>
    [JsonPropertyName("printers")]
    public PeripheralGroup Printers { get; init; } = new();
    /// <summary>Recorded scanner inventory.</summary>
    [JsonPropertyName("scanners")]
    public PeripheralGroup Scanners { get; init; } = new();
}

/// <summary>Distinguishes unrecorded inventory, confirmed absence and assigned peripherals.</summary>
public sealed class PeripheralGroup
{
    /// <summary>unrecorded, none or assigned.</summary>
    [JsonPropertyName("status")]
    public string Status { get; init; } = "unrecorded";
    /// <summary>Physical peripherals assigned to the workstation.</summary>
    [JsonPropertyName("items")]
    public List<PeripheralAssignment> Items { get; init; } = [];
}

/// <summary>One physical peripheral referencing a catalog model.</summary>
public sealed class PeripheralAssignment
{
    /// <summary>Catalog model identifier.</summary>
    [JsonPropertyName("modelId")]
    public string ModelId { get; init; } = "";
    /// <summary>usb, network or other.</summary>
    [JsonPropertyName("connection")]
    public string Connection { get; init; } = "usb";
    /// <summary>Optional recorded physical link: unrecorded, wireless or cabled; independent of connection.</summary>
    [JsonPropertyName("linkType")]
    public string? LinkType { get; init; } = "unrecorded";
    /// <summary>Optional local name, asset tag or serial number.</summary>
    [JsonPropertyName("identifier")]
    public string Identifier { get; init; } = "";
    /// <summary>Optional network address; never used to initiate monitoring.</summary>
    [JsonPropertyName("address")]
    public string Address { get; init; } = "";
    /// <summary>Optional operator notes.</summary>
    [JsonPropertyName("notes")]
    public string Notes { get; init; } = "";
}
