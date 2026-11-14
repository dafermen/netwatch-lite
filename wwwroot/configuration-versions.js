const configurationVersionsElement = document.querySelector('#configuration-versions-modal');
const configurationVersionsModal = typeof bootstrap !== 'undefined' ? new bootstrap.Modal(configurationVersionsElement) : null;
const configurationVersionsBody = document.querySelector('#configuration-versions-body');
let configurationVersionsState = null;
let configurationVersionsBusy = false;
configureManagementModalFocus(configurationVersionsElement, '[data-bs-dismiss="modal"]');

function configurationVersionGuard(sha256) {
  return { profileId: configurationVersionsState.profileId, revision: configurationVersionsState.revision, sha256 };
}

function configurationRecoveryFailure(payload) {
  return Object.assign(new Error(payload.error || payload.detail || payload.title || 'Configuration recovery failed.'), { traceId: payload.traceId });
}

async function configurationVersionRequest(url, options) {
  const response = await fetch(url, options);
  const payload = await readJsonResponse(response);
  if (!response.ok) throw configurationRecoveryFailure(payload);
  return payload;
}

function configurationCounts(value) {
  return value ? NetWatchI18n.text(`${value.devices} items, ${value.enabled} enabled, ${value.checks} checks`)
    : NetWatchI18n.text('Invalid configuration; download available, restoration blocked.');
}

async function confirmConfigurationReplacement(preview, restoring = false, fileName = '') {
  const title = restoring ? 'Restore configuration?' : 'Import configuration?';
  const message = fileName
    ? `Support group: ${preview.profileName}\nCurrent: ${configurationCounts(preview.current)}\nReplacement: ${configurationCounts(preview.incoming)}\nFile: ${fileName.replace(/[\x00-\x1f\x7f]/g, ' ').slice(0, 200)}\nSHA-256: ${preview.sha256}\nUnsaved changes will be discarded only after the final confirmation.`
    : `Support group: ${preview.profileName}\nCurrent: ${configurationCounts(preview.current)}\nReplacement: ${configurationCounts(preview.incoming)}\nUnsaved changes will be discarded only after the final confirmation.`;
  if (!await confirmManagementAction({ title, message, confirmLabel: 'Continue', destructive: false })) return false;
  return confirmManagementAction({ title: 'Final confirmation',
    message: `Replace configuration for '${preview.profileName}'? A recovery point of the current configuration will be saved first. Other support groups and monitoring history will not change.`,
    confirmLabel: restoring ? 'Restore configuration' : 'Replace configuration' });
}

async function reviewedConfigurationImport(file) {
  const profile = regionState.activeProfileId || '';
  const form = () => { const body = new FormData(); body.append('configFile', file); return body; };
  const preview = await configurationVersionRequest('/api/config/import/preview', {
    method: 'POST', headers: { 'X-NetWatch-Profile': profile }, body: form() });
  if (!await confirmConfigurationReplacement(preview, false, file.name)) return null;
  if (profile !== regionState.activeProfileId) throw new Error('The active support group changed. Review it again.');
  return configurationVersionRequest('/api/config/import/commit', { method: 'POST',
    headers: { 'X-NetWatch-Profile': profile, 'X-NetWatch-Revision': preview.revision, 'X-NetWatch-Import-SHA256': preview.sha256 }, body: form() });
}

async function loadConfigurationVersions() {
  configurationVersionsState = null;
  configurationVersionsBody.replaceChildren();
  document.querySelector('#configuration-version-preview').hidden = true;
  const alert = document.querySelector('#configuration-versions-alert');
  alert.textContent = NetWatchI18n.text('Loading configuration history...');
  try {
    const state = await configurationVersionRequest('/api/config/versions', { cache: 'no-store' });
    if (state.profileId !== regionState.activeProfileId) throw new Error('The active support group changed. Review it again.');
    configurationVersionsState = state;
    document.querySelector('#configuration-versions-summary').textContent = NetWatchI18n.text(`${state.profileName}: ${state.versions.length} of ${state.capacity} recovery points. Old points are not deleted automatically.`);
    configurationVersionsBody.innerHTML = state.versions.map(entry => NetWatchI18n.html`<tr>
      <td data-label="Saved">${escapeHtml(new Date(entry.createdUtc).toLocaleString(NetWatchI18n.locale))}</td><td data-label="Reason">${escapeHtml(NetWatchI18n.text(entry.reason))}</td><td data-label="Items">${entry.deviceCount ?? '-'}</td>
      <td data-label="Actions"><div class="d-flex flex-wrap gap-1">${[
        ['preview', 'fa-eye', 'Preview recovery point'], ['download', 'fa-download', 'Download recovery point'],
        ['restore', 'fa-clock-rotate-left', 'Restore recovery point'], ['delete', 'fa-trash', 'Delete recovery point']
      ].map(([action, icon, label]) => NetWatchI18n.html`<button class="btn btn-sm ${action === 'delete' ? 'btn-outline-danger' : 'btn-outline-secondary'} icon-button" type="button" data-version-id="${entry.id}" data-version-action="${action}" title="${NetWatchI18n.text(label)}" aria-label="${NetWatchI18n.text(label)}" ${action === 'restore' && entry.canRestore === false ? 'disabled' : ''}><i class="fa-solid ${icon}" aria-hidden="true"></i></button>`).join('')}</div></td></tr>`).join('');
    alert.textContent = state.versions.length ? '' : NetWatchI18n.text('No recovery points yet. They are saved before importing or restoring configuration.');
  } catch (error) { alert.textContent = NetWatchI18n.error(error.message, error.traceId); }
}

async function closeConfigurationVersions() {
  if (!configurationVersionsElement.classList.contains('show')) return;
  await new Promise(resolve => { configurationVersionsElement.addEventListener('hidden.bs.modal', resolve, { once: true }); hideManagementModal(configurationVersionsElement); });
}

async function handleConfigurationVersionAction(button) {
  if (configurationVersionsBusy || !configurationVersionsState) return;
  const entry = configurationVersionsState.versions.find(value => value.id === button.dataset.versionId);
  if (!entry) return;
  const action = button.dataset.versionAction;
  const guard = configurationVersionGuard(entry.sha256);
  const options = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(guard) };
  const path = `/api/config/versions/${encodeURIComponent(entry.id)}`;
  configurationVersionsBusy = true;
  configurationVersionsBody.querySelectorAll('button').forEach(value => { value.disabled = true; });
  setConfigBusy(true, { showSaveSpinner: false });
  let reopen = false;
  try {
    if (action === 'download') {
      const response = await fetch(`${path}/download`, options);
      if (!response.ok) throw configurationRecoveryFailure(await readJsonResponse(response));
      downloadJsonBlob(await response.blob(), `NetWatch-configuration-${entry.id}.json`);
    } else if (action === 'preview') {
      const preview = await configurationVersionRequest(`${path}/preview`, options);
      const target = document.querySelector('#configuration-version-preview');
      target.textContent = `${NetWatchI18n.text('Current')}: ${configurationCounts(preview.current)}\n${NetWatchI18n.text('Recovery point')}: ${configurationCounts(preview.incoming)}\nSHA-256: ${entry.sha256}`;
      target.style.whiteSpace = 'pre-wrap'; target.hidden = false;
    } else if (action === 'restore' || action === 'delete') {
      const preview = action === 'restore' ? await configurationVersionRequest(`${path}/preview`, options) : null;
      await closeConfigurationVersions(); reopen = true;
      if (action === 'restore') {
        if (!preview.incoming || !await confirmConfigurationReplacement(preview, true)) return;
        const result = await configurationVersionRequest(`${path}/restore`, options);
        applyConfigPayload(result.configuration); renderConfigDevices(); resetDeviceForm(); markDashboardConfigurationStale();
        showConfigAlert('success', 'Configuration restored. The previous configuration is available in history.');
      } else {
        if (!await confirmManagementAction({ title: 'Delete recovery point?', message: 'Only this recovery point will be removed. The current configuration and monitoring history will not change.' })) return;
        await configurationVersionRequest(`${path}/delete`, options);
      }
      await loadConfigurationVersions();
    }
  } catch (error) {
    document.querySelector('#configuration-versions-alert').textContent = NetWatchI18n.error(error.message, error.traceId);
  } finally {
    configurationVersionsBusy = false;
    setConfigBusy(false, { showSaveSpinner: false });
    configurationVersionsBody.querySelectorAll('button').forEach(value => {
      value.disabled = value.dataset.versionAction === 'restore' && configurationVersionsState?.versions.find(item => item.id === value.dataset.versionId)?.canRestore === false;
    });
    if (reopen) configurationVersionsModal?.show();
  }
}

document.querySelector('#configuration-versions').addEventListener('click', async () => {
  if (configurationBusy || configurationVersionsBusy || !configurationVersionsModal) return;
  configurationVersionsModal.show();
  await loadConfigurationVersions();
});
configurationVersionsBody.addEventListener('click', event => {
  const button = event.target.closest('[data-version-action]');
  if (button) void handleConfigurationVersionAction(button);
});
