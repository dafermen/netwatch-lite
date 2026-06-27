namespace NetWatch.Models;

/// <summary>
/// Root document stored in app-errors.json.
/// </summary>
public sealed class AppErrorLogStore
{
    /// <summary>
    /// Schema version for future migrations.
    /// </summary>
    public int SchemaVersion { get; init; } = 1;

    /// <summary>
    /// Recent application errors, newest last.
    /// </summary>
    public List<AppErrorEntry> Errors { get; init; } = [];
}

/// <summary>
/// One application error captured locally for later troubleshooting.
/// </summary>
public sealed class AppErrorEntry
{
    /// <summary>
    /// Unique identifier generated for this error entry.
    /// </summary>
    public required string ErrorId { get; init; }

    /// <summary>
    /// Timestamp when the error was captured.
    /// </summary>
    public required DateTimeOffset Timestamp { get; init; }

    /// <summary>
    /// Application area that captured the error.
    /// </summary>
    public required string Source { get; init; }

    /// <summary>
    /// Full .NET exception type name.
    /// </summary>
    public required string ExceptionType { get; init; }

    /// <summary>
    /// Primary exception message.
    /// </summary>
    public required string Message { get; init; }

    /// <summary>
    /// Exception stack trace and nested exception details when available.
    /// </summary>
    public string? StackTrace { get; init; }

    /// <summary>
    /// HTTP method active when the error occurred.
    /// </summary>
    public string? HttpMethod { get; init; }

    /// <summary>
    /// Request path active when the error occurred.
    /// </summary>
    public string? Path { get; init; }

    /// <summary>
    /// Request query string active when the error occurred.
    /// </summary>
    public string? QueryString { get; init; }

    /// <summary>
    /// HTTP status code returned or intended for the error response.
    /// </summary>
    public int? StatusCode { get; init; }

    /// <summary>
    /// User agent header sent by the client, when available.
    /// </summary>
    public string? UserAgent { get; init; }
}
