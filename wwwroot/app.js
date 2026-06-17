const sidebar = document.querySelector("#sidebar");
const appShell = document.querySelector(".app-shell");
const sidebarBackdrop = document.querySelector("#sidebar-backdrop");
const sidebarToggle = document.querySelector("#sidebar-toggle");
const navLinks = document.querySelectorAll("[data-route]");
const currentPageLabel = document.querySelector("#current-page-label");

const dashboardPage = document.querySelector("#dashboard-page");
const configPage = document.querySelector("#config-page");
const themesPage = document.querySelector("#themes-page");
const manualPage = document.querySelector("#manual-page");
const aboutPage = document.querySelector("#about-page");
const resultsBody = document.querySelector("#results-body");
const lastCheck = document.querySelector("#last-check");
const executionMode = document.querySelector("#execution-mode");
const autoRefreshToggle = document.querySelector("#auto-refresh-toggle");
const autoRefreshLabel = document.querySelector("#auto-refresh-label");
const facilityTabs = document.querySelector("#facility-tabs");
const activeFacilityLabel = document.querySelector("#active-facility-label");
const runFacilityCheckButton = document.querySelector("#run-facility-check");
const runFacilityCheckSpinner = document.querySelector("#run-facility-check-spinner");
const runFacilityCheckIcon = document.querySelector("#run-facility-check-icon");
const runFacilityCheckLabel = document.querySelector("#run-facility-check-label");
const groupCheckSelect = document.querySelector("#group-check-select");
const runGroupCheckButton = document.querySelector("#run-group-check");
const runGroupCheckSpinner = document.querySelector("#run-group-check-spinner");
const runGroupCheckIcon = document.querySelector("#run-group-check-icon");
const runFailedCheckButton = document.querySelector("#run-failed-check");
const runFailedCheckSpinner = document.querySelector("#run-failed-check-spinner");
const runFailedCheckIcon = document.querySelector("#run-failed-check-icon");
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
const retryCountInput = document.querySelector("#retry-count");
const retryDelayMsInput = document.querySelector("#retry-delay-ms");
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
const deviceFacilityInput = document.querySelector("#device-facility");
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
const themeAlert = document.querySelector("#theme-alert");
const themeSelect = document.querySelector("#theme-select");
const themeNameInput = document.querySelector("#theme-name");
const themeFormModalElement = document.querySelector("#theme-form-modal");
const themeFormModal = typeof bootstrap !== "undefined" && themeFormModalElement
  ? new bootstrap.Modal(themeFormModalElement)
  : null;
const themeForm = document.querySelector("#theme-form");
const themeFormTitle = document.querySelector("#theme-form-title");
const submitThemeButton = document.querySelector("#submit-theme");
const themeColorInputs = document.querySelectorAll("[data-theme-color]");
const newThemeButton = document.querySelector("#new-theme");
const copyThemeButton = document.querySelector("#copy-theme");
const renameThemeButton = document.querySelector("#rename-theme");
const resetThemesButton = document.querySelector("#reset-themes");
const saveThemesButton = document.querySelector("#save-themes");
const saveThemesSpinner = document.querySelector("#save-themes-spinner");
const saveThemesIcon = document.querySelector("#save-themes-icon");
const activateThemeButton = document.querySelector("#activate-theme");
const deleteThemeButton = document.querySelector("#delete-theme");
const themePreview = document.querySelector("#theme-preview");

let refreshTimer;
let activeMonitorStream;
let latestResults = [];
let latestCategories = [];
let activeFilter = "all";
let activeSearch = "";
let activeFacility = "";
let autoRefreshEnabled = false;
let hasCompletedFullCheck = false;
let activeRunFacility = "";
let activeRunCategory = "";
let activeRunDeviceName = "";
let activeRunDeviceIp = "";
let activeRunFailedIps = new Set();
let activeRunKeepsDashboardStable = false;
let activeRunPreservesDashboard = false;
let currentRoute = normalizeRoute(location.pathname);
let hasLoadedDashboardGroups = false;
let hasLoadedConfig = false;
let hasLoadedThemes = false;
let dashboardConfigStale = false;
let activeConfigSearch = "";
const defaultAutoFullCheckIntervalSeconds = 60;
const maxConfigImportBytes = 5 * 1024 * 1024;
let configState = createEmptyConfiguration();
let themeState = createDefaultThemeState();
let editingThemeId = "default";
let pendingThemeAction = "new";
let pendingThemeSourceId = "";
let pendingDeleteIndex = null;
const expandedFacilityNames = new Set();
const expandedCategoryNames = new Set();
const mobileSidebarQuery = window.matchMedia("(max-width: 991.98px)");
const themeCssVariables = {
  appBackground: "--nw-app-bg",
  surface: "--nw-surface",
  sidebarBackground: "--nw-sidebar-bg",
  sidebarText: "--nw-sidebar-text",
  primary: "--nw-primary",
  success: "--nw-success",
  warning: "--nw-warning",
  danger: "--nw-danger",
  text: "--nw-text",
  mutedText: "--nw-muted-text",
  border: "--nw-border",
  categoryHealthy: "--nw-category-healthy",
  categoryDegraded: "--nw-category-degraded",
  categoryProblem: "--nw-category-problem",
  categoryRunning: "--nw-category-running",
  configFacilityHeader: "--nw-config-facility-header",
  configFacilityText: "--nw-config-facility-text",
  configCategoryHeader: "--nw-config-category-header",
  configCategoryText: "--nw-config-category-text",
  autoRefreshOn: "--nw-auto-refresh-on",
  autoRefreshOff: "--nw-auto-refresh-off",
  runFullCheck: "--nw-run-full-check"
};

async function loadResults({ showErrors = true, facility = "", category = "", device = null, devices = [], reloadConfig = true } = {}) {
  if (!activeMonitorStream && reloadConfig) {
    try {
      await refreshConfigurationForRun();
    } catch (error) {
      if (showErrors) {
        lastCheck.textContent = error.message || "Unable to refresh configuration before running checks.";
      }
      console.error(error);
      return;
    }
  }

  return streamFullCheck({ showErrors, facility, category, device, devices });
}

/**
 * Opens the Server-Sent Events monitoring stream and routes each event to the
 * dashboard renderer. This keeps large inventories responsive because each
 * device result is shown as soon as the backend finishes it.
 * @param {{ showErrors?: boolean, facility?: string, category?: string, device?: object | null, devices?: Array<object> }} options Controls whether stream errors are displayed and optional execution scope.
 * @returns {Promise<void>} Resolves when the stream completes, reports busy, or fails.
 */
function streamFullCheck({ showErrors = true, facility = "", category = "", device = null, devices = [] } = {}) {
  if (activeMonitorStream) {
    lastCheck.textContent = "A monitoring execution is already running.";
    return Promise.resolve();
  }

  return new Promise(resolve => {
    let settled = false;
    const streamParams = new URLSearchParams();

    if (facility) {
      streamParams.set("facility", facility);
    }

    if (category) {
      streamParams.set("category", category);
    }

    if (device?.name) {
      streamParams.set("deviceName", device.name);
    }

    if (device?.ip) {
      streamParams.set("deviceIp", device.ip);
    }

    for (const scopedDevice of devices) {
      if (scopedDevice?.ip) {
        streamParams.append("deviceIp", scopedDevice.ip);
      }
    }

    const streamUrl = streamParams.toString()
      ? `/api/monitor/stream?${streamParams}`
      : "/api/monitor/stream";
    const source = new EventSource(streamUrl);
    activeMonitorStream = source;

    source.addEventListener("started", event => {
      const payload = JSON.parse(event.data);
      activeRunFacility = facility;
      activeRunCategory = category;
      activeRunDeviceName = device?.name || "";
      activeRunDeviceIp = device?.ip || "";
      activeRunFailedIps = new Set(devices.map(scopedDevice => scopedDevice.ip).filter(Boolean));
      activeRunKeepsDashboardStable = Boolean((facility || category || device || devices.length > 0) && latestResults.length > 0);
      activeRunPreservesDashboard = Boolean(!facility && !category && !device && devices.length === 0 && autoRefreshEnabled && latestResults.length > 0);
      resetStreamingDashboard(payload, getExecutionScopeLabel(facility, category, device, devices));
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

      if (devices.length > 0) {
        renderScopedDevicesPayload(completedPayload, devices);
      } else if (device) {
        renderScopedDevicePayload(completedPayload, device);
      } else if (facility || category) {
        renderScopedMonitorPayload(completedPayload, { facility, category });
      } else {
        hasCompletedFullCheck = true;
        expandedFacilityNames.clear();
        expandedCategoryNames.clear();
        renderMonitorPayload(completedPayload);
      }

      activeRunFacility = "";
      activeRunCategory = "";
      activeRunDeviceName = "";
      activeRunDeviceIp = "";
      activeRunFailedIps = new Set();
      activeRunKeepsDashboardStable = false;
      activeRunPreservesDashboard = false;
      settled = true;
      resolve();
    });

    source.addEventListener("busy", event => {
      const payload = JSON.parse(event.data);
      closeMonitorStream();
      activeRunFacility = "";
      activeRunCategory = "";
      activeRunDeviceName = "";
      activeRunDeviceIp = "";
      activeRunFailedIps = new Set();
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
        getExecutionScopeLabel(facility, category, device, devices),
        showErrors);
      settled = true;
      resolve();
    });

    source.onerror = error => {
      if (settled) {
        return;
      }

      handleMonitorStreamFailure("Unable to stream monitoring results.", getExecutionScopeLabel(facility, category, device, devices), showErrors);

      console.error(error);
      settled = true;
      resolve();
    };
  });
}

function handleMonitorStreamFailure(message, scopeLabel, showErrors) {
  const keepDashboardStable = activeRunKeepsDashboardStable
    || activeRunPreservesDashboard
    || Boolean(scopeLabel && latestResults.length > 0);

  closeMonitorStream();
  activeRunFacility = "";
  activeRunCategory = "";
  activeRunDeviceName = "";
  activeRunDeviceIp = "";
  activeRunFailedIps = new Set();
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
  renderFacilityTabs();
  renderSummary(createSummaryFromResults(getVisibleResults()));
  renderFilteredCategories();
  updateRunFailedButton();
  scheduleRefresh();
  executionMode.textContent = autoRefreshEnabled ? "Auto full check active" : "Manual mode";
  lastCheck.textContent = `Last execution: ${formatDate(payload.lastExecutionTime ?? payload.lastCheck)}`;
  updateProgressPanel(payload.results?.length ?? 0, payload.results?.length ?? 0, "Completed", false);
}

function renderScopedMonitorPayload(payload, { facility = "", category = "" } = {}) {
  const scopedResults = payload.results ?? [];
  const scopedFacility = facility.toLowerCase();
  const scopedCategory = category.toLowerCase();
  const remainingResults = latestResults.filter(result => {
    const matchesFacility = scopedFacility
      && String(result.facility ?? "Unassigned").toLowerCase() === scopedFacility;
    const matchesCategory = scopedCategory
      && String(result.category ?? "Uncategorized").toLowerCase() === scopedCategory;

    if (scopedFacility && scopedCategory) {
      return !(matchesFacility && matchesCategory);
    }

    return scopedFacility ? !matchesFacility : !matchesCategory;
  });

  latestResults = [...remainingResults, ...scopedResults];
  latestCategories = groupResultsByCategory(latestResults);
  hasCompletedFullCheck = true;
  activeRunFacility = "";
  activeRunCategory = "";
  renderFacilityTabs();
  renderSummary(createSummaryFromResults(getVisibleResults()));
  renderFilteredCategories();
  updateRunFailedButton();
  executionMode.textContent = autoRefreshEnabled ? "Auto full check active" : "Manual mode";
  lastCheck.textContent = `Last ${facility || category} execution: ${formatDate(payload.lastExecutionTime ?? payload.lastCheck)}`;
  updateProgressPanel(scopedResults.length, scopedResults.length, "Completed", false);
  activeRunKeepsDashboardStable = false;
}

function renderScopedDevicesPayload(payload, requestedDevices) {
  const scopedResults = payload.results ?? [];

  for (const result of scopedResults) {
    upsertLatestResult(result);
  }

  latestCategories = groupResultsByCategory(latestResults);
  hasCompletedFullCheck = true;
  renderFacilityTabs();
  activeRunCategory = "";
  activeRunDeviceName = "";
  activeRunDeviceIp = "";
  activeRunFailedIps = new Set();
  renderSummary(createSummaryFromResults(getVisibleResults()));
  renderFilteredCategories();
  updateRunFailedButton();
  executionMode.textContent = autoRefreshEnabled ? "Auto full check active" : "Manual mode";
  lastCheck.textContent = `Last failed-device retry: ${formatDate(payload.lastExecutionTime ?? payload.lastCheck)}`;
  updateProgressPanel(scopedResults.length, requestedDevices.length, "Completed", false);
  activeRunKeepsDashboardStable = false;
}

function renderScopedDevicePayload(payload, requestedDevice) {
  const scopedResults = payload.results ?? [];
  const result = scopedResults[0];

  if (result) {
    upsertLatestResult(result);
  } else {
    lastCheck.textContent = `No enabled device matched ${requestedDevice.name}.`;
  }

  latestCategories = groupResultsByCategory(latestResults);
  hasCompletedFullCheck = true;
  renderFacilityTabs();
  activeRunCategory = "";
  activeRunDeviceName = "";
  activeRunDeviceIp = "";
  renderSummary(createSummaryFromResults(getVisibleResults()));
  renderFilteredCategories();
  executionMode.textContent = autoRefreshEnabled ? "Auto full check active" : "Manual mode";
  lastCheck.textContent = result
    ? `Last ${result.name} execution: ${formatDate(payload.lastExecutionTime ?? payload.lastCheck)}`
    : lastCheck.textContent;
  updateProgressPanel(scopedResults.length, scopedResults.length, "Completed", false);
  activeRunKeepsDashboardStable = false;
}

/**
 * Resets dashboard state when a new progressive monitoring run starts.
 * @param {object} payload The started event received from /api/monitor/stream.
 */
function resetStreamingDashboard(payload, scopeLabel = "") {
  const scopedRun = Boolean(scopeLabel);
  const targetLabel = scopeLabel || "devices";

  if (!scopedRun) {
    if (!activeRunPreservesDashboard) {
      hasCompletedFullCheck = false;
      latestResults = [];
      latestCategories = [];
    }
  }

  renderSummary((scopedRun && latestResults.length > 0) || activeRunPreservesDashboard
    ? createSummaryFromResults(getVisibleResults())
    : payload.summary ?? createProgressSummary([], payload.totalDevices ?? 0));
  if (activeRunKeepsDashboardStable) {
    monitorProgress.hidden = true;
  } else {
    updateProgressPanel(0, Number(payload.totalDevices) || 0, `Checking ${targetLabel}...`, true);
  }

  if ((scopedRun && latestResults.length > 0) || activeRunPreservesDashboard) {
    renderFilteredCategories();
  } else {
    resultsBody.innerHTML = `
      <div class="progress-panel text-secondary">
        <span class="spinner-border spinner-border-sm me-2" aria-hidden="true"></span>
        Checking ${escapeHtml(targetLabel)} 0/${Number(payload.totalDevices) || 0}...
      </div>`;
  }

  executionMode.textContent = autoRefreshEnabled ? "Auto full check active" : "Manual mode";
  lastCheck.textContent = `Checking ${targetLabel} 0/${Number(payload.totalDevices) || 0}...`;
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
  renderFacilityTabs();
  renderSummary(activeRunFacility || activeRunCategory || activeRunDeviceName || activeRunFailedIps.size > 0 || activeRunPreservesDashboard
    ? createSummaryFromResults(getVisibleResults())
    : payload.summary ?? createProgressSummary(latestResults, payload.totalDevices ?? latestResults.length));
  if (activeRunKeepsDashboardStable) {
    monitorProgress.hidden = true;
  } else {
    updateProgressPanel(
      payload.completedDevices,
      payload.totalDevices,
      activeRunFailedIps.size > 0
        ? "Checking failed devices..."
        : activeRunDeviceName
        ? `Checking ${activeRunDeviceName}...`
        : activeRunFacility
        ? `Checking ${activeRunFacility} devices...`
        : activeRunCategory ? `Checking ${activeRunCategory} devices...` : "Checking devices...",
      true);
  }
  renderFilteredCategories();
  updateRunFailedButton();
  lastCheck.textContent = activeRunFailedIps.size > 0
    ? `Checking failed devices ${payload.completedDevices}/${payload.totalDevices}...`
    : activeRunDeviceName
    ? `Checking ${activeRunDeviceName} ${payload.completedDevices}/${payload.totalDevices}...`
    : activeRunFacility
    ? `Checking ${activeRunFacility} devices ${payload.completedDevices}/${payload.totalDevices}...`
    : activeRunCategory
    ? `Checking ${activeRunCategory} devices ${payload.completedDevices}/${payload.totalDevices}...`
    : `Checking devices ${payload.completedDevices}/${payload.totalDevices}...`;
}

/**
 * Inserts or replaces a device result in the current dashboard state.
 * @param {object} result Completed device result received from the backend stream.
 */
function upsertLatestResult(result) {
  const resultKey = createDeviceKey(result);
  const resultIndex = latestResults.findIndex(device => createDeviceKey(device) === resultKey);

  if (resultIndex >= 0) {
    latestResults[resultIndex] = result;
    return;
  }

  latestResults.push(result);
}

function getProblemDevices() {
  return getVisibleResults().filter(result =>
    result.status === "Degraded" || result.status === "Down");
}

function updateRunFailedButton() {
  const problemCount = getProblemDevices().length;
  runFailedCheckButton.hidden = problemCount === 0;

  if (problemCount > 0) {
    runFailedCheckButton.title = `Run ${problemCount} failed device${problemCount === 1 ? "" : "s"}`;
  }
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

function createSummaryFromResults(results) {
  return createProgressSummary(results, results.length);
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
  renderSummary(createSummaryFromResults(getVisibleResults()));
  renderFacilityTabs();
  const visibleResults = getVisibleResults();

  if (activeFacility) {
    renderCategories(filterCategories(groupResultsByCategory(visibleResults)), activeFacility);
    return;
  }

  renderFacilities(groupResultsByFacility(visibleResults));
}

function getVisibleResults() {
  if (!activeFacility) {
    return latestResults;
  }

  const selectedFacility = activeFacility.toLowerCase();
  return latestResults.filter(result =>
    String(result.facility ?? "Unassigned").toLowerCase() === selectedFacility);
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
    || String(device.facility ?? "").toLowerCase().includes(search)
    || String(device.category ?? "").toLowerCase().includes(search)
    || String(device.websiteUrl ?? "").toLowerCase().includes(search);
}

function renderFacilityTabs() {
  const facilitySource = latestResults.length > 0 ? latestResults : getConfiguredFacilityDevices();
  const facilitySummaries = getFacilitySummaries(facilitySource);

  if (!facilitySummaries.some(facility => facility.name === activeFacility)) {
    activeFacility = "";
  }

  const hasActiveFacility = Boolean(activeFacility);
  activeFacilityLabel.textContent = activeFacility
    ? `Showing ${activeFacility}`
    : "Showing all facilities";
  runFacilityCheckButton.disabled = false;
  runFacilityCheckButton.title = activeFacility
    ? `Run checks for ${activeFacility}`
    : "Run checks for all facilities";
  runFacilityCheckLabel.textContent = activeFacility
    ? "Run Facility"
    : "Run All Facilities";

  facilityTabs.innerHTML = [
    renderFacilityButton({
      name: "",
      label: "All Facilities",
      totalDevices: facilitySource.length,
      onlineDevices: facilitySource.filter(device => device.isOnline).length,
      problemDevices: facilitySource.filter(device => device.status === "Degraded" || device.status === "Down").length
    }, !hasActiveFacility),
    ...facilitySummaries.map(facility => renderFacilityButton(facility, facility.name === activeFacility))
  ].join("");
}

function getConfiguredFacilityDevices() {
  return (configState.devices ?? [])
    .filter(device => device.enabled !== false)
    .map(device => ({
      ...device,
      facility: device.facility || "Unassigned",
      isOnline: false,
      status: "Pending"
    }));
}

function getFacilitySummaries(results) {
  const groups = new Map();

  for (const result of results) {
    const facilityName = result.facility || "Unassigned";

    if (!groups.has(facilityName)) {
      groups.set(facilityName, []);
    }

    groups.get(facilityName).push(result);
  }

  return Array.from(groups.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, devices]) => ({
      name,
      label: name,
      totalDevices: devices.length,
      onlineDevices: devices.filter(device => device.isOnline).length,
      problemDevices: devices.filter(device => device.status === "Degraded" || device.status === "Down").length
    }));
}

function renderFacilityButton(facility, isActive) {
  const problemClass = facility.problemDevices > 0 ? "facility-tab-problem" : "facility-tab-healthy";
  const activeClass = isActive ? "active" : "";
  const value = facility.name || "";

  return `
    <button
      class="facility-tab ${activeClass} ${problemClass}"
      type="button"
      data-facility-filter="${escapeHtml(value)}">
      <span class="facility-tab-name">${escapeHtml(facility.label)}</span>
      <span class="facility-tab-meta">${facility.totalDevices} devices</span>
      <span class="facility-tab-status">${facility.onlineDevices} online / ${facility.problemDevices} issues</span>
    </button>`;
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

function renderFacilities(facilities) {
  const filteredFacilities = facilities
    .map(facility => ({
      ...facility,
      categories: filterCategories(facility.categories)
    }))
    .filter(facility => facility.categories.length > 0);

  if (filteredFacilities.length === 0) {
    resultsBody.innerHTML = `
      <div class="text-center text-secondary py-4">
        No devices match the current filters.
      </div>`;
    return;
  }

  resultsBody.innerHTML = filteredFacilities.map(renderFacilitySection).join("");
}

function renderFacilitySection(facility, facilityIndex) {
  const totalDevices = facility.categories.reduce((total, category) => total + (category.totalDevices ?? 0), 0);
  const onlineDevices = facility.categories.reduce((total, category) => total + (category.onlineDevices ?? 0), 0);
  const offlineDevices = totalDevices - onlineDevices;
  const problemDevices = facility.categories
    .flatMap(category => category.stateDevices ?? category.devices ?? [])
    .filter(device => device.status === "Degraded" || device.status === "Down")
    .length;
  const isRunningFacility = activeRunFacility
    && !activeRunCategory
    && !activeRunDeviceName
    && activeRunFacility.toLowerCase() === String(facility.name ?? "").toLowerCase();
  const isHealthyFacility = problemDevices === 0;
  const facilityKey = facility.name || "Unassigned";
  const facilityId = `facility-${facilityIndex}-${slugify(facilityKey)}`;
  const isExpanded = expandedFacilityNames.has(facilityKey);
  const expandedClass = isExpanded ? "facility-section-expanded" : "";
  const statusClass = isRunningFacility
    ? "text-bg-secondary"
    : isHealthyFacility ? "text-bg-success" : "text-bg-warning";
  const statusText = isRunningFacility
    ? "Checking"
    : isHealthyFacility ? "Healthy" : `${problemDevices} issues`;
  const statusIcon = isRunningFacility
    ? "fa-spinner fa-spin"
    : isHealthyFacility ? "fa-circle-check" : "fa-triangle-exclamation";

  return `
    <section class="facility-section ${expandedClass} mb-2">
      <div class="facility-section-header">
        <div class="d-flex align-items-center gap-2 min-w-0">
          <button
            class="btn btn-sm btn-outline-secondary facility-toggle"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#${facilityId}"
            aria-expanded="${isExpanded}"
            aria-controls="${facilityId}">
            <i class="fa-solid fa-chevron-down"></i>
          </button>
          <div class="min-w-0">
            <h2 class="facility-title mb-0">${escapeHtml(facility.name)}</h2>
            <span class="facility-subtitle small">${totalDevices} devices / ${facility.categories.length} categories</span>
          </div>
        </div>
        <div class="facility-section-summary">
          <span class="badge ${statusClass}">
            <i class="fa-solid ${statusIcon} me-1"></i>${statusText}
          </span>
          <span class="facility-counts">${onlineDevices} online / ${offlineDevices} offline</span>
          <button
            class="btn btn-sm btn-outline-primary facility-run-button"
            type="button"
            data-run-facility-only="${escapeHtml(facility.name)}">
            <i class="fa-solid fa-play me-1"></i>Run
          </button>
        </div>
      </div>
      <div
        class="collapse ${isExpanded ? "show" : ""}"
        id="${facilityId}"
        data-facility-key="${escapeHtml(facilityKey)}">
        <div class="facility-category-stack">
          ${facility.categories.map((category, categoryIndex) =>
            renderCategory(category, `${facilityIndex}-${categoryIndex}`, facility.name)).join("")}
        </div>
      </div>
    </section>`;
}

function renderCategories(categories, facilityName = "") {
  if (categories.length === 0) {
    resultsBody.innerHTML = `
      <div class="text-center text-secondary py-4">
        No devices match the current filters.
      </div>`;
    return;
  }

  resultsBody.innerHTML = categories.map((category, index) => renderCategory(category, index, facilityName)).join("");
}

function renderCategory(category, index, facilityName = "") {
  const devices = category.devices ?? [];
  const totalDevices = category.totalDevices ?? devices.length;
  const onlineDevices = category.onlineDevices ?? devices.filter(device => device.isOnline).length;
  const offlineDevices = category.offlineDevices ?? totalDevices - onlineDevices;
  const stateDevices = category.stateDevices ?? devices;
  const stateTotalDevices = stateDevices.length;
  const healthyDevices = stateDevices.filter(device => device.status === "Healthy").length;
  const problemDevices = stateDevices.filter(device => device.status === "Degraded" || device.status === "Down").length;
  const downDevices = stateDevices.filter(device => device.status === "Down").length;
  const categoryPercent = stateTotalDevices === 0 ? 100 : Math.round((healthyDevices / stateTotalDevices) * 100);
  const isHealthyCategory = stateTotalDevices > 0 && problemDevices === 0 && healthyDevices === stateTotalDevices;
  const isDegradedCategory = problemDevices > 0 && downDevices === 0;
  const categoryFacility = facilityName || activeFacility || "";
  const isRunningCategory = activeRunCategory
    && activeRunCategory.toLowerCase() === String(category.name ?? "").toLowerCase()
    && (!activeRunFacility || !categoryFacility || activeRunFacility.toLowerCase() === categoryFacility.toLowerCase());
  const stateClass = isRunningCategory
    ? "category-section-running"
    : hasCompletedFullCheck
    ? isHealthyCategory ? "category-section-healthy" : isDegradedCategory ? "category-section-degraded" : "category-section-problem"
    : "category-section-running";
  const stateIcon = isRunningCategory
    ? "fa-spinner fa-spin"
    : hasCompletedFullCheck
    ? isHealthyCategory ? "fa-circle-check" : isDegradedCategory ? "fa-triangle-exclamation" : "fa-circle-xmark"
    : "fa-spinner fa-spin";
  const stateLabel = isRunningCategory
    ? "Checking"
    : hasCompletedFullCheck
    ? isHealthyCategory ? "Healthy" : "Needs attention"
    : "Checking";
  const categoryKey = createCategoryKey(categoryFacility, category.name);
  const categoryId = `category-${index}-${slugify(categoryFacility)}-${slugify(category.name)}`;
  const isExpanded = expandedCategoryNames.has(categoryKey);
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
          <button
            class="btn btn-sm btn-light category-run-button"
            type="button"
            data-run-category="${escapeHtml(category.name)}"
            data-run-facility="${escapeHtml(categoryFacility)}">
            <i class="fa-solid fa-play me-1"></i>Run
          </button>
        </div>
      </div>
      <div
        class="collapse ${isExpanded ? "show" : ""}"
        id="${categoryId}"
        data-category-key="${escapeHtml(categoryKey)}">
        <div class="table-responsive border rounded-bottom">
          <table class="table table-hover align-middle mb-0">
            <thead class="table-light">
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Address</th>
                <th scope="col">Status</th>
                <th scope="col">Ping status</th>
                <th scope="col">Ports status</th>
                <th scope="col" class="text-end">Checked</th>
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
  const hasProblem = result.status === "Degraded" || result.status === "Down";
  const isRunningDevice = isActiveRunDevice(result);
  const isRunningFailedDevice = activeRunFailedIps.has(result.ip);
  const statusClass = isPingAvailable ? "text-bg-success" : "text-bg-danger";
  const statusIcon = isPingAvailable ? "fa-check" : "fa-xmark";
  const statusText = isPingAvailable
    ? `Ping OK (${Number(pingCheck.latencyMs) || 0} ms)`
    : hasPingCheck ? formatPingFailureText(pingCheck) : "No ping check";
  const pingTitle = hasPingCheck
    ? `Target: ${result.pingTarget || result.ip}; Status: ${pingCheck.status || "Unknown"}; Timeout: ${configState.settings?.timeoutMs || "configured"} ms`
    : "No ping check is configured for this device.";

  return `
    <tr>
      <td class="fw-semibold">
        <div>${escapeHtml(result.name)}</div>
        ${!activeFacility ? `<div class="text-secondary small">${escapeHtml(result.facility || "Unassigned")} · ${escapeHtml(result.category || "Uncategorized")}</div>` : ""}
        ${renderWebsiteLink(result.websiteUrl)}
      </td>
      <td>
        <code>${escapeHtml(result.ip)}</code>
        ${result.hostname ? `<div class="text-secondary small">${escapeHtml(result.hostname)}</div>` : ""}
      </td>
      <td>${renderDeviceStatus(result.status)}</td>
      <td>
        <span class="badge ${statusClass} status-badge" title="${escapeHtml(pingTitle)}">
          <i class="fa-solid ${statusIcon} me-1"></i>${statusText}
        </span>
      </td>
      <td>${renderPorts(result)}</td>
      <td class="text-end">
        <div class="device-check-actions">
          <span class="text-secondary small">${formatDate(result.lastCheck)}</span>
          ${hasProblem || isRunningDevice || isRunningFailedDevice
            ? renderDeviceRunButton(result, isRunningDevice || isRunningFailedDevice)
            : ""}
        </div>
      </td>
    </tr>`;
}

function renderDeviceRunButton(result, isRunning = false) {
  return `
    <button
      class="btn ${isRunning ? "btn-primary" : "btn-outline-primary"} btn-sm device-run-button"
      type="button"
      title="${isRunning ? "This device is being checked" : "Run only this device"}"
      ${isRunning ? "disabled" : ""}
      data-run-device-name="${escapeHtml(result.name)}"
      data-run-device-ip="${escapeHtml(result.ip)}"
      data-run-device-facility="${escapeHtml(result.facility || "")}"
      data-run-device-category="${escapeHtml(result.category || "")}">
      ${isRunning
        ? `<span class="spinner-border spinner-border-sm me-1" aria-hidden="true"></span>Checking`
        : `<i class="fa-solid fa-rotate-right me-1"></i>Run`}
    </button>`;
}

function isActiveRunDevice(result) {
  return Boolean(activeRunDeviceName && activeRunDeviceIp)
    && result.name === activeRunDeviceName
    && result.ip === activeRunDeviceIp
    && (!activeRunFacility || activeRunFacility === (result.facility || "Unassigned"));
}

function formatPingFailureText(pingCheck) {
  const status = String(pingCheck.status || "").trim();

  if (status && status !== "Unknown") {
    return `Ping ${status}`;
  }

  return "Ping failed";
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
      devices: devices.sort(compareDevices)
    }));
}

function groupResultsByFacility(results) {
  const groups = new Map();

  for (const result of results) {
    const facilityName = result.facility || "Unassigned";

    if (!groups.has(facilityName)) {
      groups.set(facilityName, []);
    }

    groups.get(facilityName).push(result);
  }

  return Array.from(groups.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, devices]) => ({
      name,
      categories: groupResultsByCategory(devices)
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
    markDashboardConfigurationStale();
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
    markDashboardConfigurationStale();
    showConfigAlert("success", `Imported config.json. ${formatNumber(payload.count)} devices loaded.`);
  } catch (error) {
    showConfigAlert("danger", `JSON import failed: ${error.message}`);
    console.error(error);
  } finally {
    setConfigBusy(false, { showSaveSpinner: false });
  }
}

async function runFullCheck() {
  await loadResults();
}

async function runSelectedFacilityCheck() {
  await runFacilityCheck(activeFacility);
}

async function runFacilityCheck(facility = "") {
  const isSelectedFacilityRun = facility === activeFacility;
  const previousRunFacility = activeRunFacility;
  activeRunFacility = facility || "";
  if (isSelectedFacilityRun) {
    setButtonLoading(runFacilityCheckButton, runFacilityCheckSpinner, runFacilityCheckIcon, true);
  } else {
    runFacilityCheckButton.disabled = true;
  }
  runGroupCheckButton.disabled = true;
  runFailedCheckButton.disabled = true;
  renderFilteredCategories();
  setDashboardRunButtonsDisabled(true);

  try {
    await loadResults({ facility: facility || "" });
  } finally {
    activeRunFacility = previousRunFacility;
    if (isSelectedFacilityRun) {
      setButtonLoading(runFacilityCheckButton, runFacilityCheckSpinner, runFacilityCheckIcon, false);
    }
    runFacilityCheckButton.disabled = false;
    runGroupCheckButton.disabled = !groupCheckSelect.value;
    runFailedCheckButton.disabled = false;
    setDashboardRunButtonsDisabled(false);
    if (!isSelectedFacilityRun) {
      renderFilteredCategories();
    }
  }
}

async function runSelectedGroupCheck() {
  const category = groupCheckSelect.value;

  if (!category) {
    return;
  }

  await runGroupCheck(category);
}

async function runGroupCheck(category, facility = activeFacility) {
  const previousRunFacility = activeRunFacility;
  activeRunFacility = facility || "";
  setButtonLoading(runGroupCheckButton, runGroupCheckSpinner, runGroupCheckIcon, true);
  runFacilityCheckButton.disabled = true;
  runFailedCheckButton.disabled = true;
  setDashboardRunButtonsDisabled(true);

  try {
    await loadResults({ facility, category });
  } finally {
    activeRunFacility = previousRunFacility;
    setButtonLoading(runGroupCheckButton, runGroupCheckSpinner, runGroupCheckIcon, false);
    runGroupCheckButton.disabled = !groupCheckSelect.value;
    runFacilityCheckButton.disabled = false;
    runFailedCheckButton.disabled = false;
    setDashboardRunButtonsDisabled(false);
  }
}

async function runDeviceCheck(device) {
  if (!device?.name || !device?.ip) {
    return;
  }

  activeRunDeviceName = device.name;
  activeRunDeviceIp = device.ip;
  activeRunFacility = device.facility || "";
  runFacilityCheckButton.disabled = true;
  runGroupCheckButton.disabled = true;
  runFailedCheckButton.disabled = true;
  renderFilteredCategories();
  setOtherDashboardRunButtonsDisabled(true, device);

  try {
    await loadResults({ facility: device.facility || "", device });
  } finally {
    activeRunDeviceName = "";
    activeRunDeviceIp = "";
    activeRunFacility = "";
    runFacilityCheckButton.disabled = false;
    runGroupCheckButton.disabled = !groupCheckSelect.value;
    runFailedCheckButton.disabled = false;
    setOtherDashboardRunButtonsDisabled(false);
    renderFilteredCategories();
  }
}

async function runFailedChecks() {
  const failedDevices = getProblemDevices();

  if (failedDevices.length === 0) {
    updateRunFailedButton();
    return;
  }

  activeRunFailedIps = new Set(failedDevices.map(device => device.ip));
  setButtonLoading(runFailedCheckButton, runFailedCheckSpinner, runFailedCheckIcon, true);
  runFacilityCheckButton.disabled = true;
  runGroupCheckButton.disabled = true;
  renderFilteredCategories();
  setOtherDashboardRunButtonsDisabled(true);

  try {
    await loadResults({ devices: failedDevices });
  } finally {
    activeRunFailedIps = new Set();
    setButtonLoading(runFailedCheckButton, runFailedCheckSpinner, runFailedCheckIcon, false);
    runFacilityCheckButton.disabled = false;
    runGroupCheckButton.disabled = !groupCheckSelect.value;
    setOtherDashboardRunButtonsDisabled(false);
    updateRunFailedButton();
    renderFilteredCategories();
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

async function refreshConfigurationForRun() {
  const reloadResponse = await fetch("/api/reload", { method: "POST" });
  const reloadPayload = await readJsonResponse(reloadResponse);

  if (!reloadResponse.ok) {
    throw new Error(reloadPayload.error || reloadPayload.detail || `Configuration reload failed with ${reloadResponse.status}`);
  }

  const configResponse = await fetch("/api/config");
  const configPayload = await readJsonResponse(configResponse);

  if (!configResponse.ok) {
    throw new Error(configPayload.error || configPayload.detail || `Unable to load refreshed configuration. HTTP ${configResponse.status}`);
  }

  applyConfigPayload(configPayload);
  renderGroupCheckOptions(configState.devices);
  renderFacilityTabs();
  hasLoadedConfig = true;
  hasLoadedDashboardGroups = true;
  dashboardConfigStale = false;
}

async function saveConfig(successMessage = "Settings saved to config.json. Previous config was backed up as config.backup.json.") {
  const resolvedSuccessMessage = typeof successMessage === "string"
    ? successMessage
    : "Settings saved to config.json. Previous config was backed up as config.backup.json.";

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
    markDashboardConfigurationStale();
    if (autoRefreshEnabled) {
      scheduleRefresh();
    }
    showConfigAlert("success", resolvedSuccessMessage);
  } catch (error) {
    showConfigAlert("danger", error.message || "Unable to save configuration.");
    console.error(error);
  } finally {
    setConfigBusy(false);
  }
}

function markDashboardConfigurationStale() {
  dashboardConfigStale = true;
  hasLoadedDashboardGroups = false;
  latestResults = [];
  latestCategories = [];
  hasCompletedFullCheck = false;
  activeRunFailedIps = new Set();
  expandedFacilityNames.clear();
  expandedCategoryNames.clear();
  renderGroupCheckOptions(configState.devices);
  updateRunFailedButton();

  if (currentRoute === "/") {
    renderFacilityTabs();
    renderSummary(createProgressSummary([], 0));
    renderFilteredCategories();
    lastCheck.textContent = "Configuration changed. Run All Facilities to refresh with the latest config.json.";
  }
}

function applyConfigPayload(payload) {
  configState = payload;
  configState.devices ??= [];
  configState.settings ??= {
    intervalSeconds: defaultAutoFullCheckIntervalSeconds,
    timeoutMs: 1000,
    maxParallelChecks: 50,
    retryCount: 0,
    retryDelayMs: 250
  };
  configState.settings.intervalSeconds ??= defaultAutoFullCheckIntervalSeconds;
  configState.settings.timeoutMs ??= 1000;
  configState.settings.maxParallelChecks ??= 50;
  configState.settings.retryCount ??= 0;
  configState.settings.retryDelayMs ??= 250;
  const legacyUseHostnameForPing = Boolean(configState.settings.useHostnameForPing);
  delete configState.settings.useHostnameForPing;
  configState.devices = configState.devices.map(device => ({
    ...device,
    facility: device.facility || "Unassigned",
    useHostnameForPing: device.useHostnameForPing ?? legacyUseHostnameForPing
  }));
  if (intervalSecondsInput) {
    intervalSecondsInput.value = String(configState.settings.intervalSeconds);
  }
  timeoutMsInput.value = String(configState.settings.timeoutMs);
  maxParallelChecksInput.value = String(configState.settings.maxParallelChecks);
  retryCountInput.value = String(configState.settings.retryCount);
  retryDelayMsInput.value = String(configState.settings.retryDelayMs);
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
    renderFacilityTabs();
    hasLoadedDashboardGroups = true;
  } catch (error) {
    console.error(error);
    runGroupCheckButton.disabled = true;
    lastCheck.textContent = error.message || "Unable to load dashboard groups.";
  }
}

function renderGroupCheckOptions(devices) {
  const scopedDevices = activeFacility
    ? (devices ?? []).filter(device => (device.facility || "Unassigned") === activeFacility)
    : devices ?? [];
  const categories = Array.from(new Set(
    scopedDevices
      .filter(device => device.enabled !== false)
      .map(device => device.category || "Uncategorized")))
    .sort((left, right) => left.localeCompare(right));

  groupCheckSelect.innerHTML = `
    <option value="">Select group</option>
    ${categories.map(category => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`).join("")}`;
  runGroupCheckButton.disabled = true;
}

function selectFacility(facilityName) {
  activeFacility = facilityName || "";
  groupCheckSelect.value = "";
  runGroupCheckButton.disabled = true;
  renderGroupCheckOptions(configState.devices);
  renderFilteredCategories();
}

function renderConfigDevices() {
  const devices = filterConfigDevices(configState.devices ?? []);
  const hasSearch = activeConfigSearch.trim().length > 0;

  if (devices.length === 0) {
    configDevicesBody.innerHTML = `
      <tr>
        <td colspan="7" class="text-center text-secondary py-4">${hasSearch ? "No devices match the current filter." : "No devices configured."}</td>
      </tr>`;
    return;
  }

  configDevicesBody.innerHTML = groupConfigDevicesByFacility(devices)
    .map((facility, facilityIndex) => {
      const facilityId = `config-facility-${facilityIndex}-${slugify(facility.name)}`;

      return `
      <tr class="config-facility-row">
        <td colspan="7">
          <div class="d-flex flex-wrap align-items-center justify-content-between gap-2">
            <div class="d-flex align-items-center gap-2">
              <button
                class="btn btn-sm btn-outline-light category-toggle"
                type="button"
                data-config-facility-toggle="${facilityId}"
                aria-expanded="false"
                aria-controls="${facilityId}">
                <i class="fa-solid fa-chevron-down"></i>
              </button>
              <span class="fw-semibold"><i class="fa-solid fa-location-dot me-2"></i>${escapeHtml(facility.name)}</span>
            </div>
            <span class="badge text-bg-dark">${facility.devices.length} devices</span>
          </div>
        </td>
      </tr>
      ${facility.categories.map((category, categoryIndex) => {
        const categoryId = `${facilityId}-category-${categoryIndex}-${slugify(category.name)}`;

        return `
          <tr class="config-category-row" data-config-facility-row="${facilityId}" hidden>
            <td colspan="7">
              <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 ps-3">
                <div class="d-flex align-items-center gap-2">
                  <button
                    class="btn btn-sm btn-outline-secondary category-toggle"
                    type="button"
                    data-config-category-toggle="${categoryId}"
                    aria-expanded="false"
                    aria-controls="${categoryId}">
                    <i class="fa-solid fa-chevron-down"></i>
                  </button>
                  <span class="fw-semibold">${escapeHtml(category.name)}</span>
                </div>
                <span class="badge text-bg-secondary">${category.devices.length} devices</span>
              </div>
            </td>
          </tr>
          ${category.devices.map(({ device, index }) => renderConfigDeviceRow(device, index, categoryId)).join("")}`;
      }).join("")}`;
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
      || String(device.facility ?? "").toLowerCase().includes(search)
      || String(device.category ?? "").toLowerCase().includes(search)
      || String(device.websiteUrl ?? "").toLowerCase().includes(search));
}

/**
 * Groups configuration devices by facility and category while preserving their original
 * array index so edit/delete actions still target the correct JSON entry.
 * @param {Array<{device: object, index: number}>} devices Devices with their original configuration indexes.
 * @returns {Array<{name: string, devices: Array<{device: object, index: number}>, categories: Array<{name: string, devices: Array<{device: object, index: number}>}>}>} Sorted facility groups.
 */
function groupConfigDevicesByFacility(devices) {
  const facilityGroups = new Map();

  devices.forEach(({ device, index }) => {
    const facilityName = device.facility || "Unassigned";
    const categoryName = device.category || "Uncategorized";

    if (!facilityGroups.has(facilityName)) {
      facilityGroups.set(facilityName, {
        devices: [],
        categories: new Map()
      });
    }

    const facility = facilityGroups.get(facilityName);
    facility.devices.push({ device, index });

    if (!facility.categories.has(categoryName)) {
      facility.categories.set(categoryName, []);
    }

    facility.categories.get(categoryName).push({ device, index });
  });

  return Array.from(facilityGroups.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, group]) => ({
      name,
      devices: group.devices.sort(compareConfigDevices),
      categories: Array.from(group.categories.entries())
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([categoryName, groupedDevices]) => ({
          name: categoryName,
          devices: groupedDevices.sort(compareConfigDevices)
        }))
    }));
}

function compareConfigDevices(left, right) {
  return String(left.device.name ?? "").localeCompare(String(right.device.name ?? ""))
    || String(left.device.ip ?? "").localeCompare(String(right.device.ip ?? ""));
}

function createDeviceKey(device) {
  return [
    device.facility || "Unassigned",
    device.category || "Uncategorized",
    device.name || "",
    device.ip || ""
  ].join("\u001f").toLowerCase();
}

function createCategoryKey(facility, category) {
  return `${facility || "All Facilities"}\u001f${category || "Uncategorized"}`.toLowerCase();
}

function compareDevices(left, right) {
  return String(left.facility ?? "").localeCompare(String(right.facility ?? ""))
    || String(left.category ?? "").localeCompare(String(right.category ?? ""))
    || String(left.name ?? "").localeCompare(String(right.name ?? ""))
    || String(left.ip ?? "").localeCompare(String(right.ip ?? ""));
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
      <td>${escapeHtml(device.facility || "Unassigned")}</td>
      <td><code>${escapeHtml(device.ip)}</code></td>
      <td>${device.hostname ? `<code>${escapeHtml(device.hostname)}</code>` : `<span class="text-secondary">Not set</span>`}</td>
      <td><span class="badge text-bg-${device.useHostnameForPing ? "primary" : "secondary"}">${pingModeLabel}</span></td>
      <td>${device.checks?.length ?? 0}</td>
      <td class="text-end">
        <button class="btn btn-outline-primary btn-sm me-1" type="button" data-edit-device="${index}">
          <i class="fa-solid fa-pen-to-square me-1"></i>Edit
        </button>
        <button class="btn btn-outline-secondary btn-sm me-1" type="button" data-copy-device="${index}">
          <i class="fa-solid fa-copy me-1"></i>Copy
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

/**
 * Expands or collapses all category headers and device rows inside one configuration facility.
 * @param {HTMLButtonElement} toggleButton Button clicked in the facility header.
 */
function toggleConfigFacility(toggleButton) {
  const facilityId = toggleButton.dataset.configFacilityToggle;
  const isExpanded = toggleButton.getAttribute("aria-expanded") === "true";

  toggleButton.setAttribute("aria-expanded", String(!isExpanded));

  configDevicesBody
    .querySelectorAll(`[data-config-facility-row="${facilityId}"]`)
    .forEach(row => {
      row.hidden = isExpanded;
    });

  if (!isExpanded) {
    return;
  }

  configDevicesBody
    .querySelectorAll(`[data-config-facility-row="${facilityId}"]`)
    .forEach(categoryToggle => {
      categoryToggle
        .querySelectorAll("[data-config-category-toggle]")
        .forEach(toggle => toggle.setAttribute("aria-expanded", "false"));
    });

  configDevicesBody
    .querySelectorAll(`[data-config-category-row^="${facilityId}-category-"]`)
    .forEach(row => {
      row.hidden = true;
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
  deviceFormTitle.textContent = "Edit Device";
  submitDeviceButton.textContent = "Update Device";
  populateDeviceForm(device);
  showDeviceForm();
  deviceNameInput.focus();
}

function copyDevice(index) {
  const device = configState.devices[index];

  if (!device) {
    return;
  }

  const copiedDevice = structuredClone(device);
  copiedDevice.name = createCopyDeviceName(device.name);
  editingDeviceIndex.value = "";
  deviceFormTitle.textContent = "Copy Device";
  submitDeviceButton.textContent = "Add Copy";
  populateDeviceForm(copiedDevice);
  showDeviceForm();
  deviceNameInput.focus();
  deviceNameInput.select();
}

function populateDeviceForm(device) {
  deviceNameInput.value = device.name ?? "";
  deviceAddressInput.value = device.ip ?? "";
  deviceFacilityInput.value = device.facility ?? "";
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
}

function createCopyDeviceName(name) {
  const baseName = String(name || "Device").trim() || "Device";
  return /\bcopy\b/i.test(baseName) ? baseName : `${baseName} Copy`;
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
    facility: deviceFacilityInput.value.trim() || "Unassigned",
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
  deviceFacilityInput.value = "";
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
    maxParallelChecks: 50,
    retryCount: 0,
    retryDelayMs: 250
  };
  const intervalSeconds = intervalSecondsInput
    ? readPositiveIntegerSetting(intervalSecondsInput, "Auto refresh")
    : Number(configState.settings.intervalSeconds) || defaultAutoFullCheckIntervalSeconds;
  const timeoutMs = readPositiveIntegerSetting(timeoutMsInput, "Timeout");
  const maxParallelChecks = readPositiveIntegerSetting(maxParallelChecksInput, "Max parallel checks");
  const retryCount = readIntegerSetting(retryCountInput, "Retries", 0, 5);
  const retryDelayMs = readIntegerSetting(retryDelayMsInput, "Retry delay", 0, 10000);

  if (intervalSeconds === null
    || timeoutMs === null
    || maxParallelChecks === null
    || retryCount === null
    || retryDelayMs === null) {
    return false;
  }

  configState.settings.intervalSeconds = intervalSeconds;
  configState.settings.timeoutMs = timeoutMs;
  configState.settings.maxParallelChecks = maxParallelChecks;
  configState.settings.retryCount = retryCount;
  configState.settings.retryDelayMs = retryDelayMs;
  delete configState.settings.useHostnameForPing;
  return true;
}

function readPositiveIntegerSetting(input, label) {
  return readIntegerSetting(input, label, 1);
}

function readIntegerSetting(input, label, min, max = null) {
  const value = Number(input.value);

  if (!Number.isInteger(value) || value < min || (max !== null && value > max)) {
    const rangeText = max === null
      ? `greater than or equal to ${min}`
      : `between ${min} and ${max}`;
    showConfigAlert("warning", `${label} must be a whole number ${rangeText}.`);
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
  retryCountInput.disabled = isBusy;
  retryDelayMsInput.disabled = isBusy;
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
      maxParallelChecks: 50,
      retryCount: 0,
      retryDelayMs: 250
    },
    devices: []
  };
}

function createDefaultThemeState() {
  return {
    activeThemeId: "default",
    themes: [
      {
        id: "default",
        name: "NetWatch Default",
        builtIn: true,
        colors: {
          appBackground: "#f7f8fa",
          surface: "#ffffff",
          sidebarBackground: "#111827",
          sidebarText: "#e5e7eb",
          primary: "#0d6efd",
          success: "#198754",
          warning: "#ffc107",
          danger: "#dc3545",
          text: "#17212b",
          mutedText: "#657182",
          border: "#dee2e6",
          categoryHealthy: "#3b9b40",
          categoryDegraded: "#f59e0b",
          categoryProblem: "#be302b",
          categoryRunning: "#465464",
          configFacilityHeader: "#111827",
          configFacilityText: "#e5e7eb",
          configCategoryHeader: "#eef2f7",
          configCategoryText: "#334155",
          autoRefreshOn: "#198754",
          autoRefreshOff: "#dc3545",
          runFullCheck: "#ffc107"
        }
      }
    ]
  };
}

async function loadThemes({ showBusy = false, showErrors = false } = {}) {
  setThemeBusy(showBusy);

  try {
    const response = await fetch("/api/themes");
    const payload = await readJsonResponse(response);

    if (!response.ok) {
      throw new Error(payload.error || payload.detail || `Unable to load themes. HTTP ${response.status}`);
    }

    applyThemeState(payload);
    hasLoadedThemes = true;
  } catch (error) {
    applyThemeState(createDefaultThemeState());
    if (showErrors) {
      showThemeAlert("danger", error.message || "Unable to load themes.");
    }
    console.error(error);
  } finally {
    setThemeBusy(false);
  }
}

async function saveThemes(successMessage = "Themes saved to themes.json.") {
  if (!syncThemeEditorToState()) {
    return;
  }

  setThemeBusy(true);
  clearThemeAlert();

  try {
    const response = await fetch("/api/themes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(themeState)
    });
    const payload = await readJsonResponse(response);

    if (!response.ok) {
      throw new Error(payload.error || payload.detail || `Theme save failed with ${response.status}`);
    }

    applyThemeState(payload.configuration);
    showThemeAlert("success", successMessage);
  } catch (error) {
    showThemeAlert("danger", error.message || "Unable to save themes.");
    console.error(error);
  } finally {
    setThemeBusy(false);
  }
}

async function resetThemes() {
  if (!window.confirm("Reset ALL themes to NetWatch Default? This deletes every custom theme in themes.json.")) {
    return;
  }

  setThemeBusy(true);
  clearThemeAlert();

  try {
    const response = await fetch("/api/themes/reset", { method: "POST" });
    const payload = await readJsonResponse(response);

    if (!response.ok) {
      throw new Error(payload.error || payload.detail || `Theme reset failed with ${response.status}`);
    }

    applyThemeState(payload.configuration);
    showThemeAlert("success", "Themes reset to NetWatch Default.");
  } catch (error) {
    showThemeAlert("danger", error.message || "Unable to reset themes.");
    console.error(error);
  } finally {
    setThemeBusy(false);
  }
}

function applyThemeState(payload) {
  themeState = payload ?? createDefaultThemeState();
  themeState.themes ??= [];
  themeState.activeThemeId ||= "default";

  if (themeState.themes.length === 0) {
    themeState = createDefaultThemeState();
  }

  if (!themeState.themes.some(theme => theme.id === themeState.activeThemeId)) {
    themeState.activeThemeId = themeState.themes[0].id;
  }

  if (!themeState.themes.some(theme => theme.id === editingThemeId)) {
    editingThemeId = themeState.activeThemeId;
  }

  renderThemeSelect();
  renderThemeEditor();
  applyActiveTheme();
}

function renderThemeSelect() {
  themeSelect.innerHTML = themeState.themes
    .map(theme => `
      <option value="${escapeHtml(theme.id)}" ${theme.id === editingThemeId ? "selected" : ""}>
        ${escapeHtml(theme.name)}${theme.id === themeState.activeThemeId ? " (active)" : ""}
      </option>`)
    .join("");
}

function renderThemeEditor() {
  const theme = getEditingTheme();

  if (!theme) {
    return;
  }

  deleteThemeButton.disabled = Boolean(theme.builtIn);
  renameThemeButton.disabled = Boolean(theme.builtIn);
  activateThemeButton.disabled = theme.id === themeState.activeThemeId;

  for (const input of themeColorInputs) {
    const key = input.dataset.themeColor;
    input.value = theme.colors?.[key] || createDefaultThemeState().themes[0].colors[key] || "#000000";
    input.disabled = Boolean(theme.builtIn);
  }
}

function syncThemeEditorToState() {
  const theme = getEditingTheme();

  if (!theme) {
    showThemeAlert("warning", "Select a theme first.");
    return false;
  }

  theme.colors ??= {};

  for (const input of themeColorInputs) {
    theme.colors[input.dataset.themeColor] = input.value;
  }

  applyThemePreview(theme);
  return true;
}

function applyActiveTheme() {
  const activeTheme = themeState.themes.find(theme => theme.id === themeState.activeThemeId)
    ?? themeState.themes[0];

  applyThemeColors(activeTheme);
  applyThemePreview(getEditingTheme() ?? activeTheme);
}

function applyThemeColors(theme) {
  const defaultColors = createDefaultThemeState().themes[0].colors;
  const colors = theme?.colors ?? defaultColors;

  for (const [key, cssVariable] of Object.entries(themeCssVariables)) {
    document.documentElement.style.setProperty(cssVariable, colors[key] || defaultColors[key]);
  }
}

function applyThemePreview(theme) {
  const defaultColors = createDefaultThemeState().themes[0].colors;
  const colors = theme?.colors ?? defaultColors;

  for (const [key, cssVariable] of Object.entries(themeCssVariables)) {
    themePreview.style.setProperty(cssVariable, colors[key] || defaultColors[key]);
  }
}

function startNewTheme() {
  pendingThemeAction = "new";
  pendingThemeSourceId = "";
  themeFormTitle.textContent = "New Theme";
  submitThemeButton.textContent = "Create Theme";
  themeNameInput.value = "";
  showThemeForm();
}

function startCopyTheme() {
  const sourceTheme = getEditingTheme();

  if (!sourceTheme) {
    return;
  }

  pendingThemeAction = "copy";
  pendingThemeSourceId = sourceTheme.id;
  themeFormTitle.textContent = "Copy Theme";
  submitThemeButton.textContent = "Create Copy";
  themeNameInput.value = `${sourceTheme.name} Copy`;
  showThemeForm();
  themeNameInput.select();
}

function startRenameTheme() {
  const theme = getEditingTheme();

  if (!theme || theme.builtIn) {
    return;
  }

  pendingThemeAction = "rename";
  pendingThemeSourceId = theme.id;
  themeFormTitle.textContent = "Rename Theme";
  submitThemeButton.textContent = "Rename Theme";
  themeNameInput.value = theme.name;
  showThemeForm();
  themeNameInput.select();
}

function submitThemeForm(event) {
  event.preventDefault();

  const themeName = themeNameInput.value.trim();

  if (!themeName) {
    themeNameInput.focus();
    return;
  }

  if (pendingThemeAction === "copy") {
    copyTheme(themeName, pendingThemeSourceId);
  } else if (pendingThemeAction === "rename") {
    renameTheme(themeName, pendingThemeSourceId);
  } else {
    createTheme(themeName);
  }

  hideThemeForm();
}

function createTheme(themeName) {
  const defaultColors = structuredClone(createDefaultThemeState().themes[0].colors);
  const theme = {
    id: createThemeId(themeName),
    name: themeName,
    builtIn: false,
    colors: defaultColors
  };

  themeState.themes.push(theme);
  editingThemeId = theme.id;
  renderThemeSelect();
  renderThemeEditor();
  clearThemeAlert();
}

function copyTheme(themeName, sourceThemeId = editingThemeId) {
  const sourceTheme = themeState.themes.find(theme => theme.id === sourceThemeId) ?? getEditingTheme();

  if (!sourceTheme) {
    return;
  }

  const theme = {
    id: createThemeId(themeName),
    name: themeName,
    builtIn: false,
    colors: structuredClone(sourceTheme.colors)
  };

  themeState.themes.push(theme);
  editingThemeId = theme.id;
  renderThemeSelect();
  renderThemeEditor();
  clearThemeAlert();
}

function renameTheme(themeName, themeId = editingThemeId) {
  const theme = themeState.themes.find(currentTheme => currentTheme.id === themeId);

  if (!theme || theme.builtIn) {
    return;
  }

  theme.name = themeName;
  editingThemeId = theme.id;
  renderThemeSelect();
  renderThemeEditor();
  clearThemeAlert();
}

function showThemeForm() {
  if (themeFormModal) {
    themeFormModal.show();
  }
}

function hideThemeForm() {
  if (themeFormModal) {
    themeFormModal.hide();
  }
}

async function activateTheme() {
  if (!getEditingTheme()) {
    return;
  }

  themeState.activeThemeId = editingThemeId;
  renderThemeSelect();
  renderThemeEditor();
  applyActiveTheme();
  await saveThemes("Active theme saved to themes.json.");
}

async function deleteTheme() {
  const theme = getEditingTheme();

  if (!theme || theme.builtIn) {
    return;
  }

  if (!window.confirm(`Delete only the selected theme '${theme.name}'? Other themes will be kept.`)) {
    return;
  }

  themeState.themes = themeState.themes.filter(currentTheme => currentTheme.id !== theme.id);

  if (themeState.activeThemeId === theme.id) {
    themeState.activeThemeId = "default";
  }

  editingThemeId = themeState.activeThemeId;
  renderThemeSelect();
  renderThemeEditor();
  applyActiveTheme();
  await saveThemes(`Theme '${theme.name}' deleted from themes.json.`);
}

function getEditingTheme() {
  return themeState.themes.find(theme => theme.id === editingThemeId)
    ?? themeState.themes[0];
}

function createThemeId(seed) {
  const baseId = slugify(seed || "theme") || "theme";
  let candidate = baseId;
  let suffix = 2;

  while (themeState.themes.some(theme => theme.id === candidate)) {
    candidate = `${baseId}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}

function setThemeBusy(isBusy) {
  saveThemesButton.disabled = isBusy;
  newThemeButton.disabled = isBusy;
  copyThemeButton.disabled = isBusy;
  renameThemeButton.disabled = isBusy || Boolean(getEditingTheme()?.builtIn);
  resetThemesButton.disabled = isBusy;
  activateThemeButton.disabled = isBusy || editingThemeId === themeState.activeThemeId;
  deleteThemeButton.disabled = isBusy || Boolean(getEditingTheme()?.builtIn);
  saveThemesSpinner.classList.toggle("d-none", !isBusy);
  saveThemesIcon.classList.toggle("d-none", isBusy);
}

function showThemeAlert(type, message) {
  themeAlert.innerHTML = `
    <div class="alert alert-${type} alert-dismissible fade show" role="alert">
      ${escapeHtml(message)}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    </div>`;
}

function clearThemeAlert() {
  themeAlert.innerHTML = "";
}

function navigateTo(route, replace = false) {
  const normalizedRoute = normalizeRoute(route);
  const previousRoute = currentRoute;
  currentRoute = normalizedRoute;

  dashboardPage.hidden = normalizedRoute !== "/";
  configPage.hidden = normalizedRoute !== "/config";
  themesPage.hidden = normalizedRoute !== "/themes";
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

  if (normalizedRoute === "/themes" && !hasLoadedThemes) {
    loadThemes({ showBusy: true, showErrors: true });
  }

  if (normalizedRoute === "/" && !hasLoadedDashboardGroups) {
    loadDashboardGroups();
  }
}

function normalizeRoute(pathname) {
  const knownRoutes = new Set(["/", "/config", "/themes", "/manual", "/about"]);
  return knownRoutes.has(pathname) ? pathname : "/";
}

function getPageLabel(route) {
  const labels = {
    "/": "Dashboard",
    "/config": "Configuration",
    "/themes": "Themes",
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

function setDashboardRunButtonsDisabled(isDisabled) {
  resultsBody
    .querySelectorAll("[data-run-facility-only], [data-run-category], [data-run-device-name]")
    .forEach(button => {
      button.disabled = isDisabled;
    });
}

function setOtherDashboardRunButtonsDisabled(isDisabled, activeDevice = null) {
  resultsBody
    .querySelectorAll("[data-run-facility-only], [data-run-category], [data-run-device-name]")
    .forEach(button => {
      const isActiveDeviceButton = activeDevice
        && button.dataset.runDeviceName === activeDevice.name
        && button.dataset.runDeviceIp === activeDevice.ip;

      if (!isActiveDeviceButton) {
        button.disabled = isDisabled;
      }
    });
}

function getExecutionScopeLabel(facility, category, device, devices = []) {
  if (devices.length > 0) {
    return "failed devices";
  }

  if (device?.name) {
    return `device ${device.name}`;
  }

  if (facility && category) {
    return `${facility} / ${category} devices`;
  }

  if (facility) {
    return `${facility} devices`;
  }

  return category ? `${category} devices` : "";
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
runFacilityCheckButton.addEventListener("click", runSelectedFacilityCheck);
runGroupCheckButton.addEventListener("click", runSelectedGroupCheck);
runFailedCheckButton.addEventListener("click", runFailedChecks);
groupCheckSelect.addEventListener("change", () => {
  runGroupCheckButton.disabled = !groupCheckSelect.value;
});
facilityTabs.addEventListener("click", event => {
  const facilityButton = event.target.closest("[data-facility-filter]");

  if (facilityButton) {
    selectFacility(facilityButton.dataset.facilityFilter || "");
  }
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
  const facilityKey = event.target.dataset.facilityKey;
  const categoryKey = event.target.dataset.categoryKey;

  if (facilityKey) {
    expandedFacilityNames.delete(facilityKey);
  }

  if (categoryKey) {
    expandedCategoryNames.delete(categoryKey);
  }
});
resultsBody.addEventListener("shown.bs.collapse", event => {
  const facilityKey = event.target.dataset.facilityKey;
  const categoryKey = event.target.dataset.categoryKey;

  if (facilityKey) {
    expandedFacilityNames.add(facilityKey);
  }

  if (categoryKey) {
    expandedCategoryNames.add(categoryKey);
  }
});
resultsBody.addEventListener("click", event => {
  const runFacilityButton = event.target.closest("[data-run-facility-only]");
  const runCategoryButton = event.target.closest("[data-run-category]");
  const runDeviceButton = event.target.closest("[data-run-device-name]");

  if (runFacilityButton) {
    runFacilityCheck(runFacilityButton.dataset.runFacilityOnly);
    return;
  }

  if (runCategoryButton) {
    runGroupCheck(runCategoryButton.dataset.runCategory, runCategoryButton.dataset.runFacility || activeFacility);
    return;
  }

  if (runDeviceButton) {
    runDeviceCheck({
      name: runDeviceButton.dataset.runDeviceName,
      ip: runDeviceButton.dataset.runDeviceIp,
      facility: runDeviceButton.dataset.runDeviceFacility,
      category: runDeviceButton.dataset.runDeviceCategory
    });
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
saveConfigButton.addEventListener("click", () => saveConfig());
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
retryCountInput.addEventListener("input", () => {
  showConfigAlert("info", "Retry count changed locally. Click Save Settings to persist changes.");
});
retryDelayMsInput.addEventListener("input", () => {
  showConfigAlert("info", "Retry delay changed locally. Click Save Settings to persist changes.");
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
  const facilityToggle = event.target.closest("[data-config-facility-toggle]");
  const categoryToggle = event.target.closest("[data-config-category-toggle]");
  const editButton = event.target.closest("[data-edit-device]");
  const copyButton = event.target.closest("[data-copy-device]");
  const deleteButton = event.target.closest("[data-delete-device]");

  if (facilityToggle) {
    toggleConfigFacility(facilityToggle);
    return;
  }

  if (categoryToggle) {
    toggleConfigCategory(categoryToggle);
    return;
  }

  if (editButton) {
    editDevice(Number(editButton.dataset.editDevice));
    return;
  }

  if (copyButton) {
    copyDevice(Number(copyButton.dataset.copyDevice));
    return;
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
if (themeFormModalElement) {
  themeFormModalElement.addEventListener("shown.bs.modal", () => {
    themeNameInput.focus();
    themeNameInput.select();
  });
}
themeSelect.addEventListener("change", event => {
  syncThemeEditorToState();
  editingThemeId = event.target.value;
  renderThemeEditor();
  clearThemeAlert();
});
themeColorInputs.forEach(input => {
  input.addEventListener("input", () => {
    syncThemeEditorToState();
  });
});
themeForm.addEventListener("submit", submitThemeForm);
newThemeButton.addEventListener("click", startNewTheme);
copyThemeButton.addEventListener("click", startCopyTheme);
renameThemeButton.addEventListener("click", startRenameTheme);
activateThemeButton.addEventListener("click", activateTheme);
deleteThemeButton.addEventListener("click", deleteTheme);
saveThemesButton.addEventListener("click", () => saveThemes());
resetThemesButton.addEventListener("click", resetThemes);
window.addEventListener("popstate", () => navigateTo(location.pathname, true));

void loadThemes({ showBusy: false, showErrors: false });
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
