namespace NetWatch.Services;

/// <summary>Controls local storage without implicitly importing existing operator files.</summary>
public sealed class StorageOptions
{
    /// <summary>auto uses an existing database, preserves existing JSON, or creates SQLite on a clean install.</summary>
    public string Provider { get; init; } = "auto";

    /// <summary>SQLite database path, relative to the content root.</summary>
    public string DatabasePath { get; init; } = "netwatch.db";
}
