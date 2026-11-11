namespace NetWatch.Models;

/// <summary>Local retention and managed backup policy, independent of the active inventory profile.</summary>
public sealed record StoragePolicy
{
    /// <summary>Maximum retained monitoring executions.</summary>
    public int HistoryMaxRuns { get; init; } = 500;
    /// <summary>Age limit in days; zero disables age pruning.</summary>
    public int HistoryMaxAgeDays { get; init; }
    /// <summary>Export removed executions before committing retention.</summary>
    public bool ExportBeforePrune { get; init; } = true;
    /// <summary>Enable periodic consistent SQLite snapshots.</summary>
    public bool AutomaticBackups { get; init; } = true;
    /// <summary>Minimum hours between automatic snapshots.</summary>
    public int BackupIntervalHours { get; init; } = 24;
    /// <summary>Number of managed automatic snapshots to retain.</summary>
    public int BackupCopies { get; init; } = 7;
}
