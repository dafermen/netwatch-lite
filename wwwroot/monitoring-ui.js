function primaryMonitoringTarget(item) {
  const checks = item.configuredChecks ?? item.checks ?? [];
  const http = checks.find(check => ['http', 'browser'].includes(check.type));
  if (!http || checks.some(check => !['http', 'browser'].includes(check.type))) return item.ip;
  try { const url = new URL(http.url); return url.origin + url.pathname; } catch { return item.ip; }
}

function renderMonitoringToggle(item, index) {
  if (!Number.isInteger(index)) return '';
  const enabled = item.enabled !== false;
  const disabled = monitoringMutationBusy || configurationBusy || monitorPlanning || activeMonitorStream;
  return NetWatchI18n.html`<label class="form-check form-switch monitoring-toggle fw-normal">
    <input type="checkbox" class="form-check-input" role="switch" data-monitoring-index="${index}"
      aria-label="Monitoring for ${escapeAttribute(item.name)}" ${enabled ? 'checked' : ''} ${disabled ? 'disabled' : ''}>
    <span class="form-check-label text-secondary">${NetWatchI18n.text(enabled ? 'Monitoring on' : 'Monitoring paused')}</span>
  </label>`;
}

function hasUnsavedSettings() {
  if (!dashboardInventoryAvailable) return false;
  return [[intervalSecondsInput, 'intervalSeconds'], [timeoutMsInput, 'timeoutMs'], [maxParallelChecksInput, 'maxParallelChecks'],
    [retryCountInput, 'retryCount'], [retryDelayMsInput, 'retryDelayMs']]
    .some(([input, key]) => input && (!input.value.trim() || !input.validity.valid || Number(input.value) !== Number(configState.settings?.[key])));
}

async function changeMonitoringParticipation(input) {
  const index = Number(input.dataset.monitoringIndex);
  const original = configState.devices[index];
  if (!original) return;
  const enabled = input.checked;
  const report = (type, message) => currentRoute === '/config' ? showConfigAlert(type, message)
    : (lastCheck.textContent = type === 'danger' || type === 'warning' ? NetWatchI18n.error(message) : NetWatchI18n.text(message));
  if (monitoringMutationBusy || activeMonitorStream || monitorPlanning || hasBulkDrafts() || hasUnsavedSettings()) {
    input.checked = original.enabled !== false;
    report('warning', 'Save or discard pending changes before changing monitoring.');
    return;
  }
  monitoringMutationBusy = true;
  setConfigBusy(true, { showSaveSpinner: false });
  try {
    if (!monitorInventorySnapshot) {
      await loadMonitoringInventory();
      if (createDeviceKey(configState.devices[index] ?? {}) !== createDeviceKey(original)) {
        throw new Error('The inventory changed. Review the refreshed item and try again.');
      }
    }
    const response = await fetch(`/api/config/devices/${index}/monitoring`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profileId: monitorInventorySnapshot.profileId, revision: monitorInventorySnapshot.revision, enabled })
    });
    const payload = await readJsonResponse(response);
    if (!response.ok) throw new Error(payload.error || payload.detail || 'Unable to change monitoring.');
    applyConfigPayload(payload.configuration, payload);
    report('success', enabled ? `Monitoring enabled for ${original.name}.` : `Monitoring paused for ${original.name}.`);
  } catch (error) {
    input.checked = original.enabled !== false;
    report('danger', error.message || 'Unable to change monitoring.');
  } finally {
    monitoringMutationBusy = false;
    setConfigBusy(false, { showSaveSpinner: false });
    renderConfigFilterOptions();
    renderConfigDevices();
    renderBulkEditDevices();
    renderFilteredCategories();
  }
}

function rememberCompletedRun(payload) {
  lastRunPayload = { ...payload, profileId: monitorInventorySnapshot?.profileId };
  const results = payload.results ?? [];
  for (const item of results) {
    expandedFacilityNames.add(item.facility || 'Unassigned');
    expandedCategoryNames.add(createCategoryKey(item.facility, item.category));
  }
  const problems = results.filter(item => ['Down', 'Degraded', 'AuthenticationRequired', 'Unknown'].includes(item.status)).length;
  document.querySelector('#last-run-receipt').hidden = false;
  document.querySelector('#last-run-receipt-text').textContent = NetWatchI18n.text(`${results.length} items checked, ${problems} need attention. ${formatDate(payload.lastCheck)}`);
  renderFilteredCategories();
}

function showLastRun() {
  if (!lastRunPayload) return;
  const results = lastRunPayload.results ?? [];
  document.querySelector('#last-run-body').innerHTML = NetWatchI18n.html`<div class="table-responsive"><table class="table table-sm align-middle">
    <thead><tr><th>Name</th><th>Facility</th><th>Device Type</th><th>Status</th><th>Checks</th><th>Checked</th></tr></thead>
    <tbody>${results.map(item => NetWatchI18n.html`<tr><td>${escapeHtml(item.name)}</td><td>${escapeHtml(item.facility)}</td>
      <td>${escapeHtml(dashboardDeviceTypeLabel(item.deviceType))}</td><td>${renderDeviceStatus(item.status)}</td>
      <td>${(item.checks ?? []).map(check => check.type === 'browser' ? renderBrowserResults([check]) : check.type === 'http' ? renderHttpChecks([check])
        : NetWatchI18n.html`<span class="badge ${check.isAvailable ? 'text-bg-success' : 'text-bg-danger'}">${escapeHtml(check.label)}: ${escapeHtml(check.status || 'Unknown')}</span>`).join(' ')}</td>
      <td>${escapeHtml(formatDate(item.lastCheck))}</td></tr>`).join('')}</tbody></table></div>`;
  bootstrap.Modal.getOrCreateInstance(document.querySelector('#last-run-modal')).show();
}

for (const selector of ['#results-body', '#config-devices-body']) {
  document.querySelector(selector).addEventListener('change', event => {
    if (event.target.matches('[data-monitoring-index]')) void changeMonitoringParticipation(event.target);
  });
}
document.querySelector('#show-last-run').addEventListener('click', showLastRun);
configureManagementModalFocus(document.querySelector('#last-run-modal'), '[data-bs-dismiss="modal"]');

document.querySelector('#app-language').addEventListener('change', async event => {
  const value = event.target.value;
  const restore = () => { event.target.value = NetWatchI18n.language; };
  if (activeMonitorStream || monitorPlanning || monitoringMutationBusy || configurationBusy || document.querySelector('.modal.show')) {
    restore();
    lastCheck.textContent = NetWatchI18n.text('Finish the current operation before changing language.');
    return;
  }
  if ((hasBulkDrafts() || hasUnsavedSettings() || isThemeDirty()) && !await confirmManagementAction({
    title: 'Discard unsaved changes?', message: 'Changing language reloads the current page.',
    confirmLabel: 'Discard and change language', destructive: false
  })) { restore(); return; }
  const url = new URL(location.href);
  if (NetWatchI18n.setLanguage(value)) url.searchParams.delete('lang');
  else url.searchParams.set('lang', value);
  location.assign(url.href);
});
