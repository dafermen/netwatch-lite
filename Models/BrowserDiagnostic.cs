namespace NetWatch.Models;

/// <summary>A bounded browser error report. Request bodies, credentials and inventory are not collected.</summary>
public sealed record BrowserDiagnostic
{
    /// <summary>error, unhandledrejection or resource-error.</summary>
    public string? Kind { get; init; }
    /// <summary>Plain diagnostic message.</summary>
    public string? Message { get; init; }
    /// <summary>Same-origin script/resource path, without query values.</summary>
    public string? Script { get; init; }
    /// <summary>Optional source line.</summary>
    public int? Line { get; init; }
    /// <summary>Optional source column.</summary>
    public int? Column { get; init; }
}
