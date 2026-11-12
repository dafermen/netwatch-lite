using System.Net;
using Microsoft.AspNetCore.Http;
using NetWatch.Models;
using NetWatch.Services;

namespace NetWatch.UnitTests;

public sealed class BrowserCheckRulesTests
{
    [Theory]
    [InlineData("https://app.example.invalid/BIP?bldg=LAB", true)]
    [InlineData("http://127.0.0.1:1234/app", true)]
    [InlineData("http://remote.example.invalid/app", false)]
    [InlineData("https://login.microsoftonline.com/common", false)]
    [InlineData("https://app.example.invalid/?access_token=secret", false)]
    [InlineData("https://app.example.invalid/?code=secret", false)]
    [InlineData("https://user:pass@app.example.invalid/", false)]
    [InlineData("https://app.example.invalid/#token", false)]
    public void Targets_AreValidatedWithoutLeakingTheirValues(string url, bool valid)
    {
        var error = BrowserCheckRules.ValidationError(new DeviceCheck { Type="browser", Url=url });
        Assert.Equal(valid, error is null);
        if (error is not null) Assert.DoesNotContain("secret", error);
    }

    [Theory]
    [InlineData("https://app.example.invalid/BIP?bldg=LAB", true)]
    [InlineData("https://app.example.invalid/BIP?bldg=LAB&extra=1", true)]
    [InlineData("https://app.example.invalid/BIP?bldg=OTHER", false)]
    [InlineData("https://app.example.invalid/BIP?BLDG=LAB", false)]
    [InlineData("https://app.example.invalid/BIP?bldg=LAB#login", false)]
    [InlineData("https://app.example.invalid/BIP", false)]
    [InlineData("https://app.example.invalid/BIP/fake?bldg=LAB", false)]
    [InlineData("https://app.example.invalid.evil/BIP?bldg=LAB", false)]
    [InlineData("https://app.example.invalid:444/BIP?bldg=LAB", false)]
    [InlineData("http://app.example.invalid/BIP?bldg=LAB", false)]
    public void Destination_RequiresOriginPathAndConfiguredQuery(string current, bool valid) => Assert.Equal(valid,
        BrowserCheckRules.IsTarget(new("https://app.example.invalid/BIP?bldg=LAB"), new(current)));

    [Theory]
    [InlineData("https://sso.example.invalid", true)]
    [InlineData("https://sso.example.invalid/path", false)]
    [InlineData("https://sso.example.invalid/?token=private", false)]
    [InlineData("http://sso.example.invalid", false)]
    [InlineData("https://*.example.invalid", false)]
    public void AdditionalOrigins_AreExact(string origin, bool valid) => Assert.Equal(valid,
        BrowserCheckRules.ValidationError(new() { Type="browser",Url="https://app.example.invalid/",AuthenticationOrigins=[origin] }) is null);

    [Fact]
    public void SeededDestinations_DoNotBroadenAcrossHostsQueriesOrPorts()
    {
        var random = new Random(88421);
        for (var index=0;index<1000;index++)
        {
            var id=random.Next(100000);
            var target=new Uri($"https://app.example.invalid/BIP?bldg={id}");
            Assert.False(BrowserCheckRules.IsTarget(target,new($"https://app.example.invalid/BIP?bldg={id+1}")));
            Assert.False(BrowserCheckRules.CanNavigate(new() { Type="browser",Url=target.ToString() },$"https://app.example.invalid.evil{index}/"));
        }
    }

    [Theory]
    [InlineData("AADSTS50058: user session expired",true)]
    [InlineData("Error authenticating with Windows",true)]
    [InlineData("Windows authentication failed",true)]
    [InlineData("Sign in to your account",true)]
    [InlineData("Access denied",true)]
    [InlineData("Application READY. Sign in history",false)]
    public void AuthenticationDocuments_AreNotHealthyContent(string text,bool authentication) =>
        Assert.Equal(authentication,BrowserCheckRules.IsAuthenticationContent(text));

    [Theory]
    [InlineData("127.0.0.1", "localhost:5000", "http://localhost:5000", true, null, true)]
    [InlineData("::1", "[::1]:5000", "http://[::1]:5000", true, null, true)]
    [InlineData("192.0.2.1", "localhost:5000", "http://localhost:5000", true, null, false)]
    [InlineData("127.0.0.1", "attacker.invalid", "http://attacker.invalid", true, null, false)]
    [InlineData("127.0.0.1", "localhost:5000", "http://localhost:5001", true, null, false)]
    [InlineData("127.0.0.1", "localhost:5000", "null", true, null, false)]
    [InlineData("127.0.0.1", "localhost:5000", "http://localhost:5000", false, null, false)]
    [InlineData("127.0.0.1", "localhost:5000", "http://localhost:5000", true, "X-Forwarded-For", false)]
    [InlineData("127.0.0.1", "localhost:5000", "http://localhost:5000", true, "Forwarded", false)]
    public void SessionEndpoint_RequiresDirectLocalSameOrigin(string address,string host,string origin,bool header,string? forwarded,bool allowed)
    {
        var context=new DefaultHttpContext();
        context.Connection.RemoteIpAddress=IPAddress.Parse(address);
        context.Request.Scheme="http"; context.Request.Host=new(host);
        context.Request.Headers.Origin=origin;
        if (header) context.Request.Headers["X-NetWatch-Browser"]="1";
        if (forwarded is not null) context.Request.Headers[forwarded]="127.0.0.1";
        Assert.Equal(allowed,BrowserCheckEndpoints.IsLocalRequest(context));
    }
}
