using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Data.Sqlite;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Options;
using NetWatch.Services;

namespace NetWatch.IntegrationTests;

public sealed class LocalDataStoreTests : IDisposable
{
    private readonly string _root = Path.Combine(Path.GetTempPath(), "netwatch-storage-tests", Guid.NewGuid().ToString("N"));
    private string PathOf(string name) => Path.Combine(_root, name);
    private LocalDataStore Store(string provider = "sqlite", string database = "netwatch.db") => new(
        new EnvironmentStub(_root), Options.Create(new StorageOptions { Provider = provider, DatabasePath = database }));

    [Theory]
    [InlineData("auto", true)]
    [InlineData("sqlite", true)]
    [InlineData("json", false)]
    public void CleanInstall_SelectsRequestedProvider(string provider, bool sqlite)
    {
        Assert.Equal(sqlite, Store(provider).IsSqlite);
        Assert.Equal(sqlite, File.Exists(PathOf("netwatch.db")));
    }

    [Fact]
    public async Task ExistingJson_IsNeverSilentlyIgnoredOrImported()
    {
        Directory.CreateDirectory(_root);
        await File.WriteAllTextAsync(PathOf("config.json"), "{\"devices\":[]}");
        Assert.False(Store("auto").IsSqlite);
        Assert.Throws<InvalidDataException>(() => Store());
        Assert.False(File.Exists(PathOf("netwatch.db")));
    }

    [Fact]
    public async Task TransactionFailure_RollsBackCurrentDocumentAndPreviousBackup()
    {
        var store = Store();
        await store.WriteJsonAsync(PathOf("state.json"), new { value = 1 }, new());
        await store.WriteJsonAsync(PathOf("state.json"), new { value = 2 }, new());
        using var connection = new SqliteConnection($"Data Source={PathOf("netwatch.db")};Pooling=False");
        connection.Open();
        using var command = connection.CreateCommand();
        command.CommandText = "CREATE TRIGGER refuse BEFORE UPDATE ON documents WHEN NEW.path='state.json' BEGIN SELECT RAISE(ABORT,'injected'); END";
        command.ExecuteNonQuery();
        await Assert.ThrowsAsync<SqliteException>(() => store.WriteJsonAsync(PathOf("state.json"), new { value = 3 }, new()));
        Assert.Equal("{\"value\":2}", await store.ReadAllTextAsync(PathOf("state.json")));
        Assert.Equal("{\"value\":1}", await store.ReadAllTextAsync(PathOf("state.backup.json")));
        Assert.Equal(2, StorageMaintenance.Verify(PathOf("netwatch.db")));
    }

    [Fact]
    public async Task ConcurrentDocumentsAndIndependentStoreInstances_PersistWithoutLostWrites()
    {
        var first = Store();
        var second = Store();
        await Task.WhenAll(Enumerable.Range(0, 64).Select(index => Task.Run(() =>
            (index % 2 == 0 ? first : second).WriteJsonAsync(PathOf($"item-{index}.json"), new { index }, new()))));
        Assert.Equal(64, StorageMaintenance.Verify(PathOf("netwatch.db")));
        for (var index = 0; index < 64; index++)
            Assert.Equal($"{{\"index\":{index}}}", await first.ReadAllTextAsync(PathOf($"item-{index}.json")));
    }

    [Fact]
    public async Task CancelledWriteAndDestinationConflict_PreserveCurrentValue()
    {
        var store = Store();
        await store.WriteTextAsync(PathOf("a.json"), "{\"value\":1}");
        using var cancelled = new CancellationTokenSource();
        cancelled.Cancel();
        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => store.WriteTextAsync(PathOf("a.json"), "{}", cancelled.Token));
        await Assert.ThrowsAsync<IOException>(() => store.CopyAsync(PathOf("a.json"), PathOf("a.json"), overwrite: false));
        Assert.Equal("{\"value\":1}", await store.ReadAllTextAsync(PathOf("a.json")));
        Assert.Throws<InvalidDataException>(() => store.Exists(Path.Combine(_root, "..", "outside.json")));
    }

    [Fact]
    public async Task RestartBackupRenameAndExport_KeepCurrentDataAndRejectOverwrite()
    {
        var store = Store();
        await store.WriteTextAsync(PathOf("a.json"), "{\"notes\":\"private <value>\"}");
        store.Move(PathOf("a.json"), PathOf("renamed.json"));
        Assert.False(store.Exists(PathOf("a.json")));
        var backup = PathOf("snapshot.db");
        store.Backup(backup);
        Assert.Throws<IOException>(() => store.Backup(backup));
        var restarted = Store(database: "snapshot.db");
        Assert.Equal(await store.ReadAllTextAsync(PathOf("renamed.json")), await restarted.ReadAllTextAsync(PathOf("renamed.json")));
        var export = PathOf("export");
        Assert.Equal(1, await StorageMaintenance.ExportAsync(backup, export));
        Assert.Equal(await store.ReadAllTextAsync(PathOf("renamed.json")), await File.ReadAllTextAsync(Path.Combine(export, "renamed.json")));
        await Assert.ThrowsAsync<IOException>(() => StorageMaintenance.ExportAsync(backup, export));
    }

    [Theory]
    [InlineData("PRAGMA user_version=99")]
    [InlineData("CREATE TABLE unrelated (id INTEGER)")]
    public void UnknownOrForeignSchema_IsRejectedWithoutRewritingDatabase(string setup)
    {
        Directory.CreateDirectory(_root);
        if (setup.StartsWith("PRAGMA", StringComparison.Ordinal)) _ = Store();
        using (var connection = new SqliteConnection($"Data Source={PathOf("netwatch.db")};Pooling=False"))
        { connection.Open(); using var command = connection.CreateCommand(); command.CommandText = setup; command.ExecuteNonQuery(); }
        var before = SHA256.HashData(File.ReadAllBytes(PathOf("netwatch.db")));
        Assert.Throws<InvalidDataException>(() => Store());
        Assert.Equal(before, SHA256.HashData(File.ReadAllBytes(PathOf("netwatch.db"))));
    }

    [Fact]
    public async Task Migration_IsExactIdempotentAndExportsLegacyDuplicatesWithoutTouchingSources()
    {
        Directory.CreateDirectory(PathOf("regions"));
        await File.WriteAllTextAsync(PathOf("regions.json"), """
            {"activeProfileId":"team","profiles":[{"id":"team","name":"Team","region":"Lab","file":"regions/team.json"}]}
            """);
        var inventory = """
            {"devices":[{"name":"Desk","ip":"host","location":"Floor 1","notes":"Private","command":"echo test","deviceType":"workstation","workstationPeripherals":{"printers":{"status":"assigned","items":[{"modelId":"p","connection":"network","linkType":"wireless"}]}}}],"unknownLegacy":7,}
            """;
        await File.WriteAllTextAsync(PathOf("regions/team.json"), inventory, new UTF8Encoding(true));
        await File.WriteAllTextAsync(PathOf("monitor-history.json"), """
            {"runs":[{"runId":"duplicate","legacyUnknown":null},{"runId":"duplicate","legacyUnknown":4}]}
            """);
        var original = Directory.GetFiles(_root, "*.json", SearchOption.AllDirectories)
            .ToDictionary(path => path, File.ReadAllBytes);
        var migrated = await StorageMaintenance.MigrateAsync(_root, new(), new());
        Assert.False(migrated.AlreadyMigrated);
        Assert.Equal(3, migrated.DocumentCount);
        Assert.NotNull(migrated.BackupDirectory);
        foreach (var source in original)
        {
            Assert.Equal(source.Value, await File.ReadAllBytesAsync(source.Key));
            Assert.Equal(source.Value, await File.ReadAllBytesAsync(Path.Combine(migrated.BackupDirectory!, Path.GetRelativePath(_root, source.Key))));
        }
        var hash = SHA256.HashData(await File.ReadAllBytesAsync(PathOf("netwatch.db")));
        Assert.True((await StorageMaintenance.MigrateAsync(_root, new(), new())).AlreadyMigrated);
        Assert.Equal(hash, SHA256.HashData(await File.ReadAllBytesAsync(PathOf("netwatch.db"))));
        var export = PathOf("rollback");
        Assert.Equal(3, await StorageMaintenance.ExportAsync(PathOf("netwatch.db"), export));
        foreach (var source in original)
            Assert.Equal(source.Value, await File.ReadAllBytesAsync(Path.Combine(export, Path.GetRelativePath(_root, source.Key))));
        var store = Store();
        await store.WriteTextAsync(PathOf("regions/team.json"), "{\"editedAfterMigration\":true}");
        var editedHash = SHA256.HashData(await File.ReadAllBytesAsync(PathOf("netwatch.db")));
        Assert.True((await StorageMaintenance.MigrateAsync(_root, new(), new())).AlreadyMigrated);
        Assert.Equal(editedHash, SHA256.HashData(await File.ReadAllBytesAsync(PathOf("netwatch.db"))));
        await File.WriteAllTextAsync(PathOf("regions/team.json"), "{}");
        await Assert.ThrowsAsync<InvalidDataException>(() => StorageMaintenance.MigrateAsync(_root, new(), new()));
        Assert.Equal(editedHash, SHA256.HashData(await File.ReadAllBytesAsync(PathOf("netwatch.db"))));
    }

    [Theory]
    [InlineData("missing")]
    [InlineData("malformed")]
    [InlineData("outside")]
    public async Task InvalidMigration_DoesNotCreateAnActiveDatabase(string kind)
    {
        Directory.CreateDirectory(_root);
        var profile = kind == "outside" ? "../outside.json" : "missing.json";
        await File.WriteAllTextAsync(PathOf("regions.json"), kind == "malformed" ? "{broken" :
            JsonSerializer.Serialize(new { activeProfileId = "a", profiles = new[] { new { id = "a", name = "A", file = profile } } }));
        var before = await File.ReadAllBytesAsync(PathOf("regions.json"));
        await Assert.ThrowsAnyAsync<Exception>(() => StorageMaintenance.MigrateAsync(_root, new(), new()));
        Assert.False(File.Exists(PathOf("netwatch.db")));
        Assert.Equal(before, await File.ReadAllBytesAsync(PathOf("regions.json")));
    }

    [Fact]
    public void RuntimeLease_PreventsSecondInstanceAndReleasesAfterDispose()
    {
        using (var first = new RuntimeDataLease(new EnvironmentStub(_root)))
            Assert.Throws<IOException>(() => new RuntimeDataLease(new EnvironmentStub(_root)));
        using var next = new RuntimeDataLease(new EnvironmentStub(_root));
    }

    [Fact]
    public async Task DeterministicFuzz_RoundTripsEscapedUnicodeAndSqlMetacharacters()
    {
        var store = Store();
        var random = new Random(20261110);
        for (var index = 0; index < 256; index++)
        {
            var value = "'\";DROP TABLE documents;--<>&\r\n\t" +
                new string(Enumerable.Range(0, random.Next(1, 200)).Select(_ => (char)random.Next(32, 500)).ToArray());
            await store.WriteJsonAsync(PathOf("fuzz.json"), new { value }, new());
            using var json = JsonDocument.Parse(await store.ReadAllTextAsync(PathOf("fuzz.json")));
            Assert.Equal(value, json.RootElement.GetProperty("value").GetString());
        }
        Assert.Equal(2, StorageMaintenance.Verify(PathOf("netwatch.db")));
    }

    public void Dispose()
    {
        if (Directory.Exists(_root)) Directory.Delete(_root, recursive: true);
    }

    private sealed class EnvironmentStub(string root) : IWebHostEnvironment
    {
        public string ApplicationName { get; set; } = "NetWatch";
        public string EnvironmentName { get; set; } = "Testing";
        public string ContentRootPath { get; set; } = root;
        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
        public string WebRootPath { get; set; } = root;
        public IFileProvider WebRootFileProvider { get; set; } = new NullFileProvider();
    }
}
