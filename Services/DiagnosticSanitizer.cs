using System.Text.RegularExpressions;
using NetWatch.Models;

namespace NetWatch.Services;

/// <summary>Removes URL credentials/query strings and common secret forms from diagnostic copies.</summary>
public static class DiagnosticSanitizer
{
    private const RegexOptions Options = RegexOptions.IgnoreCase | RegexOptions.CultureInvariant | RegexOptions.NonBacktracking;
    private static readonly Regex Urls = new(@"https?://[^\s<>""']+", Options, TimeSpan.FromMilliseconds(100));
    private static readonly Regex Bearer = new(@"\bBearer\s+[^\s,;]+", Options, TimeSpan.FromMilliseconds(100));
    private static readonly Regex Secrets = new(@"\b(?:authorization|password|passwd|token|api[-_]?key|secret)\s*[:=]\s*(?:""[^""]*""|'[^']*'|[^\s,;]+)", Options, TimeSpan.FromMilliseconds(100));

    /// <summary>Returns bounded plain text. This does not make an export public or anonymous.</summary>
    public static string? Text(string? value, int limit = 8192)
    {
        if (value is null) return null;
        value = value[..Math.Min(value.Length, limit)];
        value = new string(value.Where(character => !char.IsControl(character) || character is '\n' or '\r' or '\t').ToArray());
        value = Urls.Replace(value, match =>
        {
            if (!Uri.TryCreate(match.Value, UriKind.Absolute, out var uri)) return "[redacted URL]";
            var safe = new UriBuilder(uri) { UserName = "", Password = "", Query = "", Fragment = "" };
            return safe.Uri.GetLeftPart(UriPartial.Path);
        });
        value = Bearer.Replace(value, "Bearer [redacted]");
        return Secrets.Replace(value, match => match.Value.Split(new[] { ':', '=' }, 2)[0].Trim() + "=[redacted]");
    }

    /// <summary>Redacts legacy entries for consultation/export without rewriting their stored document.</summary>
    public static AppErrorEntry Entry(AppErrorEntry value) => new()
    {
        ErrorId = value.ErrorId, Timestamp = value.Timestamp, Source = Text(value.Source, 256) ?? "",
        ExceptionType = Text(value.ExceptionType, 512) ?? "", Message = Text(value.Message, 4096) ?? "",
        StackTrace = Text(value.StackTrace, 32768), HttpMethod = Text(value.HttpMethod, 32),
        Path = Text(value.Path, 2048)?.Split('?', '#')[0], QueryString = null,
        StatusCode = value.StatusCode, UserAgent = Text(value.UserAgent, 256), TraceId = Text(value.TraceId, 256)
    };
}
