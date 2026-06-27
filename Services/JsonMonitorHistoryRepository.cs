using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Options;
using NetWatch.Models;

namespace NetWatch.Services;

/// <summary>
/// Appends completed monitoring executions to monitor-history.json for local reporting.
/// </summary>
public sealed class JsonMonitorHistoryRepository
{
    private const int MaxStoredRuns = 500;

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        ReadCommentHandling = JsonCommentHandling.Skip,
        AllowTrailingCommas = true,
        WriteIndented = true,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    private readonly IWebHostEnvironment _environment;
    private readonly NetworkMonitorOptions _options;
    private readonly SemaphoreSlim _historyLock = new(1, 1);

    /// <summary>
    /// Initializes a monitor history repository that resolves monitor-history.json relative to the content root.
    /// </summary>
    /// <param name="environment">ASP.NET Core hosting environment used to resolve relative file paths.</param>
    /// <param name="options">Network monitor options containing the history file path.</param>
    public JsonMonitorHistoryRepository(
        IWebHostEnvironment environment,
        IOptions<NetworkMonitorOptions> options)
    {
        _environment = environment;
        _options = options.Value;
    }

    /// <summary>
    /// Returns the complete local monitor history, creating the file when missing.
    /// </summary>
    /// <param name="cancellationToken">Token used to cancel file operations.</param>
    /// <returns>The local monitor history store.</returns>
    public async Task<MonitorHistoryStore> GetAsync(CancellationToken cancellationToken = default)
    {
        await _historyLock.WaitAsync(cancellationToken);

        try
        {
            return await LoadAsync(cancellationToken);
        }
        finally
        {
            _historyLock.Release();
        }
    }

    /// <summary>
    /// Appends one completed monitor response to the local history file.
    /// </summary>
    /// <param name="response">Monitor response produced by a completed run.</param>
    /// <param name="scope">Scope requested by the user.</param>
    /// <param name="startedAt">Timestamp when the run started.</param>
    /// <param name="completedAt">Timestamp when the run completed.</param>
    /// <param name="cancellationToken">Token used to cancel file operations.</param>
    /// <returns>The run entry that was appended.</returns>
    public async Task<MonitorHistoryRun> AppendAsync(
        MonitorResponse response,
        MonitorHistoryScope scope,
        DateTimeOffset startedAt,
        DateTimeOffset completedAt,
        CancellationToken cancellationToken = default)
    {
        await _historyLock.WaitAsync(cancellationToken);

        try
        {
            var store = await LoadAsync(cancellationToken);
            var run = new MonitorHistoryRun
            {
                RunId = CreateRunId(completedAt, response.CheckMode),
                StartedAt = startedAt,
                CompletedAt = completedAt,
                DurationMs = Math.Max(0, (long)(completedAt - startedAt).TotalMilliseconds),
                CheckMode = response.CheckMode,
                ExecutionStatus = response.ExecutionStatus,
                Scope = scope,
                Summary = response.Summary,
                Results = response.Results
            };

            store.Runs.Add(run);

            if (store.Runs.Count > MaxStoredRuns)
            {
                store.Runs.RemoveRange(0, store.Runs.Count - MaxStoredRuns);
            }

            await SaveAsync(store, cancellationToken);
            return run;
        }
        finally
        {
            _historyLock.Release();
        }
    }

    /// <summary>
    /// Clears all locally stored monitor history.
    /// </summary>
    /// <param name="cancellationToken">Token used to cancel file operations.</param>
    /// <returns>An empty monitor history store.</returns>
    public async Task<MonitorHistoryStore> ClearAsync(CancellationToken cancellationToken = default)
    {
        await _historyLock.WaitAsync(cancellationToken);

        try
        {
            var store = new MonitorHistoryStore();
            await SaveAsync(store, cancellationToken);
            return store;
        }
        finally
        {
            _historyLock.Release();
        }
    }

    private async Task<MonitorHistoryStore> LoadAsync(CancellationToken cancellationToken)
    {
        var filePath = ResolveHistoryFilePath();

        if (!File.Exists(filePath))
        {
            var empty = new MonitorHistoryStore();
            await SaveAsync(empty, cancellationToken);
            return empty;
        }

        try
        {
            await using var stream = File.OpenRead(filePath);
            return await JsonSerializer.DeserializeAsync<MonitorHistoryStore>(stream, JsonOptions, cancellationToken)
                ?? new MonitorHistoryStore();
        }
        catch (JsonException ex)
        {
            throw new InvalidDataException("monitor-history.json contains invalid JSON.", ex);
        }
    }

    private async Task SaveAsync(MonitorHistoryStore store, CancellationToken cancellationToken)
    {
        var filePath = ResolveHistoryFilePath();
        var directory = Path.GetDirectoryName(filePath);

        if (!string.IsNullOrWhiteSpace(directory))
        {
            Directory.CreateDirectory(directory);
        }

        await using var stream = File.Create(filePath);
        await JsonSerializer.SerializeAsync(stream, store, JsonOptions, cancellationToken);
    }

    private string ResolveHistoryFilePath()
    {
        if (Path.IsPathRooted(_options.HistoryFilePath))
        {
            return _options.HistoryFilePath;
        }

        var contentRootPath = Path.Combine(_environment.ContentRootPath, _options.HistoryFilePath);

        if (File.Exists(contentRootPath))
        {
            return contentRootPath;
        }

        var developmentDataPath = Path.Combine(_environment.ContentRootPath, "Data", _options.HistoryFilePath);

        if (File.Exists(developmentDataPath))
        {
            return developmentDataPath;
        }

        return Directory.Exists(Path.Combine(_environment.ContentRootPath, "Data"))
            ? developmentDataPath
            : contentRootPath;
    }

    private static string CreateRunId(DateTimeOffset completedAt, string checkMode)
    {
        var timestamp = completedAt.UtcDateTime.ToString("yyyyMMdd-HHmmss-fff");
        return $"{timestamp}-{checkMode.ToLowerInvariant()}";
    }
}
