using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.Extensions.DependencyInjection;
using NetWatch.Services;

namespace NetWatch.ContractTests;

public sealed class RelationalStorageTests(Xunit.Abstractions.ITestOutputHelper output) : IDisposable
{
    private readonly string _root = Path.Combine(Path.GetTempPath(),"netwatch-relational-tests",Guid.NewGuid().ToString("N"));
    private static readonly JsonSerializerOptions Json = new(JsonSerializerDefaults.Web);

    [Fact]
    public async Task Reports_QueryOnlyTheConfiguredHistoryDocument()
    {
        using var factory=new NetWatchApplicationFactory(_root,"sqlite");using var client=factory.CreateClient();
        var store=factory.Services.GetRequiredService<LocalDataStore>();
        await store.WriteTextAsync(Path.Combine(_root,"inactive-history.json"),"{\"runs\":[{\"runId\":\"unrelated\",\"results\":[{\"name\":\"Not active\",\"status\":\"Healthy\"}]}]}");
        var query=JsonNode.Parse(await client.GetStringAsync("/api/reports/query"))!;
        Assert.Equal(0,query["total"]!.GetValue<int>());Assert.Equal(0,query["coverage"]!["runs"]!.GetValue<int>());
        Assert.Empty(query["options"]!.AsArray());
    }

    [Fact]
    public async Task BoundedReportMeasurement_AndDeterministicQueryInvariants()
    {
        using var factory=new NetWatchApplicationFactory(_root,"sqlite");using var client=factory.CreateClient();
        var store=factory.Services.GetRequiredService<LocalDataStore>();var path=Path.Combine(_root,"Data","monitor-history.json");
        var data=new { runs=Enumerable.Range(0,100).Select(run=>new {runId=$"run-{run}",completedAt="2026-11-10T10:00:00Z",
            results=Enumerable.Range(0,50).Select(device=>new {name=$"Desk {device}",ip=$"host-{device}",facility="Lab",category="Workstations",status="Healthy",checks=new[] {new {type="ping",isAvailable=true,latencyMs=5}}})})};
        await store.WriteJsonAsync(path,data,Json);var original=await store.ReadAllTextAsync(path);
        var watch=System.Diagnostics.Stopwatch.StartNew();var body=await client.GetStringAsync("/api/reports/query?size=10");watch.Stop();
        var page=JsonNode.Parse(body)!;Assert.Equal(5000,page["total"]!.GetValue<int>());Assert.Equal(10,page["records"]!.AsArray().Count);
        var fullBytes=System.Text.Encoding.UTF8.GetByteCount(original);var pageBytes=System.Text.Encoding.UTF8.GetByteCount(body);
        Assert.True(pageBytes<fullBytes/10);
        output.WriteLine(System.Text.Json.JsonSerializer.Serialize(new {evaluations=5000,fullDocumentBytes=fullBytes,pageBytes,queryMs=watch.Elapsed.TotalMilliseconds}));
        var random=new Random(20261110);
        for(var index=0;index<32;index++)
        {
            var size=random.Next(1,101);var number=random.Next(1,51);
            var result=JsonNode.Parse(await client.GetStringAsync($"/api/reports/query?page={number}&size={size}"))!;
            Assert.Equal(5000,result["total"]!.GetValue<int>());Assert.InRange(result["records"]!.AsArray().Count,1,size);
            Assert.Equal(5000,result["metrics"]!["evaluations"]!.GetValue<int>());
        }
        Assert.Equal(original,await store.ReadAllTextAsync(path));
    }

    [Fact]
    public async Task ProjectionFailure_RollsBackDocumentInventoryAndAuditTogether()
    {
        using var factory = new NetWatchApplicationFactory(_root,"sqlite"); using var client = factory.CreateClient();
        var before=await client.GetStringAsync("/api/config/export");
        var audit=await client.GetStringAsync("/api/storage/audit");
        using var connection=new Microsoft.Data.Sqlite.SqliteConnection($"Data Source={Path.Combine(_root,"netwatch.db")};Pooling=False"); connection.Open();
        using var trigger=connection.CreateCommand(); trigger.CommandText="CREATE TRIGGER reject_projection BEFORE INSERT ON inventory_devices BEGIN SELECT RAISE(ABORT,'injected'); END"; trigger.ExecuteNonQuery();
        var config=JsonNode.Parse(before)!;config["devices"]![0]!["name"]="Must roll back";
        Assert.Equal(HttpStatusCode.InternalServerError,(await client.PostAsJsonAsync("/api/config",config)).StatusCode);
        Assert.Equal(before,await client.GetStringAsync("/api/config/export"));
        Assert.Equal(audit,await client.GetStringAsync("/api/storage/audit"));
        Assert.DoesNotContain("Must roll back",await client.GetStringAsync("/api/inventory/query"));
    }

    [Fact]
    public async Task AutomaticBackupRotation_PreservesManualAndUnmanagedFiles()
    {
        using var factory = new NetWatchApplicationFactory(_root,"sqlite"); using var client=factory.CreateClient();
        var operations=factory.Services.GetRequiredService<StorageOperations>();
        await operations.SavePolicyAsync(new() { BackupCopies=2,BackupIntervalHours=1 },default);
        var manual=await operations.BackupAsync(false);
        var directory=Path.Combine(_root,"storage-backups","managed");
        await File.WriteAllTextAsync(Path.Combine(directory,"operator.db"),"Do not rotate");
        for(var index=0;index<4;index++)
        {
            foreach(var file in Directory.GetFiles(directory,"auto-*.db")) File.SetLastWriteTimeUtc(file,DateTime.UtcNow.AddHours(-4+index));
            Assert.NotNull(await operations.BackupAsync(true));
        }
        Assert.Equal(2,Directory.GetFiles(directory,"auto-*.db").Length);
        Assert.True(File.Exists(Path.Combine(directory,manual!)));
        Assert.Equal("Do not rotate",await File.ReadAllTextAsync(Path.Combine(directory,"operator.db")));
        Assert.Null(await operations.BackupAsync(true));
    }

    [Fact]
    public async Task ArchiveFailure_PreservesSavedHistory()
    {
        using var factory = new NetWatchApplicationFactory(_root,"sqlite"); using var client=factory.CreateClient();
        var operations=factory.Services.GetRequiredService<StorageOperations>();
        await operations.SavePolicyAsync(new() { HistoryMaxRuns=1 },default);
        var repository=factory.Services.GetRequiredService<JsonMonitorHistoryRepository>();
        var response=JsonSerializer.Deserialize<NetWatch.Models.MonitorResponse>("""{"lastCheck":"2026-11-10T10:00:00Z","lastExecutionTime":"2026-11-10T10:00:00Z","executionStatus":"Completed","settings":{},"summary":{"totalDevices":0,"healthyDevices":0,"onlineDevices":0,"offlineDevices":0,"degradedDevices":0,"availabilityPercentage":0},"results":[],"categories":[]}""",Json)!;
        var first=await repository.AppendAsync(response,new(),DateTimeOffset.UtcNow,DateTimeOffset.UtcNow);
        await File.WriteAllTextAsync(Path.Combine(_root,"storage-exports"),"blocked");
        await Assert.ThrowsAsync<IOException>(() => repository.AppendAsync(response,new(),DateTimeOffset.UtcNow,DateTimeOffset.UtcNow));
        Assert.Equal(first.RunId,Assert.Single((await repository.GetAsync()).Runs).RunId);
    }

    [Fact]
    public async Task LegacyNumericStatesCasingUnicodeAndRevision_AreQueryable()
    {
        using var factory = new NetWatchApplicationFactory(_root,"sqlite"); using var client=factory.CreateClient();
        var store=factory.Services.GetRequiredService<LocalDataStore>();
        var path=Path.Combine(_root,"Data","monitor-history.json");
        await store.WriteTextAsync(path,"""{"Runs":[{"RunId":"legacy","CompletedAt":"2026-11-10T10:00:00Z","Results":[{"Name":"Desk ñ","Ip":"x","Status":0,"Checks":[{"Type":"ping","IsAvailable":true,"LatencyMs":null}]}]}]}""");
        var before=JsonNode.Parse(await client.GetStringAsync("/api/reports/query"))!;
        Assert.Equal(1,before["metrics"]!["healthy"]!.GetValue<int>());
        Assert.Null(before["records"]![0]!["latency"]);
        var key=before["records"]![0]!["device_key"]!.GetValue<string>();
        Assert.Equal(1,JsonNode.Parse(await client.GetStringAsync("/api/reports/query?deviceKey="+Uri.EscapeDataString(key)))!["total"]!.GetValue<int>());
        var revision=before["revision"]!.GetValue<string>();
        await store.WriteTextAsync(path,"{\"Runs\":[]}");
        Assert.Equal(HttpStatusCode.BadRequest,(await client.GetAsync("/api/reports/query?revision="+Uri.EscapeDataString(revision))).StatusCode);
    }

    [Fact]
    public async Task SqlReports_PaginateWithoutChangingWholeFilterMetrics_AndKeepLegacyDuplicates()
    {
        using var factory = new NetWatchApplicationFactory(_root,"sqlite"); using var client = factory.CreateClient();
        var store = factory.Services.GetRequiredService<LocalDataStore>();
        var history = new { runs = Enumerable.Range(0,25).Select(index => new {
            runId = "duplicate", startedAt = "2026-11-10T10:00:00Z", completedAt = $"2026-11-10T10:{index:00}:00Z", checkMode = "Full",
            scope = new { region="Lab",supportGroup="Team" }, results = new[] { new { name="Desk",ip="host",facility="Floor",category="Workstations",
                status=index%2 == 0 ? "Healthy" : "Down",checks=new[] { new {type="ping",isAvailable=index%2 == 0,latencyMs=index%2 == 0 ? (int?)5 : null} } } }
        }) };
        await store.WriteJsonAsync(Path.Combine(_root,"Data","monitor-history.json"),history,Json);
        var first = JsonNode.Parse(await client.GetStringAsync("/api/reports/query?size=10"))!;
        Assert.Equal(25,first["total"]!.GetValue<int>()); Assert.Equal(10,first["records"]!.AsArray().Count);
        Assert.Equal(25,first["metrics"]!["runs"]!.GetValue<int>()); Assert.Equal(1,first["metrics"]!["devices"]!.GetValue<int>());
        var next = JsonNode.Parse(await client.GetStringAsync("/api/reports/query?page=3&size=10"))!;
        Assert.Equal(5,next["records"]!.AsArray().Count);
        var filtered = JsonNode.Parse(await client.GetStringAsync("/api/reports/query?status=Problems&facility=Floor"))!;
        Assert.Equal(12,filtered["total"]!.GetValue<int>());
        var runs = JsonNode.Parse(await client.GetStringAsync("/api/reports/query?view=runs"))!;
        Assert.Equal(25,runs["records"]![0]!["duplicateCount"]!.GetValue<int>());
        var group = JsonNode.Parse(await client.GetStringAsync("/api/reports/query?view=facility"))!;
        Assert.Equal(25,group["records"]![0]!["rowCount"]!.GetValue<int>());
        Assert.Equal(25,JsonNode.Parse(await store.ReadAllTextAsync(Path.Combine(_root,"Data","monitor-history.json")))!["runs"]!.AsArray().Count);
        Assert.Equal(HttpStatusCode.BadRequest,(await client.GetAsync("/api/reports/query?size=1000")).StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest,(await client.GetAsync("/api/reports/query?runKey=%5B%5D")).StatusCode);
        Assert.Equal(0,JsonNode.Parse(await client.GetStringAsync("/api/reports/query?search=%27%3BDROP%20TABLE%20documents"))!["total"]!.GetValue<int>());
    }

    [Fact]
    public async Task InventoryIdsAndChangeValues_SurviveRenameReorderRestartAndBackupRestore()
    {
        string id;
        using (var factory = new NetWatchApplicationFactory(_root,"sqlite"))
        using (var client = factory.CreateClient())
        {
            var config = JsonNode.Parse("""{"devices":[{"name":"Desk A","ip":"a","notes":"before","checks":[{"type":"ping"}]},{"name":"Desk B","ip":"b","checks":[{"type":"ping"}]}]}""")!;
            (await client.PostAsJsonAsync("/api/config",config)).EnsureSuccessStatusCode();
            id = JsonNode.Parse(await client.GetStringAsync("/api/inventory/query"))!["records"]![0]!["id"]!.GetValue<string>();
            var a = config["devices"]![0]!.DeepClone(); a["name"] = "Renamed"; a["notes"] = "after <script>";
            config["devices"] = new JsonArray(config["devices"]![1]!.DeepClone(),a);
            (await client.PostAsJsonAsync("/api/config",config)).EnsureSuccessStatusCode();
            var inventory = JsonNode.Parse(await client.GetStringAsync("/api/inventory/query"))!;
            Assert.Equal(id,inventory["records"]![1]!["id"]!.GetValue<string>());
            var audit = await client.GetStringAsync("/api/storage/audit");
            Assert.Contains("before",audit); Assert.Contains("after",audit); Assert.DoesNotContain("userName",audit);
            var backup = JsonNode.Parse(await (await client.PostAsync("/api/storage/backups",null)).Content.ReadAsStringAsync())!;
            var source = Path.Combine(_root,"storage-backups","managed",backup["name"]!.GetValue<string>());
            var destination = Path.Combine(_root,"restored");
            StorageMaintenance.Restore(source,destination);
            Assert.True(File.Exists(Path.Combine(destination,"netwatch.db")));
            Assert.Throws<IOException>(() => StorageMaintenance.Restore(source,destination));
        }
        using var restarted = new NetWatchApplicationFactory(_root,"sqlite"); using var second = restarted.CreateClient();
        Assert.Equal(id,JsonNode.Parse(await second.GetStringAsync("/api/inventory/query"))!["records"]![1]!["id"]!.GetValue<string>());
    }

    [Theory]
    [InlineData("json")]
    [InlineData("sqlite")]
    public async Task Retention_ExportsBeforePruning_AndPolicyChangesDoNotDeleteImmediately(string provider)
    {
        using var factory = new NetWatchApplicationFactory(_root,provider); using var client = factory.CreateClient();
        var policy = new NetWatch.Models.StoragePolicy {HistoryMaxRuns=1,HistoryMaxAgeDays=0,AutomaticBackups=false};
        (await client.PutAsJsonAsync("/api/storage/policy",policy)).EnsureSuccessStatusCode();
        var repository = factory.Services.GetRequiredService<JsonMonitorHistoryRepository>();
        for (var index=0;index<2;index++) await repository.AppendAsync(new NetWatch.Models.MonitorResponse {
            LastCheck=DateTimeOffset.UtcNow,LastExecutionTime=DateTimeOffset.UtcNow,ExecutionStatus="Completed",Settings=new(),
            Summary=new() {TotalDevices=0,HealthyDevices=0,OnlineDevices=0,OfflineDevices=0,DegradedDevices=0,AvailabilityPercentage=0},Results=[],Categories=[]
        },new(),DateTimeOffset.UtcNow,DateTimeOffset.UtcNow);
        Assert.Single((await repository.GetAsync()).Runs);
        Assert.Single(Directory.GetFiles(Path.Combine(_root,"storage-exports","history-retention"),"*.json"));
        Assert.Equal(HttpStatusCode.BadRequest,(await client.PutAsJsonAsync("/api/storage/policy",policy with {HistoryMaxRuns=0})).StatusCode);
    }
    public void Dispose() { if (Directory.Exists(_root)) Directory.Delete(_root,true); }
}
