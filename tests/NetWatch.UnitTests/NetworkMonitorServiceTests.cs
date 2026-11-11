using NetWatch.Services;

namespace NetWatch.UnitTests;

public sealed class NetworkMonitorServiceTests
{
    [Theory]
    [InlineData("PingOnly")]
    [InlineData("pingonly")]
    [InlineData("ping")]
    [InlineData("ping-only")]
    [InlineData("pingOnly")]
    public void NormalizeCheckMode_ReturnsPingOnly_ForSupportedAliases(string input)
    {
        var result = NetworkMonitorService.NormalizeCheckMode(input);

        Assert.Equal(NetworkMonitorService.PingOnlyCheckMode, result);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("Full")]
    [InlineData("unknown")]
    public void NormalizeCheckMode_ReturnsFull_ForOtherValues(string? input)
    {
        var result = NetworkMonitorService.NormalizeCheckMode(input);

        Assert.Equal(NetworkMonitorService.FullCheckMode, result);
    }

    [Fact]
    public void IsPingOnlyMode_IsCaseInsensitive()
    {
        Assert.True(NetworkMonitorService.IsPingOnlyMode("PING-ONLY"));
        Assert.False(NetworkMonitorService.IsPingOnlyMode("FULL"));
    }
}

