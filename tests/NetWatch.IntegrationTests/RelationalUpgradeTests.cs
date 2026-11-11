using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Data.Sqlite;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Options;
using NetWatch.Services;

namespace NetWatch.IntegrationTests;

public sealed class RelationalUpgradeTests : IDisposable
{
    private readonly string _root=Path.Combine(Path.GetTempPath(),"netwatch-upgrade-tests",Guid.NewGuid().ToString("N"));
    [Fact]
    public async Task ProjectionAndAuditCommitTogether_OrAllRollBack()
    {
        var store=new LocalDataStore(new EnvironmentStub(_root),Options.Create(new StorageOptions {Provider="sqlite"}));
        var path=Path.Combine(_root,"config.json");
        var before="{\"devices\":[{\"name\":\"Desk\",\"ip\":\"host\"}]}";
        await store.WriteTextAsync(path,before);
        using var db=new SqliteConnection($"Data Source={Path.Combine(_root,"netwatch.db")};Pooling=False");db.Open();
        using var command=db.CreateCommand();command.CommandText="SELECT COUNT(*) FROM inventory_devices";Assert.Equal(1L,command.ExecuteScalar());
        command.CommandText="CREATE TRIGGER refuse_projection BEFORE INSERT ON inventory_devices BEGIN SELECT RAISE(ABORT,'injected'); END";command.ExecuteNonQuery();
        await Assert.ThrowsAsync<SqliteException>(()=>store.WriteTextAsync(path,"{\"devices\":[{\"name\":\"Failed\",\"ip\":\"host\"}]}"));
        Assert.Equal(before,await store.ReadAllTextAsync(path));
        command.CommandText="SELECT name FROM inventory_devices";Assert.Equal("Desk",command.ExecuteScalar());
        command.CommandText="SELECT COUNT(*) FROM audit_changes WHERE changes LIKE '%Failed%'";Assert.Equal(0L,command.ExecuteScalar());
    }
    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task Upgrade_BackupsAndPreservesBytes_OrRollsBackOnInvalidProjection(bool invalid)
    {
        Directory.CreateDirectory(_root);
        var database=Path.Combine(_root,"netwatch.db");
        var payload=Encoding.UTF8.GetPreamble().Concat(Encoding.UTF8.GetBytes(invalid ? "{broken" : "{\"Runs\":[{\"RunId\":\"same\"},{\"RunId\":\"same\",\"unknown\":7}]}")).ToArray();
        using(var connection=new SqliteConnection($"Data Source={database};Pooling=False"))
        {
            connection.Open();using var command=connection.CreateCommand();
            command.CommandText="CREATE TABLE documents(path TEXT PRIMARY KEY COLLATE NOCASE,payload BLOB NOT NULL,updated_utc TEXT NOT NULL);CREATE TABLE migration_sources(path TEXT PRIMARY KEY,sha256 TEXT NOT NULL);PRAGMA user_version=1;INSERT INTO documents VALUES('Data/monitor-history.json',$p,'original')";
            command.Parameters.AddWithValue("$p",payload);command.ExecuteNonQuery();
        }
        var hash=SHA256.HashData(await File.ReadAllBytesAsync(database));
        LocalDataStore Open() => new(new EnvironmentStub(_root),Options.Create(new StorageOptions {Provider="sqlite"}));
        if(invalid)
        {
            Assert.ThrowsAny<System.Text.Json.JsonException>(() => Open());
            Assert.Equal(hash,SHA256.HashData(await File.ReadAllBytesAsync(database)));
        }
        else
        {
            var store=Open();using var stream=store.OpenRead(Path.Combine(_root,"Data","monitor-history.json"));
            using var copy=new MemoryStream();await stream.CopyToAsync(copy);Assert.Equal(payload,copy.ToArray());
            Assert.Equal(1,StorageMaintenance.Verify(database));
            _=Open();
        }
        Assert.Single(Directory.GetFiles(Path.Combine(_root,"storage-backups","schema-upgrades"),"*.db"));
    }
    public void Dispose(){if(Directory.Exists(_root))Directory.Delete(_root,true);}
    private sealed class EnvironmentStub(string root):IWebHostEnvironment
    {
        public string ApplicationName{get;set;}="NetWatch";public string EnvironmentName{get;set;}="Testing";
        public string ContentRootPath{get;set;}=root;public IFileProvider ContentRootFileProvider{get;set;}=new NullFileProvider();
        public string WebRootPath{get;set;}=root;public IFileProvider WebRootFileProvider{get;set;}=new NullFileProvider();
    }
}
