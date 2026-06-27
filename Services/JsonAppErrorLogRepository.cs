using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Extensions.Options;
using NetWatch.Models;

namespace NetWatch.Services;

/// <summary>
/// Stores application errors locally in app-errors.json for troubleshooting.
/// </summary>
public sealed class JsonAppErrorLogRepository
{
    private const int MaxStoredErrors = 1000;

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
    private readonly SemaphoreSlim _errorLock = new(1, 1);

    /// <summary>
    /// Initializes an application error log repository that resolves app-errors.json relative to the content root.
    /// </summary>
    /// <param name="environment">ASP.NET Core hosting environment used to resolve relative file paths.</param>
    /// <param name="options">Network monitor options containing the error log file path.</param>
    public JsonAppErrorLogRepository(
        IWebHostEnvironment environment,
        IOptions<NetworkMonitorOptions> options)
    {
        _environment = environment;
        _options = options.Value;
    }

    /// <summary>
    /// Returns the complete local application error log, creating the file when missing.
    /// </summary>
    /// <param name="cancellationToken">Token used to cancel file operations.</param>
    /// <returns>The local application error log store.</returns>
    public async Task<AppErrorLogStore> GetAsync(CancellationToken cancellationToken = default)
    {
        await _errorLock.WaitAsync(cancellationToken);

        try
        {
            return await LoadAsync(cancellationToken);
        }
        finally
        {
            _errorLock.Release();
        }
    }

    /// <summary>
    /// Appends one application error entry to the local error log.
    /// </summary>
    /// <param name="exception">Exception to store.</param>
    /// <param name="source">Application area that captured the error.</param>
    /// <param name="httpContext">Optional HTTP context active when the error occurred.</param>
    /// <param name="statusCode">HTTP status code returned or intended for the error response.</param>
    /// <param name="cancellationToken">Token used to cancel file operations.</param>
    /// <returns>The error entry that was appended.</returns>
    public async Task<AppErrorEntry> AppendAsync(
        Exception exception,
        string source,
        HttpContext? httpContext = null,
        int? statusCode = null,
        CancellationToken cancellationToken = default)
    {
        await _errorLock.WaitAsync(cancellationToken);

        try
        {
            var store = await LoadAsync(cancellationToken);
            var request = httpContext?.Request;
            var entry = new AppErrorEntry
            {
                ErrorId = $"err-{DateTimeOffset.UtcNow:yyyyMMdd-HHmmss-fff}-{Guid.NewGuid():N}"[..37],
                Timestamp = DateTimeOffset.Now,
                Source = source,
                ExceptionType = exception.GetType().FullName ?? exception.GetType().Name,
                Message = exception.Message,
                StackTrace = exception.ToString(),
                HttpMethod = request?.Method,
                Path = request?.Path.Value,
                QueryString = request?.QueryString.Value,
                StatusCode = statusCode,
                UserAgent = request?.Headers.UserAgent.ToString()
            };

            store.Errors.Add(entry);

            if (store.Errors.Count > MaxStoredErrors)
            {
                store.Errors.RemoveRange(0, store.Errors.Count - MaxStoredErrors);
            }

            await SaveAsync(store, cancellationToken);
            return entry;
        }
        finally
        {
            _errorLock.Release();
        }
    }

    /// <summary>
    /// Clears all locally stored application errors.
    /// </summary>
    /// <param name="cancellationToken">Token used to cancel file operations.</param>
    /// <returns>An empty application error log store.</returns>
    public async Task<AppErrorLogStore> ClearAsync(CancellationToken cancellationToken = default)
    {
        await _errorLock.WaitAsync(cancellationToken);

        try
        {
            var store = new AppErrorLogStore();
            await SaveAsync(store, cancellationToken);
            return store;
        }
        finally
        {
            _errorLock.Release();
        }
    }

    private async Task<AppErrorLogStore> LoadAsync(CancellationToken cancellationToken)
    {
        var filePath = ResolveErrorFilePath();

        if (!File.Exists(filePath))
        {
            var empty = new AppErrorLogStore();
            await SaveAsync(empty, cancellationToken);
            return empty;
        }

        try
        {
            await using var stream = File.OpenRead(filePath);
            return await JsonSerializer.DeserializeAsync<AppErrorLogStore>(stream, JsonOptions, cancellationToken)
                ?? new AppErrorLogStore();
        }
        catch (JsonException ex)
        {
            throw new InvalidDataException("app-errors.json contains invalid JSON.", ex);
        }
    }

    private async Task SaveAsync(AppErrorLogStore store, CancellationToken cancellationToken)
    {
        var filePath = ResolveErrorFilePath();
        var directory = Path.GetDirectoryName(filePath);

        if (!string.IsNullOrWhiteSpace(directory))
        {
            Directory.CreateDirectory(directory);
        }

        await using var stream = File.Create(filePath);
        await JsonSerializer.SerializeAsync(stream, store, JsonOptions, cancellationToken);
    }

    private string ResolveErrorFilePath()
    {
        if (Path.IsPathRooted(_options.ErrorLogFilePath))
        {
            return _options.ErrorLogFilePath;
        }

        var contentRootPath = Path.Combine(_environment.ContentRootPath, _options.ErrorLogFilePath);

        if (File.Exists(contentRootPath))
        {
            return contentRootPath;
        }

        var developmentDataPath = Path.Combine(_environment.ContentRootPath, "Data", _options.ErrorLogFilePath);

        if (File.Exists(developmentDataPath))
        {
            return developmentDataPath;
        }

        return Directory.Exists(Path.Combine(_environment.ContentRootPath, "Data"))
            ? developmentDataPath
            : contentRootPath;
    }
}
