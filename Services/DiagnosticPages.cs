using System.Globalization;
using System.Security.Cryptography;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Primitives;
using NetWatch.Models;

namespace NetWatch.Services;

/// <summary>Read-only, bounded diagnostic projections. Monitoring failures remain in history, not duplicated into app errors.</summary>
public sealed class DiagnosticPages(JsonAppErrorLogRepository errors, JsonMonitorHistoryRepository history,
    LocalDataStore storage, SqliteQueries queries)
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() }, DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };
    private static readonly JsonNodeOptions NodeOptions = new() { PropertyNameCaseInsensitive = true };

    /// <summary>Queries either internal/browser errors or failed monitoring evaluations.</summary>
    public async Task<object> QueryAsync(IQueryCollection query, CancellationToken cancellationToken)
    {
        var source = Value(query, "source");
        if (source.Length == 0) source = "application";
        if (source is not ("application" or "monitoring")) throw new InvalidDataException("Unknown diagnostic source.");
        var page = Integer(query, "page", 1, 1, 1000000);
        var size = Integer(query, "size", 25, 1, 100);
        var from = Date(query, "from"); var to = Date(query, "to");
        if (from > to) throw new InvalidDataException("From must be on or before To.");
        var search = Value(query, "search");
        if (source == "monitoring" && storage.IsSqlite)
        {
            var parameters = new Dictionary<string, StringValues>(StringComparer.OrdinalIgnoreCase);
            foreach (var name in new[] { "search", "from", "to", "page", "size", "revision", "profile", "facility", "category" })
                if (query.TryGetValue(name, out var value)) parameters[name] = value;
            parameters["view"] = "devices"; parameters["status"] = "Problems";
            var result = JsonSerializer.SerializeToNode(queries.Reports(new QueryCollection(parameters)))!;
            var entries = result["records"]!.AsArray().Select(record =>
            {
                var raw = JsonNode.Parse(record!["payload"]!.GetValue<string>(), NodeOptions)!;
                var projected = SafeResult(raw);
                projected["status"] = record["status"]!.DeepClone();
                var milliseconds = record["completed_ms"]!.GetValue<long>();
                return (object)new { errorId = $"probe-{record["run_index"]}-{record["ordinal"]}",
                    timestamp = milliseconds > 0 ? DateTimeOffset.FromUnixTimeMilliseconds(milliseconds) : (DateTimeOffset?)null,
                    source = "monitoring", runId = record["external_id"]!.GetValue<string>(), result = projected };
            }).ToArray();
            return new { source, page = result["page"]!.GetValue<int>(), size, total = result["total"]!.GetValue<long>(),
                revision = result["revision"]!.GetValue<string>(), entries };
        }

        List<object> values;
        string revision;
        if (source == "application")
        {
            var all = (await errors.GetAsync(cancellationToken)).Errors.Select(DiagnosticSanitizer.Entry).ToList();
            revision = Revision(all);
            values = all.Where(entry => InRange(entry.Timestamp, from, to)
                    && Matches(search, entry.ErrorId, entry.TraceId, entry.Source, entry.ExceptionType, entry.Message, entry.Path))
                .OrderByDescending(entry => entry.Timestamp).ThenBy(entry => entry.ErrorId).Cast<object>().ToList();
        }
        else
        {
            var all = await history.GetAsync(cancellationToken);
            revision = Revision(all);
            values = all.Runs.SelectMany((run, runIndex) => run.Results.Select((result, index) => new { run, result, runIndex, index }))
                .Where(value => value.result.Status is DeviceStatus.Down or DeviceStatus.Degraded)
                .Where(value => InRange(value.run.CompletedAt, from, to)
                    && Matches(search, value.result.Name, value.result.Ip, value.result.Hostname, value.result.Facility, value.result.Category))
                .OrderByDescending(value => value.run.CompletedAt).ThenByDescending(value => value.runIndex).ThenBy(value => value.index)
                .Select(value => (object)new { errorId = $"probe-{value.runIndex}-{value.index}", timestamp = value.run.CompletedAt,
                    source = "monitoring", runId = value.run.RunId,
                    result = SafeResult(JsonSerializer.SerializeToNode(value.result, JsonOptions)!) }).ToList();
        }
        if (Value(query, "revision") is { Length: > 0 } expected && expected != revision)
            throw new MonitorScopeConflictException("Diagnostics changed while reading pages. Refresh and retry.");
        page = (int)Math.Min(page, Math.Max(1, (values.Count + size - 1L) / size));
        return new { source, page, size, total = values.Count, revision, entries = values.Skip((page - 1) * size).Take(size).ToArray() };
    }

    private static JsonObject SafeResult(JsonNode value)
    {
        var result = new JsonObject();
        foreach (var field in new[] { "name", "ip", "hostname", "facility", "category", "region", "supportGroup", "deviceType", "status", "checkMode", "lastCheck" })
            if (value[field] is { } node) result[field] = node is JsonValue scalar && scalar.TryGetValue<string>(out var text)
                ? JsonValue.Create(DiagnosticSanitizer.Text(text)) : node.DeepClone();
        var checks = new JsonArray();
        if (value["checks"] is JsonArray input)
            foreach (var item in input.Where(item => item is not null))
            {
                var check = new JsonObject();
                foreach (var field in new[] { "type", "port", "isAvailable", "status", "label", "url", "statusCode", "expectedStatusCode", "timeoutMs", "durationMs", "diagnosticCode", "attempts" })
                    if (item![field] is { } node) check[field] = node is JsonValue scalar && scalar.TryGetValue<string>(out var text)
                        ? JsonValue.Create(DiagnosticSanitizer.Text(text)) : node.DeepClone();
                checks.Add(check);
            }
        result["checks"] = checks;
        return result;
    }

    private static bool Matches(string search, params string?[] values) => search.Length == 0 || values.Any(value => value?.Contains(search, StringComparison.OrdinalIgnoreCase) == true);
    private static bool InRange(DateTimeOffset value, DateTimeOffset? from, DateTimeOffset? to) => (!from.HasValue || value >= from) && (!to.HasValue || value <= to);
    private static string Revision(object value) => Convert.ToHexString(SHA256.HashData(JsonSerializer.SerializeToUtf8Bytes(value, JsonOptions)));
    private static string Value(IQueryCollection query, string name) => query[name].ToString() is { Length: > 4096 } ? throw new InvalidDataException("Diagnostic query is too long.") : query[name].ToString().Trim();
    private static int Integer(IQueryCollection query, string name, int fallback, int min, int max) => Value(query, name) is not { Length: > 0 } value ? fallback
        : int.TryParse(value, out var result) && result >= min && result <= max ? result : throw new InvalidDataException("Invalid diagnostic page or size.");
    private static DateTimeOffset? Date(IQueryCollection query, string name) => Value(query, name) is not { Length: > 0 } value ? null
        : DateTimeOffset.TryParse(value, CultureInfo.InvariantCulture, DateTimeStyles.None, out var result) ? result : throw new InvalidDataException("Invalid diagnostic date.");
}
