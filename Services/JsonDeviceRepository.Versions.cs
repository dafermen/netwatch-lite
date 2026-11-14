using System.Security.Cryptography;
using System.Text.Json;
using NetWatch.Models;

namespace NetWatch.Services;

public sealed partial class JsonDeviceRepository
{
    private const int MaxConfigurationBytes = 5 * 1024 * 1024;
    private const int MaxVersionBytes = 80 * 1024 * 1024;
    private const int MaxVersions = 20;
    private static string Digest(byte[] bytes) => Convert.ToHexString(SHA256.HashData(bytes));

    private async Task<byte[]> DocumentBytes(string path, int limit, CancellationToken token)
    {
        await using var input = _storage.OpenRead(path);
        if (input.Length > limit) throw new InvalidDataException("The configuration or version history exceeds its safe size limit.");
        using var buffer = new MemoryStream();
        await input.CopyToAsync(buffer, token);
        return buffer.ToArray();
    }

    private static MonitorConfiguration ParseVersion(byte[] bytes)
    {
        try
        {
            ReadOnlySpan<byte> json = bytes;
            if (json.StartsWith(System.Text.Encoding.UTF8.Preamble)) json = json[System.Text.Encoding.UTF8.Preamble.Length..];
            var value = JsonSerializer.Deserialize<MonitorConfiguration>(json, JsonOptions);
            Validate(value);
            return value!;
        }
        catch (JsonException) { throw new InvalidDataException("Imported file contains invalid JSON."); }
    }

    private static MonitorConfiguration? TryParseVersion(byte[] bytes)
    {
        try { return ParseVersion(bytes); }
        catch (InvalidDataException) { return null; }
    }

    private string VersionsPath(string profile) => ConfigurationVersionStorage.PathFor(_environment.ContentRootPath, profile);

    private async Task<VersionVault> Vault(RegionProfile profile, CancellationToken token)
    {
        var path = VersionsPath(profile.Id);
        if (!_storage.Exists(path)) return new() { ProfileId = profile.Id };
        try
        {
            var vault = JsonSerializer.Deserialize<VersionVault>(await DocumentBytes(path, MaxVersionBytes, token), JsonOptions);
            if (vault is null || vault.SchemaVersion != 1 || vault.ProfileId != profile.Id || vault.Entries is null
                || vault.Entries.Count > MaxVersions
                || vault.Entries.Any(v => v is null || !Guid.TryParseExact(v.Id, "N", out _) || v.Size is < 1 or > MaxConfigurationBytes || v.Sha256?.Length != 64 || v.Payload is null)
                || vault.Entries.Select(v => v.Id).Distinct().Count() != vault.Entries.Count)
                throw new InvalidDataException("Configuration version history is invalid; no configuration was changed.");
            return vault;
        }
        catch (JsonException) { throw new InvalidDataException("Configuration version history is invalid; no configuration was changed."); }
    }

    private async Task<(RegionProfile Profile, string Path, byte[] Bytes, MonitorConfiguration? Configuration, VersionVault Vault, string Revision)> VersionState(RegionProfile profile, CancellationToken token)
    {
        var path = _profileRepository.ResolveProfileDeviceFilePath(profile.File);
        var bytes = await DocumentBytes(path, MaxConfigurationBytes, token);
        var configuration = TryParseVersion(bytes);
        var vault = await Vault(profile, token);
        var revision = Digest(JsonSerializer.SerializeToUtf8Bytes(new { profile, document = Digest(bytes), vault }, JsonOptions));
        return (profile, path, bytes, configuration, vault, revision);
    }

    private async Task SaveRecoveryPoint(RegionProfile profile, byte[] bytes, MonitorConfiguration? configuration, VersionVault vault, string reason, CancellationToken token)
    {
        if (vault.Entries.Count >= MaxVersions) throw new InvalidDataException("Configuration version history is full. Export or remove an old recovery point before replacing configuration.");
        vault.Entries.Insert(0, new()
        {
            Id = Guid.NewGuid().ToString("N"),
            CreatedUtc = DateTimeOffset.UtcNow,
            Reason = reason,
            Size = bytes.Length,
            Sha256 = Digest(bytes),
            Payload = Convert.ToBase64String(bytes),
            DeviceCount = configuration?.Devices.Count,
            CanRestore = configuration is not null
        });
        if (JsonSerializer.SerializeToUtf8Bytes(vault, JsonOptions).Length > MaxVersionBytes)
            throw new InvalidDataException("Configuration version history is full. Export or remove an old recovery point before replacing configuration.");
        await _storage.WriteJsonAsync(VersionsPath(profile.Id), vault, JsonOptions, token, createBackup: false);
    }

    private static object? Counts(MonitorConfiguration? config) => config is null ? null : new
    {
        devices = config.Devices.Count,
        enabled = config.Devices.Count(v => v.Enabled),
        checks = config.Devices.Sum(v => v.Checks.Count),
        deviceTypes = config.DeviceTypes.Count,
        peripheralModels = config.PeripheralCatalog.Count
    };
    private static object EntryView(VersionEntry v) => new { v.Id, v.CreatedUtc, v.Reason, v.Size, v.Sha256, v.DeviceCount, v.CanRestore };
    private static void RequireVersion(RegionProfile profile, string revision, ConfigurationVersionRequest request)
    {
        if (request.ProfileId != profile.Id || request.Revision != revision)
            throw new MonitorScopeConflictException("The active support group or configuration changed. Review it again before replacing configuration.");
    }

    /// <summary>Reads bounded private recovery-point metadata without exporting configuration payloads.</summary>
    public async Task<object> GetConfigurationVersionsAsync(CancellationToken token)
    {
        await _reloadLock.WaitAsync(token);
        try
        {
            return await _profileRepository.WithActiveProfileTransactionAsync<object>(async profile =>
            {
                var state = await VersionState(profile, token);
                return new
                {
                    profileId = state.Profile.Id,
                    profileName = state.Profile.Name,
                    revision = state.Revision,
                    current = Counts(state.Configuration),
                    capacity = MaxVersions,
                    versions = state.Vault.Entries.Select(EntryView).ToArray()
                };
            }, token);
        }
        finally { _reloadLock.Release(); }
    }

    /// <summary>Validates an import and returns a stateless scope/hash precondition; never writes a recovery point.</summary>
    public async Task<object> PreviewImportAsync(byte[] bytes, CancellationToken token, string? expectedProfile)
    {
        var candidate = ParseVersion(bytes);
        await _reloadLock.WaitAsync(token);
        try
        {
            return await _profileRepository.WithActiveProfileTransactionAsync<object>(async profile =>
            {
                var state = await VersionState(profile, token); AssertProfile(state.Profile, expectedProfile);
                return new
                {
                    profileId = state.Profile.Id,
                    profileName = state.Profile.Name,
                    revision = state.Revision,
                    sha256 = Digest(bytes),
                    current = Counts(state.Configuration),
                    incoming = Counts(candidate),
                    historyCount = state.Vault.Entries.Count,
                    capacity = MaxVersions
                };
            }, token);
        }
        finally { _reloadLock.Release(); }
    }

    /// <summary>Rechecks the reviewed file/profile/revision, then atomically snapshots and imports in SQLite.</summary>
    public Task<MonitorConfiguration> CommitImportAsync(byte[] bytes, ConfigurationVersionRequest request, CancellationToken token)
    {
        if (Digest(bytes) != request.Sha256) throw new MonitorScopeConflictException("The selected import file changed. Review it again.");
        return ImportWithHistoryAsync(ParseVersion(bytes), token, request.ProfileId, request);
    }

    private async Task<MonitorConfiguration> ImportWithHistoryAsync(MonitorConfiguration candidate, CancellationToken token, string? expectedProfile, ConfigurationVersionRequest? guard = null)
    {
        Validate(candidate);
        await _reloadLock.WaitAsync(token);
        try
        {
            var saved = await _profileRepository.WithActiveProfileTransactionAsync(async profile =>
            {
                var state = await VersionState(profile, token); AssertProfile(state.Profile, expectedProfile);
                if (guard is not null) RequireVersion(state.Profile, state.Revision, guard);
                var normalized = Normalize(candidate, state.Profile.Region, state.Profile.Name);
                await SaveRecoveryPoint(state.Profile, state.Bytes, state.Configuration, state.Vault, "Before import", token);
                await SaveNormalizedConfigurationAsync(state.Path, normalized, createBackup: true, token);
                return (normalized, state.Profile.Id);
            }, token);
            _configuration = saved.normalized; _loadedProfileId = saved.Id;
            return _configuration;
        }
        finally { _reloadLock.Release(); }
    }

    private static byte[] VerifiedPayload(VersionEntry entry)
    {
        byte[] bytes;
        try { bytes = Convert.FromBase64String(entry.Payload); } catch (FormatException) { throw new InvalidDataException("The recovery point failed its integrity check."); }
        if (bytes.Length != entry.Size || bytes.Length > MaxConfigurationBytes || Digest(bytes) != entry.Sha256)
            throw new InvalidDataException("The recovery point failed its integrity check.");
        return bytes;
    }

    /// <summary>Previews or downloads a recovery point only against its current active profile/revision.</summary>
    public async Task<(object Metadata, byte[] Bytes)> PreviewConfigurationVersionAsync(string id, ConfigurationVersionRequest request, CancellationToken token)
    {
        await _reloadLock.WaitAsync(token);
        try
        {
            return await _profileRepository.WithActiveProfileTransactionAsync(async profile =>
            {
                var state = await VersionState(profile, token); RequireVersion(state.Profile, state.Revision, request);
                var entry = state.Vault.Entries.SingleOrDefault(v => v.Id == id) ?? throw new InvalidDataException("Recovery point was not found in the active support group.");
                var bytes = VerifiedPayload(entry);
                return ((object)new
                {
                    entry = EntryView(entry),
                    profileId = state.Profile.Id,
                    profileName = state.Profile.Name,
                    revision = state.Revision,
                    current = Counts(state.Configuration),
                    incoming = Counts(TryParseVersion(bytes))
                }, bytes);
            }, token);
        }
        finally { _reloadLock.Release(); }
    }

    /// <summary>Restores one profile document, preserving current bytes first; never replaces a live database.</summary>
    public async Task<MonitorConfiguration> RestoreConfigurationVersionAsync(string id, ConfigurationVersionRequest request, CancellationToken token)
    {
        await _reloadLock.WaitAsync(token);
        try
        {
            var restored = await _profileRepository.WithActiveProfileTransactionAsync(async profile =>
            {
                var state = await VersionState(profile, token); RequireVersion(state.Profile, state.Revision, request);
                AssertProfile(state.Profile, request.ProfileId);
                var entry = state.Vault.Entries.SingleOrDefault(v => v.Id == id) ?? throw new InvalidDataException("Recovery point was not found in the active support group.");
                if (entry.Sha256 != request.Sha256) throw new MonitorScopeConflictException("The recovery point changed. Review it again.");
                var bytes = VerifiedPayload(entry);
                var normalized = Normalize(ParseVersion(bytes), state.Profile.Region, state.Profile.Name);
                await SaveRecoveryPoint(state.Profile, state.Bytes, state.Configuration, state.Vault, "Before restore", token);
                await _storage.WriteDocumentAsync(state.Path, bytes, token);
                return (normalized, state.Profile.Id);
            }, token);
            _configuration = restored.normalized; _loadedProfileId = restored.Id;
            return _configuration;
        }
        finally { _reloadLock.Release(); }
    }

    /// <summary>Explicitly removes a selected private recovery point; no automatic retention deletes occur.</summary>
    public async Task DeleteConfigurationVersionAsync(string id, ConfigurationVersionRequest request, CancellationToken token)
    {
        await _reloadLock.WaitAsync(token);
        try
        {
            await _profileRepository.WithActiveProfileTransactionAsync(async profile =>
            {
                var state = await VersionState(profile, token); RequireVersion(state.Profile, state.Revision, request);
                if (state.Vault.Entries.RemoveAll(v => v.Id == id) != 1) throw new InvalidDataException("Recovery point was not found in the active support group.");
                await _storage.WriteJsonAsync(VersionsPath(state.Profile.Id), state.Vault, JsonOptions, token, createBackup: false);
                return true;
            }, token);
        }
        finally { _reloadLock.Release(); }
    }

    private sealed class VersionVault
    {
        public int SchemaVersion { get; init; } = 1;
        public string ProfileId { get; init; } = "";
        public List<VersionEntry> Entries { get; init; } = [];
    }
    private sealed class VersionEntry
    {
        public string Id { get; init; } = "";
        public DateTimeOffset CreatedUtc { get; init; }
        public string Reason { get; init; } = "";
        public int Size { get; init; }
        public string Sha256 { get; init; } = "";
        public string Payload { get; init; } = "";
        public int? DeviceCount { get; init; }
        public bool CanRestore { get; init; } = true;
    }
}

/// <summary>Guard for reviewed configuration replacement/recovery; no identity claim.</summary>
public sealed record ConfigurationVersionRequest(string? ProfileId, string? Revision, string? Sha256 = null);

internal static class ConfigurationVersionStorage
{
    internal static string PathFor(string root, string profile) => StorageMaintenance.Contained(root,
        Path.Combine("configuration-versions", Convert.ToHexString(SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(profile))) + ".backup.json"));
}
