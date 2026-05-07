const state = {
  config: null,
  layout: 4,
  currentPage: 0,
  rotationEnabled: false,
  rotationTimer: null,
  refreshTimers: new Map(),
  loadTimers: new Map()
};

const wallboardTitle = document.querySelector("#wallboard-title");
const panelGrid = document.querySelector("#panel-grid");
const pageIndicator = document.querySelector("#page-indicator");
const layout2Button = document.querySelector("#layout-2");
const layout4Button = document.querySelector("#layout-4");
const rotationToggle = document.querySelector("#rotation-toggle");
const refreshAllButton = document.querySelector("#refresh-all");
const reloadConfigButton = document.querySelector("#reload-config");
const toast = document.querySelector("#wallboard-toast");

document.addEventListener("DOMContentLoaded", initializeWallboard);
document.addEventListener("keydown", handleKeyboardShortcuts);
layout2Button.addEventListener("click", () => setLayout(2));
layout4Button.addEventListener("click", () => setLayout(4));
rotationToggle.addEventListener("change", () => setRotation(rotationToggle.checked));
refreshAllButton.addEventListener("click", refreshVisiblePanels);
reloadConfigButton.addEventListener("click", reloadConfigurationFromDisk);

async function initializeWallboard() {
  await loadConfiguration();
}

async function loadConfiguration() {
  try {
    const response = await fetch("/api/wallboard/config", { cache: "no-store" });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    state.config = await response.json();
    state.layout = state.config.defaultLayout === 2 ? 2 : 4;
    state.rotationEnabled = Boolean(state.config.rotationEnabled);
    state.currentPage = 0;
    wallboardTitle.textContent = state.config.appTitle || "NetWatch Lite Wallboard";
    rotationToggle.checked = state.rotationEnabled;
    renderWallboard();
    scheduleRotation();
  } catch (error) {
    console.error(error);
    showToast("Unable to load wallboard configuration.");
    renderEmptyState("Unable to load wallboard configuration.");
  }
}

async function reloadConfigurationFromDisk() {
  try {
    const response = await fetch("/api/wallboard/reload", { method: "POST" });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const payload = await response.json();
    state.config = payload.configuration;
    state.layout = state.config.defaultLayout === 2 ? 2 : 4;
    state.rotationEnabled = Boolean(state.config.rotationEnabled);
    state.currentPage = 0;
    wallboardTitle.textContent = state.config.appTitle || "NetWatch Lite Wallboard";
    rotationToggle.checked = state.rotationEnabled;
    renderWallboard();
    scheduleRotation();
    showToast(`Reloaded ${payload.panelCount} wallboard panels.`);
  } catch (error) {
    console.error(error);
    showToast("Unable to reload wallboard.json.");
  }
}

function renderWallboard() {
  clearPanelTimers();
  panelGrid.className = `panel-grid layout-${state.layout}`;
  layout2Button.classList.toggle("active", state.layout === 2);
  layout4Button.classList.toggle("active", state.layout === 4);

  const panels = getVisiblePanels();
  panelGrid.innerHTML = "";

  if (panels.length === 0) {
    renderEmptyState("No wallboard panels configured.");
    return;
  }

  for (const panel of panels) {
    panelGrid.appendChild(createPanelElement(panel));
  }

  updatePageIndicator();
  scheduleVisiblePanelRefreshes();
}

function createPanelElement(panel) {
  const panelElement = document.createElement("article");
  panelElement.className = "wallboard-panel";
  panelElement.dataset.panelName = panel.name;

  const titleBar = document.createElement("div");
  titleBar.className = "panel-titlebar";
  titleBar.innerHTML = `
    <div>
      <strong>${escapeHtml(panel.name)}</strong>
      <span>${panel.refreshSeconds}s refresh</span>
    </div>`;

  const refreshButton = document.createElement("button");
  refreshButton.className = "panel-refresh";
  refreshButton.type = "button";
  refreshButton.title = `Refresh ${panel.name}`;
  refreshButton.textContent = "↻";
  refreshButton.addEventListener("click", () => refreshPanel(panelElement, panel));
  titleBar.appendChild(refreshButton);

  const frameWrap = document.createElement("div");
  frameWrap.className = "panel-frame-wrap";

  const frame = document.createElement("iframe");
  frame.className = "panel-frame";
  frame.title = panel.name;
  frame.referrerPolicy = "no-referrer";
  frame.loading = "eager";
  frame.src = createRefreshUrl(panel.url);

  const overlay = document.createElement("div");
  overlay.className = "panel-overlay";
  overlay.innerHTML = `
    <strong>Unable to load panel</strong>
    <small>${escapeHtml(panel.url)}</small>`;

  frame.addEventListener("load", () => {
    hidePanelOverlay(panelElement);
    clearPanelLoadTimer(panelElement);
  });

  frame.addEventListener("error", () => showPanelOverlay(panelElement));
  frameWrap.append(frame, overlay);
  panelElement.append(titleBar, frameWrap);
  schedulePanelLoadTimeout(panelElement);

  return panelElement;
}

function setLayout(layout) {
  state.layout = layout;
  state.currentPage = 0;
  renderWallboard();
  scheduleRotation();
}

function setRotation(enabled) {
  state.rotationEnabled = enabled;
  rotationToggle.checked = enabled;
  scheduleRotation();
}

function scheduleRotation() {
  clearInterval(state.rotationTimer);
  state.rotationTimer = null;

  if (!state.rotationEnabled || getPageCount() <= 1) {
    return;
  }

  const seconds = Math.max(1, Number(state.config?.rotationSeconds) || 20);
  state.rotationTimer = window.setInterval(() => {
    state.currentPage = (state.currentPage + 1) % getPageCount();
    renderWallboard();
  }, seconds * 1000);
}

function scheduleVisiblePanelRefreshes() {
  for (const panel of getVisiblePanels()) {
    const seconds = Math.max(1, Number(panel.refreshSeconds) || 30);
    const timer = window.setInterval(() => {
      const panelElement = findPanelElement(panel);

      if (panelElement) {
        refreshPanel(panelElement, panel);
      }
    }, seconds * 1000);

    state.refreshTimers.set(panel.name, timer);
  }
}

function refreshVisiblePanels() {
  for (const panel of getVisiblePanels()) {
    const panelElement = findPanelElement(panel);

    if (panelElement) {
      refreshPanel(panelElement, panel);
    }
  }

  showToast("Visible panels refreshed.");
}

function refreshPanel(panelElement, panel) {
  const frame = panelElement.querySelector("iframe");

  if (!frame) {
    return;
  }

  hidePanelOverlay(panelElement);
  schedulePanelLoadTimeout(panelElement);
  frame.src = createRefreshUrl(panel.url);
}

function schedulePanelLoadTimeout(panelElement) {
  clearPanelLoadTimer(panelElement);

  const timer = window.setTimeout(() => {
    showPanelOverlay(panelElement);
  }, 15_000);

  state.loadTimers.set(panelElement, timer);
}

function clearPanelLoadTimer(panelElement) {
  const timer = state.loadTimers.get(panelElement);

  if (timer) {
    clearTimeout(timer);
    state.loadTimers.delete(panelElement);
  }
}

function showPanelOverlay(panelElement) {
  panelElement.querySelector(".panel-overlay")?.classList.add("visible");
}

function hidePanelOverlay(panelElement) {
  panelElement.querySelector(".panel-overlay")?.classList.remove("visible");
}

function getVisiblePanels() {
  const panels = state.config?.panels ?? [];
  const start = state.currentPage * state.layout;
  return panels.slice(start, start + state.layout);
}

function getPageCount() {
  const panels = state.config?.panels ?? [];
  return Math.max(1, Math.ceil(panels.length / state.layout));
}

function updatePageIndicator() {
  const pageCount = getPageCount();
  state.currentPage = Math.min(state.currentPage, pageCount - 1);
  pageIndicator.textContent = `Page ${state.currentPage + 1} / ${pageCount}`;
}

function findPanelElement(panel) {
  return Array.from(panelGrid.querySelectorAll(".wallboard-panel"))
    .find(element => element.dataset.panelName === panel.name);
}

function clearPanelTimers() {
  for (const timer of state.refreshTimers.values()) {
    clearInterval(timer);
  }

  for (const timer of state.loadTimers.values()) {
    clearTimeout(timer);
  }

  state.refreshTimers.clear();
  state.loadTimers.clear();
}

function renderEmptyState(message) {
  clearPanelTimers();
  panelGrid.innerHTML = `<div class="empty-state">${escapeHtml(message)}</div>`;
  pageIndicator.textContent = "Page 0 / 0";
}

function handleKeyboardShortcuts(event) {
  if (event.key === "f" || event.key === "F") {
    toggleFullscreen();
    return;
  }

  if (event.key === "r" || event.key === "R") {
    refreshVisiblePanels();
  }
}

function toggleFullscreen() {
  if (document.fullscreenElement) {
    document.exitFullscreen();
    return;
  }

  document.documentElement.requestFullscreen?.();
}

function createRefreshUrl(url) {
  try {
    const target = new URL(url);
    target.searchParams.set("_nw", Date.now().toString());
    return target.toString();
  } catch {
    return url;
  }
}

function showToast(message) {
  toast.textContent = message;
  toast.hidden = false;
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    toast.hidden = true;
  }, 3500);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
