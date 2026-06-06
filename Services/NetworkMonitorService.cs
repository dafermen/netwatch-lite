using System.Net.NetworkInformation;
using System.Net.Sockets;
using System.Runtime.CompilerServices;
using NetWatch.Models;

namespace NetWatch.Services;

/// <summary>
/// Executes asynchronous network checks for enabled devices and computes final device health states.
/// </summary>
public sealed class NetworkMonitorService
{
    private readonly JsonDeviceRepository _deviceRepository;
    private readonly ILogger<NetworkMonitorService> _logger;

    /// <summary>
    /// Initializes a network monitor service with configuration access and diagnostic logging.
    /// </summary>
    /// <param name="deviceRepository">Repository that supplies the current monitor configuration.</param>
    /// <param name="logger">Logger used for debug-level network failure details.</param>
    public NetworkMonitorService(
        JsonDeviceRepository deviceRepository,
        ILogger<NetworkMonitorService> logger)
    {
        _deviceRepository = deviceRepository;
        _logger = logger;
    }

    /// <summary>
    /// Runs all checks for every enabled device using asynchronous parallel execution.
    /// </summary>
    /// <param name="cancellationToken">Token used to cancel queued or in-flight check work.</param>
    /// <returns>One aggregated result per enabled device.</returns>
    public async Task<IReadOnlyList<DeviceResult>> CheckAllDevicesAsync(
        CancellationToken cancellationToken = default)
    {
        var configuration = await _deviceRepository.GetConfigurationAsync();
        var settings = configuration.Settings;
        var enabledDevices = configuration.Devices.Where(device => device.Enabled);
        var maxParallelChecks = Math.Max(1, settings.MaxParallelChecks);

        using var checkLimiter = new SemaphoreSlim(maxParallelChecks, maxParallelChecks);
        var checkTasks = enabledDevices.Select(device =>
            CheckDeviceAsync(device, settings, checkLimiter, cancellationToken));

        return await Task.WhenAll(checkTasks);
    }

    /// <summary>
    /// Runs checks for enabled devices and yields each device result as soon as it completes.
    /// </summary>
    /// <param name="configuration">Configuration snapshot used for this execution.</param>
    /// <param name="cancellationToken">Token used to cancel queued or in-flight check work.</param>
    /// <returns>An async stream of completed device results.</returns>
    public async IAsyncEnumerable<DeviceResult> CheckDevicesAsCompletedAsync(
        MonitorConfiguration configuration,
        [EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        var settings = configuration.Settings;
        var enabledDevices = configuration.Devices
            .Where(device => device.Enabled)
            .ToList();
        var maxParallelChecks = Math.Max(1, settings.MaxParallelChecks);

        using var checkLimiter = new SemaphoreSlim(maxParallelChecks, maxParallelChecks);
        var checkTasks = enabledDevices
            .Select(device => CheckDeviceAsync(device, settings, checkLimiter, cancellationToken))
            .ToList();

        while (checkTasks.Count > 0)
        {
            cancellationToken.ThrowIfCancellationRequested();

            var completedTask = await Task.WhenAny(checkTasks);
            checkTasks.Remove(completedTask);

            yield return await completedTask;
        }
    }

    /// <summary>
    /// Runs every configured check for one device and computes the final aggregated status.
    /// </summary>
    /// <param name="device">Device to check.</param>
    /// <param name="settings">Execution settings such as timeout, retry, and concurrency limit.</param>
    /// <param name="checkLimiter">Shared semaphore limiting total concurrent checks across all devices.</param>
    /// <param name="cancellationToken">Token used to cancel check work.</param>
    /// <returns>A complete device result with ping state, latency, port lists, raw checks, and final status.</returns>
    private async Task<DeviceResult> CheckDeviceAsync(
        Device device,
        MonitorSettings settings,
        SemaphoreSlim checkLimiter,
        CancellationToken cancellationToken)
    {
        var pingTarget = ResolvePingTarget(device);
        var checkTasks = device.Checks.Select(check =>
            RunLimitedCheckAsync(device.Ip, pingTarget, check, settings, checkLimiter, cancellationToken));
        var checkResults = await Task.WhenAll(checkTasks);

        var hasAvailableCheck = checkResults.Any(result => result.IsAvailable);
        var latencyMs = checkResults
            .FirstOrDefault(result => string.Equals(result.Type, "ping", StringComparison.OrdinalIgnoreCase))
            ?.LatencyMs ?? 0;
        var requestedPorts = device.Checks
            .Where(check => string.Equals(check.Type, "tcp", StringComparison.OrdinalIgnoreCase))
            .Select(check => check.Port!.Value)
            .Order()
            .ToList();
        var openPorts = checkResults
            .Where(result => string.Equals(result.Type, "tcp", StringComparison.OrdinalIgnoreCase)
                && result.IsAvailable
                && result.Port.HasValue)
            .Select(result => result.Port!.Value)
            .Order()
            .ToList();
        var status = ComputeStatus(checkResults);

        return new DeviceResult
        {
            Name = device.Name,
            Ip = device.Ip,
            Hostname = device.Hostname,
            WebsiteUrl = device.WebsiteUrl,
            PingTarget = pingTarget,
            Category = device.Category,
            IsOnline = hasAvailableCheck,
            Status = status,
            LatencyMs = latencyMs,
            Enabled = device.Enabled,
            RequestedPorts = requestedPorts,
            OpenPorts = openPorts,
            Checks = checkResults,
            LastCheck = DateTimeOffset.Now
        };
    }

    /// <summary>
    /// Selects the network target used for ping checks based on the device setting.
    /// </summary>
    /// <param name="device">Device being checked.</param>
    /// <returns>The hostname when hostname mode is enabled and available; otherwise the IP address.</returns>
    private static string ResolvePingTarget(Device device)
    {
        return device.UseHostnameForPing == true && !string.IsNullOrWhiteSpace(device.Hostname)
            ? device.Hostname
            : device.Ip;
    }

    /// <summary>
    /// Computes the final device status from all configured check results.
    /// </summary>
    /// <param name="checkResults">Raw ping and TCP check results for the device.</param>
    /// <returns>Healthy when every check succeeded, Degraded when some checks succeeded, otherwise Down.</returns>
    private static DeviceStatus ComputeStatus(IReadOnlyCollection<CheckResult> checkResults)
    {
        if (!checkResults.Any(result => result.IsAvailable))
        {
            return DeviceStatus.Down;
        }

        return checkResults.All(result => result.IsAvailable)
            ? DeviceStatus.Healthy
            : DeviceStatus.Degraded;
    }

    /// <summary>
    /// Runs one check while respecting the global concurrent-check limiter.
    /// </summary>
    /// <param name="ip">Device IP address used for TCP checks.</param>
    /// <param name="pingTarget">IP address or hostname used for ping checks.</param>
    /// <param name="check">Check definition from the device configuration.</param>
    /// <param name="settings">Network timeout and retry settings.</param>
    /// <param name="checkLimiter">Shared semaphore limiting total concurrent checks.</param>
    /// <param name="cancellationToken">Token used to cancel queued or in-flight work.</param>
    /// <returns>The raw check result for ping or TCP.</returns>
    private async Task<CheckResult> RunLimitedCheckAsync(
        string ip,
        string pingTarget,
        DeviceCheck check,
        MonitorSettings settings,
        SemaphoreSlim checkLimiter,
        CancellationToken cancellationToken)
    {
        await checkLimiter.WaitAsync(cancellationToken);

        try
        {
            if (string.Equals(check.Type, "ping", StringComparison.OrdinalIgnoreCase))
            {
                var pingResult = await RunWithRetryAsync(
                    () => PingAsync(pingTarget, settings.TimeoutMs),
                    result => result.IsAvailable,
                    settings,
                    cancellationToken);
                return new CheckResult
                {
                    Type = "ping",
                    Port = null,
                    LatencyMs = pingResult.LatencyMs,
                    IsAvailable = pingResult.IsAvailable,
                    Status = pingResult.Status,
                    Label = "Ping"
                };
            }

            var port = check.Port!.Value;
            var isOpen = await RunWithRetryAsync(
                () => CheckPortAsync(ip, port, settings.TimeoutMs, cancellationToken),
                result => result,
                settings,
                cancellationToken);
            return new CheckResult
            {
                Type = "tcp",
                Port = port,
                LatencyMs = null,
                IsAvailable = isOpen,
                Status = isOpen ? "Open" : "Unavailable",
                Label = $"TCP {port}"
            };
        }
        finally
        {
            checkLimiter.Release();
        }
    }

    /// <summary>
    /// Runs a network check and repeats it when it fails, up to the configured retry count.
    /// </summary>
    /// <typeparam name="T">Result type returned by the check.</typeparam>
    /// <param name="operation">Network operation to execute.</param>
    /// <param name="isSuccessful">Predicate that returns true when no retry is needed.</param>
    /// <param name="settings">Execution settings containing retry options.</param>
    /// <param name="cancellationToken">Token used to cancel retry delays.</param>
    /// <returns>The first successful result, or the last failed result.</returns>
    private static async Task<T> RunWithRetryAsync<T>(
        Func<Task<T>> operation,
        Func<T, bool> isSuccessful,
        MonitorSettings settings,
        CancellationToken cancellationToken)
    {
        var maxAttempts = Math.Max(1, settings.RetryCount + 1);
        var delayMs = Math.Max(0, settings.RetryDelayMs);
        var result = await operation();

        for (var attempt = 1; attempt < maxAttempts && !isSuccessful(result); attempt++)
        {
            if (delayMs > 0)
            {
                await Task.Delay(delayMs, cancellationToken);
            }

            result = await operation();
        }

        return result;
    }

    /// <summary>
    /// Sends an asynchronous ICMP ping and captures success plus round-trip latency.
    /// </summary>
    /// <param name="ip">IP address or host to ping.</param>
    /// <param name="timeoutMs">Ping timeout in milliseconds.</param>
    /// <returns>A ping result containing availability and latency. Failed pings return latency zero.</returns>
    private async Task<PingCheckResult> PingAsync(string ip, int timeoutMs)
    {
        try
        {
            using var ping = new Ping();
            var reply = await ping.SendPingAsync(ip, timeoutMs);
            var status = reply.Status.ToString();
            return new PingCheckResult(
                reply.Status == IPStatus.Success,
                reply.Status == IPStatus.Success ? ConvertLatency(reply.RoundtripTime) : 0,
                status);
        }
        catch (Exception ex) when (
            ex is PingException
                or SocketException
                or InvalidOperationException
                or ArgumentException)
        {
            _logger.LogDebug(ex, "Ping failed for {Ip}", ip);
            return new PingCheckResult(false, 0, ex.GetType().Name);
        }
    }

    /// <summary>
    /// Converts a long latency value into an int suitable for the API response.
    /// </summary>
    /// <param name="latencyMs">Round-trip latency reported by <see cref="Ping"/>.</param>
    /// <returns>The latency as an int, capped at <see cref="int.MaxValue"/>.</returns>
    private static int ConvertLatency(long latencyMs)
    {
        return latencyMs > int.MaxValue
            ? int.MaxValue
            : (int)latencyMs;
    }

    /// <summary>
    /// Attempts to open a TCP connection to a target port within the configured timeout.
    /// </summary>
    /// <param name="ip">Target IP address or host.</param>
    /// <param name="port">TCP port number from 1 to 65535.</param>
    /// <param name="timeoutMs">Connection timeout in milliseconds.</param>
    /// <param name="cancellationToken">Token used to cancel the connection attempt.</param>
    /// <returns>True when the TCP connection succeeds; otherwise false.</returns>
    private async Task<bool> CheckPortAsync(
        string ip,
        int port,
        int timeoutMs,
        CancellationToken cancellationToken)
    {
        try
        {
            using var client = new TcpClient();
            var timeout = TimeSpan.FromMilliseconds(timeoutMs);

            await client.ConnectAsync(ip, port, cancellationToken)
                .AsTask()
                .WaitAsync(timeout, cancellationToken);
            return true;
        }
        catch (Exception ex) when (
            ex is SocketException
                or TimeoutException
                or OperationCanceledException
                or ArgumentOutOfRangeException
                or ArgumentException
                or InvalidOperationException
                or IOException
                or ObjectDisposedException)
        {
            _logger.LogDebug(ex, "Port check failed for {Ip}:{Port}", ip, port);
            return false;
        }
    }

    /// <summary>
    /// Internal ping result used before mapping to the public check response.
    /// </summary>
    /// <param name="IsAvailable">True when ping returned IPStatus.Success.</param>
    /// <param name="LatencyMs">Round-trip latency in milliseconds, or zero when unavailable.</param>
    /// <param name="Status">ICMP status or exception type captured during the ping.</param>
    private readonly record struct PingCheckResult(bool IsAvailable, int LatencyMs, string Status);
}
