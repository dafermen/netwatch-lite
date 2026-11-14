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

    private static DeviceCheck RedirectCheck(int timeout = 1000) => new() { Type = "http",
        Url = "https://example.invalid/start?private=original", TimeoutMs = timeout, FollowRedirects = true, ExpectedText = "READY" };
    private static HttpResponseMessage Redirect(string location, int status = 302)
    {
        var response = new HttpResponseMessage((HttpStatusCode)status);
        response.Headers.TryAddWithoutValidation("Location", location);
        response.Headers.TryAddWithoutValidation("Set-Cookie", "private=session");
        return response;
    }

    [Theory]
    [InlineData(301)] [InlineData(302)] [InlineData(303)] [InlineData(307)] [InlineData(308)]
    public async Task OptIn_FollowsRelativeThenCrossOriginWithoutState(int status)
    {
        var calls = 0;
        var result = await Service((request, _) =>
        {
            Assert.Null(request.Headers.Authorization);
            Assert.False(request.Headers.Contains("Cookie"));
            Assert.Equal(HttpMethod.Get, request.Method);
            return Task.FromResult(++calls switch {
                1 => Redirect("/next?private=second", status),
                2 => Redirect("https://other.invalid/final?private=third#section", status),
                _ => new HttpResponseMessage(HttpStatusCode.OK) { Content = new StringContent("READY") }
            });
        }).CheckAsync(RedirectCheck(), default);
        Assert.True(result.IsAvailable); Assert.Equal(3, calls); Assert.Equal(2, result.RedirectCount);
        Assert.Equal("https://other.invalid/final", result.FinalUrl);
        Assert.DoesNotContain("private", System.Text.Json.JsonSerializer.Serialize(result));
    }

    [Fact]
    public async Task DefaultOff_CanExplicitlyExpect302ButDoesNotFollowIt()
    {
        var calls = 0;
        var result = await Service((_, _) => { calls++; return Task.FromResult(Redirect("https://login.microsoftonline.com/secret")); })
            .CheckAsync(Check(code: 302), default);
        Assert.True(result.IsAvailable); Assert.Equal(1, calls);
        Assert.Null(result.RedirectCount); Assert.Null(result.FinalUrl);
    }

    [Theory]
    [InlineData("http://other.invalid/plain", "HttpsDowngrade")]
    [InlineData("file:///C:/secret", "InvalidRedirect")]
    [InlineData("https://name:password@other.invalid/", "InvalidRedirect")]
    [InlineData("/start?private=original", "RedirectLoop")]
    public async Task UnsafeOrLoopingRedirects_StopBeforeNextRequest(string location, string diagnostic)
    {
        var calls = 0;
        var result = await Service((_, _) => { calls++; return Task.FromResult(Redirect(location)); })
            .CheckAsync(RedirectCheck(), default);
        Assert.Equal(1, calls); Assert.False(result.IsAvailable); Assert.Equal("RedirectBlocked", result.Status);
        Assert.Equal(diagnostic, result.DiagnosticCode);
        Assert.DoesNotContain("password", result.Message + result.FinalUrl);
    }

    [Fact]
    public async Task HopLimit_IsBoundedAndNeverReturnsHealthy()
    {
        var calls = 0;
        var result = await Service((_, _) => Task.FromResult(Redirect("/hop/" + ++calls)))
            .CheckAsync(RedirectCheck(), default);
        Assert.Equal(HttpCheckService.MaxRedirects + 1, calls);
        Assert.Equal(5, result.RedirectCount); Assert.Equal("RedirectLimit", result.DiagnosticCode);
    }

    [Theory]
    [InlineData("https://login.microsoftonline.com/common/authorize?private=token")]
    [InlineData("https://login.windows.net/common/authorize")]
    [InlineData("https://login.live.com/")]
    public async Task IdentityProviderRedirect_IsNeutralAndNeverFetched(string location)
    {
        var calls = 0;
        var result = await Service((_, _) => { calls++; return Task.FromResult(Redirect(location)); })
            .CheckAsync(RedirectCheck(), default);
        Assert.Equal(1, calls); Assert.Equal("AuthenticationRequired", result.Status);
        Assert.False(result.IsAvailable); Assert.DoesNotContain("private", result.FinalUrl!);
    }

    [Fact]
    public async Task LoginContentOnApplicationOrigin_IsNotHealthy()
    {
        var result = await Service((_, _) => Task.FromResult(new HttpResponseMessage(HttpStatusCode.OK)
            { Content = new StringContent("READY Sign in to your account") })).CheckAsync(RedirectCheck(), default);
        Assert.Equal("AuthenticationRequired", result.Status); Assert.Equal("AuthenticationContent", result.DiagnosticCode);
    }

    [Fact]
    public async Task RedirectHops_ShareOneDeadlineIncludingFinalBody()
    {
        var calls = 0;
        var clock = System.Diagnostics.Stopwatch.StartNew();
        var result = await Service(async (_, token) =>
        {
            calls++; await Task.Delay(80, token);
            return Redirect("/hop/" + calls);
        }).CheckAsync(RedirectCheck(200), default);
        Assert.Equal("TimedOut", result.Status); Assert.InRange(calls, 1, 3);
        Assert.InRange(clock.ElapsedMilliseconds, 100, 3000);
    }

    [Fact]
    public async Task MissingLocation_IsControlled()
    {
        var result = await Service((_, _) => Task.FromResult(new HttpResponseMessage(HttpStatusCode.Redirect)))
            .CheckAsync(RedirectCheck(), default);
        Assert.Equal("InvalidRedirect", result.DiagnosticCode);
    }

    [Fact]
    public async Task DeterministicRedirectFuzz_AlwaysBoundsRequestsAndRejectsUnfinishedChains()
    {
        var random=new Random(20261113);
        for(var n=0;n<200;n++)
        {
            var calls=0;var cycle=random.Next(1,10);
            var location=n%3==0?"/cycle/":n%3==1?"file:///private/":"https://user:secret@other.invalid/";
            var result=await Service((_,_)=>Task.FromResult(Redirect(location+(++calls%cycle))))
                .CheckAsync(RedirectCheck(),default);
            Assert.False(result.IsAvailable);Assert.Equal("RedirectBlocked",result.Status);
            Assert.InRange(calls,1,6);Assert.InRange(result.RedirectCount!.Value,0,5);
            Assert.DoesNotContain("secret",result.Message+result.FinalUrl);
        }
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
