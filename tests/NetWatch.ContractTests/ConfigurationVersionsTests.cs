using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json.Nodes;
using Microsoft.Extensions.DependencyInjection;
using NetWatch.Services;

namespace NetWatch.ContractTests;

public sealed class ConfigurationVersionsTests
{
    private static Task<JsonNode> Read(HttpClient client, string url) => Parse(client.GetStringAsync(url));
    private static async Task<JsonNode> Parse(Task<string> text) => JsonNode.Parse(await text)!;
    private static string Config(string name) => "{\"devices\":[{\"name\":\"" + name + "\",\"ip\":\"127.0.0.1\",\"notes\":\"Private synthetic note\",\"checks\":[{\"type\":\"ping\"}]}]}";
    private static async Task<HttpResponseMessage> Upload(HttpClient client, string path, string json, JsonNode? guard = null)
    {
        using var file = new MultipartFormDataContent();
        file.Add(new StringContent(json, Encoding.UTF8, "application/json"), "configFile", "synthetic.json");
        using var request = new HttpRequestMessage(HttpMethod.Post, path) { Content = file };
        if (guard is not null)
        {
            request.Headers.Add("X-NetWatch-Profile", guard["profileId"]!.GetValue<string>());
            if (guard["revision"] is { } revision) request.Headers.Add("X-NetWatch-Revision", revision.GetValue<string>());
            if (guard["sha256"] is { } hash) request.Headers.Add("X-NetWatch-Import-SHA256", hash.GetValue<string>());
        }
        return await client.SendAsync(request);
    }
    private static JsonObject Guard(JsonNode snapshot, string? sha = null) => new()
    { ["profileId"] = snapshot["profileId"]!.DeepClone(), ["revision"] = snapshot["revision"]!.DeepClone(), ["sha256"] = sha };

    [Theory]
    [InlineData("json")]
    [InlineData("sqlite")]
    public async Task PreviewCommitRestoreAndDownload_PreserveCurrentStateAndGuardRevisions(string provider)
    {
        using var factory = new NetWatchApplicationFactory(null, provider); using var client = factory.CreateClient();
        (await client.PostAsJsonAsync("/api/config", JsonNode.Parse(Config("Original")))).EnsureSuccessStatusCode();
        var original = await client.GetStringAsync("/api/config/export");
        var inventoryBefore = await Read(client, "/api/config/versions");
        var preview = JsonNode.Parse(await (await Upload(client, "/api/config/import/preview", Config("Imported"), inventoryBefore)).Content.ReadAsStringAsync())!;
        Assert.Equal(original, await client.GetStringAsync("/api/config/export"));
        Assert.Empty((await Read(client, "/api/config/versions"))["versions"]!.AsArray());
        var imported = await Upload(client, "/api/config/import/commit", Config("Imported"), preview); imported.EnsureSuccessStatusCode();
        Assert.Equal("Imported", (await Read(client, "/api/config"))["devices"]![0]!["name"]!.GetValue<string>());
        var history = await Read(client, "/api/config/versions"); var version = Assert.Single(history["versions"]!.AsArray())!;
        Assert.DoesNotContain("Private synthetic note", history.ToJsonString());
        var id = version["id"]!.GetValue<string>(); var sha = version["sha256"]!.GetValue<string>();
        Assert.Equal(HttpStatusCode.Conflict, (await Upload(client, "/api/config/import/commit", Config("Imported"), preview)).StatusCode);
        var downloaded = await client.PostAsJsonAsync($"/api/config/versions/{id}/download", Guard(history, sha)); downloaded.EnsureSuccessStatusCode();
        Assert.Equal(JsonNode.Parse(original)!.ToJsonString(), JsonNode.Parse(await downloaded.Content.ReadAsStringAsync())!.ToJsonString());
        var restore = await client.PostAsJsonAsync($"/api/config/versions/{id}/restore", Guard(history, sha)); restore.EnsureSuccessStatusCode();
        Assert.Equal(original, await client.GetStringAsync("/api/config/export"));
        var after = await Read(client, "/api/config/versions"); Assert.Equal(2, after["versions"]!.AsArray().Count);
        Assert.Equal(HttpStatusCode.Conflict, (await client.PostAsJsonAsync($"/api/config/versions/{id}/restore", Guard(history, sha))).StatusCode);
        var importedPoint = after["versions"]![0]!;
        var forward = await client.PostAsJsonAsync($"/api/config/versions/{importedPoint["id"]!.GetValue<string>()}/restore", Guard(after, importedPoint["sha256"]!.GetValue<string>())); forward.EnsureSuccessStatusCode();
        Assert.Equal("Imported", (await Read(client, "/api/config"))["devices"]![0]!["name"]!.GetValue<string>());
        Assert.Empty((await Read(client, "/api/history"))["runs"]!.AsArray());
    }

    [Theory]
    [InlineData("json")]
    [InlineData("sqlite")]
    public async Task StalePreviewChangedFileAndCrossProfile_CannotReplaceConfiguration(string provider)
    {
        using var factory = new NetWatchApplicationFactory(null, provider); using var client = factory.CreateClient();
        var snapshot = await Read(client, "/api/config/versions");
        var preview = JsonNode.Parse(await (await Upload(client, "/api/config/import/preview", Config("Proposed"), snapshot)).Content.ReadAsStringAsync())!;
        var before = await client.GetStringAsync("/api/config/export");
        Assert.Equal(HttpStatusCode.Conflict, (await Upload(client, "/api/config/import/commit", Config("Different"), preview)).StatusCode);
        Assert.Equal(before, await client.GetStringAsync("/api/config/export"));
        Assert.Equal(HttpStatusCode.BadRequest, (await Upload(client, "/api/config/import/preview", "{invalid", snapshot)).StatusCode);
        Assert.Empty((await Read(client, "/api/config/versions"))["versions"]!.AsArray());
        (await client.PostAsJsonAsync("/api/config", JsonNode.Parse(Config("Concurrent edit")))).EnsureSuccessStatusCode();
        Assert.Equal(HttpStatusCode.Conflict, (await Upload(client, "/api/config/import/commit", Config("Proposed"), preview)).StatusCode);
        (await client.PostAsJsonAsync("/api/regions", new { name = "Independent copy", copyFromActive = true })).EnsureSuccessStatusCode();
        Assert.Equal(HttpStatusCode.Conflict, (await Upload(client, "/api/config/import/commit", Config("Proposed"), preview)).StatusCode);
        Assert.Empty((await Read(client, "/api/config/versions"))["versions"]!.AsArray());
    }

    [Theory]
    [InlineData("json")]
    [InlineData("sqlite")]
    public async Task LegacyImportAlsoCreatesRecoveryPoint_ExplicitDeleteDoesNotModifyInventory(string provider)
    {
        using var factory = new NetWatchApplicationFactory(null, provider); using var client = factory.CreateClient();
        (await Upload(client, "/api/config/import", Config("Legacy imported"))).EnsureSuccessStatusCode();
        var history = await Read(client, "/api/config/versions"); var version = Assert.Single(history["versions"]!.AsArray())!;
        var before = await client.GetStringAsync("/api/config/export");
        var response = await client.PostAsJsonAsync($"/api/config/versions/{version["id"]!.GetValue<string>()}/delete", Guard(history));
        Assert.True(response.IsSuccessStatusCode, await response.Content.ReadAsStringAsync());
        Assert.Equal(before, await client.GetStringAsync("/api/config/export"));
        Assert.Empty((await Read(client, "/api/config/versions"))["versions"]!.AsArray());
    }

    [Theory]
    [InlineData("json")]
    [InlineData("sqlite")]
    public async Task FullHistory_BlocksReplacementWithoutDeletingAnyPoint(string provider)
    {
        using var factory = new NetWatchApplicationFactory(null, provider); using var client = factory.CreateClient();
        for (var n = 0; n < 20; n++)
        {
            var imported = await Upload(client, "/api/config/import", Config("Version " + n));
            Assert.True(imported.IsSuccessStatusCode, await imported.Content.ReadAsStringAsync());
        }
        var before = await client.GetStringAsync("/api/config/export");
        var points = await Read(client, "/api/config/versions"); Assert.Equal(20, points["versions"]!.AsArray().Count);
        Assert.Equal(HttpStatusCode.BadRequest, (await Upload(client, "/api/config/import", Config("Must not replace"))).StatusCode);
        Assert.Equal(before, await client.GetStringAsync("/api/config/export"));
        Assert.Equal(points.ToJsonString(), (await Read(client, "/api/config/versions")).ToJsonString());
    }

    [Fact]
    public async Task CorruptJson_CanBeRepairedButRecoveryPointCannotBeRestored()
    {
        using var factory = new NetWatchApplicationFactory(); using var client = factory.CreateClient();
        var regions = await Read(client, "/api/regions");
        var id = regions["activeProfileId"]!.GetValue<string>();
        var file = regions["profiles"]!.AsArray().Single(v => v!["id"]!.GetValue<string>() == id)!["file"]!.GetValue<string>();
        await File.WriteAllTextAsync(Path.Combine(factory.RuntimeDataRoot, file), "{broken original");
        (await Upload(client, "/api/config/import", Config("Repaired"))).EnsureSuccessStatusCode();
        var history = await Read(client, "/api/config/versions"); var version = Assert.Single(history["versions"]!.AsArray())!;
        Assert.False(version["canRestore"]!.GetValue<bool>());
        var guard = Guard(history, version["sha256"]!.GetValue<string>());
        var prefix = $"/api/config/versions/{version["id"]!.GetValue<string>()}";
        var download = await client.PostAsJsonAsync(prefix + "/download", guard); download.EnsureSuccessStatusCode();
        Assert.Equal("{broken original", await download.Content.ReadAsStringAsync());
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsJsonAsync(prefix + "/restore", guard)).StatusCode);
        Assert.Equal("Repaired", (await Read(client, "/api/config"))["devices"]![0]!["name"]!.GetValue<string>());
    }

    [Theory]
    [InlineData("json")]
    [InlineData("sqlite")]
    public async Task BuildEndpoint_DescribesRunningBinaryWithoutPrivatePaths(string provider)
    {
        using var factory = new NetWatchApplicationFactory(null, provider); using var client = factory.CreateClient();
        var response = await client.GetAsync("/api/build"); response.EnsureSuccessStatusCode();
        Assert.True(response.Headers.CacheControl!.NoStore);
        var payload = JsonNode.Parse(await response.Content.ReadAsStringAsync())!;
        Assert.Equal(provider, payload["provider"]!.GetValue<string>());
        Assert.StartsWith(".NET 10.", payload["runtime"]!.GetValue<string>());
        Assert.False(string.IsNullOrWhiteSpace(payload["version"]!.GetValue<string>()));
        Assert.DoesNotContain(factory.RuntimeDataRoot, payload.ToJsonString());
        Assert.Equal(provider == "sqlite" ? 2 : (int?)null, payload["schemaVersion"]?.GetValue<int>());
    }

    [Theory]
    [InlineData("json")]
    [InlineData("sqlite")]
    public async Task ConcurrentReviewedImports_OnlyOneCanCommit(string provider)
    {
        using var factory = new NetWatchApplicationFactory(null, provider); using var client = factory.CreateClient();
        var snapshot = await Read(client, "/api/config/versions");
        var preview = JsonNode.Parse(await (await Upload(client, "/api/config/import/preview", Config("One commit"), snapshot)).Content.ReadAsStringAsync())!;
        var results = await Task.WhenAll(Enumerable.Range(0, 4).Select(_ => Upload(client, "/api/config/import/commit", Config("One commit"), preview)));
        Assert.Single(results, value => value.IsSuccessStatusCode);
        Assert.Equal(3, results.Count(value => value.StatusCode == HttpStatusCode.Conflict));
        Assert.Single((await Read(client, "/api/config/versions"))["versions"]!.AsArray());
    }

    [Theory]
    [InlineData("json")]
    [InlineData("sqlite")]
    public async Task RecoveryPreservesExactBomAndUnknownFields_RejectsTamperedPayload(string provider)
    {
        using var factory = new NetWatchApplicationFactory(null, provider); using var client = factory.CreateClient();
        _ = await Read(client, "/api/config");
        var profiles = factory.Services.GetRequiredService<JsonRegionProfileRepository>();
        var profile = await profiles.GetActiveProfileAsync();
        var store = factory.Services.GetRequiredService<LocalDataStore>();
        var path = Path.Combine(factory.RuntimeDataRoot, profile.File);
        var original = Encoding.UTF8.GetPreamble().Concat(Encoding.UTF8.GetBytes("{\"unknownFuture\":{\"keep\":42}," + Config("Raw original")[1..])).ToArray();
        await store.WriteDocumentAsync(path, original);
        (await Upload(client, "/api/config/import", Config("Replacement"))).EnsureSuccessStatusCode();
        var history = await Read(client, "/api/config/versions"); var version = Assert.Single(history["versions"]!.AsArray())!;
        var prefix = $"/api/config/versions/{version["id"]!.GetValue<string>()}";
        var guard = Guard(history, version["sha256"]!.GetValue<string>());
        var download = await client.PostAsJsonAsync(prefix + "/download", guard); download.EnsureSuccessStatusCode();
        Assert.Equal(original, await download.Content.ReadAsByteArrayAsync());
        (await client.PostAsJsonAsync(prefix + "/restore", guard)).EnsureSuccessStatusCode();
        await using (var raw = store.OpenRead(path)) { using var bytes = new MemoryStream(); await raw.CopyToAsync(bytes); Assert.Equal(original, bytes.ToArray()); }
        var root = Path.GetDirectoryName(factory.RuntimeDataRoot)!;
        var vaultPath = Path.Combine(root, "configuration-versions", Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(Encoding.UTF8.GetBytes(profile.Id))) + ".backup.json");
        var vault = JsonNode.Parse(await store.ReadAllTextAsync(vaultPath))!;
        vault["Entries"]![1]!["Payload"] = Convert.ToBase64String(Encoding.UTF8.GetBytes(Config("Tampered")));
        await store.WriteDocumentAsync(vaultPath, Encoding.UTF8.GetBytes(vault.ToJsonString()));
        history = await Read(client, "/api/config/versions");
        var current = await client.GetStringAsync("/api/config/export");
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsJsonAsync(prefix + "/restore", Guard(history, version["sha256"]!.GetValue<string>()))).StatusCode);
        Assert.Equal(current, await client.GetStringAsync("/api/config/export"));
    }

    [Theory]
    [InlineData("json", false)]
    [InlineData("json", true)]
    [InlineData("sqlite", false)]
    [InlineData("sqlite", true)]
    public async Task SnapshotOrReplacementWriteFailure_DoesNotReplaceConfiguration(string provider, bool afterSnapshot)
    {
        using var factory = new NetWatchApplicationFactory(null, provider); using var client = factory.CreateClient();
        var before = await client.GetStringAsync("/api/config/export");
        var profiles = factory.Services.GetRequiredService<JsonRegionProfileRepository>();
        var profile = await profiles.GetActiveProfileAsync();
        var path = Path.Combine(factory.RuntimeDataRoot, profile.File);
        var root = Path.GetDirectoryName(factory.RuntimeDataRoot)!;
        Microsoft.Data.Sqlite.SqliteConnection? connection = null;
        try
        {
            if (provider == "sqlite")
            {
                connection = new Microsoft.Data.Sqlite.SqliteConnection($"Data Source={Path.Combine(root, "netwatch.db")};Pooling=False"); connection.Open();
                using var command = connection.CreateCommand();
                var condition = afterSnapshot ? $"NEW.path='{Path.GetRelativePath(root, path).Replace('\\', '/').Replace("'", "''")}'" : "NEW.path LIKE 'configuration-versions/%'";
                command.CommandText = $"CREATE TRIGGER test_write_failure BEFORE INSERT ON documents WHEN {condition} BEGIN SELECT RAISE(ABORT,'synthetic write failure'); END;";
                command.ExecuteNonQuery();
            }
            else if (afterSnapshot) File.SetAttributes(path, File.GetAttributes(path) | FileAttributes.ReadOnly);
            else await File.WriteAllTextAsync(Path.Combine(root, "configuration-versions"), "synthetic blocking file");
            var response = await Upload(client, "/api/config/import", Config("Must remain absent"));
            Assert.False(response.IsSuccessStatusCode);
            Assert.Equal(before, await client.GetStringAsync("/api/config/export"));
            if (provider == "json" && !afterSnapshot) File.Delete(Path.Combine(root, "configuration-versions"));
            var points = (await Read(client, "/api/config/versions"))["versions"]!.AsArray();
            Assert.Equal(provider == "json" && afterSnapshot ? 1 : 0, points.Count);
        }
        finally
        {
            connection?.Dispose();
            if (provider == "json") foreach (var file in Directory.EnumerateFiles(factory.RuntimeDataRoot, "*", SearchOption.AllDirectories))
                File.SetAttributes(file, File.GetAttributes(file) & ~FileAttributes.ReadOnly);
        }
    }

    [Theory]
    [InlineData("json")]
    [InlineData("sqlite")]
    public async Task RecreatedProfile_DoesNotInheritDeletedProfilesRecoveryPoints(string provider)
    {
        using var factory=new NetWatchApplicationFactory(null,provider);using var client=factory.CreateClient();
        (await client.PostAsJsonAsync("/api/regions",new {name="Recycled synthetic team",copyFromActive=false})).EnsureSuccessStatusCode();
        var original=(await Read(client,"/api/regions"))["activeProfileId"]!.GetValue<string>();
        (await Upload(client,"/api/config/import",Config("Deleted teams inventory"))).EnsureSuccessStatusCode();
        Assert.Single((await Read(client,"/api/config/versions"))["versions"]!.AsArray());
        (await client.DeleteAsync("/api/regions/"+original)).EnsureSuccessStatusCode();
        (await client.PostAsJsonAsync("/api/regions",new {name="Recycled synthetic team",copyFromActive=false})).EnsureSuccessStatusCode();
        var current=await Read(client,"/api/config/versions");
        Assert.NotEqual(original,current["profileId"]!.GetValue<string>());
        Assert.Empty(current["versions"]!.AsArray());
    }

    [Fact]
    public async Task WaitingForProfile_DoesNotHoldSqliteWriterLock()
    {
        using var factory=new NetWatchApplicationFactory(null,"sqlite");using var client=factory.CreateClient();
        _=await Read(client,"/api/config");
        var profiles=factory.Services.GetRequiredService<JsonRegionProfileRepository>();
        var repository=factory.Services.GetRequiredService<JsonDeviceRepository>();
        var flags=System.Reflection.BindingFlags.Instance|System.Reflection.BindingFlags.NonPublic;
        var profileGate=Assert.IsType<SemaphoreSlim>(typeof(JsonRegionProfileRepository).GetField("_profileLock",flags)!.GetValue(profiles));
        var reloadGate=Assert.IsType<SemaphoreSlim>(typeof(JsonDeviceRepository).GetField("_reloadLock",flags)!.GetValue(repository));
        await profileGate.WaitAsync();
        Task<HttpResponseMessage>? pending=null;
        try
        {
            pending=client.GetAsync("/api/config/versions");
            var watch=System.Diagnostics.Stopwatch.StartNew();
            while(reloadGate.CurrentCount!=0&&watch.ElapsedMilliseconds<2000) await Task.Delay(10);
            Assert.Equal(0,reloadGate.CurrentCount);
            await Task.Delay(50);
            using var probe=new Microsoft.Data.Sqlite.SqliteConnection($"Data Source={Path.Combine(Path.GetDirectoryName(factory.RuntimeDataRoot)!,"netwatch.db")};Pooling=False;Default Timeout=1");
            probe.Open();
            using var writer=probe.BeginTransaction();
            Assert.False(pending.IsCompleted);
        }
        finally
        {
            profileGate.Release();
            if(pending is not null) {using var response=await pending.WaitAsync(TimeSpan.FromSeconds(5));response.EnsureSuccessStatusCode();}
        }
    }

    [Theory]
    [InlineData("json")]
    [InlineData("sqlite")]
    public async Task RenamingReviewedDestination_RequiresANewReview(string provider)
    {
        using var factory=new NetWatchApplicationFactory(null,provider);using var client=factory.CreateClient();
        var state=await Read(client,"/api/config/versions");
        var preview=JsonNode.Parse(await (await Upload(client,"/api/config/import/preview",Config("Proposed"),state)).Content.ReadAsStringAsync())!;
        var id=state["profileId"]!.GetValue<string>();
        (await client.PostAsJsonAsync("/api/regions/"+id,new {name="Renamed synthetic target",region="Another lab"})).EnsureSuccessStatusCode();
        var current=await client.GetStringAsync("/api/config/export");
        Assert.Equal(HttpStatusCode.Conflict,(await Upload(client,"/api/config/import/commit",Config("Proposed"),preview)).StatusCode);
        Assert.Equal(current,await client.GetStringAsync("/api/config/export"));
        Assert.Empty((await Read(client,"/api/config/versions"))["versions"]!.AsArray());
    }

    [Theory]
    [InlineData("json")]
    [InlineData("sqlite")]
    public async Task DeterministicMalformedFilesAndTamperedGuards_NeverWrite(string provider)
    {
        using var factory = new NetWatchApplicationFactory(null, provider); using var client = factory.CreateClient();
        var before = await client.GetStringAsync("/api/config/export");
        var state = await Read(client, "/api/config/versions");
        var random = new Random(20261113);
        var preview = JsonNode.Parse(await (await Upload(client, "/api/config/import/preview", Config("Reviewed"), state)).Content.ReadAsStringAsync())!;
        for (var n = 0; n < 64; n++)
        {
            var invalid = "!" + new string(Enumerable.Range(0, random.Next(1, 512)).Select(_ => (char)random.Next(32, 127)).ToArray());
            Assert.Equal(HttpStatusCode.BadRequest, (await Upload(client, "/api/config/import/preview", invalid, state)).StatusCode);
            var guard = preview.DeepClone(); guard["revision"] = Convert.ToHexString(System.Security.Cryptography.SHA256.HashData(Encoding.UTF8.GetBytes(invalid)));
            Assert.Equal(HttpStatusCode.Conflict, (await Upload(client, "/api/config/import/commit", Config("Reviewed"), guard)).StatusCode);
        }
        Assert.Equal(before, await client.GetStringAsync("/api/config/export"));
        Assert.Equal(state.ToJsonString(), (await Read(client, "/api/config/versions")).ToJsonString());
    }
}
