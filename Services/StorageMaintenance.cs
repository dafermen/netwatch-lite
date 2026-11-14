using System.Security.Cryptography;
using System.Text.Json;
using Microsoft.Data.Sqlite;
using NetWatch.Models;

namespace NetWatch.Services;

/// <summary>Offline, non-destructive JSON migration, reconciliation and JSON rollback export.</summary>
public static class StorageMaintenance
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true, ReadCommentHandling = JsonCommentHandling.Skip, AllowTrailingCommas = true
    };

    /// <summary>Returns the database path, rejecting paths outside this deployment.</summary>
    public static string DatabasePath(string root, StorageOptions options) => Contained(root, options.DatabasePath);

    internal static string Contained(string root, string path)
    {
        var fullRoot = Path.GetFullPath(root).TrimEnd(Path.DirectorySeparatorChar);
        var full = Path.GetFullPath(Path.Combine(fullRoot, path));
        if (!full.StartsWith(fullRoot + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase))
            throw new InvalidDataException("Storage paths must remain inside the application content root.");
        var current = full;
        while (current.Length > fullRoot.Length)
        {
            if ((File.Exists(current) || Directory.Exists(current)) &&
                (File.GetAttributes(current) & FileAttributes.ReparsePoint) != 0)
                throw new InvalidDataException("Redirected storage paths are not supported.");
            current = Path.GetDirectoryName(current)!;
        }
        return full;
    }

    private static string Hash(byte[] bytes) => Convert.ToHexString(SHA256.HashData(bytes)).ToLowerInvariant();

    /// <summary>Copies known runtime documents into one reconciled database, preserving source bytes and order.</summary>
    public static async Task<StorageMigrationResult> MigrateAsync(string root, StorageOptions options,
        NetworkMonitorOptions paths, CancellationToken cancellationToken = default)
    {
        root = Path.GetFullPath(root);
        var dataRoot = Directory.Exists(Path.Combine(root, "Data")) ? Path.Combine(root, "Data") : root;
        string Resolve(string path, bool registry = false)
        {
            if (Path.IsPathRooted(path)) return Contained(root, path);
            if (!registry && File.Exists(Path.Combine(root, path))) return Contained(root, path);
            return Contained(root, Path.Combine(dataRoot, path));
        }
        var known = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        void Add(string path, bool required = false)
        {
            path = Contained(root, path);
            if (File.Exists(path)) known.Add(path);
            else if (required) throw new InvalidDataException("A referenced profile document is missing. Migration was not activated.");
        }
        var registry = Resolve(paths.ProfileFilePath, registry: true);
        Add(registry);
        Add(Resolve(paths.DeviceFilePath));
        Add(Resolve(paths.ThemeFilePath));
        Add(Resolve(paths.HistoryFilePath));
        Add(Resolve(paths.ErrorLogFilePath));
        Add(Resolve(paths.IntegrationFilePath));
        Add(Contained(root,"storage-policy.json"));
        if (File.Exists(registry))
        {
            var profiles = JsonSerializer.Deserialize<RegionProfileConfiguration>(await File.ReadAllTextAsync(registry, cancellationToken), JsonOptions)
                ?? throw new InvalidDataException("Invalid profile registry.");
            if (!profiles.Profiles.Any(profile => string.Equals(profile.Id, profiles.ActiveProfileId, StringComparison.OrdinalIgnoreCase)))
                throw new InvalidDataException("The active profile is not present in the registry.");
            foreach (var profile in profiles.Profiles)
                Add(Contained(root, Path.Combine(dataRoot, profile.File)), required: true);
        }
        foreach (var path in known.ToArray()) Add(Path.ChangeExtension(path, ".backup.json"));
        var versions = Contained(root, "configuration-versions");
        if (Directory.Exists(versions))
            foreach (var path in Directory.EnumerateFiles(versions, "*.backup.json", SearchOption.TopDirectoryOnly)) Add(path);
        if (known.Count == 0) throw new InvalidDataException("No existing JSON documents were found to migrate.");
        var sources = new SortedDictionary<string, byte[]>(StringComparer.OrdinalIgnoreCase);
        foreach (var path in known)
        {
            var bytes = await File.ReadAllBytesAsync(path, cancellationToken);
            // Parse without reserializing: legacy ordering, unknown values and historical duplicates remain intact.
            var json = bytes.AsMemory();
            if (bytes.AsSpan().StartsWith(new byte[] { 0xef, 0xbb, 0xbf })) json = json[3..];
            using var parsed = JsonDocument.Parse(json, new JsonDocumentOptions
            { AllowTrailingCommas = true, CommentHandling = JsonCommentHandling.Skip });
            if (parsed.RootElement.ValueKind != JsonValueKind.Object)
                throw new InvalidDataException("Every runtime document must contain a JSON object.");
            sources.Add(Path.GetRelativePath(root, path).Replace('\\', '/'), bytes);
        }
        var database = DatabasePath(root, options);
        if (File.Exists(database))
        {
            using var existing = OpenReadOnly(database);
            using var query = existing.CreateCommand();
            query.CommandText = "SELECT path,sha256 FROM migration_sources ORDER BY path";
            using var reader = query.ExecuteReader();
            var recorded = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            while (reader.Read()) recorded.Add(reader.GetString(0), reader.GetString(1));
            if (recorded.Count != sources.Count || sources.Any(source => !recorded.TryGetValue(source.Key, out var hash) || hash != Hash(source.Value)))
                throw new InvalidDataException("A database already exists with a different migration source. It was not overwritten.");
            return new StorageMigrationResult(true, sources.Count, null);
        }
        var backup = Path.Combine(root, "storage-backups", "json-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(backup);
        foreach (var source in sources)
        {
            var target = Contained(backup, source.Key);
            Directory.CreateDirectory(Path.GetDirectoryName(target)!);
            await using var output = new FileStream(target, FileMode.CreateNew, FileAccess.Write, FileShare.None);
            await output.WriteAsync(source.Value, cancellationToken);
            output.Flush(flushToDisk: true);
        }
        var stage = Path.Combine(root, ".storage-" + Guid.NewGuid().ToString("N") + ".db");
        try
        {
            LocalDataStore.Initialize(stage);
            using (var connection = new SqliteConnection(LocalDataStore.ConnectionString(stage)))
            {
                connection.Open();
                using var transaction = connection.BeginTransaction();
                foreach (var source in sources)
                {
                    cancellationToken.ThrowIfCancellationRequested();
                    using var command = connection.CreateCommand();
                    command.Transaction = transaction;
                    command.CommandText = """
                        INSERT INTO documents VALUES($path,$payload,$time);
                        INSERT INTO migration_sources VALUES($path,$hash);
                        """;
                    command.Parameters.AddWithValue("$path", source.Key);
                    command.Parameters.AddWithValue("$payload", source.Value);
                    command.Parameters.AddWithValue("$time", DateTimeOffset.UtcNow.ToString("O"));
                    command.Parameters.AddWithValue("$hash", Hash(source.Value));
                    command.ExecuteNonQuery();
                    RelationalSchema.Synchronize(connection,transaction,source.Key,source.Value,audit:false);
                }
                transaction.Commit();
                using var verify = connection.CreateCommand();
                verify.CommandText = "PRAGMA integrity_check";
                if (!string.Equals(verify.ExecuteScalar() as string, "ok", StringComparison.Ordinal))
                    throw new InvalidDataException("Database integrity validation failed.");
                verify.CommandText = "SELECT path,payload FROM documents";
                using var reader = verify.ExecuteReader();
                var count = 0;
                while (reader.Read())
                {
                    if (!sources.TryGetValue(reader.GetString(0), out var bytes) || !bytes.AsSpan().SequenceEqual((byte[])reader[1]))
                        throw new InvalidDataException("Migrated bytes do not match the source.");
                    count++;
                }
                if (count != sources.Count) throw new InvalidDataException("Document counts do not match.");
            }
            foreach (var source in sources)
                if (Hash(await File.ReadAllBytesAsync(Contained(root, source.Key), cancellationToken)) != Hash(source.Value))
                    throw new InvalidDataException("A source changed during migration. Stop external writers and retry.");
            cancellationToken.ThrowIfCancellationRequested();
            Directory.CreateDirectory(Path.GetDirectoryName(database)!);
            File.Move(stage, database, overwrite: false);
            return new StorageMigrationResult(false, sources.Count, backup);
        }
        finally { if (File.Exists(stage)) File.Delete(stage); }
    }

    private static SqliteConnection OpenReadOnly(string database)
    {
        var connection = new SqliteConnection(new SqliteConnectionStringBuilder
        { DataSource = database, Mode = SqliteOpenMode.ReadOnly, Pooling = false }.ToString());
        connection.Open();
        using var command = connection.CreateCommand();
        command.CommandText = "PRAGMA user_version";
        if (Convert.ToInt32(command.ExecuteScalar()) is not (1 or LocalDataStore.CurrentSchemaVersion))
        { connection.Dispose(); throw new InvalidDataException("Unsupported database schema."); }
        return connection;
    }

    /// <summary>Checks database integrity without rewriting it.</summary>
    public static int Verify(string database)
    {
        using var connection = OpenReadOnly(database);
        using var command = connection.CreateCommand();
        command.CommandText = "PRAGMA integrity_check";
        if (command.ExecuteScalar() as string != "ok") throw new InvalidDataException("Database integrity validation failed.");
        command.CommandText = "PRAGMA foreign_key_check";
        using (var foreignKeys = command.ExecuteReader())
            if (foreignKeys.Read()) throw new InvalidDataException("Database relationship validation failed.");
        command.CommandText = "SELECT COUNT(*) FROM documents";
        return Convert.ToInt32(command.ExecuteScalar());
    }

    /// <summary>Creates a consistent private snapshot using a read-only source connection, without opening an application store.</summary>
    public static void SnapshotReadOnly(string source,string destination)
    {
        var target = Path.GetFullPath(destination);
        Directory.CreateDirectory(Path.GetDirectoryName(target)!);
        var staging = target + ".staging-" + Guid.NewGuid().ToString("N");
        try
        {
            using (new FileStream(staging,FileMode.CreateNew,FileAccess.Write,FileShare.None)) { }
            using (var read = OpenReadOnly(source))
            using (var write = new SqliteConnection(LocalDataStore.ConnectionString(staging)))
            { write.Open(); read.BackupDatabase(write); }
            Verify(staging);
            File.Move(staging,target,overwrite:false);
        }
        finally { if (File.Exists(staging)) File.Delete(staging); }
    }

    /// <summary>Restores a verified snapshot into a new directory, never over an active database.</summary>
    public static void Restore(string source, string destination)
    {
        Verify(source);
        var target = Path.GetFullPath(destination);
        if (Directory.Exists(target) || File.Exists(target)) throw new IOException("Restore destination must be a new directory.");
        Directory.CreateDirectory(target);
        var database = Path.Combine(target,"netwatch.db");
        var staging = Path.Combine(target,"restore.staging.db");
        using (var input = new FileStream(source,FileMode.Open,FileAccess.Read,FileShare.Read))
        using (var output = new FileStream(staging,FileMode.CreateNew,FileAccess.Write,FileShare.None))
        {
            input.CopyTo(output);
            output.Flush(flushToDisk:true);
        }
        Verify(staging);
        using (var connection = OpenReadOnly(staging))
        using (var paths = connection.CreateCommand())
        {
            paths.CommandText = "SELECT path FROM documents";
            using var reader = paths.ExecuteReader();
            while (reader.Read()) Directory.CreateDirectory(Path.GetDirectoryName(Contained(target,reader.GetString(0)))!);
        }
        File.Move(staging,database,overwrite:false);
    }

    /// <summary>Exports all current document bytes to a new private directory, never over original JSON.</summary>
    public static async Task<int> ExportAsync(string database, string destination, CancellationToken cancellationToken = default)
    {
        if (Directory.Exists(destination) || File.Exists(destination)) throw new IOException("Export destination must not exist.");
        using var connection = OpenReadOnly(database);
        using var transaction = connection.BeginTransaction();
        using var command = connection.CreateCommand();
        command.Transaction = transaction;
        command.CommandText = "SELECT path,payload FROM documents ORDER BY path";
        using var reader = command.ExecuteReader();
        Directory.CreateDirectory(destination);
        var count = 0;
        while (reader.Read())
        {
            var path = Contained(destination, reader.GetString(0));
            Directory.CreateDirectory(Path.GetDirectoryName(path)!);
            await using var stream = new FileStream(path, FileMode.CreateNew, FileAccess.Write, FileShare.None);
            await stream.WriteAsync((byte[])reader[1], cancellationToken);
            stream.Flush(flushToDisk: true);
            count++;
        }
        return count;
    }
}

/// <summary>Migration outcome; backup paths belong to private local operator evidence.</summary>
public sealed record StorageMigrationResult(bool AlreadyMigrated, int DocumentCount, string? BackupDirectory);
