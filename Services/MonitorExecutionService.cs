using NetWatch.Models;

namespace NetWatch.Services;

/// <summary>
/// Coordinates full monitor executions and prevents overlapping runs.
/// </summary>
public sealed class MonitorExecutionService
{
    private readonly JsonDeviceRepository _deviceRepository;
    private readonly NetworkMonitorService _monitorService;
    private readonly JsonMonitorHistoryRepository _historyRepository;
    private readonly SemaphoreSlim _executionLock = new(1, 1);

    /// <summary>
    /// Initializes the execution coordinator.
    /// </summary>
    /// <param name="deviceRepository">Repository that provides settings used in the response.</param>
    /// <param name="monitorService">Service that performs the actual ping and TCP checks.</param>
    /// <param name="historyRepository">Repository that stores completed monitoring executions.</param>
    public MonitorExecutionService(
        JsonDeviceRepository deviceRepository,
        NetworkMonitorService monitorService,
        JsonMonitorHistoryRepository historyRepository)
    {
        _deviceRepository = deviceRepository;
        _monitorService = monitorService;
        _historyRepository = historyRepository;
    }

    /// <summary>
    /// Runs a full monitor execution, waiting for any existing execution to finish first.
    /// </summary>
    /// <param name="checkMode">Execution mode: Full or PingOnly.</param>
    /// <param name="cancellationToken">Token used to cancel waiting or execution.</param>
    /// <returns>A fresh monitor response.</returns>
    public async Task<MonitorResponse> RunFullCheckAsync(string checkMode = NetworkMonitorService.FullCheckMode, CancellationToken cancellationToken = default)
    {
        await _executionLock.WaitAsync(cancellationToken);
        return await ExecuteFullCheckAsync(checkMode, cancellationToken);
    }

    /// <summary>
    /// Attempts to start a full monitor execution immediately without waiting behind another execution.
    /// </summary>
    /// <param name="checkMode">Execution mode: Full or PingOnly.</param>
    /// <param name="cancellationToken">Token used to cancel lock acquisition or execution.</param>
    /// <returns>A fresh monitor response, or null when another execution is already running.</returns>
    public async Task<MonitorResponse?> TryRunFullCheckAsync(string checkMode = NetworkMonitorService.FullCheckMode, CancellationToken cancellationToken = default)
    {
        if (!await _executionLock.WaitAsync(0, cancellationToken))
        {
            return null;
        }

        return await ExecuteFullCheckAsync(checkMode, cancellationToken);
    }

    /// <summary>
    /// Attempts to stream a full monitor execution, sending each device result as it completes.
    /// </summary>
    /// <param name="writeEventAsync">Callback used to send stream events to the client.</param>
    /// <param name="facilityName">Optional facility name used to limit the execution to one site.</param>
    /// <param name="categoryName">Optional category name used to limit the execution to one group.</param>
    /// <param name="deviceName">Optional device name used to limit the execution to one device.</param>
    /// <param name="deviceIps">Optional device IP list used to limit the execution to selected devices.</param>
    /// <param name="checkMode">Execution mode: Full or PingOnly.</param>
    /// <param name="cancellationToken">Token used to cancel waiting, checks, or writes.</param>
    /// <returns>True when streaming started; false when another execution is already running.</returns>
    public async Task<bool> TryStreamFullCheckAsync(
        Func<MonitorStreamEvent, CancellationToken, Task> writeEventAsync,
        string? facilityName = null,
        string? categoryName = null,
        string? deviceName = null,
        IReadOnlyCollection<string>? deviceIps = null,
        string checkMode = NetworkMonitorService.FullCheckMode,
        CancellationToken cancellationToken = default)
    {
        if (!await _executionLock.WaitAsync(0, cancellationToken))
        {
            return false;
        }

        try
        {
            var loadedConfiguration = await _deviceRepository.GetConfigurationAsync();
            var configuration = FilterConfiguration(loadedConfiguration, facilityName, categoryName, deviceName, deviceIps);
            var normalizedCheckMode = NetworkMonitorService.NormalizeCheckMode(checkMode);
            var startedAt = DateTimeOffset.Now;
            var settings = configuration.Settings;
            var totalDevices = configuration.Devices.Count(device => device.Enabled);
            var results = new List<DeviceResult>();

            await writeEventAsync(new MonitorStreamEvent
            {
                Type = "started",
                TotalDevices = totalDevices,
                CompletedDevices = 0,
                Settings = settings,
                Summary = CreateDashboardSummary(results, totalDevices),
                Timestamp = DateTimeOffset.Now,
                ExecutionStatus = "Running",
                CheckMode = normalizedCheckMode
            }, cancellationToken);

            await foreach (var result in _monitorService.CheckDevicesAsCompletedAsync(configuration, normalizedCheckMode, cancellationToken))
            {
                results.Add(result);

                await writeEventAsync(new MonitorStreamEvent
                {
                    Type = "result",
                    TotalDevices = totalDevices,
                    CompletedDevices = results.Count,
                    Settings = settings,
                    Result = result,
                    Summary = CreateDashboardSummary(results, totalDevices),
                    Timestamp = DateTimeOffset.Now,
                    ExecutionStatus = "Running",
                    CheckMode = normalizedCheckMode
                }, cancellationToken);
            }

            var completedAt = DateTimeOffset.Now;
            var response = CreateResponse(settings, results, "Completed", normalizedCheckMode, completedAt);
            await _historyRepository.AppendAsync(
                response,
                CreateHistoryScope(configuration, facilityName, categoryName, deviceName, deviceIps),
                startedAt,
                completedAt,
                cancellationToken);

            await writeEventAsync(new MonitorStreamEvent
            {
                Type = "completed",
                TotalDevices = totalDevices,
                CompletedDevices = results.Count,
                Settings = settings,
                Summary = response.Summary,
                Categories = response.Categories,
                Results = response.Results,
                Timestamp = completedAt,
                ExecutionStatus = "Completed",
                CheckMode = normalizedCheckMode
            }, cancellationToken);

            return true;
        }
        finally
        {
            _executionLock.Release();
        }
    }

    /// <summary>
    /// Performs the locked execution flow.
    /// </summary>
    /// <param name="checkMode">Execution mode: Full or PingOnly.</param>
    /// <param name="cancellationToken">Token used by the network checks.</param>
    /// <returns>A completed monitor response.</returns>
    private async Task<MonitorResponse> ExecuteFullCheckAsync(string checkMode, CancellationToken cancellationToken)
    {
        try
        {
            var startedAt = DateTimeOffset.Now;
            var configuration = await _deviceRepository.GetConfigurationAsync();
            var normalizedCheckMode = NetworkMonitorService.NormalizeCheckMode(checkMode);
            var results = await _monitorService.CheckAllDevicesAsync(normalizedCheckMode, cancellationToken);
            var completedAt = DateTimeOffset.Now;
            var response = CreateResponse(configuration.Settings, results, "Completed", normalizedCheckMode, completedAt);

            await _historyRepository.AppendAsync(
                response,
                CreateHistoryScope(configuration),
                startedAt,
                completedAt,
                cancellationToken);

            return response;
        }
        finally
        {
            _executionLock.Release();
        }
    }

    /// <summary>
    /// Creates a configuration snapshot limited to the requested facility, category, and/or device.
    /// </summary>
    /// <param name="configuration">Loaded monitor configuration.</param>
    /// <param name="facilityName">Optional facility name to execute.</param>
    /// <param name="categoryName">Optional category name to execute.</param>
    /// <param name="deviceName">Optional device name to execute.</param>
    /// <param name="deviceIps">Optional device IP list used to limit the execution to selected devices.</param>
    /// <returns>The original configuration, or a category-filtered configuration snapshot.</returns>
    private static MonitorConfiguration FilterConfiguration(
        MonitorConfiguration configuration,
        string? facilityName,
        string? categoryName,
        string? deviceName,
        IReadOnlyCollection<string>? deviceIps)
    {
        var requestedIps = deviceIps?
            .Where(ip => !string.IsNullOrWhiteSpace(ip))
            .ToHashSet(StringComparer.OrdinalIgnoreCase) ?? [];

        if (string.IsNullOrWhiteSpace(facilityName)
            && string.IsNullOrWhiteSpace(categoryName)
            && string.IsNullOrWhiteSpace(deviceName)
            && requestedIps.Count == 0)
        {
            return configuration;
        }

        var devices = configuration.Devices.AsEnumerable();

        if (!string.IsNullOrWhiteSpace(facilityName))
        {
            devices = devices.Where(device =>
                string.Equals(device.Facility, facilityName, StringComparison.OrdinalIgnoreCase));
        }

        if (!string.IsNullOrWhiteSpace(categoryName))
        {
            devices = devices.Where(device =>
                string.Equals(device.Category, categoryName, StringComparison.OrdinalIgnoreCase));
        }

        if (!string.IsNullOrWhiteSpace(deviceName))
        {
            devices = devices.Where(device =>
                string.Equals(device.Name, deviceName, StringComparison.OrdinalIgnoreCase));
        }

        if (requestedIps.Count > 0)
        {
            devices = devices.Where(device => requestedIps.Contains(device.Ip));
        }

        return new MonitorConfiguration
        {
            Settings = configuration.Settings,
            Devices = devices.ToList()
        };
    }

    /// <summary>
    /// Builds the API payload from settings and flat device results.
    /// </summary>
    /// <param name="settings">Settings used by the latest execution.</param>
    /// <param name="results">Flat device results produced by the monitor service.</param>
    /// <param name="executionStatus">Human-readable execution status to include in the response.</param>
    /// <param name="checkMode">Execution mode: Full or PingOnly.</param>
    /// <param name="completedAt">Optional timestamp to use as the response completion time.</param>
    /// <returns>A complete monitor response for the dashboard.</returns>
    private static MonitorResponse CreateResponse(
        MonitorSettings settings,
        IReadOnlyList<DeviceResult> results,
        string executionStatus,
        string checkMode = NetworkMonitorService.FullCheckMode,
        DateTimeOffset? completedAt = null)
    {
        var now = completedAt ?? DateTimeOffset.Now;

        return new MonitorResponse
        {
            LastCheck = now,
            LastExecutionTime = now,
            ExecutionStatus = executionStatus,
            CheckMode = NetworkMonitorService.NormalizeCheckMode(checkMode),
            Settings = settings,
            Summary = CreateDashboardSummary(results),
            Categories = CreateCategoryResults(results),
            Results = results
        };
    }

    private static MonitorHistoryScope CreateHistoryScope(
        MonitorConfiguration configuration,
        string? facilityName = null,
        string? categoryName = null,
        string? deviceName = null,
        IReadOnlyCollection<string>? deviceIps = null)
    {
        var firstDevice = configuration.Devices.FirstOrDefault();

        return new MonitorHistoryScope
        {
            Region = firstDevice?.Region,
            SupportGroup = firstDevice?.SupportGroup,
            Facility = string.IsNullOrWhiteSpace(facilityName) ? null : facilityName,
            Category = string.IsNullOrWhiteSpace(categoryName) ? null : categoryName,
            DeviceName = string.IsNullOrWhiteSpace(deviceName) ? null : deviceName,
            DeviceIps = deviceIps?
                .Where(ip => !string.IsNullOrWhiteSpace(ip))
                .ToList() ?? []
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
        return CreateDashboardSummary(results, results.Count);
    }

    /// <summary>
    /// Calculates dashboard metrics while preserving the total expected device count.
    /// </summary>
    /// <param name="results">Completed device results.</param>
    /// <param name="totalDevices">Total number of devices expected in the execution.</param>
    /// <returns>Totals for devices, health states, and availability percentage.</returns>
    private static DashboardSummary CreateDashboardSummary(
        IReadOnlyCollection<DeviceResult> results,
        int totalDevices)
    {
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
