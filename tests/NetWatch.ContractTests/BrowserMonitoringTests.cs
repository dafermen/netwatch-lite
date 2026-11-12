using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.AspNetCore.Builder;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Hosting.Server;
using Microsoft.AspNetCore.Hosting.Server.Features;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Logging;
using Microsoft.Playwright;
using NetWatch.Models;
using NetWatch.Services;

namespace NetWatch.ContractTests;

public sealed class BrowserMonitoringTests
{
    [Theory]
    [InlineData("blocked","NavigationBlocked")]
    [InlineData("blocked-chain","NavigationBlocked")]
    [InlineData("missing","ValidationFailed")]
    [InlineData("slow","TimedOut")]
    [InlineData("windows-plain","AuthenticationRequired")]
    public async Task ReadySession_RejectsRedirectsContentErrorsAndDeadlines(string mode,string expected)
    {
        await using var site=await SyntheticSite.StartAsync();
        await using var runtime=new TestRuntime();
        using var root=new NetWatchApplicationFactory();
        await using var factory=root.WithWebHostBuilder(builder=>builder.ConfigureServices(services=>
        {services.RemoveAll<IBrowserRuntime>(); services.AddSingleton<IBrowserRuntime>(runtime);}));
        using var client=factory.CreateClient();
        var check=new DeviceCheck {Type="browser",Url=site.Url+"/app?bldg=LAB",TimeoutMs=2000,ExpectedText="READY",AuthenticationOrigins=[site.LoginUrl]};
        (await client.PostAsJsonAsync("/api/config",new MonitorConfiguration {Devices=[new() {Name="Boundary",Ip="127.0.0.1",Checks=[check]}]})).EnsureSuccessStatusCode();
        var snapshot=await factory.Services.GetRequiredService<JsonDeviceRepository>().GetMonitoringInventoryAsync();
        var service=factory.Services.GetRequiredService<BrowserCheckService>();
        var action=new BrowserSessionRequest(snapshot.ProfileId,snapshot.Revision,snapshot.Keys[0],0,"open");
        await service.SessionAsync(action,CancellationToken.None);
        var page=Assert.Single(runtime.Contexts).Pages.Single();
        await page.GetByRole(AriaRole.Button,new() {Name="Synthetic sign in"}).ClickAsync();
        await page.WaitForURLAsync(check.Url!);
        Assert.Contains("Success",JsonSerializer.Serialize(await service.SessionAsync(action with {Action="ready"},CancellationToken.None)));
        site.Mode=mode;
        var started=System.Diagnostics.Stopwatch.StartNew();
        var result=await service.CheckAsync(snapshot.Keys[0],0,check,CancellationToken.None);
        Assert.Equal(expected,result.Status); Assert.False(result.IsAvailable); Assert.Equal(1,result.Attempts);
        Assert.Equal(0,site.UntrustedRequests);
        Assert.InRange(started.ElapsedMilliseconds,0,10000);
        Assert.DoesNotContain("SYNTHETIC_COOKIE_SECRET",JsonSerializer.Serialize(result));
    }

    [Fact]
    public async Task SessionLimitIdleExpiryAndCancellation_CloseOnlyDedicatedContexts()
    {
        await using var site=await SyntheticSite.StartAsync();
        await using var runtime=new TestRuntime(); var clock=new BrowserClock();
        using var root=new NetWatchApplicationFactory();
        await using var factory=root.WithWebHostBuilder(builder=>builder.ConfigureServices(services=>
        {
            services.RemoveAll<IBrowserRuntime>(); services.AddSingleton<IBrowserRuntime>(runtime);
            services.AddSingleton(sp=>new BrowserCheckService(sp.GetRequiredService<JsonDeviceRepository>(),runtime,clock));
        }));
        using var client=factory.CreateClient();
        var check=new DeviceCheck {Type="browser",Url=site.Url+"/app?bldg=LAB",TimeoutMs=2000,AuthenticationOrigins=[site.LoginUrl]};
        (await client.PostAsJsonAsync("/api/config",new MonitorConfiguration {Devices=Enumerable.Range(0,5).Select(i=>new Device {Name="Isolated "+i,Ip="127.0.0.1",Checks=[check]}).ToList()})).EnsureSuccessStatusCode();
        var snapshot=await factory.Services.GetRequiredService<JsonDeviceRepository>().GetMonitoringInventoryAsync();
        var service=factory.Services.GetRequiredService<BrowserCheckService>();
        BrowserSessionRequest Action(int index,string action)=>new(snapshot.ProfileId,snapshot.Revision,snapshot.Keys[index],0,action);
        for(var i=0;i<4;i++) await service.SessionAsync(Action(i,"open"),CancellationToken.None);
        Assert.Contains("SessionLimit",JsonSerializer.Serialize(await service.SessionAsync(Action(4,"open"),CancellationToken.None)));
        Assert.Equal(4,runtime.Contexts.Count);
        clock.Now+=TimeSpan.FromMinutes(61);
        Assert.Contains("false",JsonSerializer.Serialize(await service.SessionAsync(Action(0,"status"),CancellationToken.None)));
        Assert.All(runtime.Contexts,context=>Assert.Empty(context.Pages));
        await service.SessionAsync(Action(0,"open"),CancellationToken.None);
        var context=runtime.Contexts.Last();var page=context.Pages.Single();
        await page.GetByRole(AriaRole.Button,new() {Name="Synthetic sign in"}).ClickAsync(); await page.WaitForURLAsync(check.Url!);
        await service.SessionAsync(Action(0,"ready"),CancellationToken.None);
        Assert.Equal("AuthenticationRequired",(await service.CheckAsync(snapshot.Keys[1],0,check,CancellationToken.None)).Status);
        site.Mode="slow";
        using var cancellation=new CancellationTokenSource(100);
        await Assert.ThrowsAnyAsync<OperationCanceledException>(()=>service.CheckAsync(snapshot.Keys[0],0,check,cancellation.Token));
        Assert.Empty(context.Pages);
        Assert.Equal("AuthenticationRequired",(await service.CheckAsync(snapshot.Keys[0],0,check,CancellationToken.None)).Status);
        site.Mode="ok";
        await service.SessionAsync(Action(0,"open"),CancellationToken.None);
        page=runtime.Contexts.Last().Pages.Single();
        await page.GetByRole(AriaRole.Button,new() {Name="Synthetic sign in"}).ClickAsync(); await page.WaitForURLAsync(check.Url!);
        await service.SessionAsync(Action(0,"ready"),CancellationToken.None);
        for(var i=0;i<15;i++) {clock.Now+=TimeSpan.FromMinutes(30);Assert.True((await service.CheckAsync(snapshot.Keys[0],0,check,CancellationToken.None)).IsAvailable);}
        clock.Now+=TimeSpan.FromMinutes(31);
        Assert.Equal("AuthenticationRequired",(await service.CheckAsync(snapshot.Keys[0],0,check,CancellationToken.None)).Status);
    }

    [Theory]
    [InlineData("json")]
    [InlineData("sqlite")]
    public async Task ManualSignIn_ExpiryFailuresPrivacyAndSessionIsolation(string provider)
    {
        await using var site=await SyntheticSite.StartAsync();
        await using var runtime=new TestRuntime();
        using var root=new NetWatchApplicationFactory(null,provider);
        await using var factory=root.WithWebHostBuilder(builder=>builder.ConfigureServices(services=>
        { services.RemoveAll<IBrowserRuntime>(); services.AddSingleton<IBrowserRuntime>(runtime); }));
        using var client=factory.CreateClient();
        var check=new DeviceCheck { Type="browser",Url=site.Url+"/app?bldg=LAB",TimeoutMs=5000,AuthenticationOrigins=[site.LoginUrl] };
        (await client.PostAsJsonAsync("/api/config",new MonitorConfiguration { Devices=[new() {Name="Synthetic portal",Ip="127.0.0.1",Checks=[check]}] })).EnsureSuccessStatusCode();
        var inventory=await factory.Services.GetRequiredService<JsonDeviceRepository>().GetMonitoringInventoryAsync();
        var service=factory.Services.GetRequiredService<BrowserCheckService>();
        BrowserSessionRequest Action(string action)=>new(inventory.ProfileId,inventory.Revision,inventory.Keys[0],0,action);
        async Task<CheckResult> Run()=>await service.CheckAsync(inventory.Keys[0],0,check,CancellationToken.None);

        Assert.Equal("AuthenticationRequired",(await Run()).Status);
        Assert.Empty(runtime.Contexts);
        await service.SessionAsync(Action("open"),CancellationToken.None);
        var context=Assert.Single(runtime.Contexts);
        var page=Assert.Single(context.Pages);
        Assert.StartsWith(site.LoginUrl,page.Url);
        var before=site.Requests;
        Assert.Equal("AuthenticationRequired",(await Run()).Status);
        Assert.Equal(before,site.Requests); // Never interrupt a manual login/MFA step.
        Assert.Contains("AuthenticationRequired",JsonSerializer.Serialize(await service.SessionAsync(Action("ready"),CancellationToken.None)));
        await page.GetByRole(AriaRole.Button,new() {Name="Synthetic sign in"}).ClickAsync();
        await page.WaitForURLAsync(site.Url+"/app?bldg=LAB");
        Assert.Contains("Success",JsonSerializer.Serialize(await service.SessionAsync(Action("ready"),CancellationToken.None)));
        Assert.True((await Run()).IsAvailable);
        var changedQuery=site.Url+"/app?bldg=OTHER";
        await page.GotoAsync(changedQuery);
        Assert.Contains("UnexpectedDestination",JsonSerializer.Serialize(await service.SessionAsync(Action("ready"),CancellationToken.None)));
        await page.GotoAsync(check.Url!);
        await service.SessionAsync(Action("ready"),CancellationToken.None);

        site.Mode="down";
        var down=await Run(); Assert.Equal("Unavailable",down.Status); Assert.Equal(503,down.StatusCode);
        site.Mode="windows-error";
        Assert.Equal("AuthenticationRequired",(await Run()).Status);
        site.Mode="ok";
        await page.GotoAsync(check.Url!); await service.SessionAsync(Action("ready"),CancellationToken.None);
        await context.ClearCookiesAsync();
        Assert.Equal("AuthenticationRequired",(await Run()).Status);
        Assert.Equal("AuthenticationRequired",(await Run()).Status);

        var planned=(await (await client.PostAsJsonAsync("/api/monitor/plans",new {profileId=inventory.ProfileId,revision=inventory.Revision,keys=inventory.Keys})).Content.ReadAsStringAsync());
        var plan=JsonNode.Parse(planned)!;
        var stream=await client.GetStringAsync("/api/monitor/stream?selection="+plan["token"]!.GetValue<string>());
        Assert.Contains("AuthenticationRequired",stream); Assert.DoesNotContain("\"offlineDevices\":1",stream);
        var history=await client.GetStringAsync("/api/history");
        Assert.Contains("AuthenticationRequired",history); Assert.DoesNotContain("SYNTHETIC_COOKIE_SECRET",history); Assert.DoesNotContain("bldg=LAB",history);
        Assert.DoesNotContain("SYNTHETIC_COOKIE_SECRET",await client.GetStringAsync("/api/config/export"));
        if (provider=="sqlite")
        {
            var report=JsonNode.Parse(await client.GetStringAsync("/api/reports/query?status=AuthenticationRequired"))!;
            Assert.DoesNotContain("SYNTHETIC_COOKIE_SECRET",report.ToJsonString());
        }
        await service.SessionAsync(Action("close"),CancellationToken.None);
        Assert.Equal("AuthenticationRequired",(await Run()).Status);
        await Assert.ThrowsAsync<MonitorScopeConflictException>(()=>service.SessionAsync(Action("open") with {Revision="stale"},CancellationToken.None));
        await Assert.ThrowsAsync<InvalidDataException>(()=>service.SessionAsync(Action("open") with {CheckIndex=1},CancellationToken.None));
    }

    [Theory]
    [InlineData("json")]
    [InlineData("sqlite")]
    public async Task BrowserDefinitions_SurviveCrudAndRejectUnsafeValues(string provider)
    {
        using var factory=new NetWatchApplicationFactory(null,provider);
        using var client=factory.CreateClient();
        var config=new MonitorConfiguration {Devices=[new() {Name="Portal",Ip="example.invalid",Checks=[new() {Type="BROWSER",Url="https://app.example.invalid/?bldg=LAB",AuthenticationOrigins=["https://sso.example.invalid/"]}]}]};
        (await client.PostAsJsonAsync("/api/config",config)).EnsureSuccessStatusCode();
        (await client.PostAsync("/api/reload",null)).EnsureSuccessStatusCode();
        var saved=(await client.GetFromJsonAsync<MonitorConfiguration>("/api/config"))!;
        Assert.Equal("browser",saved.Devices[0].Checks[0].Type);
        Assert.Equal("https://sso.example.invalid",Assert.Single(saved.Devices[0].Checks[0].AuthenticationOrigins!));
        (await client.PostAsJsonAsync("/api/config/devices/0",saved.Devices[0])).EnsureSuccessStatusCode();
        using(var import=new MultipartFormDataContent())
        {
            import.Add(new StringContent(await client.GetStringAsync("/api/config/export")),"configFile","browser.json");
            (await client.PostAsync("/api/config/import",import)).EnsureSuccessStatusCode();
        }
        (await client.PostAsJsonAsync("/api/regions",new {name="Browser copy",copyFromActive=true})).EnsureSuccessStatusCode();
        Assert.Contains("authenticationOrigins",await client.GetStringAsync("/api/config/export"));
        foreach(var check in new DeviceCheck[] {
            new() {Type="browser",Url="http://remote.example.invalid/"},
            new() {Type="browser",Url="https://app.example.invalid/",ExpectedStatusCode=302},
            new() {Type="browser",Url="https://app.example.invalid/",TimeoutMs=500},
            new() {Type="browser",Url="https://app.example.invalid/",AuthenticationOrigins=["https://sso.example.invalid/path"]},
            new() {Type="http",Url="https://app.example.invalid/",AuthenticationOrigins=["https://sso.example.invalid"]} })
        {
            var bad=new MonitorConfiguration {Devices=[new() {Name="Bad",Ip="example.invalid",Checks=[check]}]};
            Assert.Equal(HttpStatusCode.BadRequest,(await client.PostAsJsonAsync("/api/config",bad)).StatusCode);
        }
        Assert.Equal(HttpStatusCode.Forbidden,(await client.PostAsJsonAsync("/api/browser-sessions",new BrowserSessionRequest(null,null,null,0,"open"))).StatusCode);
        (await client.PostAsync("/api/monitor/run",null)).EnsureSuccessStatusCode();
        Assert.Contains("NotEvaluated",await client.GetStringAsync("/api/history"));
        (await client.PostAsJsonAsync("/api/config",new MonitorConfiguration {Devices=[]})).EnsureSuccessStatusCode();
        Assert.Empty((await client.GetFromJsonAsync<MonitorConfiguration>("/api/config"))!.Devices);
    }

    private sealed class TestRuntime : IBrowserRuntime
    {
        private readonly BrowserRuntime _runtime=new(headless:true);
        public List<IBrowserContext> Contexts {get;}=[];
        public async Task<IBrowserContext> CreateContextAsync(CancellationToken token) {var context=await _runtime.CreateContextAsync(token); Contexts.Add(context); return context;}
        public ValueTask DisposeAsync()=>_runtime.DisposeAsync();
    }

    private sealed class BrowserClock : TimeProvider
    {public DateTimeOffset Now {get;set;}=DateTimeOffset.UtcNow; public override DateTimeOffset GetUtcNow()=>Now;}

    private sealed class SyntheticSite : IAsyncDisposable
    {
        private readonly WebApplication _app;
        private readonly WebApplication _login;
        private readonly WebApplication _untrusted;
        public string Url {get; private set;}="";
        public string LoginUrl {get; private set;}="";
        public string Mode {get;set;}="ok";
        public int Requests;
        public int UntrustedRequests;
        private string UntrustedUrl="";
        private SyntheticSite(WebApplication app,WebApplication login,WebApplication untrusted) { _app=app; _login=login; _untrusted=untrusted; }
        private static WebApplication App()
        {var builder=WebApplication.CreateBuilder(); builder.Logging.ClearProviders(); builder.WebHost.UseUrls("http://127.0.0.1:0"); return builder.Build();}
        public static async Task<SyntheticSite> StartAsync()
        {
            var site=new SyntheticSite(App(),App(),App());
            site._untrusted.MapGet("/untrusted",()=>{Interlocked.Increment(ref site.UntrustedRequests);return Results.Content("Must never be requested");});
            site._login.MapGet("/bridge",()=>Results.Redirect(site.UntrustedUrl+"/untrusted"));
            site._login.MapGet("/signin",()=>Results.Content($"<button onclick=\"location.href='{site.Url}/complete'\">Synthetic sign in</button>","text/html"));
            site._app.MapGet("/complete",(HttpContext context)=> {context.Response.Cookies.Append("synthetic","SYNTHETIC_COOKIE_SECRET",new() {HttpOnly=true,SameSite=SameSiteMode.Lax}); return Results.Redirect("/app?bldg=LAB");});
            site._app.MapGet("/app",async Task<IResult> (HttpContext context)=>
            {
                Interlocked.Increment(ref site.Requests);
                if (!context.Request.Cookies.ContainsKey("synthetic")) return Results.Redirect(site.LoginUrl+"/signin");
                if (site.Mode=="slow") await Task.Delay(10000,context.RequestAborted);
                if (site.Mode=="blocked") return Results.Redirect(site.UntrustedUrl+"/untrusted");
                if (site.Mode=="blocked-chain") return Results.Redirect(site.LoginUrl+"/bridge");
                if (site.Mode=="down") return Results.Content("Unavailable","text/html",statusCode:503);
                return Results.Content(site.Mode switch {"windows-error"=>"AADSTS50058 Windows authentication failed","windows-plain"=>"Error authenticating with Windows","missing"=>"Maintenance",_=>"<h1>Synthetic application READY</h1>"},"text/html");
            });
            await site._app.StartAsync(); await site._login.StartAsync(); await site._untrusted.StartAsync();
            site.Url=site._app.Services.GetRequiredService<IServer>().Features.Get<IServerAddressesFeature>()!.Addresses.Single();
            site.LoginUrl=site._login.Services.GetRequiredService<IServer>().Features.Get<IServerAddressesFeature>()!.Addresses.Single();
            site.UntrustedUrl=site._untrusted.Services.GetRequiredService<IServer>().Features.Get<IServerAddressesFeature>()!.Addresses.Single();
            return site;
        }
        public async ValueTask DisposeAsync() {await _app.DisposeAsync(); await _login.DisposeAsync(); await _untrusted.DisposeAsync();}
    }
}
