const sidebar = document.querySelector("#sidebar");
const appShell = document.querySelector(".app-shell");
const sidebarBackdrop = document.querySelector("#sidebar-backdrop");
const sidebarToggle = document.querySelector("#sidebar-toggle");
const navLinks = document.querySelectorAll("[data-route]");
const currentPageLabel = document.querySelector("#current-page-label");

const dashboardPage = document.querySelector("#dashboard-page");
const configPage = document.querySelector("#config-page");
const manualPage = document.querySelector("#manual-page");
const aboutPage = document.querySelector("#about-page");
const resultsBody = document.querySelector("#results-body");
const lastCheck = document.querySelector("#last-check");
const executionMode = document.querySelector("#execution-mode");
const autoRefreshToggle = document.querySelector("#auto-refresh-toggle");
const autoRefreshLabel = document.querySelector("#auto-refresh-label");
const runFullCheckButton = document.querySelector("#run-full-check");
const runFullCheckSpinner = document.querySelector("#run-full-check-spinner");
const runFullCheckIcon = document.querySelector("#run-full-check-icon");
const groupCheckSelect = document.querySelector("#group-check-select");
const runGroupCheckButton = document.querySelector("#run-group-check");
const runGroupCheckSpinner = document.querySelector("#run-group-check-spinner");
const runGroupCheckIcon = document.querySelector("#run-group-check-icon");
const searchInput = document.querySelector("#device-search");
const filterInputs = document.querySelectorAll("input[name='status-filter']");
const monitorProgress = document.querySelector("#monitor-progress");
const monitorProgressSpinner = document.querySelector("#monitor-progress-spinner");
const monitorProgressLabel = document.querySelector("#monitor-progress-label");
const monitorProgressPercent = document.querySelector("#monitor-progress-percent");
const monitorProgressBar = document.querySelector("#monitor-progress-bar");
const monitorProgressDetail = document.querySelector("#monitor-progress-detail");
const metricTotal = document.querySelector("#metric-total");
const metricOnline = document.querySelector("#metric-online");
const metricOffline = document.querySelector("#metric-offline");
const metricDegraded = document.querySelector("#metric-degraded");
const metricAvailability = document.querySelector("#metric-availability");

const configAlert = document.querySelector("#config-alert");
const configDevicesBody = document.querySelector("#config-devices-body");
const reloadConfigButton = document.querySelector("#reload-config");
const exportConfigButton = document.querySelector("#export-config");
const importConfigButton = document.querySelector("#import-config");
const importConfigFileInput = document.querySelector("#import-config-file");
const saveConfigButton = document.querySelector("#save-config");
const saveConfigSpinner = document.querySelector("#save-config-spinner");
const saveConfigIcon = document.querySelector("#save-config-icon");
const intervalSecondsInput = document.querySelector("#interval-seconds");
const timeoutMsInput = document.querySelector("#timeout-ms");
const maxParallelChecksInput = document.querySelector("#max-parallel-checks");
const configDeviceSearchInput = document.querySelector("#config-device-search");
const addDeviceButton = document.querySelector("#add-device");
const deviceFormModalElement = document.querySelector("#device-form-modal");
const deviceFormModal = typeof bootstrap !== "undefined" && deviceFormModalElement
  ? new bootstrap.Modal(deviceFormModalElement)
  : null;
const deviceForm = document.querySelector("#device-form");
const deviceFormTitle = document.querySelector("#device-form-title");
const editingDeviceIndex = document.querySelector("#editing-device-index");
const deviceNameInput = document.querySelector("#device-name");
const deviceAddressInput = document.querySelector("#device-address");
const deviceHostnameInput = document.querySelector("#device-hostname");
const deviceUseHostnameForPingInput = document.querySelector("#device-use-hostname-for-ping");
const deviceWebsiteUrlInput = document.querySelector("#device-website-url");
const deviceCategoryInput = document.querySelector("#device-category");
const deviceEnabledInput = document.querySelector("#device-enabled");
const checksList = document.querySelector("#checks-list");
const addCheckButton = document.querySelector("#add-check");
const resetDeviceFormButton = document.querySelector("#reset-device-form");
const submitDeviceButton = document.querySelector("#submit-device");
const deleteDeviceModalElement = document.querySelector("#delete-device-modal");
const deleteDeviceModal = typeof bootstrap !== "undefined" && deleteDeviceModalElement
  ? new bootstrap.Modal(deleteDeviceModalElement)
  : null;
const deleteDeviceName = document.querySelector("#delete-device-name");
const confirmDeleteDeviceButton = document.querySelector("#confirm-delete-device");

let refreshTimer;
let activeMonitorStream;
let latestResults = [];
let latestCategories = [];
let activeFilter = "all";
let activeSearch = "";
let autoRefreshEnabled = false;
let hasCompletedFullCheck = false;
let activeRunCategory = "";
let activeRunKeepsDashboardStable = false;
let activeRunPreservesDashboard = false;
let currentRoute = normalizeRoute(location.pathname);
let hasLoadedDashboardGroups = false;
let hasLoadedConfig = false;
let activeConfigSearch = "";
const defaultAutoFullCheckIntervalSeconds = 60;
const maxConfigImportBytes = 5 * 1024 * 1024;
let configState = createEmptyConfiguration();
let pendingDeleteIndex = null;
const expandedCategoryNames = new Set();
const mobileSidebarQuery = window.matchMedia("(max-width: 991.98px)");

function loadResults({ showErrors = true, category = "" } = {}) {
  return streamFullCheck({ showErrors, category });
}

/**
 * Opens the Server-Sent Events monitoring stream and routes each event to the
 * dashboard renderer. This keeps large inventories responsive because each
 * device result is shown as soon as the backend finishes it.
 * @param {{ showErrors?: boolean, category?: string }} options Controls whether stream errors are displayed and optional category scope.
 * @returns {Promise<void>} Resolves when the stream completes, reports busy, or fails.
 */
function streamFullCheck({ showErrors = true, category = "" } = {}) {
  if (activeMonitorStream) {
    lastCheck.textContent = "A monitoring execution is already running.";
    return Promise.resolve();
  }

  return new Promise(resolve => {
    let settled = false;
    const streamUrl = category
      ? `/api/monitor/stream?category=${encodeURIComponent(category)}`
      : "/api/monitor/stream";
    const source = new EventSource(streamUrl);
    activeMonitorStream = source;

    source.addEventListener("started", event => {
      const payload = JSON.parse(event.data);
      activeRunCategory = category;
      activeRunKeepsDashboardStable = Boolean(category && latestResults.length > 0);
      activeRunPreservesDashboard = Boolean(!category && autoRefreshEnabled && latestResults.length > 0);
      resetStreamingDashboard(payload, category);
    });

    source.addEventListener("result", event => {
      const payload = JSON.parse(event.data);
      renderStreamingResult(payload);
    });

    source.addEventListener("completed", event => {
      const payload = JSON.parse(event.data);
      closeMonitorStream();
      const completedPayload = {
        settings: payload.settings,
        summary: payload.summary,
        categories: payload.categories,
        results: payload.results,
        lastExecutionTime: payload.timestamp,
        lastCheck: payload.timestamp,
        executionStatus: payload.executionStatus
      };

      if (category) {
        renderScopedMonitorPayload(completedPayload, category);
      } else {
        hasCompletedFullCheck = true;
        expandedCategoryNames.clear();
        renderMonitorPayload(completedPayload);
      }

      activeRunCategory = "";
      activeRunKeepsDashboardStable = false;
      activeRunPreservesDashboard = false;
      settled = true;
      resolve();
    });

    source.addEventListener("busy", event => {
      const payload = JSON.parse(event.data);
      closeMonitorStream();
      activeRunCategory = "";
      activeRunKeepsDashboardStable = false;
      activeRunPreservesDashboard = false;
      lastCheck.textContent = payload.message || "A monitoring execution is already running.";
      settled = true;
      resolve();
    });

    source.addEventListener("error", event => {
      if (!event.data || settled) {
        return;
      }

      const payload = JSON.parse(event.data);
      handleMonitorStreamFailure(
        payload.message || "Unable to stream monitoring results.",
        category,
        showErrors);
      settled = true;
      resolve();
    });

    source.onerror = error => {
      if (settled) {
        return;
      }

      handleMonitorStreamFailure("Unable to stream monitoring results.", category, showErrors);

      console.error(error);
      settled = true;
      resolve();
    };
  });
}

function handleMonitorStreamFailure(message, category, showErrors) {
  const keepDashboardStable = activeRunKeepsDashboardStable
    || activeRunPreservesDashboard
    || Boolean(category && latestResults.length > 0);

  closeMonitorStream();
  activeRunCategory = "";
  activeRunKeepsDashboardStable = false;
  activeRunPreservesDashboard = false;

  if (keepDashboardStable) {
    monitorProgress.hidden = true;
    renderFilteredCategories();
  }

  if (!showErrors) {
    return;
  }

  if (keepDashboardStable) {
    lastCheck.textContent = `${message} Existing dashboard results were kept.`;
    return;
  }

  resultsBody.innerHTML = `
    <div class="text-center text-danger py-4">
      ${escapeHtml(message)}
    </div>`;
  lastCheck.textContent = "Last execution failed";
}

function renderMonitorPayload(payload) {
  latestResults = payload.results ?? [];
  latestCategories = payload.categories ?? groupResultsByCategory(payload.results ?? []);
  hasCompletedFullCheck = payload.executionStatus === "Completed" || hasCompletedFullCheck;
  renderSummary(payload.summary ?? createSummaryFromCategories(latestCategories));
  renderFilteredCategories();
  scheduleRefresh();
  executionMode.textContent = autoRefreshEnabled ? "Auto full check active" : "Manual mode";
  lastCheck.textContent = `Last execution: ${formatDate(payload.lastExecutionTime ?? payload.lastCheck)}`;
  updateProgressPanel(payload.results?.length ?? 0, payload.results?.length ?? 0, "Completed", false);
}

function renderScopedMonitorPayload(payload, category) {
  const scopedResults = payload.results ?? [];
  const scopedCategory = category.toLowerCase();
  const remainingResults = latestResults.filter(result =>
    String(result.category ?? "Uncategorized").toLowerCase() !== scopedCategory);

  latestResults = [...remainingResults, ...scopedResults];
  latestCategories = groupResultsByCategory(latestResults);
  hasCompletedFullCheck = true;
  activeRunCategory = "";
  renderSummary(createSummaryFromCategories(latestCategories));
  renderFilteredCategories();
  executionMode.textContent = autoRefreshEnabled ? "Auto full check active" : "Manual mode";
  lastCheck.textContent = `Last ${category} execution: ${formatDate(payload.lastExecutionTime ?? payload.lastCheck)}`;
  updateProgressPanel(scopedResults.length, scopedResults.length, "Completed", false);
  activeRunKeepsDashboardStable = false;
}

/**
 * Resets dashboard state when a new progressive monitoring run starts.
 * @param {object} payload The started event received from /api/monitor/stream.
 */
function resetStreamingDashboard(payload, category = "") {
  const scopeLabel = category ? `${category} ` : "";

  if (!category) {
    if (!activeRunPreservesDashboard) {
      hasCompletedFullCheck = false;
      latestResults = [];
      latestCategories = [];
    }
  }

  renderSummary((category && latestResults.length > 0) || activeRunPreservesDashboard
    ? createSummaryFromCategories(latestCategories)
    : payload.summary ?? createProgressSummary([], payload.totalDevices ?? 0));
  if (activeRunKeepsDashboardStable) {
    monitorProgress.hidden = true;
  } else {
    updateProgressPanel(0, Number(payload.totalDevices) || 0, `Checking ${scopeLabel}devices...`, true);
  }

  if ((category && latestResults.length > 0) || activeRunPreservesDashboard) {
    renderFilteredCategories();
  } else {
    resultsBody.innerHTML = `
      <div class="progress-panel text-secondary">
        <span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
        Checking ${scopeLabel}devices 0/${Number(payload.totalDevices) || 0}...
      </div>`;
  }

  executionMode.textContent = autoRefreshEnabled ? "Auto full check active" : "Manual mode";
  lastCheck.textContent = `Checking ${scopeLabel}devices 0/${Number(payload.totalDevices) || 0}...`;
}

/**
 * Adds one streamed device result to the dashboard and refreshes progress,
 * summary cards, category sections, and the topbar status text.
 * @param {object} payload The result event received from /api/monitor/stream.
 */
function renderStreamingResult(payload) {
  if (payload.result) {
    upsertLatestResult(payload.result);
  }

  latestCategories = groupResultsByCategory(latestResults);
  renderSummary(activeRunCategory || activeRunPreservesDashboard
    ? createSummaryFromCategories(latestCategories)
    : payload.summary ?? createProgressSummary(latestResults, payload.totalDevices ?? latestResults.length));
  if (activeRunKeepsDashboardStable) {
    monitorProgress.hidden = true;
  } else {
    updateProgressPanel(
      payload.completedDevices,
      payload.totalDevices,
      activeRunCategory ? `Checking ${activeRunCategory} devices...` : "Checking devices...",
      true);
  }
  renderFilteredCategories();
  lastCheck.textContent = activeRunCategory
    ? `Checking ${activeRunCategory} devices ${payload.completedDevices}/${payload.totalDevices}...`
    : `Checking devices ${payload.completedDevices}/${payload.totalDevices}...`;
}

/**
 * Inserts or replaces a device result in the current dashboard state.
 * @param {object} result Completed device result received from the backend stream.
 */
function upsertLatestResult(result) {
  const resultIndex = latestResults.findIndex(device =>
    device.name === result.name && device.ip === result.ip);

  if (resultIndex >= 0) {
    latestResults[resultIndex] = result;
    return;
  }

  latestResults.push(result);
}

/**
 * Updates the visible progress panel above the dashboard results.
 * @param {number} completedDevices Number of devices already checked.
 * @param {number} totalDevices Number of enabled devices expected in the run.
 * @param {string} label Text shown next to the spinner/check icon.
 * @param {boolean} isRunning Whether the progress bar should animate.
 */
function updateProgressPanel(completedDevices, totalDevices, label, isRunning) {
  const total = Math.max(0, Number(totalDevices) || 0);
  const completed = Math.min(total, Math.max(0, Number(completedDevices) || 0));
  const percent = total === 0 ? 100 : Math.round((completed / total) * 100);
  const isComplete = !isRunning && completed >= total;

  monitorProgress.hidden = isComplete;
  if (isComplete) {
    return;
  }

  monitorProgress.hidden = false;
  monitorProgressLabel.textContent = label;
  monitorProgressPercent.textContent = `${percent}%`;
  monitorProgressBar.style.width = `${percent}%`;
  monitorProgressBar.textContent = `${percent}%`;
  monitorProgressBar.parentElement.setAttribute("aria-valuenow", String(percent));
  monitorProgressDetail.textContent = `${completed} of ${total} devices checked`;
  monitorProgressSpinner.classList.toggle("d-none", !isRunning);
  monitorProgressBar.classList.toggle("progress-bar-animated", isRunning);
  monitorProgressBar.classList.toggle("progress-bar-striped", isRunning);
}

function renderSummary(summary) {
  metricTotal.textContent = formatNumber(summary.totalDevices);
  metricOnline.textContent = formatNumber(summary.onlineDevices);
  metricOffline.textContent = formatNumber(summary.offlineDevices);
  metricDegraded.textContent = formatNumber(summary.degradedDevices);
  metricAvailability.textContent = `${formatPercent(summary.availabilityPercentage)}%`;
}

function createSummaryFromCategories(categories) {
  const devices = categories.flatMap(category => category.devices ?? []);
  return createProgressSummary(devices, devices.length);
}

function createProgressSummary(devices, totalDevices = devices.length) {
  const expectedTotal = Number(totalDevices) || devices.length;
  const healthyDevices = devices.filter(device => device.status === "Healthy").length;
  const onlineDevices = devices.filter(device => device.isOnline).length;
  const offlineDevices = devices.filter(device => device.status === "Down").length;
  const degradedDevices = devices.filter(device => device.status === "Degraded").length;
  const availabilityPercentage = expectedTotal === 0
    ? 0
    : Math.round((healthyDevices / expectedTotal * 100) * 10) / 10;

  return {
    totalDevices: expectedTotal,
    healthyDevices,
    onlineDevices,
    offlineDevices,
    degradedDevices,
    availabilityPercentage
  };
}

function renderFilteredCategories() {
  renderCategories(filterCategories(latestCategories));
}

function filterCategories(categories) {
  const search = activeSearch.trim().toLowerCase();

  return categories
    .map(category => {
      const devices = (category.devices ?? []).filter(device =>
        matchesSearch(device, search) && matchesFilter(device, activeFilter));

      return {
        ...category,
        devices,
        stateDevices: category.devices ?? [],
        totalDevices: devices.length,
        onlineDevices: devices.filter(device => device.isOnline).length,
        offlineDevices: devices.filter(device => !device.isOnline).length
      };
    })
    .filter(category => category.devices.length > 0);
}

function matchesSearch(device, search) {
  if (!search) {
    return true;
  }

  return String(device.name ?? "").toLowerCase().includes(search)
    || String(device.ip ?? "").toLowerCase().includes(search)
    || String(device.hostname ?? "").toLowerCase().includes(search)
    || String(device.websiteUrl ?? "").toLowerCase().includes(search);
}

function matchesFilter(device, filter) {
  if (filter === "online") {
    return device.isOnline;
  }

  if (filter === "offline") {
    return !device.isOnline;
  }

  if (filter === "problems") {
    return device.status === "Degraded" || device.status === "Down";
  }

  return true;
}

function renderCategories(categories) {
  if (categories.length === 0) {
    resultsBody.innerHTML = `
      <div class="text-center text-secondary py-4">
        No devices match the current filters.
      </div>`;
    return;
  }

  resultsBody.innerHTML = categories.map(renderCategory).join("");
}

function renderCategory(category, index) {
  const devices = category.devices ?? [];
  const totalDevices = category.totalDevices ?? devices.length;
  const onlineDevices = category.onlineDevices ?? devices.filter(device => device.isOnline).length;
  const offlineDevices = category.offlineDevices ?? totalDevices - onlineDevices;
  const stateDevices = category.stateDevices ?? devices;
  const stateTotalDevices = stateDevices.length;
  const healthyDevices = stateDevices.filter(device => device.status === "Healthy").length;
  const problemDevices = stateDevices.filter(device => device.status === "Degraded" || device.status === "Down").length;
  const categoryPercent = stateTotalDevices === 0 ? 100 : Math.round((healthyDevices / stateTotalDevices) * 100);
  const isHealthyCategory = stateTotalDevices > 0 && problemDevices === 0 && healthyDevices === stateTotalDevices;
  const isRunningCategory = activeRunCategory
    && activeRunCategory.toLowerCase() === String(category.name ?? "").toLowerCase();
  const stateClass = isRunningCategory
    ? "category-section-running"
    : hasCompletedFullCheck
    ? isHealthyCategory ? "category-section-healthy" : "category-section-problem"
    : "category-section-running";
  const stateIcon = isRunningCategory
    ? "fa-spinner fa-spin"
    : hasCompletedFullCheck
    ? isHealthyCategory ? "fa-circle-check" : "fa-circle-xmark"
    : "fa-spinner fa-spin";
  const stateLabel = isRunningCategory
    ? "Checking"
    : hasCompletedFullCheck
    ? isHealthyCategory ? "Healthy" : "Needs attention"
    : "Checking";
  const categoryId = `category-${index}-${slugify(category.name)}`;
  const isExpanded = expandedCategoryNames.has(category.name);
  const expandedClass = isExpanded ? "category-section-expanded" : "";

  return `
    <section class="category-section ${stateClass} ${expandedClass} mb-3">
      <div class="category-header d-flex flex-wrap align-items-center justify-content-between gap-2">
        <div class="d-flex align-items-center gap-2 min-w-0">
          <button
            class="btn btn-sm btn-outline-secondary category-toggle"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#${categoryId}"
            aria-expanded="${isExpanded}"
            aria-controls="${categoryId}">
            <i class="fa-solid fa-chevron-down"></i>
          </button>
          <div>
            <h2 class="h5 mb-0">${escapeHtml(category.name)}</h2>
            <span class="category-subtitle small">${totalDevices} devices monitored</span>
          </div>
        </div>
        <div class="category-summary d-flex align-items-center justify-content-end gap-2 flex-wrap flex-sm-nowrap ms-auto">
          <span class="category-percent">${categoryPercent}%</span>
          <span class="category-state">
            <i class="fa-solid ${stateIcon} me-1"></i>${stateLabel}
          </span>
          <span class="category-counts">
            ${onlineDevices} online / ${offlineDevices} offline
          </span>
          <button class="btn btn-sm btn-light category-run-button" type="button" data-run-category="${escapeHtml(category.name)}">
            <i class="fa-solid fa-play me-1"></i>Run
          </button>
        </div>
      </div>
      <div
        class="collapse ${isExpanded ? "show" : ""}"
        id="${categoryId}"
        data-category-name="${escapeHtml(category.name)}">
        <div class="table-responsive border rounded-bottom">
          <table class="table table-hover align-middle mb-0">
            <thead class="table-light">
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Address</th>
                <th scope="col">Status</th>
                <th scope="col">Ping status</th>
                <th scope="col">Ports status</th>
                <th scope="col">Checked</th>
              </tr>
            </thead>
            <tbody>
              ${devices.map(renderRow).join("")}
            </tbody>
          </table>
        </div>
      </div>
    </section>`;
}

function renderRow(result) {
  const pingCheck = getPingCheck(result);
  const hasPingCheck = Boolean(pingCheck);
  const isPingAvailable = Boolean(pingCheck?.isAvailable);
  const statusClass = isPingAvailable ? "text-bg-success" : "text-bg-danger";
  const statusIcon = isPingAvailable ? "fa-check" : "fa-xmark";
  const statusText = isPingAvailable
    ? `Ping OK (${Number(pingCheck.latencyMs) || 0} ms)`
    : hasPingCheck ? "Ping failed" : "No ping check";

  return `
    <tr>
      <td class="fw-semibold">
        <div>${escapeHtml(result.name)}</div>
        ${renderWebsiteLink(result.websiteUrl)}
      </td>
      <td>
        <code>${escapeHtml(result.ip)}</code>
        ${result.hostname ? `<div class="text-secondary small">${escapeHtml(result.hostname)}</div>` : ""}
      </td>
      <td>${renderDeviceStatus(result.status)}</td>
      <td>
        <span class="badge ${statusClass} status-badge">
          <i class="fa-solid ${statusIcon} me-1"></i>${statusText}
        </span>
      </td>
      <td>${renderPorts(result)}</td>
      <td class="text-secondary small">${formatDate(result.lastCheck)}</td>
    </tr>`;
}

function renderWebsiteLink(websiteUrl) {
  if (!isHttpUrl(websiteUrl)) {
    return "";
  }

  return `
    <a class="small text-decoration-none" href="${escapeHtml(websiteUrl)}" target="_blank" rel="noopener noreferrer">
      <i class="fa-solid fa-arrow-up-right-from-square me-1"></i>Open website
    </a>`;
}

function getPingCheck(result) {
  return (result.checks ?? []).find(check =>
    String(check.type ?? "").toLowerCase() === "ping");
}

function renderDeviceStatus(status) {
  const normalizedStatus = status || "Down";
  const statusMap = {
    Healthy: {
      className: "text-bg-success",
      icon: "fa-check",
      label: "Healthy"
    },
    Degraded: {
      className: "text-bg-warning",
      icon: "fa-triangle-exclamation",
      label: "Degraded"
    },
    Down: {
      className: "text-bg-danger",
      icon: "fa-xmark",
      label: "Down"
    }
  };
  const statusInfo = statusMap[normalizedStatus] ?? statusMap.Down;

  return `
    <span class="badge ${statusInfo.className} status-badge">
      <i class="fa-solid ${statusInfo.icon} me-1"></i>${statusInfo.label}
    </span>`;
}

function groupResultsByCategory(results) {
  const groups = new Map();

  for (const result of results) {
    const categoryName = result.category || "Uncategorized";

    if (!groups.has(categoryName)) {
      groups.set(categoryName, []);
    }

    groups.get(categoryName).push(result);
  }

  return Array.from(groups.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, devices]) => ({
      name,
      totalDevices: devices.length,
      onlineDevices: devices.filter(device => device.isOnline).length,
      offlineDevices: devices.filter(device => !device.isOnline).length,
      devices: devices.sort((left, right) => left.name.localeCompare(right.name))
    }));
}

function renderPorts(result) {
  const requestedPorts = result.requestedPorts ?? [];
  const openPorts = result.openPorts ?? [];

  if (requestedPorts.length === 0) {
    return `<span class="text-secondary">No ports configured</span>`;
  }

  const openPortSet = new Set(openPorts);

  return requestedPorts.map(port => {
    const isOpen = openPortSet.has(port);
    const badgeClass = isOpen ? "text-bg-success" : "text-bg-danger";
    const icon = isOpen ? "fa-check" : "fa-xmark";
    const label = isOpen ? "open" : "closed";
    const webUrl = getWebPortUrl(result.ip, port);
    const content = `
        <i class="fa-solid ${icon}"></i>
        ${port} ${label}`;

    if (webUrl) {
      return `
        <a class="badge ${badgeClass} port-pill port-link" href="${escapeHtml(webUrl)}" target="_blank" rel="noopener noreferrer" title="Open ${escapeHtml(webUrl)}">
          ${content}
        </a>`;
    }

    return `
      <span class="badge ${badgeClass} port-pill">
        ${content}
      </span>`;
  }).join("");
}

function getWebPortUrl(address, port) {
  if (!address || port !== 80 && port !== 443) {
    return null;
  }

  return `${port === 443 ? "https" : "http"}://${address}`;
}

async function reloadJson() {
  setConfigBusy(true, { showSaveSpinner: false });
  clearConfigAlert();

  try {
    const response = await fetch("/api/reload", { method: "POST" });
    const payload = await readJsonResponse(response);

    if (!response.ok) {
      throw new Error(payload.error || payload.detail || `Reload failed with ${response.status}`);
    }

    await loadConfig({ clearAlert: false, showBusy: false });
    if (hasLoadedDashboardGroups) {
      await loadDashboardGroups();
    }
    showConfigAlert("success", `Reloaded config.json from disk. ${formatNumber(payload.count)} devices loaded.`);
  } catch (error) {
    showConfigAlert("danger", `JSON reload failed: ${error.message}`);
    console.error(error);
  } finally {
    setConfigBusy(false, { showSaveSpinner: false });
  }
}

async function exportConfig() {
  setConfigBusy(true, { showSaveSpinner: false });
  clearConfigAlert();

  try {
    const response = await fetch("/api/config/export");
    const contentType = response.headers.get("content-type")?.toLowerCase() || "";

    if (response.ok && contentType.includes("application/json")) {
      const blob = await response.blob();
      downloadJsonBlob(blob, getDownloadFileName(response) || createExportFileName());
      showConfigAlert("success", "Configuration exported as JSON.");
      return;
    }

    if (!response.ok && contentType.includes("application/json")) {
      const payload = await readJsonResponse(response);
      throw new Error(payload.error || payload.detail || `Export failed with ${response.status}`);
    }

    await exportConfigFromConfigEndpoint();
  } catch (error) {
    showConfigAlert("danger", `JSON export failed: ${error.message}`);
    console.error(error);
  } finally {
    setConfigBusy(false, { showSaveSpinner: false });
  }
}

async function exportConfigFromConfigEndpoint() {
  const response = await fetch("/api/config");
  const payload = await readJsonResponse(response);

  if (!response.ok) {
    throw new Error(payload.error || payload.detail || `Export fallback failed with ${response.status}`);
  }

  const json = `${JSON.stringify(payload, null, 2)}\n`;
  const blob = new Blob([json], { type: "application/json" });
  downloadJsonBlob(blob, createExportFileName());
  showConfigAlert("success", "Configuration exported as JSON.");
}

function downloadJsonBlob(blob, fileName) {
  const downloadUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = downloadUrl;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(downloadUrl);
}

function requestImportConfig() {
  importConfigFileInput.value = "";
  importConfigFileInput.click();
}

async function importConfigFile(file) {
  if (!file) {
    return;
  }

  if (!file.name.toLowerCase().endsWith(".json")) {
    showConfigAlert("warning", "Choose a .json configuration file.");
    return;
  }

  if (file.size === 0) {
    showConfigAlert("warning", "The selected JSON file is empty.");
    return;
  }

  if (file.size > maxConfigImportBytes) {
    showConfigAlert("warning", "The selected JSON file is too large. Maximum size is 5 MB.");
    return;
  }

  setConfigBusy(true, { showSaveSpinner: false });
  clearConfigAlert();

  try {
    const formData = new FormData();
    formData.append("configFile", file);

    const response = await fetch("/api/config/import", {
      method: "POST",
      body: formData
    });
    const payload = await readJsonResponse(response);

    if (!response.ok) {
      throw new Error(payload.error || payload.detail || `Import failed with ${response.status}`);
    }

    applyConfigPayload(payload.configuration);
    hasLoadedConfig = true;
    renderConfigDevices();
    resetDeviceForm();
    if (hasLoadedDashboardGroups) {
      await loadDashboardGroups();
    }
    showConfigAlert("success", `Imported config.json. ${formatNumber(payload.count)} devices loaded.`);
  } catch (error) {
    showConfigAlert("danger", `JSON import failed: ${error.message}`);
    console.error(error);
  } finally {
    setConfigBusy(false, { showSaveSpinner: false });
  }
}

async function runFullCheck() {
  setButtonLoading(runFullCheckButton, runFullCheckSpinner, runFullCheckIcon, true);

  try {
    await loadResults();
  } finally {
    setButtonLoading(runFullCheckButton, runFullCheckSpinner, runFullCheckIcon, false);
  }
}

async function runSelectedGroupCheck() {
  const category = groupCheckSelect.value;

  if (!category) {
    return;
  }

  await runGroupCheck(category);
}

async function runGroupCheck(category) {
  setButtonLoading(runGroupCheckButton, runGroupCheckSpinner, runGroupCheckIcon, true);
  runFullCheckButton.disabled = true;

  try {
    await loadResults({ category });
  } finally {
    setButtonLoading(runGroupCheckButton, runGroupCheckSpinner, runGroupCheckIcon, false);
    runGroupCheckButton.disabled = !groupCheckSelect.value;
    runFullCheckButton.disabled = false;
  }
}

async function toggleAutoRefresh() {
  autoRefreshEnabled = !autoRefreshEnabled;
  autoRefreshToggle.classList.toggle("btn-success", autoRefreshEnabled);
  autoRefreshToggle.classList.toggle("btn-danger", !autoRefreshEnabled);
  autoRefreshLabel.textContent = autoRefreshEnabled
    ? "Auto Refresh: ON"
    : "Auto Refresh: OFF";
  executionMode.textContent = autoRefreshEnabled ? "Auto full check active" : "Manual mode";

  if (autoRefreshEnabled) {
    if (!hasLoadedDashboardGroups) {
      await loadDashboardGroups();
    }

    runFullCheck();
    return;
  }

  clearRefreshTimer();
}

async function loadConfig({ clearAlert = true, showBusy = true } = {}) {
  if (showBusy) {
    setConfigBusy(true, { showSaveSpinner: false });
  }

  if (clearAlert) {
    clearConfigAlert();
  }

  try {
    const response = await fetch("/api/config");
    const payload = await readJsonResponse(response);

    if (!response.ok) {
      throw new Error(payload.error || `Unable to load configuration. HTTP ${response.status}`);
    }

    applyConfigPayload(payload);
    hasLoadedConfig = true;
    renderConfigDevices();
    resetDeviceForm();
  } catch (error) {
    showConfigAlert("danger", error.message || "Unable to load configuration.");
    console.error(error);
  } finally {
    if (showBusy) {
      setConfigBusy(false, { showSaveSpinner: false });
    }
  }
}

async function saveConfig(successMessage = "Settings saved to config.json. Previous config was backed up as config.backup.json.") {
  setConfigBusy(true);
  clearConfigAlert();

  try {
    if (!syncConfigSettingsFromUi()) {
      return;
    }

    const response = await fetch("/api/config", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(configState)
    });

    const payload = await readJsonResponse(response);

    if (!response.ok) {
      throw new Error(payload.error || `Request failed with ${response.status}`);
    }

    applyConfigPayload(payload.configuration);
    renderConfigDevices();
    resetDeviceForm();
    if (hasLoadedDashboardGroups) {
      await loadDashboardGroups();
    }
    if (autoRefreshEnabled) {
      scheduleRefresh();
    }
    showConfigAlert("success", successMessage);
  } catch (error) {
    showConfigAlert("danger", error.message || "Unable to save configuration.");
    console.error(error);
  } finally {
    setConfigBusy(false);
  }
}

function applyConfigPayload(payload) {
  configState = payload;
  configState.devices ??= [];
  configState.settings ??= {
    intervalSeconds: defaultAutoFullCheckIntervalSeconds,
    timeoutMs: 1000,
    maxParallelChecks: 50
  };
  configState.settings.intervalSeconds ??= defaultAutoFullCheckIntervalSeconds;
  configState.settings.timeoutMs ??= 1000;
  configState.settings.maxParallelChecks ??= 50;
  const legacyUseHostnameForPing = Boolean(configState.settings.useHostnameForPing);
  delete configState.settings.useHostnameForPing;
  configState.devices = configState.devices.map(device => ({
    ...device,
    useHostnameForPing: device.useHostnameForPing ?? legacyUseHostnameForPing
  }));
  if (intervalSecondsInput) {
    intervalSecondsInput.value = String(configState.settings.intervalSeconds);
  }
  timeoutMsInput.value = String(configState.settings.timeoutMs);
  maxParallelChecksInput.value = String(configState.settings.maxParallelChecks);
}

async function readJsonResponse(response) {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error("The API did not return JSON. Restart the application so the latest backend endpoints are loaded.");
  }
}

function getDownloadFileName(response) {
  const disposition = response.headers.get("content-disposition") || "";
  const utf8Match = disposition.match(/filename\*=UTF-8''([^;]+)/i);

  if (utf8Match) {
    return decodeURIComponent(utf8Match[1].replaceAll("\"", ""));
  }

  const asciiMatch = disposition.match(/filename="?([^";]+)"?/i);
  return asciiMatch ? asciiMatch[1] : "";
}

function createExportFileName() {
  const timestamp = new Date()
    .toISOString()
    .replaceAll("-", "")
    .replaceAll(":", "")
    .replace(/\.\d{3}Z$/, "");

  return `netwatch-lite-config-${timestamp}.json`;
}

async function loadDashboardGroups() {
  try {
    const response = await fetch("/api/config");
    const payload = await readJsonResponse(response);

    if (!response.ok) {
      throw new Error(payload.error || `Unable to load dashboard groups. HTTP ${response.status}`);
    }

    applyConfigPayload(payload);
    renderGroupCheckOptions(payload.devices);
    hasLoadedDashboardGroups = true;
  } catch (error) {
    console.error(error);
    runGroupCheckButton.disabled = true;
    lastCheck.textContent = error.message || "Unable to load dashboard groups.";
  }
}

function renderGroupCheckOptions(devices) {
  const categories = Array.from(new Set(
    (devices ?? [])
      .filter(device => device.enabled !== false)
      .map(device => device.category || "Uncategorized")))
    .sort((left, right) => left.localeCompare(right));

  groupCheckSelect.innerHTML = `
    <option value="">Select group</option>
    ${categories.map(category => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`).join("")}`;
  runGroupCheckButton.disabled = true;
}

function renderConfigDevices() {
  const devices = filterConfigDevices(configState.devices ?? []);
  const hasSearch = activeConfigSearch.trim().length > 0;

  if (devices.length === 0) {
    configDevicesBody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center text-secondary py-4">${hasSearch ? "No devices match the current filter." : "No devices configured."}</td>
      </tr>`;
    return;
  }

  configDevicesBody.innerHTML = groupConfigDevicesByCategory(devices)
    .map((group, groupIndex) => {
      const groupId = `config-category-${groupIndex}-${slugify(group.name)}`;

      return `
      <tr class="config-category-row">
        <td colspan="6">
          <div class="d-flex flex-wrap align-items-center justify-content-between gap-2">
            <div class="d-flex align-items-center gap-2">
              <button
                class="btn btn-sm btn-outline-secondary category-toggle"
                type="button"
                data-config-category-toggle="${groupId}"
                aria-expanded="false"
                aria-controls="${groupId}">
                <i class="fa-solid fa-chevron-down"></i>
              </button>
              <span class="fw-semibold">${escapeHtml(group.name)}</span>
            </div>
            <span class="badge text-bg-secondary">${group.devices.length} devices</span>
          </div>
        </td>
      </tr>
      ${group.devices.map(({ device, index }) => renderConfigDeviceRow(device, index, groupId)).join("")}`;
    })
    .join("");
}

function filterConfigDevices(devices) {
  const search = activeConfigSearch.trim().toLowerCase();
  const indexedDevices = devices.map((device, index) => ({ device, index }));

  if (!search) {
    return indexedDevices;
  }

  return indexedDevices.filter(({ device }) =>
    String(device.name ?? "").toLowerCase().includes(search)
      || String(device.ip ?? "").toLowerCase().includes(search)
      || String(device.hostname ?? "").toLowerCase().includes(search)
      || String(device.websiteUrl ?? "").toLowerCase().includes(search));
}

/**
 * Groups configuration devices by category while preserving their original
 * array index so edit/delete actions still target the correct JSON entry.
 * @param {Array<{device: object, index: number}>} devices Devices with their original configuration indexes.
 * @returns {Array<{name: string, devices: Array<{device: object, index: number}>}>} Sorted category groups.
 */
function groupConfigDevicesByCategory(devices) {
  const groups = new Map();

  devices.forEach(({ device, index }) => {
    const categoryName = device.category || "Uncategorized";

    if (!groups.has(categoryName)) {
      groups.set(categoryName, []);
    }

    groups.get(categoryName).push({ device, index });
  });

  return Array.from(groups.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, groupedDevices]) => ({
      name,
      devices: groupedDevices.sort((left, right) =>
        String(left.device.name ?? "").localeCompare(String(right.device.name ?? "")))
    }));
}

/**
 * Renders one editable device row inside its category group.
 * @param {object} device Device configuration object.
 * @param {number} index Original index in configState.devices.
 * @param {string} groupId Stable group key used to find rows for the category.
 * @returns {string} Table row markup.
 */
function renderConfigDeviceRow(device, index, groupId) {
  const pingModeLabel = device.useHostnameForPing ? "Hostname" : "Address";

  return `
    <tr class="config-device-row" data-config-category-row="${groupId}" hidden>
      <td>
        <div class="fw-semibold">${escapeHtml(device.name)}</div>
        <div class="text-secondary small">${device.enabled === false ? "Disabled" : "Enabled"}</div>
      </td>
      <td><code>${escapeHtml(device.ip)}</code></td>
      <td>${device.hostname ? `<code>${escapeHtml(device.hostname)}</code>` : `<span class="text-secondary">Not set</span>`}</td>
      <td><span class="badge text-bg-${device.useHostnameForPing ? "primary" : "secondary"}">${pingModeLabel}</span></td>
      <td>${device.checks?.length ?? 0}</td>
      <td class="text-end">
        <button class="btn btn-outline-primary btn-sm" type="button" data-edit-device="${index}">
          <i class="fa-solid fa-pen-to-square me-1"></i>Edit
        </button>
        <button class="btn btn-outline-danger btn-sm" type="button" data-delete-device="${index}">
          <i class="fa-solid fa-trash me-1"></i>Delete
        </button>
      </td>
    </tr>`;
}

/**
 * Expands or collapses all device rows that belong to one configuration category.
 * @param {HTMLButtonElement} toggleButton Button clicked in the category header.
 */
function toggleConfigCategory(toggleButton) {
  const groupId = toggleButton.dataset.configCategoryToggle;
  const isExpanded = toggleButton.getAttribute("aria-expanded") === "true";

  toggleButton.setAttribute("aria-expanded", String(!isExpanded));

  configDevicesBody
    .querySelectorAll(`[data-config-category-row="${groupId}"]`)
    .forEach(row => {
      row.hidden = isExpanded;
    });
}

function startAddDevice() {
  resetDeviceForm();
  showDeviceForm();
  deviceNameInput.focus();
}

function editDevice(index) {
  const device = configState.devices[index];

  if (!device) {
    return;
  }

  editingDeviceIndex.value = String(index);
  showDeviceForm();
  deviceFormTitle.textContent = "Edit Device";
  submitDeviceButton.textContent = "Update Device";
  deviceNameInput.value = device.name ?? "";
  deviceAddressInput.value = device.ip ?? "";
  deviceHostnameInput.value = device.hostname ?? "";
  deviceUseHostnameForPingInput.checked = Boolean(device.useHostnameForPing);
  deviceWebsiteUrlInput.value = device.websiteUrl ?? "";
  deviceCategoryInput.value = device.category ?? "";
  deviceEnabledInput.checked = device.enabled ?? true;
  checksList.innerHTML = "";

  for (const check of device.checks ?? []) {
    addCheckRow(check);
  }

  if (checksList.children.length === 0) {
    addCheckRow({ type: "ping" });
  }

  deviceNameInput.focus();
}

async function submitDevice(event) {
  event.preventDefault();

  const device = readDeviceForm();
  const indexValue = editingDeviceIndex.value;

  if (!device) {
    return;
  }

  if (indexValue === "") {
    configState.devices.push(device);
    await saveConfig("Device added and saved to config.json.");
  } else {
    configState.devices[Number(indexValue)] = device;
    await saveConfig("Device updated and saved to config.json.");
  }
}

function readDeviceForm() {
  const checks = readCheckRows();

  if (checks === null) {
    return null;
  }

  if (checks.length === 0) {
    showConfigAlert("warning", "Add at least one check before saving the device.");
    return null;
  }

  const websiteUrl = deviceWebsiteUrlInput.value.trim();

  if (websiteUrl && !isHttpUrl(websiteUrl)) {
    showConfigAlert("warning", "Website URL must start with http:// or https://.");
    deviceWebsiteUrlInput.focus();
    return null;
  }

  return {
    name: deviceNameInput.value.trim(),
    ip: deviceAddressInput.value.trim(),
    hostname: deviceHostnameInput.value.trim() || null,
    useHostnameForPing: deviceUseHostnameForPingInput.checked,
    websiteUrl: websiteUrl || null,
    category: deviceCategoryInput.value.trim() || "Uncategorized",
    enabled: deviceEnabledInput.checked,
    checks
  };
}

function readCheckRows() {
  const checks = [];

  for (const row of checksList.querySelectorAll(".check-row")) {
    const type = row.querySelector("[data-check-type]").value;
    const portValue = Number(row.querySelector("[data-check-port]").value);

    if (type === "ping") {
      checks.push({ type: "ping" });
      continue;
    }

    if (!Number.isInteger(portValue) || portValue < 1 || portValue > 65535) {
      showConfigAlert("warning", "TCP checks require a port between 1 and 65535.");
      return null;
    }

    checks.push({
      type: "tcp",
      port: portValue
    });
  }

  return checks;
}

function resetDeviceForm() {
  editingDeviceIndex.value = "";
  deviceForm.reset();
  deviceEnabledInput.checked = true;
  deviceUseHostnameForPingInput.checked = false;
  deviceFormTitle.textContent = "Add Device";
  submitDeviceButton.textContent = "Add Device";
  checksList.innerHTML = "";
  addCheckRow({ type: "ping" });
  hideDeviceForm();
}

function showDeviceForm() {
  if (deviceFormModal) {
    deviceFormModal.show();
  }
}

function hideDeviceForm() {
  if (deviceFormModal) {
    deviceFormModal.hide();
  }
}

function syncConfigSettingsFromUi() {
  configState.settings ??= {
    intervalSeconds: defaultAutoFullCheckIntervalSeconds,
    timeoutMs: 1000,
    maxParallelChecks: 50
  };
  const intervalSeconds = intervalSecondsInput
    ? readPositiveIntegerSetting(intervalSecondsInput, "Auto refresh")
    : Number(configState.settings.intervalSeconds) || defaultAutoFullCheckIntervalSeconds;
  const timeoutMs = readPositiveIntegerSetting(timeoutMsInput, "Timeout");
  const maxParallelChecks = readPositiveIntegerSetting(maxParallelChecksInput, "Max parallel checks");

  if (intervalSeconds === null || timeoutMs === null || maxParallelChecks === null) {
    return false;
  }

  configState.settings.intervalSeconds = intervalSeconds;
  configState.settings.timeoutMs = timeoutMs;
  configState.settings.maxParallelChecks = maxParallelChecks;
  delete configState.settings.useHostnameForPing;
  return true;
}

function readPositiveIntegerSetting(input, label) {
  const value = Number(input.value);

  if (!Number.isInteger(value) || value <= 0) {
    showConfigAlert("warning", `${label} must be a whole number greater than zero.`);
    input.focus();
    return null;
  }

  return value;
}

function addCheckRow(check = { type: "ping" }) {
  const row = document.createElement("div");
  row.className = "check-row";
  row.innerHTML = `
    <select class="form-select form-select-sm" data-check-type>
      <option value="ping">Ping</option>
      <option value="tcp">TCP</option>
    </select>
    <input class="form-control form-control-sm" type="number" min="1" max="65535" placeholder="Port" data-check-port>
    <button class="btn btn-outline-danger btn-sm icon-button" type="button" data-remove-check aria-label="Remove check">
      <i class="fa-solid fa-xmark"></i>
    </button>`;

  const typeSelect = row.querySelector("[data-check-type]");
  const portInput = row.querySelector("[data-check-port]");

  typeSelect.value = check.type === "tcp" ? "tcp" : "ping";
  portInput.value = check.port ?? "";
  updateCheckPortState(row);
  checksList.append(row);
}

function updateCheckPortState(row) {
  const typeSelect = row.querySelector("[data-check-type]");
  const portInput = row.querySelector("[data-check-port]");
  const isTcp = typeSelect.value === "tcp";

  portInput.disabled = !isTcp;
  portInput.required = isTcp;

  if (!isTcp) {
    portInput.value = "";
  }
}

function requestDeleteDevice(index) {
  const device = configState.devices[index];

  if (!device) {
    return;
  }

  pendingDeleteIndex = index;
  deleteDeviceName.textContent = device.name;
  if (deleteDeviceModal) {
    deleteDeviceModal.show();
  }
}

async function confirmDeleteDevice() {
  if (pendingDeleteIndex === null) {
    return;
  }

  configState.devices.splice(pendingDeleteIndex, 1);
  pendingDeleteIndex = null;
  if (deleteDeviceModal) {
    deleteDeviceModal.hide();
  }
  await saveConfig("Device deleted and saved to config.json.");
}

function setConfigBusy(isBusy, { showSaveSpinner = true } = {}) {
  saveConfigButton.disabled = isBusy;
  reloadConfigButton.disabled = isBusy;
  exportConfigButton.disabled = isBusy;
  importConfigButton.disabled = isBusy;
  addDeviceButton.disabled = isBusy;
  if (intervalSecondsInput) {
    intervalSecondsInput.disabled = isBusy;
  }
  timeoutMsInput.disabled = isBusy;
  maxParallelChecksInput.disabled = isBusy;
  deviceForm.querySelectorAll("input, select, button").forEach(element => {
    element.disabled = isBusy;
  });
  saveConfigSpinner.classList.toggle("d-none", !isBusy || !showSaveSpinner);
  saveConfigIcon.classList.toggle("d-none", isBusy && showSaveSpinner);
}

function showConfigAlert(type, message) {
  configAlert.innerHTML = `
    <div class="alert alert-${type} alert-dismissible fade show" role="alert">
      ${escapeHtml(message)}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    </div>`;
}

function clearConfigAlert() {
  configAlert.innerHTML = "";
}

function createEmptyConfiguration() {
  return {
    settings: {
      intervalSeconds: defaultAutoFullCheckIntervalSeconds,
      timeoutMs: 1000,
      maxParallelChecks: 50
    },
    devices: []
  };
}

function navigateTo(route, replace = false) {
  const normalizedRoute = normalizeRoute(route);
  const previousRoute = currentRoute;
  currentRoute = normalizedRoute;

  dashboardPage.hidden = normalizedRoute !== "/";
  configPage.hidden = normalizedRoute !== "/config";
  manualPage.hidden = normalizedRoute !== "/manual";
  aboutPage.hidden = normalizedRoute !== "/about";
  currentPageLabel.textContent = getPageLabel(normalizedRoute);

  navLinks.forEach(link => {
    link.classList.toggle("active", link.dataset.route === normalizedRoute);
  });

  if (replace) {
    history.replaceState({ route: normalizedRoute }, "", normalizedRoute);
  } else if (location.pathname !== normalizedRoute) {
    history.pushState({ route: normalizedRoute }, "", normalizedRoute);
  }

  closeSidebar();

  if (previousRoute === "/config" && normalizedRoute !== "/config") {
    resetDeviceForm();
    clearConfigAlert();
  }

  if (normalizedRoute === "/config" && previousRoute !== "/config") {
    resetDeviceForm();
  }

  if (normalizedRoute === "/config" && !hasLoadedConfig) {
    loadConfig();
  }

  if (normalizedRoute === "/" && !hasLoadedDashboardGroups) {
    loadDashboardGroups();
  }
}

function normalizeRoute(pathname) {
  const knownRoutes = new Set(["/", "/config", "/manual", "/about"]);
  return knownRoutes.has(pathname) ? pathname : "/";
}

function getPageLabel(route) {
  const labels = {
    "/": "Dashboard",
    "/config": "Configuration",
    "/manual": "User Manual",
    "/about": "About"
  };

  return labels[route] ?? "Dashboard";
}

function toggleSidebar() {
  if (mobileSidebarQuery.matches) {
    const isOpen = sidebar.classList.toggle("show");
    sidebarBackdrop.classList.toggle("show", isOpen);
    sidebarToggle.setAttribute("aria-expanded", String(isOpen));
    return;
  }

  const isCollapsed = appShell.classList.toggle("sidebar-collapsed");
  sidebarToggle.setAttribute("aria-expanded", String(!isCollapsed));
}

function closeSidebar() {
  sidebar.classList.remove("show");
  sidebarBackdrop.classList.remove("show");
  sidebarToggle.setAttribute(
    "aria-expanded",
    String(!appShell.classList.contains("sidebar-collapsed")));
}

function setButtonLoading(button, spinner, icon, isLoading) {
  button.disabled = isLoading;
  spinner.classList.toggle("d-none", !isLoading);
  icon.classList.toggle("d-none", isLoading);
}

function formatDate(value) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "short",
    timeStyle: "medium"
  }).format(new Date(value));
}

function formatNumber(value) {
  return new Intl.NumberFormat().format(Number(value) || 0);
}

function formatPercent(value) {
  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  }).format(Number(value) || 0);
}

function debounce(callback, delayMs) {
  let timeoutId;

  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => callback(...args), delayMs);
  };
}

function slugify(value) {
  const slug = String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "category";
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function isHttpUrl(value) {
  if (!value) {
    return false;
  }

  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

autoRefreshToggle.addEventListener("click", toggleAutoRefresh);
runFullCheckButton.addEventListener("click", runFullCheck);
runGroupCheckButton.addEventListener("click", runSelectedGroupCheck);
groupCheckSelect.addEventListener("change", () => {
  runGroupCheckButton.disabled = !groupCheckSelect.value;
});
sidebarToggle.addEventListener("click", toggleSidebar);
sidebarBackdrop.addEventListener("click", closeSidebar);
navLinks.forEach(link => {
  link.addEventListener("click", event => {
    event.preventDefault();
    navigateTo(link.dataset.route);
  });
});
resultsBody.addEventListener("hidden.bs.collapse", event => {
  const categoryName = event.target.dataset.categoryName;

  if (categoryName) {
    expandedCategoryNames.delete(categoryName);
  }
});
resultsBody.addEventListener("shown.bs.collapse", event => {
  const categoryName = event.target.dataset.categoryName;

  if (categoryName) {
    expandedCategoryNames.add(categoryName);
  }
});
resultsBody.addEventListener("click", event => {
  const runCategoryButton = event.target.closest("[data-run-category]");

  if (runCategoryButton) {
    runGroupCheck(runCategoryButton.dataset.runCategory);
  }
});
searchInput.addEventListener("input", debounce(event => {
  activeSearch = event.target.value;
  renderFilteredCategories();
}, 150));
filterInputs.forEach(input => {
  input.addEventListener("change", event => {
    activeFilter = event.target.value;
    renderFilteredCategories();
  });
});
reloadConfigButton.addEventListener("click", reloadJson);
exportConfigButton.addEventListener("click", exportConfig);
importConfigButton.addEventListener("click", requestImportConfig);
importConfigFileInput.addEventListener("change", event => {
  importConfigFile(event.target.files?.[0]);
});
saveConfigButton.addEventListener("click", saveConfig);
configDeviceSearchInput.addEventListener("input", debounce(event => {
  activeConfigSearch = event.target.value;
  renderConfigDevices();
}, 150));
if (intervalSecondsInput) {
  intervalSecondsInput.addEventListener("input", () => {
    showConfigAlert("info", "Auto refresh interval changed locally. Click Save Settings to persist changes.");
  });
}
timeoutMsInput.addEventListener("input", () => {
  showConfigAlert("info", "Timeout changed locally. Click Save Settings to persist changes.");
});
maxParallelChecksInput.addEventListener("input", () => {
  showConfigAlert("info", "Parallel check limit changed locally. Click Save Settings to persist changes.");
});
addDeviceButton.addEventListener("click", startAddDevice);
deviceForm.addEventListener("submit", submitDevice);
resetDeviceFormButton.addEventListener("click", resetDeviceForm);
addCheckButton.addEventListener("click", () => addCheckRow({ type: "tcp", port: 80 }));
checksList.addEventListener("change", event => {
  if (event.target.matches("[data-check-type]")) {
    updateCheckPortState(event.target.closest(".check-row"));
  }
});
checksList.addEventListener("click", event => {
  const removeButton = event.target.closest("[data-remove-check]");

  if (removeButton) {
    removeButton.closest(".check-row").remove();
  }
});
configDevicesBody.addEventListener("click", event => {
  const categoryToggle = event.target.closest("[data-config-category-toggle]");
  const editButton = event.target.closest("[data-edit-device]");
  const deleteButton = event.target.closest("[data-delete-device]");

  if (categoryToggle) {
    toggleConfigCategory(categoryToggle);
    return;
  }

  if (editButton) {
    editDevice(Number(editButton.dataset.editDevice));
  }

  if (deleteButton) {
    requestDeleteDevice(Number(deleteButton.dataset.deleteDevice));
  }
});
confirmDeleteDeviceButton.addEventListener("click", confirmDeleteDevice);
if (deviceFormModalElement) {
  deviceFormModalElement.addEventListener("shown.bs.modal", () => {
    deviceNameInput.focus();
  });
}
window.addEventListener("popstate", () => navigateTo(location.pathname, true));

navigateTo(currentRoute, true);

function scheduleRefresh() {
  clearRefreshTimer();

  if (autoRefreshEnabled) {
    refreshTimer = setInterval(() => loadResults({ showErrors: false }), getAutoRefreshIntervalMs());
  }
}

function getAutoRefreshIntervalMs() {
  const intervalSeconds = Number(configState.settings?.intervalSeconds);
  const safeIntervalSeconds = Number.isInteger(intervalSeconds) && intervalSeconds > 0
    ? intervalSeconds
    : defaultAutoFullCheckIntervalSeconds;

  return safeIntervalSeconds * 1000;
}

function clearRefreshTimer() {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = undefined;
  }
}

function closeMonitorStream() {
  if (activeMonitorStream) {
    activeMonitorStream.close();
    activeMonitorStream = undefined;
  }
}
