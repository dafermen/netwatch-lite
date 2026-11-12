const managementConfirmElement = document.querySelector('#management-confirm-modal');
const managementConfirmModal = typeof bootstrap !== 'undefined' ? new bootstrap.Modal(managementConfirmElement) : null;
let managementConfirmation = null;
let managementConfirmed = false;
let managementConfirmationFocus = null;
let regionManagerLoaded = false;
let regionManagerBusy = false;
let regionLoadPromise = null;
let pendingRegionSourceId = '';
let themeManagerLoaded = false;
let themeManagerBusy = false;
let themeLoadPromise = null;
let themeDraft = null;
const managementOpeningModals = new WeakSet();
const managementClosingModals = new WeakSet();

function hideManagementModal(modal) {
  const instance = bootstrap.Modal.getInstance(modal);
  if (!instance) return;
  if (managementOpeningModals.has(modal)) {
    if (managementClosingModals.has(modal)) return;
    managementClosingModals.add(modal);
    modal.addEventListener('shown.bs.modal', () => { managementClosingModals.delete(modal); instance.hide(); }, { once: true });
  } else instance.hide();
}

function configureManagementModalFocus(modal, preferredSelector) {
  let focusedControl = null;
  modal.addEventListener('show.bs.modal', () => { focusedControl = null; managementOpeningModals.add(modal); });
  modal.addEventListener('hidden.bs.modal', () => { managementClosingModals.delete(modal); });
  modal.addEventListener('focusin', event => {
    if (event.target.matches('input:not([type="hidden"]), textarea, select, button, a[href]')) focusedControl = event.target;
  });
  modal.addEventListener('shown.bs.modal', () => {
    managementOpeningModals.delete(modal);
    if (managementClosingModals.has(modal)) return;
    const interacted = focusedControl?.isConnected && !focusedControl.disabled && focusedControl.getClientRects().length > 0;
    const control = interacted ? focusedControl : modal.querySelector(preferredSelector);
    control?.focus();
    if (!interacted && typeof control?.select === 'function') control.select();
  });
  modal.addEventListener('click', event => {
    if (managementOpeningModals.has(modal) && event.target.closest('[data-bs-dismiss="modal"]')) {
      event.preventDefault(); event.stopPropagation(); hideManagementModal(modal);
    }
  });
  modal.addEventListener('keydown', event => {
    if (managementOpeningModals.has(modal) && event.key === 'Escape') {
      event.preventDefault(); event.stopPropagation(); hideManagementModal(modal);
    }
  });
}

function confirmManagementAction({ title, message, confirmLabel = 'Delete', destructive = true }) {
  if (managementConfirmation || !managementConfirmModal) return Promise.resolve(false);
  document.querySelector('#management-confirm-title').textContent = NetWatchI18n.text(title);
  document.querySelector('#management-confirm-message').textContent = NetWatchI18n.text(message);
  const button = document.querySelector('#management-confirm');
  button.className = `btn ${destructive ? 'btn-danger' : 'btn-primary'}`;
  button.textContent = NetWatchI18n.text(confirmLabel);
  managementConfirmed = false;
  managementConfirmationFocus = document.activeElement;
  managementConfirmElement.querySelectorAll('button').forEach(element => { element.disabled = true; });
  return new Promise(resolve => {
    managementConfirmation = resolve;
    managementConfirmModal.show();
  });
}

document.querySelector('#management-confirm').addEventListener('click', () => {
  managementConfirmed = true;
  managementConfirmModal?.hide();
});
managementConfirmElement.addEventListener('shown.bs.modal', () => {
  managementConfirmElement.querySelectorAll('button').forEach(element => { element.disabled = false; });
  document.querySelector('#management-cancel').focus();
});
managementConfirmElement.addEventListener('hidden.bs.modal', () => {
  const resolve = managementConfirmation;
  managementConfirmation = null;
  if (managementConfirmationFocus?.isConnected) managementConfirmationFocus.focus({ preventScroll: true });
  resolve?.(managementConfirmed);
});

function disposeManagementMenus(container) {
  container.querySelectorAll('[data-bs-toggle="dropdown"]').forEach(toggle => bootstrap.Dropdown.getInstance(toggle)?.dispose());
}

function renderManagementActions(kind, id, name, actions) {
  return NetWatchI18n.html`<div class="dropdown management-row-menu">
    <button class="btn btn-outline-secondary btn-sm management-menu-toggle" type="button" data-bs-toggle="dropdown" data-bs-boundary="viewport" aria-expanded="false" aria-label="Actions for ${escapeAttribute(name)}" title="Actions for ${escapeAttribute(name)}"><i class="fa-solid fa-ellipsis-vertical"></i></button>
    <ul class="dropdown-menu dropdown-menu-end">${actions.map(action => NetWatchI18n.html`<li><button class="dropdown-item ${action.danger ? 'text-danger' : ''}" type="button" data-management-kind="${kind}" data-management-id="${escapeAttribute(id)}" data-management-action="${action.key}" ${action.disabled ? 'disabled' : ''} title="${escapeAttribute(NetWatchI18n.text(action.title || action.label))}"><i class="fa-solid ${action.icon} me-2" aria-hidden="true"></i>${NetWatchI18n.text(action.label)}</button></li>`).join('')}</ul>
  </div>`;
}

function closeManagementMenu(button) {
  const toggle = button.closest('.dropdown')?.querySelector('[data-bs-toggle="dropdown"]');
  if (toggle) { bootstrap.Dropdown.getInstance(toggle)?.hide(); toggle.focus({ preventScroll: true }); }
}

async function loadRegions({ showErrors = false } = {}) {
  if (regionLoadPromise) return regionLoadPromise;
  if (regionManagerBusy) return false;
  regionManagerLoaded = false;
  disposeManagementMenus(regionsBody);
  regionsBody.innerHTML = NetWatchI18n.markup('<tr><td colspan="3" class="management-empty">Loading support groups...</td></tr>');
  setRegionBusy(true);
  regionLoadPromise = (async () => {
    try {
      const response = await fetch('/api/regions');
      const payload = await readJsonResponse(response);
      if (!response.ok) throw new Error(payload.error || payload.detail || 'Unable to load support groups.');
      if (!Array.isArray(payload.profiles) || !payload.profiles.length) throw new Error('No support group profiles were returned.');
      applyRegionState(payload);
      return true;
    } catch (error) {
      regionsBody.innerHTML = NetWatchI18n.markup('<tr><td colspan="3" class="management-empty">Unable to load support groups.</td></tr>');
      document.querySelector('#active-region-summary').textContent = 'Active support group unavailable';
      document.querySelector('#regions-count').textContent = NetWatchI18n.text('');
      if (showErrors || currentRoute === '/regions') showRegionAlert('danger', error.message);
      return false;
    } finally { regionLoadPromise = null; setRegionBusy(false); }
  })();
  return regionLoadPromise;
}

function applyRegionState(payload, preferredEditingId = '') {
  regionState = payload;
  regionManagerLoaded = true;
  if (preferredEditingId && regionState.profiles.some(profile => profile.id === preferredEditingId)) editingRegionId = preferredEditingId;
  if (!regionState.profiles.some(profile => profile.id === editingRegionId)) editingRegionId = regionState.activeProfileId;
  const filter = document.querySelector('#regions-region-filter');
  const value = filter.value;
  const names = [...new Set(regionState.profiles.map(profile => profile.region || 'Unassigned'))].sort((a, b) => a.localeCompare(b));
  filter.innerHTML = NetWatchI18n.markup('<option value="">All regions</option>') + names.map(name => NetWatchI18n.html`<option value="${escapeAttribute(name)}">${escapeHtml(name)}</option>`).join('');
  filter.value = names.includes(value) ? value : '';
  renderRegionsTable();
  renderDashboardRegionTitle();
}

function renderDashboardRegionTitle() {
  const profile = getActiveRegion();
  dashboardRegionTitle.textContent = profile?.region || 'Unassigned';
  dashboardSupportGroupLabel.textContent = profile?.name || 'No support group';
}

function getActiveRegion() {
  return regionState.profiles.find(profile => profile.id === regionState.activeProfileId) ?? regionState.profiles[0];
}

function getEditingRegion() {
  return regionState.profiles.find(profile => profile.id === editingRegionId) ?? getActiveRegion();
}

function renderRegionsTable() {
  if (!regionManagerLoaded) return;
  const query = document.querySelector('#regions-search').value.trim().toLowerCase();
  const region = document.querySelector('#regions-region-filter').value;
  const status = document.querySelector('#regions-status-filter').value;
  const profiles = regionState.profiles.filter(profile => (!region || profile.region === region)
    && `${profile.name} ${profile.region} ${profile.id}`.toLowerCase().includes(query)
    && (!status || (status === 'active' && profile.id === regionState.activeProfileId)
      || (status === 'available' && profile.id !== regionState.activeProfileId) || (status === 'protected' && profile.builtIn)))
    .sort((a, b) => (a.region || '').localeCompare(b.region || '') || a.name.localeCompare(b.name));
  const active = getActiveRegion();
  document.querySelector('#active-region-summary').textContent = `${active?.name || 'None'} / ${active?.region || 'Unassigned'}`;
  document.querySelector('#regions-count').textContent = NetWatchI18n.text(`${profiles.length} of ${regionState.profiles.length} support groups`);
  let previousRegion = null;
  disposeManagementMenus(regionsBody);
  regionsBody.innerHTML = profiles.map(profile => {
    const group = profile.region || 'Unassigned';
    const heading = group !== previousRegion ? NetWatchI18n.html`<tr class="management-group"><th colspan="3" scope="rowgroup"><i class="fa-solid fa-diagram-project me-2"></i>${escapeHtml(group)}</th></tr>` : '';
    previousRegion = group;
    const active = profile.id === regionState.activeProfileId;
    return NetWatchI18n.html`${heading}<tr data-region-row="${escapeAttribute(profile.id)}" class="${profile.id === editingRegionId ? 'management-selected' : ''}">
      <td class="management-name-cell"><button class="management-name" type="button" data-select-region="${escapeAttribute(profile.id)}" aria-pressed="${profile.id === editingRegionId}">${escapeHtml(profile.name)}</button><div class="small text-secondary text-break">${escapeHtml(profile.id)}</div></td>
      <td class="management-status-cell">${active ? NetWatchI18n.markup('<span class="badge text-bg-success">Active</span>') : NetWatchI18n.markup('<span class="badge text-bg-light">Available</span>')}${profile.id === editingRegionId ? NetWatchI18n.markup('<span class="badge management-selection-label">Selected</span>') : ''}${profile.builtIn ? NetWatchI18n.markup('<span class="badge text-bg-secondary"><i class="fa-solid fa-lock me-1"></i>Protected</span>') : ''}</td>
      <td class="management-actions-cell">${renderManagementActions('region', profile.id, profile.name, [
        { key: 'open', label: 'Open configuration', icon: 'fa-sliders' },
        { key: 'activate', label: 'Set active', icon: 'fa-check', disabled: active },
        { key: 'copy', label: 'Copy and activate', icon: 'fa-copy' },
        { key: 'rename', label: 'Rename', icon: 'fa-pen' },
        { key: 'delete', label: 'Delete', icon: 'fa-trash', danger: true, disabled: profile.builtIn || regionState.profiles.length <= 1, title: profile.builtIn ? 'Protected profile cannot be deleted' : 'Delete profile' }
      ])}</td></tr>`;
  }).join('') || NetWatchI18n.markup('<tr><td colspan="3" class="management-empty">No support groups match these filters.</td></tr>');
  updateRegionControls();
}

function selectRegion(id) {
  if (!regionManagerLoaded || regionManagerBusy || !regionState.profiles.some(profile => profile.id === id)) return;
  editingRegionId = id;
  renderRegionsTable();
}

function updateRegionControls() {
  document.querySelector('#regions-page').querySelectorAll('input, select, button').forEach(element => {
    element.disabled = regionManagerBusy || !regionManagerLoaded;
  });
  document.querySelector('#reload-regions').disabled = regionManagerBusy;
  if (!regionManagerBusy && regionManagerLoaded) {
    regionsBody.querySelectorAll('[data-management-action="activate"]').forEach(button => { button.disabled = button.dataset.managementId === regionState.activeProfileId; });
    regionsBody.querySelectorAll('[data-management-action="delete"]').forEach(button => {
      button.disabled = Boolean(regionState.profiles.find(profile => profile.id === button.dataset.managementId)?.builtIn) || regionState.profiles.length <= 1;
    });
  }
}

function setRegionBusy(busy) {
  regionManagerBusy = busy;
  updateRegionControls();
  regionForm.querySelectorAll('input, button').forEach(element => { element.disabled = busy; });
  document.querySelector('#regions-loading').hidden = !busy;
}

function startNewRegion() {
  if (!regionManagerLoaded || regionManagerBusy) return;
  pendingRegionAction = 'new'; pendingRegionSourceId = '';
  regionFormTitle.textContent = NetWatchI18n.text('New Support Group'); submitRegionButton.textContent = NetWatchI18n.text('Create and activate');
  regionNameInput.value = ''; regionValueInput.value = getActiveRegion()?.region || '';
  regionCopyWrapper.hidden = false; regionCopyActiveInput.checked = true;
  document.querySelector('#region-copy-source').textContent = getActiveRegion()?.name || '';
  document.querySelector('#region-form-alert').textContent = NetWatchI18n.text('');
  regionFormModal?.show();
}

function startRenameRegion() {
  const profile = getEditingRegion();
  if (!profile || regionManagerBusy) return;
  pendingRegionAction = 'rename'; pendingRegionSourceId = profile.id;
  regionFormTitle.textContent = NetWatchI18n.text('Rename Support Group'); submitRegionButton.textContent = NetWatchI18n.text('Save changes');
  regionNameInput.value = profile.name; regionValueInput.value = profile.region || '';
  regionCopyWrapper.hidden = true;
  document.querySelector('#region-form-alert').textContent = NetWatchI18n.text('');
  regionFormModal?.show();
}

async function mutateRegion(url, options, successMessage, preferred = '') {
  if (!regionManagerLoaded || regionManagerBusy) return false;
  setRegionBusy(true); clearRegionAlert();
  try {
    const response = await fetch(url, options);
    const payload = await readJsonResponse(response);
    if (!response.ok) throw new Error(payload.error || payload.detail || 'Unable to update support groups.');
    applyRegionState(payload.configuration, preferred || payload.configuration.activeProfileId);
    const reload = await fetch('/api/reload', { method: 'POST' });
    if (!reload.ok) showRegionAlert('warning', 'The profile was saved, but configuration reload failed. Reload before monitoring.');
    else {
      await reloadAfterRegionChange();
      showRegionAlert('success', successMessage);
    }
    hideRegionForm();
    return true;
  } catch (error) {
    if (regionFormModalElement.classList.contains('show')) document.querySelector('#region-form-alert').textContent = NetWatchI18n.error(error.message);
    else showRegionAlert('danger', error.message);
    return false;
  } finally { setRegionBusy(false); }
}

async function submitRegionForm(event) {
  event.preventDefault();
  const name = regionNameInput.value.trim();
  if (!name) return;
  const region = regionValueInput.value.trim() || name;
  if (pendingRegionAction === 'rename') {
    await mutateRegion(`/api/regions/${encodeURIComponent(pendingRegionSourceId)}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, region })
    }, `Support group '${name}' updated.`, pendingRegionSourceId);
  } else {
    await mutateRegion('/api/regions', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, region, copyFromActive: regionCopyActiveInput.checked })
    }, `Support group '${name}' created and activated.`);
  }
}

async function activateRegion() {
  const profile = getEditingRegion();
  if (!profile || regionManagerBusy || !regionManagerLoaded) return false;
  if (profile.id === regionState.activeProfileId) return true;
  return mutateRegion(`/api/regions/${encodeURIComponent(profile.id)}/activate`, { method: 'POST' }, `Active support group changed to '${profile.name}'.`);
}

async function copyRegion() {
  const profile = getEditingRegion();
  if (profile) return mutateRegion(`/api/regions/${encodeURIComponent(profile.id)}/duplicate`, { method: 'POST' }, `Support group '${profile.name}' copied and activated.`);
}

async function deleteRegion() {
  const profile = getEditingRegion();
  if (!profile || profile.builtIn || regionState.profiles.length <= 1) return;
  const remaining = regionState.profiles.filter(item => item.id !== profile.id);
  const next = profile.id === regionState.activeProfileId ? remaining[0] : getActiveRegion();
  if (!await confirmManagementAction({ title: 'Delete support group', message: `Delete '${profile.name}'? Its JSON file will be archived locally.\nActive support group afterward: ${next.name}. Other profiles and inventories will be kept.` })) return;
  await mutateRegion(`/api/regions/${encodeURIComponent(profile.id)}`, { method: 'DELETE' }, `Support group '${profile.name}' deleted.`);
}

async function reloadAfterRegionChange() {
  hasLoadedDashboardGroups = false; activeFacility = ''; groupCheckSelect.value = '';
  await loadConfig({ clearAlert: false, showBusy: false });
  markDashboardConfigurationStale();
}

function hideRegionForm() { hideManagementModal(regionFormModalElement); }
function showRegionAlert(type, message) { showPageAlert(regionAlert, type, message); }
function clearRegionAlert() { clearPageAlert(regionAlert); }

document.querySelector('#regions-body').addEventListener('click', async event => {
  const button = event.target.closest('[data-management-action]');
  if (button) {
    if (button.disabled || regionManagerBusy) return;
    const id = button.dataset.managementId; const action = button.dataset.managementAction;
    closeManagementMenu(button); selectRegion(id);
    [...regionsBody.querySelectorAll('[data-select-region]')].find(element => element.dataset.selectRegion === id)?.focus({ preventScroll: true });
    if (action === 'rename') startRenameRegion();
    else if (action === 'activate') await activateRegion();
    else if (action === 'copy') await copyRegion();
    else if (action === 'delete') await deleteRegion();
    else if (action === 'open') {
      const profile = getEditingRegion();
      if (profile.id !== regionState.activeProfileId && !await confirmManagementAction({ title: 'Open configuration', message: `Activate '${profile.name}' and open its configuration?`, confirmLabel: 'Activate and open', destructive: false })) return;
      if (await activateRegion()) void navigateTo('/config');
    }
    return;
  }
  const select = event.target.closest('[data-select-region]');
  if (select) selectRegion(select.dataset.selectRegion);
});
document.querySelector('#new-region').addEventListener('click', startNewRegion);
document.querySelector('#reload-regions').addEventListener('click', () => { void loadRegions({ showErrors: true }); });
for (const id of ['regions-search', 'regions-region-filter', 'regions-status-filter']) document.querySelector(`#${id}`).addEventListener(id.endsWith('search') ? 'input' : 'change', renderRegionsTable);
document.querySelector('#region-form').addEventListener('submit', submitRegionForm);
configureManagementModalFocus(document.querySelector('#region-form-modal'), '#region-name');

function isThemeDirty() {
  const theme = getEditingTheme();
  return Boolean(themeDraft && theme && !theme.builtIn && Object.keys(themeCssVariables).some(key => themeDraft[key] !== theme.colors[key]));
}

async function discardThemeChanges() {
  if (isThemeDirty() && !await confirmManagementAction({ title: 'Unsaved theme colors', message: `Discard the unsaved color changes for '${getEditingTheme().name}'? Saved themes will not change.`, confirmLabel: 'Discard changes', destructive: false })) return false;
  themeDraft = getEditingTheme() ? structuredClone(getEditingTheme().colors) : null;
  return true;
}

async function loadThemes({ showErrors = false, confirmDiscard = false } = {}) {
  if (themeLoadPromise) return themeLoadPromise;
  if (themeManagerBusy || (confirmDiscard && !await discardThemeChanges())) return false;
  themeManagerLoaded = false; setThemeBusy(true);
  disposeManagementMenus(document.querySelector('#themes-body'));
  document.querySelector('#themes-body').innerHTML = NetWatchI18n.markup('<tr><td colspan="4" class="management-empty">Loading themes...</td></tr>');
  themeLoadPromise = (async () => {
    try {
      const response = await fetch('/api/themes'); const payload = await readJsonResponse(response);
      if (!response.ok) throw new Error(payload.error || payload.detail || 'Unable to load themes.');
      if (!Array.isArray(payload.themes) || !payload.themes.length) throw new Error('No themes were returned.');
      applyThemeState(payload);
      return true;
    } catch (error) {
      document.querySelector('#themes-body').innerHTML = NetWatchI18n.markup('<tr><td colspan="4" class="management-empty">Unable to load themes.</td></tr>');
      document.querySelector('#active-theme-summary').textContent = 'Active theme unavailable';
      document.querySelector('#themes-count').textContent = NetWatchI18n.text('');
      document.querySelector('#theme-editor').hidden = true;
      if (showErrors || currentRoute === '/themes') showThemeAlert('danger', error.message);
      return false;
    } finally { themeLoadPromise = null; setThemeBusy(false); }
  })();
  return themeLoadPromise;
}

function applyThemeState(payload, preferred = editingThemeId) {
  themeState = payload; themeManagerLoaded = true;
  editingThemeId = themeState.themes.some(theme => theme.id === preferred) ? preferred : themeState.activeThemeId;
  themeDraft = structuredClone(getEditingTheme().colors);
  renderThemesTable(); renderThemeEditor(); applyActiveTheme();
}

function renderThemesTable() {
  if (!themeManagerLoaded) return;
  const query = document.querySelector('#themes-search').value.trim().toLowerCase();
  const status = document.querySelector('#themes-status-filter').value;
  const themes = themeState.themes.filter(theme => `${theme.name} ${theme.id}`.toLowerCase().includes(query)
    && (!status || (status === 'active' && theme.id === themeState.activeThemeId) || (status === 'available' && theme.id !== themeState.activeThemeId)
      || (status === 'protected' && theme.builtIn) || (status === 'custom' && !theme.builtIn)))
    .sort((a, b) => a.name.localeCompare(b.name));
  document.querySelector('#active-theme-summary').textContent = themeState.themes.find(theme => theme.id === themeState.activeThemeId)?.name || 'None';
  document.querySelector('#themes-count').textContent = NetWatchI18n.text(`${themes.length} of ${themeState.themes.length} themes`);
  disposeManagementMenus(document.querySelector('#themes-body'));
  document.querySelector('#themes-body').innerHTML = themes.map(theme => NetWatchI18n.html`<tr data-theme-row="${escapeAttribute(theme.id)}" class="${theme.id === editingThemeId ? 'management-selected' : ''}">
    <td class="management-name-cell"><button type="button" class="management-name" data-select-theme="${escapeAttribute(theme.id)}" aria-pressed="${theme.id === editingThemeId}">${escapeHtml(theme.name)}</button><div class="small text-secondary text-break">${escapeHtml(theme.id)}</div></td>
    <td class="management-palette-cell"><div class="theme-swatches" aria-label="Theme palette">${['appBackground', 'sidebarBackground', 'primary', 'success', 'danger'].map(key => NetWatchI18n.html`<span class="theme-swatch" style="--swatch:${/^#[0-9a-f]{6}$/i.test(theme.colors[key]) ? theme.colors[key] : '#000000'}" title="${key}: ${escapeAttribute(theme.colors[key])}"></span>`).join('')}</div></td>
    <td class="management-status-cell">${theme.id === themeState.activeThemeId ? NetWatchI18n.markup('<span class="badge text-bg-success">Active</span>') : NetWatchI18n.markup('<span class="badge text-bg-light">Available</span>')}${theme.id === editingThemeId ? NetWatchI18n.markup('<span class="badge management-selection-label">Selected</span>') : ''}${theme.builtIn ? NetWatchI18n.markup('<span class="badge text-bg-secondary"><i class="fa-solid fa-lock me-1"></i>Protected</span>') : ''}</td>
    <td class="management-actions-cell">${renderManagementActions('theme', theme.id, theme.name, [
      { key: 'edit', label: theme.builtIn ? 'Preview colors' : 'Edit colors', icon: 'fa-palette' },
      { key: 'activate', label: 'Set active', icon: 'fa-check', disabled: theme.id === themeState.activeThemeId },
      { key: 'copy', label: 'Copy', icon: 'fa-copy' },
      { key: 'rename', label: 'Rename', icon: 'fa-pen', disabled: theme.builtIn, title: theme.builtIn ? 'Protected theme cannot be renamed' : 'Rename theme' },
      { key: 'delete', label: 'Delete', icon: 'fa-trash', danger: true, disabled: theme.builtIn, title: theme.builtIn ? 'Protected theme cannot be deleted' : 'Delete theme' }
    ])}</td></tr>`).join('') || NetWatchI18n.markup('<tr><td colspan="4" class="management-empty">No themes match these filters.</td></tr>');
  updateThemeControls();
}

function getEditingTheme() { return themeState.themes.find(theme => theme.id === editingThemeId); }

function renderThemeEditor() {
  const theme = getEditingTheme();
  if (!theme) return;
  document.querySelector('#theme-editor-name').textContent = theme.name;
  for (const input of themeColorInputs) {
    input.value = themeDraft?.[input.dataset.themeColor] || theme.colors[input.dataset.themeColor];
    input.disabled = themeManagerBusy || !themeManagerLoaded || theme.builtIn;
  }
  document.querySelector('#theme-editor-protected').hidden = !theme.builtIn;
  document.querySelector('#theme-dirty-label').hidden = !isThemeDirty();
  applyThemePreview({ ...theme, colors: themeDraft || theme.colors }); updateThemeControls();
}

async function selectTheme(id, openEditor = true) {
  if (!themeManagerLoaded || themeManagerBusy || !themeState.themes.some(theme => theme.id === id)) return false;
  if (editingThemeId !== id) {
    if (!await discardThemeChanges()) return false;
    editingThemeId = id;
    themeDraft = structuredClone(getEditingTheme().colors);
  } else if (!themeDraft) themeDraft = structuredClone(getEditingTheme().colors);
  document.querySelector('#theme-editor').hidden = !openEditor;
  renderThemesTable(); renderThemeEditor();
  if (openEditor) {
    document.querySelector('#theme-editor-name').focus({ preventScroll: true });
    document.querySelector('#theme-editor').scrollIntoView({ block: 'start' });
  }
  return true;
}

function updateThemeControls() {
  const page = document.querySelector('#themes-page');
  page.querySelectorAll('input, select, button').forEach(element => { element.disabled = themeManagerBusy || !themeManagerLoaded; });
  document.querySelector('#reload-themes').disabled = themeManagerBusy;
  const theme = getEditingTheme();
  themeColorInputs.forEach(input => { input.disabled = themeManagerBusy || !themeManagerLoaded || !theme || theme.builtIn; });
  saveThemesButton.disabled = themeManagerBusy || !themeManagerLoaded || !isThemeDirty();
  document.querySelector('#discard-theme-colors').disabled = saveThemesButton.disabled;
  if (themeManagerLoaded && !themeManagerBusy) {
    page.querySelectorAll('[data-management-action="activate"]').forEach(button => { button.disabled = button.dataset.managementId === themeState.activeThemeId; });
    for (const action of ['rename', 'delete']) page.querySelectorAll(`[data-management-action="${action}"]`).forEach(button => {
      button.disabled = Boolean(themeState.themes.find(theme => theme.id === button.dataset.managementId)?.builtIn);
    });
  }
}

function setThemeBusy(busy) {
  themeManagerBusy = busy; updateThemeControls();
  themeForm.querySelectorAll('input, button').forEach(element => { element.disabled = busy; });
  saveThemesSpinner.classList.toggle('d-none', !busy); saveThemesIcon.classList.toggle('d-none', busy);
  document.querySelector('#themes-loading').hidden = !busy;
}

async function persistThemeState(candidate, message, preferred = editingThemeId, reset = false) {
  if (!themeManagerLoaded || themeManagerBusy) return false;
  setThemeBusy(true); clearThemeAlert();
  try {
    const response = await fetch(reset ? '/api/themes/reset' : '/api/themes', reset ? { method: 'POST' } : {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(candidate)
    });
    const payload = await readJsonResponse(response);
    if (!response.ok) throw new Error(payload.error || payload.detail || 'Unable to save themes.');
    applyThemeState(payload.configuration, preferred);
    showThemeAlert('success', message); return true;
  } catch (error) {
    if (themeFormModalElement.classList.contains('show')) document.querySelector('#theme-form-alert').textContent = NetWatchI18n.error(error.message);
    else showThemeAlert('danger', error.message);
    return false;
  } finally { setThemeBusy(false); }
}

async function saveThemes() {
  const theme = getEditingTheme();
  if (!theme || !isThemeDirty()) return;
  const candidate = structuredClone(themeState);
  candidate.themes.find(item => item.id === theme.id).colors = structuredClone(themeDraft);
  await persistThemeState(candidate, `Colors for '${theme.name}' saved.`);
}

function applyActiveTheme() {
  applyThemeColors(themeState.themes.find(theme => theme.id === themeState.activeThemeId));
  const theme = getEditingTheme(); if (theme) applyThemePreview({ ...theme, colors: themeDraft || theme.colors });
}

function applyThemeColors(theme) {
  const defaults = createDefaultThemeState().themes[0].colors;
  for (const [key, variable] of Object.entries(themeCssVariables)) document.documentElement.style.setProperty(variable, theme?.colors?.[key] || defaults[key]);
}

function applyThemePreview(theme) {
  const defaults = createDefaultThemeState().themes[0].colors;
  for (const [key, variable] of Object.entries(themeCssVariables)) themePreview.style.setProperty(variable, theme?.colors?.[key] || defaults[key]);
}

function createThemeId(seed) {
  const base = slugify(seed) || 'theme'; let id = base; let suffix = 2;
  while (themeState.themes.some(theme => theme.id === id)) id = `${base}-${suffix++}`;
  return id;
}

async function openThemeNameForm(action, id = editingThemeId) {
  if (!themeManagerLoaded || themeManagerBusy || !await discardThemeChanges()) return;
  const source = themeState.themes.find(theme => theme.id === id);
  if (action !== 'new' && (!source || (action === 'rename' && source.builtIn))) return;
  pendingThemeAction = action; pendingThemeSourceId = id;
  themeFormTitle.textContent = NetWatchI18n.text(action === 'new' ? 'New Theme' : action === 'copy' ? 'Copy Theme' : 'Rename Theme');
  submitThemeButton.textContent = NetWatchI18n.text(action === 'rename' ? 'Save changes' : 'Create theme');
  themeNameInput.value = action === 'new' ? '' : `${source.name}${action === 'copy' ? ' Copy' : ''}`;
  document.querySelector('#theme-form-alert').textContent = NetWatchI18n.text(''); themeFormModal?.show();
}

async function submitThemeForm(event) {
  event.preventDefault();
  const name = themeNameInput.value.trim(); if (!name) return;
  const candidate = structuredClone(themeState);
  const source = candidate.themes.find(theme => theme.id === pendingThemeSourceId);
  let id = pendingThemeSourceId;
  if (pendingThemeAction === 'rename') {
    if (!source || source.builtIn) return; source.name = name;
  } else {
    id = createThemeId(name);
    candidate.themes.push({ id, name, builtIn: false, colors: structuredClone(pendingThemeAction === 'copy' ? source.colors : createDefaultThemeState().themes[0].colors) });
  }
  if (await persistThemeState(candidate, `Theme '${name}' saved.`, id)) {
    hideThemeForm(); document.querySelector('#theme-editor').hidden = false;
  }
}

async function activateTheme(id) {
  if (!await discardThemeChanges()) return;
  const candidate = structuredClone(themeState); candidate.activeThemeId = id;
  await persistThemeState(candidate, 'Active theme saved.', id);
}

async function deleteTheme(id) {
  const theme = themeState.themes.find(item => item.id === id);
  if (!theme || theme.builtIn || !await discardThemeChanges()) return;
  const next = themeState.activeThemeId === id ? 'default' : themeState.activeThemeId;
  const nextName = themeState.themes.find(item => item.id === next)?.name;
  if (!await confirmManagementAction({ title: 'Delete theme', message: `Delete '${theme.name}'? Other themes will be kept.\nActive theme afterward: ${nextName}.` })) return;
  const candidate = structuredClone(themeState);
  candidate.themes = candidate.themes.filter(item => item.id !== id); candidate.activeThemeId = next;
  await persistThemeState(candidate, `Theme '${theme.name}' deleted.`, next);
}

async function resetThemes() {
  if (!await discardThemeChanges() || !await confirmManagementAction({ title: 'Restore default themes', message: 'Delete all custom themes and restore the built-in themes? NetWatch Default will become active.', confirmLabel: 'Restore defaults' })) return;
  await persistThemeState(null, 'Default themes restored.', 'default', true);
}

function hideThemeForm() { hideManagementModal(themeFormModalElement); }
function showThemeAlert(type, message) { showPageAlert(themeAlert, type, message); }
function clearThemeAlert() { clearPageAlert(themeAlert); }

document.querySelector('#themes-body').addEventListener('click', async event => {
  const button = event.target.closest('[data-management-action]');
  if (button) {
    if (button.disabled || themeManagerBusy) return;
    const id = button.dataset.managementId; const action = button.dataset.managementAction;
    closeManagementMenu(button);
    if (action === 'edit') await selectTheme(id);
    else if (action === 'copy' || action === 'rename') await openThemeNameForm(action, id);
    else if (action === 'activate') await activateTheme(id);
    else if (action === 'delete') await deleteTheme(id);
    return;
  }
  const select = event.target.closest('[data-select-theme]');
  if (select) await selectTheme(select.dataset.selectTheme);
});
document.querySelector('#new-theme').addEventListener('click', () => { void openThemeNameForm('new'); });
document.querySelector('#reload-themes').addEventListener('click', () => { void loadThemes({ showErrors: true, confirmDiscard: true }); });
document.querySelector('#reset-themes').addEventListener('click', event => { closeManagementMenu(event.target); void resetThemes(); });
document.querySelector('#themes-search').addEventListener('input', renderThemesTable);
document.querySelector('#themes-status-filter').addEventListener('change', renderThemesTable);
document.querySelector('#theme-form').addEventListener('submit', submitThemeForm);
configureManagementModalFocus(document.querySelector('#theme-form-modal'), '#theme-name');
document.querySelector('#save-themes').addEventListener('click', () => { void saveThemes(); });
document.querySelector('#discard-theme-colors').addEventListener('click', async () => { if (await discardThemeChanges()) renderThemeEditor(); });
document.querySelector('#close-theme-editor').addEventListener('click', async () => { if (await discardThemeChanges()) { renderThemeEditor(); document.querySelector('#theme-editor').hidden = true; } });
document.querySelectorAll('[data-theme-color]').forEach(input => input.addEventListener('input', () => {
  const theme = getEditingTheme(); if (!theme || theme.builtIn || !themeManagerLoaded || themeManagerBusy) return;
  themeDraft ||= structuredClone(theme.colors); themeDraft[input.dataset.themeColor] = input.value;
  document.querySelector('#theme-dirty-label').hidden = !isThemeDirty();
  applyThemePreview({ ...theme, colors: themeDraft }); updateThemeControls();
}));
window.addEventListener('beforeunload', event => { if (isThemeDirty()) { event.preventDefault(); event.returnValue = ''; } });
