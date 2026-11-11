using System.Text.Json;
using NetWatch.Models;

namespace NetWatch.Services;

/// <summary>Validated global retention policy and isolated, verified managed backups.</summary>
public sealed class StorageOperations(LocalDataStore storage, IWebHostEnvironment environment)
{
    private readonly SemaphoreSlim _gate = new(1,1);
    private readonly string _root = environment.ContentRootPath;
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web) { WriteIndented = true };

    /// <summary>Reads policy without creating a document on GET.</summary>
    public async Task<StoragePolicy> GetPolicyAsync(CancellationToken token = default)
    {
        var path = Path.Combine(_root, "storage-policy.json");
        var policy = storage.Exists(path) ? JsonSerializer.Deserialize<StoragePolicy>(await storage.ReadAllTextAsync(path, token), Json) ?? new() : new();
        Validate(policy);
        return policy;
    }

    /// <summary>Persists validated policy; changing limits never immediately deletes history.</summary>
    public async Task<StoragePolicy> SavePolicyAsync(StoragePolicy policy, CancellationToken token)
    {
        Validate(policy);
        await storage.WriteJsonAsync(Path.Combine(_root,"storage-policy.json"), policy, Json, token);
        return policy;
    }

    private static void Validate(StoragePolicy policy)
    {
        if (policy.HistoryMaxRuns is < 1 or > 100000 || policy.HistoryMaxAgeDays is < 0 or > 3650
            || policy.BackupIntervalHours is < 1 or > 168 || policy.BackupCopies is < 1 or > 100)
            throw new InvalidDataException("Retention: 1-100000 runs, 0-3650 days. Backups: 1-168 hours, 1-100 copies.");
    }

    /// <summary>Archives pruned entries before the history document is changed.</summary>
    public async Task ArchiveAsync(IReadOnlyList<MonitorHistoryRun> removed, CancellationToken token)
    {
        if (removed.Count == 0) return;
        var directory = StorageMaintenance.Contained(_root,Path.Combine("storage-exports","history-retention"));
        Directory.CreateDirectory(directory);
        var path = Path.Combine(directory,$"history-{DateTime.UtcNow:yyyyMMddHHmmss}-{Guid.NewGuid():N}.json");
        await using var stream = new FileStream(path,FileMode.CreateNew,FileAccess.Write,FileShare.None);
        await JsonSerializer.SerializeAsync(stream,new MonitorHistoryStore { Runs = removed.ToList() },Json,token);
        await stream.FlushAsync(token);
        stream.Flush(flushToDisk: true);
    }

    /// <summary>Lists only backups owned by this application; no private paths or contents.</summary>
    public object[] ListBackups() => ManagedFiles().Select(file => (object)new { name = file.Name, createdUtc = file.LastWriteTimeUtc, bytes = file.Length }).ToArray();

    /// <summary>Creates and verifies a fresh SQLite snapshot; never overwrites a backup.</summary>
    public async Task<string?> BackupAsync(bool automatic, CancellationToken token = default)
    {
        if (!storage.IsSqlite) throw new InvalidDataException("Managed backups require SQLite. Use offline JSON export for JSON mode.");
        await _gate.WaitAsync(token);
        try
        {
            var policy = await GetPolicyAsync(token);
            var previous = ManagedFiles();
            if (automatic && (!policy.AutomaticBackups || previous.Any(file => file.Name.StartsWith("auto-",StringComparison.Ordinal)
                && DateTime.UtcNow - file.LastWriteTimeUtc < TimeSpan.FromHours(policy.BackupIntervalHours)))) return null;
            var directory = StorageMaintenance.Contained(_root,Path.Combine("storage-backups","managed"));
            Directory.CreateDirectory(directory);
            var name = $"{(automatic ? "auto" : "manual")}-{DateTime.UtcNow:yyyyMMddHHmmss}-{Guid.NewGuid():N}.db";
            storage.Backup(Path.Combine(directory,name));
            // Only our automatic files are eligible, and only after the new snapshot was verified.
            if (automatic)
                foreach (var old in ManagedFiles().Where(f => f.Name.StartsWith("auto-",StringComparison.Ordinal)).Skip(policy.BackupCopies))
                    File.Delete(old.FullName);
            return name;
        }
        finally { _gate.Release(); }
    }

    private FileInfo[] ManagedFiles()
    {
        var directory = StorageMaintenance.Contained(_root,Path.Combine("storage-backups","managed"));
        if (!Directory.Exists(directory)) return [];
        return new DirectoryInfo(directory).GetFiles("*.db")
            .Where(file => (file.Attributes & FileAttributes.ReparsePoint) == 0
                && System.Text.RegularExpressions.Regex.IsMatch(file.Name,@"^(auto|manual)-[0-9]{14}-[0-9a-f]{32}\.db$"))
            .OrderByDescending(file => file.LastWriteTimeUtc).ToArray();
    }
}

/// <summary>Runs bounded local backup maintenance; never performs monitoring or outbound delivery.</summary>
public sealed class StorageBackupWorker(StorageOperations operations, LocalDataStore storage, ILogger<StorageBackupWorker> logger) : BackgroundService
{
    /// <inheritdoc />
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (!storage.IsSqlite) return;
        using var timer = new PeriodicTimer(TimeSpan.FromMinutes(5));
        try
        {
            while (await timer.WaitForNextTickAsync(stoppingToken))
                try { await operations.BackupAsync(automatic: true, stoppingToken); }
                catch (Exception ex) when (ex is not OperationCanceledException) { logger.LogError(ex,"Automatic SQLite backup failed; existing backups retained."); }
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { }
    }
}
