using Microsoft.AspNetCore.WebUtilities;
using NetWatch.Models;

namespace NetWatch.Services;

/// <summary>Public configuration validation and fail-closed browser navigation rules.</summary>
public static class BrowserCheckRules
{
    /// <summary>Default identity-provider origins; no wildcard domains.</summary>
    public static readonly string[] MicrosoftOrigins = ["https://login.microsoftonline.com", "https://login.microsoft.com", "https://login.windows.net", "https://login.live.com"];

    /// <summary>Validates a browser definition without echoing private URL values.</summary>
    public static string? ValidationError(DeviceCheck check)
    {
        if (check.FollowRedirects) return "followRedirects applies only to anonymous HTTP checks.";
        if (HttpCheckService.ValidationError(check) is { } error) return error;
        var uri = new Uri(check.Url!.Trim());
        if (uri.Scheme != "https" && !uri.IsLoopback) return "Browser checks require HTTPS, except for loopback test sites.";
        if (MicrosoftOrigins.Contains(uri.GetLeftPart(UriPartial.Authority), StringComparer.OrdinalIgnoreCase)) return "Use the application URL, not an identity-provider sign-in URL.";
        if (check.TimeoutMs is < 1000) return "Browser timeout must be between 1000 and 60000 milliseconds.";
        if (check.ExpectedStatusCode is { } status && status != 200) return "Browser checks expect HTTP 200; redirects and authentication responses cannot validate access.";
        if (check.AuthenticationOrigins is { } origins && (origins.Count > 8 || origins.Any(value => !ValidOrigin(value)))) return "Use up to eight exact HTTPS authentication origins without paths, credentials, query or fragments.";
        if (check.AuthenticationOrigins?.Any(value => SameOrigin(uri, new Uri(value))) == true) return "Authentication origins must differ from the application origin.";
        var query = QueryHelpers.ParseQuery(uri.Query);
        if (query.Keys.Any(key => key.Equals("access_token", StringComparison.OrdinalIgnoreCase) || key.Equals("id_token", StringComparison.OrdinalIgnoreCase)
            || key.Equals("client_secret", StringComparison.OrdinalIgnoreCase) || key.Equals("code", StringComparison.OrdinalIgnoreCase))) return "Do not save authentication tokens or authorization callback URLs as monitoring targets.";
        return null;
    }

    private static bool ValidOrigin(string? value) => value is { Length: > 0 and <= 256 }
        && Uri.TryCreate(value, UriKind.Absolute, out var uri) && uri.UserInfo.Length == 0 && uri.Query.Length == 0 && uri.Fragment.Length == 0
        && !uri.Host.Contains('*') && uri.AbsolutePath == "/" && (uri.Scheme == "https" || uri.Scheme == "http" && uri.IsLoopback) && !value.Any(char.IsControl);

    /// <summary>Compares the complete intended destination, including configured query values.</summary>
    public static bool IsTarget(Uri target, Uri current)
    {
        if (!SameOrigin(target, current) || current.UserInfo.Length != 0 || current.Fragment.Length != 0
            || !string.Equals(target.AbsolutePath.TrimEnd('/'), current.AbsolutePath.TrimEnd('/'), StringComparison.Ordinal)) return false;
        var expected = QueryHelpers.ParseQuery(target.Query);
        var actual = QueryHelpers.ParseQuery(current.Query).ToDictionary(pair => pair.Key, pair => pair.Value, StringComparer.Ordinal);
        return expected.All(pair => actual.TryGetValue(pair.Key, out var values) && pair.Value.SequenceEqual(values));
    }

    /// <summary>Matches a configured or built-in authentication origin.</summary>
    public static bool IsAuthentication(DeviceCheck check, Uri uri) => MicrosoftOrigins.Concat(check.AuthenticationOrigins ?? [])
        .Any(origin => Uri.TryCreate(origin, UriKind.Absolute, out var parsed) && SameOrigin(parsed, uri));

    /// <summary>Allows only the application origin and explicit identity-provider origins for top-level navigation.</summary>
    public static bool CanNavigate(DeviceCheck check, string value) => Uri.TryCreate(value, UriKind.Absolute, out var uri)
        && uri.UserInfo.Length == 0 && (SameOrigin(new Uri(check.Url!), uri) || IsAuthentication(check, uri));

    /// <summary>Recognizes common identity-provider and Windows-auth error documents, never stores their body.</summary>
    public static bool IsAuthenticationContent(string text) =>
        System.Text.RegularExpressions.Regex.IsMatch(text, "\\bAADSTS[0-9]{4,}", System.Text.RegularExpressions.RegexOptions.CultureInvariant | System.Text.RegularExpressions.RegexOptions.NonBacktracking)
        || new[] { "windows authentication failed", "error authenticating with windows", "windows authentication error", "authentication failed", "sign in to your account" }
            .Any(marker => text.Contains(marker, StringComparison.OrdinalIgnoreCase))
        || text.Trim().Equals("Access denied", StringComparison.OrdinalIgnoreCase) || text.Trim().Equals("Unauthorized", StringComparison.OrdinalIgnoreCase);

    private static bool SameOrigin(Uri left, Uri right) => left.Scheme == right.Scheme && left.IdnHost.Equals(right.IdnHost, StringComparison.OrdinalIgnoreCase) && left.Port == right.Port;
}
