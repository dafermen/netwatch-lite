using System.Security.Cryptography;
using System.Text.Json;
using NetWatch.Models;

namespace NetWatch.Services;

/// <summary>Bounded, short-lived, single-use selections for the SSE monitoring endpoint.</summary>
public sealed class MonitorPlans(JsonDeviceRepository repository, TimeProvider? timeProvider = null)
{
    private readonly TimeProvider _time = timeProvider ?? TimeProvider.System;
    private readonly object _gate = new();
    private readonly Dictionary<string, Plan> _plans = new(StringComparer.Ordinal);
    private static readonly TimeSpan Lifetime = TimeSpan.FromMinutes(2);

    /// <summary>Creates a plan after validating exact targets against a fresh inventory.</summary>
    public async Task<object> CreateAsync(MonitoringSelectionRequest request, CancellationToken cancellationToken)
    {
        if (request.Keys is null || request.Keys.Count > 10000
            || request.Keys.Any(key => key is null || key.Length != 64)
            || request.Keys.Distinct(StringComparer.Ordinal).Count() != request.Keys.Count
            || new[] { request.DeviceType, request.Facility, request.Category }.Any(value => value?.Length > 4096))
            throw new InvalidDataException("Invalid monitoring selection.");
        var snapshot = await repository.GetMonitoringInventoryAsync(cancellationToken);
        AssertRevision(snapshot, request.ProfileId, request.Revision);
        var keys = request.Keys.ToHashSet(StringComparer.Ordinal);
        if (keys.Except(snapshot.Keys, StringComparer.Ordinal).Any())
            throw new MonitorScopeConflictException("The visible selection changed. Reload the inventory and try again.");
        var selected = snapshot.Configuration.Devices.Where((device, index) => keys.Contains(snapshot.Keys[index]));
        if (selected.Any(device => !device.Enabled || !Matches(device, request)))
            throw new InvalidDataException("The selection contains paused items or items outside the requested scope.");
        var token = Guid.NewGuid().ToString("N");
        var expires = _time.GetUtcNow() + Lifetime;
        lock (_gate)
        {
            RemoveExpired();
            if (_plans.Count >= 128) throw new InvalidDataException("Too many pending monitoring selections. Wait and retry.");
            _plans.Add(token, new(request with { Keys = request.Keys.ToList() }, expires));
        }
        return new { token, count = keys.Count, expiresAt = expires };
    }

    /// <summary>Consumes one plan after the execution lock is acquired and revalidates its revision.</summary>
    internal async Task<(MonitorConfiguration Configuration, MonitoringSelectionRequest Scope)> ConsumeAsync(string token, CancellationToken cancellationToken)
    {
        Plan plan;
        lock (_gate)
        {
            RemoveExpired();
            if (!Guid.TryParseExact(token, "N", out _) || !_plans.Remove(token, out plan!))
                throw new MonitorScopeConflictException("The monitoring selection expired or was already used. Reload and try again.");
        }
        var snapshot = await repository.GetMonitoringInventoryAsync(cancellationToken);
        AssertRevision(snapshot, plan.Scope.ProfileId, plan.Scope.Revision);
        var keys = plan.Scope.Keys!.ToHashSet(StringComparer.Ordinal);
        var devices = new List<Device>();
        for (var index = 0; index < snapshot.Keys.Count; index++)
        {
            if (!keys.Contains(snapshot.Keys[index])) continue;
            var original = snapshot.Configuration.Devices[index];
            if (!original.Enabled || !Matches(original, plan.Scope)) throw new MonitorScopeConflictException("Monitoring selection changed.");
            var clone = JsonSerializer.Deserialize<Device>(JsonSerializer.Serialize(original))!;
            clone.RuntimeKey = snapshot.Keys[index];
            devices.Add(clone);
        }
        return (new MonitorConfiguration
        {
            Settings = snapshot.Configuration.Settings, DeviceTypes = snapshot.Configuration.DeviceTypes,
            PeripheralCatalog = snapshot.Configuration.PeripheralCatalog, Devices = devices
        }, plan.Scope);
    }

    internal static MonitoringInventory Snapshot(string profileId, MonitorConfiguration configuration) => new()
    {
        ProfileId = profileId,
        Revision = Hash(JsonSerializer.Serialize(new { profileId, configuration })),
        Configuration = configuration,
        Keys = configuration.Devices.Select((device, index) => Hash(JsonSerializer.Serialize(new { profileId, index, device }))).ToArray()
    };

    internal static void AssertRevision(MonitoringInventory snapshot, string? profileId, string? revision)
    {
        if (snapshot.ProfileId != profileId || snapshot.Revision != revision)
            throw new MonitorScopeConflictException("The active support group or inventory changed. Reload and try again.");
    }

    private static string Hash(string input) => Convert.ToHexString(SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(input)));
    private static bool Matches(Device device, MonitoringSelectionRequest scope) =>
        (string.IsNullOrWhiteSpace(scope.DeviceType) || string.Equals(device.DeviceType, scope.DeviceType.Trim(), StringComparison.OrdinalIgnoreCase))
        && (string.IsNullOrWhiteSpace(scope.Facility) || string.Equals(device.Facility, scope.Facility, StringComparison.OrdinalIgnoreCase))
        && (string.IsNullOrWhiteSpace(scope.Category) || string.Equals(device.Category, scope.Category, StringComparison.OrdinalIgnoreCase));
    private void RemoveExpired()
    {
        foreach (var token in _plans.Where(pair => pair.Value.Expires <= _time.GetUtcNow()).Select(pair => pair.Key).ToArray()) _plans.Remove(token);
    }
    private sealed record Plan(MonitoringSelectionRequest Scope, DateTimeOffset Expires);
}

/// <summary>A stale or missing explicit scope must never become an unfiltered execution.</summary>
public sealed class MonitorScopeConflictException(string message) : InvalidOperationException(message);
