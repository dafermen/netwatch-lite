using System.Net.NetworkInformation;
using System.Net.Sockets;
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
    /// Runs every configured check for one device and computes the final aggregated status.
    /// </summary>
    /// <param name="device">Device to check.</param>
    /// <param name="settings">Execution settings such as timeout and concurrency limit.</param>
    /// <param name="checkLimiter">Shared semaphore limiting total concurrent checks across all devices.</param>
    /// <param name="cancellationToken">Token used to cancel check work.</param>
    /// <returns>A complete device result with ping state, latency, port lists, raw checks, and final status.</returns>
    private async Task<DeviceResult> CheckDeviceAsync(
        Device device,
        MonitorSettings settings,
        SemaphoreSlim checkLimiter,
        CancellationToken cancellationToken)
    {
        var pingTarget = ResolvePingTarget(device, settings);
        var checkTasks = device.Checks.Select(check =>
            RunLimitedCheckAsync(device.Ip, pingTarget, check, settings.TimeoutMs, checkLimiter, cancellationToken));
        var checkResults = await Task.WhenAll(checkTasks);

        var isOnline = checkResults.Any(result =>
            string.Equals(result.Type, "ping", StringComparison.OrdinalIgnoreCase)
                && result.IsAvailable);
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
        var status = ComputeStatus(isOnline, requestedPorts, openPorts);

        return new DeviceResult
        {
            Name = device.Name,
            Ip = device.Ip,
            Hostname = device.Hostname,
            PingTarget = pingTarget,
            Category = device.Category,
            IsOnline = isOnline,
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
    /// Selects the network target used for ping checks based on global settings and device data.
    /// </summary>
    /// <param name="device">Device being checked.</param>
    /// <param name="settings">Global monitor settings.</param>
    /// <returns>The hostname when hostname mode is enabled and available; otherwise the IP address.</returns>
    private static string ResolvePingTarget(Device device, MonitorSettings settings)
    {
        return settings.UseHostnameForPing && !string.IsNullOrWhiteSpace(device.Hostname)
            ? device.Hostname
            : device.Ip;
    }

    /// <summary>
    /// Computes the final device status from ping availability and TCP port results.
    /// </summary>
    /// <param name="isOnline">True when ping succeeded.</param>
    /// <param name="requestedPorts">All TCP ports configured for the device.</param>
    /// <param name="openPorts">TCP ports that accepted a connection.</param>
    /// <returns>Down when ping failed, Healthy when every requested port is open, otherwise Degraded.</returns>
    private static DeviceStatus ComputeStatus(
        bool isOnline,
        IReadOnlyCollection<int> requestedPorts,
        IReadOnlyCollection<int> openPorts)
    {
        if (!isOnline)
        {
            return DeviceStatus.Down;
        }

        return requestedPorts.Count == openPorts.Count
            ? DeviceStatus.Healthy
            : DeviceStatus.Degraded;
    }

    /// <summary>
    /// Runs one check while respecting the global concurrent-check limiter.
    /// </summary>
    /// <param name="ip">Device IP address used for TCP checks.</param>
    /// <param name="pingTarget">IP address or hostname used for ping checks.</param>
    /// <param name="check">Check definition from the device configuration.</param>
    /// <param name="timeoutMs">Network timeout in milliseconds.</param>
    /// <param name="checkLimiter">Shared semaphore limiting total concurrent checks.</param>
    /// <param name="cancellationToken">Token used to cancel queued or in-flight work.</param>
    /// <returns>The raw check result for ping or TCP.</returns>
    private async Task<CheckResult> RunLimitedCheckAsync(
        string ip,
        string pingTarget,
        DeviceCheck check,
        int timeoutMs,
        SemaphoreSlim checkLimiter,
        CancellationToken cancellationToken)
    {
        await checkLimiter.WaitAsync(cancellationToken);

        try
        {
            if (string.Equals(check.Type, "ping", StringComparison.OrdinalIgnoreCase))
            {
                var pingResult = await PingAsync(pingTarget, timeoutMs);
                return new CheckResult
                {
                    Type = "ping",
                    Port = null,
                    LatencyMs = pingResult.LatencyMs,
                    IsAvailable = pingResult.IsAvailable,
                    Label = "Ping"
                };
            }

            var port = check.Port!.Value;
            var isOpen = await CheckPortAsync(ip, port, timeoutMs, cancellationToken);
            return new CheckResult
            {
                Type = "tcp",
                Port = port,
                LatencyMs = null,
                IsAvailable = isOpen,
                Label = $"TCP {port}"
            };
        }
        finally
        {
            checkLimiter.Release();
        }
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
            return new PingCheckResult(
                reply.Status == IPStatus.Success,
                reply.Status == IPStatus.Success ? ConvertLatency(reply.RoundtripTime) : 0);
        }
        catch (Exception ex) when (
            ex is PingException
                or InvalidOperationException
                or ArgumentException)
        {
            _logger.LogDebug(ex, "Ping failed for {Ip}", ip);
            return new PingCheckResult(false, 0);
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
                or ArgumentOutOfRangeException)
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
    private readonly record struct PingCheckResult(bool IsAvailable, int LatencyMs);
}
