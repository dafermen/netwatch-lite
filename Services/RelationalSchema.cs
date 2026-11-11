using System.Security.Cryptography;
using System.Text.Json;
using Microsoft.Data.Sqlite;

namespace NetWatch.Services;

// Documents retain the public import/export contract; projections commit in the same transaction.
internal static class RelationalSchema
{
    internal static readonly JsonDocumentOptions JsonOptions = new() { AllowTrailingCommas = true, CommentHandling = JsonCommentHandling.Skip };

    internal static void Initialize(SqliteConnection connection, string database, bool backupUpgrade)
    {
        if (backupUpgrade)
        {
            var directory = StorageMaintenance.Contained(Path.GetDirectoryName(database)!, Path.Combine("storage-backups", "schema-upgrades"));
            Directory.CreateDirectory(directory);
            var target = Path.Combine(directory, $"schema1-{DateTime.UtcNow:yyyyMMddHHmmss}-{Guid.NewGuid():N}.db");
            using var backup = new SqliteConnection(LocalDataStore.ConnectionString(target));
            backup.Open();
            connection.BackupDatabase(backup);
            if (StorageMaintenance.Verify(target) < 0) throw new InvalidDataException("Upgrade backup failed.");
        }
        using var transaction = connection.BeginTransaction();
        Execute(connection, transaction, """
            CREATE TABLE IF NOT EXISTS projection_documents(path TEXT PRIMARY KEY COLLATE NOCASE REFERENCES documents(path) ON UPDATE CASCADE ON DELETE CASCADE, sha256 TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS inventory_profiles(path TEXT PRIMARY KEY COLLATE NOCASE REFERENCES documents(path) ON UPDATE CASCADE ON DELETE CASCADE);
            CREATE TABLE IF NOT EXISTS inventory_devices(
                id TEXT PRIMARY KEY, profile TEXT NOT NULL COLLATE NOCASE REFERENCES inventory_profiles(path) ON UPDATE CASCADE ON DELETE CASCADE,
                ordinal INTEGER NOT NULL, name TEXT NOT NULL, address TEXT NOT NULL, hostname TEXT NOT NULL,
                facility TEXT NOT NULL, category TEXT NOT NULL, device_type TEXT NOT NULL, enabled INTEGER NOT NULL,
                payload TEXT NOT NULL, UNIQUE(profile,ordinal));
            CREATE INDEX IF NOT EXISTS ix_inventory_scope ON inventory_devices(profile,device_type,facility);
            CREATE TABLE IF NOT EXISTS inventory_checks(device_id TEXT NOT NULL REFERENCES inventory_devices(id) ON DELETE CASCADE,
                ordinal INTEGER NOT NULL, type TEXT NOT NULL, payload TEXT NOT NULL, PRIMARY KEY(device_id,ordinal));
            CREATE TABLE IF NOT EXISTS inventory_types(profile TEXT NOT NULL COLLATE NOCASE REFERENCES inventory_profiles(path) ON UPDATE CASCADE ON DELETE CASCADE,
                ordinal INTEGER NOT NULL, model_key TEXT NOT NULL, payload TEXT NOT NULL, PRIMARY KEY(profile,ordinal));
            CREATE TABLE IF NOT EXISTS inventory_models(profile TEXT NOT NULL COLLATE NOCASE REFERENCES inventory_profiles(path) ON UPDATE CASCADE ON DELETE CASCADE,
                ordinal INTEGER NOT NULL, model_key TEXT NOT NULL, kind TEXT NOT NULL, payload TEXT NOT NULL, PRIMARY KEY(profile,ordinal));
            CREATE TABLE IF NOT EXISTS inventory_assignments(device_id TEXT NOT NULL REFERENCES inventory_devices(id) ON DELETE CASCADE,
                kind TEXT NOT NULL, ordinal INTEGER NOT NULL, model_key TEXT NOT NULL, connection TEXT NOT NULL, link_type TEXT NOT NULL,
                payload TEXT NOT NULL, PRIMARY KEY(device_id,kind,ordinal));
            CREATE INDEX IF NOT EXISTS ix_assignment_model ON inventory_assignments(model_key,device_id);
            CREATE TABLE IF NOT EXISTS monitor_runs(
                id TEXT PRIMARY KEY, document TEXT NOT NULL COLLATE NOCASE REFERENCES documents(path) ON UPDATE CASCADE ON DELETE CASCADE,
                ordinal INTEGER NOT NULL, external_id TEXT NOT NULL, completed_ms INTEGER, region TEXT NOT NULL,
                support_group TEXT NOT NULL, mode TEXT NOT NULL, scope_label TEXT NOT NULL, payload TEXT NOT NULL, UNIQUE(document,ordinal));
            CREATE INDEX IF NOT EXISTS ix_run_date ON monitor_runs(completed_ms,id);
            CREATE INDEX IF NOT EXISTS ix_run_profile_date ON monitor_runs(region,support_group,completed_ms);
            CREATE TABLE IF NOT EXISTS monitor_results(
                run_id TEXT NOT NULL REFERENCES monitor_runs(id) ON DELETE CASCADE, ordinal INTEGER NOT NULL,
                name TEXT NOT NULL, address TEXT NOT NULL, hostname TEXT NOT NULL, facility TEXT NOT NULL, category TEXT NOT NULL,
                region TEXT NOT NULL, support_group TEXT NOT NULL, status TEXT NOT NULL, latency REAL, device_key TEXT NOT NULL,
                search_text TEXT NOT NULL, payload TEXT NOT NULL, PRIMARY KEY(run_id,ordinal));
            CREATE INDEX IF NOT EXISTS ix_result_scope ON monitor_results(facility,category,status,run_id);
            CREATE INDEX IF NOT EXISTS ix_result_identity ON monitor_results(device_key,run_id);
            CREATE TABLE IF NOT EXISTS monitor_checks(run_id TEXT NOT NULL, result_ordinal INTEGER NOT NULL, ordinal INTEGER NOT NULL,
                type TEXT NOT NULL, payload TEXT NOT NULL, PRIMARY KEY(run_id,result_ordinal,ordinal),
                FOREIGN KEY(run_id,result_ordinal) REFERENCES monitor_results(run_id,ordinal) ON DELETE CASCADE);
            CREATE TABLE IF NOT EXISTS audit_changes(id INTEGER PRIMARY KEY AUTOINCREMENT, changed_utc TEXT NOT NULL,
                document TEXT NOT NULL, entity_id TEXT NOT NULL, action TEXT NOT NULL, changes TEXT NOT NULL);
            CREATE INDEX IF NOT EXISTS ix_audit_document_date ON audit_changes(document,id);
            PRAGMA user_version=2;
            """);
        var documents = new List<(string Path, byte[] Bytes)>();
        using (var read = connection.CreateCommand())
        {
            read.Transaction = transaction;
            read.CommandText = "SELECT d.path,d.payload,p.sha256 FROM documents d LEFT JOIN projection_documents p ON p.path=d.path";
            using var rows = read.ExecuteReader();
            while (rows.Read())
            {
                var bytes = (byte[])rows[1];
                if (rows.IsDBNull(2) || rows.GetString(2) != Hash(bytes)) documents.Add((rows.GetString(0), bytes));
            }
        }
        foreach (var document in documents) Synchronize(connection, transaction, document.Path, document.Bytes, audit: false);
        transaction.Commit();
    }

    internal static void Synchronize(SqliteConnection db, SqliteTransaction tx, string path, byte[] bytes, bool audit, byte[]? previous = null)
    {
        if (path.Contains(".backup.", StringComparison.OrdinalIgnoreCase)) return;
        using var json = JsonDocument.Parse(bytes.AsMemory().TrimBom(), JsonOptions);
        var root = json.RootElement;
        using var old = previous is null ? null : JsonDocument.Parse(previous.AsMemory().TrimBom(),JsonOptions);
        if (root.ValueKind != JsonValueKind.Object)
        {
            Execute(db,tx,"DELETE FROM inventory_profiles WHERE path=$p; DELETE FROM monitor_runs WHERE document=$p",("$p",path));
            return;
        }
        if (TryGet(root,"devices", out var devices) && devices.ValueKind == JsonValueKind.Array)
        {
            Inventory(db, tx, path, root, devices, audit);
            var metadata = WithoutDevices(root); var before = old is null ? default : WithoutDevices(old.RootElement);
            if (audit && metadata.GetRawText() != (before.ValueKind == JsonValueKind.Undefined ? null : before.GetRawText()))
                Audit(db,tx,path,"profile","metadata",Difference(before,metadata));
        }
        else if (TryGet(root,"runs", out var runs) && runs.ValueKind == JsonValueKind.Array)
            History(db, tx, path, runs);
        else
        {
            Execute(db,tx,"DELETE FROM inventory_profiles WHERE path=$p; DELETE FROM monitor_runs WHERE document=$p",("$p",path));
            if (audit && !path.EndsWith("app-errors.json", StringComparison.OrdinalIgnoreCase)
                && (old is null || old.RootElement.GetRawText() != root.GetRawText()))
                Audit(db, tx, path, "", old is null ? "create" : "update", Difference(old?.RootElement ?? default,root));
        }
        Execute(db, tx, "INSERT INTO projection_documents VALUES($p,$h) ON CONFLICT(path) DO UPDATE SET sha256=excluded.sha256", ("$p", path), ("$h", Hash(bytes)));
    }

    private static void Inventory(SqliteConnection db, SqliteTransaction tx, string path, JsonElement root, JsonElement devices, bool audit)
    {
        var previous = new List<(string Id, int Ordinal, JsonElement Value)>();
        using (var read = db.CreateCommand())
        {
            read.Transaction = tx; read.CommandText = "SELECT id,ordinal,payload FROM inventory_devices WHERE profile=$p ORDER BY ordinal";
            read.Parameters.AddWithValue("$p", path);
            using var rows = read.ExecuteReader();
            while (rows.Read()) previous.Add((rows.GetString(0), rows.GetInt32(1), JsonSerializer.Deserialize<JsonElement>(rows.GetString(2))));
        }
        Execute(db, tx, "INSERT OR IGNORE INTO inventory_profiles VALUES($p)", ("$p", path));
        Execute(db, tx, "DELETE FROM inventory_devices WHERE profile=$p; DELETE FROM inventory_types WHERE profile=$p; DELETE FROM inventory_models WHERE profile=$p", ("$p", path));
        var pending = previous.ToList();
        var values = devices.EnumerateArray().ToArray();
        var matches = new Dictionary<int, (string Id, int Ordinal, JsonElement Value)>();
        // Match unchanged records first, then stable network identity, then a row edit.
        foreach (var strategy in new Func<JsonElement, JsonElement, bool>[] {
            (a,b) => a.GetRawText() == b.GetRawText(),
            (a,b) => Text(a,"name") == Text(b,"name") && Text(a,"ip") == Text(b,"ip"),
            (a,b) => Text(a,"ip").Length > 0 && Text(a,"ip") == Text(b,"ip") })
            for (var index = 0; index < values.Length; index++)
            {
                if (matches.ContainsKey(index)) continue;
                var match = pending.FindIndex(old => strategy(old.Value, values[index]));
                if (match < 0) continue;
                matches[index] = pending[match]; pending.RemoveAt(match);
            }
        if (values.Length == previous.Count)
            for (var index = 0; index < values.Length; index++)
                if (!matches.ContainsKey(index) && pending.FindIndex(old => old.Ordinal == index) is var match && match >= 0)
                { matches[index] = pending[match]; pending.RemoveAt(match); }
        for (var index = 0; index < values.Length; index++)
        {
            var value = values[index];
            var found = matches.TryGetValue(index, out var old);
            var id = found ? old.Id : Guid.NewGuid().ToString("N");
            Execute(db, tx, "INSERT INTO inventory_devices VALUES($id,$p,$o,$n,$a,$h,$f,$c,$t,$e,$v)",
                ("$id", id), ("$p", path), ("$o", index), ("$n", Text(value,"name")), ("$a", Text(value,"ip")),
                ("$h", Text(value,"hostname")), ("$f", Text(value,"facility")), ("$c", Text(value,"category")),
                ("$t", Text(value,"deviceType","unspecified")), ("$e", !TryGet(value,"enabled", out var enabled) || enabled.ValueKind != JsonValueKind.False), ("$v", value.GetRawText()));
            var ordinal = 0;
            foreach (var check in Array(value,"checks"))
                Execute(db, tx, "INSERT INTO inventory_checks VALUES($id,$o,$t,$v)", ("$id", id), ("$o", ordinal++), ("$t", Text(check,"type")), ("$v", check.GetRawText()));
            if (TryGet(value,"workstationPeripherals", out var peripherals) && peripherals.ValueKind == JsonValueKind.Object)
                foreach (var kind in new[] { "printers", "scanners" })
                    if (TryGet(peripherals,kind, out var assignments))
                    {
                        ordinal = 0;
                        foreach (var assignment in Array(assignments,"items"))
                            Execute(db, tx, "INSERT INTO inventory_assignments VALUES($id,$k,$o,$m,$c,$l,$v)",
                                ("$id", id), ("$k", kind), ("$o", ordinal++), ("$m", Text(assignment,"modelId")),
                                ("$c", Text(assignment,"connection")), ("$l", Text(assignment,"linkType")), ("$v", assignment.GetRawText()));
                    }
            if (audit && (!found || old.Value.GetRawText() != value.GetRawText()))
                Audit(db, tx, path, id, found ? "update" : "create", Difference(found ? old.Value : default, value));
        }
        if (audit) foreach (var deleted in pending) Audit(db, tx, path, deleted.Id, "delete", Difference(deleted.Value, default));
        foreach (var (property, table) in new[] { ("deviceTypes", "inventory_types"), ("peripheralCatalog", "inventory_models") })
        {
            var index = 0;
            foreach (var value in Array(root, property))
            {
                if (table == "inventory_types") Execute(db, tx, "INSERT INTO inventory_types VALUES($p,$o,$k,$v)", ("$p", path), ("$o", index++), ("$k", Text(value,"id")), ("$v", value.GetRawText()));
                else Execute(db, tx, "INSERT INTO inventory_models VALUES($p,$o,$k,$t,$v)", ("$p", path), ("$o", index++), ("$k", Text(value,"id")), ("$t", Text(value,"kind")), ("$v", value.GetRawText()));
            }
        }
    }

    private static void History(SqliteConnection db, SqliteTransaction tx, string path, JsonElement runs)
    {
        Execute(db, tx, "DELETE FROM monitor_runs WHERE document=$p", ("$p", path));
        var ordinal = 0;
        foreach (var run in runs.EnumerateArray())
        {
            var id = $"{path}:{ordinal}";
            var scope = TryGet(run,"scope", out var s) ? s : default;
            var results = Array(run,"results").ToArray();
            var region = Text(scope,"region", results.Length > 0 ? Text(results[0],"region") : "");
            var group = Text(scope,"supportGroup", results.Length > 0 ? Text(results[0],"supportGroup") : "");
            long? completed = DateTimeOffset.TryParse(Text(run,"completedAt"), out var time) ? time.ToUnixTimeMilliseconds() : null;
            var facilityScope=Text(scope,"facility");var categoryScope=Text(scope,"category");var nameScope=Text(scope,"deviceName");var selected=Array(scope,"deviceIps").Count();
            var scopeLabel=nameScope.Length>0 ? "Device: "+nameScope : selected>0 ? "Selected devices: "+selected
                : categoryScope.Length>0 ? facilityScope.Length>0 ? facilityScope+" / "+categoryScope : "Category: "+categoryScope
                : facilityScope.Length>0 ? "Facility: "+facilityScope : scope.ValueKind==JsonValueKind.Undefined ? "Not recorded" : "All facilities";
            Execute(db, tx, "INSERT INTO monitor_runs VALUES($id,$p,$o,$x,$d,$r,$g,$m,$s,$v)", ("$id", id), ("$p", path), ("$o", ordinal++),
                ("$x", Text(run,"runId")), ("$d", completed), ("$r", region), ("$g", group), ("$m", Text(run,"checkMode","Full")), ("$s",scopeLabel), ("$v", run.GetRawText()));
            for (var index = 0; index < results.Length; index++)
            {
                var value = results[index];
                var checks = Array(value,"checks").ToArray();
                var r = Text(value,"region",region); var g = Text(value,"supportGroup",group);
                var name = Text(value,"name","Unnamed"); var ip = Text(value,"ip");
                var facility = Text(value,"facility","Unassigned"); var category = Text(value,"category","Unassigned");
                var deviceKey = JsonSerializer.Serialize(new[] {r,g,facility,category,name,ip}.Select(x => x.Trim().ToLowerInvariant()),new JsonSerializerOptions { Encoder=System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping });
                double? latency = null;
                var ping = checks.FirstOrDefault(c => Text(c,"type") == "ping" && TryGet(c,"isAvailable",out var available) && available.ValueKind == JsonValueKind.True);
                if (ping.ValueKind != JsonValueKind.Undefined && TryGet(ping,"latencyMs",out var l)) latency=Number(l);
                if (latency is null && (ping.ValueKind != JsonValueKind.Undefined || checks.Length==0) && TryGet(value,"latencyMs",out var legacy)) latency=Number(legacy);
                var search = string.Join('\n', new[] { name,ip,Text(value,"hostname"),facility,category,r,g,Text(run,"runId") }.Concat(checks.Select(c => Text(c,"url")))).ToLowerInvariant();
                Execute(db, tx, "INSERT INTO monitor_results VALUES($id,$o,$n,$a,$h,$f,$c,$r,$g,$s,$l,$k,$q,$v)",
                    ("$id", id), ("$o", index), ("$n", name), ("$a", ip), ("$h", Text(value,"hostname")), ("$f", facility), ("$c", category),
                    ("$r", r), ("$g", g), ("$s", Status(value)), ("$l", latency), ("$k", deviceKey), ("$q", search), ("$v", value.GetRawText()));
                for (var checkIndex = 0; checkIndex < checks.Length; checkIndex++)
                    Execute(db, tx, "INSERT INTO monitor_checks VALUES($id,$r,$o,$t,$v)", ("$id", id), ("$r", index), ("$o", checkIndex), ("$t", Text(checks[checkIndex],"type")), ("$v", checks[checkIndex].GetRawText()));
            }
        }
    }

    private static object Difference(JsonElement before, JsonElement after)
    {
        var a = before.ValueKind == JsonValueKind.Object ? before.EnumerateObject().ToDictionary(p => p.Name,p => p.Value) : [];
        var b = after.ValueKind == JsonValueKind.Object ? after.EnumerateObject().ToDictionary(p => p.Name,p => p.Value) : [];
        return a.Keys.Union(b.Keys).Where(key => (!a.TryGetValue(key,out var x) ? null : x.GetRawText()) != (!b.TryGetValue(key,out var y) ? null : y.GetRawText()))
            .ToDictionary(key => key, key => new { before = a.TryGetValue(key,out var x) ? (object)x : null, after = b.TryGetValue(key,out var y) ? (object)y : null });
    }
    private static JsonElement WithoutDevices(JsonElement value) => JsonSerializer.SerializeToElement(value.ValueKind==JsonValueKind.Object ? value.EnumerateObject()
        .Where(property => !string.Equals(property.Name,"devices",StringComparison.OrdinalIgnoreCase)).ToDictionary(property => property.Name,property => property.Value) : new Dictionary<string,JsonElement>());

    private static void Audit(SqliteConnection db, SqliteTransaction tx, string path, string entity, string action, object changes) =>
        Execute(db, tx, "INSERT INTO audit_changes(changed_utc,document,entity_id,action,changes) VALUES($d,$p,$e,$a,$c)",
            ("$d", DateTimeOffset.UtcNow.ToString("O")), ("$p", path), ("$e", entity), ("$a", action), ("$c", JsonSerializer.Serialize(changes)));

    private static bool TryGet(JsonElement value,string key,out JsonElement result)
    {
        result = default;
        if (value.ValueKind != JsonValueKind.Object) return false;
        if (value.TryGetProperty(key,out result)) return true;
        foreach (var property in value.EnumerateObject()) if (string.Equals(property.Name,key,StringComparison.OrdinalIgnoreCase)) { result=property.Value; return true; }
        return false;
    }
    private static string Status(JsonElement value) => TryGet(value,"status",out var status) && status.ValueKind == JsonValueKind.Number
        && status.TryGetInt32(out var number) && Enum.IsDefined(typeof(NetWatch.Models.DeviceStatus),number)
        ? ((NetWatch.Models.DeviceStatus)number).ToString() : Text(value,"status","Unknown");
    private static double? Number(JsonElement value)
    {
        var text=value.ValueKind==JsonValueKind.String ? value.GetString() : value.GetRawText();
        return double.TryParse(text,System.Globalization.NumberStyles.Float,System.Globalization.CultureInfo.InvariantCulture,out var result) && double.IsFinite(result) && result>=0 ? result : null;
    }
    internal static string Text(JsonElement value, string key, string fallback = "") => TryGet(value,key, out var property) && property.ValueKind == JsonValueKind.String && !string.IsNullOrEmpty(property.GetString()) ? property.GetString()! : fallback;
    internal static IEnumerable<JsonElement> Array(JsonElement value, string key) => TryGet(value,key, out var property) && property.ValueKind == JsonValueKind.Array ? property.EnumerateArray() : [];
    internal static void Execute(SqliteConnection db, SqliteTransaction tx, string sql, params (string Key, object? Value)[] parameters)
    {
        using var command = db.CreateCommand(); command.Transaction = tx; command.CommandText = sql;
        foreach (var (key,value) in parameters) command.Parameters.AddWithValue(key,value ?? DBNull.Value);
        command.ExecuteNonQuery();
    }
    private static string Hash(byte[] bytes) => Convert.ToHexString(SHA256.HashData(bytes));
    private static ReadOnlyMemory<byte> TrimBom(this Memory<byte> bytes) => bytes.Span.StartsWith(new byte[] {239,187,191}) ? bytes[3..] : bytes;
}
