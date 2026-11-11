namespace NetWatch.Services;

internal sealed class ConfigurationConflictException() : InvalidOperationException(
    "The active support group changed. Reload Configuration before saving this draft.");
