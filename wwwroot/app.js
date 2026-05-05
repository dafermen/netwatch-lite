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
let refreshTimer;
let latestCategories = [];
let activeFilter = "all";
let activeSearch = "";
let autoRefreshEnabled = false;
let latestIntervalSeconds = 15;
const expandedCategoryNames = new Set();

/**
 * Fetches monitor data from the backend and renders the dashboard.
 * @param {{ forceRun?: boolean }} options When true, calls POST /api/monitor/run to execute all checks immediately.
 * @returns {Promise<void>} Completes when the response has been rendered or an error has been shown.
 */
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
  } catch (error) {
    resultsBody.innerHTML = `
      <div class="text-center text-danger py-4">
        Unable to load monitoring results.
      </div>`;
    lastCheck.textContent = "Last execution failed";
    console.error(error);
  }
}

/**
 * Applies a monitor API payload to all dashboard sections.
 * The first load renders current data once; automatic refresh starts only after the user enables it.
 * @param {object} payload Response from /api/monitor/refresh or /api/monitor/run.
 * @returns {void}
 */
function renderMonitorPayload(payload) {
    latestCategories = payload.categories ?? groupResultsByCategory(payload.results ?? []);
    renderSummary(payload.summary ?? createSummaryFromCategories(latestCategories));
    renderFilteredCategories();
    latestIntervalSeconds = Math.max(1, Number(payload.settings?.intervalSeconds) || 15);
    scheduleRefresh();
    executionMode.textContent = autoRefreshEnabled ? "Auto refresh active" : "Manual mode";
    lastCheck.textContent = `Last execution: ${formatDate(payload.lastExecutionTime ?? payload.lastCheck)}`;
}

/**
 * Renders top-level metric cards from the backend summary.
 * @param {object} summary Aggregated device counts and availability percentage.
 * @returns {void}
 */
function renderSummary(summary) {
  metricTotal.textContent = formatNumber(summary.totalDevices);
  metricOnline.textContent = formatNumber(summary.onlineDevices);
  metricOffline.textContent = formatNumber(summary.offlineDevices);
  metricDegraded.textContent = formatNumber(summary.degradedDevices);
  metricAvailability.textContent = `${formatPercent(summary.availabilityPercentage)}%`;
}

/**
 * Creates a dashboard summary in the browser as a fallback when older API payloads omit summary.
 * @param {Array<object>} categories Category groups containing device results.
 * @returns {object} Summary with total, online, offline, degraded, healthy, and availability values.
 */
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

/**
 * Applies current search and status filters, then renders the filtered categories.
 * @returns {void}
 */
function renderFilteredCategories() {
    renderCategories(filterCategories(latestCategories));
}

/**
 * Filters category groups without mutating the cached API payload.
 * @param {Array<object>} categories Category groups from the latest monitor response.
 * @returns {Array<object>} Categories containing only matching devices.
 */
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

/**
 * Checks whether a device matches the current text search.
 * @param {object} device Device result to test.
 * @param {string} search Lowercase search text.
 * @returns {boolean} True when name or IP contains the search text.
 */
function matchesSearch(device, search) {
  if (!search) {
    return true;
  }

  return String(device.name ?? "").toLowerCase().includes(search)
    || String(device.ip ?? "").toLowerCase().includes(search);
}

/**
 * Checks whether a device matches the selected status filter.
 * @param {object} device Device result to test.
 * @param {string} filter Selected filter: all, online, offline, or problems.
 * @returns {boolean} True when the device should be visible.
 */
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

/**
 * Delays frequent UI callbacks such as search input to avoid unnecessary re-rendering.
 * @param {Function} callback Function to invoke after the user stops triggering events.
 * @param {number} delayMs Delay in milliseconds.
 * @returns {Function} Debounced wrapper function.
 */
function debounce(callback, delayMs) {
  let timeoutId;

  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => callback(...args), delayMs);
  };
}

/**
 * Renders all visible category sections.
 * @param {Array<object>} categories Filtered category groups.
 * @returns {void}
 */
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

/**
 * Renders one category section with summary badges and a device table.
 * @param {object} category Category result from the API or client fallback grouping.
 * @param {number} index Category index in the rendered list, used to create a stable DOM id.
 * @returns {string} HTML string for the category section.
 */
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

/**
 * Renders one table row for a monitored device.
 * @param {object} result Device result from the API.
 * @returns {string} HTML string for the device row.
 */
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

/**
 * Renders the final Healthy, Degraded, or Down badge.
 * @param {string} status Device status returned by the backend.
 * @returns {string} HTML string for the status badge.
 */
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

/**
 * Groups a flat result list by category for compatibility with older API payloads.
 * @param {Array<object>} results Flat device results.
 * @returns {Array<object>} Category groups sorted by name.
 */
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

/**
 * Converts a category name into a safe id fragment for collapse targets.
 * @param {string} value Category name.
 * @returns {string} Lowercase id-safe string.
 */
function slugify(value) {
  const slug = String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "category";
}

/**
 * Renders TCP port badges for requested and open ports.
 * @param {Array<number>} requestedPorts Ports configured for the device.
 * @param {Array<number>} openPorts Ports that accepted TCP connections.
 * @returns {string} HTML string containing port badges.
 */
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

/**
 * Reloads the editable JSON file from disk and then forces a fresh monitor execution.
 * @returns {Promise<void>} Completes when reload and execution finish.
 */
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

/**
 * Fetches the latest cached monitor payload without forcing network checks.
 * @returns {Promise<void>} Completes when the payload has been rendered.
 */
async function refreshNow() {
  setButtonLoading(refreshNowButton, refreshNowSpinner, refreshNowIcon, true);

  try {
    await loadResults();
  } finally {
    setButtonLoading(refreshNowButton, refreshNowSpinner, refreshNowIcon, false);
  }
}

/**
 * Forces a full execution of all configured checks.
 * @returns {Promise<void>} Completes when execution finishes or fails.
 */
async function runFullCheck() {
  setButtonLoading(runFullCheckButton, runFullCheckSpinner, runFullCheckIcon, true);

  try {
    await loadResults({ forceRun: true });
  } finally {
    setButtonLoading(runFullCheckButton, runFullCheckSpinner, runFullCheckIcon, false);
  }
}

/**
 * Toggles automatic refresh mode and starts or clears the refresh timer.
 * Auto refresh is disabled by default so operators control when recurring checks begin.
 * @returns {void}
 */
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

/**
 * Sets a button's loading state by toggling disabled, spinner, and icon visibility.
 * @param {HTMLButtonElement} button Button to enable or disable.
 * @param {HTMLElement} spinner Inline Bootstrap spinner.
 * @param {HTMLElement} icon Button icon to hide while loading.
 * @param {boolean} isLoading True to show loading state.
 * @returns {void}
 */
function setButtonLoading(button, spinner, icon, isLoading) {
  button.disabled = isLoading;
  spinner.classList.toggle("d-none", !isLoading);
  icon.classList.toggle("d-none", isLoading);
}

/**
 * Formats an ISO date string or Date-compatible value for the user's locale.
 * @param {string|Date} value Date value from the API.
 * @returns {string} Localized date and time string, or empty string for missing values.
 */
function formatDate(value) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "short",
    timeStyle: "medium"
  }).format(new Date(value));
}

/**
 * Formats a number for display in metric cards.
 * @param {number|string} value Numeric value.
 * @returns {string} Localized integer string.
 */
function formatNumber(value) {
  return new Intl.NumberFormat().format(Number(value) || 0);
}

/**
 * Formats availability percentage with one decimal place.
 * @param {number|string} value Percentage value from 0 to 100.
 * @returns {string} Localized percentage number without the percent sign.
 */
function formatPercent(value) {
  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  }).format(Number(value) || 0);
}

/**
 * Escapes untrusted values before inserting them into HTML strings.
 * @param {unknown} value Value to escape.
 * @returns {string} HTML-safe string.
 */
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
loadResults();

/**
 * Starts the automatic refresh timer when auto refresh is enabled by the user.
 * @returns {void}
 */
function scheduleRefresh() {
  clearRefreshTimer();

  if (autoRefreshEnabled) {
    refreshTimer = setInterval(loadResults, latestIntervalSeconds * 1000);
  }
}

/**
 * Clears any active automatic refresh timer.
 * @returns {void}
 */
function clearRefreshTimer() {
  if (refreshTimer) {
    clearInterval(refreshTimer);
    refreshTimer = undefined;
  }
}
