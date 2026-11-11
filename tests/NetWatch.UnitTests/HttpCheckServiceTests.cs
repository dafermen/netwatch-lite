using System.Net;
using System.Text;
using NetWatch.Models;
using NetWatch.Services;

namespace NetWatch.UnitTests;

public sealed class HttpCheckServiceTests
{
    private static HttpCheckService Service(Func<HttpRequestMessage, CancellationToken, Task<HttpResponseMessage>> send)
        => new(new TestClientFactory(send));

    private static DeviceCheck Check(string? text = null, int? code = null) => new()
    {
        Type = "http", Url = "https://example.invalid/health?token=private-value",
        ExpectedText = text, ExpectedStatusCode = code, TimeoutMs = 100
    };

    [Theory]
    [InlineData(200, null)]
    [InlineData(201, "READY")]
    [InlineData(503, "Service")]
    public async Task Match_ReturnsActualStatusDurationAndSanitizedUrl(int code, string? text)
    {
        var service = Service((request, _) =>
        {
            Assert.Equal(HttpMethod.Get, request.Method);
            Assert.Contains("token=private-value", request.RequestUri!.Query);
            Assert.Null(request.Headers.Authorization);
            return Task.FromResult(new HttpResponseMessage((HttpStatusCode)code) { Content = new StringContent("Service READY") });
        });
        var result = await service.CheckAsync(Check(text, code), default);
        Assert.True(result.IsAvailable);
        Assert.Equal("Success", result.Status);
        Assert.Equal(code, result.StatusCode);
        Assert.Equal(code, result.ExpectedStatusCode);
        Assert.True(result.DurationMs >= 0);
        Assert.Equal("https://example.invalid/health", result.Url);
        Assert.DoesNotContain("private-value", result.Label + result.Message + result.Url);
    }

    [Fact]
    public async Task OmittedOptions_UseDefaultStatusAndTimeout()
    {
        var result = await Service((_, _) => Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)))
            .CheckAsync(new DeviceCheck { Type = "http", Url = "http://example.invalid" }, default);
        Assert.True(result.IsAvailable);
        Assert.Equal(200, result.ExpectedStatusCode);
        Assert.Equal(10000, result.TimeoutMs);
    }

    [Theory]
    [InlineData(302, null, "UnexpectedStatus")]
    [InlineData(500, null, "UnexpectedStatus")]
    [InlineData(200, "ready", "ExpectedTextMissing")]
    [InlineData(200, "Not present", "ExpectedTextMissing")]
    public async Task WrongCodeOrLiteralText_Fails(int code, string? text, string expectedStatus)
    {
        var result = await Service((_, _) => Task.FromResult(new HttpResponseMessage((HttpStatusCode)code)
        { Content = new StringContent("Service READY") })).CheckAsync(Check(text), default);
        Assert.False(result.IsAvailable);
        Assert.Equal(expectedStatus, result.Status);
        Assert.Equal(code, result.StatusCode);
        Assert.NotEmpty(result.Message!);
    }

    [Theory]
    [InlineData(HttpRequestError.NameResolutionError, "DnsError")]
    [InlineData(HttpRequestError.SecureConnectionError, "TlsError")]
    [InlineData(HttpRequestError.ConnectionError, "ConnectionError")]
    [InlineData(HttpRequestError.InvalidResponse, "HttpError")]
    public async Task TransportFailures_AreSafeAndActionable(HttpRequestError error, string status)
    {
        var result = await Service((_, _) => throw new HttpRequestException(error, "secret exception details"))
            .CheckAsync(Check(), default);
        Assert.Equal(status, result.Status);
        Assert.False(result.IsAvailable);
        Assert.Null(result.StatusCode);
        Assert.DoesNotContain("secret", result.Message!);
    }

    [Fact]
    public async Task Deadline_BoundsHeaderWait()
    {
        var result = await Service(async (_, token) =>
        {
            await Task.Delay(Timeout.Infinite, token);
            return new HttpResponseMessage(HttpStatusCode.OK);
        }).CheckAsync(Check(), default);
        Assert.Equal("TimedOut", result.Status);
        Assert.Null(result.StatusCode);
        Assert.Contains("100 ms", result.Message!);
        Assert.InRange(result.DurationMs!.Value, 50, 5000);
    }

    [Fact]
    public async Task Deadline_AfterImmediateHeadersRetainsStatusWhileBodyReadTimesOut()
    {
        var service = Service((_, _) => Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
        { Content = new StreamContent(new WaitingStream()) }));
        var result = await service.CheckAsync(Check("READY"), default);
        Assert.Equal("TimedOut", result.Status);
        Assert.Equal(200, result.StatusCode);
        Assert.False(result.IsAvailable);
        Assert.Equal(100, result.TimeoutMs);
    }

    [Fact]
    public async Task CallerCancellation_IsNotReportedAsWebsiteOutage()
    {
        using var cancellation = new CancellationTokenSource();
        cancellation.Cancel();
        await Assert.ThrowsAnyAsync<OperationCanceledException>(() => Service(async (_, token) =>
        {
            await Task.Delay(Timeout.Infinite, token);
            return new HttpResponseMessage(HttpStatusCode.OK);
        }).CheckAsync(Check(), cancellation.Token));
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task BodyLimit_AppliesWithAndWithoutContentLength(bool knownLength)
    {
        var bytes = Encoding.UTF8.GetBytes(new string('a', HttpCheckService.MaxBodyBytes + 1));
        var result = await Service((_, _) => Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
        {
            Content = knownLength ? new ByteArrayContent(bytes) : new UnknownLengthContent(bytes)
        })).CheckAsync(Check("a"), default);
        Assert.Equal("ResponseTooLarge", result.Status);
        Assert.False(result.IsAvailable);
    }

    [Fact]
    public async Task TextMatching_RespectsDeclaredEncodingAndWhitespace()
    {
        var result = await Service((_, _) => Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
        { Content = new StringContent("  Pr\u00eat\n", Encoding.Latin1) }))
            .CheckAsync(Check("  Pr\u00eat\n"), default);
        Assert.True(result.IsAvailable);
    }

    [Fact]
    public async Task UnsupportedEncoding_IsControlled()
    {
        var content = new StringContent("ok");
        content.Headers.ContentType!.CharSet = "unknown-encoding";
        var result = await Service((_, _) => Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK) { Content = content }))
            .CheckAsync(Check("ok"), default);
        Assert.Equal("UnsupportedEncoding", result.Status);
    }

    [Fact]
    public void ProductionTransport_DoesNotFollowRedirectsShareCookiesOrBypassTls()
    {
        using var handler = HttpCheckService.CreateHandler();
        var sockets = Assert.IsType<SocketsHttpHandler>(handler);
        Assert.False(sockets.AllowAutoRedirect);
        Assert.False(sockets.UseCookies);
        Assert.Equal(0, sockets.MaxResponseDrainSize);
        Assert.Null(sockets.SslOptions.RemoteCertificateValidationCallback);
    }

    private sealed class TestClientFactory(Func<HttpRequestMessage, CancellationToken, Task<HttpResponseMessage>> send) : IHttpClientFactory
    {
        public HttpClient CreateClient(string name) => new(new StubHandler(send)) { Timeout = Timeout.InfiniteTimeSpan };
    }

    private sealed class StubHandler(Func<HttpRequestMessage, CancellationToken, Task<HttpResponseMessage>> send) : HttpMessageHandler
    {
        protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
            => send(request, cancellationToken);
    }

    private sealed class UnknownLengthContent(byte[] bytes) : HttpContent
    {
        protected override bool TryComputeLength(out long length) { length = 0; return false; }
        protected override Task SerializeToStreamAsync(Stream stream, TransportContext? context) => stream.WriteAsync(bytes).AsTask();
        protected override Task<Stream> CreateContentReadStreamAsync() => Task.FromResult<Stream>(new MemoryStream(bytes));
    }

    private sealed class WaitingStream : Stream
    {
        public override bool CanRead => true;
        public override bool CanSeek => false;
        public override bool CanWrite => false;
        public override long Length => throw new NotSupportedException();
        public override long Position { get => throw new NotSupportedException(); set => throw new NotSupportedException(); }
        public override async ValueTask<int> ReadAsync(Memory<byte> buffer, CancellationToken cancellationToken = default)
        { await Task.Delay(Timeout.Infinite, cancellationToken); return 0; }
        public override int Read(byte[] buffer, int offset, int count) => throw new NotSupportedException();
        public override void Flush() => throw new NotSupportedException();
        public override long Seek(long offset, SeekOrigin origin) => throw new NotSupportedException();
        public override void SetLength(long value) => throw new NotSupportedException();
        public override void Write(byte[] buffer, int offset, int count) => throw new NotSupportedException();
    }
}
