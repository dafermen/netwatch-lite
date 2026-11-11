using System.Text.Json.Nodes;

namespace NetWatch.ContractTests;

public sealed class ThemeConfigurationTests
{
    [Fact]
    public async Task DefaultTheme_UsesNeutralConfigurationHeaders()
    {
        using var factory = new NetWatchApplicationFactory();
        using var client = factory.CreateClient();
        var configuration = JsonNode.Parse(await client.GetStringAsync("/api/themes"))!;
        var theme = configuration["themes"]!.AsArray().Single(item => item!["id"]!.GetValue<string>() == "default")!;

        Assert.Equal("#f1f3f5", theme["colors"]!["configFacilityHeader"]!.GetValue<string>());
        Assert.Equal("#212529", theme["colors"]!["configFacilityText"]!.GetValue<string>());
        Assert.Equal("#f8f9fa", theme["colors"]!["configCategoryHeader"]!.GetValue<string>());
        Assert.Equal("#495057", theme["colors"]!["configCategoryText"]!.GetValue<string>());
    }

    [Fact]
    public async Task LegacyDefault_UpdatesWithoutChangingCustomPaletteOrInventory()
    {
        using var factory = new NetWatchApplicationFactory();
        using var client = factory.CreateClient();
        var inventory = await client.GetStringAsync("/api/config");
        var configuration = JsonNode.Parse(await client.GetStringAsync("/api/themes"))!;
        var theme = configuration["themes"]!.AsArray().Single(item => item!["id"]!.GetValue<string>() == "default")!;
        theme["colors"]!["configFacilityHeader"] = "#111827";
        theme["colors"]!["configFacilityText"] = "#e5e7eb";
        theme["colors"]!["configCategoryHeader"] = "#eef2f7";
        theme["colors"]!["configCategoryText"] = "#334155";
        var custom = theme.DeepClone();
        custom["id"] = "custom-legacy";
        custom["name"] = "Custom legacy palette";
        custom["builtIn"] = false;
        configuration["themes"]!.AsArray().Add(custom.DeepClone());
        configuration["activeThemeId"] = "custom-legacy";
        var path = Path.Combine(factory.RuntimeDataRoot, "themes.json");
        await File.WriteAllTextAsync(path, configuration.ToJsonString());

        var reloaded = JsonNode.Parse(await client.GetStringAsync("/api/themes"))!;
        Assert.Equal("custom-legacy", reloaded["activeThemeId"]!.GetValue<string>());
        Assert.True(JsonNode.DeepEquals(custom, reloaded["themes"]!.AsArray().Single(item => item!["id"]!.GetValue<string>() == "custom-legacy")));
        Assert.Equal("#f1f3f5", reloaded["themes"]!.AsArray().Single(item => item!["id"]!.GetValue<string>() == "default")!["colors"]!["configFacilityHeader"]!.GetValue<string>());
        var persisted = JsonNode.Parse(await File.ReadAllTextAsync(path))!;
        Assert.True(JsonNode.DeepEquals(custom, persisted["themes"]!.AsArray().Single(item => item!["id"]!.GetValue<string>() == "custom-legacy")));
        Assert.Equal(inventory, await client.GetStringAsync("/api/config"));
    }
}
