using System.Text;
using System.Text.Json;
using Microsoft.Data.Sqlite;
using Microsoft.Extensions.Options;

namespace NetWatch.Services;

/// <summary>Compatible document persistence backed by atomic JSON files or transactional SQLite.</summary>
public sealed partial class LocalDataStore
{
    /// <summary>Current supported SQLite schema.</summary>
    public const int CurrentSchemaVersion = 2;
    private readonly string _root;
    private readonly string _database;
    private readonly string _connectionString;
    private readonly AsyncLocal<(SqliteConnection Connection, SqliteTransaction Transaction)?> _ambient = new();

    /// <summary>Creates the selected store; existing JSON is never imported implicitly.</summary>
    public LocalDataStore(IWebHostEnvironment environment, IOptions<StorageOptions> options,
        IOptions<NetworkMonitorOptions>? monitorOptions = null)
    {
        _root = Path.GetFullPath(environment.ContentRootPath);
        _database = StorageMaintenance.DatabasePath(_root,options.Value);
        if (!_database.StartsWith(_root + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase))
            throw new InvalidDataException("The database must be inside the application content root.");
        var provider = options.Value.Provider.ToLowerInvariant();
        if (provider is not ("auto" or "json" or "sqlite"))
            throw new InvalidDataException("Storage provider must be auto, json or sqlite.");
        IsSqlite = provider == "sqlite" || (provider == "auto" &&
            (File.Exists(_database) || !HasLegacyData(_root, monitorOptions?.Value)));
        if (IsSqlite && !File.Exists(_database) && HasLegacyData(_root, monitorOptions?.Value))
            throw new InvalidDataException("Existing JSON requires an explicit offline StorageAction migrate-json first.");
        _connectionString = ConnectionString(_database);
        if (IsSqlite) Initialize(_database);
    }

    /// <summary>Whether this instance reads and writes SQLite rather than JSON.</summary>
    public bool IsSqlite { get; }

    /// <summary>Active provider name, without disclosing private paths.</summary>
    public string Provider => IsSqlite ? "sqlite" : "json";

    /// <summary>Bundled SQLite engine version, or null in JSON mode.</summary>
    public string? EngineVersion => IsSqlite ? Read((connection, _) => connection.ServerVersion) : null;

    private static bool HasLegacyData(string root, NetworkMonitorOptions? options)
    {
        options ??= new();
        return new[] { options.ProfileFilePath, options.DeviceFilePath, options.ThemeFilePath,
            options.HistoryFilePath, options.ErrorLogFilePath, options.IntegrationFilePath, "storage-policy.json" }
            .Any(name => File.Exists(Path.Combine(root, name)) || File.Exists(Path.Combine(root, "Data", name)));
    }

    internal static string ConnectionString(string database) => new SqliteConnectionStringBuilder
    {
        DataSource = database, Mode = SqliteOpenMode.ReadWriteCreate, Pooling = false, DefaultTimeout = 10,
        ForeignKeys = true
    }.ToString();

    internal static void Initialize(string database)
    {
        Directory.CreateDirectory(Path.GetDirectoryName(database)!);
        using var connection = new SqliteConnection(ConnectionString(database));
        connection.Open();
        using var versionCommand = connection.CreateCommand();
        versionCommand.CommandText = "PRAGMA user_version";
        var version = Convert.ToInt32(versionCommand.ExecuteScalar());
        if (version > CurrentSchemaVersion) throw new InvalidDataException("Database schema is newer than this application. No changes were made.");
        if (version == 0)
        {
            versionCommand.CommandText = "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'";
            if (Convert.ToInt32(versionCommand.ExecuteScalar()) != 0)
                throw new InvalidDataException("The selected database belongs to another application. No changes were made.");
        }
        else
        {
            versionCommand.CommandText = "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name IN ('documents','migration_sources')";
            if (Convert.ToInt32(versionCommand.ExecuteScalar()) != 2)
                throw new InvalidDataException("The database schema does not match NetWatch storage.");
        }
        using var transaction = connection.BeginTransaction();
        using var command = connection.CreateCommand();
        command.Transaction = transaction;
        command.CommandText = """
            CREATE TABLE IF NOT EXISTS documents (
                path TEXT PRIMARY KEY COLLATE NOCASE,
                payload BLOB NOT NULL,
                updated_utc TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS migration_sources (
                path TEXT PRIMARY KEY COLLATE NOCASE,
                sha256 TEXT NOT NULL
            );
            """;
        command.ExecuteNonQuery();
        if (version == 0)
        {
            command.CommandText = "PRAGMA user_version=1";
            command.ExecuteNonQuery();
        }
        transaction.Commit();
        RelationalSchema.Initialize(connection, database, version == 1);
    }

    internal string Key(string path)
    {
        var full = Path.GetFullPath(path);
        var relative = Path.GetRelativePath(_root, full).Replace('\\', '/');
        if (relative == ".." || relative.StartsWith("../", StringComparison.Ordinal) || Path.IsPathRooted(relative))
            throw new InvalidDataException("SQLite document paths must remain inside the content root.");
        return relative;
    }

    private SqliteConnection Open()
    {
        var connection = new SqliteConnection(_connectionString);
        connection.Open();
        return connection;
    }

    /// <summary>Commits a multi-document profile operation as one unit; nested operations share its snapshot.</summary>
    public async Task<T> WithTransactionAsync<T>(Func<Task<T>> action, CancellationToken cancellationToken = default)
    {
        if (!IsSqlite || _ambient.Value.HasValue) return await action();
        cancellationToken.ThrowIfCancellationRequested();
        using var connection = Open();
        using var transaction = connection.BeginTransaction();
        _ambient.Value = (connection, transaction);
        try
        {
            var result = await action();
            cancellationToken.ThrowIfCancellationRequested();
            transaction.Commit();
            return result;
        }
        finally { _ambient.Value = null; }
    }

    internal T Read<T>(Func<SqliteConnection, SqliteTransaction?, T> action)
    {
        if (_ambient.Value is { } current) return action(current.Connection, current.Transaction);
        using var connection = Open();
        return action(connection, null);
    }

    private void Write(Action<SqliteConnection, SqliteTransaction> action, CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        if (_ambient.Value is { } current) { action(current.Connection, current.Transaction); return; }
        using var connection = Open();
        using var transaction = connection.BeginTransaction();
        action(connection, transaction);
        cancellationToken.ThrowIfCancellationRequested();
        transaction.Commit();
    }

    private bool IsSample(string path) => string.Equals(Path.GetFileName(path), "config.sample.json", StringComparison.OrdinalIgnoreCase);

    /// <summary>Checks only the active store; stale JSON never overrides a SQLite document.</summary>
    public bool Exists(string path)
    {
        if (!IsSqlite || IsSample(path)) return File.Exists(path);
        return Read((connection, transaction) =>
        {
            using var command = connection.CreateCommand();
            command.Transaction = transaction;
            command.CommandText = "SELECT 1 FROM documents WHERE path=$path";
            command.Parameters.AddWithValue("$path", Key(path));
            return command.ExecuteScalar() is not null;
        });
    }

    /// <summary>Opens a stable read snapshot; JSON readers permit atomic replacement on Windows.</summary>
    public Stream OpenRead(string path)
    {
        if (!IsSqlite || IsSample(path))
            return new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.ReadWrite | FileShare.Delete);
        return Read<Stream>((connection, transaction) =>
        {
            using var command = connection.CreateCommand();
            command.Transaction = transaction;
            command.CommandText = "SELECT payload FROM documents WHERE path=$path";
            command.Parameters.AddWithValue("$path", Key(path));
            return command.ExecuteScalar() is byte[] payload ? new MemoryStream(payload, writable: false)
                : throw new FileNotFoundException("The stored document was not found.");
        });
    }

    /// <summary>Reads a document using the same snapshot semantics as OpenRead.</summary>
    public async Task<string> ReadAllTextAsync(string path, CancellationToken cancellationToken = default)
    {
        await using var stream = OpenRead(path);
        using var reader = new StreamReader(stream, Encoding.UTF8, detectEncodingFromByteOrderMarks: true);
        return await reader.ReadToEndAsync(cancellationToken);
    }

    /// <summary>Serializes before the transaction, preserving the old document on failure.</summary>
    public Task WriteJsonAsync<T>(string path, T value, JsonSerializerOptions options,
        CancellationToken cancellationToken = default, bool createBackup = true) => IsSqlite
        ? WriteBytesAsync(path, JsonSerializer.SerializeToUtf8Bytes(value, options), cancellationToken, createBackup)
        : AtomicFileWriter.WriteJsonAsync(path, value, options, cancellationToken, createBackup);

    /// <summary>Writes UTF-8 text atomically.</summary>
    public Task WriteTextAsync(string path, string text, CancellationToken cancellationToken = default) => IsSqlite
        ? WriteBytesAsync(path, Encoding.UTF8.GetBytes(text), cancellationToken)
        : AtomicFileWriter.WriteTextAsync(path, text, cancellationToken);

    /// <summary>Writes an exact verified document without reconstructing it from a projection.</summary>
    public Task WriteDocumentAsync(string path, byte[] bytes, CancellationToken cancellationToken = default) => IsSqlite
        ? WriteBytesAsync(path, bytes, cancellationToken)
        : AtomicFileWriter.WriteBytesAsync(path, bytes, cancellationToken);

    private Task WriteBytesAsync(string path, byte[] bytes, CancellationToken cancellationToken, bool createBackup = true, bool overwrite = true)
    {
        Write((connection, transaction) =>
        {
            using var command = connection.CreateCommand();
            command.Transaction = transaction;
            var key = Key(path);
            command.CommandText = "SELECT payload FROM documents WHERE path=$path";
            command.Parameters.AddWithValue("$path",key);
            var previous = command.ExecuteScalar() as byte[];
            command.Parameters.Clear();
            if (createBackup && overwrite)
            {
                command.CommandText = """
                    INSERT INTO documents(path,payload,updated_utc)
                    SELECT $backup,payload,updated_utc FROM documents WHERE path=$path
                    ON CONFLICT(path) DO UPDATE SET payload=excluded.payload,updated_utc=excluded.updated_utc;
                    """;
                command.Parameters.AddWithValue("$backup", Key(Path.ChangeExtension(path, ".backup.json")));
                command.Parameters.AddWithValue("$path", key);
                command.ExecuteNonQuery();
                command.Parameters.Clear();
            }
            command.CommandText = "INSERT INTO documents(path,payload,updated_utc) VALUES($path,$payload,$time)" +
                (overwrite ? " ON CONFLICT(path) DO UPDATE SET payload=excluded.payload,updated_utc=excluded.updated_utc" : "");
            command.Parameters.AddWithValue("$path", key);
            command.Parameters.AddWithValue("$payload", bytes);
            command.Parameters.AddWithValue("$time", DateTimeOffset.UtcNow.ToString("O"));
            try { command.ExecuteNonQuery(); }
            catch (SqliteException exception) when (!overwrite && exception.SqliteErrorCode == 19)
            { throw new IOException("The destination already exists.", exception); }
            RelationalSchema.Synchronize(connection, transaction, key, bytes, audit: true, previous);
        }, cancellationToken);
        return Task.CompletedTask;
    }

    /// <summary>Copies one complete document without reading stale runtime JSON.</summary>
    public async Task CopyAsync(string source, string destination, bool overwrite, CancellationToken cancellationToken = default)
    {
        if (!IsSqlite) { await AtomicFileWriter.CopyAsync(source, destination, overwrite, cancellationToken); return; }
        await using var stream = OpenRead(source);
        using var buffer = new MemoryStream();
        await stream.CopyToAsync(buffer, cancellationToken);
        await WriteBytesAsync(destination, buffer.ToArray(), cancellationToken, overwrite: overwrite);
    }

    /// <summary>Renames or archives a document without overwriting an existing target.</summary>
    public void Move(string source, string destination, bool overwrite = false)
    {
        if (!IsSqlite) { File.Move(source, destination, overwrite); return; }
        Write((connection, transaction) =>
        {
            using var command = connection.CreateCommand();
            command.Transaction = transaction;
            command.CommandText = "UPDATE documents SET path=$target WHERE path=$source";
            command.Parameters.AddWithValue("$target", Key(destination));
            command.Parameters.AddWithValue("$source", Key(source));
            command.ExecuteNonQuery();
        });
    }

    /// <summary>Creates a consistent SQLite backup, refusing to replace an existing file.</summary>
    public void Backup(string destination)
    {
        if (!IsSqlite) throw new InvalidOperationException("SQLite backup requires the sqlite provider.");
        if (File.Exists(destination) || Directory.Exists(destination)) throw new IOException("Backup destination already exists.");
        var temporary = destination + ".staging-" + Guid.NewGuid().ToString("N") + ".db";
        try
        {
            using (var reservation = new FileStream(temporary, FileMode.CreateNew, FileAccess.Write, FileShare.None)) { }
            using (var source = Open())
            using (var target = new SqliteConnection(ConnectionString(temporary)))
            {
                target.Open();
                source.BackupDatabase(target);
            }
            StorageMaintenance.Verify(temporary);
            File.Move(temporary, destination, overwrite: false);
        }
        finally { if (File.Exists(temporary)) File.Delete(temporary); }
    }
}
