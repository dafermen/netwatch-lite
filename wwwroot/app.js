const sidebar = document.querySelector("#sidebar");
const appShell = document.querySelector(".app-shell");
const sidebarBackdrop = document.querySelector("#sidebar-backdrop");
const sidebarToggle = document.querySelector("#sidebar-toggle");
const navLinks = document.querySelectorAll("[data-route]");
const currentPageLabel = document.querySelector("#current-page-label");

const dashboardPage = document.querySelector("#dashboard-page");
const configPage = document.querySelector("#config-page");
const resultsBody = document.querySelector("#results-body");
const lastCheck = document.querySelector("#last-check");
const executionMode = document.querySelector("#execution-mode");
const reloadButton = document.querySelector("#reload-json");
const autoRefreshToggle = document.querySelector("#auto-refresh-toggle");
const autoRefreshLabel = document.querySelector("#auto-refresh-label");
const runFullCheckButton = document.querySelector("#run-full-check");
const runFullCheckSpinner = document.querySelector("#run-full-check-spinner");
const runFullCheckIcon = document.querySelector("#run-full-check-icon");
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
const saveConfigButton = document.querySelector("#save-config");
const saveConfigSpinner = document.querySelector("#save-config-spinner");
const saveConfigIcon = document.querySelector("#save-config-icon");
const useHostnameForPingInput = document.querySelector("#use-hostname-for-ping");
const addDeviceButton = document.querySelector("#add-device");
const deviceForm = document.querySelector("#device-form");
const deviceFormTitle = document.querySelector("#device-form-title");
const editingDeviceIndex = document.querySelector("#editing-device-index");
const deviceNameInput = document.querySelector("#device-name");
const deviceAddressInput = document.querySelector("#device-address");
const deviceHostnameInput = document.querySelector("#device-hostname");
const deviceCategoryInput = document.querySelector("#device-category");
const deviceEnabledInput = document.querySelector("#device-enabled");
const checksList = document.querySelector("#checks-list");
const addCheckButton = document.querySelector("#add-check");
const resetDeviceFormButton = document.querySelector("#reset-device-form");
const submitDeviceButton = document.querySelector("#submit-device");
const deleteDeviceModalElement = document.querySelector("#delete-device-modal");
const deleteDeviceModal = new bootstrap.Modal(deleteDeviceModalElement);
const deleteDeviceName = document.querySelector("#delete-device-name");
const confirmDeleteDeviceButton = document.querySelector("#confirm-delete-device");

let refreshTimer;
let activeMonitorStream;
let latestResults = [];
let latestCategories = [];
let activeFilter = "all";
let activeSearch = "";
let autoRefreshEnabled = false;
let currentRoute = normalizeRoute(location.pathname);
let hasLoadedDashboard = false;
let hasLoadedConfig = false;
let configState = createEmptyConfiguration();
let pendingDeleteIndex = null;
const expandedCategoryNames = new Set();
const mobileSidebarQuery = window.matchMedia("(max-width: 991.98px)");
const autoFullCheckIntervalMs = 60_000;

function loadResults({ showErrors = true } = {}) {
  return streamFullCheck({ showErrors });
}

/**
 * Opens the Server-Sent Events monitoring stream and routes each event to the
 * dashboard renderer. This keeps large inventories responsive because each
 * device result is shown as soon as the backend finishes it.
 * @param {{ showErrors?: boolean }} options Controls whether stream errors are displayed in the dashboard.
 * @returns {Promise<void>} Resolves when the stream completes, reports busy, or fails.
 */
function streamFullCheck({ showErrors = true } = {}) {
  if (activeMonitorStream) {
    lastCheck.textContent = "A monitoring execution is already running.";
    return Promise.resolve();
  }

  return new Promise(resolve => {
    let settled = false;
    const source = new EventSource("/api/monitor/stream");
    activeMonitorStream = source;

    source.addEventListener("started", event => {
      const payload = JSON.parse(event.data);
      resetStreamingDashboard(payload);
    });

    source.addEventListener("result", event => {
      const payload = JSON.parse(event.data);
      renderStreamingResult(payload);
    });

    source.addEventListener("completed", event => {
      const payload = JSON.parse(event.data);
      closeMonitorStream();
      renderMonitorPayload({
        settings: payload.settings,
        summary: payload.summary,
        categories: payload.categories,
        results: payload.results,
        lastExecutionTime: payload.timestamp,
        lastCheck: payload.timestamp,
        executionStatus: payload.executionStatus
      });
      hasLoadedDashboard = true;
      settled = true;
      resolve();
    });

    source.addEventListener("busy", event => {
      const payload = JSON.parse(event.data);
      closeMonitorStream();
      lastCheck.textContent = payload.message || "A monitoring execution is already running.";
      settled = true;
      resolve();
    });

    source.onerror = error => {
      closeMonitorStream();

      if (showErrors && !settled) {
        resultsBody.innerHTML = `
          <div class="text-center text-danger py-4">
            Unable to stream monitoring results.
          </div>`;
        lastCheck.textContent = "Last execution failed";
      }

      console.error(error);
      settled = true;
      resolve();
    };
  });
}

function renderMonitorPayload(payload) {
  latestResults = payload.results ?? [];
  latestCategories = payload.categories ?? groupResultsByCategory(payload.results ?? []);
  renderSummary(payload.summary ?? createSummaryFromCategories(latestCategories));
  renderFilteredCategories();
  scheduleRefresh();
  executionMode.textContent = autoRefreshEnabled ? "Auto full check active" : "Manual mode";
  lastCheck.textContent = `Last execution: ${formatDate(payload.lastExecutionTime ?? payload.lastCheck)}`;
  updateProgressPanel(payload.results?.length ?? 0, payload.results?.length ?? 0, "Completed", false);
}

/**
 * Resets dashboard state when a new progressive monitoring run starts.
 * @param {object} payload The started event received from /api/monitor/stream.
 */
function resetStreamingDashboard(payload) {
  latestResults = [];
  latestCategories = [];
  renderSummary(payload.summary ?? createProgressSummary([], payload.totalDevices ?? 0));
  updateProgressPanel(0, Number(payload.totalDevices) || 0, "Checking devices...", true);
  resultsBody.innerHTML = `
    <div class="progress-panel text-secondary">
      <span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
      Checking devices 0/${Number(payload.totalDevices) || 0}...
    </div>`;
  executionMode.textContent = autoRefreshEnabled ? "Auto full check active" : "Manual mode";
  lastCheck.textContent = `Checking devices 0/${Number(payload.totalDevices) || 0}...`;
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
  renderSummary(payload.summary ?? createProgressSummary(latestResults, payload.totalDevices ?? latestResults.length));
  updateProgressPanel(payload.completedDevices, payload.totalDevices, "Checking devices...", true);
  renderFilteredCategories();
  lastCheck.textContent = `Checking devices ${payload.completedDevices}/${payload.totalDevices}...`;
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
    || String(device.hostname ?? "").toLowerCase().includes(search);
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
  const categoryId = `category-${index}-${slugify(category.name)}`;
  const isExpanded = expandedCategoryNames.has(category.name);

  return `
    <section class="category-section mb-4">
      <div class="category-header d-flex flex-wrap align-items-center justify-content-between gap-2">
        <div class="d-flex align-items-center gap-2">
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
            <span class="text-secondary small">${totalDevices} devices monitored</span>
          </div>
        </div>
        <div class="d-flex align-items-center gap-2">
          <span class="badge text-bg-success">
            <i class="fa-solid fa-check me-1"></i>${onlineDevices} online
          </span>
          <span class="badge text-bg-danger">
            <i class="fa-solid fa-xmark me-1"></i>${offlineDevices} offline
          </span>
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
  const statusClass = result.isOnline ? "text-bg-success" : "text-bg-danger";
  const statusIcon = result.isOnline ? "fa-check" : "fa-xmark";
  const statusText = result.isOnline
    ? `Online (${Number(result.latencyMs) || 0} ms)`
    : "Offline";

  return `
    <tr>
      <td class="fw-semibold">${escapeHtml(result.name)}</td>
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
      <td>${renderPorts(result.requestedPorts ?? [], result.openPorts ?? [])}</td>
      <td class="text-secondary small">${formatDate(result.lastCheck)}</td>
    </tr>`;
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

function renderPorts(requestedPorts, openPorts) {
  if (requestedPorts.length === 0) {
    return `<span class="text-secondary">No ports configured</span>`;
  }

  const openPortSet = new Set(openPorts);

  return requestedPorts.map(port => {
    const isOpen = openPortSet.has(port);
    const badgeClass = isOpen ? "text-bg-success" : "text-bg-danger";
    const icon = isOpen ? "fa-check" : "fa-xmark";
    const label = isOpen ? "open" : "closed";

    return `
      <span class="badge ${badgeClass} port-pill">
        <i class="fa-solid ${icon}"></i>
        ${port} ${label}
      </span>`;
  }).join("");
}

async function reloadJson() {
  reloadButton.disabled = true;

  try {
    const response = await fetch("/api/reload", { method: "POST" });
    const payload = await readJsonResponse(response);

    if (!response.ok) {
      throw new Error(payload.error || payload.detail || `Reload failed with ${response.status}`);
    }

    await runFullCheck();
  } catch (error) {
    lastCheck.textContent = `JSON reload failed: ${error.message}`;
    console.error(error);
  } finally {
    reloadButton.disabled = false;
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

function toggleAutoRefresh() {
  autoRefreshEnabled = !autoRefreshEnabled;
  autoRefreshToggle.classList.toggle("btn-success", autoRefreshEnabled);
  autoRefreshToggle.classList.toggle("btn-danger", !autoRefreshEnabled);
  autoRefreshLabel.textContent = autoRefreshEnabled
    ? "Auto Refresh: ON"
    : "Auto Refresh: OFF";
  executionMode.textContent = autoRefreshEnabled ? "Auto full check active" : "Manual mode";

  if (autoRefreshEnabled) {
    scheduleRefresh();
    return;
  }

  clearRefreshTimer();
}

async function loadConfig() {
  setConfigBusy(true);
  clearConfigAlert();

  try {
    const response = await fetch("/api/config");
    const payload = await readJsonResponse(response);

    if (!response.ok) {
      throw new Error(payload.error || `Unable to load configuration. HTTP ${response.status}`);
    }

    configState = payload;
    configState.devices ??= [];
    configState.settings ??= {
      intervalSeconds: 15,
      timeoutMs: 1000,
      maxParallelChecks: 50,
      useHostnameForPing: false
    };
    configState.settings.useHostnameForPing ??= false;
    useHostnameForPingInput.checked = Boolean(configState.settings.useHostnameForPing);
    hasLoadedConfig = true;
    renderConfigDevices();
    resetDeviceForm();
  } catch (error) {
    showConfigAlert("danger", error.message || "Unable to load configuration.");
    console.error(error);
  } finally {
    setConfigBusy(false);
  }
}

async function saveConfig() {
  setConfigBusy(true);
  clearConfigAlert();

  try {
    syncConfigSettingsFromUi();
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

    configState = payload.configuration;
    renderConfigDevices();
    resetDeviceForm();
    showConfigAlert("success", "Configuration saved. Previous config was backed up as config.backup.json.");
    await loadConfig();
  } catch (error) {
    showConfigAlert("danger", error.message || "Unable to save configuration.");
    console.error(error);
  } finally {
    setConfigBusy(false);
  }
}

async function readJsonResponse(response) {
  const text = await response.text();

  if (!text) {
    return {};
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Configuration API did not return JSON. Restart the application so the latest backend endpoints are loaded.");
  }
}

function renderConfigDevices() {
  const devices = configState.devices ?? [];

  if (devices.length === 0) {
    configDevicesBody.innerHTML = `
      <tr>
        <td colspan="5" class="text-center text-secondary py-4">No devices configured.</td>
      </tr>`;
    return;
  }

  configDevicesBody.innerHTML = groupConfigDevicesByCategory(devices)
    .map((group, groupIndex) => {
      const groupId = `config-category-${groupIndex}-${slugify(group.name)}`;

      return `
      <tr class="config-category-row">
        <td colspan="5">
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

/**
 * Groups configuration devices by category while preserving their original
 * array index so edit/delete actions still target the correct JSON entry.
 * @param {Array<object>} devices Devices from the editable configuration state.
 * @returns {Array<{name: string, devices: Array<{device: object, index: number}>}>} Sorted category groups.
 */
function groupConfigDevicesByCategory(devices) {
  const groups = new Map();

  devices.forEach((device, index) => {
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
  return `
    <tr class="config-device-row" data-config-category-row="${groupId}" hidden>
      <td>
        <div class="fw-semibold">${escapeHtml(device.name)}</div>
        <div class="text-secondary small">${device.enabled === false ? "Disabled" : "Enabled"}</div>
      </td>
      <td><code>${escapeHtml(device.ip)}</code></td>
      <td>${device.hostname ? `<code>${escapeHtml(device.hostname)}</code>` : `<span class="text-secondary">Not set</span>`}</td>
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

function submitDevice(event) {
  event.preventDefault();

  const device = readDeviceForm();
  const indexValue = editingDeviceIndex.value;

  if (!device) {
    return;
  }

  if (indexValue === "") {
    configState.devices.push(device);
    showConfigAlert("success", "Device added locally. Click Save Configuration to persist changes.");
  } else {
    configState.devices[Number(indexValue)] = device;
    showConfigAlert("success", "Device updated locally. Click Save Configuration to persist changes.");
  }

  renderConfigDevices();
  resetDeviceForm();
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

  return {
    name: deviceNameInput.value.trim(),
    ip: deviceAddressInput.value.trim(),
    hostname: deviceHostnameInput.value.trim() || null,
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
  deviceFormTitle.textContent = "Add Device";
  submitDeviceButton.textContent = "Add Device";
  checksList.innerHTML = "";
  addCheckRow({ type: "ping" });
  hideDeviceForm();
}

function showDeviceForm() {
  deviceForm.classList.remove("d-none");
}

function hideDeviceForm() {
  deviceForm.classList.add("d-none");
}

function syncConfigSettingsFromUi() {
  configState.settings ??= {
    intervalSeconds: 15,
    timeoutMs: 1000,
    maxParallelChecks: 50,
    useHostnameForPing: false
  };
  configState.settings.useHostnameForPing = useHostnameForPingInput.checked;
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
  deleteDeviceModal.show();
}

function confirmDeleteDevice() {
  if (pendingDeleteIndex === null) {
    return;
  }

  configState.devices.splice(pendingDeleteIndex, 1);
  pendingDeleteIndex = null;
  deleteDeviceModal.hide();
  renderConfigDevices();
  resetDeviceForm();
  showConfigAlert("success", "Device deleted locally. Click Save Configuration to persist changes.");
}

function setConfigBusy(isBusy) {
  saveConfigButton.disabled = isBusy;
  reloadConfigButton.disabled = isBusy;
  addDeviceButton.disabled = isBusy;
  useHostnameForPingInput.disabled = isBusy;
  deviceForm.querySelectorAll("input, select, button").forEach(element => {
    element.disabled = isBusy;
  });
  saveConfigSpinner.classList.toggle("d-none", !isBusy);
  saveConfigIcon.classList.toggle("d-none", isBusy);
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
      intervalSeconds: 15,
      timeoutMs: 1000,
      maxParallelChecks: 50,
      useHostnameForPing: false
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
  currentPageLabel.textContent = normalizedRoute === "/config" ? "Configuration" : "Dashboard";

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

  if (normalizedRoute === "/" && !hasLoadedDashboard) {
    loadResults();
  }

  if (normalizedRoute === "/config" && !hasLoadedConfig) {
    loadConfig();
  }
}

function normalizeRoute(pathname) {
  return pathname === "/config" ? "/config" : "/";
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

reloadButton.addEventListener("click", reloadJson);
autoRefreshToggle.addEventListener("click", toggleAutoRefresh);
runFullCheckButton.addEventListener("click", runFullCheck);
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
reloadConfigButton.addEventListener("click", loadConfig);
saveConfigButton.addEventListener("click", saveConfig);
useHostnameForPingInput.addEventListener("change", () => {
  syncConfigSettingsFromUi();
  showConfigAlert("info", "Ping mode changed locally. Click Save Configuration to persist changes.");
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
window.addEventListener("popstate", () => navigateTo(location.pathname, true));

navigateTo(currentRoute, true);

function scheduleRefresh() {
  clearRefreshTimer();

  if (autoRefreshEnabled) {
    refreshTimer = setInterval(() => loadResults({ showErrors: false }), autoFullCheckIntervalMs);
  }
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
