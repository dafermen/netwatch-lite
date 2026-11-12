namespace NetWatch.Models;

/// <summary>A consistent inventory snapshot and opaque, revision-scoped item identities.</summary>
public sealed record MonitoringInventory
{
    /// <summary>Active support-group identity.</summary>
    public required string ProfileId { get; init; }
    /// <summary>Digest of the normalized configuration, not a persistent device identifier.</summary>
    public required string Revision { get; init; }
    /// <summary>Configuration used to evaluate the visible selection.</summary>
    public required MonitorConfiguration Configuration { get; init; }
    /// <summary>Opaque keys in the same order as configuration devices.</summary>
    public required IReadOnlyList<string> Keys { get; init; }
}

/// <summary>Explicit visible targets; an empty array means no targets, never all targets.</summary>
public sealed record MonitoringSelectionRequest
{
    /// <summary>Profile displayed by the client.</summary>
    public string? ProfileId { get; init; }
    /// <summary>Inventory revision displayed by the client.</summary>
    public string? Revision { get; init; }
    /// <summary>Selected opaque inventory keys.</summary>
    public List<string>? Keys { get; init; }
    /// <summary>Optional classification constraint and historical scope.</summary>
    public string? DeviceType { get; init; }
    /// <summary>Optional facility constraint and historical scope.</summary>
    public string? Facility { get; init; }
    /// <summary>Optional category constraint and historical scope.</summary>
    public string? Category { get; init; }
}

/// <summary>Changes only monitoring participation, retaining all other inventory fields.</summary>
public sealed record MonitoringEnabledRequest
{
    /// <summary>Expected support group.</summary>
    public string? ProfileId { get; init; }
    /// <summary>Expected normalized inventory revision.</summary>
    public string? Revision { get; init; }
    /// <summary>Whether checks may run for this record.</summary>
    public bool Enabled { get; init; }
}
