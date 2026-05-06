const sidebar = document.querySelector("#sidebar");
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
const refreshNowButton = document.querySelector("#refresh-now");
const refreshNowSpinner = document.querySelector("#refresh-now-spinner");
const refreshNowIcon = document.querySelector("#refresh-now-icon");
const runFullCheckButton = document.querySelector("#run-full-check");
const runFullCheckSpinner = document.querySelector("#run-full-check-spinner");
const runFullCheckIcon = document.querySelector("#run-full-check-icon");
const searchInput = document.querySelector("#device-search");
const filterInputs = document.querySelectorAll("input[name='status-filter']");
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
const addDeviceButton = document.querySelector("#add-device");
const deviceForm = document.querySelector("#device-form");
const deviceFormTitle = document.querySelector("#device-form-title");
const editingDeviceIndex = document.querySelector("#editing-device-index");
const deviceNameInput = document.querySelector("#device-name");
const deviceAddressInput = document.querySelector("#device-address");
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
let latestCategories = [];
let activeFilter = "all";
let activeSearch = "";
let autoRefreshEnabled = false;
let latestIntervalSeconds = 15;
let currentRoute = normalizeRoute(location.pathname);
let hasLoadedDashboard = false;
let hasLoadedConfig = false;
let configState = createEmptyConfiguration();
let pendingDeleteIndex = null;
const expandedCategoryNames = new Set();

async function loadResults(options = {}) {
  const endpoint = options.forceRun ? "/api/monitor/run" : "/api/monitor/refresh";
  const method = options.forceRun ? "POST" : "GET";

  try {
    const response = await fetch(endpoint, { method });

    if (!response.ok) {
      throw new Error(`Request failed with ${response.status}`);
    }

    const payload = await response.json();
    renderMonitorPayload(payload);
    hasLoadedDashboard = true;
  } catch (error) {
    resultsBody.innerHTML = `
      <div class="text-center text-danger py-4">
        Unable to load monitoring results.
      </div>`;
    lastCheck.textContent = "Last execution failed";
    console.error(error);
  }
}

function renderMonitorPayload(payload) {
  latestCategories = payload.categories ?? groupResultsByCategory(payload.results ?? []);
  renderSummary(payload.summary ?? createSummaryFromCategories(latestCategories));
  renderFilteredCategories();
  latestIntervalSeconds = Math.max(1, Number(payload.settings?.intervalSeconds) || 15);
  scheduleRefresh();
  executionMode.textContent = autoRefreshEnabled ? "Auto refresh active" : "Manual mode";
  lastCheck.textContent = `Last execution: ${formatDate(payload.lastExecutionTime ?? payload.lastCheck)}`;
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
  const totalDevices = devices.length;
  const healthyDevices = devices.filter(device => device.status === "Healthy").length;
  const onlineDevices = devices.filter(device => device.isOnline).length;
  const offlineDevices = devices.filter(device => device.status === "Down").length;
  const degradedDevices = devices.filter(device => device.status === "Degraded").length;
  const availabilityPercentage = totalDevices === 0
    ? 0
    : Math.round((healthyDevices / totalDevices * 100) * 10) / 10;

  return {
    totalDevices,
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
    || String(device.ip ?? "").toLowerCase().includes(search);
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
                <th scope="col">IP</th>
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
      <td><code>${escapeHtml(result.ip)}</code></td>
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

    if (!response.ok) {
      throw new Error(`Reload failed with ${response.status}`);
    }

    await runFullCheck();
  } catch (error) {
    lastCheck.textContent = "JSON reload failed";
    console.error(error);
  } finally {
    reloadButton.disabled = false;
  }
}

async function refreshNow() {
  setButtonLoading(refreshNowButton, refreshNowSpinner, refreshNowIcon, true);

  try {
    await loadResults();
  } finally {
    setButtonLoading(refreshNowButton, refreshNowSpinner, refreshNowIcon, false);
  }
}

async function runFullCheck() {
  setButtonLoading(runFullCheckButton, runFullCheckSpinner, runFullCheckIcon, true);

  try {
    await loadResults({ forceRun: true });
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
  executionMode.textContent = autoRefreshEnabled ? "Auto refresh active" : "Manual mode";

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

    if (!response.ok) {
      throw new Error(`Request failed with ${response.status}`);
    }

    configState = await response.json();
    configState.devices ??= [];
    configState.settings ??= {
      intervalSeconds: 15,
      timeoutMs: 1000,
      maxParallelChecks: 50
    };
    hasLoadedConfig = true;
    renderConfigDevices();
    resetDeviceForm();
  } catch (error) {
    showConfigAlert("danger", "Unable to load configuration.");
    console.error(error);
  } finally {
    setConfigBusy(false);
  }
}

async function saveConfig() {
  setConfigBusy(true);
  clearConfigAlert();

  try {
    const response = await fetch("/api/config", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(configState)
    });

    const payload = await response.json().catch(() => ({}));

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

function renderConfigDevices() {
  const devices = configState.devices ?? [];

  if (devices.length === 0) {
    configDevicesBody.innerHTML = `
      <tr>
        <td colspan="4" class="text-center text-secondary py-4">No devices configured.</td>
      </tr>`;
    return;
  }

  configDevicesBody.innerHTML = devices.map((device, index) => `
    <tr>
      <td>
        <div class="fw-semibold">${escapeHtml(device.name)}</div>
        <div class="text-secondary small">${escapeHtml(device.category || "Uncategorized")}</div>
      </td>
      <td><code>${escapeHtml(device.ip)}</code></td>
      <td>${device.checks?.length ?? 0}</td>
      <td class="text-end">
        <button class="btn btn-outline-primary btn-sm" type="button" data-edit-device="${index}">
          <i class="fa-solid fa-pen-to-square me-1"></i>Edit
        </button>
        <button class="btn btn-outline-danger btn-sm" type="button" data-delete-device="${index}">
          <i class="fa-solid fa-trash me-1"></i>Delete
        </button>
      </td>
    </tr>`).join("");
}

function startAddDevice() {
  resetDeviceForm();
  deviceNameInput.focus();
}

function editDevice(index) {
  const device = configState.devices[index];

  if (!device) {
    return;
  }

  editingDeviceIndex.value = String(index);
  deviceFormTitle.textContent = "Edit Device";
  submitDeviceButton.textContent = "Update Device";
  deviceNameInput.value = device.name ?? "";
  deviceAddressInput.value = device.ip ?? "";
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
      maxParallelChecks: 50
    },
    devices: []
  };
}

function navigateTo(route, replace = false) {
  const normalizedRoute = normalizeRoute(route);
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
  sidebar.classList.toggle("show");
  sidebarBackdrop.classList.toggle("show");
}

function closeSidebar() {
  sidebar.classList.remove("show");
  sidebarBackdrop.classList.remove("show");
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
refreshNowButton.addEventListener("click", refreshNow);
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
  const editButton = event.target.closest("[data-edit-device]");
  const deleteButton = event.target.closest("[data-delete-device]");

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
    refreshTimer = setInterval(loadResults, latestIntervalSeconds * 1000);
  }
}

function clearRefreshTimer() {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = undefined;
  }
}
