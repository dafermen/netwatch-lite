using NetWatch.Models;

namespace NetWatch.UnitTests;

public sealed class ModelDefaultTests
{
    [Fact]
    public void IntegrationConfiguration_DefaultsToLocalDisabledIntegrations()
    {
        var configuration = new IntegrationConfiguration();

        Assert.Equal(1, configuration.SchemaVersion);
        Assert.Equal("localJson", configuration.InventorySource.Mode);
        Assert.Equal("config.json", configuration.InventorySource.LocalJsonPath);
        Assert.Equal("GET", configuration.InventorySource.Method);
        Assert.False(configuration.ReportDestination.Enabled);
        Assert.Equal("POST", configuration.ReportDestination.Method);
        Assert.True(configuration.ReportDestination.IncludeSummary);
        Assert.True(configuration.ReportDestination.IncludeRows);
        Assert.Null(configuration.UpdatedAt);
    }
}

