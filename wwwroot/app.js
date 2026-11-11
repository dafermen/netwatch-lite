const sidebar = document.querySelector("#sidebar");
const appShell = document.querySelector(".app-shell");
const sidebarBackdrop = document.querySelector("#sidebar-backdrop");
const sidebarToggle = document.querySelector("#sidebar-toggle");
const navLinks = document.querySelectorAll("[data-route]");
const currentPageLabel = document.querySelector("#current-page-label");

const dashboardPage = document.querySelector("#dashboard-page");
const configPage = document.querySelector("#config-page");
const reportsPage = document.querySelector("#reports-page");
const integrationsPage = document.querySelector("#integrations-page");
const regionsPage = document.querySelector("#regions-page");
const themesPage = document.querySelector("#themes-page");
const manualPage = document.querySelector("#manual-page");
const aboutPage = document.querySelector("#about-page");
const resultsBody = document.querySelector("#results-body");
const lastCheck = document.querySelector("#last-check");
const executionMode = document.querySelector("#execution-mode");
const autoRefreshToggle = document.querySelector("#auto-refresh-toggle");
const autoRefreshLabel = document.querySelector("#auto-refresh-label");
const checkModeInputs = document.querySelectorAll("input[name='check-mode']");
const facilityTabs = document.querySelector("#facility-tabs");
const dashboardRegionTitle = document.querySelector("#dashboard-region-title");
const dashboardSupportGroupLabel = document.querySelector("#dashboard-support-group-label");
const activeFacilityLabel = document.querySelector("#active-facility-label");
const runFacilityCheckButton = document.querySelector("#run-facility-check");
const runFacilityCheckSpinner = document.querySelector("#run-facility-check-spinner");
const runFacilityCheckIcon = document.querySelector("#run-facility-check-icon");
const runFacilityCheckLabel = document.querySelector("#run-facility-check-label");
const groupCheckSelect = document.querySelector("#group-check-select");
const dashboardDeviceTypeSelect = document.querySelector('#dashboard-device-type');
const runGroupCheckButton = document.querySelector("#run-group-check");
const runGroupCheckSpinner = document.querySelector("#run-group-check-spinner");
const runGroupCheckIcon = document.querySelector("#run-group-check-icon");
const runFailedCheckButton = document.querySelector("#run-failed-check");
const runFailedCheckSpinner = document.querySelector("#run-failed-check-spinner");
const runFailedCheckIcon = document.querySelector("#run-failed-check-icon");
const searchInput = document.querySelector("#device-search");
const clearDashboardFiltersButton = document.querySelector('#clear-dashboard-filters');
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
const reportsAlert = document.querySelector("#reports-alert");
const reportsRunCount = document.querySelector("#reports-run-count");
const reportsRowCount = document.querySelector("#reports-row-count");
const reportsHealthyCount = document.querySelector("#reports-healthy-count");
const reportsProblemCount = document.querySelector("#reports-problem-count");
const reportsAvgAvailability = document.querySelector("#reports-avg-availability");
const reportsSearchInput = document.querySelector("#reports-search");
const reportsStatusFilter = document.querySelector("#reports-status-filter");
const reportsModeFilter = document.querySelector("#reports-mode-filter");
const reportsFacilityFilter = document.querySelector("#reports-facility-filter");
const reportsCategoryFilter = document.querySelector("#reports-category-filter");
const reportsFromDateInput = document.querySelector("#reports-from-date");
const reportsToDateInput = document.querySelector("#reports-to-date");
const resetReportFiltersButton = document.querySelector("#reset-report-filters");
const refreshReportsButton = document.querySelector("#refresh-reports");
const exportReportsButton = document.querySelector("#export-reports");
const reportsPageSizeSelect = document.querySelector("#reports-page-size");
const reportsPrevPageButton = document.querySelector("#reports-prev-page");
const reportsNextPageButton = document.querySelector("#reports-next-page");
const reportsPageSummary = document.querySelector("#reports-page-summary");
const reportsTableBody = document.querySelector("#reports-table-body");
const reportsTableSummary = document.querySelector("#reports-table-summary");
const reportsFacilityExecutiveBody = document.querySelector("#reports-facility-executive-body");
const reportsFacilityPerformanceSummary = document.querySelector("#reports-facility-performance-summary");
const reportsFacilityPageSizeSelect = document.querySelector("#reports-facility-page-size");
const reportsFacilityPrevPageButton = document.querySelector("#reports-facility-prev-page");
const reportsFacilityNextPageButton = document.querySelector("#reports-facility-next-page");
const reportsFacilityPageSummary = document.querySelector("#reports-facility-page-summary");
const reportsCategoryExecutiveBody = document.querySelector("#reports-category-executive-body");
const reportsCategoryPerformanceSummary = document.querySelector("#reports-category-performance-summary");
const reportsCategoryPageSizeSelect = document.querySelector("#reports-category-page-size");
const reportsCategoryPrevPageButton = document.querySelector("#reports-category-prev-page");
const reportsCategoryNextPageButton = document.querySelector("#reports-category-next-page");
const reportsCategoryPageSummary = document.querySelector("#reports-category-page-summary");
const reportsRecentRunsBody = document.querySelector("#reports-recent-runs-body");
const reportsRunsSummary = document.querySelector("#reports-runs-summary");
const reportsRunsPageSizeSelect = document.querySelector("#reports-runs-page-size");
const reportsRunsPrevPageButton = document.querySelector("#reports-runs-prev-page");
const reportsRunsNextPageButton = document.querySelector("#reports-runs-next-page");
const reportsRunsPageSummary = document.querySelector("#reports-runs-page-summary");
const reportsProfileFilter = document.querySelector('#reports-profile-filter');
const reportsPeriodFilter = document.querySelector('#reports-period-filter');
const reportsDeviceCount = document.querySelector('#reports-device-count');
const reportsExportMenu = document.querySelector('#reports-export-menu');
const reportsCsvButton = document.querySelector('#export-reports-csv');
const reportsDetailElement = document.querySelector('#reports-detail-modal');
const reportsDetailModal = typeof bootstrap !== 'undefined' ? new bootstrap.Modal(reportsDetailElement) : null;
const reportsMobileQuery = window.matchMedia('(max-width: 767px)');
const integrationsAlert = document.querySelector("#integrations-alert");
const reloadIntegrationsButton = document.querySelector("#reload-integrations");
const saveIntegrationsButton = document.querySelector("#save-integrations");
const saveIntegrationsSpinner = document.querySelector("#save-integrations-spinner");
const saveIntegrationsIcon = document.querySelector("#save-integrations-icon");
const inventorySourceModeSelect = document.querySelector("#inventory-source-mode");
const inventoryLocalJsonPathInput = document.querySelector("#inventory-local-json-path");
const inventoryEndpointUrlInput = document.querySelector("#inventory-endpoint-url");
const inventoryEndpointMethodSelect = document.querySelector("#inventory-endpoint-method");
const inventorySourceStatus = document.querySelector("#inventory-source-status");
const reportDestinationEnabledInput = document.querySelector("#report-destination-enabled");
const reportDestinationUrlInput = document.querySelector("#report-destination-url");
const reportDestinationMethodSelect = document.querySelector("#report-destination-method");
const reportIncludeSummaryInput = document.querySelector("#report-include-summary");
const reportIncludeRowsInput = document.querySelector("#report-include-rows");
const reportDestinationStatus = document.querySelector("#report-destination-status");

const configAlert = document.querySelector("#config-alert");
const configDevicesBody = document.querySelector("#config-devices-body");
const configNormalViewButton = document.querySelector("#config-normal-view");
const configBulkViewButton = document.querySelector("#config-bulk-view");
const configDevicesTableWrapper = document.querySelector("#config-devices-table-wrapper");
const bulkEditPanel = document.querySelector("#bulk-edit-panel");
const bulkDevicesBody = document.querySelector("#bulk-devices-body");
const bulkEditSummary = document.querySelector("#bulk-edit-summary");
const bulkFacilityFilter = document.querySelector("#bulk-facility-filter");
const bulkCategoryFilter = document.querySelector("#bulk-category-filter");
const bulkClearFiltersButton = document.querySelector("#bulk-clear-filters");
const bulkSelectVisibleButton = document.querySelector("#bulk-select-visible");
const bulkClearSelectionButton = document.querySelector("#bulk-clear-selection");
const bulkCollapseAllButton = document.querySelector("#bulk-collapse-all");
const bulkExpandAllButton = document.querySelector("#bulk-expand-all");
const bulkSelectionSummary = document.querySelector("#bulk-selection-summary");
const bulkActionSelect = document.querySelector("#bulk-action-select");
const bulkActionValueInput = document.querySelector("#bulk-action-value");
const bulkApplyActionButton = document.querySelector("#bulk-apply-action");
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
const deviceCommandInput = document.querySelector("#device-command");
const deviceLocationInput = document.querySelector("#device-location");
const deviceNotesInput = document.querySelector("#device-notes");
const deviceCategoryInput = document.querySelector("#device-category");
const deviceEnabledInput = document.querySelector("#device-enabled");
const checksList = document.querySelector("#checks-list");
let httpCheckHelpSequence = 0;
const addCheckButton = document.querySelector("#add-check");
const resetDeviceFormButton = document.querySelector("#reset-device-form");
const submitDeviceButton = document.querySelector("#submit-device");
const deleteDeviceModalElement = document.querySelector("#delete-device-modal");
const deleteDeviceModal = typeof bootstrap !== "undefined" && deleteDeviceModalElement
  ? new bootstrap.Modal(deleteDeviceModalElement)
  : null;
const deleteDeviceName = document.querySelector("#delete-device-name");
const confirmDeleteDeviceButton = document.querySelector("#confirm-delete-device");
const regionAlert = document.querySelector("#region-alert");
const regionsBody = document.querySelector("#regions-body");
const newRegionButton = document.querySelector("#new-region");
const regionFormModalElement = document.querySelector("#region-form-modal");
const regionFormModal = typeof bootstrap !== "undefined" && regionFormModalElement
  ? new bootstrap.Modal(regionFormModalElement)
  : null;
const regionForm = document.querySelector("#region-form");
const regionFormTitle = document.querySelector("#region-form-title");
const regionNameInput = document.querySelector("#region-name");
const regionValueInput = document.querySelector("#region-value");
const regionCopyWrapper = document.querySelector("#region-copy-wrapper");
const regionCopyActiveInput = document.querySelector("#region-copy-active");
const submitRegionButton = document.querySelector("#submit-region");
const themeAlert = document.querySelector("#theme-alert");
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
const resetThemesButton = document.querySelector("#reset-themes");
const saveThemesButton = document.querySelector("#save-themes");
const saveThemesSpinner = document.querySelector("#save-themes-spinner");
const saveThemesIcon = document.querySelector("#save-themes-icon");
const themePreview = document.querySelector("#theme-preview");

let refreshTimer;
let activeMonitorStream;
let latestResults = [];
let latestCategories = [];
let activeFilter = "all";
let activeSearch = "";
let activeFacility = "";
let activeDashboardDeviceType = '';
let activeRunDeviceType = '';
let autoRefreshEnabled = false;
let hasCompletedFullCheck = false;
let activeRunFacility = "";
let activeRunCategory = "";
let activeRunDeviceName = "";
let activeRunDeviceIp = "";
let activeRunFailedIps = new Set();
let activeRunCheckMode = "full";
let activeRunKeepsDashboardStable = false;
let activeRunPreservesDashboard = false;
let currentRoute = normalizeRoute(location.pathname);
let hasLoadedDashboardGroups = false;
let dashboardInventoryAvailable = false;
let dashboardConfigStale = false;
let activeConfigSearch = "";
let savedDeviceReveal = null;
let pendingDashboardReveal = null;
let activeConfigView = "normal";
let activeBulkFacility = "";
let activeBulkCategory = "";
let reportsState = { schemaVersion: 1, runs: [] };
let reportsRows = [];
let reportsSqlEnabled = false;
let reportsSqlState = null;
let reportsFilters = createDefaultReportsFilters();
let reportsSort = { key: "completedAt", direction: "desc" };
let reportsCurrentPage = 1;
let reportsPageSize = 10;
let reportsFacilitySort = { key: "problemCount", direction: "desc" };
let reportsFacilityPage = 1;
let reportsFacilityPageSize = 10;
let reportsCategorySort = { key: "problemCount", direction: "desc" };
let reportsCategoryPage = 1;
let reportsCategoryPageSize = 10;
let reportsRunSort = { key: "completedAt", direction: "desc" };
let reportsRunPage = 1;
let reportsRunPageSize = 10;
let reportsAvailable = false;
let reportsBusy = false;
let reportsLoadVersion = 0;
let reportsActiveView = 'summary';
let reportsSummaryGroup = 'facility';
let reportsSelectedRow = null;
let reportsDetailTrigger = null;
let reportsConfirmingDelete = false;
let integrationsState = createDefaultIntegrationsState();
let selectedBulkIndexes = new Set();
const collapsedBulkFacilityNames = new Set();
let configSearchBulkCollapseSnapshot = null;
const alertAutoDismissMs = 10000;
const alertDismissTimers = new Map();
const defaultAutoFullCheckIntervalSeconds = 60;
const maxConfigImportBytes = 5 * 1024 * 1024;
let configState = createEmptyConfiguration();
let regionState = createDefaultRegionState();
let themeState = createDefaultThemeState();
let editingRegionId = "";
let pendingRegionAction = "new";
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

async function loadResults({ showErrors = true, facility = "", category = "", deviceType = '', device = null, devices = [], reloadConfig = true } = {}) {
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

  return streamFullCheck({ showErrors, facility, category, deviceType, device, devices });
}

/**
 * Opens the Server-Sent Events monitoring stream and routes each event to the
 * dashboard renderer. This keeps large inventories responsive because each
 * device result is shown as soon as the backend finishes it.
 * @param {{ showErrors?: boolean, facility?: string, category?: string, deviceType?: string, device?: object | null, devices?: Array<object>, checkMode?: string }} options Controls whether stream errors are displayed and optional execution scope.
 * @returns {Promise<void>} Resolves when the stream completes, reports busy, or fails.
 */
function streamFullCheck({ showErrors = true, facility = "", category = "", deviceType = '', device = null, devices = [], checkMode = getSelectedCheckMode() } = {}) {
  if (activeMonitorStream) {
    lastCheck.textContent = "A monitoring execution is already running.";
    return Promise.resolve();
  }

  return new Promise(resolve => {
    let settled = false;
    const normalizedCheckMode = normalizeCheckMode(checkMode);
    const streamParams = new URLSearchParams();

    if (isPingOnlyMode(normalizedCheckMode)) {
      streamParams.set("checkMode", "ping");
    }

    if (facility) {
      streamParams.set("facility", facility);
    }

    if (category) {
      streamParams.set("category", category);
    }

    if (deviceType) streamParams.set('deviceType', deviceType);

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
    activeRunCheckMode = normalizedCheckMode;
    setCheckModeInputsDisabled(true);

    source.addEventListener("started", event => {
      const payload = JSON.parse(event.data);
      activeRunFacility = facility;
      activeRunCategory = category;
      activeRunDeviceType = deviceType;
      activeRunDeviceName = device?.name || "";
      activeRunDeviceIp = device?.ip || "";
      activeRunFailedIps = new Set(devices.map(scopedDevice => scopedDevice.ip).filter(Boolean));
      activeRunKeepsDashboardStable = Boolean((device || devices.length > 0) && latestResults.length > 0);
      activeRunPreservesDashboard = Boolean(latestResults.length > 0
        && ((facility || category || deviceType) || (!device && devices.length === 0 && autoRefreshEnabled)));
      activeRunCheckMode = normalizeCheckMode(payload.checkMode || normalizedCheckMode);
      resetStreamingDashboard(payload, getExecutionScopeLabel(facility, category, device, devices, deviceType));
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
        executionStatus: payload.executionStatus,
        checkMode: payload.checkMode || normalizedCheckMode
      };

      if (devices.length > 0) {
        renderScopedDevicesPayload(completedPayload, devices);
      } else if (device) {
        renderScopedDevicePayload(completedPayload, device);
      } else if (facility || category || deviceType) {
        renderScopedMonitorPayload(completedPayload, { facility, category, deviceType });
      } else {
        hasCompletedFullCheck = true;
        expandedFacilityNames.clear();
        expandedCategoryNames.clear();
        renderMonitorPayload(completedPayload);
      }

      activeRunFacility = "";
      activeRunCategory = "";
      activeRunDeviceType = '';
      activeRunDeviceName = "";
      activeRunDeviceIp = "";
      activeRunFailedIps = new Set();
      activeRunCheckMode = getSelectedCheckMode();
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
      activeRunDeviceType = '';
      activeRunDeviceName = "";
      activeRunDeviceIp = "";
      activeRunFailedIps = new Set();
      activeRunCheckMode = getSelectedCheckMode();
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
        getExecutionScopeLabel(facility, category, device, devices, deviceType),
        showErrors);
      settled = true;
      resolve();
    });

    source.onerror = error => {
      if (settled) {
        return;
      }

      handleMonitorStreamFailure("Unable to stream monitoring results.", getExecutionScopeLabel(facility, category, device, devices, deviceType), showErrors);

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
  activeRunDeviceType = '';
  activeRunDeviceName = "";
  activeRunDeviceIp = "";
  activeRunFailedIps = new Set();
  activeRunCheckMode = getSelectedCheckMode();
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
  executionMode.textContent = getDashboardExecutionText(payload.checkMode);
  lastCheck.textContent = `Last execution: ${formatDate(payload.lastExecutionTime ?? payload.lastCheck)}`;
  updateProgressPanel(payload.results?.length ?? 0, payload.results?.length ?? 0, "Completed", false);
}

function renderScopedMonitorPayload(payload, { facility = "", category = "", deviceType = '' } = {}) {
  const scopedResults = payload.results ?? [];
  latestResults = mergeScopedResults(latestResults, scopedResults);
  latestCategories = groupResultsByCategory(latestResults);
  hasCompletedFullCheck = true;
  activeRunFacility = "";
  activeRunCategory = "";
  renderFacilityTabs();
  renderSummary(createSummaryFromResults(getVisibleResults()));
  renderFilteredCategories();
  updateRunFailedButton();
  executionMode.textContent = getDashboardExecutionText(payload.checkMode);
  const scope = [facility, category, deviceType ? dashboardDeviceTypeLabel(deviceType) : ''].filter(Boolean).join(' / ');
  lastCheck.textContent = `Last ${scope} execution: ${formatDate(payload.lastExecutionTime ?? payload.lastCheck)}`;
  updateProgressPanel(scopedResults.length, scopedResults.length, "Completed", false);
  activeRunKeepsDashboardStable = false;
}

function mergeScopedResults(currentResults, scopedResults) {
  if (!currentResults.length) {
    return scopedResults;
  }

  const mergedResults = [...currentResults];

  for (const result of scopedResults) {
    const resultKey = createDeviceKey(result);
    const resultIndex = mergedResults.findIndex(device => createDeviceKey(device) === resultKey);

    if (resultIndex >= 0) {
      mergedResults[resultIndex] = result;
    } else {
      mergedResults.push(result);
    }
  }

  return mergedResults;
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
  executionMode.textContent = getDashboardExecutionText(payload.checkMode);
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
  executionMode.textContent = getDashboardExecutionText(payload.checkMode);
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
  const replacesDashboard = scopedRun
    && (activeRunFacility || activeRunCategory || activeRunDeviceType)
    && !activeRunDeviceName
    && activeRunFailedIps.size === 0;
  const targetLabel = scopeLabel || "devices";

  if (!scopedRun || replacesDashboard) {
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

  executionMode.textContent = getDashboardExecutionText(payload.checkMode || activeRunCheckMode);
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
  metricAvailability.textContent = summary.availabilityPercentage == null ? '-' : `${formatPercent(summary.availabilityPercentage)}%`;
}

function createSummaryFromCategories(categories) {
  const devices = categories.flatMap(category => category.devices ?? []);
  return createProgressSummary(devices, devices.length);
}

function createSummaryFromResults(results) {
  const checked = results.filter(result => result.status !== 'Pending');
  return { ...createProgressSummary(results, results.length),
    availabilityPercentage: checked.length ? createProgressSummary(checked).availabilityPercentage : null };
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
  renderFacilityTabs();
  updateDashboardFilterReset();
  const visibleResults = getVisibleResults();
  renderSummary(createSummaryFromResults(visibleResults));
  if (!dashboardInventoryAvailable) {
    resultsBody.innerHTML = '<div class="text-center text-secondary py-4">Inventory unavailable.</div>';
    return;
  }

  if (activeFacility) {
    renderCategories(filterCategories(groupResultsByCategory(visibleResults)), activeFacility);
    return;
  }

  renderFacilities(groupResultsByFacility(visibleResults));
}

function createDefaultReportsFilters() {
  return {
    profile: '',
    period: 'all',
    runKey: '',
    deviceKey: '',
    search: "",
    status: "",
    mode: "",
    facility: "",
    category: "",
    fromDate: "",
    toDate: ""
  };
}

function createDefaultIntegrationsState() {
  return {
    schemaVersion: 1,
    inventorySource: {
      mode: "localJson",
      localJsonPath: "config.json",
      endpointUrl: "",
      method: "GET"
    },
    reportDestination: {
      enabled: false,
      endpointUrl: "",
      method: "POST",
      includeSummary: true,
      includeRows: true
    }
  };
}

async function loadReports({ showBusy = true, showErrors = true } = {}) {
  const providerVersion = ++reportsLoadVersion;
  let storage;
  try {
    const storageResponse = await fetch('/api/storage');
    if (!storageResponse.ok) throw new Error('Unable to determine storage provider.');
    storage = await storageResponse.json();
  } catch (error) {
    if (providerVersion === reportsLoadVersion) { reportsAvailable = false; reportsBusy = false; showReportsAlert('danger',error.message); renderReports(true); }
    return;
  }
  if (providerVersion !== reportsLoadVersion || currentRoute !== '/reports') return;
  reportsSqlEnabled = storage.provider === 'sqlite' && storage.schemaVersion >= 2;
  if (reportsSqlEnabled) return window.netwatchSqlReports.load();
  reportsSqlState = null;
  const version = ++reportsLoadVersion;
  reportsBusy = true;
  reportsAvailable = false;
  reportsRows = [];
  reportsState = { schemaVersion: 1, runs: [] };
  clearReportsAlert();
  closeReportDetail(true);
  renderReports();
  try {
    const response = await fetch('/api/history');
    const payload = await readJsonResponse(response);
    if (version !== reportsLoadVersion) return;
    if (!response.ok) throw new Error(payload.error || payload.detail || 'Unable to load report history.');
    validateReportHistory(payload);
    reportsState = payload;
    reportsRows = flattenHistoryRows(payload.runs);
    reportsAvailable = true;
    populateReportFilterOptions();
  } catch (error) {
    if (version !== reportsLoadVersion) return;
    if (showErrors) showReportsAlert('danger', error.message || 'Unable to load report history.');
  } finally {
    if (version === reportsLoadVersion) {
      reportsBusy = false;
      renderReports();
    }
  }
}

function validateReportHistory(payload) {
  if (!Array.isArray(payload?.runs) || payload.runs.some(run => {
    if (!run || typeof run.runId !== 'string' || !run.runId) return true;
    return (run.results != null && !Array.isArray(run.results))
      || (run.results ?? []).some(result => !result || typeof result !== 'object' || Array.isArray(result));
  })) throw new Error('History response is invalid. Refresh to retry.');
}

function reportNumber(value) {
  if (!['number', 'string'].includes(typeof value) || (typeof value === 'string' && !value.trim())) return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function reportDate(value) {
  const time = reportTime(value);
  return time === null ? 'Not recorded' : formatDate(new Date(time).toISOString());
}

function reportTime(value) {
  if (value === null || value === undefined || value === '') return null;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : null;
}

function reportProfileKey(value) {
  return JSON.stringify([value.region || '', value.supportGroup || ''].map(part => String(part).trim().toLowerCase()));
}

function reportProfileLabel(value) {
  return `${value.supportGroup || 'Unrecorded group'} / ${value.region || 'Unrecorded region'}`;
}

function reportDeviceKey(row) {
  return JSON.stringify([row.region, row.supportGroup, row.facility, row.category, row.deviceName, row.ip]
    .map(part => String(part || '').trim().toLowerCase()));
}

function reportRunProfile(run) {
  const first = (run.results ?? [])[0];
  return { region: run.scope?.region || first?.region || '', supportGroup: run.scope?.supportGroup || first?.supportGroup || '' };
}

function reportRunKey(run, index) {
  return JSON.stringify([run.runId, run.startedAt || null, run.completedAt || null, run._ordinal ?? index]);
}

function flattenHistoryRows(runs) {
  return runs.flatMap((run, runIndex) => (run.results ?? []).map((result, resultIndex) => {
    const checks = Array.isArray(result.checks) ? result.checks : [];
    const ping = checks.find(check => check?.type === 'ping' && check.isAvailable === true);
    const latency = reportNumber(ping?.latencyMs)
      ?? (ping || !checks.length ? reportNumber(result.latencyMs) : null);
    return {
      rowId: `${runIndex}-${resultIndex}`, runIndex, runId: run.runId, runKey: reportRunKey(run, runIndex),
      completedAt: run.completedAt, startedAt: run.startedAt, checkedAt: result.lastCheck || run.completedAt,
      durationMs: reportNumber(run.durationMs), checkMode: run.checkMode || 'Full',
      executionStatus: run.executionStatus || 'Not recorded',
      deviceName: result.name || 'Unnamed', ip: result.ip || '', hostname: result.hostname || '',
      facility: result.facility || 'Unassigned', category: result.category || 'Unassigned',
      region: result.region || run.scope?.region || '', supportGroup: result.supportGroup || run.scope?.supportGroup || '',
      status: result.status || 'Unknown', latencyMs: latency, isOnline: result.isOnline === true,
      checks: checks.filter(check => check && typeof check === 'object' && !Array.isArray(check))
    };
  }));
}

function populateReportFilterOptions() {
  if (reportsSqlEnabled) return window.netwatchSqlReports.options();
  const profiles = new Map();
  for (const value of [...reportsRows, ...reportsState.runs.filter(run => !(run.results ?? []).length).map(reportRunProfile)]) {
    profiles.set(reportProfileKey(value), reportProfileLabel(value));
  }
  syncSelectOptions(reportsProfileFilter, [...profiles].map(([value, label]) => ({ value, label })), 'All support groups', 'profile');
  const scoped = reportsRows.filter(row => !reportsFilters.profile || reportProfileKey(row) === reportsFilters.profile);
  syncSelectOptions(reportsFacilityFilter, scoped.map(row => row.facility), 'All facilities', 'facility');
  syncSelectOptions(reportsCategoryFilter, scoped.filter(row => !reportsFilters.facility || row.facility === reportsFilters.facility)
    .map(row => row.category), 'All categories', 'category');
}

function syncSelectOptions(select, values, defaultLabel, key) {
  const previousLabel = select.selectedOptions[0]?.textContent;
  const options = new Map(values.map(value => typeof value === 'object' ? [value.value, value.label] : [value, value]));
  const selected = reportsFilters[key];
  select.innerHTML = `<option value="">${escapeHtml(defaultLabel)}</option>` + [...options]
    .sort((a, b) => String(a[1]).localeCompare(String(b[1])))
    .map(([value, label]) => `<option value="${escapeAttribute(value)}">${escapeHtml(label)}</option>`).join('');
  if (selected && !options.has(selected)) select.add(new Option(previousLabel?.startsWith('Unavailable:') ? previousLabel : `Unavailable: ${previousLabel || selected}`, selected));
  select.value = selected;
}

function localReportDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function applyReportPeriod() {
  const period = reportsFilters.period;
  if (period !== 'custom') {
    reportsFilters.fromDate = '';
    reportsFilters.toDate = '';
    if (period !== 'all') {
      const end = new Date();
      const start = new Date(end.getFullYear(), end.getMonth(), end.getDate());
      start.setDate(start.getDate() - ((Number(period) || 1) - 1));
      reportsFilters.fromDate = localReportDate(start);
      reportsFilters.toDate = localReportDate(end);
    }
  }
  reportsPeriodFilter.value = period;
  reportsFromDateInput.value = reportsFilters.fromDate;
  reportsToDateInput.value = reportsFilters.toDate;
  document.querySelector('#reports-custom-dates').hidden = period !== 'custom';
}

function invalidReportRange() {
  return Boolean(reportsFilters.fromDate && reportsFilters.toDate && reportsFilters.fromDate > reportsFilters.toDate);
}

function matchesReportTime(value) {
  const time = reportTime(value);
  const from = reportsFilters.fromDate ? new Date(`${reportsFilters.fromDate}T00:00:00`).getTime() : null;
  const to = reportsFilters.toDate ? new Date(`${reportsFilters.toDate}T23:59:59.999`).getTime() : null;
  return (from === null && to === null) || (time !== null && (from === null || time >= from) && (to === null || time <= to));
}

function getFilteredReportRows() {
  if (!reportsAvailable || reportsBusy || invalidReportRange()) return [];
  if (reportsSqlEnabled) return reportsRows;
  const search = reportsFilters.search.trim().toLowerCase();
  return reportsRows.filter(row => {
    const matchesSearch = !search || [row.deviceName, row.ip, row.hostname, row.facility, row.category, row.region,
      row.supportGroup, row.runId, ...row.checks.map(check => check.url || '')]
      .some(value => String(value).toLowerCase().includes(search));
    const knownStatus = ['Healthy', 'Degraded', 'Down'].includes(row.status);
    return matchesSearch && matchesReportTime(row.completedAt)
      && (!reportsFilters.profile || reportProfileKey(row) === reportsFilters.profile)
      && (!reportsFilters.facility || row.facility === reportsFilters.facility)
      && (!reportsFilters.category || row.category === reportsFilters.category)
      && (!reportsFilters.mode || row.checkMode === reportsFilters.mode)
      && (!reportsFilters.runKey || row.runKey === reportsFilters.runKey)
      && (!reportsFilters.deviceKey || reportDeviceKey(row) === reportsFilters.deviceKey)
      && (!reportsFilters.status || (reportsFilters.status === 'Problems' ? isProblemReportRow(row)
        : reportsFilters.status === 'Unknown' ? !knownStatus : row.status === reportsFilters.status));
  });
}

function getFilteredReportRuns(rows) {
  if (!reportsAvailable || reportsBusy || invalidReportRange()) return [];
  const matchingIndices = new Set(rows.map(row => row.runIndex));
  return reportsState.runs.filter((run, index) => matchingIndices.has(index) || (
    !(run.results ?? []).length && matchesReportTime(run.completedAt)
    && (!reportsFilters.mode || (run.checkMode || 'Full') === reportsFilters.mode)
    && (!reportsFilters.profile || reportProfileKey(reportRunProfile(run)) === reportsFilters.profile)
    && (!reportsFilters.runKey || reportRunKey(run, index) === reportsFilters.runKey)
    && !reportsFilters.search.trim() && !reportsFilters.status && !reportsFilters.facility
    && !reportsFilters.category && !reportsFilters.deviceKey));
}

function renderReports(fromSql = false) {
  if (reportsSqlEnabled && !fromSql) { window.netwatchSqlReports.render(); return; }
  applyReportPeriod();
  const rows = getFilteredReportRows();
  renderReportsSummary(rows);
  renderFacilityPerformance(rows);
  renderCategoryPerformance(rows);
  renderRecentRunsExecutive(rows);
  renderReportsTable(sortReportRows(rows));
  renderReportContext(rows);
  setReportView(reportsActiveView);
  setReportSummaryGroup(reportsSummaryGroup);
}

function renderReportsSummary(rows) {
  if (reportsSqlEnabled && reportsSqlState) return window.netwatchSqlReports.metrics();
  const available = reportsAvailable && !reportsBusy && !invalidReportRange();
  const healthy = rows.filter(row => row.status === 'Healthy').length;
  const measured = rows.filter(row => ['Healthy', 'Degraded', 'Down'].includes(row.status)).length;
  reportsRunCount.textContent = available ? formatNumber(getFilteredReportRuns(rows).length) : '-';
  reportsDeviceCount.textContent = available ? formatNumber(new Set(rows.map(reportDeviceKey)).size) : '-';
  reportsRowCount.textContent = available ? formatNumber(rows.length) : '-';
  reportsProblemCount.textContent = available ? formatNumber(rows.filter(isProblemReportRow).length) : '-';
  reportsAvgAvailability.textContent = available ? reportPercent(averageAvailabilityFromRows(rows)) : '-';
  reportsAvgAvailability.title = 'Healthy / known-status evaluations; not time-based uptime';
  reportsHealthyCount.textContent = available && measured ? `${formatNumber(healthy)} / ${formatNumber(measured)}` : '';
  reportsTableSummary.textContent = `${formatNumber(rows.length)} evaluations`;
}

function renderReportContext(rows) {
  const available = reportsAvailable && !reportsBusy;
  const valid = !invalidReportRange();
  const hasData = reportsSqlEnabled ? Number(reportsSqlState?.devices.coverage.runs || 0) > 0 : reportsState.runs.length > 0;
  document.querySelector('#reports-range-error').textContent = valid ? '' : 'From must be on or before To.';
  reportsPage.querySelectorAll('.reports-filterbar input, .reports-filterbar select, #reports-custom-dates input')
    .forEach(control => { control.disabled = !available; });
  reportsExportMenu.disabled = !available || !valid || !(reportsSqlEnabled ? reportsSqlState?.devices.metrics.evaluations : rows.length);
  exportReportsButton.disabled = reportsExportMenu.disabled;
  reportsCsvButton.disabled = reportsExportMenu.disabled;
  refreshReportsButton.disabled = reportsBusy;
  reportsPage.querySelectorAll('.table-sort-button, .reports-page-size, .reports-mobile-sort select').forEach(control => { control.disabled = !available || !valid; });
  reportsPage.querySelectorAll('.table-sort-button').forEach(control => { control.tabIndex = reportsMobileQuery.matches ? -1 : 0; });
  const dates = reportsSqlEnabled ? [reportsSqlState?.devices.coverage.earliest,reportsSqlState?.devices.coverage.latest].filter(time => time != null)
    : reportsState.runs.map(run => reportTime(run.completedAt)).filter(time => time !== null).sort((a, b) => a - b);
  document.querySelector('#reports-coverage').textContent = reportsBusy ? 'Updating history...'
    : !reportsAvailable ? 'History unavailable' : !hasData ? 'No recorded executions'
      : dates.length ? `Recorded: ${reportDate(dates[0])} - ${reportDate(dates.at(-1))}` : 'Dates not recorded';
  const state = document.querySelector('#reports-state');
  state.textContent = reportsBusy ? 'Loading history...' : !reportsAvailable ? 'Unable to load history. Refresh to retry.'
    : !valid ? 'Invalid date range.' : !hasData ? 'No monitoring executions recorded.'
      : !(reportsSqlEnabled ? reportsSqlState?.devices.metrics.runs : rows.length || getFilteredReportRuns(rows).length) ? 'No results match the selected filters.' : '';
  if (available && !hasData) {
    const link = document.createElement('a');
    link.href = '/';
    link.className = 'ms-2';
    link.textContent = 'Dashboard';
    state.append(link);
  }
  const chips = [];
  const add = (key, label) => { if (reportsFilters[key]) chips.push({ key, label }); };
  add('search', `Search: ${reportsFilters.search}`);
  if (reportsFilters.profile) add('profile', `Group: ${reportsProfileFilter.selectedOptions[0]?.textContent || 'Unavailable'}`);
  add('facility', `Facility: ${reportsFilters.facility}`);
  add('category', `Category: ${reportsFilters.category}`);
  add('status', `Result: ${reportsFilters.status}`);
  add('mode', `Mode: ${getCheckModeLabel(reportsFilters.mode)}`);
  if (reportsFilters.period !== 'all') chips.push({ key: 'period', label: reportsFilters.period === 'custom'
    ? `Period: ${reportsFilters.fromDate || 'Any'} - ${reportsFilters.toDate || 'Any'}`
    : `Period: ${reportsPeriodFilter.selectedOptions[0].textContent}` });
  if (reportsFilters.runKey) add('runKey', `Execution: ${reportDate(reportsState.runs.find((run, index) => reportRunKey(run, index) === reportsFilters.runKey)?.completedAt)}`);
  if (reportsFilters.deviceKey) add('deviceKey', `Device: ${reportsRows.find(row => reportDeviceKey(row) === reportsFilters.deviceKey)?.deviceName || 'Unavailable'}`);
  document.querySelector('#reports-active-filters').innerHTML = chips.map(chip =>
    `<button type="button" class="report-filter-chip" data-report-remove-filter="${chip.key}" title="Remove ${escapeAttribute(chip.label)}" ${!available ? 'disabled' : ''}><span>${escapeHtml(chip.label)}</span><i class="fa-solid fa-xmark" aria-hidden="true"></i></button>`).join('');
  resetReportFiltersButton.disabled = !available || chips.length === 0;
}

function setReportView(view, focus = false) {
  reportsActiveView = ['summary', 'runs', 'devices'].includes(view) ? view : 'summary';
  reportsPage.querySelectorAll('[data-report-view]').forEach(tab => {
    const selected = tab.dataset.reportView === reportsActiveView;
    tab.setAttribute('aria-selected', String(selected));
    tab.tabIndex = selected ? 0 : -1;
    document.querySelector(`#reports-${tab.dataset.reportView}-view`).hidden = !selected;
    if (selected && focus) tab.focus();
  });
}

function setReportSummaryGroup(group) {
  reportsSummaryGroup = group === 'category' ? 'category' : 'facility';
  for (const key of ['facility', 'category']) {
    document.querySelector(`#reports-${key}-panel`).hidden = key !== reportsSummaryGroup;
    const button = reportsPage.querySelector(`[data-report-group="${key}"]`);
    button.classList.toggle('active', key === reportsSummaryGroup);
    button.setAttribute('aria-pressed', String(key === reportsSummaryGroup));
  }
  renderReportSortControls();
}

function renderReportSortControls() {
  const groupState = reportsSummaryGroup === 'facility' ? reportsFacilitySort : reportsCategorySort;
  const fill = (id, columns, state) => {
    const select = document.querySelector(id);
    select.innerHTML = columns.flatMap(([key, label, type]) => ['asc', 'desc'].map(direction => {
      const order = type === 'date' ? direction === 'asc' ? 'oldest first' : 'newest first'
        : type === 'number' ? direction === 'asc' ? 'low to high' : 'high to low' : direction === 'asc' ? 'A-Z' : 'Z-A';
      return `<option value="${key}:${direction}">${label}: ${order}</option>`;
    })).join('');
    select.value = `${state.key}:${state.direction}`;
  };
  fill('#reports-summary-sort', [[reportsSummaryGroup, reportsSummaryGroup === 'facility' ? 'Facility' : 'Category'],
    ['rowCount', 'Evaluations', 'number'], ['availability', 'Healthy %', 'number'], ['problemCount', 'Problems', 'number'],
    ['averageLatency', 'Avg ping', 'number'], ...(reportsSummaryGroup === 'category' ? [['facilityCount', 'Facilities', 'number']] : [])], groupState);
  fill('#reports-run-sort', [['completedAt', 'Completed', 'date'], ['scopeLabel', 'Scope'],
    ['rowCount', 'Evaluations', 'number'], ['availability', 'Healthy %', 'number']], reportsRunSort);
  fill('#reports-device-sort', [['completedAt', 'Recorded', 'date'], ['deviceName', 'Device'], ['facility', 'Facility'],
    ['status', 'Result'], ['checkMode', 'Mode']], reportsSort);
}

function reportPercent(value) {
  return value === null ? '-' : `${formatPercent(value)}%`;
}

function reportMilliseconds(value) {
  return value === null ? '-' : `${formatNumber(Math.round(value))} ms`;
}

function renderFacilityPerformance(rows) {
  const facilities = sortReportSummaryRows(createFacilityPerformanceRows(rows), reportsFacilitySort);
  reportsFacilityPage = clampReportsPage(reportsFacilityPage, facilities.length, reportsFacilityPageSize);
  updateReportSortButtons('[data-report-facility-sort]', reportsFacilitySort, 'reportFacilitySort');
  updateSummaryPagination(reportsFacilityPageSummary, reportsFacilityPrevPageButton, reportsFacilityNextPageButton,
    reportsFacilityPage, reportsFacilityPageSize, reportsSqlState?.facility.total ?? facilities.length, 'facility groups');
  reportsFacilityPerformanceSummary.textContent = `${formatNumber(reportsSqlState?.facility.total ?? facilities.length)} facility groups`;
  reportsFacilityExecutiveBody.innerHTML = facilities.length ? getPageRows(facilities, reportsFacilityPage, reportsFacilityPageSize).map(item => `
    <tr><td><button type="button" class="report-link fw-semibold" data-report-facility="${escapeAttribute(item.facility)}" data-report-profile="${escapeAttribute(item.profile)}">${escapeHtml(item.facility)}</button><div class="small text-secondary">${escapeHtml(item.profileLabel)}</div></td>
    <td class="text-end" data-label="Evaluations">${formatNumber(item.rowCount)}</td><td class="text-end" data-label="Healthy %">${reportPercent(item.availability)}</td>
    <td class="text-end" data-label="Problems">${formatNumber(item.problemCount)}</td><td class="text-end" data-label="Avg ping">${reportMilliseconds(item.averageLatency)}</td></tr>`).join('')
    : '<tr><td colspan="5" class="text-secondary py-4">No facility results.</td></tr>';
}

function renderCategoryPerformance(rows) {
  const categories = sortReportSummaryRows(createCategoryPerformanceRows(rows), reportsCategorySort);
  reportsCategoryPage = clampReportsPage(reportsCategoryPage, categories.length, reportsCategoryPageSize);
  updateReportSortButtons('[data-report-category-sort]', reportsCategorySort, 'reportCategorySort');
  updateSummaryPagination(reportsCategoryPageSummary, reportsCategoryPrevPageButton, reportsCategoryNextPageButton,
    reportsCategoryPage, reportsCategoryPageSize, reportsSqlState?.category.total ?? categories.length, 'category groups');
  reportsCategoryPerformanceSummary.textContent = `${formatNumber(reportsSqlState?.category.total ?? categories.length)} category groups`;
  reportsCategoryExecutiveBody.innerHTML = categories.length ? getPageRows(categories, reportsCategoryPage, reportsCategoryPageSize).map(item => `
    <tr><td><button type="button" class="report-link fw-semibold" data-report-category="${escapeAttribute(item.category)}" data-report-profile="${escapeAttribute(item.profile)}">${escapeHtml(item.category)}</button><div class="small text-secondary">${escapeHtml(item.profileLabel)}</div></td>
    <td class="text-end" data-label="Facilities">${formatNumber(item.facilityCount)}</td><td class="text-end" data-label="Evaluations">${formatNumber(item.rowCount)}</td>
    <td class="text-end" data-label="Healthy %">${reportPercent(item.availability)}</td><td class="text-end" data-label="Problems">${formatNumber(item.problemCount)}</td><td class="text-end" data-label="Avg ping">${reportMilliseconds(item.averageLatency)}</td></tr>`).join('')
    : '<tr><td colspan="6" class="text-secondary py-4">No category results.</td></tr>';
}

function renderRecentRunsExecutive(rows) {
  const runs = sortReportSummaryRows(createRecentRunRows(rows), reportsRunSort);
  reportsRunPage = clampReportsPage(reportsRunPage, runs.length, reportsRunPageSize);
  updateReportSortButtons('[data-report-run-sort]', reportsRunSort, 'reportRunSort');
  updateSummaryPagination(reportsRunsPageSummary, reportsRunsPrevPageButton, reportsRunsNextPageButton,
    reportsRunPage, reportsRunPageSize, reportsSqlState?.runs.total ?? runs.length, 'executions');
  reportsRunsSummary.textContent = `${formatNumber(reportsSqlState?.runs.total ?? runs.length)} executions`;
  disposeManagementMenus(reportsRecentRunsBody);
  reportsRecentRunsBody.innerHTML = runs.length ? getPageRows(runs, reportsRunPage, reportsRunPageSize).map(run => `
    <tr data-report-run="${escapeAttribute(run.runId)}">
      <td data-label="Completed">${escapeHtml(reportDate(run.completedAt))}<div class="small text-secondary">${escapeHtml(getCheckModeLabel(run.checkMode))} / ${escapeHtml(run.executionStatus)}</div></td>
      <td data-label="Support group">${escapeHtml(run.profileLabel)}</td><td data-label="Original scope">${escapeHtml(run.scopeLabel)}<div class="small text-secondary">Run: ${reportMilliseconds(run.durationMs)}</div></td>
      <td class="text-end" data-label="Matching / recorded" title="Matching / recorded evaluations">${formatNumber(run.rowCount)} / ${formatNumber(run.totalCount)}</td><td class="text-end" data-label="Healthy %">${reportPercent(run.availability)}</td>
      <td class="text-end"><div class="reports-row-actions">
        <button class="btn btn-outline-primary btn-sm" type="button" data-report-open-run="${escapeAttribute(run.runKey)}" title="View matching evaluations" aria-label="View execution ${escapeAttribute(reportDate(run.completedAt))}" ${!run.rowCount ? 'disabled' : ''}><i class="fa-solid fa-list" aria-hidden="true"></i></button>
        <div class="dropdown reports-run-menu">
          <button class="btn btn-outline-secondary btn-sm" type="button" data-bs-toggle="dropdown" data-bs-config='{"popperConfig":{"strategy":"fixed"}}' title="Execution actions" aria-label="Actions for execution ${escapeAttribute(reportDate(run.completedAt))}" aria-expanded="false"><i class="fa-solid fa-ellipsis-vertical" aria-hidden="true"></i></button>
          <ul class="dropdown-menu dropdown-menu-end"><li><button class="dropdown-item text-danger" type="button" data-delete-report-run="${escapeAttribute(run.runId)}" ${run.ambiguousId ? 'disabled title="Duplicate legacy ID; deletion unavailable"' : ''}><i class="fa-solid fa-trash-can me-2" aria-hidden="true"></i>Delete execution</button></li></ul>
        </div></div></td></tr>`).join('')
    : '<tr><td colspan="6" class="text-secondary py-4">No executions match these filters.</td></tr>';
}

function createFacilityPerformanceRows(rows) {
  if (reportsSqlEnabled) return window.netwatchSqlReports.groups('facility');
  return [...groupRowsBy(rows, row => JSON.stringify([reportProfileKey(row), row.facility])).values()].map(group => ({
    facility: group[0].facility, profile: reportProfileKey(group[0]), profileLabel: reportProfileLabel(group[0]),
    rowCount: group.length, availability: averageAvailabilityFromRows(group),
    problemCount: group.filter(isProblemReportRow).length, averageLatency: average(group.map(row => row.latencyMs))
  }));
}

function createCategoryPerformanceRows(rows) {
  if (reportsSqlEnabled) return window.netwatchSqlReports.groups('category');
  return [...groupRowsBy(rows, row => JSON.stringify([reportProfileKey(row), row.category])).values()].map(group => ({
    category: group[0].category, profile: reportProfileKey(group[0]), profileLabel: reportProfileLabel(group[0]),
    rowCount: group.length, facilityCount: new Set(group.map(row => row.facility)).size,
    availability: averageAvailabilityFromRows(group), problemCount: group.filter(isProblemReportRow).length,
    averageLatency: average(group.map(row => row.latencyMs))
  }));
}

function createRecentRunRows(rows) {
  if (reportsSqlEnabled) return window.netwatchSqlReports.runs();
  const grouped = groupRowsBy(rows, row => row.runIndex);
  const ids = groupRowsBy(reportsState.runs, run => run.runId);
  return getFilteredReportRuns(rows).map(run => {
    const index = reportsState.runs.indexOf(run);
    const matching = grouped.get(index) || [];
    return {
      runKey: reportRunKey(run, index), ambiguousId: ids.get(run.runId).length > 1,
      runId: run.runId, completedAt: run.completedAt, checkMode: run.checkMode || 'Full',
      executionStatus: run.executionStatus || 'Not recorded', scopeLabel: getRunScopeLabel(run.scope),
      profileLabel: reportProfileLabel(reportRunProfile(run)), rowCount: matching.length,
      totalCount: (run.results ?? []).length, availability: averageAvailabilityFromRows(matching),
      problemCount: matching.filter(isProblemReportRow).length, durationMs: reportNumber(run.durationMs)
    };
  });
}

function getRunScopeLabel(scope) {
  if (!scope) return 'Not recorded';
  if (scope.deviceType) {
    const base = getRunScopeLabel({ ...scope, deviceType: null });
    return `${base} / Device type: ${scope.deviceType}`;
  }
  if (scope.deviceName) return `Device: ${scope.deviceName}`;
  if (scope.deviceIps?.length) return `Selected devices: ${scope.deviceIps.length}`;
  if (scope.category) return scope.facility ? `${scope.facility} / ${scope.category}` : `Category: ${scope.category}`;
  if (scope.facility) return `Facility: ${scope.facility}`;
  return 'All facilities';
}

function sortReportSummaryRows(rows, sortState) {
  if (reportsSqlEnabled) return rows;
  const direction = sortState.direction === 'asc' ? 1 : -1;
  return [...rows].sort((left, right) => {
    const a = left[sortState.key], b = right[sortState.key];
    if (a == null) return b == null ? 0 : 1;
    if (b == null) return -1;
    if (typeof a === 'number' && typeof b === 'number') return (a - b) * direction;
    return (sortState.key === 'completedAt' ? new Date(a).getTime() - new Date(b).getTime()
      : String(a).localeCompare(String(b))) * direction;
  });
}

function sortReportRows(rows) {
  return sortReportSummaryRows(rows, reportsSort);
}

function getPageRows(rows, page, size) {
  if (reportsSqlEnabled) return rows;
  return rows.slice((page - 1) * size, page * size);
}

function clampReportsPage(page, count, size) {
  if (reportsSqlEnabled) return page;
  return Math.min(Math.max(1, page), Math.max(1, Math.ceil(count / size)));
}

function updateSummaryPagination(summary, previous, next, page, size, count, label) {
  const pages = Math.max(1, Math.ceil(count / size));
  summary.textContent = count ? `${formatNumber((page - 1) * size + 1)}-${formatNumber(Math.min(page * size, count))} / ${formatNumber(count)} ${label}`
    : `0 ${label}`;
  previous.disabled = page <= 1 || reportsBusy || !reportsAvailable;
  next.disabled = page >= pages || reportsBusy || !reportsAvailable;
}

function groupRowsBy(rows, selector) {
  const groups = new Map();
  for (const row of rows) {
    const key = selector(row);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }
  return groups;
}

function isProblemReportRow(row) {
  return row.status === 'Degraded' || row.status === 'Down';
}

function average(values) {
  const numbers = values.filter(value => value !== null && Number.isFinite(value));
  return numbers.length ? numbers.reduce((sum, value) => sum + value, 0) / numbers.length : null;
}

function averageAvailabilityFromRows(rows) {
  const measured = rows.filter(row => ['Healthy', 'Degraded', 'Down'].includes(row.status));
  return measured.length ? measured.filter(row => row.status === 'Healthy').length / measured.length * 100 : null;
}

function renderReportsTable(rows) {
  reportsCurrentPage = clampReportsPage(reportsCurrentPage, rows.length, reportsPageSize);
  updateReportSortButtons('[data-report-sort]', reportsSort, 'reportSort');
  reportsTableBody.innerHTML = rows.length ? getPageRows(rows, reportsCurrentPage, reportsPageSize).map(row => `
    <tr data-report-evaluation="${escapeAttribute(row.rowId)}">
      <td><button class="report-link fw-semibold" type="button" data-report-detail="${escapeAttribute(row.rowId)}">${escapeHtml(row.deviceName)}</button><div class="small text-secondary">${escapeHtml(row.hostname || row.ip || 'Address not recorded')}</div>${row.hostname && row.ip ? `<div class="small text-secondary">${escapeHtml(row.ip)}</div>` : ''}</td>
      <td data-label="Facility">${escapeHtml(row.facility)}<div class="small text-secondary">${escapeHtml(row.category)}</div><div class="small text-secondary">${escapeHtml(reportProfileLabel(row))}</div></td>
      <td data-label="Recorded">${escapeHtml(reportDate(row.completedAt))}</td><td data-label="Result">${renderReportStatusBadge(row.status)}</td><td data-label="Mode">${escapeHtml(getCheckModeLabel(row.checkMode))}</td>
      <td class="text-end"><button class="btn btn-outline-secondary icon-button btn-sm" type="button" data-report-detail="${escapeAttribute(row.rowId)}" title="View evaluation" aria-label="View evaluation for ${escapeAttribute(row.deviceName)}"><i class="fa-solid fa-eye" aria-hidden="true"></i></button></td>
    </tr>`).join('') : '<tr><td colspan="6" class="text-secondary py-4">No device evaluations.</td></tr>';
  updateSummaryPagination(reportsPageSummary, reportsPrevPageButton, reportsNextPageButton,
    reportsCurrentPage, reportsPageSize, reportsSqlState?.devices.total ?? rows.length, 'evaluations');
}

function renderReportStatusBadge(status) {
  const styles = { Healthy: ['success', 'circle-check'], Degraded: ['warning', 'triangle-exclamation'], Down: ['danger', 'circle-xmark'] };
  const known = Object.hasOwn(styles, status);
  const [color, icon] = known ? styles[status] : ['secondary', 'circle-question'];
  return `<span class="badge text-bg-${color}"><i class="fa-solid fa-${icon} me-1" aria-hidden="true"></i>${escapeHtml(known ? status : 'Not recorded')}</span>`;
}

function updateReportSortButtons(selector, sortState, key) {
  document.querySelectorAll(selector).forEach(button => {
    const selected = button.dataset[key] === sortState.key;
    const label = button.textContent.replace(/[ ↑↓]+$/u, '');
    button.textContent = label + (selected ? sortState.direction === 'asc' ? ' ↑' : ' ↓' : '');
    button.classList.toggle('active', selected);
    button.closest('th').setAttribute('aria-sort', selected ? sortState.direction === 'asc' ? 'ascending' : 'descending' : 'none');
  });
}

function resetReportsViewState({ resetView = true } = {}) {
  reportsFilters = createDefaultReportsFilters();
  reportsSort = { key: 'completedAt', direction: 'desc' };
  reportsFacilitySort = { key: 'problemCount', direction: 'desc' };
  reportsCategorySort = { key: 'problemCount', direction: 'desc' };
  reportsRunSort = { key: 'completedAt', direction: 'desc' };
  reportsCurrentPage = reportsFacilityPage = reportsCategoryPage = reportsRunPage = 1;
  for (const control of [reportsSearchInput, reportsStatusFilter, reportsModeFilter, reportsProfileFilter,
    reportsFacilityFilter, reportsCategoryFilter, reportsFromDateInput, reportsToDateInput]) control.value = '';
  reportsPeriodFilter.value = 'all';
  if (resetView) {
    ++reportsLoadVersion;
    reportsAvailable = false;
    reportsRows = [];
    reportsState = { schemaVersion: 1, runs: [] };
    closeReportDetail(true);
    setReportView('summary');
    setReportSummaryGroup('facility');
  }
  clearReportsAlert();
}

function renderReportsFromFirstPage() {
  reportsCurrentPage = reportsFacilityPage = reportsCategoryPage = reportsRunPage = 1;
  renderReports();
}

function getNextReportSortState(state, key) {
  return { key, direction: state.key === key ? state.direction === 'asc' ? 'desc' : 'asc'
    : ['completedAt', 'rowCount', 'availability', 'problemCount', 'facilityCount', 'durationMs'].includes(key) ? 'desc' : 'asc' };
}

function removeReportFilter(key) {
  if (!(key in reportsFilters)) return;
  reportsFilters[key] = key === 'period' ? 'all' : '';
  if (key === 'period') reportsFilters.fromDate = reportsFilters.toDate = '';
  reportsSearchInput.value = reportsFilters.search;
  reportsStatusFilter.value = reportsFilters.status;
  reportsModeFilter.value = reportsFilters.mode;
  populateReportFilterOptions();
  renderReportsFromFirstPage();
}

function openReportScope(profile, facility, category) {
  reportsFilters.profile = profile;
  if (facility !== undefined) reportsFilters.facility = facility;
  if (category !== undefined) reportsFilters.category = category;
  reportsFilters.runKey = reportsFilters.deviceKey = '';
  populateReportFilterOptions();
  setReportView('devices', true);
  renderReportsFromFirstPage();
}

function openReportRun(runKey) {
  reportsFilters.runKey = runKey;
  reportsFilters.deviceKey = '';
  closeReportDetail();
  setReportView('devices', true);
  renderReportsFromFirstPage();
}

function openReportDetail(id, trigger) {
  if (!reportsAvailable || reportsBusy || !reportsDetailModal) return;
  const row = getFilteredReportRows().find(item => item.rowId === id);
  if (!row) return;
  reportsSelectedRow = row;
  reportsDetailTrigger = trigger;
  document.querySelector('#reports-detail-title').textContent = row.deviceName;
  const run = reportsState.runs[row.runIndex];
  const facts = [
    ['Result', renderReportStatusBadge(row.status)], ['Recorded', escapeHtml(reportDate(row.checkedAt))],
    ['Support group', escapeHtml(reportProfileLabel(row))], ['Facility', escapeHtml(row.facility)],
    ['Category', escapeHtml(row.category)], ['Address', escapeHtml(row.ip || 'Not recorded')],
    ['Hostname', escapeHtml(row.hostname || 'Not recorded')], ['Mode', escapeHtml(getCheckModeLabel(row.checkMode))],
    ['Original scope', escapeHtml(getRunScopeLabel(run?.scope))], ['Run duration', reportMilliseconds(row.durationMs)],
    ['Execution ID', escapeHtml(row.runId)]
  ];
  document.querySelector('#reports-detail-body').innerHTML = `<dl class="report-detail-meta">${facts.map(([name, value]) => `<dt>${name}</dt><dd>${value}</dd>`).join('')}</dl>
    <h3 class="h6 mt-4">Recorded checks</h3><ul class="report-check-list">${row.checks.length ? row.checks.map(check => {
      const known = typeof check.isAvailable === 'boolean';
      const label = check.label || (check.type === 'tcp' ? `TCP ${check.port ?? ''}` : String(check.type || 'Check').toUpperCase());
      return `<li><div class="report-check-heading"><strong>${escapeHtml(label)}</strong><span class="badge text-bg-${known ? check.isAvailable ? 'success' : 'danger' : 'secondary'}">${known ? check.isAvailable ? 'Passed' : 'Failed' : 'Not recorded'}</span></div>
        ${check.url ? `<p>${escapeHtml(check.url)}</p>` : ''}
        ${check.statusCode != null || check.expectedStatusCode != null ? `<p>HTTP ${escapeHtml(String(check.statusCode ?? 'Not received'))} / expected ${escapeHtml(String(check.expectedStatusCode ?? 'Not recorded'))}</p>` : ''}
        ${check.message || check.status ? `<p>${escapeHtml(check.message || check.status)}</p>` : ''}
        <p class="text-secondary">${check.type === 'ping' ? `Ping: ${reportMilliseconds(reportNumber(check.latencyMs))}` : check.type === 'http' ? `Duration: ${reportMilliseconds(reportNumber(check.durationMs))}` : check.port != null ? `Port: ${escapeHtml(String(check.port))}` : ''}</p></li>`;
    }).join('') : '<li class="text-secondary">Checks not recorded.</li>'}</ul>`;
  document.querySelector('#reports-detail-run').disabled = false;
  document.querySelector('#reports-detail-device').disabled = false;
  reportsDetailModal.show();
}

function closeReportDetail(clear = false) {
  if (reportsDetailModal) hideManagementModal(reportsDetailElement);
  reportsSelectedRow = null;
  if (clear) {
    document.querySelector('#reports-detail-body').replaceChildren();
    document.querySelector('#reports-detail-title').textContent = 'Evaluation unavailable';
    document.querySelector('#reports-detail-run').disabled = true;
    document.querySelector('#reports-detail-device').disabled = true;
  }
}

function csvReportCell(value) {
  let text = value == null ? '' : String(value);
  // Preserve separators/newlines and mitigate formula cells on initial spreadsheet import.
  if (/^[\t\r\n]/u.test(text) || /^[\s\u0000-\u001f]*[=+\-@\uff1d\uff0b\uff0d\uff20]/u.test(text)) text = "'" + text;
  return `"${text.replaceAll('"', '""')}"`;
}

function exportFilteredReports(format = 'json', suppliedRows = null) {
  if (reportsSqlEnabled && !suppliedRows) return window.netwatchSqlReports.export(format);
  reportsFilters.search = reportsSearchInput.value;
  applyReportPeriod();
  const rows = suppliedRows || sortReportRows(getFilteredReportRows());
  if (!rows.length || !reportsAvailable || reportsBusy || invalidReportRange()) return;
  const exportedAt = new Date().toISOString();
  const suffix = exportedAt.slice(0, 19).replaceAll(':', '');
  if (format === 'csv') {
    const columns = ['Recorded UTC', 'Device', 'IP', 'Hostname', 'Region', 'Support group', 'Facility', 'Category',
      'Result', 'Mode', 'Run ID', 'Run duration ms', 'Ping latency ms', 'Checks JSON', 'Applied filters JSON'];
    const records = rows.map(row => [
      reportTime(row.completedAt) !== null ? new Date(row.completedAt).toISOString() : '',
      row.deviceName, row.ip, row.hostname, row.region, row.supportGroup, row.facility, row.category, row.status,
      row.checkMode, row.runId, row.durationMs, row.latencyMs, JSON.stringify(row.checks), JSON.stringify(reportsFilters)
    ]);
    const csv = '\ufeff' + [columns, ...records].map(record => record.map(csvReportCell).join(',')).join('\r\n') + '\r\n';
    downloadJsonBlob(new Blob([csv], { type: 'text/csv;charset=utf-8' }), `netwatch-lite-report-${suffix}.csv`);
  } else {
    downloadJsonBlob(new Blob([JSON.stringify({ exportedAt, filters: reportsFilters, rows }, null, 2) + '\n'],
      { type: 'application/json' }), `netwatch-lite-report-${suffix}.json`);
  }
  showReportsAlert('success', `Filtered report exported as ${format === 'csv' ? 'CSV' : 'JSON'}.`);
}

async function deleteReportRun(runId) {
  if (!reportsAvailable || reportsBusy || reportsConfirmingDelete || reportsState.runs.filter(run => run.runId === runId).length !== 1) return;
  const version = reportsLoadVersion;
  reportsConfirmingDelete = true;
  let confirmed;
  const closeIfStale = () => { if (version !== reportsLoadVersion || currentRoute !== '/reports') managementConfirmModal?.hide(); };
  managementConfirmElement.addEventListener('shown.bs.modal', closeIfStale, { once: true });
  try {
    confirmed = await confirmManagementAction({ title: 'Delete execution',
      message: `Delete the execution recorded ${reportDate(reportsState.runs.find(run => run.runId === runId).completedAt)}? This cannot be undone.` });
  } finally {
    reportsConfirmingDelete = false;
    managementConfirmElement.removeEventListener('shown.bs.modal', closeIfStale);
  }
  if (!confirmed || version !== reportsLoadVersion || !reportsAvailable || reportsBusy) return;
  if (reportsSqlEnabled) window.netwatchSqlReports.cancelPending();
  const mutationVersion = ++reportsLoadVersion;
  reportsBusy = true;
  closeReportDetail(true);
  renderReports(true);
  try {
    const response = await fetch(`/api/history/runs/${encodeURIComponent(runId)}`, { method: 'DELETE' });
    const payload = await readJsonResponse(response);
    if (mutationVersion !== reportsLoadVersion) return;
    if (!response.ok) throw new Error(payload.error || payload.detail || 'Unable to delete execution.');
    validateReportHistory(payload);
    reportsState = payload;
    reportsRows = flattenHistoryRows(payload.runs);
    if (reportsFilters.runKey && !payload.runs.some((run, index) => reportRunKey(run, index) === reportsFilters.runKey)) reportsFilters.runKey = '';
    populateReportFilterOptions();
    showReportsAlert('success', 'Monitoring execution deleted.');
  } catch (error) {
    if (mutationVersion === reportsLoadVersion) showReportsAlert('danger', error.message || 'Unable to delete monitoring execution.');
  } finally {
    if (mutationVersion === reportsLoadVersion) {
      reportsBusy = false;
      renderReports();
      if (currentRoute === '/reports') document.querySelector(`#reports-tab-${reportsActiveView}`).focus();
    }
  }
}

function showReportsAlert(type, message) {
  showPageAlert(reportsAlert, type, message);
}

function clearReportsAlert() {
  clearPageAlert(reportsAlert);
}

async function loadIntegrations({ showBusy = true, showErrors = true } = {}) {
  if (showBusy) {
    setIntegrationsBusy(true);
  }

  try {
    const response = await fetch("/api/integrations");
    const payload = await readJsonResponse(response);

    if (!response.ok) {
      throw new Error(payload.error || payload.detail || `Unable to load integrations (${response.status}).`);
    }

    integrationsState = normalizeIntegrationsState(payload);
    renderIntegrations();
    clearIntegrationsAlert();
  } catch (error) {
    if (showErrors) {
      showIntegrationsAlert("danger", error.message || "Unable to load integrations.");
    }
    console.error(error);
  } finally {
    if (showBusy) {
      setIntegrationsBusy(false);
    }
  }
}

async function saveIntegrations() {
  const configuration = readIntegrationsForm();

  if (!configuration) {
    return;
  }

  setIntegrationsBusy(true);

  try {
    const response = await fetch("/api/integrations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(configuration)
    });
    const payload = await readJsonResponse(response);

    if (!response.ok) {
      throw new Error(payload.error || payload.detail || `Unable to save integrations (${response.status}).`);
    }

    integrationsState = normalizeIntegrationsState(payload.configuration ?? configuration);
    renderIntegrations();
    showIntegrationsAlert("success", "Integration settings saved locally.");
  } catch (error) {
    showIntegrationsAlert("danger", error.message || "Unable to save integrations.");
    console.error(error);
  } finally {
    setIntegrationsBusy(false);
  }
}

function normalizeIntegrationsState(configuration) {
  const defaults = createDefaultIntegrationsState();
  const inventorySource = configuration?.inventorySource ?? {};
  const reportDestination = configuration?.reportDestination ?? {};

  return {
    schemaVersion: Math.max(1, Number(configuration?.schemaVersion) || defaults.schemaVersion),
    inventorySource: {
      mode: inventorySource.mode || defaults.inventorySource.mode,
      localJsonPath: inventorySource.localJsonPath || defaults.inventorySource.localJsonPath,
      endpointUrl: inventorySource.endpointUrl || "",
      method: inventorySource.method || defaults.inventorySource.method
    },
    reportDestination: {
      enabled: Boolean(reportDestination.enabled),
      endpointUrl: reportDestination.endpointUrl || "",
      method: reportDestination.method || defaults.reportDestination.method,
      includeSummary: reportDestination.includeSummary !== false,
      includeRows: reportDestination.includeRows !== false
    },
    updatedAt: configuration?.updatedAt ?? null
  };
}

function renderIntegrations() {
  const inventorySource = integrationsState.inventorySource ?? createDefaultIntegrationsState().inventorySource;
  const reportDestination = integrationsState.reportDestination ?? createDefaultIntegrationsState().reportDestination;

  inventorySourceModeSelect.value = inventorySource.mode;
  inventoryLocalJsonPathInput.value = inventorySource.localJsonPath;
  inventoryEndpointUrlInput.value = inventorySource.endpointUrl;
  inventoryEndpointMethodSelect.value = inventorySource.method;
  reportDestinationEnabledInput.checked = Boolean(reportDestination.enabled);
  reportDestinationUrlInput.value = reportDestination.endpointUrl;
  reportDestinationMethodSelect.value = reportDestination.method;
  reportIncludeSummaryInput.checked = reportDestination.includeSummary !== false;
  reportIncludeRowsInput.checked = reportDestination.includeRows !== false;

  updateIntegrationFormState();
}

function readIntegrationsForm() {
  const inventoryMode = inventorySourceModeSelect.value || "localJson";
  const inventoryEndpointUrl = inventoryEndpointUrlInput.value.trim();
  const reportEnabled = reportDestinationEnabledInput.checked;
  const reportEndpointUrl = reportDestinationUrlInput.value.trim();

  if (inventoryMode === "externalEndpoint" && !inventoryEndpointUrl) {
    showIntegrationsAlert("warning", "External inventory source requires an endpoint URL.");
    inventoryEndpointUrlInput.focus();
    return null;
  }

  if (reportEnabled && !reportEndpointUrl) {
    showIntegrationsAlert("warning", "Enabled report destination requires an endpoint URL.");
    reportDestinationUrlInput.focus();
    return null;
  }

  return {
    schemaVersion: integrationsState.schemaVersion || 1,
    inventorySource: {
      mode: inventoryMode,
      localJsonPath: inventoryLocalJsonPathInput.value.trim() || "config.json",
      endpointUrl: inventoryEndpointUrl,
      method: inventoryEndpointMethodSelect.value || "GET"
    },
    reportDestination: {
      enabled: reportEnabled,
      endpointUrl: reportEndpointUrl,
      method: reportDestinationMethodSelect.value || "POST",
      includeSummary: reportIncludeSummaryInput.checked,
      includeRows: reportIncludeRowsInput.checked
    }
  };
}

function updateIntegrationFormState() {
  const isExternalInventory = inventorySourceModeSelect.value === "externalEndpoint";
  const isReportEnabled = reportDestinationEnabledInput.checked;

  inventoryLocalJsonPathInput.disabled = isExternalInventory;
  inventoryEndpointUrlInput.disabled = !isExternalInventory;
  inventoryEndpointMethodSelect.disabled = !isExternalInventory;
  reportDestinationUrlInput.disabled = !isReportEnabled;
  reportDestinationMethodSelect.disabled = !isReportEnabled;
  reportIncludeSummaryInput.disabled = !isReportEnabled;
  reportIncludeRowsInput.disabled = !isReportEnabled;

  inventorySourceStatus.textContent = isExternalInventory
    ? "External inventory endpoint is configured for a future import workflow."
    : "Using local JSON inventory.";
  reportDestinationStatus.textContent = isReportEnabled
    ? "Report endpoint is configured for a future outbound delivery workflow."
    : "Outbound reports are disabled.";
}

function setIntegrationsBusy(isBusy) {
  saveIntegrationsButton.disabled = isBusy;
  reloadIntegrationsButton.disabled = isBusy;
  saveIntegrationsSpinner.classList.toggle("d-none", !isBusy);
  saveIntegrationsIcon.classList.toggle("d-none", isBusy);
}

function showIntegrationsAlert(type, message) {
  showPageAlert(integrationsAlert, type, message);
}

function clearIntegrationsAlert() {
  clearPageAlert(integrationsAlert);
}

function getVisibleResults() {
  const dashboardDevices = getDashboardDevices().filter(matchesDashboardDeviceType);
  if (!activeFacility) {
    return dashboardDevices;
  }

  const selectedFacility = activeFacility.toLowerCase();
  return dashboardDevices.filter(result =>
    String(result.facility ?? "Unassigned").toLowerCase() === selectedFacility);
}

function getDashboardDevices() {
  if (!dashboardInventoryAvailable) return [];
  const configured = getConfiguredFacilityDevices();
  const results = new Map(latestResults.filter(result => result.deviceType).map(result => [createDeviceKey(result), result]));
  const legacyResults = new Map(latestResults.filter(result => !result.deviceType).map(result => [createDeviceKey(result), result]));
  const legacyCounts = new Map();
  for (const device of configured) {
    const key = createDeviceKey({ ...device, deviceType: null });
    legacyCounts.set(key, (legacyCounts.get(key) || 0) + 1);
  }
  // Pending inventory is presentation only; latestResults/history contain measured results only.
  return configured.map(device => {
    const legacyKey = createDeviceKey({ ...device, deviceType: null });
    const result = results.get(createDeviceKey(device))
      || (legacyCounts.get(legacyKey) === 1 ? legacyResults.get(legacyKey) : null);
    return { ...device, ...result, deviceType: device.deviceType || 'unspecified' };
  });
}

function matchesDashboardDeviceType(device) {
  return !activeDashboardDeviceType || (device.deviceType || 'unspecified') === activeDashboardDeviceType;
}

function dashboardDeviceTypeLabel(id) {
  return configState.deviceTypes?.find(type => type.id === id)?.name || id;
}

function renderDashboardDeviceTypeOptions() {
  const types = configState.deviceTypes ?? initialDeviceTypes;
  dashboardDeviceTypeSelect.innerHTML = '<option value="">All device types</option>' + types.map(type =>
    `<option value="${escapeAttribute(type.id)}">${escapeHtml(type.name)}</option>`).join('');
  if (activeDashboardDeviceType && !types.some(type => type.id === activeDashboardDeviceType)) {
    dashboardDeviceTypeSelect.add(new Option(`Unavailable type: ${activeDashboardDeviceType}`, activeDashboardDeviceType));
  }
  dashboardDeviceTypeSelect.value = activeDashboardDeviceType;
  dashboardDeviceTypeSelect.disabled = !dashboardInventoryAvailable || Boolean(activeMonitorStream);
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
        offlineDevices: devices.filter(device => device.status === 'Down').length
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
    || String(device.websiteUrl ?? "").toLowerCase().includes(search)
    || String(device.notes ?? "").toLowerCase().includes(search)
    || String(device.location ?? "").toLowerCase().includes(search)
    || (device.checks ?? []).some(check => String(check.url ?? '').toLowerCase().includes(search));
}

function renderFacilityTabs() {
  const facilitySource = getDashboardDevices();
  const typedSource = facilitySource.filter(matchesDashboardDeviceType);
  const typedSummaries = new Map(getFacilitySummaries(typedSource).map(facility => [facility.name, facility]));
  const facilitySummaries = getFacilitySummaries(facilitySource).map(facility => typedSummaries.get(facility.name)
    || { ...facility, totalDevices: 0, onlineDevices: 0, pendingDevices: 0, problemDevices: 0 });

  if (!facilitySummaries.some(facility => facility.name === activeFacility)) {
    activeFacility = "";
  }

  const hasActiveFacility = Boolean(activeFacility);
  activeFacilityLabel.textContent = activeFacility
    ? `Showing ${activeFacility}`
    : "Showing all facilities";
  runFacilityCheckButton.disabled = !dashboardInventoryAvailable || Boolean(activeMonitorStream)
    || !typedSource.some(device => !activeFacility || device.facility === activeFacility);
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
      totalDevices: typedSource.length,
      onlineDevices: typedSource.filter(device => device.isOnline).length,
      pendingDevices: typedSource.filter(device => device.status === 'Pending').length,
      problemDevices: typedSource.filter(device => device.status === "Degraded" || device.status === "Down").length
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
      status: "Pending",
      lastCheck: null,
      requestedPorts: (device.checks ?? []).filter(check => check.type === 'tcp').map(check => check.port)
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
      pendingDevices: devices.filter(device => device.status === 'Pending').length,
      problemDevices: devices.filter(device => device.status === "Degraded" || device.status === "Down").length
    }));
}

function renderFacilityButton(facility, isActive) {
  const problemClass = facility.problemDevices > 0 ? 'facility-tab-problem'
    : !facility.totalDevices || facility.pendingDevices > 0 ? 'facility-tab-pending' : 'facility-tab-healthy';
  const activeClass = isActive ? "active" : "";
  const value = facility.name || "";

  return `
    <button
      class="facility-tab ${activeClass} ${problemClass}"
      type="button"
      data-facility-filter="${escapeHtml(value)}">
      <span class="facility-tab-name">${escapeHtml(facility.label)}</span>
      <span class="facility-tab-meta">${facility.totalDevices} devices</span>
      <span class="facility-tab-status">${facility.onlineDevices} online / ${facility.problemDevices} issues${facility.pendingDevices ? ` / ${facility.pendingDevices} not checked` : ''}</span>
    </button>`;
}

function matchesFilter(device, filter) {
  if (filter === "online") {
    return device.isOnline;
  }

  if (filter === "offline") {
    return device.status === 'Down';
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
  const allDevices = facility.categories.flatMap(category => category.devices ?? []);
  const offlineDevices = allDevices.filter(device => device.status === 'Down').length;
  const pendingDevices = allDevices.filter(device => device.status === 'Pending').length;
  const hasPendingState = facility.categories.some(category => (category.stateDevices ?? category.devices ?? []).some(device => device.status === 'Pending'));
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
  const isExpanded = expandedFacilityNames.has(facilityKey) || Boolean(activeSearch.trim());
  const expandedClass = isExpanded ? "facility-section-expanded" : "";
  const statusClass = isRunningFacility
    ? "text-bg-secondary"
    : hasPendingState && isHealthyFacility ? 'text-bg-secondary' : isHealthyFacility ? "text-bg-success" : "text-bg-warning";
  const statusText = isRunningFacility
    ? "Checking"
    : hasPendingState && isHealthyFacility ? 'Not checked' : isHealthyFacility ? "Healthy" : `${problemDevices} issues`;
  const statusIcon = isRunningFacility
    ? "fa-spinner fa-spin"
    : hasPendingState && isHealthyFacility ? 'fa-clock' : isHealthyFacility ? "fa-circle-check" : "fa-triangle-exclamation";

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
            aria-label="Toggle ${escapeAttribute(facility.name)}"
            title="Expand or collapse ${escapeAttribute(facility.name)}"
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
          <span class="facility-counts">${onlineDevices} online / ${offlineDevices} offline${pendingDevices ? ` / ${pendingDevices} not checked` : ''}</span>
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
  const pendingDevices = stateDevices.filter(device => device.status === 'Pending').length;
  const visiblePendingDevices = devices.filter(device => device.status === 'Pending').length;
  const healthyDevices = stateDevices.filter(device => device.status === "Healthy").length;
  const problemDevices = stateDevices.filter(device => device.status === "Degraded" || device.status === "Down").length;
  const downDevices = stateDevices.filter(device => device.status === "Down").length;
  const checkedDevices = stateTotalDevices - pendingDevices;
  const categoryPercent = checkedDevices ? `${Math.round(healthyDevices / checkedDevices * 100)}%` : '-';
  const isHealthyCategory = stateTotalDevices > 0 && problemDevices === 0 && healthyDevices === stateTotalDevices;
  const isDegradedCategory = problemDevices > 0 && downDevices === 0;
  const categoryFacility = facilityName || activeFacility || "";
  const isRunningCategory = activeMonitorStream && !activeRunDeviceName && activeRunFailedIps.size === 0
    && (!activeRunCategory || activeRunCategory.toLowerCase() === String(category.name ?? "").toLowerCase())
    && (!activeRunFacility || !categoryFacility || activeRunFacility.toLowerCase() === categoryFacility.toLowerCase());
  const stateClass = isRunningCategory
    ? "category-section-running"
    : pendingDevices && !problemDevices ? 'category-section-pending'
    : isHealthyCategory ? "category-section-healthy" : isDegradedCategory ? "category-section-degraded" : "category-section-problem";
  const stateIcon = isRunningCategory
    ? "fa-spinner fa-spin"
    : pendingDevices && !problemDevices ? 'fa-clock'
    : isHealthyCategory ? "fa-circle-check" : isDegradedCategory ? "fa-triangle-exclamation" : "fa-circle-xmark";
  const stateLabel = isRunningCategory
    ? "Checking"
    : pendingDevices && !problemDevices ? 'Not checked'
    : isHealthyCategory ? "Healthy" : "Needs attention";
  const categoryKey = createCategoryKey(categoryFacility, category.name);
  const categoryId = `category-${index}-${slugify(categoryFacility)}-${slugify(category.name)}`;
  const isExpanded = expandedCategoryNames.has(categoryKey) || Boolean(activeSearch.trim());
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
            aria-label="Toggle ${escapeAttribute(category.name)}"
            title="Expand or collapse ${escapeAttribute(category.name)}"
            aria-controls="${categoryId}">
            <i class="fa-solid fa-chevron-down"></i>
          </button>
          <div>
            <h2 class="h5 mb-0">${escapeHtml(category.name)}</h2>
            <span class="category-subtitle small">${totalDevices} devices</span>
          </div>
        </div>
        <div class="category-summary d-flex align-items-center justify-content-end gap-2 flex-wrap flex-sm-nowrap ms-auto">
          <span class="category-percent">${categoryPercent}</span>
          <span class="category-state">
            <i class="fa-solid ${stateIcon} me-1"></i>${stateLabel}
          </span>
          <span class="category-counts">
            ${onlineDevices} online / ${offlineDevices} offline${visiblePendingDevices ? ` / ${visiblePendingDevices} not checked` : ''}
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
                <th scope="col">TCP / HTTP</th>
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
  const isPending = result.status === 'Pending';
  const pingCheck = getPingCheck(result);
  const hasPingCheck = Boolean(pingCheck);
  const isPingAvailable = Boolean(pingCheck?.isAvailable);
  const isRunningDevice = isActiveRunDevice(result);
  const isRunningFailedDevice = activeRunFailedIps.has(result.ip)
    && (!activeRunDeviceType || (result.deviceType || 'unspecified') === activeRunDeviceType);
  const statusClass = isPending || !hasPingCheck ? "text-bg-secondary" : isPingAvailable ? "text-bg-success" : "text-bg-danger";
  const statusIcon = isPending ? 'fa-clock' : !hasPingCheck ? "fa-minus" : isPingAvailable ? "fa-check" : "fa-xmark";
  const statusText = isPending && hasPingCheck ? 'Not checked' : isPingAvailable
    ? `Ping OK (${Number(pingCheck.latencyMs) || 0} ms)`
    : hasPingCheck ? formatPingFailureText(pingCheck) : "No ping check";
  const pingTitle = hasPingCheck
    ? `Target: ${result.pingTarget || result.ip}; Status: ${pingCheck.status || "Unknown"}; Timeout: ${configState.settings?.timeoutMs || "configured"} ms`
    : "No ping check is configured for this device.";

  return `
    <tr data-dashboard-device="${escapeAttribute(result.name)}" data-device-type="${escapeAttribute(result.deviceType || 'unspecified')}">
      <td class="fw-semibold">
        <div>${escapeHtml(result.name)}</div>
        ${renderDeviceLocation(result)}
        ${renderDeviceNotes(result)}
        ${renderWorkstationInventory(configState.devices.find(device => createDeviceKey(device) === createDeviceKey(result)))}
        ${!activeFacility ? `<div class="text-secondary small">${escapeHtml(result.facility || "Unassigned")} · ${escapeHtml(result.category || "Uncategorized")}</div>` : ""}
        <div class="device-shortcuts">${renderWebsiteLink(result.websiteUrl)}${renderCommandButton(result.command)}</div>
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
      <td>${renderPorts(result)}${renderDeviceHttpChecks(result)}</td>
      <td class="text-end">
        <div class="device-check-actions">
          <span class="text-secondary small">${isPending ? 'Not checked' : formatDate(result.lastCheck)}</span>
          ${renderDeviceRunButton(result, isRunningDevice || isRunningFailedDevice)}
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
      ${isRunning || activeMonitorStream ? "disabled" : ""}
      data-run-device-name="${escapeHtml(result.name)}"
      data-run-device-ip="${escapeHtml(result.ip)}"
      data-run-device-type="${escapeAttribute(result.deviceType || 'unspecified')}"
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
    && (!activeRunDeviceType || (result.deviceType || 'unspecified') === activeRunDeviceType)
    && (!activeRunFacility || activeRunFacility === (result.facility || "Unassigned"));
}

function formatPingFailureText(pingCheck) {
  const status = String(pingCheck.status || "").trim();

  if (status && status !== "Unknown") {
    return `Ping ${status}`;
  }

  return "Ping failed";
}

function renderDeviceLocation(device) {
  if (!device?.location) return '';
  return `<div class="device-location small fw-normal text-secondary"><i class="fa-solid fa-location-dot" aria-hidden="true"></i><span><span class="visually-hidden">Location: </span><span class="device-location-text">${escapeHtml(device.location)}</span></span></div>`;
}

function renderDeviceNotes(device) {
  if (!device?.notes) return '';
  return `<details class="device-notes small fw-normal text-secondary"><summary aria-label="Notes for ${escapeAttribute(device.name)}"><i class="fa-regular fa-note-sticky me-1" aria-hidden="true"></i>Notes</summary><div class="device-notes-text">${escapeHtml(device.notes)}</div></details>`;
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

function renderCommandButton(command) {
  if (!command) return '';
  return `<button class="btn btn-link btn-sm p-0 device-command-button" type="button" data-copy-command="${escapeAttribute(command)}" title="Copy command" aria-label="Copy command"><i class="fa-solid fa-terminal" aria-hidden="true"></i><span aria-live="polite">Command</span></button>`;
}

async function copyDeviceCommand(button) {
  if (button.disabled) return;
  const previousFocus = document.activeElement;
  button.disabled = true;
  const label = button.querySelector('span');
  let copied = false;
  try {
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard API unavailable.');
      await navigator.clipboard.writeText(button.dataset.copyCommand);
      copied = true;
    } catch {
      const text = document.createElement('textarea');
      text.value = button.dataset.copyCommand;
      text.readOnly = true;
      text.style.position = 'fixed';
      text.style.left = '-9999px';
      document.body.append(text);
      try {
        text.focus({ preventScroll: true });
        text.select();
        copied = document.execCommand('copy');
      } finally {
        text.remove();
      }
    }
  } catch { copied = false; }
  label.textContent = copied ? 'Copied' : 'Copy failed';
  button.title = copied ? 'Command copied' : 'Clipboard unavailable';
  button.disabled = false;
  if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
  setTimeout(() => {
    if (!button.isConnected) return;
    label.textContent = 'Command';
    button.title = 'Copy command';
  }, 2000);
}

function getPingCheck(result) {
  return (result.checks ?? []).find(check =>
    String(check.type ?? "").toLowerCase() === "ping");
}

function renderDeviceStatus(status) {
  const normalizedStatus = status || "Down";
  const statusMap = {
    Pending: { className: 'text-bg-secondary', icon: 'fa-clock', label: 'Not checked' },
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
      offlineDevices: devices.filter(device => device.status === 'Down').length,
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
  const isPingOnlyResult = isPingOnlyMode(result.checkMode);

  if (requestedPorts.length === 0) {
    if ((result.checks ?? []).some(check => check.type === "http")) return "";
    return `<span class="text-secondary">No ports configured</span>`;
  }

  if (result.status === 'Pending') return '<span class="badge text-bg-secondary port-pill">TCP not checked</span>';

  if (isPingOnlyResult) {
    return `
      <span class="badge text-bg-secondary port-pill" title="TCP checks were skipped for this Ping Only execution.">
        <i class="fa-solid fa-forward me-1"></i>Skipped - Ping Only
      </span>`;
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

function renderDeviceHttpChecks(result) {
  if (result.status === 'Pending') {
    return (result.checks ?? []).filter(check => check.type === 'http').map(check =>
      `<div class="http-check-result mt-1"><span class="badge text-bg-secondary">HTTP not checked</span><div class="small text-secondary text-break">${escapeHtml(check.url || '')}</div></div>`).join('');
  }
  if (isPingOnlyMode(result.checkMode)) {
    const device = configState.devices.find(item => createDeviceKey(item) === createDeviceKey(result));
    return device?.checks?.some(check => check.type === "http")
      ? '<div class="small text-secondary mt-1">HTTP skipped - Ping Only</div>' : "";
  }
  return renderHttpChecks(result.checks);
}

function renderHttpChecks(checks = []) {
  return checks.filter(check => check.type === "http").map(check => `
    <div class="http-check-result mt-1">
      <span class="badge ${check.isAvailable ? "text-bg-success" : "text-bg-danger"}">
        <i class="fa-solid ${check.isAvailable ? "fa-check" : "fa-xmark"} me-1"></i>HTTP ${escapeHtml(check.statusCode ?? check.status ?? "Failed")} &middot; ${Number(check.durationMs) || 0} ms
      </span>
      <div class="small text-secondary text-break">${escapeHtml(check.url || "")}</div>
      ${!check.isAvailable ? `<div class="small text-danger">${escapeHtml(check.message || check.status || "HTTP check failed.")}</div>` : ""}
    </div>`).join("");
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

    await loadRegions({ showErrors: true });
    await loadConfig({ clearAlert: false, showBusy: false });
    markDashboardConfigurationStale();
    showConfigAlert("success", `Reloaded active support group inventory. ${formatNumber(payload.count)} devices loaded.`);
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
      headers: { 'X-NetWatch-Profile': regionState.activeProfileId || '' },
      body: formData
    });
    const payload = await readJsonResponse(response);

    if (!response.ok) {
      throw new Error(payload.error || payload.detail || `Import failed with ${response.status}`);
    }

    applyConfigPayload(payload.configuration);
    renderConfigDevices();
    resetDeviceForm();
    markDashboardConfigurationStale();
    showConfigAlert("success", `Imported JSON into the active support group. ${formatNumber(payload.count)} devices loaded.`);
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
    await loadResults({ facility: facility || "", deviceType: activeDashboardDeviceType });
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
    await loadResults({ facility, category, deviceType: activeDashboardDeviceType });
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
  activeRunDeviceType = device.deviceType || 'unspecified';
  activeRunDeviceIp = device.ip;
  activeRunFacility = device.facility || "";
  runFacilityCheckButton.disabled = true;
  runGroupCheckButton.disabled = true;
  runFailedCheckButton.disabled = true;
  renderFilteredCategories();
  setOtherDashboardRunButtonsDisabled(true, device);

  try {
    await loadResults({ facility: device.facility || "", category: device.category || '', deviceType: device.deviceType || 'unspecified', device });
  } finally {
    activeRunDeviceName = "";
    activeRunDeviceType = '';
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
    await loadResults({ devices: failedDevices, facility: activeFacility, deviceType: activeDashboardDeviceType });
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
  executionMode.textContent = getDashboardExecutionText();

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
    renderConfigDevices();
    renderBulkEditDevices();
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
  renderGroupCheckOptions(configState.devices, { preserveSelection: true });
  renderFacilityTabs();
  hasLoadedDashboardGroups = true;
  dashboardConfigStale = false;
}

async function saveConfig(successMessage = "Settings saved to the active support group. The previous version was backed up.") {
  const resolvedSuccessMessage = typeof successMessage === "string"
    ? successMessage
    : "Settings saved to the active support group. The previous version was backed up.";

  setConfigBusy(true);
  clearConfigAlert();

  try {
    if (!syncConfigSettingsFromUi()) {
      return false;
    }

    const response = await fetch("/api/config", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        'X-NetWatch-Profile': regionState.activeProfileId || ''
      },
      body: JSON.stringify(configState)
    });

    const payload = await readJsonResponse(response);

    if (!response.ok) {
      throw new Error(payload.error || payload.detail || payload.title || `Request failed with ${response.status}`);
    }

    applyConfigPayload(payload.configuration);
    renderConfigDevices();
    renderBulkEditDevices();
    resetDeviceForm();
    markDashboardConfigurationStale();
    if (autoRefreshEnabled) {
      scheduleRefresh();
    }
    showConfigAlert("success", resolvedSuccessMessage);
    return true;
  } catch (error) {
    const message = error.message || 'Unable to save configuration.';
    showConfigAlert('danger', message);
    if (deviceFormModalElement.classList.contains('show')) showDeviceCheckAlert(message);
    console.error(error);
    return false;
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
    lastCheck.textContent = 'Configuration updated. No checks yet.';
  }
}

function applyConfigPayload(payload) {
  configState = payload;
  configState.devices ??= [];
  dashboardInventoryAvailable = true;
  configState.peripheralCatalog ??= [];
  configState.deviceTypes ??= initialDeviceTypes.map(type => ({ ...type }));
  renderDashboardDeviceTypeOptions();
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
    region: device.region || getActiveRegion()?.region || getActiveRegion()?.name || "Unassigned",
    supportGroup: device.supportGroup || getActiveRegion()?.name || "Unassigned",
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

async function refreshDashboardFromActiveRegion() {
  if (activeMonitorStream) {
    return;
  }

  await loadRegions({ showBusy: false, showErrors: false });
  await loadDashboardGroups({ resetResults: true });
}

async function loadDashboardGroups({ resetResults = false } = {}) {
  dashboardInventoryAvailable = false;
  runFacilityCheckButton.disabled = true;
  dashboardDeviceTypeSelect.disabled = true;
  runGroupCheckButton.disabled = true;
  renderGroupCheckOptions([]);
  facilityTabs.innerHTML = '';
  resultsBody.innerHTML = '<div class="text-center text-secondary py-4">Loading inventory...</div>';
  try {
    const response = await fetch("/api/config");
    const payload = await readJsonResponse(response);

    if (!response.ok) {
      throw new Error(payload.error || `Unable to load dashboard groups. HTTP ${response.status}`);
    }

    applyConfigPayload(payload);
    renderFacilityTabs();
    renderGroupCheckOptions(payload.devices);
    hasLoadedDashboardGroups = true;
    dashboardConfigStale = false;

    if (resetResults) {
      latestResults = [];
      latestCategories = [];
      hasCompletedFullCheck = false;
      activeRunFailedIps = new Set();
      expandedFacilityNames.clear();
      expandedCategoryNames.clear();
      updateRunFailedButton();
      renderSummary(createProgressSummary([], 0));
      lastCheck.textContent = 'No checks yet.';
    }
    revealSavedDashboardDevice();
    renderFilteredCategories();
  } catch (error) {
    dashboardInventoryAvailable = false;
    hasLoadedDashboardGroups = false;
    latestResults = [];
    renderGroupCheckOptions([]);
    renderFilteredCategories();
    console.error(error);
    runGroupCheckButton.disabled = true;
    lastCheck.textContent = error.message || "Unable to load dashboard groups.";
  }
}

function renderGroupCheckOptions(devices, { preserveSelection = false } = {}) {
  const selectedCategory = groupCheckSelect.value;
  const scopedDevices = activeFacility
    ? (devices ?? []).filter(device => (device.facility || "Unassigned") === activeFacility)
    : devices ?? [];
  const categories = Array.from(new Set(
    scopedDevices
      .filter(device => device.enabled !== false && matchesDashboardDeviceType(device))
      .map(device => device.category || "Uncategorized")))
    .sort((left, right) => left.localeCompare(right));

  groupCheckSelect.innerHTML = `
    <option value="">Select group</option>
    ${categories.map(category => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`).join("")}`;
  if (preserveSelection && categories.includes(selectedCategory)) groupCheckSelect.value = selectedCategory;
  runGroupCheckButton.disabled = !groupCheckSelect.value;
}

function updateDashboardFilterReset() {
  clearDashboardFiltersButton.disabled = !activeFacility && !activeDashboardDeviceType && !activeSearch.trim() && activeFilter === 'all' && !groupCheckSelect.value;
}

function clearDashboardFilters() {
  activeFacility = '';
  activeDashboardDeviceType = '';
  dashboardDeviceTypeSelect.value = '';
  activeSearch = '';
  activeFilter = 'all';
  searchInput.value = '';
  filterInputs.forEach(input => { input.checked = input.value === 'all'; });
  renderGroupCheckOptions(dashboardInventoryAvailable ? configState.devices : []);
  renderFilteredCategories();
  updateRunFailedButton();
}

function selectFacility(facilityName) {
  activeFacility = facilityName || "";
  groupCheckSelect.value = "";
  runGroupCheckButton.disabled = true;
  renderGroupCheckOptions(configState.devices);
  renderFilteredCategories();
}

function renderConfigDevices() {
  renderConfigView();
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
      const facilityRevealed = hasSearch || facility.devices.some(({ device }) => isSavedDeviceRevealed(device));

      return `
      <tr class="config-facility-row">
        <td colspan="7">
          <div class="d-flex flex-wrap align-items-center justify-content-between gap-2">
            <div class="d-flex align-items-center gap-2">
              <button
                class="btn btn-sm btn-outline-secondary category-toggle"
                type="button"
                title="Expand or collapse facility"
                aria-label="Toggle ${escapeAttribute(facility.name)}"
                data-config-facility-toggle="${facilityId}"
                aria-expanded="${facilityRevealed}"
                aria-controls="${facilityId}">
                <i class="fa-solid fa-chevron-down"></i>
              </button>
              <span class="fw-semibold"><i class="fa-solid fa-location-dot me-2"></i>${escapeHtml(facility.name)}</span>
            </div>
            <span class="badge text-bg-secondary">${facility.devices.length} devices</span>
          </div>
        </td>
      </tr>
      ${facility.categories.map((category, categoryIndex) => {
        const categoryId = `${facilityId}-category-${categoryIndex}-${slugify(category.name)}`;
        const categoryRevealed = hasSearch || category.devices.some(({ device }) => isSavedDeviceRevealed(device));

        return `
          <tr class="config-category-row" data-config-facility-row="${facilityId}" ${facilityRevealed ? '' : 'hidden'}>
            <td colspan="7">
              <div class="d-flex flex-wrap align-items-center justify-content-between gap-2 ps-3">
                <div class="d-flex align-items-center gap-2">
                  <button
                    class="btn btn-sm btn-outline-secondary category-toggle"
                    type="button"
                    title="Expand or collapse category"
                    aria-label="Toggle ${escapeAttribute(category.name)}"
                    data-config-category-toggle="${categoryId}"
                    aria-expanded="${categoryRevealed}"
                    aria-controls="${categoryId}">
                    <i class="fa-solid fa-chevron-down"></i>
                  </button>
                  <span class="fw-semibold">${escapeHtml(category.name)}</span>
                </div>
                <span class="badge text-bg-secondary">${category.devices.length} devices</span>
              </div>
            </td>
          </tr>
          ${category.devices.map(({ device, index }) => renderConfigDeviceRow(device, index, categoryId, categoryRevealed)).join("")}`;
      }).join("")}`;
    })
    .join("");
}

function renderConfigView() {
  const isBulkView = activeConfigView === "bulk";
  configNormalViewButton.classList.toggle("btn-primary", !isBulkView);
  configNormalViewButton.classList.toggle("btn-outline-primary", isBulkView);
  configBulkViewButton.classList.toggle("btn-primary", isBulkView);
  configBulkViewButton.classList.toggle("btn-outline-primary", !isBulkView);
  configDevicesTableWrapper.hidden = isBulkView;
  bulkEditPanel.hidden = !isBulkView;
}

function switchConfigView(view) {
  activeConfigView = view === "bulk" ? "bulk" : "normal";
  renderConfigDevices();
  renderBulkEditDevices();
}

/**
 * Renders the Bulk Edit table after applying the global text search plus the
 * Bulk Edit facility/category filters. Rows are grouped so large inventories
 * can be edited by operational scope instead of as one flat list.
 */
function renderBulkEditDevices() {
  renderBulkEditFilterOptions();
  const devices = filterBulkEditDevices(filterConfigDevices(configState.devices ?? []));
  const hasSearch = activeConfigSearch.trim().length > 0;
  const hasBulkFilters = Boolean(activeBulkFacility || activeBulkCategory);

  if (!bulkDevicesBody) {
    return;
  }

  bulkEditSummary.textContent = `${formatNumber(devices.length)} of ${formatNumber(configState.devices?.length ?? 0)} devices shown`;

  if (devices.length === 0) {
    bulkDevicesBody.innerHTML = `
      <tr>
        <td colspan="10" class="text-center text-secondary py-4">${hasSearch || hasBulkFilters ? "No devices match the current filters." : "No devices configured."}</td>
      </tr>`;
    updateBulkSelectionControls();
    return;
  }

  bulkDevicesBody.innerHTML = groupConfigDevicesByFacility(devices)
    .map(group => renderBulkEditFacilityGroup(group))
    .join("");
  pruneBulkSelection();
  updateBulkSelectionControls();
}

/**
 * Rebuilds Bulk Edit filter dropdowns from the currently searchable devices.
 * Category options are scoped by the selected facility so operators do not
 * choose category/facility combinations that have no rows.
 */
function renderBulkEditFilterOptions() {
  if (!bulkFacilityFilter || !bulkCategoryFilter) {
    return;
  }

  const devices = filterConfigDevices(configState.devices ?? []);
  const facilities = getUniqueDeviceValues(devices, "facility", "Unassigned");
  const facilityScopedDevices = activeBulkFacility
    ? devices.filter(({ device }) => (device.facility || "Unassigned") === activeBulkFacility)
    : devices;
  const categories = getUniqueDeviceValues(facilityScopedDevices, "category", "Uncategorized");

  if (activeBulkFacility && !facilities.includes(activeBulkFacility)) {
    activeBulkFacility = "";
  }

  if (activeBulkCategory && !categories.includes(activeBulkCategory)) {
    activeBulkCategory = "";
  }

  bulkFacilityFilter.innerHTML = `
    <option value="">All facilities</option>
    ${facilities.map(facility => `<option value="${escapeHtml(facility)}" ${facility === activeBulkFacility ? "selected" : ""}>${escapeHtml(facility)}</option>`).join("")}`;
  bulkCategoryFilter.innerHTML = `
    <option value="">All categories</option>
    ${categories.map(category => `<option value="${escapeHtml(category)}" ${category === activeBulkCategory ? "selected" : ""}>${escapeHtml(category)}</option>`).join("")}`;
}

/**
 * Returns sorted unique values from indexed device records for select options.
 * @param {Array<{device: object, index: number}>} indexedDevices Devices with original indexes.
 * @param {string} fieldName Device field to read.
 * @param {string} fallback Value used when the device field is blank.
 * @returns {string[]} Sorted unique values.
 */
function getUniqueDeviceValues(indexedDevices, fieldName, fallback) {
  return Array.from(new Set(
    indexedDevices.map(({ device }) => device[fieldName] || fallback)))
    .sort((left, right) => left.localeCompare(right));
}

/**
 * Applies Bulk Edit facility/category filters while preserving original indexes.
 * @param {Array<{device: object, index: number}>} indexedDevices Devices already filtered by text search.
 * @returns {Array<{device: object, index: number}>} Devices visible in the Bulk Edit table.
 */
function filterBulkEditDevices(indexedDevices) {
  return indexedDevices.filter(({ device }) => {
    const facility = device.facility || "Unassigned";
    const category = device.category || "Uncategorized";

    return (!activeBulkFacility || facility === activeBulkFacility)
      && (!activeBulkCategory || category === activeBulkCategory);
  });
}

/**
 * Renders one facility section and its category subsections for Bulk Edit.
 * @param {{name: string, devices: Array, categories: Array<{name: string, devices: Array}>}} group Facility group.
 * @returns {string} Table rows for the facility, categories, and editable devices.
 */
function renderBulkEditFacilityGroup(group) {
  const isCollapsed = collapsedBulkFacilityNames.has(group.name);

  return `
    <tr class="bulk-group-row">
      <td colspan="10">
        <button class="btn btn-sm bulk-facility-toggle" type="button" data-bulk-facility-toggle="${escapeAttribute(group.name)}" aria-expanded="${!isCollapsed}">
          <i class="fa-solid fa-chevron-${isCollapsed ? "right" : "down"}"></i>
        </button>
        <span class="fw-semibold"><i class="fa-solid fa-location-dot me-2"></i>${escapeHtml(group.name)}</span>
        <span class="badge text-bg-secondary ms-2">${group.devices.length} devices</span>
        <span class="small ms-2">${group.categories.length} categories</span>
      </td>
    </tr>
    ${isCollapsed ? "" : group.categories.map(category => `
      <tr class="bulk-category-row">
        <td colspan="10">
          <span class="fw-semibold">${escapeHtml(category.name)}</span>
          <span class="badge text-bg-secondary ms-2">${category.devices.length} devices</span>
        </td>
      </tr>
      ${category.devices.map(({ device, index }) => renderBulkEditRow(device, index)).join("")}
    `).join("")}`;
}

function renderBulkEditRow(device, index) {
  const isSelected = selectedBulkIndexes.has(index);

  return `
    <tr class="bulk-edit-row ${isSelected ? "table-active" : ""}" data-bulk-index="${index}">
      <td class="text-center">
        <input class="form-check-input" type="checkbox" data-bulk-select="${index}" ${isSelected ? "checked" : ""} aria-label="Select ${escapeAttribute(device.name ?? "device")}">
      </td>
      <td>
        <input class="form-control form-control-sm" value="${escapeAttribute(device.name ?? "")}" data-bulk-field="name" required>
        <div class="small text-danger mt-1 d-none" data-bulk-error></div>
      </td>
      <td><input class="form-control form-control-sm" value="${escapeAttribute(device.facility || "Unassigned")}" data-bulk-field="facility"></td>
      <td><input class="form-control form-control-sm" value="${escapeAttribute(device.category || "Uncategorized")}" data-bulk-field="category"></td>
      <td><input class="form-control form-control-sm font-monospace" value="${escapeAttribute(device.ip ?? "")}" data-bulk-field="ip" required></td>
      <td><input class="form-control form-control-sm" value="${escapeAttribute(device.hostname ?? "")}" data-bulk-field="hostname"></td>
      <td><input class="form-control form-control-sm" value="${escapeAttribute(device.websiteUrl ?? "")}" data-bulk-field="websiteUrl"></td>
      <td class="text-center">
        <input class="form-check-input" type="checkbox" ${device.enabled === false ? "" : "checked"} data-bulk-field="enabled">
      </td>
      <td class="text-center">
        <input class="form-check-input" type="checkbox" ${device.useHostnameForPing ? "checked" : ""} data-bulk-field="useHostnameForPing">
      </td>
      <td class="text-end">
        <div class="bulk-row-actions">
          <button class="btn btn-success btn-sm" type="button" data-bulk-save="${index}" disabled>
            <span class="spinner-border spinner-border-sm me-1 d-none" aria-hidden="true" data-bulk-spinner></span>
            <i class="fa-solid fa-floppy-disk me-1" data-bulk-save-icon></i>Save
          </button>
          <button class="btn btn-outline-secondary btn-sm" type="button" data-bulk-revert="${index}" disabled>Revert</button>
          <button class="btn btn-outline-primary btn-sm" type="button" data-bulk-advanced="${index}">Advanced</button>
        </div>
        <div class="small text-secondary mt-1" data-bulk-status>${device.checks?.length ?? 0} checks</div>
      </td>
    </tr>`;
}

function getVisibleBulkIndexes() {
  return Array.from(bulkDevicesBody.querySelectorAll("[data-bulk-index]"))
    .map(row => Number(row.dataset.bulkIndex))
    .filter(index => Number.isInteger(index));
}

function pruneBulkSelection() {
  const validIndexes = new Set((configState.devices ?? []).map((_, index) => index));

  selectedBulkIndexes = new Set(
    Array.from(selectedBulkIndexes).filter(index => validIndexes.has(index)));
}

function updateBulkSelectionControls() {
  const selectedCount = selectedBulkIndexes.size;
  const visibleCount = getVisibleBulkIndexes().length;
  const actionNeedsValue = bulkActionRequiresValue(bulkActionSelect?.value || "");

  if (bulkSelectionSummary) {
    bulkSelectionSummary.textContent = `${formatNumber(selectedCount)} selected / ${formatNumber(visibleCount)} visible`;
  }

  if (bulkActionValueInput) {
    bulkActionValueInput.disabled = !actionNeedsValue;
    bulkActionValueInput.placeholder = actionNeedsValue
      ? bulkActionSelect.value === "facility" ? "Facility name" : "Category name"
      : "Value";
    if (!actionNeedsValue) {
      bulkActionValueInput.value = "";
    }
  }

  if (bulkApplyActionButton) {
    bulkApplyActionButton.disabled = selectedCount === 0
      || !bulkActionSelect?.value
      || (actionNeedsValue && !bulkActionValueInput.value.trim());
  }
}

function bulkActionRequiresValue(action) {
  return action === "facility" || action === "category";
}

function selectVisibleBulkRows() {
  for (const index of getVisibleBulkIndexes()) {
    selectedBulkIndexes.add(index);
  }

  renderBulkEditDevices();
}

function clearBulkSelection() {
  selectedBulkIndexes.clear();
  renderBulkEditDevices();
}

function getVisibleBulkFacilityNames() {
  return groupConfigDevicesByFacility(filterBulkEditDevices(filterConfigDevices(configState.devices ?? [])))
    .map(group => group.name);
}

function collapseAllBulkFacilities() {
  for (const facilityName of getVisibleBulkFacilityNames()) {
    collapsedBulkFacilityNames.add(facilityName);
  }

  renderBulkEditDevices();
}

function expandAllBulkFacilities() {
  for (const facilityName of getVisibleBulkFacilityNames()) {
    collapsedBulkFacilityNames.delete(facilityName);
  }

  renderBulkEditDevices();
}

function toggleBulkRowSelection(index, isSelected) {
  if (isSelected) {
    selectedBulkIndexes.add(index);
  } else {
    selectedBulkIndexes.delete(index);
  }

  const row = bulkDevicesBody.querySelector(`[data-bulk-index="${index}"]`);
  row?.classList.toggle("table-active", isSelected);
  updateBulkSelectionControls();
}

function syncBulkVisibleRowsToState() {
  for (const row of bulkDevicesBody.querySelectorAll("[data-bulk-index]")) {
    const device = readBulkRowDevice(row, { showErrors: true });

    if (!device) {
      return false;
    }

    configState.devices[Number(row.dataset.bulkIndex)] = device;
  }

  return true;
}

async function applyBulkAction() {
  const action = bulkActionSelect.value;
  const value = bulkActionValueInput.value.trim();
  const selectedIndexes = Array.from(selectedBulkIndexes)
    .filter(index => configState.devices[index])
    .sort((left, right) => left - right);

  if (selectedIndexes.length === 0 || !action) {
    updateBulkSelectionControls();
    return;
  }

  if (bulkActionRequiresValue(action) && !value) {
    showConfigAlert("warning", "Enter a value before applying this bulk action.");
    bulkActionValueInput.focus();
    return;
  }

  if (!syncBulkVisibleRowsToState()) {
    return;
  }

  for (const index of selectedIndexes) {
    const device = configState.devices[index];

    if (action === "facility") {
      device.facility = value || "Unassigned";
    } else if (action === "category") {
      device.category = value || "Uncategorized";
    } else if (action === "enable") {
      device.enabled = true;
    } else if (action === "disable") {
      device.enabled = false;
    } else if (action === "ping-hostname") {
      device.useHostnameForPing = true;
    } else if (action === "ping-address") {
      device.useHostnameForPing = false;
    }
  }

  const actionLabel = bulkActionSelect.options[bulkActionSelect.selectedIndex]?.text || "Bulk action";
  selectedBulkIndexes.clear();
  await saveConfig(`${actionLabel} applied to ${formatNumber(selectedIndexes.length)} selected device${selectedIndexes.length === 1 ? "" : "s"}. The previous file was backed up.`);
  updateBulkSelectionControls();
}

function handleBulkRowChange(row) {
  const index = Number(row.dataset.bulkIndex);
  const currentDevice = configState.devices[index];
  const editedDevice = readBulkRowDevice(row, { showErrors: false });
  const isModified = Boolean(editedDevice) && !areBulkDevicesEqual(currentDevice, editedDevice);

  row.classList.toggle("table-warning", isModified);
  row.querySelector("[data-bulk-save]").disabled = !isModified;
  row.querySelector("[data-bulk-revert]").disabled = !isModified;
  setBulkRowStatus(row, isModified ? "Modified" : `${currentDevice?.checks?.length ?? 0} checks`, "secondary");
}

function readBulkRowDevice(row, { showErrors = true } = {}) {
  const index = Number(row.dataset.bulkIndex);
  const originalDevice = configState.devices[index];

  if (!originalDevice) {
    return null;
  }

  const field = name => row.querySelector(`[data-bulk-field="${name}"]`);
  const name = field("name").value.trim();
  const ip = field("ip").value.trim();
  const facility = field("facility").value.trim() || "Unassigned";
  const category = field("category").value.trim() || "Uncategorized";
  const hostname = field("hostname").value.trim();
  const websiteUrl = field("websiteUrl").value.trim();

  clearBulkRowError(row);

  if (!name) {
    if (showErrors) {
      showBulkRowError(row, "Name is required.");
      field("name").focus();
    }
    return null;
  }

  if (!ip) {
    if (showErrors) {
      showBulkRowError(row, "Address is required.");
      field("ip").focus();
    }
    return null;
  }

  if (websiteUrl && !isHttpUrl(websiteUrl)) {
    if (showErrors) {
      showBulkRowError(row, "Website URL must start with http:// or https://.");
      field("websiteUrl").focus();
    }
    return null;
  }

  return {
    ...structuredClone(originalDevice),
    name,
    ip,
    region: getActiveRegion()?.region || originalDevice.region || "Sample Region",
    supportGroup: getActiveRegion()?.name || originalDevice.supportGroup || "Unassigned",
    facility,
    category,
    hostname: hostname || null,
    websiteUrl: websiteUrl || null,
    enabled: field("enabled").checked,
    useHostnameForPing: field("useHostnameForPing").checked
  };
}

function areBulkDevicesEqual(left, right) {
  if (!left || !right) {
    return false;
  }

  const keys = ["name", "ip", "facility", "category", "hostname", "websiteUrl", "enabled", "useHostnameForPing"];
  return keys.every(key => normalizeBulkComparable(left[key]) === normalizeBulkComparable(right[key]));
}

function normalizeBulkComparable(value) {
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }

  return String(value ?? "").trim();
}

async function saveBulkRow(row) {
  const index = Number(row.dataset.bulkIndex);
  const device = readBulkRowDevice(row);

  if (!device) {
    return;
  }

  setBulkRowBusy(row, true);
  setBulkRowStatus(row, "Saving...", "secondary");

  try {
    const response = await fetch(`/api/config/devices/${index}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        'X-NetWatch-Profile': regionState.activeProfileId || ''
      },
      body: JSON.stringify(device)
    });
    const payload = await readJsonResponse(response);

    if (!response.ok) {
      throw new Error(payload.error || payload.detail || `Device save failed with ${response.status}`);
    }

    applyConfigPayload(payload.configuration);
    renderConfigDevices();
    renderBulkEditDevices();
    markDashboardConfigurationStale();
    const savedRow = bulkDevicesBody.querySelector(`[data-bulk-index="${payload.deviceIndex}"]`);
    if (savedRow) {
      setBulkRowStatus(savedRow, "Saved", "success");
    }
    showConfigAlert("success", `Device '${payload.device?.name || device.name}' saved.`);
  } catch (error) {
    showBulkRowError(row, error.message || "Unable to save this device.");
    setBulkRowStatus(row, "Save failed", "danger");
    console.error(error);
  } finally {
    const currentRow = bulkDevicesBody.querySelector(`[data-bulk-index="${index}"]`) || row;
    setBulkRowBusy(currentRow, false);
  }
}

function revertBulkRow(row) {
  const index = Number(row.dataset.bulkIndex);
  const device = configState.devices[index];

  if (!device) {
    return;
  }

  row.outerHTML = renderBulkEditRow(device, index);
}

function setBulkRowBusy(row, isBusy) {
  row.querySelectorAll("input, button").forEach(element => {
    element.disabled = isBusy;
  });
  row.querySelector("[data-bulk-spinner]")?.classList.toggle("d-none", !isBusy);
  row.querySelector("[data-bulk-save-icon]")?.classList.toggle("d-none", isBusy);
}

function setBulkRowStatus(row, message, type) {
  const status = row.querySelector("[data-bulk-status]");
  status.textContent = message;
  status.className = `small mt-1 text-${type}`;
}

function showBulkRowError(row, message) {
  const error = row.querySelector("[data-bulk-error]");
  error.textContent = message;
  error.classList.remove("d-none");
}

function clearBulkRowError(row) {
  const error = row.querySelector("[data-bulk-error]");
  error.textContent = "";
  error.classList.add("d-none");
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
      || String(device.websiteUrl ?? "").toLowerCase().includes(search)
      || String(device.notes ?? "").toLowerCase().includes(search)
      || String(device.location ?? "").toLowerCase().includes(search)
      || (device.checks ?? []).some(check => String(check.url ?? '').toLowerCase().includes(search)));
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
    device.ip || "",
    device.deviceType || 'unspecified'
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
function renderConfigDeviceRow(device, index, groupId, revealed = false) {
  const pingModeLabel = device.useHostnameForPing ? "Hostname" : "Address";

  return `
    <tr class="config-device-row" data-config-category-row="${groupId}" ${revealed ? '' : 'hidden'}>
      <td>
        <div class="fw-semibold">${escapeHtml(device.name)}</div>
        ${renderDeviceLocation(device)}
        ${renderDeviceNotes(device)}
        ${renderWorkstationInventory(device)}
        <div class="text-secondary small">${device.enabled === false ? "Disabled" : "Enabled"}</div>
      </td>
      <td>${escapeHtml(device.facility || "Unassigned")}</td>
      <td><code>${escapeHtml(device.ip)}</code></td>
      <td>${device.hostname ? `<code>${escapeHtml(device.hostname)}</code>` : `<span class="text-secondary">Not set</span>`}</td>
      <td><span class="badge text-bg-${device.useHostnameForPing ? "primary" : "secondary"}">${pingModeLabel}</span></td>
      <td>${device.checks?.length ?? 0}</td>
      <td class="text-end">
        <div class="config-device-actions" role="group" aria-label="Device actions for ${escapeAttribute(device.name)}">
          <button class="btn btn-outline-primary btn-sm" type="button" data-edit-device="${index}" title="Edit device" aria-label="Edit ${escapeAttribute(device.name)}">
            <i class="fa-solid fa-pen-to-square" aria-hidden="true"></i>
          </button>
          <button class="btn btn-outline-secondary btn-sm" type="button" data-copy-device="${index}" title="Copy device" aria-label="Copy ${escapeAttribute(device.name)}">
            <i class="fa-solid fa-copy" aria-hidden="true"></i>
          </button>
          <button class="btn btn-outline-danger btn-sm" type="button" data-delete-device="${index}" title="Delete device" aria-label="Delete ${escapeAttribute(device.name)}">
            <i class="fa-solid fa-trash" aria-hidden="true"></i>
          </button>
        </div>
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
  showDeviceCheckAlert("");
  populatePeripheralForm(device);
  deviceNameInput.value = device.name ?? "";
  deviceAddressInput.value = device.ip ?? "";
  deviceFacilityInput.value = device.facility ?? "";
  deviceHostnameInput.value = device.hostname ?? "";
  deviceUseHostnameForPingInput.checked = Boolean(device.useHostnameForPing);
  deviceWebsiteUrlInput.value = device.websiteUrl ?? "";
  deviceCommandInput.value = device.command ?? '';
  deviceLocationInput.value = device.location ?? '';
  deviceNotesInput.value = device.notes ?? '';
  deviceCategoryInput.value = device.category ?? "";
  deviceEnabledInput.checked = device.enabled ?? true;
  checksList.innerHTML = "";

  for (const check of device.checks ?? []) {
    addCheckRow(check);
  }

  if (checksList.children.length === 0) {
    addCheckRow({ type: "ping" });
  }
  document.querySelector('#device-monitoring-preset-wrap').hidden = true;
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

  const previous = structuredClone(configState);
  let saved;
  if (indexValue === "") {
    configState.devices.push(device);
    saved = await saveConfig("Device added and saved to the active support group.");
  } else {
    configState.devices[Number(indexValue)] = device;
    saved = await saveConfig("Device updated and saved to the active support group.");
  }
  if (!saved) {
    configState = previous;
    return;
  }
  revealSavedDevice(indexValue === '' ? configState.devices.length - 1 : Number(indexValue));
}

function isSavedDeviceRevealed(device) {
  return savedDeviceReveal?.profileId === regionState.activeProfileId
    && savedDeviceReveal.key === createDeviceKey(device);
}

function revealSavedDevice(index) {
  const device = configState.devices[index];
  if (!device) return;
  savedDeviceReveal = { profileId: regionState.activeProfileId, key: createDeviceKey(device) };
  pendingDashboardReveal = { ...savedDeviceReveal };
  if (!filterConfigDevices(configState.devices).some(entry => entry.index === index)) {
    activeConfigSearch = '';
    configDeviceSearchInput.value = '';
    configSearchBulkCollapseSnapshot = null;
  }
  const facility = device.facility || 'Unassigned';
  if (activeBulkFacility && activeBulkFacility !== facility) activeBulkFacility = '';
  if (activeBulkCategory && activeBulkCategory !== (device.category || 'Uncategorized')) activeBulkCategory = '';
  collapsedBulkFacilityNames.delete(facility);
  renderConfigDevices();
  renderBulkEditDevices();
  if (device.enabled === false) {
    showConfigAlert('success', 'Device saved. It is disabled and will not appear on Dashboard until enabled.');
  }
}

function revealSavedDashboardDevice() {
  const target = pendingDashboardReveal;
  pendingDashboardReveal = null;
  if (target?.profileId !== regionState.activeProfileId) return;
  const device = getDashboardDevices().find(entry => createDeviceKey(entry) === target.key);
  if (!device) return;
  if (activeFacility && activeFacility !== device.facility) activeFacility = '';
  if (!matchesDashboardDeviceType(device)) {
    activeDashboardDeviceType = '';
    dashboardDeviceTypeSelect.value = '';
  }
  if (!matchesSearch(device, activeSearch.trim().toLowerCase())) {
    activeSearch = '';
    searchInput.value = '';
  }
  if (!matchesFilter(device, activeFilter)) {
    activeFilter = 'all';
    filterInputs.forEach(input => { input.checked = input.value === 'all'; });
  }
  expandedFacilityNames.add(device.facility || 'Unassigned');
  expandedCategoryNames.add(createCategoryKey(device.facility, device.category));
  renderGroupCheckOptions(configState.devices, { preserveSelection: true });
}

function readDeviceForm() {
  const peripheralFields = readPeripheralDeviceFields();
  if (!peripheralFields) return null;
  const checks = readCheckRows();

  if (checks === null) {
    return null;
  }

  if (checks.length === 0) {
    showDeviceCheckAlert("Add at least one check before saving the device.");
    return null;
  }

  const websiteUrl = deviceWebsiteUrlInput.value.trim();
  const command = deviceCommandInput.value.trim();
  if (deviceAddressInput.required && /^https?:\/\//i.test(deviceAddressInput.value.trim())) {
    showDeviceCheckAlert('Network target must be an IP address or hostname, not a website URL.');
    deviceAddressInput.focus();
    return null;
  }
  const deviceLocation = deviceLocationInput.value;
  if (deviceLocation.length > 200 || /[\x00-\x1f\x7f-\x9f\u2028\u2029]/.test(deviceLocation)) {
    showDeviceCheckAlert('Location must be a single line of at most 200 characters without control characters.');
    deviceLocationInput.focus();
    return null;
  }
  const notes = deviceNotesInput.value;
  if (notes.length > 2000 || /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]/.test(notes)) {
    showDeviceCheckAlert('Notes must be at most 2000 characters; only line breaks and tabs are allowed as control characters.');
    deviceNotesInput.focus();
    return null;
  }
  if (command.length > 4096 || /[\x00-\x1f\x7f-\x9f\u2028\u2029]/.test(command)) {
    showDeviceCheckAlert('Command must be a single line of at most 4096 characters without control characters.');
    deviceCommandInput.focus();
    return null;
  }

  if (websiteUrl && !isHttpUrl(websiteUrl)) {
    showDeviceCheckAlert("Website URL must start with http:// or https://.");
    deviceWebsiteUrlInput.focus();
    return null;
  }

  return {
    name: deviceNameInput.value.trim(),
    ...peripheralFields,
    ip: deviceAddressInput.value.trim() || (checks.every(check => check.type === "http") ? new URL(checks[0].url).hostname.replace(/^\[|\]$/g, "") : ""),
    region: getActiveRegion()?.region || getActiveRegion()?.name || "Unassigned",
    supportGroup: getActiveRegion()?.name || "Unassigned",
    facility: deviceFacilityInput.value.trim() || "Unassigned",
    hostname: deviceHostnameInput.value.trim() || null,
    useHostnameForPing: deviceUseHostnameForPingInput.checked,
    websiteUrl: websiteUrl || null,
    command: command || null,
    location: deviceLocation.trim() || null,
    notes: notes.trim() || null,
    category: deviceCategoryInput.value.trim() || "Uncategorized",
    enabled: deviceEnabledInput.checked,
    checks
  };
}

function readCheckRows() {
  showDeviceCheckAlert("");
  const checks = [];

  for (const row of checksList.querySelectorAll(".check-row")) {
    const type = row.querySelector("[data-check-type]").value;
    const portValue = Number(row.querySelector("[data-check-port]").value);

    if (type === "ping") {
      checks.push({ type: "ping" });
      continue;
    }

    if (type === "http") {
      const urlInput = row.querySelector("[data-check-url]");
      const url = urlInput.value.trim();
      let parsed;
      try { parsed = new URL(url); } catch { /* Report the same URL validation below. */ }
      if (!isHttpUrl(url) || !parsed || parsed.username || parsed.password || parsed.hash || url.length > 2048 || /[\x00-\x1f\x7f]/.test(url)) {
        showDeviceCheckAlert("HTTP checks require an HTTP/HTTPS URL without credentials or fragments (max 2048 characters).");
        urlInput.focus();
        return null;
      }
      const timeoutMs = readIntegerSetting(row.querySelector("[data-check-timeout]"), "HTTP timeout", 100, 60000, showDeviceCheckAlert);
      const expectedStatusCode = readIntegerSetting(row.querySelector("[data-check-status]"), "Expected HTTP status", 200, 599, showDeviceCheckAlert);
      if (timeoutMs === null || expectedStatusCode === null) return null;
      const expectedText = row.querySelector("[data-check-text]").value;
      if (expectedText.length > 4096) {
        showDeviceCheckAlert("Expected HTTP text must not exceed 4096 characters.");
        return null;
      }
      checks.push({ type: "http", url, timeoutMs, expectedStatusCode, expectedText: expectedText || null });
      continue;
    }

    if (!Number.isInteger(portValue) || portValue < 1 || portValue > 65535) {
      showDeviceCheckAlert("TCP checks require a port between 1 and 65535.");
      return null;
    }

    checks.push({
      type: "tcp",
      port: portValue
    });
  }

  return checks;
}

function showDeviceCheckAlert(message) {
  const alert = document.querySelector("#device-check-alert");
  alert.textContent = message;
  alert.hidden = !message;
}

function resetDeviceForm() {
  showDeviceCheckAlert("");
  editingDeviceIndex.value = "";
  deviceForm.reset();
  populatePeripheralForm({});
  deviceEnabledInput.checked = true;
  deviceUseHostnameForPingInput.checked = false;
  deviceFacilityInput.value = "";
  deviceFormTitle.textContent = "Add Device";
  submitDeviceButton.textContent = "Add Device";
  checksList.innerHTML = "";
  addCheckRow({ type: "ping" });
  document.querySelector('#device-monitoring-preset-wrap').hidden = false;
  document.querySelector('#device-monitoring-preset').value = 'network';
  hideDeviceForm();
}

function showDeviceForm() {
  if (deviceFormModal) {
    deviceFormModal.show();
  }
}

function hideDeviceForm() {
  if (deviceFormModal) {
    hideManagementModal(deviceFormModalElement);
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

function readIntegerSetting(input, label, min, max = null, showError = message => showConfigAlert("warning", message)) {
  const value = Number(input.value);

  if (!Number.isInteger(value) || value < min || (max !== null && value > max)) {
    const rangeText = max === null
      ? `greater than or equal to ${min}`
      : `between ${min} and ${max}`;
    showError(`${label} must be a whole number ${rangeText}.`);
    input.focus();
    return null;
  }

  return value;
}

function addCheckRow(check = { type: "ping" }) {
  const row = document.createElement("div");
  const helpKey = `http-check-${++httpCheckHelpSequence}`;
  row.className = "check-row";
  row.innerHTML = `
    <select class="form-select form-select-sm" data-check-type aria-label="Check type">
      <option value="ping">Ping</option>
      <option value="tcp">TCP</option>
      <option value="http">HTTP / HTTPS</option>
    </select>
    <input class="form-control form-control-sm" type="number" min="1" max="65535" placeholder="Port" data-check-port aria-label="TCP port">
    <button class="btn btn-outline-danger btn-sm icon-button" type="button" data-remove-check aria-label="Remove check" title="Remove check">
      <i class="fa-solid fa-xmark"></i>
    </button>
    <fieldset class="http-check-fields" data-http-fields hidden disabled>
      <label class="http-check-wide"><span class="form-label">URL to monitor</span><input class="form-control form-control-sm" type="url" maxlength="2048" placeholder="https://app.example.com/health" data-check-url required></label>
      <div><label class="form-label" for="${helpKey}-timeout">Timeout (ms)</label><input class="form-control form-control-sm" type="number" min="100" max="60000" step="1" id="${helpKey}-timeout" data-check-timeout aria-describedby="${helpKey}-timeout-help" required><div class="form-text" id="${helpKey}-timeout-help" data-http-timeout-help>Espera m&aacute;xima por intento HTTP (10000 ms = 10 s), no cantidad de pings. Reintentos: Settings &gt; Retries (0 = un intento; 2 = hasta tres si falla).</div></div>
      <label><span class="form-label">Expected status</span><input class="form-control form-control-sm" type="number" min="200" max="599" step="1" data-check-status required></label>
      <div class="http-check-wide"><label class="form-label" for="${helpKey}-text">Expected text (optional)</label><textarea class="form-control form-control-sm" rows="2" maxlength="4096" id="${helpKey}-text" data-check-text aria-describedby="${helpKey}-text-help"></textarea><div class="form-text" id="${helpKey}-text-help" data-http-text-help>Opcional: texto literal de la respuesta (ej. READY), sensible a may&uacute;sculas. Vac&iacute;o: solo el c&oacute;digo esperado. No ejecuta JavaScript ni usa tu sesi&oacute;n del navegador.</div></div>
    </fieldset>`;

  const typeSelect = row.querySelector("[data-check-type]");
  const portInput = row.querySelector("[data-check-port]");

  typeSelect.value = ["tcp", "http"].includes(String(check.type).toLowerCase()) ? String(check.type).toLowerCase() : "ping";
  typeSelect.dataset.previousType = typeSelect.value;
  portInput.value = check.port ?? "";
  row.querySelector("[data-check-url]").value = check.url ?? "";
  row.querySelector("[data-check-timeout]").value = check.timeoutMs ?? 10000;
  row.querySelector("[data-check-status]").value = check.expectedStatusCode ?? 200;
  row.querySelector("[data-check-text]").value = check.expectedText ?? "";
  checksList.append(row);
  updateCheckPortState(row);
}

function updateCheckPortState(row) {
  const typeSelect = row.querySelector("[data-check-type]");
  const portInput = row.querySelector("[data-check-port]");
  const isTcp = typeSelect.value === "tcp";
  const isHttp = typeSelect.value === "http";
  row.classList.toggle("is-http", isHttp);
  const httpFields = row.querySelector("[data-http-fields]");
  httpFields.hidden = !isHttp;
  httpFields.disabled = !isHttp;
  portInput.hidden = isHttp;

  portInput.disabled = !isTcp;
  portInput.required = isTcp;

  if (!isTcp) {
    portInput.value = "";
  }
  updateDeviceAddressRequirement();
}

function updateDeviceAddressRequirement() {
  const types = [...checksList.querySelectorAll("[data-check-type]")];
  const network = !types.length || types.some(input => input.value !== "http");
  const ping = types.some(input => input.value === 'ping');
  deviceAddressInput.required = network;
  deviceAddressInput.placeholder = deviceAddressInput.required ? "" : "Optional - uses the first URL host";
  document.querySelector('#device-network-fields').hidden = !network;
  document.querySelector('#device-hostname-fields').hidden = !network;
  document.querySelector('#device-ping-fields').hidden = !ping;
  document.querySelector('#device-location-fields').hidden = !network;
  document.querySelector('#device-command-fields').hidden = !network;
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

  const previous = structuredClone(configState);
  configState.devices.splice(pendingDeleteIndex, 1);
  pendingDeleteIndex = null;
  if (deleteDeviceModal) {
    hideManagementModal(deleteDeviceModalElement);
  }
  if (!await saveConfig("Device deleted and saved to the active support group.")) {
    configState = previous;
    renderConfigDevices();
    renderBulkEditDevices();
  }
}

function setConfigBusy(isBusy, { showSaveSpinner = true } = {}) {
  saveConfigButton.disabled = isBusy;
  reloadConfigButton.disabled = isBusy;
  exportConfigButton.disabled = isBusy;
  importConfigButton.disabled = isBusy;
  addDeviceButton.disabled = isBusy;
  configNormalViewButton.disabled = isBusy;
  configBulkViewButton.disabled = isBusy;
  bulkEditPanel.querySelectorAll("input, select, button").forEach(element => {
    element.disabled = isBusy;
  });
  if (intervalSecondsInput) {
    intervalSecondsInput.disabled = isBusy;
  }
  timeoutMsInput.disabled = isBusy;
  maxParallelChecksInput.disabled = isBusy;
  retryCountInput.disabled = isBusy;
  retryDelayMsInput.disabled = isBusy;
  deviceForm.querySelectorAll("input, select, textarea, button").forEach(element => {
    element.disabled = isBusy;
  });
  if (!isBusy) {
    syncPeripheralFormAvailability();
    checksList.querySelectorAll('.check-row').forEach(updateCheckPortState);
  }
  saveConfigSpinner.classList.toggle("d-none", !isBusy || !showSaveSpinner);
  saveConfigIcon.classList.toggle("d-none", isBusy && showSaveSpinner);
}

function showConfigAlert(type, message) {
  showPageAlert(configAlert, type, message);
}

function clearConfigAlert() {
  clearPageAlert(configAlert);
}

function createDefaultRegionState() {
  return {
    activeProfileId: "support-team-a",
    profiles: [
      {
        id: "support-team-a",
        name: "Support Team A",
        region: "Sample Region",
        file: "regions/support-team-a.json"
      }
    ]
  };
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
    devices: [],
    peripheralCatalog: []
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
          configFacilityHeader: "#f1f3f5",
          configFacilityText: "#212529",
          configCategoryHeader: "#f8f9fa",
          configCategoryText: "#495057",
          autoRefreshOn: "#198754",
          autoRefreshOff: "#dc3545",
          runFullCheck: "#ffc107"
        }
      },
      {
        id: "corporate-logistics",
        name: "Corporate Logistics",
        builtIn: true,
        colors: {
          appBackground: "#f4f1ed",
          surface: "#ffffff",
          sidebarBackground: "#351c15",
          sidebarText: "#f5e7c3",
          primary: "#7a3e1d",
          success: "#2f7d32",
          warning: "#ffb500",
          danger: "#b91c1c",
          text: "#211a16",
          mutedText: "#6f625a",
          border: "#d8c9b7",
          categoryHealthy: "#2f7d32",
          categoryDegraded: "#c47a00",
          categoryProblem: "#a52822",
          categoryRunning: "#5b4636",
          configFacilityHeader: "#351c15",
          configFacilityText: "#ffdd75",
          configCategoryHeader: "#fff3cd",
          configCategoryText: "#4a2c1a",
          autoRefreshOn: "#2f7d32",
          autoRefreshOff: "#b91c1c",
          runFullCheck: "#ffb500"
        }
      }
    ]
  };
}


async function navigateTo(route, replace = false) {
  const normalizedRoute = normalizeRoute(route);
  closeSidebar();
  if (currentRoute === '/themes' && isThemeDirty() && !await discardThemeChanges()) {
    if (location.pathname !== '/themes') history.pushState({ route: '/themes' }, '', '/themes');
    return;
  }
  const previousRoute = currentRoute;
  currentRoute = normalizedRoute;
  if (previousRoute === '/reports' && normalizedRoute !== '/reports') {
    ++reportsLoadVersion;
    reportsBusy = false;
    closeReportDetail(true);
    if (reportsConfirmingDelete) managementConfirmModal?.hide();
  }

  dashboardPage.hidden = normalizedRoute !== "/";
  configPage.hidden = normalizedRoute !== "/config";
  peripheralPage.hidden = normalizedRoute !== "/peripherals";
  deviceTypesPage.hidden = normalizedRoute !== '/device-types';
  workstationsPage.hidden = normalizedRoute !== '/workstations';
  reportsPage.hidden = normalizedRoute !== "/reports";
  document.querySelector('.topbar-actions').hidden = normalizedRoute === '/reports';
  integrationsPage.hidden = normalizedRoute !== "/integrations";
  regionsPage.hidden = normalizedRoute !== "/regions";
  themesPage.hidden = normalizedRoute !== "/themes";
  manualPage.hidden = normalizedRoute !== "/manual";
  aboutPage.hidden = normalizedRoute !== "/about";
  currentPageLabel.textContent = getPageLabel(normalizedRoute);

  navLinks.forEach(link => {
    link.classList.toggle("active", link.dataset.route === normalizedRoute);
  });

  if (replace) {
    const url = normalizedRoute === '/workstations' && location.pathname === normalizedRoute
      ? normalizedRoute + location.search : normalizedRoute;
    history.replaceState({ route: normalizedRoute }, "", url);
  } else if (location.pathname !== normalizedRoute) {
    history.pushState({ route: normalizedRoute }, "", normalizedRoute);
  }

  closeSidebar();

  if (previousRoute === '/peripherals' && normalizedRoute !== '/peripherals') hideManagementModal(peripheralModelElement);
  if (previousRoute === '/device-types' && normalizedRoute !== '/device-types') hideManagementModal(deviceTypeModalElement);
  if (previousRoute === '/regions' && normalizedRoute !== '/regions') hideRegionForm();
  if (previousRoute === '/themes' && normalizedRoute !== '/themes') hideThemeForm();

  if (previousRoute === "/config" && normalizedRoute !== "/config") {
    resetDeviceForm();
    clearConfigAlert();
  }

  if (normalizedRoute === "/config" && previousRoute !== "/config") {
    resetDeviceForm();
  }

  resetRouteViewState(normalizedRoute);
  refreshRouteData(normalizedRoute);
}

function resetRouteViewState(route) {
  if (route === '/workstations') {
    restoreWorkstationFilters();
    return;
  }
  if (route === "/") {
    resetDashboardViewState();
    return;
  }

  if (route === "/config") {
    resetConfigViewState();
    return;
  }

  if (route === "/regions") {
    resetRegionsViewState();
    return;
  }

  if (route === "/reports") {
    resetReportsViewState();
    return;
  }

  if (route === "/integrations") {
    clearIntegrationsAlert();
    return;
  }

  if (route === "/themes") {
    resetThemesViewState();
  }
}

function resetDashboardViewState() {
  activeSearch = "";
  activeFilter = "all";
  activeFacility = "";
  activeDashboardDeviceType = '';
  activeRunDeviceType = '';
  dashboardDeviceTypeSelect.value = '';
  activeRunCategory = "";
  activeRunDeviceName = "";
  activeRunDeviceIp = "";
  activeRunFailedIps = new Set();

  if (searchInput) {
    searchInput.value = "";
  }

  filterInputs.forEach(input => {
    input.checked = input.value === "all";
  });

  if (groupCheckSelect) {
    groupCheckSelect.value = "";
  }

  if (runGroupCheckButton) {
    runGroupCheckButton.disabled = true;
  }
}

function resetConfigViewState() {
  activeConfigSearch = "";
  activeConfigView = "normal";
  activeBulkFacility = "";
  activeBulkCategory = "";
  collapsedBulkFacilityNames.clear();
  configSearchBulkCollapseSnapshot = null;

  if (configDeviceSearchInput) {
    configDeviceSearchInput.value = "";
  }

  if (bulkFacilityFilter) {
    bulkFacilityFilter.value = "";
  }

  if (bulkCategoryFilter) {
    bulkCategoryFilter.value = "";
  }

  renderConfigView();
  resetDeviceForm();
  clearConfigAlert();
}

function resetRegionsViewState() {
  editingRegionId = "";
  document.querySelector('#regions-search').value = '';
  document.querySelector('#regions-region-filter').value = '';
  document.querySelector('#regions-status-filter').value = '';
  hideRegionForm();
  clearRegionAlert();
}

function resetThemesViewState() {
  editingThemeId = "";
  themeDraft = null;
  document.querySelector('#themes-search').value = '';
  document.querySelector('#themes-status-filter').value = '';
  document.querySelector('#theme-editor').hidden = true;
  hideThemeForm();
  clearThemeAlert();
}

function refreshRouteData(route) {
  if (route === '/device-types') {
    void loadDeviceTypes();
    return;
  }
  if (route === '/workstations') {
    void loadWorkstations();
    return;
  }
  if (route === '/peripherals') {
    void loadPeripheralCatalog();
    return;
  }
  if (route === "/") {
    void refreshDashboardFromActiveRegion();
    return;
  }

  if (route === "/config") {
    void refreshConfigFromActiveRegion();
    return;
  }

  if (route === "/regions") {
    void loadRegions({ showBusy: true, showErrors: true });
    return;
  }

  if (route === "/reports") {
    void loadReports({ showBusy: true, showErrors: true });
    return;
  }

  if (route === "/integrations") {
    void loadIntegrations({ showBusy: true, showErrors: true });
    return;
  }

  if (route === "/themes") {
    void loadThemes({ showBusy: true, showErrors: true });
  }
}

async function refreshConfigFromActiveRegion() {
  setConfigBusy(true, { showSaveSpinner: false });
  try {
    await loadRegions({ showBusy: false, showErrors: false });
    await loadConfig({ showBusy: false });
  } finally {
    setConfigBusy(false, { showSaveSpinner: false });
  }
}

function normalizeRoute(pathname) {
  const knownRoutes = new Set(["/", "/config", "/regions", "/reports", "/integrations", "/themes", "/manual", "/about", "/peripherals", "/workstations", "/device-types"]);
  return knownRoutes.has(pathname) ? pathname : "/";
}

function getPageLabel(route) {
  const labels = {
    "/": "Dashboard",
    "/config": "Configuration",
    "/peripherals": "Peripherals",
    "/device-types": "Device Types",
    "/workstations": "Workstations",
    "/regions": "Support Groups",
    "/reports": "Reports",
    "/integrations": "Integrations",
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
  if (!isDisabled) renderFacilityTabs();
  resultsBody
    .querySelectorAll("[data-run-facility-only], [data-run-category], [data-run-device-name]")
    .forEach(button => {
      button.disabled = isDisabled;
    });
}

function setOtherDashboardRunButtonsDisabled(isDisabled, activeDevice = null) {
  if (!isDisabled) renderFacilityTabs();
  resultsBody
    .querySelectorAll("[data-run-facility-only], [data-run-category], [data-run-device-name]")
    .forEach(button => {
      const isActiveDeviceButton = activeDevice
        && button.dataset.runDeviceName === activeDevice.name
        && button.dataset.runDeviceIp === activeDevice.ip
        && button.dataset.runDeviceType === (activeDevice.deviceType || 'unspecified');

      if (!isActiveDeviceButton) {
        button.disabled = isDisabled;
      }
    });
}

function getExecutionScopeLabel(facility, category, device, devices = [], deviceType = '') {
  if (devices.length > 0) {
    return "failed devices";
  }

  if (device?.name) {
    return `device ${device.name}`;
  }

  if (deviceType) return `${[facility, category, dashboardDeviceTypeLabel(deviceType)].filter(Boolean).join(' / ')} devices`;

  if (facility && category) {
    return `${facility} / ${category} devices`;
  }

  if (facility) {
    return `${facility} devices`;
  }

  return category ? `${category} devices` : "";
}

function getSelectedCheckMode() {
  const selectedInput = Array.from(checkModeInputs).find(input => input.checked);
  return normalizeCheckMode(selectedInput?.value || "full");
}

function normalizeCheckMode(checkMode) {
  return isPingOnlyMode(checkMode) ? "ping" : "full";
}

function isPingOnlyMode(checkMode) {
  const normalizedMode = String(checkMode || "").trim().toLowerCase();
  return normalizedMode === "ping"
    || normalizedMode === "pingonly"
    || normalizedMode === "ping-only";
}

function getCheckModeLabel(checkMode = getSelectedCheckMode()) {
  return isPingOnlyMode(checkMode) ? "Ping Only" : "Full Check";
}

function getDashboardExecutionText(checkMode = getSelectedCheckMode()) {
  const modeLabel = getCheckModeLabel(checkMode);
  return autoRefreshEnabled
    ? `Auto ${modeLabel} active`
    : `Manual mode - ${modeLabel}`;
}

function setCheckModeInputsDisabled(isDisabled) {
  dashboardDeviceTypeSelect.disabled = isDisabled || !dashboardInventoryAvailable;
  checkModeInputs.forEach(input => {
    input.disabled = isDisabled;
  });
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

function showPageAlert(container, type, message) {
  if (!container) {
    return;
  }

  clearPageAlert(container);
  container.innerHTML = `
    <div class="alert alert-${type} alert-dismissible fade show" role="alert">
      ${escapeHtml(message)}
      <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    </div>`;

  const closeButton = container.querySelector(".btn-close");
  closeButton?.addEventListener("click", () => clearPageAlert(container), { once: true });

  if (shouldAutoDismissAlert(type)) {
    const timerId = setTimeout(() => clearPageAlert(container), alertAutoDismissMs);
    alertDismissTimers.set(container, timerId);
  }
}

function clearPageAlert(container) {
  if (!container) {
    return;
  }

  const timerId = alertDismissTimers.get(container);

  if (timerId) {
    clearTimeout(timerId);
    alertDismissTimers.delete(container);
  }

  container.innerHTML = "";
}

function shouldAutoDismissAlert(type) {
  return type === "success" || type === "info";
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

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll("`", "&#096;");
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
checkModeInputs.forEach(input => {
  input.addEventListener("change", () => {
    activeRunCheckMode = getSelectedCheckMode();
    executionMode.textContent = getDashboardExecutionText();
  });
});
groupCheckSelect.addEventListener("change", () => {
  runGroupCheckButton.disabled = !groupCheckSelect.value;
  updateDashboardFilterReset();
});
dashboardDeviceTypeSelect.addEventListener('change', event => {
  activeDashboardDeviceType = event.target.value;
  renderGroupCheckOptions(configState.devices, { preserveSelection: true });
  renderFilteredCategories();
  updateRunFailedButton();
});
clearDashboardFiltersButton.addEventListener('click', clearDashboardFilters);
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
  const commandButton = event.target.closest('[data-copy-command]');
  if (commandButton) {
    event.preventDefault();
    void copyDeviceCommand(commandButton);
    return;
  }
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
      category: runDeviceButton.dataset.runDeviceCategory,
      deviceType: runDeviceButton.dataset.runDeviceType || 'unspecified'
    });
    return;
  }
  const header = event.target.closest('.facility-section-header, .category-header');
  if (header && !event.target.closest('button, a, input, select, textarea, label, summary, [role="button"], [contenteditable="true"]')
      && !window.getSelection()?.toString()) {
    header.querySelector('[data-bs-toggle="collapse"]')?.click();
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
configNormalViewButton.addEventListener("click", () => switchConfigView("normal"));
configBulkViewButton.addEventListener("click", () => switchConfigView("bulk"));
configDeviceSearchInput.addEventListener("input", debounce(event => {
  const hadSearch = Boolean(activeConfigSearch.trim());
  activeConfigSearch = event.target.value;
  if (activeConfigSearch.trim()) {
    if (!hadSearch) configSearchBulkCollapseSnapshot = new Set(collapsedBulkFacilityNames);
    collapsedBulkFacilityNames.clear();
  } else if (configSearchBulkCollapseSnapshot) {
    collapsedBulkFacilityNames.clear();
    configSearchBulkCollapseSnapshot.forEach(name => collapsedBulkFacilityNames.add(name));
    configSearchBulkCollapseSnapshot = null;
  }
  renderConfigDevices();
  renderBulkEditDevices();
}, 150));
bulkFacilityFilter.addEventListener("change", event => {
  activeBulkFacility = event.target.value;
  renderBulkEditDevices();
});
bulkCategoryFilter.addEventListener("change", event => {
  activeBulkCategory = event.target.value;
  renderBulkEditDevices();
});
bulkClearFiltersButton.addEventListener("click", () => {
  activeBulkFacility = "";
  activeBulkCategory = "";
  collapsedBulkFacilityNames.clear();
  if (bulkFacilityFilter) {
    bulkFacilityFilter.value = "";
  }
  if (bulkCategoryFilter) {
    bulkCategoryFilter.value = "";
  }
  renderBulkEditDevices();
});
bulkSelectVisibleButton.addEventListener("click", selectVisibleBulkRows);
bulkClearSelectionButton.addEventListener("click", clearBulkSelection);
bulkCollapseAllButton.addEventListener("click", collapseAllBulkFacilities);
bulkExpandAllButton.addEventListener("click", expandAllBulkFacilities);
bulkActionSelect.addEventListener("change", updateBulkSelectionControls);
bulkActionValueInput.addEventListener("input", updateBulkSelectionControls);
bulkApplyActionButton.addEventListener("click", applyBulkAction);
refreshReportsButton.addEventListener("click", () => loadReports({ showBusy: true, showErrors: true }));
exportReportsButton.addEventListener('click', () => exportFilteredReports('json'));
reportsCsvButton.addEventListener('click', () => exportFilteredReports('csv'));
reportsProfileFilter.addEventListener('change', event => {
  reportsFilters.profile = event.target.value;
  reportsFilters.facility = reportsFilters.category = reportsFilters.runKey = reportsFilters.deviceKey = '';
  populateReportFilterOptions();
  renderReportsFromFirstPage();
});
reportsPeriodFilter.addEventListener('change', event => {
  reportsFilters.period = event.target.value;
  renderReportsFromFirstPage();
});
reportsPageSizeSelect.addEventListener("change", event => {
  reportsPageSize = Number(event.target.value) || 10;
  renderReportsFromFirstPage();
});
reportsFacilityPageSizeSelect.addEventListener("change", event => {
  reportsFacilityPageSize = Number(event.target.value) || 10;
  reportsFacilityPage = 1;
  renderReports();
});
reportsCategoryPageSizeSelect.addEventListener("change", event => {
  reportsCategoryPageSize = Number(event.target.value) || 10;
  reportsCategoryPage = 1;
  renderReports();
});
reportsRunsPageSizeSelect.addEventListener("change", event => {
  reportsRunPageSize = Number(event.target.value) || 10;
  reportsRunPage = 1;
  renderReports();
});
reportsPrevPageButton.addEventListener("click", () => {
  reportsCurrentPage = Math.max(1, reportsCurrentPage - 1);
  renderReports();
});
reportsNextPageButton.addEventListener("click", () => {
  reportsCurrentPage += 1;
  renderReports();
});
reportsFacilityPrevPageButton.addEventListener("click", () => {
  reportsFacilityPage = Math.max(1, reportsFacilityPage - 1);
  renderReports();
});
reportsFacilityNextPageButton.addEventListener("click", () => {
  reportsFacilityPage += 1;
  renderReports();
});
reportsCategoryPrevPageButton.addEventListener("click", () => {
  reportsCategoryPage = Math.max(1, reportsCategoryPage - 1);
  renderReports();
});
reportsCategoryNextPageButton.addEventListener("click", () => {
  reportsCategoryPage += 1;
  renderReports();
});
reportsRunsPrevPageButton.addEventListener("click", () => {
  reportsRunPage = Math.max(1, reportsRunPage - 1);
  renderReports();
});
reportsRunsNextPageButton.addEventListener("click", () => {
  reportsRunPage += 1;
  renderReports();
});
resetReportFiltersButton.addEventListener("click", () => {
  resetReportsViewState({ resetView: false });
  populateReportFilterOptions();
  renderReports();
});
const renderReportSearch = debounce(() => renderReportsFromFirstPage(), 150);
reportsSearchInput.addEventListener('input', event => {
  reportsFilters.search = event.target.value;
  renderReportSearch();
});
reportsStatusFilter.addEventListener("change", event => {
  reportsFilters.status = event.target.value;
  renderReportsFromFirstPage();
});
reportsModeFilter.addEventListener("change", event => {
  reportsFilters.mode = event.target.value;
  renderReportsFromFirstPage();
});
reportsFacilityFilter.addEventListener("change", event => {
  reportsFilters.facility = event.target.value;
  reportsFilters.category = reportsFilters.runKey = reportsFilters.deviceKey = '';
  populateReportFilterOptions();
  renderReportsFromFirstPage();
});
reportsCategoryFilter.addEventListener("change", event => {
  reportsFilters.category = event.target.value;
  reportsFilters.runKey = reportsFilters.deviceKey = '';
  renderReportsFromFirstPage();
});
reportsFromDateInput.addEventListener("change", event => {
  reportsFilters.fromDate = event.target.value;
  renderReportsFromFirstPage();
});
reportsToDateInput.addEventListener("change", event => {
  reportsFilters.toDate = event.target.value;
  renderReportsFromFirstPage();
});
document.querySelector("#reports-page").addEventListener("click", event => {
  const view = event.target.closest('[data-report-view]');
  const grouping = event.target.closest('[data-report-group]');
  const remove = event.target.closest('[data-report-remove-filter]');
  const detail = event.target.closest('[data-report-detail]');
  const run = event.target.closest('[data-report-open-run]');
  const facility = event.target.closest('[data-report-facility]');
  const category = event.target.closest('[data-report-category]');
  if (view) { setReportView(view.dataset.reportView); return; }
  if (grouping) { setReportSummaryGroup(grouping.dataset.reportGroup); return; }
  if (remove) { removeReportFilter(remove.dataset.reportRemoveFilter); return; }
  if (detail) { openReportDetail(detail.dataset.reportDetail, detail); return; }
  if (run) { openReportRun(run.dataset.reportOpenRun); return; }
  if (facility) { openReportScope(facility.dataset.reportProfile, facility.dataset.reportFacility); return; }
  if (category) { openReportScope(category.dataset.reportProfile, undefined, category.dataset.reportCategory); return; }
  const deleteRunButton = event.target.closest("[data-delete-report-run]");
  const sortButton = event.target.closest("[data-report-sort]");
  const facilitySortButton = event.target.closest("[data-report-facility-sort]");
  const categorySortButton = event.target.closest("[data-report-category-sort]");
  const runSortButton = event.target.closest("[data-report-run-sort]");

  if (deleteRunButton) {
    closeManagementMenu(deleteRunButton);
    deleteReportRun(deleteRunButton.dataset.deleteReportRun);
    return;
  }

  if (facilitySortButton) {
    reportsFacilitySort = getNextReportSortState(reportsFacilitySort, facilitySortButton.dataset.reportFacilitySort);
    reportsFacilityPage = 1;
    renderReports();
    return;
  }

  if (categorySortButton) {
    reportsCategorySort = getNextReportSortState(reportsCategorySort, categorySortButton.dataset.reportCategorySort);
    reportsCategoryPage = 1;
    renderReports();
    return;
  }

  if (runSortButton) {
    reportsRunSort = getNextReportSortState(reportsRunSort, runSortButton.dataset.reportRunSort);
    reportsRunPage = 1;
    renderReports();
    return;
  }

  if (!sortButton) {
    return;
  }

  const key = sortButton.dataset.reportSort;
  reportsSort = reportsSort.key === key
    ? { key, direction: reportsSort.direction === "asc" ? "desc" : "asc" }
    : { key, direction: key === "completedAt" ? "desc" : "asc" };
  reportsCurrentPage = 1;
  renderReports();
});
reportsPage.querySelector('[role="tablist"]').addEventListener('keydown', event => {
  const tabs = [...reportsPage.querySelectorAll('[data-report-view]')];
  const index = tabs.indexOf(event.target);
  if (index < 0 || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
  event.preventDefault();
  const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1
    : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
  setReportView(tabs[next].dataset.reportView, true);
});
configureManagementModalFocus(reportsDetailElement, '[data-bs-dismiss="modal"]');
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && reportsSelectedRow && currentRoute === '/reports') {
    event.preventDefault();
    event.stopPropagation();
    closeReportDetail();
  }
}, true);
reportsMobileQuery.addEventListener('change', () => renderReports());
for (const id of ['summary', 'run', 'device']) {
  document.querySelector(`#reports-${id}-sort`).addEventListener('change', event => {
    const [key, direction] = event.target.value.split(':');
    if (id === 'summary') {
      if (reportsSummaryGroup === 'facility') { reportsFacilitySort = { key, direction }; reportsFacilityPage = 1; }
      else { reportsCategorySort = { key, direction }; reportsCategoryPage = 1; }
    } else if (id === 'run') { reportsRunSort = { key, direction }; reportsRunPage = 1; }
    else { reportsSort = { key, direction }; reportsCurrentPage = 1; }
    renderReports();
  });
}
reportsDetailElement.addEventListener('hidden.bs.modal', () => {
  reportsSelectedRow = null;
  if (currentRoute !== '/reports') return;
  const target = reportsDetailTrigger?.isConnected && reportsDetailTrigger.getClientRects().length
    ? reportsDetailTrigger : document.querySelector(`#reports-tab-${reportsActiveView}`);
  target.focus({ preventScroll: true });
});
document.querySelector('#reports-detail-run').addEventListener('click', () => {
  if (reportsSelectedRow) openReportRun(reportsSelectedRow.runKey);
});
document.querySelector('#reports-detail-device').addEventListener('click', () => {
  const row = reportsSelectedRow;
  if (!row) return;
  reportsFilters.profile = reportProfileKey(row);
  reportsFilters.facility = row.facility;
  reportsFilters.category = row.category;
  reportsFilters.deviceKey = reportDeviceKey(row);
  reportsFilters.runKey = reportsFilters.search = reportsFilters.status = '';
  reportsSearchInput.value = reportsStatusFilter.value = '';
  closeReportDetail();
  populateReportFilterOptions();
  setReportView('devices', true);
  renderReportsFromFirstPage();
});
reloadIntegrationsButton.addEventListener("click", () => loadIntegrations({ showBusy: true, showErrors: true }));
saveIntegrationsButton.addEventListener("click", saveIntegrations);
[
  inventorySourceModeSelect,
  inventoryLocalJsonPathInput,
  inventoryEndpointUrlInput,
  inventoryEndpointMethodSelect,
  reportDestinationEnabledInput,
  reportDestinationUrlInput,
  reportDestinationMethodSelect,
  reportIncludeSummaryInput,
  reportIncludeRowsInput
].forEach(input => {
  input.addEventListener("input", updateIntegrationFormState);
  input.addEventListener("change", updateIntegrationFormState);
});
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
deviceForm.addEventListener('invalid', event => {
  showDeviceCheckAlert(event.target.validationMessage || 'Review the highlighted field before saving.');
}, true);
resetDeviceFormButton.addEventListener("click", resetDeviceForm);
addCheckButton.addEventListener("click", () => addCheckRow({ type: "tcp", port: 80 }));
document.querySelector('#device-monitoring-preset').addEventListener('change', event => {
  const rows = [...checksList.querySelectorAll('.check-row')];
  const untouched = rows.length === 1
    && rows[0].querySelector('[data-check-type]').value === 'ping';
  if (!untouched && !confirm('Replace the current checks with this preset?')) {
    event.target.value = rows.every(row => row.querySelector('[data-check-type]').value === 'http') ? 'web' : 'network';
    return;
  }
  checksList.innerHTML = '';
  addCheckRow({ type: event.target.value === 'web' ? 'http' : 'ping' });
});
checksList.addEventListener("change", event => {
  if (event.target.matches("[data-check-type]")) {
    const row = event.target.closest('.check-row');
    const previous = event.target.dataset.previousType;
    const configured = previous === 'http' ? row.querySelector('[data-check-url]').value.trim()
      : previous === 'tcp' ? row.querySelector('[data-check-port]').value : '';
    if (previous !== event.target.value && configured && !confirm('Replace this configured check with the selected type?')) {
      event.target.value = previous;
      return;
    }
    event.target.dataset.previousType = event.target.value;
    updateCheckPortState(row);
  }
});
checksList.addEventListener("click", event => {
  const removeButton = event.target.closest("[data-remove-check]");

  if (removeButton) {
    removeButton.closest(".check-row").remove();
    updateDeviceAddressRequirement();
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
bulkDevicesBody.addEventListener("input", event => {
  const row = event.target.closest("[data-bulk-index]");

  if (row) {
    handleBulkRowChange(row);
  }
});
bulkDevicesBody.addEventListener("change", event => {
  const selectInput = event.target.closest("[data-bulk-select]");

  if (selectInput) {
    toggleBulkRowSelection(Number(selectInput.dataset.bulkSelect), selectInput.checked);
    return;
  }

  const row = event.target.closest("[data-bulk-index]");

  if (row) {
    handleBulkRowChange(row);
  }
});
bulkDevicesBody.addEventListener("click", event => {
  const facilityToggle = event.target.closest("[data-bulk-facility-toggle]");
  const saveButton = event.target.closest("[data-bulk-save]");
  const revertButton = event.target.closest("[data-bulk-revert]");
  const advancedButton = event.target.closest("[data-bulk-advanced]");

  if (facilityToggle) {
    const facilityName = facilityToggle.dataset.bulkFacilityToggle;

    if (collapsedBulkFacilityNames.has(facilityName)) {
      collapsedBulkFacilityNames.delete(facilityName);
    } else {
      collapsedBulkFacilityNames.add(facilityName);
    }

    renderBulkEditDevices();
    return;
  }

  if (saveButton) {
    saveBulkRow(saveButton.closest("[data-bulk-index]"));
    return;
  }

  if (revertButton) {
    revertBulkRow(revertButton.closest("[data-bulk-index]"));
    return;
  }

  if (advancedButton) {
    editDevice(Number(advancedButton.dataset.bulkAdvanced));
  }
});
confirmDeleteDeviceButton.addEventListener("click", confirmDeleteDevice);
if (deviceFormModalElement) {
  configureManagementModalFocus(deviceFormModalElement, '#device-name');
}
if (deleteDeviceModalElement) {
  configureManagementModalFocus(deleteDeviceModalElement, '.modal-footer [data-bs-dismiss="modal"]');
}
window.addEventListener("popstate", () => navigateTo(location.pathname, true));

void loadRegions({ showBusy: false, showErrors: false });
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

  setCheckModeInputsDisabled(false);
}
