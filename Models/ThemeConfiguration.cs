using System.Text.Json.Serialization;

namespace NetWatch.Models;

/// <summary>
/// Root object of themes.json. Contains the active theme and all available theme templates.
/// </summary>
public sealed class ThemeConfiguration
{
    /// <summary>
    /// Identifier of the theme currently applied by the UI.
    /// </summary>
    [JsonPropertyName("activeThemeId")]
    public string ActiveThemeId { get; init; } = "default";

    /// <summary>
    /// Theme templates available to operators.
    /// </summary>
    [JsonPropertyName("themes")]
    public List<ThemeDefinition> Themes { get; init; } = [];
}
