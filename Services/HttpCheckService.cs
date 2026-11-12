using System.Diagnostics;
using System.Net;
using System.Text;
using NetWatch.Models;

namespace NetWatch.Services;

/// <summary>Bounded, anonymous GET probes. No cookies, credentials or redirect following.</summary>
public sealed class HttpCheckService(IHttpClientFactory clientFactory)
{
    /// <summary>Named client, isolated from future integration clients.</summary>
    public const string ClientName = "monitor-http";
    /// <summary>Default per-attempt HTTP deadline.</summary>
    public const int DefaultTimeoutMs = 10000;
    /// <summary>Largest accepted per-attempt HTTP deadline.</summary>
    public const int MaxTimeoutMs = 60000;
    /// <summary>Maximum decompressed body bytes read for text matching.</summary>
    public const int MaxBodyBytes = 1024 * 1024;

    /// <summary>Creates a pooled transport with strict TLS and no redirect or cookie state.</summary>
    public static HttpMessageHandler CreateHandler() => new SocketsHttpHandler
    {
        AllowAutoRedirect = false,
        UseCookies = false,
        // Do not drain unvalidated bodies in the background after an early return.
        MaxResponseDrainSize = 0,
        AutomaticDecompression = DecompressionMethods.All,
        MaxResponseHeadersLength = 32,
        PooledConnectionLifetime = TimeSpan.FromMinutes(5)
    };

    /// <summary>Returns a field-level validation error without echoing the submitted URL.</summary>
    public static string? ValidationError(DeviceCheck check)
    {
        if (string.IsNullOrWhiteSpace(check.Url) || check.Url.Length > 2048
            || check.Url.Any(char.IsControl)
            || !Uri.TryCreate(check.Url.Trim(), UriKind.Absolute, out var uri)
            || (uri.Scheme != Uri.UriSchemeHttp && uri.Scheme != Uri.UriSchemeHttps)
            || string.IsNullOrEmpty(uri.Host) || uri.UserInfo.Length > 0 || uri.Fragment.Length > 0)
        {
            return "HTTP checks require an absolute HTTP/HTTPS URL (max 2048 characters), without credentials or fragments.";
        }

        if (check.TimeoutMs.HasValue && check.TimeoutMs is < 100 or > MaxTimeoutMs)
            return "HTTP timeoutMs must be between 100 and 60000.";
        if (check.ExpectedStatusCode.HasValue && check.ExpectedStatusCode is < 200 or > 599)
            return "HTTP expectedStatusCode must be between 200 and 599.";
        if (check.ExpectedText?.Length > 4096)
            return "HTTP expectedText must not exceed 4096 characters.";
        if (check.Port.HasValue)
            return "HTTP checks use the URL port, not the TCP port field.";
        return null;
    }

    /// <summary>Executes one attempt; caller cancellation propagates rather than becoming a failure.</summary>
    public async Task<CheckResult> CheckAsync(DeviceCheck check, CancellationToken cancellationToken)
    {
        var error = ValidationError(check);
        if (error is not null) throw new InvalidDataException(error);

        var uri = new Uri(check.Url!.Trim());
        var target = uri.GetLeftPart(UriPartial.Path);
        var timeoutMs = check.TimeoutMs ?? DefaultTimeoutMs;
        var expectedCode = check.ExpectedStatusCode ?? 200;
        var clock = Stopwatch.StartNew();
        int? statusCode = null;
        using var deadline = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        deadline.CancelAfter(timeoutMs);

        CheckResult Result(bool available, string status, string message, string? diagnosticCode = null) => new()
        {
            Type = "http",
            Label = $"{uri.Scheme.ToUpperInvariant()} {target}",
            Url = target,
            IsAvailable = available,
            Status = status,
            StatusCode = statusCode,
            ExpectedStatusCode = expectedCode,
            TimeoutMs = timeoutMs,
            DurationMs = clock.ElapsedMilliseconds,
            Message = message,
            DiagnosticCode = diagnosticCode,
            Attempts = 1
        };

        try
        {
            using var client = clientFactory.CreateClient(ClientName);
            using var request = new HttpRequestMessage(HttpMethod.Get, uri);
            request.Version = HttpVersion.Version11;
            request.VersionPolicy = HttpVersionPolicy.RequestVersionOrLower;
            request.Headers.UserAgent.ParseAdd("NetWatch-Lite/1.0");
            using var response = await client.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, deadline.Token);
            statusCode = (int)response.StatusCode;
            if (statusCode != expectedCode)
                return Result(false, "UnexpectedStatus", $"HTTP {statusCode}; expected {expectedCode}."
                    + (statusCode is >= 300 and < 400 ? " Redirects are not followed." : ""));

            if (!string.IsNullOrEmpty(check.ExpectedText))
            {
                if (response.Content.Headers.ContentLength > MaxBodyBytes)
                    return Result(false, "ResponseTooLarge", "Response exceeds the 1 MiB text-validation limit.");

                await using var stream = await response.Content.ReadAsStreamAsync(deadline.Token);
                using var body = new MemoryStream();
                var buffer = new byte[16384];
                int length;
                while ((length = await stream.ReadAsync(buffer, deadline.Token)) > 0)
                {
                    if (body.Length + length > MaxBodyBytes)
                        return Result(false, "ResponseTooLarge", "Response exceeds the 1 MiB text-validation limit.");
                    body.Write(buffer, 0, length);
                }

                var encoding = Encoding.UTF8;
                var charset = response.Content.Headers.ContentType?.CharSet?.Trim('"');
                if (!string.IsNullOrWhiteSpace(charset))
                {
                    try { encoding = Encoding.GetEncoding(charset); }
                    catch (Exception ex) when (ex is ArgumentException or NotSupportedException)
                    {
                        return Result(false, "UnsupportedEncoding", "Response declares an unsupported text encoding.");
                    }
                }
                var text = encoding.GetString(body.GetBuffer(), 0, (int)body.Length);
                if (!text.Contains(check.ExpectedText, StringComparison.Ordinal))
                    return Result(false, "ExpectedTextMissing", $"HTTP {statusCode}; expected text was not found (case-sensitive).");
            }

            return Result(true, "Success", string.IsNullOrEmpty(check.ExpectedText)
                ? $"HTTP {statusCode}; expected status matched."
                : $"HTTP {statusCode}; expected status and text matched.");
        }
        catch (OperationCanceledException) when (!cancellationToken.IsCancellationRequested)
        {
            return Result(false, "TimedOut", $"HTTP check exceeded the {timeoutMs} ms timeout.");
        }
        catch (HttpRequestException ex)
        {
            var (status, message) = ex.HttpRequestError switch
            {
                HttpRequestError.NameResolutionError => ("DnsError", "DNS name could not be resolved."),
                HttpRequestError.SecureConnectionError => ("TlsError", "TLS negotiation or certificate validation failed."),
                HttpRequestError.ConnectionError => ("ConnectionError", "Could not connect to the web server."),
                HttpRequestError.ResponseEnded => ("HttpError", "The web server or proxy closed the connection before a complete HTTP response."),
                HttpRequestError.VersionNegotiationError => ("HttpError", "HTTP version negotiation failed. Check server and proxy protocol support."),
                HttpRequestError.HttpProtocolError => ("HttpError", "The server or proxy returned an invalid HTTP protocol response."),
                HttpRequestError.ProxyTunnelError => ("ConnectionError", "The proxy could not establish a connection to the web server."),
                _ => ("HttpError", "The server returned an invalid or incomplete HTTP response.")
            };
            return Result(false, status, message, ex.HttpRequestError.ToString());
        }
        catch (IOException)
        {
            return Result(false, "ResponseReadError", "The response connection ended while reading content.");
        }
    }
}
