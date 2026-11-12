using System.Text.Json;
using Microsoft.Data.Sqlite;

namespace NetWatch.Services;

/// <summary>Bounded SQL projections for reports, inventory and local change history.</summary>
public sealed class SqliteQueries(LocalDataStore storage,JsonMonitorHistoryRepository history)
{
    /// <summary>Queries indexed historical results with whole-filter metrics and bounded result pages.</summary>
    public object Reports(IQueryCollection query)
    {
        RequireSqlite();
        var page = Integer(query,"page",1,1,1000000);
        var size = Integer(query,"size",10,1,100);
        var view = Value(query,"view");
        if (view.Length == 0) view = "devices";
        if (view is not ("devices" or "runs" or "facility" or "category")) throw new InvalidDataException("Unknown report view.");
        var parameters = new Dictionary<string,object?> { ["$document"]=storage.Key(history.ResolveHistoryFilePath()) };
        var runs = new List<string> { "r.document=$document" }; var rows = new List<string>();
        void Filter(List<string> filters,string sql,string key,object? value) { filters.Add(sql); parameters[key] = value; }
        foreach (var (key,op) in new[] {("from",">="),("to","<=")})
            if (Value(query,key) is { Length: > 0 } input)
            {
                if (!DateTimeOffset.TryParse(input,out var time)) throw new InvalidDataException("Invalid report date.");
                Filter(runs,$"r.completed_ms{op}${key}","$"+key,time.ToUnixTimeMilliseconds());
            }
        if (parameters.TryGetValue("$from",out var from) && parameters.TryGetValue("$to",out var to) && (long)from! > (long)to!) throw new InvalidDataException("From must be on or before To.");
        foreach (var (key,column) in new[] {("mode","r.mode"),("facility","v.facility"),("category","v.category"),("deviceKey","v.device_key")})
            if (Value(query,key) is { Length: > 0 } value) Filter(key == "mode" ? runs : rows,$"{column}=${key}","$"+key,value);
        if (Value(query,"profile") is { Length: > 0 } profile)
        {
            string[] parts;
            try { parts = JsonSerializer.Deserialize<string[]>(profile) ?? []; } catch (JsonException) { throw new InvalidDataException("Invalid report profile."); }
            if (parts.Length != 2) throw new InvalidDataException("Invalid report profile.");
            Filter(rows,"netwatch_lower(trim(v.region))=$region AND netwatch_lower(trim(v.support_group))=$group","$region",parts[0]); parameters["$group"] = parts[1];
        }
        if (Value(query,"search") is { Length: > 0 } search) Filter(rows,"instr(v.search_text,$search)>0","$search",search.ToLowerInvariant());
        if (Value(query,"status") is { Length: > 0 } status)
        {
            if (status == "Problems") rows.Add("v.status IN ('Down','Degraded')");
            else if (status == "Unknown") rows.Add("v.status NOT IN ('Healthy','Down','Degraded')");
            else if (status is "Healthy" or "Down" or "Degraded" or "AuthenticationRequired") Filter(rows,"v.status=$status","$status",status);
            else throw new InvalidDataException("Invalid report status.");
        }
        if (Value(query,"runKey") is { Length: > 0 } runKey)
        {
            try
            {
                using var key = JsonDocument.Parse(runKey);
                Filter(runs,"r.ordinal=$ordinal AND r.external_id=$external","$ordinal",key.RootElement[3].GetInt32());
                parameters["$external"] = key.RootElement[0].GetString();
            }
            catch (Exception ex) when (ex is JsonException or InvalidOperationException or IndexOutOfRangeException) { throw new InvalidDataException("Invalid execution key."); }
        }
        var runWhere = runs.Count > 0 ? string.Join(" AND ",runs) : "1=1";
        var rowWhere = rows.Count > 0 ? string.Join(" AND ",rows) : "1=1";
        var cte = $"WITH filtered AS (SELECT v.*,r.ordinal AS run_index,r.external_id,r.completed_ms,r.mode,json_remove(r.payload,'$.Results','$.results') AS run_payload FROM monitor_results v JOIN monitor_runs r ON r.id=v.run_id WHERE {runWhere} AND {rowWhere}) ";
        return storage.Read((db,_) =>
        {
            db.CreateFunction<string,string>("netwatch_lower",value=>value.ToLowerInvariant(),isDeterministic:true);
            using var snapshot = db.BeginTransaction(deferred:true);
            List<Dictionary<string,object?>> Read(string sql,Dictionary<string,object?>? extras = null)
            {
                using var command = db.CreateCommand(); command.Transaction = snapshot; command.CommandText = sql;
                foreach (var (key,value) in parameters) command.Parameters.AddWithValue(key,value ?? DBNull.Value);
                if (extras is not null) foreach (var (key,value) in extras) command.Parameters.AddWithValue(key,value ?? DBNull.Value);
                using var reader = command.ExecuteReader(); var result = new List<Dictionary<string,object?>>();
                while (reader.Read()) result.Add(Enumerable.Range(0,reader.FieldCount).ToDictionary(reader.GetName,i => reader.IsDBNull(i) ? null : reader.GetValue(i)));
                return result;
            }
            var metrics = Read(cte+"SELECT COUNT(*) evaluations,COUNT(DISTINCT device_key) devices,COUNT(DISTINCT run_id) runs,SUM(status='Healthy') healthy,SUM(status IN ('Healthy','Down','Degraded')) measured,SUM(status IN ('Down','Degraded')) problems FROM filtered")[0];
            var emptyAllowed = rows.Count == 0 || (rows.Count == 1 && parameters.ContainsKey("$region"));
            var emptyProfile = parameters.ContainsKey("$region") ? " AND netwatch_lower(trim(r.region))=$region AND netwatch_lower(trim(r.support_group))=$group" : "";
            var matchedRuns = $"SELECT r.* FROM monitor_runs r WHERE {runWhere} AND (EXISTS(SELECT 1 FROM filtered f WHERE f.run_id=r.id)" +
                (emptyAllowed ? $" OR (NOT EXISTS(SELECT 1 FROM monitor_results v WHERE v.run_id=r.id){emptyProfile})" : "") + ")";
            metrics["runs"] = Read(cte+"SELECT COUNT(*) total FROM ("+matchedRuns+")")[0]["total"];
            string sql; long total;
            var sort = Value(query,"sort"); var direction = Value(query,"direction") == "asc" ? "ASC" : "DESC";
            var columns = view switch
            {
                "devices" => new Dictionary<string,string> { ["completedAt"]="completed_ms",["deviceName"]="name",["facility"]="facility",["status"]="status",["checkMode"]="mode" },
                "runs" => new Dictionary<string,string> { ["completedAt"]="completed_ms",["scopeLabel"]="scope_label",["rowCount"]="rowCount",["availability"]="availability" },
                _ => new Dictionary<string,string> { [view]=view,["rowCount"]="rowCount",["availability"]="availability",["problemCount"]="problemCount",["averageLatency"]="averageLatency",["facilityCount"]="facilityCount" }
            };
            var order = columns.GetValueOrDefault(sort,view is "devices" or "runs" ? "completed_ms" : view);
            if (view == "devices")
            {
                total = Convert.ToInt64(metrics["evaluations"]);
                sql = cte+$"SELECT * FROM filtered ORDER BY {order} IS NULL,{order} {direction},run_index,ordinal LIMIT $size OFFSET $offset";
            }
            else if (view == "runs")
            {
                total = Convert.ToInt64(metrics["runs"]);
                sql = cte+$"SELECT r.id,r.ordinal,r.external_id,r.completed_ms,r.region,r.support_group,r.mode,r.scope_label,json_remove(r.payload,'$.Results','$.results') payload,(SELECT COUNT(*) FROM monitor_results v WHERE v.run_id=r.id) totalCount,(SELECT COUNT(*) FROM filtered f WHERE f.run_id=r.id) rowCount,(SELECT AVG(CASE WHEN f.status='Healthy' THEN 100.0 WHEN f.status IN ('Down','Degraded') THEN 0 END) FROM filtered f WHERE f.run_id=r.id) availability,(SELECT COUNT(*) FROM monitor_runs d WHERE d.document=$document AND d.external_id=r.external_id) duplicateCount FROM ({matchedRuns}) r ORDER BY {order} IS NULL,{order} {direction},ordinal LIMIT $size OFFSET $offset";
            }
            else
            {
                var grouped = $"SELECT region,support_group,{view},COUNT(*) rowCount,SUM(status IN ('Down','Degraded')) problemCount,AVG(latency) averageLatency,COUNT(DISTINCT facility) facilityCount,AVG(CASE WHEN status='Healthy' THEN 100.0 WHEN status IN ('Down','Degraded') THEN 0 END) availability FROM filtered GROUP BY netwatch_lower(trim(region)),netwatch_lower(trim(support_group)),{view}";
                total = Convert.ToInt64(Read(cte+"SELECT COUNT(*) total FROM ("+grouped+")")[0]["total"]);
                sql = cte+$"SELECT * FROM ({grouped}) ORDER BY {order} IS NULL,{order} {direction},region,support_group,{view} LIMIT $size OFFSET $offset";
            }
            page = (int)Math.Min(page,Math.Max(1,(total+size-1)/size));
            var records = Read(sql,new() { ["$size"]=size,["$offset"]=(page-1)*size });
            var options = Read("SELECT v.region,v.support_group,v.facility,v.category FROM monitor_results v JOIN monitor_runs r ON r.id=v.run_id WHERE r.document=$document UNION SELECT r.region,r.support_group,'','' FROM monitor_runs r WHERE r.document=$document AND NOT EXISTS(SELECT 1 FROM monitor_results v WHERE v.run_id=r.id) ORDER BY 1,2,3,4");
            var coverage = Read("SELECT COUNT(*) runs,MIN(completed_ms) earliest,MAX(completed_ms) latest FROM monitor_runs WHERE document=$document")[0];
            var revision = Read("SELECT group_concat(d.path||':'||d.updated_utc,'|') revision FROM documents d WHERE d.path=$document")[0]["revision"]?.ToString() ?? "empty";
            if (Value(query,"revision") is {Length:>0} expected && expected != revision) throw new InvalidDataException("History changed while reading pages. Refresh and retry.");
            snapshot.Commit();
            return (object)new { view,page,size,total,metrics,records,options,coverage,revision };
        });
    }

    /// <summary>Returns an active-profile inventory page with stable internal identities.</summary>
    public object Inventory(string path,IQueryCollection query) => Page("inventory_devices","profile=$profile" +
        (Value(query,"type").Length > 0 ? " AND device_type=$type" : ""),query,new() { ["$profile"]=path,["$type"]=Value(query,"type") },"ordinal");

    /// <summary>Returns local change records; no authenticated actor is inferred.</summary>
    public object Audit(IQueryCollection query) => Page("audit_changes",Value(query,"document").Length > 0 ? "document=$document" : "1=1",query,new() { ["$document"]=Value(query,"document") },"id DESC");

    private object Page(string table,string filter,IQueryCollection query,Dictionary<string,object?> parameters,string order)
    {
        RequireSqlite(); var page = Integer(query,"page",1,1,1000000); var size = Integer(query,"size",25,1,100);
        return storage.Read((db,_) =>
        {
            using var tx = db.BeginTransaction(deferred:true); using var command = db.CreateCommand(); command.Transaction = tx;
            foreach (var (key,value) in parameters) command.Parameters.AddWithValue(key,value ?? DBNull.Value);
            command.CommandText = $"SELECT COUNT(*) FROM {table} WHERE {filter}"; var total = Convert.ToInt64(command.ExecuteScalar());
            command.Parameters.AddWithValue("$size",size); command.Parameters.AddWithValue("$offset",(page-1)*size);
            command.CommandText = $"SELECT * FROM {table} WHERE {filter} ORDER BY {order} LIMIT $size OFFSET $offset";
            var rows = new List<Dictionary<string,object?>>();
            using (var reader = command.ExecuteReader()) while (reader.Read()) rows.Add(Enumerable.Range(0,reader.FieldCount).ToDictionary(reader.GetName,i => reader.IsDBNull(i) ? null : reader.GetValue(i)));
            tx.Commit(); return (object)new { page,size,total,records=rows };
        });
    }
    private void RequireSqlite() { if (!storage.IsSqlite) throw new InvalidDataException("This query requires the SQLite provider. Legacy JSON endpoints remain available."); }
    private static string Value(IQueryCollection query,string name) { var value = query[name].ToString(); if (value.Length > 4096) throw new InvalidDataException("Query value is too long."); return value; }
    private static int Integer(IQueryCollection query,string name,int fallback,int min,int max) => Value(query,name) is not { Length: > 0 } value ? fallback : int.TryParse(value,out var result) && result >= min && result <= max ? result : throw new InvalidDataException("Invalid page or size.");
}
