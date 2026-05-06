using NetWatch.Models;

namespace NetWatch.Services;

/// <summary>
/// Coordinates full monitor executions, caches the latest payload, and prevents overlapping runs.
/// </summary>
public sealed class MonitorExecutionService
{
    private readonly JsonDeviceRepository _deviceRepository;
    private readonly NetworkMonitorService _monitorService;
    private readonly SemaphoreSlim _executionLock = new(1, 1);
    private MonitorResponse? _cachedResponse;

    /// <summary>
    /// Initializes the execution coordinator.
    /// </summary>
    /// <param name="deviceRepository">Repository that provides settings used in the response.</param>
    /// <param name="monitorService">Service that performs the actual ping and TCP checks.</param>
    public MonitorExecutionService(
        JsonDeviceRepository deviceRepository,
        NetworkMonitorService monitorService)
    {
        _deviceRepository = deviceRepository;
        _monitorService = monitorService;
    }

    /// <summary>
    /// Returns the latest cached monitor response, running one full execution when no cache exists yet.
    /// </summary>
    /// <param name="cancellationToken">Token used to cancel the initial execution when the cache is empty.</param>
    /// <returns>The cached or newly created monitor response.</returns>
    public async Task<MonitorResponse> GetCachedResultsAsync(CancellationToken cancellationToken = default)
    {
        if (_cachedResponse is not null)
        {
            return _cachedResponse;
        }

        return await RunFullCheckAsync(cancellationToken);
    }

    /// <summary>
    /// Clears cached monitor results after configuration changes.
    /// </summary>
    public void InvalidateCache()
    {
        _cachedResponse = null;
    }

    /// <summary>
    /// Runs a full monitor execution, waiting for any existing execution to finish first.
    /// </summary>
    /// <param name="cancellationToken">Token used to cancel waiting or execution.</param>
    /// <returns>A fresh monitor response that also replaces the cached response.</returns>
    public async Task<MonitorResponse> RunFullCheckAsync(CancellationToken cancellationToken = default)
    {
        await _executionLock.WaitAsync(cancellationToken);
        return await ExecuteFullCheckAsync(cancellationToken);
    }

    /// <summary>
    /// Attempts to start a full monitor execution immediately without waiting behind another execution.
    /// </summary>
    /// <param name="cancellationToken">Token used to cancel lock acquisition or execution.</param>
    /// <returns>A fresh monitor response, or null when another execution is already running.</returns>
    public async Task<MonitorResponse?> TryRunFullCheckAsync(CancellationToken cancellationToken = default)
    {
        if (!await _executionLock.WaitAsync(0, cancellationToken))
        {
            return null;
        }

        return await ExecuteFullCheckAsync(cancellationToken);
    }

    /// <summary>
    /// Performs the locked execution flow and updates the in-memory cache.
    /// </summary>
    /// <param name="cancellationToken">Token used by the network checks.</param>
    /// <returns>A completed monitor response.</returns>
    private async Task<MonitorResponse> ExecuteFullCheckAsync(CancellationToken cancellationToken)
    {
        try
        {
            var configuration = await _deviceRepository.GetConfigurationAsync();
            var results = await _monitorService.CheckAllDevicesAsync(cancellationToken);
            var response = CreateResponse(configuration.Settings, results, "Completed");

            _cachedResponse = response;
            return response;
        }
        finally
        {
            _executionLock.Release();
        }
    }

    /// <summary>
    /// Builds the API payload from settings and flat device results.
    /// </summary>
    /// <param name="settings">Settings used by the latest execution.</param>
    /// <param name="results">Flat device results produced by the monitor service.</param>
    /// <param name="executionStatus">Human-readable execution status to include in the response.</param>
    /// <returns>A complete monitor response for the dashboard.</returns>
    private static MonitorResponse CreateResponse(
        MonitorSettings settings,
        IReadOnlyList<DeviceResult> results,
        string executionStatus)
    {
        var now = DateTimeOffset.Now;

        return new MonitorResponse
        {
            LastCheck = now,
            LastExecutionTime = now,
            ExecutionStatus = executionStatus,
            Settings = settings,
            Summary = CreateDashboardSummary(results),
            Categories = CreateCategoryResults(results),
            Results = results
        };
    }

    /// <summary>
    /// Groups flat device results into category sections for the dashboard.
    /// </summary>
    /// <param name="results">Flat device results from the latest execution.</param>
    /// <returns>Category results sorted by category name and device name.</returns>
    private static IReadOnlyList<CategoryResult> CreateCategoryResults(IReadOnlyList<DeviceResult> results)
    {
        return results
            .GroupBy(result => result.Category)
            .OrderBy(group => group.Key)
            .Select(group =>
            {
                var devices = group
                    .OrderBy(result => result.Name)
                    .ToList();

                return new CategoryResult
                {
                    Name = group.Key,
                    TotalDevices = devices.Count,
                    OnlineDevices = devices.Count(device => device.IsOnline),
                    OfflineDevices = devices.Count(device => !device.IsOnline),
                    Devices = devices
                };
            })
            .ToList();
    }

    /// <summary>
    /// Calculates top dashboard metrics from the latest device results.
    /// </summary>
    /// <param name="results">Device results to summarize.</param>
    /// <returns>Totals for devices, health states, and availability percentage.</returns>
    private static DashboardSummary CreateDashboardSummary(IReadOnlyCollection<DeviceResult> results)
    {
        var totalDevices = results.Count;
        var healthyDevices = results.Count(device => device.Status == DeviceStatus.Healthy);
        var degradedDevices = results.Count(device => device.Status == DeviceStatus.Degraded);
        var offlineDevices = results.Count(device => device.Status == DeviceStatus.Down);
        var onlineDevices = results.Count(device => device.IsOnline);
        var availabilityPercentage = totalDevices == 0
            ? 0
            : Math.Round((double)healthyDevices / totalDevices * 100, 1);

        return new DashboardSummary
        {
            TotalDevices = totalDevices,
            HealthyDevices = healthyDevices,
            OnlineDevices = onlineDevices,
            OfflineDevices = offlineDevices,
            DegradedDevices = degradedDevices,
            AvailabilityPercentage = availabilityPercentage
        };
    }
}
