using System.Text.Json;
using NetWatch.Models;

namespace NetWatch.UnitTests;

public sealed class DeviceTypeDefaultTests
{
    [Fact]
    public void LegacyJson_ProvidesAllFiveOriginalClassifications()
    {
        var configuration = JsonSerializer.Deserialize<MonitorConfiguration>("{\"devices\":[]}")!;
        Assert.Equal(new[] { "unspecified", "workstation", "server", "network", "other" }, configuration.DeviceTypes.Select(type => type.Id));
        Assert.Equal("Workstation", configuration.DeviceTypes.Single(type => type.Id == "workstation").Name);
    }

    [Fact]
    public void DefaultCatalogs_DoNotShareMutableLists()
    {
        var first = new MonitorConfiguration();
        var second = new MonitorConfiguration();
        first.DeviceTypes.Clear();
        Assert.Equal(5, second.DeviceTypes.Count);
        Assert.Equal(5, DeviceTypeDefinition.CreateDefaults().Count);
    }

    [Fact]
    public void DefaultCatalog_HasUniqueStableKeysAndNames()
    {
        var catalog = DeviceTypeDefinition.CreateDefaults();
        Assert.Equal(catalog.Count, catalog.Select(type => type.Id).Distinct(StringComparer.OrdinalIgnoreCase).Count());
        Assert.Equal(catalog.Count, catalog.Select(type => type.Name).Distinct(StringComparer.OrdinalIgnoreCase).Count());
    }
}
